
import { 
  SharedAIModelRouter, 
  SharedQuestionComplexityAnalyzer,
  SimplifiedFallbackAnalyzer,
  AIOptimizationConfig,
  DEFAULT_CONFIG,
  ConfigurationManager,
  ModelRoutingDecision,
  ComplexityAnalysis
} from './shared/aiOptimizationShared';

export interface BatchRoutingResult {
  routingDecisions: ModelRoutingDecision[];
  distribution: {
    gpt4oMini: number;
    gpt4o: number;
    totalQuestions: number;
    estimatedCostSavings: number;
  };
  qualityMetrics: {
    averageConfidence: number;
    borderlineCases: number;
    highConfidenceCases: number;
  };
}

export interface AIModelUsageStats {
  totalQuestions: number;
  gpt4oMiniUsed: number;
  gpt4oUsed: number;
  fallbacksTriggered: number;
  costSavings: number;
  averageAccuracy: number;
}

// Re-export shared types for backwards compatibility
export type { ComplexityAnalysis, ModelRoutingDecision } from './shared/aiOptimizationShared';

export class AIModelRouter {
  private static sharedRouter = new SharedAIModelRouter(DEFAULT_CONFIG);
  private static analyzer = new SharedQuestionComplexityAnalyzer(DEFAULT_CONFIG);
  private static fallbackAnalyzer = new SimplifiedFallbackAnalyzer(DEFAULT_CONFIG);

  // Configuration methods
  static updateConfiguration(config: Partial<AIOptimizationConfig>) {
    const newConfig = { ...DEFAULT_CONFIG, ...config };
    this.sharedRouter = new SharedAIModelRouter(newConfig);
    this.analyzer = new SharedQuestionComplexityAnalyzer(newConfig);
    this.fallbackAnalyzer = new SimplifiedFallbackAnalyzer(newConfig);
    
    console.log('🔧 AI Model Router configuration updated:', newConfig);
  }

  static useValidationMode() {
    this.updateConfiguration(ConfigurationManager.createValidationConfig());
    console.log('🧪 AI Model Router: Validation mode enabled');
  }

  static useAggressiveMode() {
    this.updateConfiguration(ConfigurationManager.createAggressiveConfig());
    console.log('⚡ AI Model Router: Aggressive cost optimization enabled');
  }

  static routeQuestionsForAI(questions: any[], answerKeys: any[]): BatchRoutingResult {
    const { routingDecisions, distribution } = this.sharedRouter.routeQuestionsForAI(questions, answerKeys);
    
    // Calculate quality metrics
    const complexityAnalyses = routingDecisions.map(d => d.complexityAnalysis);
    const qualityMetrics = this.calculateQualityMetrics(complexityAnalyses);

    return {
      routingDecisions,
      distribution,
      qualityMetrics
    };
  }

  static shouldFallbackToGPT4o(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis): boolean {
    const result = this.fallbackAnalyzer.shouldFallbackToGPT4o(gpt4oMiniResult, originalComplexity);
    
    if (result.shouldFallback) {
      console.log(`⚠️ Fallback to GPT-4o triggered: ${result.reason} (confidence: ${result.confidence}%)`);
    }
    
    return result.shouldFallback;
  }

  private static calculateQualityMetrics(analyses: ComplexityAnalysis[]) {
    const confidences = analyses.map(a => a.confidenceInDecision);
    const averageConfidence = confidences.length > 0 ? 
      confidences.reduce((sum, c) => sum + c, 0) / confidences.length : 0;
    
    const borderlineCases = analyses.filter(a => 
      a.complexityScore >= 20 && a.complexityScore <= 40).length;
    const highConfidenceCases = analyses.filter(a => a.confidenceInDecision >= 85).length;

    return {
      averageConfidence: Math.round(averageConfidence),
      borderlineCases,
      highConfidenceCases
    };
  }

  static trackUsageStats(decisions: ModelRoutingDecision[], fallbacks: number = 0): AIModelUsageStats {
    const gpt4oMiniUsed = decisions.filter(d => d.selectedModel === 'gpt-4o-mini').length;
    const gpt4oUsed = decisions.filter(d => d.selectedModel === 'gpt-4o').length + fallbacks;
    
    const totalCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
    const costIfAllGPT4o = decisions.length * DEFAULT_CONFIG.gpt4oCost;
    const costSavings = costIfAllGPT4o > 0 ? ((costIfAllGPT4o - totalCost) / costIfAllGPT4o) * 100 : 0;

    return {
      totalQuestions: decisions.length,
      gpt4oMiniUsed: gpt4oMiniUsed - fallbacks,
      gpt4oUsed,
      fallbacksTriggered: fallbacks,
      costSavings: Math.max(0, costSavings),
      averageAccuracy: 0
    };
  }

  static generateRoutingSummary(stats: AIModelUsageStats): string {
    const miniPercentage = stats.totalQuestions > 0 ? 
      Math.round((stats.gpt4oMiniUsed / stats.totalQuestions) * 100) : 0;
    
    return `AI Model Optimization: ${stats.gpt4oMiniUsed} questions (${miniPercentage}%) processed with GPT-4o-mini, ` +
           `${stats.gpt4oUsed} with GPT-4o. Cost savings: ${stats.costSavings.toFixed(1)}%. ` +
           `Fallbacks triggered: ${stats.fallbacksTriggered}`;
  }
}

// Re-export shared analyzer for direct use
export const QuestionComplexityAnalyzer = SharedQuestionComplexityAnalyzer;
