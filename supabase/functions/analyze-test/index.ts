import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-detail-level',
}

// Score Validation Service
class ScoreValidationService {
  static validateQuestionScore(pointsEarned: number, pointsPossible: number, questionNumber: number): number {
    if (pointsEarned < 0) {
      console.warn(`Question ${questionNumber}: Negative points earned (${pointsEarned}), setting to 0`);
      return 0;
    }
    if (pointsEarned > pointsPossible) {
      console.warn(`Question ${questionNumber}: Points earned (${pointsEarned}) exceeds possible (${pointsPossible}), capping to ${pointsPossible}`);
      return pointsPossible;
    }
    return pointsEarned;
  }

  static validateSkillWeight(weight: number): number {
    const MAX_SKILL_WEIGHT = 2.0;
    if (weight < 0) return 0;
    if (weight > MAX_SKILL_WEIGHT) {
      console.warn(`Skill weight ${weight} exceeds maximum ${MAX_SKILL_WEIGHT}, capping`);
      return MAX_SKILL_WEIGHT;
    }
    return weight;
  }

  static validateAIResponse(aiAnalysis: any, expectedQuestions: number): any {
    if (!aiAnalysis) {
      console.warn('AI analysis is null/undefined, using fallback');
      return { total_points_earned: 0, total_points_possible: expectedQuestions };
    }

    // Validate points earned
    let pointsEarned = aiAnalysis.total_points_earned || 0;
    let pointsPossible = aiAnalysis.total_points_possible || expectedQuestions;

    if (pointsEarned < 0) {
      console.warn(`AI returned negative points earned (${pointsEarned}), setting to 0`);
      pointsEarned = 0;
    }

    if (pointsEarned > pointsPossible) {
      console.warn(`AI points earned (${pointsEarned}) exceeds possible (${pointsPossible}), capping`);
      pointsEarned = pointsPossible;
    }

    return {
      ...aiAnalysis,
      total_points_earned: pointsEarned,
      total_points_possible: pointsPossible
    };
  }

  static validateFinalScore(totalEarned: number, totalPossible: number, examTotalPoints?: number): { earned: number, possible: number, capped: boolean } {
    let capped = false;
    let validatedEarned = totalEarned;
    let validatedPossible = totalPossible;

    // Ensure non-negative values
    if (validatedEarned < 0) {
      console.warn(`Total earned is negative (${validatedEarned}), setting to 0`);
      validatedEarned = 0;
      capped = true;
    }

    if (validatedPossible <= 0) {
      console.warn(`Total possible is non-positive (${validatedPossible}), setting to 1`);
      validatedPossible = 1;
      capped = true;
    }

    // Validate against earned <= possible
    if (validatedEarned > validatedPossible) {
      console.warn(`Total earned (${validatedEarned}) exceeds possible (${validatedPossible}), capping`);
      validatedEarned = validatedPossible;
      capped = true;
    }

    // Validate against exam total if provided
    if (examTotalPoints && validatedPossible > examTotalPoints) {
      console.warn(`Calculated total possible (${validatedPossible}) exceeds exam total (${examTotalPoints}), adjusting`);
      const ratio = examTotalPoints / validatedPossible;
      validatedPossible = examTotalPoints;
      validatedEarned = Math.min(validatedEarned * ratio, examTotalPoints);
      capped = true;
    }

    if (examTotalPoints && validatedEarned > examTotalPoints) {
      console.warn(`Total earned (${validatedEarned}) exceeds exam total (${examTotalPoints}), capping`);
      validatedEarned = examTotalPoints;
      capped = true;
    }

    return {
      earned: Math.round(validatedEarned * 100) / 100, // Round to 2 decimal places
      possible: Math.round(validatedPossible * 100) / 100,
      capped
    };
  }

  static logValidationResults(validation: any, context: string) {
    if (validation.capped) {
      console.log(`${context}: Score validation applied - Final: ${validation.earned}/${validation.possible}`);
    } else {
      console.log(`${context}: Score validation passed - Final: ${validation.earned}/${validation.possible}`);
    }
  }
}

// Enhanced Local Grading Service with Skill Mapping
class EnhancedLocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4;

  // Check if skill mappings exist for an exam
  static async checkSkillMappingsExist(supabase: any, examId: string): Promise<boolean> {
    const { data: analysis } = await supabase
      .from('exam_skill_analysis')
      .select('analysis_status')
      .eq('exam_id', examId)
      .maybeSingle();

    return analysis?.analysis_status === 'completed';
  }

  // Trigger skill analysis if needed
  static async ensureSkillMappingsExist(supabase: any, examId: string): Promise<boolean> {
    const exists = await this.checkSkillMappingsExist(supabase, examId);
    
    if (!exists) {
      console.log('Skill mappings do not exist, triggering analysis for exam:', examId);
      
      try {
        const { data, error } = await supabase.functions.invoke('analyze-exam-skills', {
          body: { examId }
        });

        if (error) {
          console.error('Error triggering skill analysis:', error);
          return false;
        }

        console.log('Skill analysis triggered:', data);
        return data.status === 'completed' || data.status === 'already_completed';
      } catch (error) {
        console.error('Failed to trigger skill analysis:', error);
        return false;
      }
    }

    return true;
  }

  // Fetch skill mappings for an exam
  static async getExamSkillMappings(supabase: any, examId: string): Promise<any> {
    console.log('Fetching skill mappings for exam:', examId);
    
    const { data: mappings, error } = await supabase
      .from('exam_skill_mappings')
      .select('*')
      .eq('exam_id', examId);

    if (error) {
      console.error('Error fetching skill mappings:', error);
      return {};
    }

    const skillMappings: any = {};
    
    for (const mapping of mappings || []) {
      if (!skillMappings[mapping.question_number]) {
        skillMappings[mapping.question_number] = [];
      }
      
      skillMappings[mapping.question_number].push({
        skill_id: mapping.skill_id,
        skill_name: mapping.skill_name,
        skill_type: mapping.skill_type,
        skill_weight: mapping.skill_weight,
        confidence: mapping.confidence
      });
    }

    console.log('Loaded skill mappings for', Object.keys(skillMappings).length, 'questions');
    return skillMappings;
  }

  static classifyQuestion(question: any, answerKey: any) {
    let confidence = 0;
    let isEasyMCQ = false;
    let detectionMethod = 'none';
    let shouldUseLocal = false;
    let questionAnalysis = null;

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
      
      if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD && 
          !reviewRequired && 
          !hasMultipleMarks &&
          selectedAnswer !== 'no_answer' &&
          /^[A-D]$/i.test(selectedAnswer) &&
          (bubbleQuality === 'heavy' || bubbleQuality === 'medium')) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
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

  static gradeQuestionWithSkills(question: any, answerKey: any, skillMappings: any[]) {
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
        skillMappings,
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
    let pointsEarned = isCorrect ? pointsPossible : 0;

    // Validate question score
    pointsEarned = ScoreValidationService.validateQuestionScore(pointsEarned, pointsPossible, question.questionNumber);

    let gradingMethod = 'local_with_skills';
    if (classification.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_confident_with_skills';
    }

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
      reasoning: `Local grading with skills: Student selected ${studentAnswer || 'no answer'}, correct answer is ${correctAnswer}`,
      skillMappings,
      qualityFlags
    };
  }

  static calculateSkillScores(localResults: any[]) {
    const contentSkillScores: any = {};
    const subjectSkillScores: any = {};

    for (const result of localResults) {
      if (!result.skillMappings) continue;

      for (const skillMapping of result.skillMappings) {
        const skillKey = skillMapping.skill_name;
        const skillType = skillMapping.skill_type;
        
        // Validate skill weight
        const validatedWeight = ScoreValidationService.validateSkillWeight(skillMapping.skill_weight);
        
        const skillScores = skillType === 'content' ? contentSkillScores : subjectSkillScores;
        
        if (!skillScores[skillKey]) {
          skillScores[skillKey] = {
            skill_name: skillMapping.skill_name,
            points_earned: 0,
            points_possible: 0,
            score: 0
          };
        }

        const weightedPoints = result.pointsPossible * validatedWeight;
        const weightedEarned = result.pointsEarned * validatedWeight;

        skillScores[skillKey].points_possible += weightedPoints;
        skillScores[skillKey].points_earned += weightedEarned;
      }
    }

    // Calculate final scores and validate
    Object.values(contentSkillScores).forEach((skill: any) => {
      const validation = ScoreValidationService.validateFinalScore(skill.points_earned, skill.points_possible);
      skill.points_earned = validation.earned;
      skill.points_possible = validation.possible;
      skill.score = skill.points_possible > 0 ? (skill.points_earned / skill.points_possible) * 100 : 0;
    });
    
    Object.values(subjectSkillScores).forEach((skill: any) => {
      const validation = ScoreValidationService.validateFinalScore(skill.points_earned, skill.points_possible);
      skill.points_earned = validation.earned;
      skill.points_possible = validation.possible;
      skill.score = skill.points_possible > 0 ? (skill.points_earned / skill.points_possible) * 100 : 0;
    });

    return {
      contentSkillScores: Object.values(contentSkillScores),
      subjectSkillScores: Object.values(subjectSkillScores)
    };
  }

  static async processQuestionsWithSkills(supabase: any, questions: any[], answerKeys: any[], examId: string) {
    console.log('Processing questions with enhanced local grading and skill mapping');
    
    // Ensure skill mappings exist
    const hasSkillMappings = await this.ensureSkillMappingsExist(supabase, examId);
    if (!hasSkillMappings) {
      console.warn('Skill mappings not available, falling back to basic processing');
      return this.processQuestionsBasic(questions, answerKeys);
    }

    // Get skill mappings
    const skillMappings = await this.getExamSkillMappings(supabase, examId);
    
    const localResults = [];
    const aiRequiredQuestions = [];
    let locallyGradedCount = 0;
    
    let questionBasedCount = 0;
    let highConfidenceCount = 0;
    let multipleMarksCount = 0;
    let reviewFlaggedCount = 0;
    const bubbleQualityDist = {};

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const questionSkillMappings = skillMappings[question.questionNumber] || [];
      const result = this.gradeQuestionWithSkills(question, answerKey, questionSkillMappings);
      
      if (result.gradingMethod === 'requires_ai') {
        aiRequiredQuestions.push(question);
      } else {
        localResults.push(result);
        locallyGradedCount++;
        
        if (result.gradingMethod.includes('confident')) {
          highConfidenceCount++;
        } else {
          questionBasedCount++;
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

    // Calculate skill scores from local results
    const { contentSkillScores, subjectSkillScores } = this.calculateSkillScores(localResults);

    return {
      localResults,
      aiRequiredQuestions,
      localContentSkillScores: contentSkillScores,
      localSubjectSkillScores: subjectSkillScores,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        skillMappingAvailable: true,
        enhancedMetrics: {
          questionBasedGraded: questionBasedCount,
          highConfidenceGraded: highConfidenceCount,
          mediumConfidenceGraded: 0,
          enhancedThresholdGraded: 0,
          multipleMarksDetected: multipleMarksCount,
          reviewFlagged: reviewFlaggedCount,
          bubbleQualityDistribution: bubbleQualityDist
        }
      }
    };
  }

  static processQuestionsBasic(questions: any[], answerKeys: any[]) {
    console.log('Using basic local grading without skill mappings');
    
    const localResults = [];
    const aiRequiredQuestions = [];
    let locallyGradedCount = 0;

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const classification = this.classifyQuestion(question, answerKey);
      
      if (!classification.shouldUseLocalGrading) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const studentAnswer = question.detectedAnswer?.selectedOption?.toUpperCase() || '';
      const correctAnswer = answerKey.correct_answer?.toUpperCase() || '';
      const isCorrect = studentAnswer === correctAnswer;
      const pointsPossible = answerKey.points || 1;
      const pointsEarned = isCorrect ? pointsPossible : 0;

      localResults.push({
        questionNumber: question.questionNumber,
        isCorrect,
        pointsEarned,
        pointsPossible,
        confidence: classification.confidence,
        gradingMethod: 'local_basic',
        reasoning: `Basic local grading: ${studentAnswer} vs ${correctAnswer}`,
        qualityFlags: classification.questionAnalysis
      });
      
      locallyGradedCount++;
    }

    return {
      localResults,
      aiRequiredQuestions,
      localContentSkillScores: [],
      localSubjectSkillScores: [],
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        skillMappingAvailable: false
      }
    };
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Enhanced analyze-test function called with comprehensive score validation')
    
    const detailLevel = req.headers.get("x-detail-level") || "summary";
    const isDetailed = detailLevel === "detailed";
    const { files, examId, studentName, studentEmail } = await req.json();
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Step 1: Fetching exam data and checking skill mappings for:', examId)
    
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
    console.log('Exam total points:', examData.total_points)

    console.log('Step 2: Processing questions with enhanced skill mapping and validation')
    
    const allQuestions = [];
    let hasStructuredData = false;
    
    for (const file of files) {
      if (file.structuredData && file.structuredData.questions) {
        allQuestions.push(...file.structuredData.questions);
        hasStructuredData = true;
      }
    }

    console.log('Found', allQuestions.length, 'questions for enhanced processing')

    // Use enhanced local grading with skill mapping
    const processingResult = await EnhancedLocalGradingService.processQuestionsWithSkills(
      supabase, allQuestions, answerKeys, examId
    );
    
    const { localResults, aiRequiredQuestions, localContentSkillScores, localSubjectSkillScores, summary } = processingResult;
    
    console.log(`Enhanced processing: ${summary.locallyGraded} local, ${summary.requiresAI} require AI`)
    console.log('Skill mapping available:', summary.skillMappingAvailable)

    // Calculate local grading results with validation
    const localPointsEarned = localResults.reduce((sum, r) => sum + r.pointsEarned, 0);
    const localPointsPossible = localResults.reduce((sum, r) => sum + r.pointsPossible, 0);
    
    console.log(`Local grading: ${localPointsEarned}/${localPointsPossible} points`)
    
    let aiAnalysis = null;
    let aiPointsEarned = 0;
    let aiPointsPossible = 0;
    let aiContentSkillScores = [];
    let aiSubjectSkillScores = [];

    // Only call AI if needed for questions that couldn't be locally graded
    if (aiRequiredQuestions.length > 0) {
      console.log('Step 3: Processing', aiRequiredQuestions.length, 'questions with AI for complex analysis')
      
      // Compact skill lists for AI
      const contentSkillsText = contentSkills.map(skill => `${skill.id}:${skill.skill_name}`).join(', ');
      const subjectSkillsText = subjectSkills.map(skill => `${skill.id}:${skill.skill_name}`).join(', ');

      const systemPrompt = isDetailed
        ? `You are an advanced AI test grader. Analyze responses, grade, map to skill IDs, and return detailed JSON.
CONTENT SKILLS: ${contentSkillsText}
SUBJECT SKILLS: ${subjectSkillsText}
Focus on skill mapping and complex question analysis.`
        : `You are an AI grader. Grade and map answers to skill IDs. Return JSON summary.
CONTENT SKILLS: ${contentSkillsText}
SUBJECT SKILLS: ${subjectSkillsText}
Focus on skill mapping.`;

      const aiAnswerKeys = aiRequiredQuestions.map(q => {
        const ak = answerKeys.find(ak => ak.question_number === q.questionNumber);
        return ak ? `Q${ak.question_number}:${ak.correct_answer} [${ak.points} pts]` : '';
      }).filter(Boolean).join('\n');

      const aiStudentAnswers = aiRequiredQuestions.map(q => 
        `Q${q.questionNumber}:${q.detectedAnswer ? q.detectedAnswer.selectedOption : "No answer"}`
      ).join('\n');

      const userPrompt = `GRADE: ${examData.title} (${examId})
AI QUESTIONS ONLY:
${aiAnswerKeys}

STUDENT ANSWERS:
${aiStudentAnswers}

Note: ${summary.locallyGraded} questions already graded locally with skill mapping.`;

      const maxTokens = isDetailed ? 1500 : 500;

      const aiPayload = {
        model: "gpt-4.1-2025-04-14",
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
        const rawAiAnalysis = JSON.parse(analysisText);
        
        // Validate AI response
        aiAnalysis = ScoreValidationService.validateAIResponse(rawAiAnalysis, aiRequiredQuestions.length);
        aiPointsEarned = aiAnalysis.total_points_earned || 0;
        aiPointsPossible = aiAnalysis.total_points_possible || aiRequiredQuestions.length;
        aiContentSkillScores = aiAnalysis.content_skill_scores || [];
        aiSubjectSkillScores = aiAnalysis.subject_skill_scores || [];
        
        console.log(`AI grading validated: ${aiPointsEarned}/${aiPointsPossible} points`)
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

    console.log('Step 4: Combining results with comprehensive score validation')
    
    // Combine and validate total results
    const rawTotalEarned = localPointsEarned + aiPointsEarned;
    const rawTotalPossible = localPointsPossible + aiPointsPossible;
    
    console.log(`Raw totals before validation: ${rawTotalEarned}/${rawTotalPossible}`)
    
    // Apply comprehensive validation
    const validation = ScoreValidationService.validateFinalScore(
      rawTotalEarned, 
      rawTotalPossible, 
      examData.total_points
    );
    
    const totalPointsEarned = validation.earned;
    const totalPointsPossible = validation.possible;
    const overallScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

    ScoreValidationService.logValidationResults(validation, 'Final Score Calculation');

    // Combine skill scores (already validated in calculateSkillScores)
    const allContentSkillScores = [...localContentSkillScores, ...aiContentSkillScores];
    const allSubjectSkillScores = [...localSubjectSkillScores, ...aiSubjectSkillScores];

    const localFeedback = `Enhanced local grading with skill mapping completed for ${localResults.length} questions.`;
    const aiFeedback = aiAnalysis?.feedback || '';
    let combinedFeedback = localFeedback + (aiFeedback ? ' ' + aiFeedback : '');
    
    // Add validation notice if scores were capped
    if (validation.capped) {
      combinedFeedback += ' Note: Scores were adjusted to ensure mathematical consistency.';
    }

    const finalAnalysis = {
      overall_score: Math.round(overallScore * 100) / 100,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      grade: `${Math.round(overallScore)}%`,
      feedback: combinedFeedback,
      detailed_analysis: aiAnalysis?.detailed_analysis || `Enhanced grading with skills: ${localResults.length} local + ${aiRequiredQuestions.length} AI`,
      content_skill_scores: allContentSkillScores,
      subject_skill_scores: allSubjectSkillScores,
      question_based_grading_summary: {
        total_questions: allQuestions.length,
        locally_graded: summary.locallyGraded,
        ai_graded: summary.requiresAI,
        local_accuracy: summary.localAccuracy,
        processing_method: hasStructuredData ? "enhanced_dual_ocr_with_skills" : "standard_ocr_with_skills",
        api_calls_saved: summary.locallyGraded > 0 ? Math.round((summary.locallyGraded / allQuestions.length) * 100) : 0,
        skill_mapping_available: summary.skillMappingAvailable,
        score_validation_applied: validation.capped,
        enhanced_metrics: summary.enhancedMetrics
      },
      enhanced_question_analysis: {
        total_questions_processed: allQuestions.length,
        questions_with_clear_answers: summary.locallyGraded,
        questions_with_skill_mapping: summary.skillMappingAvailable ? summary.locallyGraded : 0,
        local_skill_scores_calculated: localContentSkillScores.length + localSubjectSkillScores.length,
        score_validation_summary: {
          validation_applied: validation.capped,
          final_earned: totalPointsEarned,
          final_possible: totalPointsPossible,
          exam_total_points: examData.total_points
        },
        processing_improvements: [
          `${summary.locallyGraded} questions processed with local grading and skill mapping`,
          `${Math.round(summary.localAccuracy * 100)}% questions graded locally`,
          `Skill mapping ${summary.skillMappingAvailable ? 'available' : 'not available'} for this exam`,
          `Score validation ${validation.capped ? 'applied' : 'passed'} - ensuring mathematical consistency`
        ]
      }
    };

    console.log('Step 5: Saving validated results to database')
    
    // Upsert student profile
    const { data: studentProfile } = await supabase
      .from('student_profiles')
      .upsert([{ student_name: studentName, email: studentEmail }], { 
        onConflict: ['student_name'] 
      })
      .select()
      .single();

    // Insert test result
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

    // Insert skill scores
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

    console.log('Enhanced test analysis with validated skill mapping completed successfully')
    console.log(`Performance: ${finalAnalysis.question_based_grading_summary.api_calls_saved}% API calls saved`)
    console.log(`Score validation: ${validation.capped ? 'applied' : 'passed'}`)
    console.log(`Final validated score: ${totalPointsEarned}/${totalPointsPossible} (${Math.round(overallScore)}%)`)

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
