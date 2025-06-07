
import { supabase } from "@/integrations/supabase/client";

export interface SkillMapping {
  skill_id: string;
  skill_name: string;
  skill_type: 'content' | 'subject';
  skill_weight: number;
  confidence: number;
}

export interface QuestionSkillMappings {
  [questionNumber: number]: SkillMapping[];
}

export interface LocalSkillScore {
  skill_name: string;
  skill_type: 'content' | 'subject';
  points_earned: number;
  points_possible: number;
  score: number;
  questions_attempted: number;
  questions_correct: number;
}

export interface EnhancedLocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: string;
  reasoning: string;
  skillMappings?: SkillMapping[];
  qualityFlags?: any;
}

export class EnhancedLocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4;

  // Fetch skill mappings for an exam
  static async getExamSkillMappings(examId: string): Promise<QuestionSkillMappings> {
    console.log('Fetching skill mappings for exam:', examId);
    
    const { data: mappings, error } = await supabase
      .from('exam_skill_mappings')
      .select('*')
      .eq('exam_id', examId);

    if (error) {
      console.error('Error fetching skill mappings:', error);
      return {};
    }

    const skillMappings: QuestionSkillMappings = {};
    
    for (const mapping of mappings || []) {
      if (!skillMappings[mapping.question_number]) {
        skillMappings[mapping.question_number] = [];
      }
      
      skillMappings[mapping.question_number].push({
        skill_id: mapping.skill_id,
        skill_name: mapping.skill_name,
        skill_type: mapping.skill_type as 'content' | 'subject',
        skill_weight: mapping.skill_weight,
        confidence: mapping.confidence
      });
    }

    console.log('Loaded skill mappings for', Object.keys(skillMappings).length, 'questions');
    return skillMappings;
  }

  // Check if skill mappings exist for an exam
  static async checkSkillMappingsExist(examId: string): Promise<boolean> {
    const { data: analysis } = await supabase
      .from('exam_skill_analysis')
      .select('analysis_status')
      .eq('exam_id', examId)
      .maybeSingle();

    return analysis?.analysis_status === 'completed';
  }

  // Trigger skill analysis if needed
  static async ensureSkillMappingsExist(examId: string): Promise<boolean> {
    const exists = await this.checkSkillMappingsExist(examId);
    
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

  static gradeQuestionWithSkills(question: any, answerKey: any, skillMappings: SkillMapping[]): EnhancedLocalGradingResult {
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
    const pointsEarned = isCorrect ? pointsPossible : 0;

    // Determine grading method based on confidence and detection method
    let gradingMethod = 'local_question_based_with_skills';
    if (classification.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_confident_with_skills';
    } else if (classification.confidence >= this.ENHANCED_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_enhanced_with_skills';
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
      skillMappings,
      qualityFlags
    };
  }

  private static generateQuestionBasedReasoning(studentAnswer: string, correctAnswer: string, detectedAnswer: any): string {
    let reasoning = `Local grading with skills: Student selected ${studentAnswer || 'no answer'}, correct answer is ${correctAnswer}`;
    
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

  static calculateSkillScores(localResults: EnhancedLocalGradingResult[]): LocalSkillScore[] {
    const skillScores: { [skillName: string]: LocalSkillScore } = {};

    for (const result of localResults) {
      if (!result.skillMappings) continue;

      for (const skillMapping of result.skillMappings) {
        const skillKey = `${skillMapping.skill_type}:${skillMapping.skill_name}`;
        
        if (!skillScores[skillKey]) {
          skillScores[skillKey] = {
            skill_name: skillMapping.skill_name,
            skill_type: skillMapping.skill_type,
            points_earned: 0,
            points_possible: 0,
            score: 0,
            questions_attempted: 0,
            questions_correct: 0
          };
        }

        const weightedPoints = result.pointsPossible * skillMapping.skill_weight;
        const weightedEarned = result.pointsEarned * skillMapping.skill_weight;

        skillScores[skillKey].points_possible += weightedPoints;
        skillScores[skillKey].points_earned += weightedEarned;
        skillScores[skillKey].questions_attempted += 1;
        
        if (result.isCorrect) {
          skillScores[skillKey].questions_correct += 1;
        }
      }
    }

    // Calculate final scores
    return Object.values(skillScores).map(skill => ({
      ...skill,
      score: skill.points_possible > 0 ? (skill.points_earned / skill.points_possible) * 100 : 0
    }));
  }

  static async processQuestionsWithSkills(questions: any[], answerKeys: any[], examId: string) {
    console.log('Processing questions with enhanced local grading and skill mapping');
    
    // Ensure skill mappings exist
    const hasSkillMappings = await this.ensureSkillMappingsExist(examId);
    if (!hasSkillMappings) {
      console.warn('Skill mappings not available, falling back to basic local grading');
      return this.processQuestionsBasic(questions, answerKeys);
    }

    // Get skill mappings
    const skillMappings = await this.getExamSkillMappings(examId);
    
    const localResults: EnhancedLocalGradingResult[] = [];
    const aiRequiredQuestions = [];
    let locallyGradedCount = 0;
    
    // Enhanced metrics tracking
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

      const questionSkillMappings = skillMappings[question.questionNumber] || [];
      const result = this.gradeQuestionWithSkills(question, answerKey, questionSkillMappings);
      
      if (result.gradingMethod === 'requires_ai') {
        aiRequiredQuestions.push(question);
      } else {
        localResults.push(result);
        locallyGradedCount++;
        
        // Track enhanced metrics
        if (result.gradingMethod.includes('question_based')) {
          questionBasedCount++;
        } else if (result.gradingMethod.includes('confident')) {
          highConfidenceCount++;
        } else if (result.gradingMethod.includes('enhanced')) {
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

    // Calculate skill scores from local results
    const localSkillScores = this.calculateSkillScores(localResults);

    return {
      localResults,
      aiRequiredQuestions,
      localSkillScores,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        skillMappingAvailable: true,
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

  // Fallback for when skill mappings are not available
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
      localSkillScores: [],
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        skillMappingAvailable: false,
        enhancedMetrics: {
          questionBasedGraded: 0,
          highConfidenceGraded: locallyGradedCount,
          mediumConfidenceGraded: 0,
          enhancedThresholdGraded: 0,
          multipleMarksDetected: 0,
          reviewFlagged: 0,
          bubbleQualityDistribution: {}
        }
      }
    };
  }

  static generateLocalFeedback(results: EnhancedLocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const multipleMarks = results.filter(r => r.qualityFlags?.hasMultipleMarks).length;
    const reviewFlagged = results.filter(r => r.qualityFlags?.reviewRequired).length;
    const withSkills = results.filter(r => r.skillMappings && r.skillMappings.length > 0).length;
    
    let feedback = `Enhanced local grading completed for ${total} multiple choice questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (withSkills > 0) {
      feedback += `. ${withSkills} questions include skill mapping analysis`;
    }
    
    if (multipleMarks > 0) {
      feedback += `. ${multipleMarks} questions had multiple marks detected`;
    }
    
    if (reviewFlagged > 0) {
      feedback += `. ${reviewFlagged} questions flagged for review due to quality concerns`;
    }
    
    return feedback;
  }
}
