
import { AIModelRouter, ModelRoutingDecision } from './aiModelRouter';
import { BatchGroup, BatchProcessingResult } from './batchProcessingOptimizer';
import { ComplexityAnalysis } from './shared/aiOptimizationShared';

export interface BatchRoutingDecision {
  batchId: string;
  model: string;
  questions: any[];
  estimatedCost: number;
  estimatedTime: number;
  fallbackStrategy: 'individual' | 'split' | 'retry';
  riskLevel: 'low' | 'medium' | 'high';
}

export interface BatchRoutingConfig {
  enableBatchRouting: boolean;
  fallbackThreshold: number;
  maxRetries: number;
  splitThreshold: number;
  costOptimizationEnabled: boolean;
}

const DEFAULT_BATCH_ROUTING_CONFIG: BatchRoutingConfig = {
  enableBatchRouting: true,
  fallbackThreshold: 70,
  maxRetries: 2,
  splitThreshold: 60,
  costOptimizationEnabled: true
};

export class BatchAwareModelRouter {
  private config: BatchRoutingConfig;
  private routingHistory: Map<string, BatchRoutingDecision[]> = new Map();

  constructor(config: Partial<BatchRoutingConfig> = {}) {
    this.config = { ...DEFAULT_BATCH_ROUTING_CONFIG, ...config };
  }

  routeBatchesForProcessing(batches: BatchGroup[]): BatchRoutingDecision[] {
    console.log(`🎯 BatchAwareModelRouter: Routing ${batches.length} batches for processing`);

    const routingDecisions = batches.map(batch => this.routeSingleBatch(batch));
    
    // Log routing summary
    this.logRoutingSummary(routingDecisions);
    
    return routingDecisions;
  }

  private routeSingleBatch(batch: BatchGroup): BatchRoutingDecision {
    const riskLevel = this.assessBatchRisk(batch);
    const model = this.selectOptimalModel(batch, riskLevel);
    const fallbackStrategy = this.determineFallbackStrategy(batch, riskLevel);
    
    const decision: BatchRoutingDecision = {
      batchId: batch.id,
      model: model,
      questions: batch.questions,
      estimatedCost: this.calculateEstimatedCost(batch, model),
      estimatedTime: this.calculateEstimatedTime(batch, model),
      fallbackStrategy: fallbackStrategy,
      riskLevel: riskLevel
    };

    console.log(`🎯 Batch ${batch.id}: ${model} (risk: ${riskLevel}, fallback: ${fallbackStrategy})`);
    
    return decision;
  }

  private assessBatchRisk(batch: BatchGroup): 'low' | 'medium' | 'high' {
    const [minConfidence, maxConfidence] = batch.confidenceRange;
    const avgConfidence = (minConfidence + maxConfidence) / 2;
    const confidenceVariance = maxConfidence - minConfidence;

    // High variance in confidence suggests mixed question quality
    if (confidenceVariance > 30 || avgConfidence < 60) {
      return 'high';
    }
    
    if (confidenceVariance > 15 || avgConfidence < 75) {
      return 'medium';
    }
    
    return 'low';
  }

  private selectOptimalModel(batch: BatchGroup, riskLevel: 'low' | 'medium' | 'high'): string {
    // For high-risk batches, prefer individual processing with GPT-4.1
    if (riskLevel === 'high' && batch.complexity === 'complex') {
      return 'gpt-4.1-2025-04-14';
    }

    // For medium-risk batches, consider batch size
    if (riskLevel === 'medium' && batch.batchSize <= 3) {
      return 'gpt-4.1-2025-04-14';
    }

    // Default to the batch's recommended model
    return batch.recommendedModel;
  }

  private determineFallbackStrategy(
    batch: BatchGroup, 
    riskLevel: 'low' | 'medium' | 'high'
  ): 'individual' | 'split' | 'retry' {
    if (riskLevel === 'high' || batch.batchSize === 1) {
      return 'individual';
    }
    
    if (riskLevel === 'medium' && batch.batchSize > 4) {
      return 'split';
    }
    
    return 'retry';
  }

  private calculateEstimatedCost(batch: BatchGroup, model: string): number {
    const baseCost = model === 'gpt-4.1-2025-04-14' ? 0.03 : 0.001;
    const questionCount = batch.questions.length;
    
    // Batch processing typically reduces per-question cost
    const batchDiscount = questionCount > 1 ? 0.8 : 1.0;
    
    return baseCost * questionCount * batchDiscount;
  }

  private calculateEstimatedTime(batch: BatchGroup, model: string): number {
    const baseTime = model === 'gpt-4.1-2025-04-14' ? 3000 : 1500; // ms
    const questionCount = batch.questions.length;
    
    // Batch processing is more efficient per question
    const efficiencyFactor = questionCount > 1 ? 0.6 : 1.0;
    
    return baseTime * efficiencyFactor;
  }

  async processBatchWithFallback(
    decision: BatchRoutingDecision,
    processFunction: (questions: any[], model: string) => Promise<any>
  ): Promise<{ results: any[], metrics: BatchProcessingResult }> {
    const startTime = Date.now();
    let attempt = 0;
    let results: any[] = [];
    let fallbacksTriggered = 0;

    while (attempt < this.config.maxRetries) {
      try {
        console.log(`🔄 Processing batch ${decision.batchId} with ${decision.model} (attempt ${attempt + 1})`);
        
        results = await processFunction(decision.questions, decision.model);
        
        // Validate results quality
        const qualityScore = this.validateBatchResults(results, decision.questions);
        
        if (qualityScore >= this.config.fallbackThreshold) {
          // Success - return results
          const metrics = this.createBatchMetrics(
            decision, 
            results, 
            Date.now() - startTime, 
            fallbacksTriggered,
            qualityScore
          );
          
          return { results, metrics };
        } else {
          console.log(`⚠️ Batch ${decision.batchId} quality below threshold: ${qualityScore}%`);
          fallbacksTriggered++;
          
          // Apply fallback strategy
          if (decision.fallbackStrategy === 'split' && decision.questions.length > 1) {
            console.log(`📊 Splitting batch ${decision.batchId} for individual processing`);
            results = await this.processBatchIndividually(decision.questions, processFunction);
            break;
          } else if (decision.fallbackStrategy === 'individual') {
            console.log(`🔄 Processing batch ${decision.batchId} individually`);
            results = await this.processBatchIndividually(decision.questions, processFunction);
            break;
          } else {
            // Retry with GPT-4.1
            decision.model = 'gpt-4.1-2025-04-14';
            attempt++;
          }
        }
      } catch (error) {
        console.error(`❌ Batch ${decision.batchId} processing failed:`, error);
        fallbacksTriggered++;
        
        if (attempt === this.config.maxRetries - 1) {
          // Final fallback - individual processing
          results = await this.processBatchIndividually(decision.questions, processFunction);
          break;
        }
        
        attempt++;
      }
    }

    const metrics = this.createBatchMetrics(
      decision, 
      results, 
      Date.now() - startTime, 
      fallbacksTriggered,
      this.validateBatchResults(results, decision.questions)
    );

    return { results, metrics };
  }

  private async processBatchIndividually(
    questions: any[],
    processFunction: (questions: any[], model: string) => Promise<any>
  ): Promise<any[]> {
    const results = [];
    
    for (const question of questions) {
      try {
        const result = await processFunction([question], 'gpt-4.1-2025-04-14');
        results.push(...result);
      } catch (error) {
        console.error('Individual question processing failed:', error);
        results.push({ error: true, question_number: question.questionNumber });
      }
    }
    
    return results;
  }

  private validateBatchResults(results: any[], questions: any[]): number {
    if (!results || results.length === 0) return 0;
    
    const validResults = results.filter(result => 
      result && 
      !result.error && 
      result.question_number !== undefined &&
      result.score !== undefined
    );
    
    return (validResults.length / questions.length) * 100;
  }

  private createBatchMetrics(
    decision: BatchRoutingDecision,
    results: any[],
    processingTime: number,
    fallbacksTriggered: number,
    qualityScore: number
  ): BatchProcessingResult {
    const successfulQuestions = results.filter(r => !r.error).length;
    const failedQuestions = results.length - successfulQuestions;
    
    // Calculate cost savings compared to individual GPT-4.1 processing
    const individualCost = decision.questions.length * 0.03;
    const actualCost = decision.estimatedCost;
    const costSavings = Math.max(0, ((individualCost - actualCost) / individualCost) * 100);

    return {
      batchId: decision.batchId,
      processedQuestions: decision.questions.length,
      successfulQuestions: successfulQuestions,
      failedQuestions: failedQuestions,
      fallbacksTriggered: fallbacksTriggered,
      processingTime: processingTime,
      costSavings: costSavings,
      qualityScore: qualityScore
    };
  }

  private logRoutingSummary(decisions: BatchRoutingDecision[]): void {
    const totalQuestions = decisions.reduce((sum, d) => sum + d.questions.length, 0);
    const modelDistribution = decisions.reduce((dist, d) => {
      const model = d.model === 'gpt-4.1-2025-04-14' ? 'GPT-4.1' : 'GPT-4o-mini';
      dist[model] = (dist[model] || 0) + d.questions.length;
      return dist;
    }, {} as Record<string, number>);
    
    const totalCost = decisions.reduce((sum, d) => sum + d.estimatedCost, 0);
    
    console.log(`🎯 Batch Routing Summary: ${totalQuestions} questions across ${decisions.length} batches`);
    console.log(`📊 Model Distribution:`, modelDistribution);
    console.log(`💰 Estimated Total Cost: $${totalCost.toFixed(4)}`);
  }

  updateConfiguration(newConfig: Partial<BatchRoutingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🎯 BatchAwareModelRouter: Configuration updated', this.config);
  }

  getRoutingHistory(batchId?: string): BatchRoutingDecision[] {
    if (batchId) {
      return this.routingHistory.get(batchId) || [];
    }
    
    const allDecisions: BatchRoutingDecision[] = [];
    for (const decisions of this.routingHistory.values()) {
      allDecisions.push(...decisions);
    }
    return allDecisions;
  }
}
