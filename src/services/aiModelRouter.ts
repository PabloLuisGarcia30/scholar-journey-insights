
import { ComplexityAnalysis, QuestionComplexityAnalyzer } from './questionComplexityAnalyzer';

export interface ModelRoutingDecision {
  questionNumber: number;
  selectedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  complexityAnalysis: ComplexityAnalysis;
  fallbackAvailable: boolean;
  estimatedCost: number;
  reasoning: string;
}

export interface BatchRoutingResult {
  routingDecisions: ModelRoutingDecision[];
  distribution: {
    gpt4oMini: number;
    gpt41: number;
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
  gpt41Used: number;
  fallbacksTriggered: number;
  costSavings: number;
  averageAccuracy: number;
}

export class AIModelRouter {
  // Cost per 1K tokens (approximate)
  private static readonly GPT_4O_MINI_COST = 0.00015; // $0.00015 per 1K tokens
  private static readonly GPT_41_COST = 0.003;        // $0.003 per 1K tokens
  private static readonly FALLBACK_CONFIDENCE_THRESHOLD = 70;

  static routeQuestionsForAI(questions: any[], answerKeys: any[]): BatchRoutingResult {
    console.log('🎯 AI Model Router: Analyzing', questions.length, 'questions for optimal model routing');
    
    // Analyze complexity for all questions
    const complexityAnalyses = QuestionComplexityAnalyzer.batchAnalyzeQuestions(questions, answerKeys);
    
    // Generate routing decisions
    const routingDecisions = complexityAnalyses.map((analysis, index) => {
      const question = questions[index];
      return this.createRoutingDecision(question, analysis);
    });

    // Calculate distribution and metrics
    const distribution = this.calculateDistribution(routingDecisions);
    const qualityMetrics = this.calculateQualityMetrics(complexityAnalyses);

    console.log(`📊 Model Distribution: ${distribution.gpt4oMini} questions → GPT-4o-mini, ${distribution.gpt41} questions → GPT-4.1`);
    console.log(`💰 Estimated cost savings: ${distribution.estimatedCostSavings.toFixed(1)}%`);

    return {
      routingDecisions,
      distribution,
      qualityMetrics
    };
  }

  private static createRoutingDecision(question: any, analysis: ComplexityAnalysis): ModelRoutingDecision {
    const estimatedTokens = this.estimateTokens(question);
    const selectedModel = analysis.recommendedModel;
    
    const costGPT4oMini = estimatedTokens * this.GPT_4O_MINI_COST / 1000;
    const costGPT41 = estimatedTokens * this.GPT_41_COST / 1000;
    
    return {
      questionNumber: question.questionNumber,
      selectedModel,
      complexityAnalysis: analysis,
      fallbackAvailable: selectedModel === 'gpt-4o-mini',
      estimatedCost: selectedModel === 'gpt-4o-mini' ? costGPT4oMini : costGPT41,
      reasoning: `Model: ${selectedModel} (Complexity: ${analysis.complexityScore}, Confidence: ${analysis.confidenceInDecision}%)`
    };
  }

  private static estimateTokens(question: any): number {
    // Rough estimation based on question content
    const baseTokens = 150; // Base prompt tokens
    const questionText = question.questionText || '';
    const answerLength = question.detectedAnswer?.selectedOption?.length || 1;
    
    // Estimate tokens from text length (rough approximation: 1 token ≈ 4 characters)
    const questionTokens = Math.max(10, questionText.length / 4);
    const answerTokens = answerLength * 2;
    
    return Math.round(baseTokens + questionTokens + answerTokens);
  }

  private static calculateDistribution(decisions: ModelRoutingDecision[]) {
    const gpt4oMini = decisions.filter(d => d.selectedModel === 'gpt-4o-mini').length;
    const gpt41 = decisions.filter(d => d.selectedModel === 'gpt-4.1-2025-04-14').length;
    const total = decisions.length;

    // Calculate cost savings (assuming all would have used GPT-4.1 previously)
    const totalCostWithGPT41 = decisions.length * this.GPT_41_COST;
    const actualCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
    const savings = total > 0 ? ((totalCostWithGPT41 - actualCost) / totalCostWithGPT41) * 100 : 0;

    return {
      gpt4oMini,
      gpt41,
      totalQuestions: total,
      estimatedCostSavings: Math.max(0, savings)
    };
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

  static shouldFallbackToGPT41(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis): boolean {
    // Implement fallback logic based on GPT-4o-mini result quality
    if (!gpt4oMiniResult) return true;
    
    // Check if result seems incomplete or low confidence
    const resultConfidence = gpt4oMiniResult.confidence || 0;
    const hasErrors = gpt4oMiniResult.error || false;
    const isIncomplete = !gpt4oMiniResult.total_points_earned && !gpt4oMiniResult.overall_score;
    
    // Fallback conditions
    if (hasErrors) return true;
    if (isIncomplete) return true;
    if (resultConfidence < this.FALLBACK_CONFIDENCE_THRESHOLD && originalComplexity.complexityScore > 30) return true;
    
    return false;
  }

  static trackUsageStats(decisions: ModelRoutingDecision[], fallbacks: number = 0): AIModelUsageStats {
    const gpt4oMiniUsed = decisions.filter(d => d.selectedModel === 'gpt-4o-mini').length;
    const gpt41Used = decisions.filter(d => d.selectedModel === 'gpt-4.1-2025-04-14').length + fallbacks;
    
    const totalCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
    const costIfAllGPT41 = decisions.length * this.GPT_41_COST;
    const costSavings = costIfAllGPT41 > 0 ? ((costIfAllGPT41 - totalCost) / costIfAllGPT41) * 100 : 0;

    return {
      totalQuestions: decisions.length,
      gpt4oMiniUsed: gpt4oMiniUsed - fallbacks, // Subtract fallbacks from mini usage
      gpt41Used,
      fallbacksTriggered: fallbacks,
      costSavings: Math.max(0, costSavings),
      averageAccuracy: 0 // To be calculated based on actual results
    };
  }

  static generateRoutingSummary(stats: AIModelUsageStats): string {
    const miniPercentage = stats.totalQuestions > 0 ? 
      Math.round((stats.gpt4oMiniUsed / stats.totalQuestions) * 100) : 0;
    
    return `AI Model Optimization: ${stats.gpt4oMiniUsed} questions (${miniPercentage}%) processed with GPT-4o-mini, ` +
           `${stats.gpt41Used} with GPT-4.1. Cost savings: ${stats.costSavings.toFixed(1)}%. ` +
           `Fallbacks triggered: ${stats.fallbacksTriggered}`;
  }
}
