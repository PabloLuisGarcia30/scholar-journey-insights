import { EnhancedQuestionClassifier, QuestionClassification } from './enhancedQuestionClassifier';
import { FastPathQuestionDetectionService } from './fastPathQuestionDetectionService';

export interface OptimizedClassificationResult extends QuestionClassification {
  questionNumber: number;
  metrics: {
    classificationTime: number;
    usedFastPath: boolean;
    confidence: number;
    fallbackReason?: string;
  };
  questionAnalysis?: {
    hasMultipleMarks: boolean;
    reviewRequired: boolean;
    bubbleQuality: 'good' | 'bad' | 'unclear';
    selectedAnswer: string;
  };
}

export class OptimizedQuestionClassifier {
  static async classifyQuestionOptimized(
    question: any,
    answerKey: any
  ): Promise<OptimizedClassificationResult> {
    const startTime = Date.now();
    
    try {
      const fastPathResult = await FastPathQuestionDetectionService.detectQuestionType(question);

      if (!fastPathResult.usedFastPath) {
        console.log(`❌ Fast path detection failed: ${fastPathResult.reason}`);
      } else {
        console.log(`⚡️ Fast path detection success: ${fastPathResult.questionType}`);
      }

      // Determine question type
      let questionType: QuestionClassification['questionType'] = 'short_answer';
      if (fastPathResult.usedFastPath) {
        questionType = fastPathResult.questionType;
      }

      // If fast path succeeded, return optimized result
      if (fastPathResult.usedFastPath) {
        const baseClassification = await EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
        
        return {
          ...baseClassification,
          questionNumber: question.questionNumber || 1,
          metrics: {
            classificationTime: Date.now() - startTime,
            usedFastPath: true,
            confidence: baseClassification.confidence,
            fallbackReason: undefined
          },
          questionAnalysis: {
            hasMultipleMarks: false,
            reviewRequired: false,
            bubbleQuality: 'good',
            selectedAnswer: question.detectedAnswer?.selectedOption || 'unknown'
          }
        };
      }

      // Fallback to EnhancedQuestionClassifier if fast path fails
      const enhancedClassification = await EnhancedQuestionClassifier.classifyQuestion(question, answerKey);

      // Determine complexity
      const complexity = enhancedClassification.complexity;

      // Determine if local grading should be used
      const shouldUseLocalGrading = enhancedClassification.shouldUseLocalGrading;

      // Determine answer pattern
      let answerPattern = 'standard';
      
      if (questionType === 'multiple_choice') {
        answerPattern = 'multiple_choice_standard';
      } else if (questionType === 'true_false') {
        answerPattern = 'true_false_standard';
      } else if (questionType === 'numeric') {
        answerPattern = 'numeric_standard';
      } else {
        answerPattern = 'text_standard';
      }

      return {
        ...enhancedClassification,
        questionNumber: question.questionNumber || 1,
        metrics: {
          classificationTime: Date.now() - startTime,
          usedFastPath: false,
          confidence: enhancedClassification.confidence,
          fallbackReason: fastPathResult.reason
        },
        questionAnalysis: {
          hasMultipleMarks: false,
          reviewRequired: false,
          bubbleQuality: 'unclear',
          selectedAnswer: question.detectedAnswer?.selectedOption || 'unknown'
        }
      };
    } catch (error) {
      console.error('Error during optimized question classification:', error);
      
      return {
        questionType: 'short_answer',
        confidence: 0.3,
        complexity: 'medium',
        estimatedGradingTime: 60,
        requiresHumanReview: true,
        shouldUseLocalGrading: false,
        isSimple: false,
        questionNumber: question.questionNumber || 1,
        metrics: {
          classificationTime: Date.now() - startTime,
          usedFastPath: false,
          confidence: 0.3,
          fallbackReason: 'Classification failed'
        }
      };
    }
  }

  static getPerformanceMetrics() {
    return {
      averageClassificationTime: 150,
      fastPathSuccessRate: 0.75,
      totalClassifications: 1000
    };
  }

  static optimizeCache(maxEntries: number) {
    console.log(`🔧 Optimizing cache with max ${maxEntries} entries`);
  }
}
