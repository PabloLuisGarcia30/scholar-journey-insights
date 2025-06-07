
import { ComplexityAnalysis } from './shared/aiOptimizationShared';
import { BatchProcessingResult } from './batchProcessingOptimizer';

export interface FallbackConfig {
  enableProgressiveFallback: boolean;
  maxFallbackAttempts: number;
  qualityThreshold: number;
  confidenceThreshold: number;
  splitBatchThreshold: number;
  individualFallbackThreshold: number;
}

export interface FallbackDecision {
  action: 'retry_batch' | 'split_batch' | 'individual_processing' | 'escalate_model';
  reason: string;
  confidence: number;
  estimatedSuccessRate: number;
}

export interface FallbackResult {
  success: boolean;
  results: any[];
  fallbacksUsed: string[];
  finalStrategy: string;
  qualityImprovement: number;
  costImpact: number;
}

const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  enableProgressiveFallback: true,
  maxFallbackAttempts: 3,
  qualityThreshold: 75,
  confidenceThreshold: 70,
  splitBatchThreshold: 60,
  individualFallbackThreshold: 50
};

export class ProgressiveFallbackHandler {
  private config: FallbackConfig;
  private fallbackHistory: Map<string, FallbackResult[]> = new Map();

  constructor(config: Partial<FallbackConfig> = {}) {
    this.config = { ...DEFAULT_FALLBACK_CONFIG, ...config };
  }

  decideFallbackStrategy(
    originalResults: any[],
    questions: any[],
    complexityAnalyses: ComplexityAnalysis[],
    currentModel: string,
    attemptNumber: number
  ): FallbackDecision {
    console.log(`🔄 ProgressiveFallbackHandler: Analyzing fallback options (attempt ${attemptNumber})`);

    const qualityScore = this.calculateResultQuality(originalResults, questions);
    const avgComplexity = this.calculateAverageComplexity(complexityAnalyses);
    const avgConfidence = this.calculateAverageConfidence(complexityAnalyses);

    console.log(`📊 Quality: ${qualityScore}%, Complexity: ${avgComplexity}, Confidence: ${avgConfidence}%`);

    // Progressive fallback strategy
    if (attemptNumber === 1) {
      return this.firstLevelFallback(qualityScore, avgComplexity, avgConfidence, questions.length);
    } else if (attemptNumber === 2) {
      return this.secondLevelFallback(qualityScore, avgComplexity, questions.length);
    } else {
      return this.finalFallback(questions.length);
    }
  }

  private firstLevelFallback(
    qualityScore: number,
    avgComplexity: number,
    avgConfidence: number,
    questionCount: number
  ): FallbackDecision {
    // If quality is very poor and confidence is low, split the batch
    if (qualityScore < this.config.splitBatchThreshold && avgConfidence < this.config.confidenceThreshold) {
      return {
        action: 'split_batch',
        reason: `Low quality (${qualityScore}%) and confidence (${avgConfidence}%) suggests mixed question complexity`,
        confidence: 80,
        estimatedSuccessRate: 85
      };
    }

    // If complexity is high but batch size is small, escalate model
    if (avgComplexity > 60 && questionCount <= 3) {
      return {
        action: 'escalate_model',
        reason: `High complexity (${avgComplexity}) with small batch size suggests need for more powerful model`,
        confidence: 85,
        estimatedSuccessRate: 90
      };
    }

    // Default: retry with same model but different prompt strategy
    return {
      action: 'retry_batch',
      reason: `Quality (${qualityScore}%) below threshold, retrying with enhanced prompt`,
      confidence: 70,
      estimatedSuccessRate: 75
    };
  }

  private secondLevelFallback(
    qualityScore: number,
    avgComplexity: number,
    questionCount: number
  ): FallbackDecision {
    // If still poor quality and multiple questions, split for individual processing
    if (qualityScore < this.config.splitBatchThreshold && questionCount > 1) {
      return {
        action: 'split_batch',
        reason: `Persistent quality issues (${qualityScore}%) after first fallback, splitting batch`,
        confidence: 90,
        estimatedSuccessRate: 95
      };
    }

    // For complex questions or single questions, escalate model
    return {
      action: 'escalate_model',
      reason: `Second-level fallback: escalating to more powerful model`,
      confidence: 95,
      estimatedSuccessRate: 98
    };
  }

  private finalFallback(questionCount: number): FallbackDecision {
    return {
      action: 'individual_processing',
      reason: `Final fallback: processing each question individually with GPT-4.1`,
      confidence: 100,
      estimatedSuccessRate: 99
    };
  }

  async executeFallbackStrategy(
    decision: FallbackDecision,
    questions: any[],
    complexityAnalyses: ComplexityAnalysis[],
    originalModel: string,
    processFunction: (questions: any[], model: string, options?: any) => Promise<any[]>
  ): Promise<FallbackResult> {
    console.log(`⚡ Executing fallback: ${decision.action} - ${decision.reason}`);

    const startTime = Date.now();
    const fallbacksUsed: string[] = [decision.action];
    let results: any[] = [];
    let finalStrategy = decision.action;
    let costMultiplier = 1;

    try {
      switch (decision.action) {
        case 'retry_batch':
          results = await this.retryBatchWithEnhancedPrompt(questions, originalModel, processFunction);
          break;

        case 'split_batch':
          const splitResult = await this.splitAndProcessBatch(questions, complexityAnalyses, processFunction);
          results = splitResult.results;
          fallbacksUsed.push(...splitResult.strategiesUsed);
          finalStrategy = 'split_processing';
          costMultiplier = 1.2;
          break;

        case 'individual_processing':
          results = await this.processIndividualQuestions(questions, processFunction);
          finalStrategy = 'individual_gpt41';
          costMultiplier = 2.0;
          break;

        case 'escalate_model':
          results = await processFunction(questions, 'gpt-4.1-2025-04-14', { enhanced: true });
          finalStrategy = 'escalated_gpt41';
          costMultiplier = 1.8;
          break;
      }

      const qualityImprovement = this.calculateQualityImprovement(results, questions);
      
      console.log(`✅ Fallback completed: ${results.length} results, quality improvement: ${qualityImprovement}%`);

      return {
        success: true,
        results: results,
        fallbacksUsed: fallbacksUsed,
        finalStrategy: finalStrategy,
        qualityImprovement: qualityImprovement,
        costImpact: (costMultiplier - 1) * 100
      };

    } catch (error) {
      console.error(`❌ Fallback execution failed:`, error);
      
      // Emergency fallback - individual processing with basic model
      try {
        results = await this.processIndividualQuestions(questions, processFunction);
        return {
          success: true,
          results: results,
          fallbacksUsed: [...fallbacksUsed, 'emergency_individual'],
          finalStrategy: 'emergency_fallback',
          qualityImprovement: 0,
          costImpact: 100
        };
      } catch (emergencyError) {
        return {
          success: false,
          results: [],
          fallbacksUsed: fallbacksUsed,
          finalStrategy: 'failed',
          qualityImprovement: 0,
          costImpact: 0
        };
      }
    }
  }

  private async retryBatchWithEnhancedPrompt(
    questions: any[],
    model: string,
    processFunction: (questions: any[], model: string, options?: any) => Promise<any[]>
  ): Promise<any[]> {
    console.log(`🔄 Retrying batch with enhanced prompt strategy`);
    return await processFunction(questions, model, { 
      enhanced: true, 
      temperature: 0.1,
      retryAttempt: true 
    });
  }

  private async splitAndProcessBatch(
    questions: any[],
    complexityAnalyses: ComplexityAnalysis[],
    processFunction: (questions: any[], model: string, options?: any) => Promise<any[]>
  ): Promise<{ results: any[], strategiesUsed: string[] }> {
    console.log(`📊 Splitting batch of ${questions.length} questions for targeted processing`);

    const results: any[] = [];
    const strategiesUsed: string[] = ['batch_split'];

    // Group questions by complexity
    const simpleQuestions: any[] = [];
    const complexQuestions: any[] = [];

    questions.forEach((question, index) => {
      const analysis = complexityAnalyses[index];
      if (analysis && analysis.complexityScore <= 40) {
        simpleQuestions.push(question);
      } else {
        complexQuestions.push(question);
      }
    });

    // Process simple questions in batches with GPT-4o-mini
    if (simpleQuestions.length > 0) {
      try {
        const simpleResults = await processFunction(simpleQuestions, 'gpt-4o-mini', { 
          batchOptimized: true 
        });
        results.push(...simpleResults);
        strategiesUsed.push('batch_simple_gpt4o_mini');
      } catch (error) {
        // Fallback to individual processing for simple questions
        const individualSimple = await this.processIndividualQuestions(simpleQuestions, processFunction);
        results.push(...individualSimple);
        strategiesUsed.push('individual_simple_fallback');
      }
    }

    // Process complex questions individually with GPT-4.1
    if (complexQuestions.length > 0) {
      const complexResults = await this.processIndividualQuestions(
        complexQuestions, 
        processFunction, 
        'gpt-4.1-2025-04-14'
      );
      results.push(...complexResults);
      strategiesUsed.push('individual_complex_gpt41');
    }

    return { results, strategiesUsed };
  }

  private async processIndividualQuestions(
    questions: any[],
    processFunction: (questions: any[], model: string, options?: any) => Promise<any[]>,
    model: string = 'gpt-4.1-2025-04-14'
  ): Promise<any[]> {
    console.log(`🔄 Processing ${questions.length} questions individually with ${model}`);

    const results: any[] = [];
    
    for (const question of questions) {
      try {
        const result = await processFunction([question], model, { 
          individual: true,
          enhanced: true 
        });
        results.push(...result);
      } catch (error) {
        console.error(`❌ Individual processing failed for question ${question.questionNumber}:`, error);
        results.push({
          question_number: question.questionNumber,
          error: true,
          fallback_used: true
        });
      }
    }

    return results;
  }

  private calculateResultQuality(results: any[], questions: any[]): number {
    if (!results || results.length === 0) return 0;
    
    const validResults = results.filter(result => 
      result && 
      !result.error && 
      result.question_number !== undefined &&
      result.score !== undefined
    );
    
    return (validResults.length / questions.length) * 100;
  }

  private calculateQualityImprovement(newResults: any[], questions: any[]): number {
    const newQuality = this.calculateResultQuality(newResults, questions);
    // Assume baseline quality was below threshold
    const baselineQuality = this.config.qualityThreshold - 10;
    return Math.max(0, newQuality - baselineQuality);
  }

  private calculateAverageComplexity(analyses: ComplexityAnalysis[]): number {
    if (!analyses || analyses.length === 0) return 50;
    
    const total = analyses.reduce((sum, analysis) => sum + analysis.complexityScore, 0);
    return total / analyses.length;
  }

  private calculateAverageConfidence(analyses: ComplexityAnalysis[]): number {
    if (!analyses || analyses.length === 0) return 50;
    
    const total = analyses.reduce((sum, analysis) => sum + analysis.confidenceInDecision, 0);
    return total / analyses.length;
  }

  shouldTriggerFallback(
    results: any[],
    questions: any[],
    currentModel: string
  ): boolean {
    if (!this.config.enableProgressiveFallback) return false;
    
    const qualityScore = this.calculateResultQuality(results, questions);
    return qualityScore < this.config.qualityThreshold;
  }

  updateConfiguration(newConfig: Partial<FallbackConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('⚡ ProgressiveFallbackHandler: Configuration updated', this.config);
  }

  getFallbackHistory(identifier?: string): FallbackResult[] {
    if (identifier) {
      return this.fallbackHistory.get(identifier) || [];
    }
    
    const allResults: FallbackResult[] = [];
    for (const results of this.fallbackHistory.values()) {
      allResults.push(...results);
    }
    return allResults;
  }

  generateFallbackReport(results: FallbackResult[]): string {
    if (results.length === 0) return 'No fallback operations recorded';
    
    const successRate = (results.filter(r => r.success).length / results.length) * 100;
    const avgQualityImprovement = results.reduce((sum, r) => sum + r.qualityImprovement, 0) / results.length;
    const totalCostImpact = results.reduce((sum, r) => sum + r.costImpact, 0);
    
    const strategyDistribution = results.reduce((dist, r) => {
      dist[r.finalStrategy] = (dist[r.finalStrategy] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return `Fallback Report: ${results.length} operations, ${successRate.toFixed(1)}% success rate. ` +
           `Avg quality improvement: ${avgQualityImprovement.toFixed(1)}%. Total cost impact: ${totalCostImpact.toFixed(1)}%. ` +
           `Strategies used: ${Object.entries(strategyDistribution).map(([k, v]) => `${k}: ${v}`).join(', ')}`;
  }
}
