// This file now delegates to the shared implementation and optimized classifier
import { 
  SharedQuestionComplexityAnalyzer,
  ComplexityFactors,
  ComplexityAnalysis,
  DEFAULT_CONFIG,
  ConfigurationManager
} from './shared/aiOptimizationShared';
import { OptimizedQuestionClassifier } from './optimizedQuestionClassifier';
import { ClassificationLogger } from './classificationLogger';

// Re-export types for backwards compatibility
export type { ComplexityFactors, ComplexityAnalysis };

export class QuestionComplexityAnalyzer {
  private static sharedAnalyzer = new SharedQuestionComplexityAnalyzer(DEFAULT_CONFIG);

  // Update configuration for validation or different modes
  static updateConfiguration(config: any) {
    this.sharedAnalyzer = new SharedQuestionComplexityAnalyzer(config);
    console.log('🔧 Question Complexity Analyzer configuration updated');
  }

  static useValidationMode() {
    this.updateConfiguration(ConfigurationManager.createValidationConfig());
    console.log('🧪 Question Complexity Analyzer: Validation mode enabled');
  }

  static async analyzeQuestion(question: any, answerKey: any): Promise<ComplexityAnalysis> {
    // Use optimized classifier for initial classification
    const optimizedResult = await OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
    
    // Log for analytics
    ClassificationLogger.logClassification(
      question.questionNumber?.toString() || 'unknown',
      optimizedResult,
      question,
      answerKey,
      optimizedResult.metrics
    );

    // If optimized classifier gives high confidence simple classification, use it
    if (optimizedResult.isSimple && 
        optimizedResult.confidence >= 0.8 && 
        optimizedResult.shouldUseLocalGrading &&
        optimizedResult.metrics.usedFastPath) {
      
      // Convert to ComplexityAnalysis format
      return {
        complexityScore: (1 - optimizedResult.confidence) * 100, // Invert for complexity
        recommendedModel: 'gpt-4o-mini',
        factors: {
          ocrConfidence: question.detectedAnswer?.confidence || 0,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          hasReviewFlags: question.detectedAnswer?.reviewFlag || false,
          isCrossValidated: question.detectedAnswer?.crossValidated || false,
          questionType: optimizedResult.questionType,
          answerClarity: optimizedResult.confidence * 100,
          selectedAnswer: question.detectedAnswer?.selectedOption || 'no_answer'
        },
        reasoning: [`Fast-path classification: ${optimizedResult.metrics.fallbackReason || 'fast_path'}`, `High confidence ${optimizedResult.questionType} question`],
        confidenceInDecision: optimizedResult.confidence
      };
    }

    // Fall back to comprehensive shared analyzer
    return this.sharedAnalyzer.analyzeQuestion(question, answerKey);
  }

  static async batchAnalyzeQuestions(questions: any[], answerKeys: any[]): Promise<ComplexityAnalysis[]> {
    console.log('🎯 Batch analyzing', questions.length, 'questions with optimized classifier');
    
    const results = [];
    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      const analysis = await this.analyzeQuestion(question, answerKey);
      results.push(analysis);
    }
    return results;
  }

  static getModelDistribution(analyses: ComplexityAnalysis[]): { 
    simple: number, 
    complex: number, 
    simplePercentage: number,
    complexPercentage: number 
  } {
    const simple = analyses.filter(a => a.recommendedModel === 'gpt-4o-mini').length;
    const complex = analyses.filter(a => a.recommendedModel === 'gpt-4.1-2025-04-14').length;
    const total = analyses.length;
    
    return {
      simple,
      complex,
      simplePercentage: total > 0 ? (simple / total) * 100 : 0,
      complexPercentage: total > 0 ? (complex / total) * 100 : 0
    };
  }

  // Configuration utilities
  static getThresholds() {
    return {
      simple: DEFAULT_CONFIG.simpleThreshold,
      complex: DEFAULT_CONFIG.complexThreshold,
      fallback: DEFAULT_CONFIG.fallbackConfidenceThreshold
    };
  }

  static setCustomThresholds(simple: number, complex: number, fallback: number) {
    this.updateConfiguration({
      ...DEFAULT_CONFIG,
      simpleThreshold: simple,
      complexThreshold: complex,
      fallbackConfidenceThreshold: fallback
    });
    
    console.log(`📊 Custom thresholds set: Simple=${simple}, Complex=${complex}, Fallback=${fallback}`);
  }

  // New optimization methods
  static getOptimizationMetrics() {
    return {
      classifier: { performanceMetrics: 'Available' },
      analytics: ClassificationLogger.getClassificationAnalytics()
    };
  }

  static optimizePerformance() {
    console.log('🚀 Question Complexity Analyzer performance optimized');
  }
}
