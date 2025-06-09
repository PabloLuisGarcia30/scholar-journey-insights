import { supabase } from "@/integrations/supabase/client";
import { EnhancedQuestionClassifier, QuestionClassification, SimpleAnswerValidation } from "./enhancedQuestionClassifier";
import { DistilBertLocalGradingService, DistilBertGradingResult } from "./distilBertLocalGrading";
import { QuestionCacheService, QuestionCacheResult } from "./questionCacheService";
import { ExamSkillPreClassificationService, SkillMappingCache } from "./examSkillPreClassificationService";

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
  distilBertResult?: DistilBertGradingResult;
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

  // UPDATED: Use ExamSkillPreClassificationService with class-specific skill integration
  static async ensureAISkillIdentification(examId: string): Promise<boolean> {
    return ExamSkillPreClassificationService.triggerSkillPreClassification(examId)
      .then(result => result.status === 'completed');
  }

  // UPDATED: Get class-specific skill mappings using pre-classification service
  static async getAIIdentifiedSkillMappings(examId: string): Promise<QuestionSkillMappings> {
    console.log('Fetching class-specific AI-identified skill mappings for exam:', examId);
    
    const skillMappingCache = await ExamSkillPreClassificationService.getPreClassifiedSkills(examId);
    
    if (!skillMappingCache) {
      console.warn('No class-specific pre-classified skills available');
      return {};
    }

    const skillMappings: QuestionSkillMappings = {};
    
    // Convert from cache format to QuestionSkillMappings format
    skillMappingCache.questionMappings.forEach((skills, questionNumber) => {
      skillMappings[questionNumber] = [
        ...skills.contentSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'content' as const,
          skill_weight: skill.weight,
          confidence: 1.0 // Default confidence from pre-classification
        })),
        ...skills.subjectSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'subject' as const,
          skill_weight: skill.weight,
          confidence: 1.0 // Default confidence from pre-classification
        }))
      ];
    });

    console.log('✓ Loaded class-specific AI-identified skills for', Object.keys(skillMappings).length, 'questions via pre-classification service');
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
          skillMappings,
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

    // STEP 4: Process SIMPLE questions with Enhanced DistilBERT (now with WASM support)
    console.log(`Question ${question.questionNumber}: Simple question detected, processing with Enhanced DistilBERT (WASM)`);
    
    const pointsPossible = answerKey.points || 1;

    try {
      // Use Enhanced DistilBERT with WASM support for semantic grading
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

      // Determine grading method with WASM indication
      let gradingMethod = `distilbert_simple_${classification.questionType}`;
      if (distilBertResult.wasmResult?.method === 'wasm_distilbert_large') {
        gradingMethod = `wasm_distilbert_${classification.questionType}`;
      } else if (distilBertResult.method === 'semantic_matching') {
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
        reasoning: `Enhanced DistilBERT${distilBertResult.wasmResult ? ' (WASM)' : ''}: ${distilBertResult.reasoning}`,
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
          localAIProcessed: true,
          wasmProcessed: !!distilBertResult.wasmResult,
          processingTime: distilBertResult.processingTime
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
      console.error('Enhanced DistilBERT grading failed, falling back to basic classification:', error);
      
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

  // UPDATED: Main hybrid processing workflow with class-specific skill pre-classification
  static async processQuestionsWithHybridAIWorkflow(questions: any[], answerKeys: any[], examId: string) {
    console.log('🤖🧠 Starting Enhanced Hybrid AI Grading Workflow with Class-Specific Skill Pre-Classification');
    
    // STEP 1: Use ExamSkillPreClassificationService to ensure class-specific skill pre-classification
    console.log('🎯 Checking class-specific skill pre-classification status...');
    const skillStatus = await ExamSkillPreClassificationService.getPreClassificationStatus(examId);
    
    if (!skillStatus.exists || skillStatus.status !== 'completed') {
      console.log('🔄 Triggering class-specific skill pre-classification...');
      const skillResult = await ExamSkillPreClassificationService.triggerSkillPreClassification(examId);
      
      if (skillResult.status !== 'completed') {
        console.error('❌ Class-specific skill pre-classification failed:', skillResult.error);
        throw new Error(`Class-specific skill pre-classification failed: ${skillResult.error || 'Unknown error'}`);
      }
      
      console.log('✅ Class-specific skill pre-classification completed successfully');
    } else {
      console.log('✅ Class-specific skill pre-classification already completed');
    }

    // STEP 2: Initialize DistilBERT model for local grading
    const distilBertService = DistilBertLocalGradingService.getInstance();
    try {
      await distilBertService.initialize();
      console.log('✅ DistilBERT model loaded and ready for simple questions');
    } catch (error) {
      console.warn('⚠️ DistilBERT initialization failed, will use pattern matching for simple questions:', error);
    }

    // STEP 3: Get class-specific pre-classified skills using the service
    const preClassifiedSkills = await ExamSkillPreClassificationService.getPreClassifiedSkills(examId);
    
    if (!preClassifiedSkills || preClassifiedSkills.questionMappings.size === 0) {
      console.error('❌ No class-specific pre-classified skills found after identification process.');
      throw new Error('No class-specific skills were identified for this exam. Cannot proceed with skill-based grading.');
    }

    console.log(`📊 Loaded ${preClassifiedSkills.questionMappings.size} question class-specific skill mappings from cache`);

    // STEP 4: Process questions and separate simple vs complex (with caching)
    const localResults: EnhancedLocalGradingResult[] = [];
    const complexQuestions = [];
    let locallyGradedCount = 0;
    let distilBertUsedCount = 0;
    let cacheHitCount = 0;
    
    console.log('🔍 Classifying questions for hybrid processing with class-specific skills and caching...');
    
    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        complexQuestions.push(question);
        continue;
      }

      // Get class-specific skill mappings for this question from pre-classified skills
      const questionSkills = preClassifiedSkills.questionMappings.get(question.questionNumber);
      const skillMappings: SkillMapping[] = questionSkills ? [
        ...questionSkills.contentSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'content' as const,
          skill_weight: skill.weight,
          confidence: 1.0
        })),
        ...questionSkills.subjectSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'subject' as const,
          skill_weight: skill.weight,
          confidence: 1.0
        }))
      ] : [];

      const result = await this.gradeQuestionWithDistilBert(question, answerKey, skillMappings);
      
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

    console.log(`📊 Classification complete: ${locallyGradedCount} simple (${cacheHitCount} cached) + ${complexQuestions.length} complex (OpenAI) using class-specific skills`);

    // STEP 5: Process complex questions with OpenAI (with class-specific caching)
    const { OpenAIComplexGradingService } = await import('./openAIComplexGradingService');
    
    // Convert class-specific skill mappings for OpenAI service
    const aiIdentifiedSkills: QuestionSkillMappings = {};
    preClassifiedSkills.questionMappings.forEach((skills, questionNumber) => {
      aiIdentifiedSkills[questionNumber] = [
        ...skills.contentSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'content' as const,
          skill_weight: skill.weight,
          confidence: 1.0
        })),
        ...skills.subjectSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'subject' as const,
          skill_weight: skill.weight,
          confidence: 1.0
        }))
      ];
    });

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

    // STEP 7: Generate enhanced statistics with class-specific skill pre-classification metrics
    const cacheStats = await QuestionCacheService.getQuestionCacheStats();
    const skillCacheStats = ExamSkillPreClassificationService.getCacheStats();

    console.log(`✅ Enhanced Hybrid AI grading complete with class-specific skills: ${hybridResults.totalScore.pointsEarned}/${hybridResults.totalScore.pointsPossible} (${hybridResults.totalScore.percentage}%)`);
    console.log(`💰 Cost efficiency: ${hybridResults.costAnalysis.processingBreakdown}`);
    console.log(`📋 Cache performance: ${cacheHitCount}/${locallyGradedCount} hits (${((cacheHitCount/locallyGradedCount)*100).toFixed(1)}%)`);
    console.log(`🎯 Class-specific skill coverage: ${preClassifiedSkills.questionMappings.size}/${questions.length} questions (${((preClassifiedSkills.questionMappings.size/questions.length)*100).toFixed(1)}%)`);

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
        classSpecificSkills: true,
        hybridProcessingComplete: true,
        cachingEnabled: true,
        skillPreClassificationUsed: true,
        skillCoverage: (preClassifiedSkills.questionMappings.size / questions.length) * 100,
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
        cacheStats,
        skillCacheStats,
        preClassificationStatus: skillStatus
      }
    };
  }

  // UPDATED: Redirect old methods to the new enhanced workflow
  static async processQuestionsWithDistilBertWorkflow(questions: any[], answerKeys: any[], examId: string) {
    console.log('🔄 Redirecting to Enhanced Hybrid AI Workflow...');
    return this.processQuestionsWithHybridAIWorkflow(questions, answerKeys, examId);
  }

  static async processQuestionsWithHybridWorkflow(questions: any[], answerKeys: any[], examId: string) {
    return this.processQuestionsWithHybridAIWorkflow(questions, answerKeys, examId);
  }

  // Legacy methods - force use of enhanced workflow
  static processQuestionsWithSkills(questions: any[], answerKeys: any[], examId: string) {
    throw new Error('This method is deprecated. Use processQuestionsWithHybridAIWorkflow() instead to ensure enhanced question classification and skill pre-classification.');
  }

  static processQuestionsBasic(questions: any[], answerKeys: any[]) {
    throw new Error('Basic processing without enhanced classification is not allowed. Use processQuestionsWithHybridAIWorkflow() instead.');
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
    const skillMapped = results.filter(r => r.skillMappings && r.skillMappings.length > 0).length;
    
    let feedback = `Enhanced local grading completed for ${total} questions. Score: ${correct}/${total} (${percentage}%)`;
    
    const typeBreakdown = Object.entries(questionTypes).map(([type, count]) => `${count} ${type.replace('_', ' ')}`).join(', ');
    if (typeBreakdown) {
      feedback += `. Question types graded: ${typeBreakdown}`;
    }

    if (skillMapped > 0) {
      const skillCoverage = ((skillMapped / total) * 100).toFixed(1);
      feedback += `. Class-specific skill mappings: ${skillMapped}/${total} (${skillCoverage}%)`;
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
    const wasmUsed = results.filter(r => r.qualityFlags?.wasmProcessed).length;
    const semanticMatching = results.filter(r => r.distilBertResult?.method === 'semantic_matching').length;
    const cacheHits = results.filter(r => r.qualityFlags?.cacheHit).length;
    const skillMapped = results.filter(r => r.skillMappings && r.skillMappings.length > 0).length;
    
    const avgProcessingTime = results
      .filter(r => r.qualityFlags?.processingTime)
      .reduce((sum, r) => sum + (r.qualityFlags?.processingTime || 0), 0) / 
      Math.max(1, results.filter(r => r.qualityFlags?.processingTime).length);
    
    let feedback = `🤖 Enhanced DistilBERT grading completed for ${total} questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (wasmUsed > 0) {
      const wasmRate = ((wasmUsed / total) * 100).toFixed(1);
      feedback += `. WASM processing: ${wasmUsed}/${total} (${wasmRate}%)`;
    }
    
    if (cacheHits > 0) {
      const cacheRate = ((cacheHits / total) * 100).toFixed(1);
      feedback += `. Cache hits: ${cacheHits}/${total} (${cacheRate}%)`;
    }
    
    if (distilBertUsed > 0) {
      const distilBertRate = ((distilBertUsed / total) * 100).toFixed(1);
      feedback += `. Local AI used: ${distilBertUsed}/${total} (${distilBertRate}%)`;
    }

    if (skillMapped > 0) {
      const skillRate = ((skillMapped / total) * 100).toFixed(1);
      feedback += `. Skill mappings: ${skillMapped}/${total} (${skillRate}%)`;
    }
    
    if (avgProcessingTime > 0) {
      feedback += `. Avg processing: ${avgProcessingTime.toFixed(0)}ms/question`;
    }
    
    return feedback;
  }

  static generateHybridFeedback(hybridResults: any): string {
    const { HybridGradingResultsMerger } = require('./hybridGradingResultsMerger');
    return HybridGradingResultsMerger.generateHybridFeedback || 
           `🤖🧠 Enhanced Hybrid AI grading completed with class-specific skills: ${hybridResults.localResults?.length || 0} local + ${hybridResults.openAIResults?.length || 0} OpenAI processed`;
  }
}
