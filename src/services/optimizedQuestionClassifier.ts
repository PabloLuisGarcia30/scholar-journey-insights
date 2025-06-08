
import { 
  EnhancedQuestionClassifier,
  QuestionClassification,
  SimpleAnswerValidation
} from './enhancedQuestionClassifier';

// Performance-optimized layer for Enhanced Question Classifier
// Integrates fast-path detection with comprehensive analysis

interface ClassificationMetrics {
  classificationTime: number;
  usedFastPath: boolean;
  confidence: number;
  fallbackReason?: string;
}

interface OptimizedClassificationResult extends QuestionClassification {
  metrics: ClassificationMetrics;
}

export class OptimizedQuestionClassifier {
  // Precompiled regex patterns for performance optimization
  private static readonly PRECOMPILED_PATTERNS = {
    mcq: /^[A-E]$/i,  // Extended to support A-E (was A-D)
    mcqLowercase: /^[a-e]$/,
    trueFalse: /^(true|false|t|f)$/i,
    numeric: /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/,
    simpleUnit: /^-?\d+(\.\d+)?\s*[a-zA-Z°%]{0,5}$/,
    fraction: /^\d+\/\d+$/,
    booleanWords: /^(yes|no|y|n|correct|incorrect|right|wrong|1|0)$/i
  };

  // Fast-path classification patterns for instant detection
  private static readonly FAST_PATH_PATTERNS = [
    'multiple choice',
    'multiple_choice', 
    'true/false',
    'true_false',
    'boolean',
    'mcq'
  ];

  // Performance metrics tracking
  private static metrics = {
    totalClassifications: 0,
    fastPathUsed: 0,
    averageTime: 0,
    cacheHits: 0
  };

  // Simple classification cache (content-based)
  private static classificationCache = new Map<string, QuestionClassification>();

  static quickClassify(question: any, answerKey: any): OptimizedClassificationResult | null {
    const startTime = performance.now();
    
    // Generate cache key based on question content
    const cacheKey = this.generateCacheKey(question, answerKey);
    const cached = this.classificationCache.get(cacheKey);
    
    if (cached) {
      this.metrics.cacheHits++;
      return {
        ...cached,
        metrics: {
          classificationTime: performance.now() - startTime,
          usedFastPath: true,
          confidence: cached.confidence
        }
      };
    }

    // Fast-path detection for obvious simple questions
    const fastPathResult = this.tryFastPath(question, answerKey);
    
    if (fastPathResult) {
      // Cache the result for future use
      this.classificationCache.set(cacheKey, fastPathResult);
      this.metrics.fastPathUsed++;
      
      return {
        ...fastPathResult,
        metrics: {
          classificationTime: performance.now() - startTime,
          usedFastPath: true,
          confidence: fastPathResult.confidence
        }
      };
    }

    return null; // Fall back to comprehensive analysis
  }

  private static tryFastPath(question: any, answerKey: any): QuestionClassification | null {
    if (!answerKey) return null;

    const questionType = answerKey.question_type?.toLowerCase() || '';
    const correctAnswer = answerKey.correct_answer?.toString().trim() || '';
    const hasOptions = answerKey.options && Array.isArray(answerKey.options);
    const studentAnswer = question.detectedAnswer?.selectedOption || '';
    const ocrConfidence = question.detectedAnswer?.confidence || 0;

    // Fast-path 1: Explicit question type hints
    if (this.FAST_PATH_PATTERNS.some(pattern => questionType.includes(pattern))) {
      if (questionType.includes('multiple') && (hasOptions || this.PRECOMPILED_PATTERNS.mcq.test(correctAnswer))) {
        return this.createFastPathResult(question, 'multiple_choice', 0.9, 'fast_mcq_type');
      }
      
      if (questionType.includes('true') || questionType.includes('false') || questionType.includes('boolean')) {
        return this.createFastPathResult(question, 'true_false', 0.85, 'fast_boolean_type');
      }
    }

    // Fast-path 2: Clear answer patterns
    if (this.PRECOMPILED_PATTERNS.mcq.test(correctAnswer) && ocrConfidence > 0.7) {
      return this.createFastPathResult(question, 'multiple_choice', 0.85, 'fast_mcq_answer');
    }

    if (this.PRECOMPILED_PATTERNS.trueFalse.test(correctAnswer) && ocrConfidence > 0.6) {
      return this.createFastPathResult(question, 'true_false', 0.8, 'fast_boolean_answer');
    }

    if (this.PRECOMPILED_PATTERNS.numeric.test(correctAnswer) && ocrConfidence > 0.65) {
      return this.createFastPathResult(question, 'numeric', 0.75, 'fast_numeric_answer');
    }

    // Fast-path 3: Options array present (clear MCQ)
    if (hasOptions && answerKey.options.length >= 2 && answerKey.options.length <= 5) {
      return this.createFastPathResult(question, 'multiple_choice', 0.9, 'fast_options_array');
    }

    return null; // No fast-path match
  }

  private static createFastPathResult(
    question: any, 
    questionType: QuestionClassification['questionType'], 
    confidence: number,
    detectionMethod: string
  ): QuestionClassification {
    const studentAnswer = question.detectedAnswer?.selectedOption || '';
    const hasMultipleMarks = question.detectedAnswer?.multipleMarksDetected || false;
    const reviewRequired = question.detectedAnswer?.reviewFlag || false;
    const bubbleQuality = question.detectedAnswer?.bubbleQuality || 'unknown';

    // Apply quality gates even in fast-path
    const shouldUseLocal = confidence > 0.6 && 
                          !reviewRequired && 
                          !hasMultipleMarks &&
                          studentAnswer !== 'no_answer' &&
                          bubbleQuality !== 'empty';

    return {
      questionNumber: question.questionNumber,
      questionType,
      isSimple: true,
      confidence,
      detectionMethod: `optimized_${detectionMethod}`,
      shouldUseLocalGrading: shouldUseLocal,
      fallbackReason: shouldUseLocal ? undefined : this.getFastPathFallbackReason(confidence, question.detectedAnswer),
      answerPattern: this.createAnswerPattern(questionType, question, answerKey)
    };
  }

  private static getFastPathFallbackReason(confidence: number, detectedAnswer: any): string {
    const reasons = [];
    
    if (confidence < 0.6) reasons.push('Insufficient confidence for fast-path');
    if (detectedAnswer?.reviewFlag) reasons.push('Flagged for manual review');
    if (detectedAnswer?.multipleMarksDetected) reasons.push('Multiple marks detected');
    if (!detectedAnswer?.selectedOption || detectedAnswer.selectedOption === 'no_answer') {
      reasons.push('No clear answer detected');
    }
    if (detectedAnswer?.bubbleQuality === 'empty') reasons.push('Empty bubble detected');
    
    return reasons.length > 0 ? reasons.join(', ') : 'Fast-path quality threshold not met';
  }

  private static createAnswerPattern(
    questionType: QuestionClassification['questionType'], 
    question: any, 
    answerKey: any
  ): QuestionClassification['answerPattern'] {
    const correctAnswer = answerKey.correct_answer?.toString().trim() || '';

    switch (questionType) {
      case 'multiple_choice':
        return {
          type: 'exact_match',
          expectedFormat: 'A|B|C|D|E',
          variations: ['A', 'B', 'C', 'D', 'E', 'a', 'b', 'c', 'd', 'e']
        };
      case 'true_false':
        return {
          type: 'boolean_variation',
          expectedFormat: 'True|False',
          variations: ['true', 'false', 't', 'f', 'yes', 'no', 'y', 'n', '1', '0']
        };
      case 'numeric':
        return {
          type: 'numeric_range',
          expectedFormat: 'number',
          variations: [correctAnswer]
        };
      default:
        return {
          type: 'exact_match',
          expectedFormat: 'text',
          variations: [correctAnswer]
        };
    }
  }

  private static generateCacheKey(question: any, answerKey: any): string {
    const questionText = answerKey?.question_text || '';
    const questionType = answerKey?.question_type || '';
    const correctAnswer = answerKey?.correct_answer || '';
    const hasOptions = Boolean(answerKey?.options);
    
    // Create a hash-like key from content (simplified)
    return `${questionType}_${correctAnswer}_${hasOptions}_${questionText.slice(0, 50)}`;
  }

  // Enhanced classification that uses fast-path when possible
  static classifyQuestionOptimized(question: any, answerKey: any): OptimizedClassificationResult {
    const startTime = performance.now();
    this.metrics.totalClassifications++;

    // Try fast-path first
    const fastResult = this.quickClassify(question, answerKey);
    if (fastResult) {
      this.updateMetrics(fastResult.metrics.classificationTime, true);
      return fastResult;
    }

    // Fall back to comprehensive analysis
    const comprehensiveResult = EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
    const classificationTime = performance.now() - startTime;
    
    this.updateMetrics(classificationTime, false);

    return {
      ...comprehensiveResult,
      metrics: {
        classificationTime,
        usedFastPath: false,
        confidence: comprehensiveResult.confidence,
        fallbackReason: 'Used comprehensive analysis'
      }
    };
  }

  private static updateMetrics(time: number, usedFastPath: boolean) {
    this.metrics.averageTime = (this.metrics.averageTime * (this.metrics.totalClassifications - 1) + time) / this.metrics.totalClassifications;
  }

  // Performance monitoring
  static getPerformanceMetrics() {
    const fastPathPercentage = this.metrics.totalClassifications > 0 
      ? (this.metrics.fastPathUsed / this.metrics.totalClassifications) * 100 
      : 0;
    
    const cacheHitRate = this.metrics.totalClassifications > 0
      ? (this.metrics.cacheHits / this.metrics.totalClassifications) * 100
      : 0;

    return {
      totalClassifications: this.metrics.totalClassifications,
      fastPathUsageRate: fastPathPercentage,
      averageClassificationTime: this.metrics.averageTime,
      cacheHitRate,
      cacheSize: this.classificationCache.size
    };
  }

  // Cache management
  static clearCache() {
    this.classificationCache.clear();
    console.log('🧹 Question classification cache cleared');
  }

  static optimizeCache(maxSize: number = 1000) {
    if (this.classificationCache.size > maxSize) {
      // Simple LRU - remove first 20% of entries
      const keysToRemove = Array.from(this.classificationCache.keys()).slice(0, Math.floor(maxSize * 0.2));
      keysToRemove.forEach(key => this.classificationCache.delete(key));
      console.log(`🔧 Cache optimized: removed ${keysToRemove.length} entries`);
    }
  }

  // Backward compatibility methods
  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
    return this.classifyQuestionOptimized(question, answerKey);
  }

  static validateSimpleAnswer(
    studentAnswer: string,
    correctAnswer: string,
    answerPattern: QuestionClassification['answerPattern']
  ): SimpleAnswerValidation {
    return EnhancedQuestionClassifier.validateSimpleAnswer(studentAnswer, correctAnswer, answerPattern);
  }
}
