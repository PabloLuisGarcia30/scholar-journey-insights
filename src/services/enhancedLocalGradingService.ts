import { supabase } from "@/integrations/supabase/client";
import { EnhancedQuestionClassifier, QuestionClassification, SimpleAnswerValidation } from "./enhancedQuestionClassifier";
import { DistilBertLocalGradingService, DistilBertGradingResult } from "./distilBertLocalGrading";
import { QuestionCacheService, QuestionCacheResult } from "./questionCacheService";

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
  questionClassification?: QuestionClassification;
  answerValidation?: SimpleAnswerValidation;
  distilBertResult?: DistilBertGradingResult; // NEW: DistilBERT analysis
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
      earned: Math.round(validatedEarned * 100) / 100,
      possible: Math.round(validatedPossible * 100) / 100,
      capped
    };
  }
}

export class EnhancedLocalGradingService {

  // Check if AI-identified skill mappings exist for an exam
  static async checkAIIdentifiedSkillMappings(examId: string): Promise<boolean> {
    const { data: mappings } = await supabase
      .from('exam_skill_mappings')
      .select('id')
      .eq('exam_id', examId)
      .limit(1);

    return mappings && mappings.length > 0;
  }

  // Trigger AI skill identification if needed (calls analyze-exam-skills)
  static async ensureAISkillIdentification(examId: string): Promise<boolean> {
    const exists = await this.checkAIIdentifiedSkillMappings(examId);
    
    if (!exists) {
      console.log('No AI-identified skills found. Triggering skill identification for exam:', examId);
      
      try {
        const { data, error } = await supabase.functions.invoke('analyze-exam-skills', {
          body: { examId }
        });

        if (error) {
          console.error('Error triggering AI skill identification:', error);
          return false;
        }

        console.log('AI skill identification triggered:', data);
        return data.status === 'completed' || data.status === 'already_completed';
      } catch (error) {
        console.error('Failed to trigger AI skill identification:', error);
        return false;
      }
    }

    console.log('AI-identified skills already exist for exam:', examId);
    return true;
  }

  // Fetch AI-identified skill mappings for an exam
  static async getAIIdentifiedSkillMappings(examId: string): Promise<QuestionSkillMappings> {
    console.log('Fetching AI-identified skill mappings for exam:', examId);
    
    const { data: mappings, error } = await supabase
      .from('exam_skill_mappings')
      .select('*')
      .eq('exam_id', examId);

    if (error) {
      console.error('Error fetching AI-identified skill mappings:', error);
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

    console.log('✓ Loaded AI-identified skills for', Object.keys(skillMappings).length, 'questions');
    return skillMappings;
  }

  static async gradeQuestionWithDistilBert(question: any, answerKey: any, skillMappings: SkillMapping[]): Promise<EnhancedLocalGradingResult> {
    const studentAnswer = question.detectedAnswer?.selectedOption?.trim() || '';
    const correctAnswer = answerKey.correct_answer?.trim() || '';
    
    // STEP 1: Check question-level cache first
    try {
      const cachedResult = await QuestionCacheService.getCachedQuestionResult(
        answerKey.exam_id || 'unknown',
        question.questionNumber,
        studentAnswer,
        correctAnswer
      );

      if (cachedResult) {
        console.log(`⚡ Cache hit for Q${question.questionNumber}: ${cachedResult.originalGradingMethod}`);
        return {
          ...cachedResult,
          skillMappings, // Update with current skill mappings
          qualityFlags: {
            ...cachedResult.qualityFlags,
            cacheHit: true
          }
        };
      }
    } catch (error) {
      console.warn('Cache lookup failed, proceeding with normal grading:', error);
    }

    // STEP 2: Use enhanced classification to determine if question is simple enough for local grading
    const classification = EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
    
    // STEP 3: Complex questions should go to OpenAI
    if (!classification.shouldUseLocalGrading || !classification.isSimple) {
      console.log(`Question ${question.questionNumber}: Complex question detected, routing to OpenAI`);
      return {
        questionNumber: question.questionNumber,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: classification.confidence,
        gradingMethod: 'requires_openai_complex',
        reasoning: `Complex question requiring OpenAI analysis: ${classification.fallbackReason || 'Advanced reasoning needed'}`,
        skillMappings,
        questionClassification: classification,
        qualityFlags: {
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          reviewRequired: question.detectedAnswer?.reviewFlag || false,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          confidenceAdjusted: false,
          requiresOpenAI: true
        }
      };
    }

    // STEP 4: Process SIMPLE questions with DistilBERT
    console.log(`Question ${question.questionNumber}: Simple question detected, processing with DistilBERT`);
    
    const pointsPossible = answerKey.points || 1;

    try {
      // Use DistilBERT for semantic grading of simple questions only
      const distilBertService = DistilBertLocalGradingService.getInstance();
      const distilBertResult = await distilBertService.gradeAnswer(
        studentAnswer,
        correctAnswer,
        classification
      );

      const isCorrect = distilBertResult.isCorrect;
      let pointsEarned = isCorrect ? pointsPossible : 0;

      // Validate question score
      pointsEarned = ScoreValidationService.validateQuestionScore(pointsEarned, pointsPossible, question.questionNumber);

      // Determine grading method
      let gradingMethod = `distilbert_simple_${classification.questionType}`;
      if (distilBertResult.method === 'semantic_matching') {
        gradingMethod = `distilbert_semantic_${classification.questionType}`;
      } else {
        gradingMethod = `distilbert_pattern_${classification.questionType}`;
      }

      const result: EnhancedLocalGradingResult = {
        questionNumber: question.questionNumber,
        isCorrect,
        pointsEarned,
        pointsPossible,
        confidence: distilBertResult.confidence,
        gradingMethod,
        reasoning: `DistilBERT local AI: ${distilBertResult.reasoning}`,
        skillMappings,
        questionClassification: classification,
        distilBertResult,
        qualityFlags: {
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          reviewRequired: question.detectedAnswer?.reviewFlag || false,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          confidenceAdjusted: distilBertResult.confidence < 0.6,
          aiProcessingUsed: true,
          semanticMatchingUsed: distilBertResult.method === 'semantic_matching',
          localAIProcessed: true
        }
      };

      // STEP 5: Cache the result for future use
      try {
        await QuestionCacheService.setCachedQuestionResult(
          answerKey.exam_id || 'unknown',
          question.questionNumber,
          studentAnswer,
          correctAnswer,
          result
        );
      } catch (cacheError) {
        console.warn('Failed to cache question result:', cacheError);
      }

      return result;

    } catch (error) {
      console.error('DistilBERT grading failed for simple question, falling back to enhanced classification:', error);
      
      // Fallback to existing enhanced classification grading for simple questions
      return this.gradeQuestionWithEnhancedClassification(question, answerKey, skillMappings);
    }
  }

  static gradeQuestionWithEnhancedClassification(question: any, answerKey: any, skillMappings: SkillMapping[]): EnhancedLocalGradingResult {
    // Use enhanced classification instead of old logic
    const classification = EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
    
    if (!classification.shouldUseLocalGrading || !classification.isSimple) {
      return {
        questionNumber: question.questionNumber,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: classification.confidence,
        gradingMethod: 'requires_ai',
        reasoning: classification.fallbackReason || 'Complex question requiring AI analysis',
        skillMappings,
        questionClassification: classification,
        qualityFlags: {
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          reviewRequired: question.detectedAnswer?.reviewFlag || false,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          confidenceAdjusted: false
        }
      };
    }

    const studentAnswer = question.detectedAnswer?.selectedOption?.trim() || '';
    const correctAnswer = answerKey.correct_answer?.trim() || '';
    const pointsPossible = answerKey.points || 1;

    // Enhanced answer validation
    const answerValidation = EnhancedQuestionClassifier.validateSimpleAnswer(
      studentAnswer, 
      correctAnswer, 
      classification.answerPattern
    );

    const isCorrect = answerValidation.isValid;
    let pointsEarned = isCorrect ? pointsPossible : 0;

    // Validate question score
    pointsEarned = ScoreValidationService.validateQuestionScore(pointsEarned, pointsPossible, question.questionNumber);

    // Determine grading method based on question type and confidence
    let gradingMethod = `local_${classification.questionType}`;
    if (classification.confidence >= 0.85) {
      gradingMethod = `local_${classification.questionType}_high_confidence`;
    } else if (classification.confidence >= 0.6) {
      gradingMethod = `local_${classification.questionType}_medium_confidence`;
    }

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned,
      pointsPossible,
      confidence: classification.confidence,
      gradingMethod,
      reasoning: this.generateEnhancedReasoning(
        studentAnswer, 
        correctAnswer, 
        classification, 
        answerValidation
      ),
      skillMappings,
      questionClassification: classification,
      answerValidation,
      qualityFlags: {
        hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
        reviewRequired: question.detectedAnswer?.reviewFlag || false,
        bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
        confidenceAdjusted: classification.confidence < 0.6
      }
    };
  }

  private static generateEnhancedReasoning(
    studentAnswer: string, 
    correctAnswer: string, 
    classification: QuestionClassification,
    validation: SimpleAnswerValidation
  ): string {
    const questionTypeMap = {
      'multiple_choice': 'Multiple Choice',
      'true_false': 'True/False',
      'fill_in_blank': 'Fill-in-the-blank',
      'numeric': 'Numeric',
      'complex': 'Complex'
    };

    let reasoning = `Enhanced local grading (${questionTypeMap[classification.questionType]}): `;
    reasoning += `Student answered "${studentAnswer || 'no answer'}", correct answer is "${correctAnswer}"`;
    
    if (validation.matchType) {
      reasoning += ` [Validation: ${validation.matchType}, confidence: ${(validation.confidence * 100).toFixed(1)}%]`;
    }
    
    reasoning += ` [Detection: ${classification.detectionMethod}, OCR confidence: ${(classification.confidence * 100).toFixed(1)}%]`;
    
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

        // Validate skill weight before applying
        const validatedWeight = ScoreValidationService.validateSkillWeight(skillMapping.skill_weight);
        
        const weightedPoints = result.pointsPossible * validatedWeight;
        const weightedEarned = result.pointsEarned * validatedWeight;

        skillScores[skillKey].points_possible += weightedPoints;
        skillScores[skillKey].points_earned += weightedEarned;
        skillScores[skillKey].questions_attempted += 1;
        
        if (result.isCorrect) {
          skillScores[skillKey].questions_correct += 1;
        }
      }
    }

    // Calculate final scores with validation
    return Object.values(skillScores).map(skill => {
      const validation = ScoreValidationService.validateFinalScore(skill.points_earned, skill.points_possible);
      
      return {
        ...skill,
        points_earned: validation.earned,
        points_possible: validation.possible,
        score: validation.possible > 0 ? (validation.earned / validation.possible) * 100 : 0
      };
    });
  }

  // NEW: Main hybrid processing workflow with caching
  static async processQuestionsWithHybridAIWorkflow(questions: any[], answerKeys: any[], examId: string) {
    console.log('🤖🧠 Starting Hybrid AI Grading Workflow with Question-Level Caching');
    
    // STEP 1: Ensure AI skill identification is completed
    const hasAISkills = await this.ensureAISkillIdentification(examId);
    if (!hasAISkills) {
      console.error('Failed to complete AI skill identification. Cannot proceed with skill-based grading.');
      throw new Error('AI skill identification failed. Cannot proceed without identified skills.');
    }

    // STEP 2: Initialize DistilBERT model for local grading
    const distilBertService = DistilBertLocalGradingService.getInstance();
    try {
      await distilBertService.initialize();
      console.log('✅ DistilBERT model loaded and ready for simple questions');
    } catch (error) {
      console.warn('⚠️ DistilBERT initialization failed, will use pattern matching for simple questions:', error);
    }

    // STEP 3: Get AI-identified skills
    const aiIdentifiedSkills = await this.getAIIdentifiedSkillMappings(examId);
    
    if (Object.keys(aiIdentifiedSkills).length === 0) {
      console.error('No AI-identified skills found after identification process.');
      throw new Error('No skills were identified for this exam. Cannot proceed with skill-based grading.');
    }

    // STEP 4: Process questions and separate simple vs complex (with caching)
    const localResults: EnhancedLocalGradingResult[] = [];
    const complexQuestions = [];
    let locallyGradedCount = 0;
    let distilBertUsedCount = 0;
    let cacheHitCount = 0;
    
    console.log('🔍 Classifying questions for hybrid processing with caching...');
    
    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        complexQuestions.push(question);
        continue;
      }

      const questionSkillMappings = aiIdentifiedSkills[question.questionNumber] || [];
      const result = await this.gradeQuestionWithDistilBert(question, answerKey, questionSkillMappings);
      
      if (result.gradingMethod === 'requires_openai_complex') {
        complexQuestions.push(question);
      } else {
        localResults.push(result);
        locallyGradedCount++;
        
        if (result.qualityFlags?.cacheHit) {
          cacheHitCount++;
        } else if (result.distilBertResult) {
          distilBertUsedCount++;
        }
      }
    }

    console.log(`📊 Classification complete: ${locallyGradedCount} simple (${cacheHitCount} cached) + ${complexQuestions.length} complex (OpenAI)`);

    // STEP 5: Process complex questions with OpenAI (with caching)
    const { OpenAIComplexGradingService } = await import('./openAIComplexGradingService');
    const openAIResults = await OpenAIComplexGradingService.gradeComplexQuestions(
      complexQuestions,
      answerKeys,
      examId,
      questions[0]?.detectedStudentName || 'Unknown Student',
      aiIdentifiedSkills
    );

    // STEP 6: Merge results using the hybrid results merger
    const { HybridGradingResultsMerger } = await import('./hybridGradingResultsMerger');
    const hybridResults = HybridGradingResultsMerger.mergeResults(localResults, openAIResults);

    // STEP 7: Generate caching statistics
    const cacheStats = await QuestionCacheService.getQuestionCacheStats();

    console.log(`✅ Hybrid AI grading complete: ${hybridResults.totalScore.pointsEarned}/${hybridResults.totalScore.pointsPossible} (${hybridResults.totalScore.percentage}%)`);
    console.log(`💰 Cost efficiency: ${hybridResults.costAnalysis.processingBreakdown}`);
    console.log(`📋 Cache performance: ${cacheHitCount}/${locallyGradedCount} hits (${((cacheHitCount/locallyGradedCount)*100).toFixed(1)}%)`);

    return {
      hybridResults,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        openAIGraded: openAIResults.length,
        distilBertUsed: distilBertUsedCount,
        cacheHits: cacheHitCount,
        cacheHitRate: locallyGradedCount > 0 ? (cacheHitCount / locallyGradedCount) * 100 : 0,
        skillMappingAvailable: true,
        aiSkillsIdentified: true,
        hybridProcessingComplete: true,
        cachingEnabled: true,
        distilBertMetrics: {
          modelInfo: distilBertService.getModelInfo(),
          questionsProcessed: distilBertUsedCount,
          usageRate: locallyGradedCount > 0 ? (distilBertUsedCount / locallyGradedCount) * 100 : 0
        },
        openAIMetrics: {
          questionsProcessed: openAIResults.length,
          averageConfidence: openAIResults.length > 0 
            ? openAIResults.reduce((sum, r) => sum + r.confidence, 0) / openAIResults.length 
            : 0
        },
        costAnalysis: hybridResults.costAnalysis,
        cacheStats
      }
    };
  }

  // UPDATED: Redirect old methods to the new hybrid workflow
  static async processQuestionsWithDistilBertWorkflow(questions: any[], answerKeys: any[], examId: string) {
    console.log('🔄 Redirecting to Hybrid AI Workflow...');
    return this.processQuestionsWithHybridAIWorkflow(questions, answerKeys, examId);
  }

  static async processQuestionsWithHybridWorkflow(questions: any[], answerKeys: any[], examId: string) {
    return this.processQuestionsWithHybridAIWorkflow(questions, answerKeys, examId);
  }

  // Legacy methods - force use of enhanced workflow
  static processQuestionsWithSkills(questions: any[], answerKeys: any[], examId: string) {
    throw new Error('This method is deprecated. Use processQuestionsWithHybridWorkflow() instead to ensure enhanced question classification.');
  }

  static processQuestionsBasic(questions: any[], answerKeys: any[]) {
    throw new Error('Basic processing without enhanced classification is not allowed. Use processQuestionsWithHybridWorkflow() instead.');
  }

  static generateLocalFeedback(results: EnhancedLocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const questionTypes = results.reduce((acc, r) => {
      if (r.questionClassification) {
        acc[r.questionClassification.questionType] = (acc[r.questionClassification.questionType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    const multipleMarks = results.filter(r => r.qualityFlags?.hasMultipleMarks).length;
    const reviewFlagged = results.filter(r => r.qualityFlags?.reviewRequired).length;
    
    let feedback = `Enhanced local grading completed for ${total} questions. Score: ${correct}/${total} (${percentage}%)`;
    
    const typeBreakdown = Object.entries(questionTypes).map(([type, count]) => `${count} ${type.replace('_', ' ')}`).join(', ');
    if (typeBreakdown) {
      feedback += `. Question types graded: ${typeBreakdown}`;
    }
    
    if (multipleMarks > 0) {
      feedback += `. ${multipleMarks} questions had multiple marks detected`;
    }
    
    if (reviewFlagged > 0) {
      feedback += `. ${reviewFlagged} questions flagged for review`;
    }
    
    return feedback;
  }

  static generateDistilBertFeedback(results: EnhancedLocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const distilBertUsed = results.filter(r => r.distilBertResult).length;
    const semanticMatching = results.filter(r => r.distilBertResult?.method === 'semantic_matching').length;
    const cacheHits = results.filter(r => r.qualityFlags?.cacheHit).length;
    
    const questionTypes = results.reduce((acc, r) => {
      if (r.questionClassification) {
        acc[r.questionClassification.questionType] = (acc[r.questionClassification.questionType] || 0) + 1;
      }
      return acc;
    }, {} as Record<string, number>);
    
    let feedback = `🤖 DistilBERT local AI grading completed for ${total} questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (cacheHits > 0) {
      const cacheRate = ((cacheHits / total) * 100).toFixed(1);
      feedback += `. Cache hits: ${cacheHits}/${total} (${cacheRate}%)`;
    }
    
    if (distilBertUsed > 0) {
      const distilBertRate = ((distilBertUsed / total) * 100).toFixed(1);
      const semanticRate = total > 0 ? ((semanticMatching / total) * 100).toFixed(1) : '0';
      feedback += `. Local AI used: ${distilBertUsed}/${total} (${distilBertRate}%), semantic matching: ${semanticRate}%`;
    }
    
    const typeBreakdown = Object.entries(questionTypes).map(([type, count]) => `${count} ${type.replace('_', ' ')}`).join(', ');
    if (typeBreakdown) {
      feedback += `. Question types: ${typeBreakdown}`;
    }
    
    return feedback;
  }

  static generateHybridFeedback(hybridResults: any): string {
    const { HybridGradingResultsMerger } = require('./hybridGradingResultsMerger');
    return HybridGradingResultsMerger.generateHybridFeedback || 
           `🤖🧠 Hybrid AI grading completed: ${hybridResults.localResults?.length || 0} local + ${hybridResults.openAIResults?.length || 0} OpenAI processed`;
  }
}
