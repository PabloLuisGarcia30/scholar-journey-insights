
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-detail-level',
}

// Enhanced Local Grading Service implementation for edge function
class LocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4;

  static classifyQuestion(question: any, answerKey: any) {
    let confidence = 0;
    let isEasyMCQ = false;
    let detectionMethod = 'none';
    let shouldUseLocal = false;
    let questionAnalysis = null;

    // Check if it's a multiple choice question (A, B, C, D)
    const isMCQ = answerKey.question_type?.toLowerCase().includes('multiple') || 
                  answerKey.options || 
                  /^[A-D]$/i.test(answerKey.correct_answer);

    if (!isMCQ) {
      return {
        questionNumber: question.questionNumber,
        isEasyMCQ: false,
        confidence: 0,
        detectionMethod: 'not_mcq',
        shouldUseLocalGrading: false,
        fallbackReason: 'Not a multiple choice question'
      };
    }

    // Enhanced question-based detection analysis
    if (question.detectedAnswer) {
      confidence = question.detectedAnswer.confidence || 0;
      detectionMethod = question.detectedAnswer.detectionMethod || 'unknown';
      const hasMultipleMarks = question.detectedAnswer.multipleMarksDetected || false;
      const reviewRequired = question.detectedAnswer.reviewFlag || false;
      const bubbleQuality = question.detectedAnswer.bubbleQuality || 'unknown';
      const selectedAnswer = question.detectedAnswer.selectedOption || 'no_answer';
      
      questionAnalysis = {
        hasMultipleMarks,
        reviewRequired,
        bubbleQuality,
        selectedAnswer
      };
      
      // Enhanced classification logic for question-based detection
      if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD && 
          !reviewRequired && 
          !hasMultipleMarks &&
          selectedAnswer !== 'no_answer' &&
          /^[A-D]$/i.test(selectedAnswer) &&
          (bubbleQuality === 'heavy' || bubbleQuality === 'medium')) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
      // Medium confidence with quality checks
      else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD && 
               !reviewRequired && 
               !hasMultipleMarks &&
               selectedAnswer !== 'no_answer' &&
               /^[A-D]$/i.test(selectedAnswer) &&
               question.detectedAnswer.crossValidated &&
               bubbleQuality !== 'empty') {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
      // Enhanced threshold for borderline cases
      else if (confidence >= this.ENHANCED_CONFIDENCE_THRESHOLD &&
               selectedAnswer !== 'no_answer' &&
               /^[A-D]$/i.test(selectedAnswer) &&
               bubbleQuality === 'light' &&
               question.detectedAnswer.crossValidated &&
               !hasMultipleMarks &&
               !reviewRequired) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
    }

    return {
      questionNumber: question.questionNumber,
      isEasyMCQ,
      confidence,
      detectionMethod,
      shouldUseLocalGrading: shouldUseLocal,
      questionAnalysis,
      fallbackReason: shouldUseLocal ? undefined : this.getFallbackReason(confidence, question.detectedAnswer)
    };
  }

  private static getFallbackReason(confidence: number, detectedAnswer: any): string {
    if (!detectedAnswer) return 'No answer detection data';
    
    const reasons = [];
    
    if (confidence < this.ENHANCED_CONFIDENCE_THRESHOLD) {
      reasons.push('Low confidence detection');
    }
    
    if (detectedAnswer.reviewFlag) {
      reasons.push('Flagged for manual review');
    }
    
    if (detectedAnswer.multipleMarksDetected) {
      reasons.push('Multiple marks detected');
    }
    
    if (detectedAnswer.selectedOption === 'no_answer') {
      reasons.push('No clear answer selected');
    }
    
    if (!/^[A-D]$/i.test(detectedAnswer.selectedOption || '')) {
      reasons.push('Invalid answer option (not A-D)');
    }
    
    if (detectedAnswer.bubbleQuality === 'empty') {
      reasons.push('Empty or unclear bubble');
    }
    
    if (detectedAnswer.bubbleQuality === 'overfilled') {
      reasons.push('Overfilled bubble detected');
    }
    
    if (!detectedAnswer.crossValidated) {
      reasons.push('No cross-validation available');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Quality threshold not met';
  }

  static gradeQuestion(question: any, answerKey: any) {
    const classification = this.classifyQuestion(question, answerKey);
    
    if (!classification.shouldUseLocalGrading) {
      return {
        questionNumber: question.questionNumber,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: 0,
        gradingMethod: 'requires_ai',
        reasoning: classification.fallbackReason,
        qualityFlags: classification.questionAnalysis ? {
          hasMultipleMarks: classification.questionAnalysis.hasMultipleMarks,
          reviewRequired: classification.questionAnalysis.reviewRequired,
          bubbleQuality: classification.questionAnalysis.bubbleQuality,
          confidenceAdjusted: false
        } : undefined
      };
    }

    const studentAnswer = question.detectedAnswer?.selectedOption?.toUpperCase() || '';
    const correctAnswer = answerKey.correct_answer?.toUpperCase() || '';
    const isCorrect = studentAnswer === correctAnswer;
    const pointsPossible = answerKey.points || 1;
    const pointsEarned = isCorrect ? pointsPossible : 0;

    // Determine grading method based on confidence and detection method
    let gradingMethod = 'local_question_based';
    if (classification.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_confident';
    } else if (classification.confidence >= this.ENHANCED_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_enhanced';
    }

    // Enhanced quality flags for question-based grading
    const qualityFlags = classification.questionAnalysis ? {
      hasMultipleMarks: classification.questionAnalysis.hasMultipleMarks,
      reviewRequired: classification.questionAnalysis.reviewRequired,
      bubbleQuality: classification.questionAnalysis.bubbleQuality,
      confidenceAdjusted: classification.confidence < this.MEDIUM_CONFIDENCE_THRESHOLD
    } : undefined;

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned,
      pointsPossible,
      confidence: classification.confidence,
      gradingMethod,
      reasoning: this.generateQuestionBasedReasoning(studentAnswer, correctAnswer, question.detectedAnswer),
      qualityFlags
    };
  }

  private static generateQuestionBasedReasoning(studentAnswer: string, correctAnswer: string, detectedAnswer: any): string {
    let reasoning = `Question-based local grading: Student selected ${studentAnswer || 'no answer'}, correct answer is ${correctAnswer}`;
    
    if (detectedAnswer) {
      reasoning += ` (Detection: ${detectedAnswer.detectionMethod || 'unknown'})`;
      
      if (detectedAnswer.bubbleQuality) {
        reasoning += ` [Bubble: ${detectedAnswer.bubbleQuality}]`;
      }
      
      if (detectedAnswer.multipleMarksDetected) {
        reasoning += ' [MULTIPLE MARKS DETECTED]';
      }
      
      if (detectedAnswer.reviewFlag) {
        reasoning += ' [FLAGGED FOR REVIEW]';
      }
      
      if (detectedAnswer.processingNotes && detectedAnswer.processingNotes.length > 0) {
        reasoning += ` Notes: ${detectedAnswer.processingNotes.join(', ')}`;
      }
    }
    
    return reasoning;
  }

  static processQuestions(questions: any[], answerKeys: any[]) {
    const localResults = [];
    const aiRequiredQuestions = [];
    let locallyGradedCount = 0;
    
    // Enhanced metrics tracking for question-based grading
    let questionBasedCount = 0;
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let enhancedThresholdCount = 0;
    let multipleMarksCount = 0;
    let reviewFlaggedCount = 0;
    const bubbleQualityDist = {};

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const result = this.gradeQuestion(question, answerKey);
      
      if (result.gradingMethod === 'requires_ai') {
        aiRequiredQuestions.push(question);
      } else {
        localResults.push(result);
        locallyGradedCount++;
        
        // Track enhanced metrics
        if (result.gradingMethod === 'local_question_based') {
          questionBasedCount++;
        } else if (result.gradingMethod === 'local_confident') {
          highConfidenceCount++;
        } else if (result.gradingMethod === 'local_enhanced') {
          enhancedThresholdCount++;
        }
        
        if (result.qualityFlags?.hasMultipleMarks) {
          multipleMarksCount++;
        }
        
        if (result.qualityFlags?.reviewRequired) {
          reviewFlaggedCount++;
        }
        
        if (result.qualityFlags?.bubbleQuality) {
          const quality = result.qualityFlags.bubbleQuality;
          bubbleQualityDist[quality] = (bubbleQualityDist[quality] || 0) + 1;
        }
      }
    }

    return {
      localResults,
      aiRequiredQuestions,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        enhancedMetrics: {
          questionBasedGraded: questionBasedCount,
          highConfidenceGraded: highConfidenceCount,
          mediumConfidenceGraded: mediumConfidenceCount,
          enhancedThresholdGraded: enhancedThresholdCount,
          multipleMarksDetected: multipleMarksCount,
          reviewFlagged: reviewFlaggedCount,
          bubbleQualityDistribution: bubbleQualityDist
        }
      }
    };
  }

  static generateLocalFeedback(results: any[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const multipleMarks = results.filter(r => r.qualityFlags?.hasMultipleMarks).length;
    const reviewFlagged = results.filter(r => r.qualityFlags?.reviewRequired).length;
    const questionBased = results.filter(r => r.gradingMethod === 'local_question_based').length;
    
    let feedback = `Question-based automated grading completed for ${total} multiple choice questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (questionBased > 0) {
      feedback += `. ${questionBased} questions graded using enhanced question-based analysis`;
    }
    
    if (multipleMarks > 0) {
      feedback += `. ${multipleMarks} questions had multiple marks detected`;
    }
    
    if (reviewFlagged > 0) {
      feedback += `. ${reviewFlagged} questions flagged for review due to quality concerns`;
    }
    
    return feedback;
  }

  static generateQualityReport(results: any[]) {
    const qualityDist = {};
    const recommendations = [];
    
    results.forEach(result => {
      if (result.qualityFlags?.bubbleQuality) {
        const quality = result.qualityFlags.bubbleQuality;
        qualityDist[quality] = (qualityDist[quality] || 0) + 1;
      }
    });
    
    const totalWithQuality = Object.values(qualityDist).reduce((a, b) => a + b, 0);
    const lightBubbles = qualityDist['light'] || 0;
    const emptyBubbles = qualityDist['empty'] || 0;
    const overfilledBubbles = qualityDist['overfilled'] || 0;
    const multipleMarks = results.filter(r => r.qualityFlags?.hasMultipleMarks).length;
    
    let overallQuality = 'excellent';
    
    if (multipleMarks > totalWithQuality * 0.1) {
      overallQuality = 'needs_improvement';
      recommendations.push('Multiple marks detected frequently - review bubble sheet instructions');
    }
    
    if ((lightBubbles + emptyBubbles + overfilledBubbles) / totalWithQuality > 0.3) {
      overallQuality = 'needs_improvement';
      recommendations.push('Consider instructing students to fill bubbles more completely');
    } else if ((lightBubbles + emptyBubbles + overfilledBubbles) / totalWithQuality > 0.15) {
      if (overallQuality === 'excellent') overallQuality = 'good';
      recommendations.push('Some bubbles could be filled more clearly');
    }
    
    if (emptyBubbles > 0) {
      recommendations.push(`${emptyBubbles} questions appear to have no answer selected`);
    }
    
    if (overfilledBubbles > 0) {
      recommendations.push(`${overfilledBubbles} questions show potential erasure marks or overfilling`);
    }
    
    if (multipleMarks > 0) {
      recommendations.push(`${multipleMarks} questions had multiple bubbles marked - may indicate erasures or mistakes`);
    }
    
    return {
      overallQuality,
      recommendations,
      qualityDistribution: qualityDist
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Enhanced analyze-test function called with full LocalGradingService')
    
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

    console.log('Step 2: Processing questions with enhanced LocalGradingService')
    
    // Extract all questions from files
    const allQuestions = [];
    let hasStructuredData = false;
    
    for (const file of files) {
      if (file.structuredData && file.structuredData.questions) {
        allQuestions.push(...file.structuredData.questions);
        hasStructuredData = true;
      }
    }

    console.log('Found', allQuestions.length, 'questions for enhanced processing')

    // Use full LocalGradingService for enhanced processing
    const processingResult = LocalGradingService.processQuestions(allQuestions, answerKeys);
    const { localResults, aiRequiredQuestions, summary } = processingResult;
    
    console.log(`Enhanced processing: ${summary.locallyGraded} local, ${summary.requiresAI} require AI`)
    console.log('Enhanced metrics:', summary.enhancedMetrics)

    // Generate quality report
    const qualityReport = LocalGradingService.generateQualityReport(localResults);
    console.log('Quality report:', qualityReport)

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

Note: ${summary.locallyGraded} questions already graded locally with ${localPointsEarned}/${localPointsPossible} points.`;

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

    console.log('Step 4: Merging enhanced grading results')
    
    // Merge local and AI results
    const totalPointsEarned = localPointsEarned + aiPointsEarned;
    const totalPointsPossible = localPointsPossible + aiPointsPossible;
    const overallScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

    // Generate enhanced feedback with quality insights
    const localFeedback = LocalGradingService.generateLocalFeedback(localResults);
    const aiFeedback = aiAnalysis?.feedback || '';
    const combinedFeedback = localFeedback + (aiFeedback ? ' ' + aiFeedback : '');

    const finalAnalysis = {
      overall_score: Math.round(overallScore * 100) / 100,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      grade: `${Math.round(overallScore)}%`,
      feedback: combinedFeedback,
      detailed_analysis: aiAnalysis?.detailed_analysis || `Enhanced grading: ${localResults.length} local + ${aiRequiredQuestions.length} AI`,
      content_skill_scores: aiAnalysis?.content_skill_scores || [],
      subject_skill_scores: aiAnalysis?.subject_skill_scores || [],
      question_based_grading_summary: {
        total_questions: allQuestions.length,
        locally_graded: summary.locallyGraded,
        ai_graded: summary.requiresAI,
        local_accuracy: summary.localAccuracy,
        processing_method: hasStructuredData ? "enhanced_dual_ocr" : "standard_ocr",
        api_calls_saved: summary.locallyGraded > 0 ? Math.round((summary.locallyGraded / allQuestions.length) * 100) : 0,
        enhanced_metrics: summary.enhancedMetrics,
        quality_report: qualityReport
      },
      enhanced_question_analysis: {
        total_questions_processed: allQuestions.length,
        questions_with_clear_answers: summary.locallyGraded,
        questions_with_multiple_marks: summary.enhancedMetrics.multipleMarksDetected,
        questions_needing_review: summary.enhancedMetrics.reviewFlagged,
        processing_improvements: [
          `${summary.enhancedMetrics.questionBasedGraded} questions processed with question-based analysis`,
          `${summary.enhancedMetrics.highConfidenceGraded} high-confidence detections`,
          `${Math.round(summary.localAccuracy * 100)}% questions graded locally`,
          `Quality assessment: ${qualityReport.overallQuality}`
        ]
      }
    };

    console.log('Step 5: Saving enhanced results to database')
    
    // Upsert student profile
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .upsert([{ student_name: studentName, email: studentEmail }], { 
        onConflict: ['student_name'] 
      })
      .select()
      .single();

    // Insert test result with enhanced grading metadata
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
          question_based_grading_summary: finalAnalysis.question_based_grading_summary,
          enhanced_question_analysis: finalAnalysis.enhanced_question_analysis,
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

    console.log('Enhanced test analysis completed successfully')
    console.log(`Performance: ${finalAnalysis.question_based_grading_summary.api_calls_saved}% API calls saved`)
    console.log(`Quality: ${qualityReport.overallQuality} with ${qualityReport.recommendations.length} recommendations`)

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
