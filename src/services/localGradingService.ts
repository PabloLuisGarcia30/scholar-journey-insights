interface LocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local_question_based' | 'local_confident' | 'local_enhanced' | 'requires_ai';
  reasoning?: string;
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

import { OptimizedQuestionClassifier, OptimizedClassificationResult } from './optimizedQuestionClassifier';
import { ClassificationLogger } from './classificationLogger';

export class LocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4;

  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
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

  static gradeQuestion(question: any, answerKey: any): LocalGradingResult {
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

  static processQuestions(questions: any[], answerKeys: any[]): {
    localResults: LocalGradingResult[];
    aiRequiredQuestions: any[];
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
    const bubbleQualityDist: Record<string, number> = {};

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

  static generateLocalFeedback(results: LocalGradingResult[]): string {
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

  static generateQualityReport(results: LocalGradingResult[]): {
    overallQuality: string;
    recommendations: string[];
    qualityDistribution: Record<string, number>;
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
    
    return {
      overallQuality,
      recommendations,
      qualityDistribution: qualityDist
    };
  }

  // New method to get performance metrics
  static getOptimizationMetrics() {
    return {
      classifier: OptimizedQuestionClassifier.getPerformanceMetrics(),
      analytics: ClassificationLogger.getClassificationAnalytics()
    };
  }

  // New method to optimize performance
  static optimizePerformance() {
    OptimizedQuestionClassifier.optimizeCache(1000);
    ClassificationLogger.clearLogs();
    console.log('🚀 Local grading service performance optimized');
  }
}
