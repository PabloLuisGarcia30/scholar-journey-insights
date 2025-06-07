
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-detail-level',
}

// Local grading service embedded in edge function
class LocalGradingService {
  static classifyQuestion(question: any, answerKey: any) {
    const isMCQ = answerKey.question_type?.toLowerCase().includes('multiple') || 
                  answerKey.options || 
                  /^[A-E]$/i.test(answerKey.correct_answer);

    if (!isMCQ || !question.detectedAnswer) {
      return { shouldUseLocal: false, confidence: 0, reason: 'Not MCQ or no detection' };
    }

    const confidence = question.detectedAnswer.confidence || 0;
    const isRoboflow = question.detectedAnswer.detectionMethod?.includes('roboflow');
    const isCrossValidated = question.detectedAnswer.crossValidated;

    const shouldUseLocal = (confidence >= 0.9 && isRoboflow) || 
                          (confidence >= 0.7 && isCrossValidated);

    return { shouldUseLocal, confidence, reason: shouldUseLocal ? 'High confidence MCQ' : 'Low confidence' };
  }

  static gradeQuestion(question: any, answerKey: any) {
    const studentAnswer = question.detectedAnswer?.selectedOption?.toUpperCase() || '';
    const correctAnswer = answerKey.correct_answer?.toUpperCase() || '';
    const isCorrect = studentAnswer === correctAnswer;
    const pointsPossible = answerKey.points || 1;

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned: isCorrect ? pointsPossible : 0,
      pointsPossible,
      confidence: question.detectedAnswer?.confidence || 0
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Enhanced analyze-test function called with hybrid grading system')
    
    // Read detail level and request data
    const detailLevel = req.headers.get("x-detail-level") || "summary";
    const isDetailed = detailLevel === "detailed";
    const { files, examId, studentName, studentEmail } = await req.json();
    
    // Validate environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Step 1: Fetching exam data in parallel for:', examId)
    
    // Parallel database queries for improved performance
    const [examRes, answerKeysRes, contentSkillsRes, subjectSkillsRes] = await Promise.all([
      supabase.from('exams').select('*, classes:active_classes(*)').eq('exam_id', examId).maybeSingle(),
      supabase.from('answer_keys').select('*').eq('exam_id', examId).order('question_number'),
      supabase.from('class_content_skills').select('content_skills (id, skill_name, skill_description, topic)').eq('class_id', examId),
      supabase.from('class_subject_skills').select('subject_skills (id, skill_name, skill_description)').eq('class_id', examId)
    ]);

    if (examRes.error || !examRes.data) {
      throw new Error(`Exam fetch failed: ${examRes.error?.message || 'Exam not found'}`);
    }

    const examData = examRes.data;
    const answerKeys = answerKeysRes.data || [];
    const contentSkills = (contentSkillsRes.data || []).map(item => item.content_skills).filter(Boolean);
    const subjectSkills = (subjectSkillsRes.data || []).map(item => item.subject_skills).filter(Boolean);

    console.log('Found exam:', examData.title, 'with', answerKeys.length, 'answer keys')

    // Compact skill lists for efficient token usage
    const contentSkillsText = contentSkills.map(skill => `${skill.id}:${skill.skill_name}`).join(', ');
    const subjectSkillsText = subjectSkills.map(skill => `${skill.id}:${skill.skill_name}`).join(', ');

    console.log('Step 2: Processing questions with hybrid grading system')
    
    // Extract all questions from files
    const allQuestions = [];
    let hasStructuredData = false;
    
    for (const file of files) {
      if (file.structuredData && file.structuredData.questions) {
        allQuestions.push(...file.structuredData.questions);
        hasStructuredData = true;
      }
    }

    console.log('Found', allQuestions.length, 'questions for hybrid processing')

    // Hybrid grading: classify and process questions
    const localResults = [];
    const aiRequiredQuestions = [];
    let locallyGradedCount = 0;

    for (const question of allQuestions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const classification = LocalGradingService.classifyQuestion(question, answerKey);
      
      if (classification.shouldUseLocal) {
        const result = LocalGradingService.gradeQuestion(question, answerKey);
        localResults.push(result);
        locallyGradedCount++;
        console.log(`Q${question.questionNumber}: Local grading (${classification.confidence.toFixed(2)} confidence)`);
      } else {
        aiRequiredQuestions.push(question);
      }
    }

    console.log(`Hybrid processing: ${locallyGradedCount} local, ${aiRequiredQuestions.length} require AI`)

    // Calculate local grading results
    const localPointsEarned = localResults.reduce((sum, r) => sum + r.pointsEarned, 0);
    const localPointsPossible = localResults.reduce((sum, r) => sum + r.pointsPossible, 0);
    
    let aiAnalysis = null;
    let aiPointsEarned = 0;
    let aiPointsPossible = 0;

    // Only call AI if needed for complex questions or skill mapping
    if (aiRequiredQuestions.length > 0 || contentSkills.length > 0 || subjectSkills.length > 0) {
      console.log('Step 3: Processing', aiRequiredQuestions.length, 'questions with AI for complex analysis')
      
      // Prepare optimized prompts based on detail level
      const systemPrompt = isDetailed
        ? `You are an advanced AI test grader. Analyze responses, grade, map to skill IDs, and return detailed JSON.
CONTENT SKILLS: ${contentSkillsText}
SUBJECT SKILLS: ${subjectSkillsText}
Focus on skill mapping and complex question analysis.`
        : `You are an AI grader. Grade and map answers to skill IDs. Return JSON summary.
CONTENT SKILLS: ${contentSkillsText}
SUBJECT SKILLS: ${subjectSkillsText}
Focus on skill mapping.`;

      // Build compact answer key for AI questions only
      const aiAnswerKeys = aiRequiredQuestions.map(q => {
        const ak = answerKeys.find(ak => ak.question_number === q.questionNumber);
        return ak ? `Q${ak.question_number}:${ak.correct_answer} [${ak.points} pts]` : '';
      }).filter(Boolean).join('\n');

      // Build student responses for AI questions
      const aiStudentAnswers = aiRequiredQuestions.map(q => 
        `Q${q.questionNumber}:${q.detectedAnswer ? q.detectedAnswer.selectedOption : "No answer"}`
      ).join('\n');

      const userPrompt = `GRADE: ${examData.title} (${examId})
AI QUESTIONS ONLY:
${aiAnswerKeys}

STUDENT ANSWERS:
${aiStudentAnswers}

Note: ${locallyGradedCount} questions already graded locally with ${localPointsEarned}/${localPointsPossible} points.`;

      const maxTokens = isDetailed ? 1500 : 500;

      const aiPayload = {
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        max_tokens: maxTokens,
        temperature: 0.05
      };

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify(aiPayload)
      });

      if (!aiResponse.ok) {
        throw new Error(`OpenAI API error: ${aiResponse.statusText}`);
      }

      const result = await aiResponse.json();
      const analysisText = result.choices[0]?.message?.content || "{}";
      
      try {
        aiAnalysis = JSON.parse(analysisText);
        aiPointsEarned = aiAnalysis.total_points_earned || 0;
        aiPointsPossible = aiAnalysis.total_points_possible || aiRequiredQuestions.length;
      } catch (parseError) {
        console.error('Failed to parse AI analysis:', parseError);
        aiAnalysis = {
          overall_score: 0,
          grade: "AI parsing failed",
          feedback: "Unable to parse AI results",
          content_skill_scores: [],
          subject_skill_scores: []
        };
      }
    }

    console.log('Step 4: Merging hybrid grading results')
    
    // Merge local and AI results
    const totalPointsEarned = localPointsEarned + aiPointsEarned;
    const totalPointsPossible = localPointsPossible + aiPointsPossible;
    const overallScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

    // Generate hybrid feedback
    const localFeedback = localResults.length > 0 
      ? `Automatically graded ${localResults.length} multiple choice questions with high confidence. `
      : '';
    
    const aiFeedback = aiAnalysis?.feedback || '';
    const combinedFeedback = localFeedback + aiFeedback;

    const finalAnalysis = {
      overall_score: Math.round(overallScore * 100) / 100,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      grade: `${Math.round(overallScore)}%`,
      feedback: combinedFeedback,
      detailed_analysis: aiAnalysis?.detailed_analysis || `Hybrid grading: ${localResults.length} local + ${aiRequiredQuestions.length} AI`,
      content_skill_scores: aiAnalysis?.content_skill_scores || [],
      subject_skill_scores: aiAnalysis?.subject_skill_scores || [],
      hybrid_grading_summary: {
        total_questions: allQuestions.length,
        locally_graded: localResults.length,
        ai_graded: aiRequiredQuestions.length,
        local_accuracy: localResults.length / allQuestions.length,
        processing_method: hasStructuredData ? "enhanced_dual_ocr" : "standard_ocr",
        api_calls_saved: localResults.length > 0 ? Math.round((localResults.length / allQuestions.length) * 100) : 0
      }
    };

    console.log('Step 5: Saving results to database')
    
    // Upsert student profile
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .upsert([{ student_name: studentName, email: studentEmail }], { 
        onConflict: ['student_name'] 
      })
      .select()
      .single();

    // Insert test result with hybrid grading metadata
    const { data: testResult } = await supabase
      .from('test_results')
      .insert({
        student_id: studentProfile.id,
        exam_id: examId,
        class_id: examData.class_id,
        overall_score: finalAnalysis.overall_score,
        total_points_earned: finalAnalysis.total_points_earned,
        total_points_possible: finalAnalysis.total_points_possible,
        ai_feedback: finalAnalysis.feedback,
        detailed_analysis: JSON.stringify({
          hybrid_summary: finalAnalysis.hybrid_grading_summary,
          detailed_analysis: finalAnalysis.detailed_analysis
        })
      })
      .select()
      .single();

    // Bulk insert skill scores if available
    if (finalAnalysis.content_skill_scores && finalAnalysis.content_skill_scores.length > 0) {
      await supabase.from('content_skill_scores').insert(
        finalAnalysis.content_skill_scores.map(skill => ({
          test_result_id: testResult.id,
          skill_name: skill.skill_name,
          score: skill.score || 0,
          points_earned: skill.points_earned || 0,
          points_possible: skill.points_possible || 0
        }))
      );
    }

    if (finalAnalysis.subject_skill_scores && finalAnalysis.subject_skill_scores.length > 0) {
      await supabase.from('subject_skill_scores').insert(
        finalAnalysis.subject_skill_scores.map(skill => ({
          test_result_id: testResult.id,
          skill_name: skill.skill_name,
          score: skill.score || 0,
          points_earned: skill.points_earned || 0,
          points_possible: skill.points_possible || 0
        }))
      );
    }

    console.log('Enhanced hybrid test analysis completed successfully')
    console.log(`Performance: ${finalAnalysis.hybrid_grading_summary.api_calls_saved}% API calls saved`)

    return new Response(
      JSON.stringify({
        ...finalAnalysis,
        student_id: studentProfile.id,
        test_result_id: testResult.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    );

  } catch (error) {
    console.error('Error in enhanced analyze-test function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    );
  }
})
