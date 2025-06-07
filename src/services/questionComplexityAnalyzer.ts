
// This file now delegates to the shared implementation to eliminate code duplication
import { 
  SharedQuestionComplexityAnalyzer,
  ComplexityFactors,
  ComplexityAnalysis,
  DEFAULT_CONFIG,
  ConfigurationManager
} from './shared/aiOptimizationShared';

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

  static analyzeQuestion(question: any, answerKey: any): ComplexityAnalysis {
    return this.sharedAnalyzer.analyzeQuestion(question, answerKey);
  }

  static batchAnalyzeQuestions(questions: any[], answerKeys: any[]): ComplexityAnalysis[] {
    return questions.map(question => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      return this.analyzeQuestion(question, answerKey);
    });
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
}
