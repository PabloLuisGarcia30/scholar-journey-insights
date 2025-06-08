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
  optimizationLevel: 'conservative' | 'balanced' | 'aggressive';
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

const ENHANCED_CONFIG: BatchProcessingConfig = {
  maxBatchSize: 15, // Increased from 8 for Phase 1
  minBatchSize: 4, // Increased from 3
  complexityThresholds: {
    simple: 30, // Slightly relaxed
    medium: 55, // Slightly relaxed 
    complex: 80 // Slightly relaxed
  },
  confidenceThresholds: {
    high: 80, // Slightly lowered for more aggressive batching
    medium: 65, // Slightly lowered
    low: 45 // Slightly lowered
  },
  enableBatching: true,
  fallbackEnabled: true,
  optimizationLevel: 'balanced' // New optimization level
};

export class BatchProcessingOptimizer {
  private config: BatchProcessingConfig;
  private batchCounter = 0;
  private performanceMetrics: Array<{ timestamp: number; throughput: number; accuracy: number }> = [];

  constructor(config: Partial<BatchProcessingConfig> = {}) {
    this.config = { ...ENHANCED_CONFIG, ...config };
  }

  optimizeQuestionBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    if (!this.config.enableBatching || questions.length < this.config.minBatchSize) {
      return this.createIndividualBatches(questions, complexityAnalyses);
    }

    console.log(`🔧 Enhanced BatchProcessingOptimizer: Optimizing ${questions.length} questions with ${this.config.optimizationLevel} level`);

    // Enhanced grouping with optimization level consideration
    const groupedQuestions = this.groupQuestionsByCharacteristics(questions, complexityAnalyses);
    
    // Create optimized batches with enhanced sizing
    const batches = this.createEnhancedOptimizedBatches(groupedQuestions);
    
    console.log(`📊 Enhanced BatchProcessingOptimizer: Created ${batches.length} optimized batches (${this.config.optimizationLevel} optimization)`);
    
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
      
      // Enhanced grouping key with optimization level
      const groupKey = `${complexity}_${confidence}_${model}_${this.config.optimizationLevel}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, { questions: [], analyses: [] });
      }
      
      groups.get(groupKey).questions.push(question);
      groups.get(groupKey).analyses.push(analysis);
    });

    return groups;
  }

  private createEnhancedOptimizedBatches(
    groupedQuestions: Map<string, { questions: any[], analyses: ComplexityAnalysis[] }>
  ): BatchGroup[] {
    const batches: BatchGroup[] = [];

    for (const [groupKey, group] of groupedQuestions) {
      const [complexity, confidence, model] = groupKey.split('_');
      const questions = group.questions;
      const analyses = group.analyses;

      if (questions.length === 0) continue;

      // Enhanced optimal batch size calculation
      const optimalBatchSize = this.calculateEnhancedOptimalBatchSize(
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
            id: `enhanced_batch_${++this.batchCounter}`,
            questions: batchQuestions,
            complexity: complexity as any,
            confidenceRange: this.calculateConfidenceRange(batchAnalyses),
            recommendedModel: model,
            batchSize: batchQuestions.length,
            priority: this.calculateEnhancedBatchPriority(complexity as any, confidence as any)
          });
        }
      }
    }

    // Enhanced sorting with optimization level consideration
    return batches.sort((a, b) => {
      if (this.config.optimizationLevel === 'aggressive') {
        // Prioritize larger batches for maximum throughput
        return (b.batchSize * b.priority) - (a.batchSize * a.priority);
      } else {
        // Standard priority sorting
        return b.priority - a.priority;
      }
    });
  }

  private calculateEnhancedOptimalBatchSize(
    complexity: 'simple' | 'medium' | 'complex',
    confidence: 'high' | 'medium' | 'low',
    questionCount: number
  ): number {
    let baseSize = this.config.maxBatchSize;

    // Enhanced size calculation based on optimization level
    switch (this.config.optimizationLevel) {
      case 'aggressive':
        // Larger batches for maximum throughput
        switch (complexity) {
          case 'simple':
            baseSize = Math.min(this.config.maxBatchSize, 15);
            break;
          case 'medium':
            baseSize = Math.min(this.config.maxBatchSize, 10);
            break;
          case 'complex':
            baseSize = Math.min(this.config.maxBatchSize, 6);
            break;
        }
        break;
        
      case 'balanced':
        // Moderate batches balancing speed and accuracy
        switch (complexity) {
          case 'simple':
            baseSize = Math.min(this.config.maxBatchSize, 12);
            break;
          case 'medium':
            baseSize = Math.min(this.config.maxBatchSize, 8);
            break;
          case 'complex':
            baseSize = Math.min(this.config.maxBatchSize, 5);
            break;
        }
        break;
        
      case 'conservative':
        // Smaller batches prioritizing accuracy
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
        break;
    }

    // Adjust based on confidence with enhanced logic
    switch (confidence) {
      case 'high':
        // Can use larger batches for high confidence
        if (this.config.optimizationLevel === 'aggressive') {
          baseSize = Math.min(baseSize + 2, this.config.maxBatchSize);
        }
        break;
      case 'medium':
        // Keep base size for medium confidence
        break;
      case 'low':
        // Reduce batch size for low confidence
        baseSize = Math.max(Math.floor(baseSize * 0.7), this.config.minBatchSize);
        break;
    }

    return Math.min(baseSize, questionCount, this.config.maxBatchSize);
  }

  private calculateEnhancedBatchPriority(
    complexity: 'simple' | 'medium' | 'complex',
    confidence: 'high' | 'medium' | 'low'
  ): number {
    let priority = 0;

    // Enhanced priority calculation
    switch (complexity) {
      case 'simple': priority += 35; break; // Increased for better throughput
      case 'medium': priority += 25; break; // Increased
      case 'complex': priority += 15; break; // Increased
    }

    switch (confidence) {
      case 'high': priority += 35; break; // Increased
      case 'medium': priority += 25; break; // Increased
      case 'low': priority += 15; break; // Increased
    }

    // Optimization level bonus
    switch (this.config.optimizationLevel) {
      case 'aggressive':
        if (complexity === 'simple' && confidence === 'high') {
          priority += 20; // Extra boost for optimal candidates
        }
        break;
      case 'balanced':
        if (complexity !== 'complex') {
          priority += 10; // Moderate boost for non-complex questions
        }
        break;
      case 'conservative':
        if (confidence === 'high') {
          priority += 5; // Small boost only for high confidence
        }
        break;
    }

    return priority;
  }

  private createIndividualBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    console.log('🔧 Enhanced BatchProcessingOptimizer: Creating individual batches (batching disabled or insufficient questions)');
    
    return questions.map((question, index) => {
      const analysis = complexityAnalyses[index];
      return {
        id: `individual_enhanced_${++this.batchCounter}`,
        questions: [question],
        complexity: this.getComplexityCategory(analysis?.complexityScore || 50),
        confidenceRange: [analysis?.confidenceInDecision || 50, analysis?.confidenceInDecision || 50],
        recommendedModel: analysis?.recommendedModel || 'gpt-4o-mini',
        batchSize: 1,
        priority: this.calculateEnhancedBatchPriority(
          this.getComplexityCategory(analysis?.complexityScore || 50),
          this.getConfidenceCategory(analysis?.confidenceInDecision || 50)
        )
      };
    });
  }

  private calculateConfidenceRange(analyses: ComplexityAnalysis[]): [number, number] {
    const confidences = analyses.map(a => a.confidenceInDecision);
    return [Math.min(...confidences), Math.max(...confidences)];
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
    console.log('🔧 Enhanced BatchProcessingOptimizer: Configuration updated', this.config);
  }

  getConfiguration(): BatchProcessingConfig {
    return { ...this.config };
  }

  generateEnhancedBatchSummary(batches: BatchGroup[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const batchCount = batches.length;
    const avgBatchSize = totalQuestions > 0 ? (totalQuestions / batchCount).toFixed(1) : '0';
    
    const complexityDistribution = batches.reduce((dist, batch) => {
      dist[batch.complexity] = (dist[batch.complexity] || 0) + batch.questions.length;
      return dist;
    }, {} as Record<string, number>);

    const throughputImprovement = this.config.optimizationLevel === 'aggressive' ? '4-6x' : 
                                 this.config.optimizationLevel === 'balanced' ? '3-4x' : '2-3x';

    return `Enhanced Batch Optimization Summary (${this.config.optimizationLevel}): ${totalQuestions} questions → ${batchCount} batches (avg: ${avgBatchSize}). ` +
           `Distribution - Simple: ${complexityDistribution.simple || 0}, Medium: ${complexityDistribution.medium || 0}, Complex: ${complexityDistribution.complex || 0}. ` +
           `Expected throughput improvement: ${throughputImprovement}`;
  }

  // Legacy method name support
  generateBatchSummary(batches: BatchGroup[]): string {
    return this.generateEnhancedBatchSummary(batches);
  }
}
