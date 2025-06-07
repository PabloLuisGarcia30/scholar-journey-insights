import { ComplexityAnalysis } from './shared/aiOptimizationShared';

export interface BatchGroup {
  id: string;
  questions: any[];
  complexity: 'simple' | 'medium' | 'complex';
  confidenceRange: [number, number];
  recommendedModel: string;
  batchSize: number;
  priority: number;
}

export interface BatchProcessingConfig {
  maxBatchSize: number;
  minBatchSize: number;
  complexityThresholds: {
    simple: number;
    medium: number;
    complex: number;
  };
  confidenceThresholds: {
    high: number;
    medium: number;
    low: number;
  };
  enableBatching: boolean;
  fallbackEnabled: boolean;
}

export interface BatchProcessingResult {
  batchId: string;
  processedQuestions: number;
  successfulQuestions: number;
  failedQuestions: number;
  fallbacksTriggered: number;
  processingTime: number;
  costSavings: number;
  qualityScore: number;
}

const DEFAULT_CONFIG: BatchProcessingConfig = {
  maxBatchSize: 8,
  minBatchSize: 3,
  complexityThresholds: {
    simple: 25,
    medium: 50,
    complex: 75
  },
  confidenceThresholds: {
    high: 85,
    medium: 70,
    low: 50
  },
  enableBatching: true,
  fallbackEnabled: true
};

export class BatchProcessingOptimizer {
  private config: BatchProcessingConfig;
  private batchCounter = 0;

  constructor(config: Partial<BatchProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  optimizeQuestionBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    if (!this.config.enableBatching || questions.length < this.config.minBatchSize) {
      return this.createIndividualBatches(questions, complexityAnalyses);
    }

    console.log(`🔧 BatchProcessingOptimizer: Optimizing ${questions.length} questions into batches`);

    // Group questions by complexity and confidence
    const groupedQuestions = this.groupQuestionsByCharacteristics(questions, complexityAnalyses);
    
    // Create optimized batches
    const batches = this.createOptimizedBatches(groupedQuestions);
    
    console.log(`📊 BatchProcessingOptimizer: Created ${batches.length} optimized batches`);
    
    return batches;
  }

  private groupQuestionsByCharacteristics(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): Map<string, { questions: any[], analyses: ComplexityAnalysis[] }> {
    const groups = new Map();

    questions.forEach((question, index) => {
      const analysis = complexityAnalyses[index];
      if (!analysis) return;

      const complexity = this.getComplexityCategory(analysis.complexityScore);
      const confidence = this.getConfidenceCategory(analysis.confidenceInDecision);
      const model = analysis.recommendedModel;
      
      const groupKey = `${complexity}_${confidence}_${model}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { questions: [], analyses: [] });
      }
      
      groups.get(groupKey).questions.push(question);
      groups.get(groupKey).analyses.push(analysis);
    });

    return groups;
  }

  private createOptimizedBatches(
    groupedQuestions: Map<string, { questions: any[], analyses: ComplexityAnalysis[] }>
  ): BatchGroup[] {
    const batches: BatchGroup[] = [];

    for (const [groupKey, group] of groupedQuestions) {
      const [complexity, confidence, model] = groupKey.split('_');
      const questions = group.questions;
      const analyses = group.analyses;

      if (questions.length === 0) continue;

      // Determine optimal batch size for this group
      const optimalBatchSize = this.calculateOptimalBatchSize(
        complexity as any, 
        confidence as any, 
        questions.length
      );

      // Split into batches of optimal size
      for (let i = 0; i < questions.length; i += optimalBatchSize) {
        const batchQuestions = questions.slice(i, i + optimalBatchSize);
        const batchAnalyses = analyses.slice(i, i + optimalBatchSize);
        
        if (batchQuestions.length > 0) {
          batches.push({
            id: `batch_${++this.batchCounter}`,
            questions: batchQuestions,
            complexity: complexity as any,
            confidenceRange: this.calculateConfidenceRange(batchAnalyses),
            recommendedModel: model,
            batchSize: batchQuestions.length,
            priority: this.calculateBatchPriority(complexity as any, confidence as any)
          });
        }
      }
    }

    // Sort batches by priority (high confidence simple questions first)
    return batches.sort((a, b) => b.priority - a.priority);
  }

  private calculateOptimalBatchSize(
    complexity: 'simple' | 'medium' | 'complex',
    confidence: 'high' | 'medium' | 'low',
    questionCount: number
  ): number {
    let baseSize = this.config.maxBatchSize;

    // Adjust based on complexity
    switch (complexity) {
      case 'simple':
        baseSize = Math.min(this.config.maxBatchSize, 8);
        break;
      case 'medium':
        baseSize = Math.min(this.config.maxBatchSize, 5);
        break;
      case 'complex':
        baseSize = Math.min(this.config.maxBatchSize, 3);
        break;
    }

    // Adjust based on confidence
    switch (confidence) {
      case 'high':
        // Keep base size
        break;
      case 'medium':
        baseSize = Math.max(Math.floor(baseSize * 0.75), this.config.minBatchSize);
        break;
      case 'low':
        baseSize = Math.max(Math.floor(baseSize * 0.5), 1);
        break;
    }

    return Math.min(baseSize, questionCount, this.config.maxBatchSize);
  }

  private calculateConfidenceRange(analyses: ComplexityAnalysis[]): [number, number] {
    const confidences = analyses.map(a => a.confidenceInDecision);
    return [Math.min(...confidences), Math.max(...confidences)];
  }

  private calculateBatchPriority(
    complexity: 'simple' | 'medium' | 'complex',
    confidence: 'high' | 'medium' | 'low'
  ): number {
    let priority = 0;

    // Higher priority for simpler questions
    switch (complexity) {
      case 'simple': priority += 30; break;
      case 'medium': priority += 20; break;
      case 'complex': priority += 10; break;
    }

    // Higher priority for higher confidence
    switch (confidence) {
      case 'high': priority += 30; break;
      case 'medium': priority += 20; break;
      case 'low': priority += 10; break;
    }

    return priority;
  }

  private createIndividualBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    console.log('🔧 BatchProcessingOptimizer: Creating individual batches (batching disabled or insufficient questions)');
    
    return questions.map((question, index) => {
      const analysis = complexityAnalyses[index];
      return {
        id: `individual_${++this.batchCounter}`,
        questions: [question],
        complexity: this.getComplexityCategory(analysis?.complexityScore || 50),
        confidenceRange: [analysis?.confidenceInDecision || 50, analysis?.confidenceInDecision || 50],
        recommendedModel: analysis?.recommendedModel || 'gpt-4o-mini',
        batchSize: 1,
        priority: this.calculateBatchPriority(
          this.getComplexityCategory(analysis?.complexityScore || 50),
          this.getConfidenceCategory(analysis?.confidenceInDecision || 50)
        )
      };
    });
  }

  private getComplexityCategory(score: number): 'simple' | 'medium' | 'complex' {
    if (score <= this.config.complexityThresholds.simple) return 'simple';
    if (score <= this.config.complexityThresholds.medium) return 'medium';
    return 'complex';
  }

  private getConfidenceCategory(confidence: number): 'high' | 'medium' | 'low' {
    if (confidence >= this.config.confidenceThresholds.high) return 'high';
    if (confidence >= this.config.confidenceThresholds.medium) return 'medium';
    return 'low';
  }

  updateConfiguration(newConfig: Partial<BatchProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 BatchProcessingOptimizer: Configuration updated', this.config);
  }

  getConfiguration(): BatchProcessingConfig {
    return { ...this.config };
  }

  generateBatchSummary(batches: BatchGroup[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const batchCount = batches.length;
    const avgBatchSize = totalQuestions > 0 ? (totalQuestions / batchCount).toFixed(1) : '0';
    
    const complexityDistribution = batches.reduce((dist, batch) => {
      dist[batch.complexity] = (dist[batch.complexity] || 0) + batch.questions.length;
      return dist;
    }, {} as Record<string, number>);

    return `Batch Optimization Summary: ${totalQuestions} questions organized into ${batchCount} batches (avg size: ${avgBatchSize}). ` +
           `Distribution - Simple: ${complexityDistribution.simple || 0}, Medium: ${complexityDistribution.medium || 0}, Complex: ${complexityDistribution.complex || 0}`;
  }
}
