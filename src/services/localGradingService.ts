interface LocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local_question_based' | 'local_confident' | 'local_enhanced' | 'requires_ai';
  reasoning?: string;
  skillMappings?: Array<{
    skill_id: string;
    skill_name: string;
    skill_type: 'content' | 'subject';
    skill_weight: number;
  }>;
  qualityFlags?: {
    hasMultipleMarks: boolean;
    reviewRequired: boolean;
    bubbleQuality: string;
    confidenceAdjusted: boolean;
  };
}

interface QuestionClassification {
  questionNumber: number;
  isEasyMCQ: boolean;
  confidence: number;
  detectionMethod: string;
  shouldUseLocalGrading: boolean;
  fallbackReason?: string;
  questionAnalysis?: {
    hasMultipleMarks: boolean;
    reviewRequired: boolean;
    bubbleQuality: string;
    selectedAnswer: string;
  };
}

interface LocalSkillScore {
  skill_name: string;
  skill_type: 'content' | 'subject';
  points_earned: number;
  points_possible: number;
  score: number;
  questions_attempted: number;
  questions_correct: number;
}

import { OptimizedQuestionClassifier, OptimizedClassificationResult } from './optimizedQuestionClassifier';
import { ClassificationLogger } from './classificationLogger';
import { AnswerKeyMatchingService } from './answerKeyMatchingService';
import { ExamSkillPreClassificationService } from './examSkillPreClassificationService';
import { CacheResponseService } from './cacheResponseService';

export class LocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4;

  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
    // PHASE 1: Validate A-D format in answer key before classification
    if (answerKey?.correct_answer) {
      const correctAnswer = answerKey.correct_answer.toString().trim();
      if (!/^[A-D]$/i.test(correctAnswer)) {
        console.warn(`⚠️ Invalid answer format in answer key: ${correctAnswer}. Expected A-D only.`);
        return {
          questionNumber: question.questionNumber,
          isEasyMCQ: false,
          confidence: 0.1,
          detectionMethod: 'format_validation_failed',
          shouldUseLocalGrading: false,
          fallbackReason: `Invalid answer format: ${correctAnswer}. Only A-D supported.`,
          questionAnalysis: {
            hasMultipleMarks: false,
            reviewRequired: true,
            bubbleQuality: 'unknown',
            selectedAnswer: 'invalid_format'
          }
        };
      }
    }

    // Use optimized classifier with performance tracking
    const result: OptimizedClassificationResult = OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
    
    // Log classification for analytics
    ClassificationLogger.logClassification(
      question.questionNumber?.toString() || 'unknown',
      result,
      question,
      answerKey,
      result.metrics
    );

    // Convert to expected interface format for backward compatibility
    return {
      questionNumber: result.questionNumber,
      isEasyMCQ: result.isSimple && result.questionType === 'multiple_choice',
      confidence: result.confidence,
      detectionMethod: result.detectionMethod,
      shouldUseLocalGrading: result.shouldUseLocalGrading,
      fallbackReason: result.fallbackReason,
      questionAnalysis: result.questionAnalysis
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

  static gradeQuestion(question: any, answerKey: any, skillMappings?: Array<{
    skill_id: string;
    skill_name: string;
    skill_type: 'content' | 'subject';
    skill_weight: number;
  }>): LocalGradingResult {
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
    let gradingMethod: LocalGradingResult['gradingMethod'] = 'local_question_based';
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
      skillMappings,
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

  // UPDATED: Process questions with class-specific skill pre-classification integration
  static async processQuestionsWithSkills(questions: any[], answerKeys: any[], examId: string, classId?: string): Promise<{
    localResults: LocalGradingResult[];
    aiRequiredQuestions: any[];
    skillScores: LocalSkillScore[];
    summary: {
      totalQuestions: number;
      locallyGraded: number;
      requiresAI: number;
      localAccuracy: number;
      skillMappingAvailable: boolean;
      skillCoverage: number;
      classSpecificSkills: boolean;
      enhancedMetrics: {
        questionBasedGraded: number;
        highConfidenceGraded: number;
        mediumConfidenceGraded: number;
        enhancedThresholdGraded: number;
        multipleMarksDetected: number;
        reviewFlagged: number;
        bubbleQualityDistribution: Record<string, number>;
        formatValidationFailures: number;
        skillMappedQuestions: number;
        cacheHitRate: number;
        skillAwareCacheUsage: number;
      };
    };
  }> {
    console.log('🎯 Processing questions with enhanced skill-aware caching integration');

    // STEP 1: Ensure skill pre-classification exists and uses class-specific skills
    const skillStatus = await ExamSkillPreClassificationService.getPreClassificationStatus(examId);
    
    if (!skillStatus.exists || skillStatus.status !== 'completed') {
      console.log('🔄 Triggering class-specific skill pre-classification...');
      const skillResult = await ExamSkillPreClassificationService.triggerSkillPreClassification(examId);
      
      if (skillResult.status !== 'completed') {
        console.warn('Skill pre-classification failed, proceeding without skills');
        const basicResult = this.processQuestions(questions, answerKeys);
        return {
          ...basicResult,
          skillScores: [],
          summary: {
            ...basicResult.summary,
            skillMappingAvailable: false,
            skillCoverage: 0,
            classSpecificSkills: false,
            enhancedMetrics: {
              ...basicResult.summary.enhancedMetrics,
              skillMappedQuestions: 0,
              cacheHitRate: 0,
              skillAwareCacheUsage: 0
            }
          }
        };
      }
    }

    // STEP 2: Get class-specific pre-classified skills
    const preClassifiedSkills = await ExamSkillPreClassificationService.getPreClassifiedSkills(examId);
    
    if (!preClassifiedSkills) {
      console.warn('No pre-classified skills available');
      const basicResult = this.processQuestions(questions, answerKeys);
      return {
        ...basicResult,
        skillScores: [],
        summary: {
          ...basicResult.summary,
          skillMappingAvailable: false,
          skillCoverage: 0,
          classSpecificSkills: false,
          enhancedMetrics: {
            ...basicResult.summary.enhancedMetrics,
            skillMappedQuestions: 0,
            cacheHitRate: 0,
            skillAwareCacheUsage: 0
          }
        }
      };
    }

    const localResults: LocalGradingResult[] = [];
    const aiRequiredQuestions: any[] = [];
    let locallyGradedCount = 0;
    
    // Enhanced metrics tracking including cache performance
    let questionBasedCount = 0;
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let enhancedThresholdCount = 0;
    let multipleMarksCount = 0;
    let reviewFlaggedCount = 0;
    let formatValidationFailures = 0;
    let skillMappedQuestions = 0;
    let cacheHits = 0;
    let skillAwareCacheUsage = 0;
    const bubbleQualityDist: Record<string, number> = {};

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        console.warn(`⚠️ No answer key found for question ${question.questionNumber}`);
        aiRequiredQuestions.push(question);
        continue;
      }

      // Get class-specific skill mappings for this question
      const questionSkills = preClassifiedSkills.questionMappings.get(question.questionNumber);
      const skillMappings = questionSkills ? [
        ...questionSkills.contentSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'content' as const,
          skill_weight: skill.weight
        })),
        ...questionSkills.subjectSkills.map(skill => ({
          skill_id: skill.id,
          skill_name: skill.name,
          skill_type: 'subject' as const,
          skill_weight: skill.weight
        }))
      ] : undefined;

      if (skillMappings && skillMappings.length > 0) {
        skillMappedQuestions++;
        
        // Try skill-aware caching for grading
        try {
          const cachedResult = await CacheResponseService.fetchOrGenerateGradingResponse(
            examId,
            question.questionNumber,
            question.detectedAnswer?.selectedOption || '',
            answerKey.correct_answer,
            skillMappings,
            async () => this.gradeQuestion(question, answerKey, skillMappings),
            'local_grading_with_skills'
          );
          
          if (cachedResult && cachedResult.cacheHit) {
            cacheHits++;
            skillAwareCacheUsage++;
          }
          
          const result = cachedResult || this.gradeQuestion(question, answerKey, skillMappings);
          
          // Track format validation failures
          if (result.gradingMethod === 'requires_ai' && 
              result.reasoning?.includes('Invalid answer format')) {
            formatValidationFailures++;
          }
          
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
        } catch (error) {
          console.error(`Error processing question ${question.questionNumber} with skill-aware cache:`, error);
          // Fallback to regular grading
          const result = this.gradeQuestion(question, answerKey, skillMappings);
          
          if (result.gradingMethod === 'requires_ai') {
            aiRequiredQuestions.push(question);
          } else {
            localResults.push(result);
            locallyGradedCount++;
          }
        }
      } else {
        // Process without skill mappings
        const result = this.gradeQuestion(question, answerKey);
        
        if (result.gradingMethod === 'requires_ai') {
          aiRequiredQuestions.push(question);
        } else {
          localResults.push(result);
          locallyGradedCount++;
        }
      }
    }

    // Calculate skill scores from class-specific mappings
    const skillScores = this.calculateSkillScores(localResults);

    // Calculate skill coverage and cache performance
    const skillCoverage = questions.length > 0 ? (skillMappedQuestions / questions.length) * 100 : 0;
    const cacheHitRate = skillMappedQuestions > 0 ? (cacheHits / skillMappedQuestions) * 100 : 0;

    // Check if class-specific skills were used
    const classSpecificSkills = !!preClassifiedSkills && preClassifiedSkills.questionMappings.size > 0;

    console.log(`✅ Enhanced skill-aware integration complete: ${skillMappedQuestions}/${questions.length} questions mapped`);
    console.log(`📋 Cache performance: ${cacheHits}/${skillMappedQuestions} skill-aware cache hits (${cacheHitRate.toFixed(1)}%)`);

    return {
      localResults,
      aiRequiredQuestions,
      skillScores,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        skillMappingAvailable: classSpecificSkills,
        skillCoverage,
        classSpecificSkills,
        enhancedMetrics: {
          questionBasedGraded: questionBasedCount,
          highConfidenceGraded: highConfidenceCount,
          mediumConfidenceGraded: mediumConfidenceCount,
          enhancedThresholdGraded: enhancedThresholdCount,
          multipleMarksDetected: multipleMarksCount,
          reviewFlagged: reviewFlaggedCount,
          bubbleQualityDistribution: bubbleQualityDist,
          formatValidationFailures,
          skillMappedQuestions,
          cacheHitRate,
          skillAwareCacheUsage
        }
      }
    };
  }

  // Updated original method to maintain backward compatibility
  static processQuestions(questions: any[], answerKeys: any[]): {
    localResults: LocalGradingResult[];
    aiRequiredQuestions: any[];
    skillScores: LocalSkillScore[];
    summary: {
      totalQuestions: number;
      locallyGraded: number;
      requiresAI: number;
      localAccuracy: number;
      enhancedMetrics: {
        questionBasedGraded: number;
        highConfidenceGraded: number;
        mediumConfidenceGraded: number;
        enhancedThresholdGraded: number;
        multipleMarksDetected: number;
        reviewFlagged: number;
        bubbleQualityDistribution: Record<string, number>;
        formatValidationFailures: number;
      };
    };
  } {
    const localResults: LocalGradingResult[] = [];
    const aiRequiredQuestions: any[] = [];
    let locallyGradedCount = 0;
    
    // Enhanced metrics tracking for question-based grading
    let questionBasedCount = 0;
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let enhancedThresholdCount = 0;
    let multipleMarksCount = 0;
    let reviewFlaggedCount = 0;
    let formatValidationFailures = 0;
    const bubbleQualityDist: Record<string, number> = {};

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        console.warn(`⚠️ No answer key found for question ${question.questionNumber}`);
        aiRequiredQuestions.push(question);
        continue;
      }

      const result = this.gradeQuestion(question, answerKey);
      
      // Track format validation failures
      if (result.gradingMethod === 'requires_ai' && 
          result.reasoning?.includes('Invalid answer format')) {
        formatValidationFailures++;
      }
      
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

    // Calculate skill scores from locally graded results
    const skillScores = this.calculateSkillScores(localResults);

    return {
      localResults,
      aiRequiredQuestions,
      skillScores,
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
          bubbleQualityDistribution: bubbleQualityDist,
          formatValidationFailures
        }
      }
    };
  }

  // NEW: Calculate skill scores from graded results
  static calculateSkillScores(localResults: LocalGradingResult[]): LocalSkillScore[] {
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

  static generateLocalFeedback(results: LocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const multipleMarks = results.filter(r => r.qualityFlags?.hasMultipleMarks).length;
    const reviewFlagged = results.filter(r => r.qualityFlags?.reviewRequired).length;
    const questionBased = results.filter(r => r.gradingMethod === 'local_question_based').length;
    const skillMapped = results.filter(r => r.skillMappings && r.skillMappings.length > 0).length;
    
    let feedback = `Question-based automated grading completed for ${total} multiple choice questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (questionBased > 0) {
      feedback += `. ${questionBased} questions graded using enhanced question-based analysis`;
    }

    if (skillMapped > 0) {
      feedback += `. ${skillMapped} questions have class-specific skill mappings for detailed analytics`;
    }
    
    if (multipleMarks > 0) {
      feedback += `. ${multipleMarks} questions had multiple marks detected`;
    }
    
    if (reviewFlagged > 0) {
      feedback += `. ${reviewFlagged} questions flagged for review due to quality concerns`;
    }
    
    return feedback;
  }

  static generateQualityReport(results: LocalGradingResult[]): {
    overallQuality: string;
    recommendations: string[];
    qualityDistribution: Record<string, number>;
    skillCoverage?: {
      totalQuestions: number;
      skillMappedQuestions: number;
      coveragePercentage: number;
      skillTypes: Record<string, number>;
    };
  } {
    const qualityDist: Record<string, number> = {};
    const recommendations: string[] = [];
    
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

    // Calculate skill coverage
    const skillMappedQuestions = results.filter(r => r.skillMappings && r.skillMappings.length > 0).length;
    const skillTypes: Record<string, number> = {};
    
    results.forEach(result => {
      if (result.skillMappings) {
        result.skillMappings.forEach(skill => {
          skillTypes[skill.skill_type] = (skillTypes[skill.skill_type] || 0) + 1;
        });
      }
    });

    const skillCoverage = {
      totalQuestions: results.length,
      skillMappedQuestions,
      coveragePercentage: results.length > 0 ? (skillMappedQuestions / results.length) * 100 : 0,
      skillTypes
    };

    if (skillCoverage.coveragePercentage < 50) {
      recommendations.push('Consider running skill pre-classification to improve analytics');
    }
    
    return {
      overallQuality,
      recommendations,
      qualityDistribution: qualityDist,
      skillCoverage
    };
  }

  // New method to get comprehensive performance metrics including cache
  static getOptimizationMetrics() {
    return {
      classifier: OptimizedQuestionClassifier.getPerformanceMetrics(),
      analytics: ClassificationLogger.getClassificationAnalytics(),
      answerKeyMatching: {
        cacheSize: AnswerKeyMatchingService['answerKeyCache']?.size || 0,
      },
      cache: CacheResponseService.getCacheAnalytics()
    };
  }

  // Enhanced optimization with cache management
  static optimizePerformance() {
    OptimizedQuestionClassifier.optimizeCache(1000);
    AnswerKeyMatchingService.optimizeCache(50);
    ClassificationLogger.clearLogs();
    ExamSkillPreClassificationService.clearCache();
    // Note: Cache services manage their own optimization
    console.log('🚀 Local grading service performance optimized with skill-aware caching');
  }
}
