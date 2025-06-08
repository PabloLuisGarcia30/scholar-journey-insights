import { ComplexityAnalysis } from './shared/aiOptimizationShared';
import { ConservativeBatchOptimizer, SkillAwareBatchGroup } from './conservativeBatchOptimizer';

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

const CONSERVATIVE_ENHANCED_CONFIG: BatchProcessingConfig = {
  maxBatchSize: 6,  // Significantly reduced from 15
  minBatchSize: 1,  // Allow individual questions
  complexityThresholds: {
    simple: 20,     // More strict classification
    medium: 45,     // More strict classification
    complex: 70     // More strict classification
  },
  confidenceThresholds: {
    high: 85,       // Higher confidence required
    medium: 70,     // Higher confidence required
    low: 50         // Higher confidence required
  },
  enableBatching: true,
  fallbackEnabled: true,
  optimizationLevel: 'conservative' // New default
};

export class BatchProcessingOptimizer {
  private config: BatchProcessingConfig;
  private batchCounter = 0;
  private performanceMetrics: Array<{ timestamp: number; throughput: number; accuracy: number }> = [];
  private conservativeOptimizer: ConservativeBatchOptimizer;

  constructor(config: Partial<BatchProcessingConfig> = {}) {
    this.config = { ...CONSERVATIVE_ENHANCED_CONFIG, ...config };
    this.conservativeOptimizer = new ConservativeBatchOptimizer();
  }

  optimizeQuestionBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    if (!this.config.enableBatching || questions.length < this.config.minBatchSize) {
      return this.createIndividualBatches(questions, complexityAnalyses);
    }

    console.log(`🎯 Conservative BatchProcessingOptimizer: Optimizing ${questions.length} questions with quality-first approach`);

    // Use conservative approach by default
    if (this.config.optimizationLevel === 'conservative') {
      return this.createConservativeBatches(questions, complexityAnalyses);
    }

    // Legacy grouping for backward compatibility
    const groupedQuestions = this.groupQuestionsByCharacteristics(questions, complexityAnalyses);
    const batches = this.createConservativeOptimizedBatches(groupedQuestions);
    
    console.log(`📊 Conservative BatchProcessingOptimizer: Created ${batches.length} quality-optimized batches`);
    
    return batches;
  }

  private createConservativeBatches(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): BatchGroup[] {
    console.log('🎯 Using conservative batching strategy for maximum accuracy');
    
    const conservativeBatches: BatchGroup[] = [];

    // Group by complexity first
    const complexityGroups = this.groupByComplexityConservative(questions, complexityAnalyses);
    
    for (const [complexity, group] of complexityGroups) {
      const maxBatchSize = this.getConservativeMaxBatchSize(complexity as any);
      
      // Create small, focused batches
      for (let i = 0; i < group.questions.length; i += maxBatchSize) {
        const batchQuestions = group.questions.slice(i, i + maxBatchSize);
        const batchAnalyses = group.analyses.slice(i, i + maxBatchSize);
        
        if (batchQuestions.length > 0) {
          conservativeBatches.push({
            id: `conservative_batch_${++this.batchCounter}`,
            questions: batchQuestions,
            complexity: complexity as any,
            confidenceRange: this.calculateConfidenceRange(batchAnalyses),
            recommendedModel: this.selectConservativeModel(complexity as any, batchAnalyses),
            batchSize: batchQuestions.length,
            priority: this.calculateConservativePriority(complexity as any, batchAnalyses)
          });
        }
      }
    }

    // Sort by priority (quality-focused)
    return conservativeBatches.sort((a, b) => b.priority - a.priority);
  }

  private groupByComplexityConservative(
    questions: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): Map<string, { questions: any[], analyses: ComplexityAnalysis[] }> {
    const groups = new Map([
      ['simple', { questions: [], analyses: [] }],
      ['medium', { questions: [], analyses: [] }],
      ['complex', { questions: [], analyses: [] }]
    ]);

    questions.forEach((question, index) => {
      const analysis = complexityAnalyses[index];
      if (!analysis) return;

      // Conservative complexity classification (bias toward higher complexity)
      const complexity = this.getConservativeComplexityCategory(analysis.complexityScore);
      
      const group = groups.get(complexity);
      if (group) {
        group.questions.push(question);
        group.analyses.push(analysis);
      }
    });

    return groups;
  }

  private getConservativeComplexityCategory(score: number): 'simple' | 'medium' | 'complex' {
    // More conservative thresholds - bias toward complex classification
    if (score <= this.config.complexityThresholds.simple) return 'simple';
    if (score <= this.config.complexityThresholds.medium) return 'medium';
    return 'complex';
  }

  private getConservativeMaxBatchSize(complexity: 'simple' | 'medium' | 'complex'): number {
    // Conservative batch sizes for maximum accuracy
    switch (complexity) {
      case 'simple': return Math.min(4, this.config.maxBatchSize);  // Max 4 for simple
      case 'medium': return Math.min(3, this.config.maxBatchSize);  // Max 3 for medium
      case 'complex': return Math.min(2, this.config.maxBatchSize); // Max 2 for complex
      default: return 1;
    }
  }

  private selectConservativeModel(
    complexity: 'simple' | 'medium' | 'complex', 
    analyses: ComplexityAnalysis[]
  ): string {
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidenceInDecision, 0) / analyses.length;
    
    // Conservative model selection - prefer accuracy over cost
    if (complexity === 'complex' || avgConfidence < 70) {
      return 'gpt-4o'; // Use more powerful model for uncertain cases
    }
    
    if (complexity === 'medium' || avgConfidence < 80) {
      return 'gpt-4o-mini'; // Balanced model for medium complexity
    }
    
    return 'gpt-4o-mini'; // Default to reliable model
  }

  private calculateConservativePriority(
    complexity: 'simple' | 'medium' | 'complex',
    analyses: ComplexityAnalysis[]
  ): number {
    let priority = 50; // Base priority

    // Higher priority for higher confidence (more reliable results)
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidenceInDecision, 0) / analyses.length;
    priority += (avgConfidence / 100) * 30;

    // Adjust for complexity (complex questions get high priority for careful processing)
    switch (complexity) {
      case 'simple': priority += 20; break;  // High priority for quick, reliable wins
      case 'medium': priority += 15; break;  // Medium priority
      case 'complex': priority += 25; break; // Highest priority for careful processing
    }

    // Bonus for small batch sizes (more focused processing)
    if (analyses.length <= 2) {
      priority += 10;
    }

    return Math.round(priority);
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

  private createConservativeOptimizedBatches(
    groupedQuestions: Map<string, { questions: any[], analyses: ComplexityAnalysis[] }>
  ): BatchGroup[] {
    const batches: BatchGroup[] = [];

    for (const [groupKey, group] of groupedQuestions) {
      const [complexity, confidence, model] = groupKey.split('_');
      const questions = group.questions;
      const analyses = group.analyses;

      if (questions.length === 0) continue;

      // Conservative optimal batch size calculation
      const optimalBatchSize = this.calculateConservativeOptimalBatchSize(
        complexity as any, 
        confidence as any, 
        questions.length
      );

      // Split into batches of conservative size
      for (let i = 0; i < questions.length; i += optimalBatchSize) {
        const batchQuestions = questions.slice(i, i + optimalBatchSize);
        const batchAnalyses = analyses.slice(i, i + optimalBatchSize);
        
        if (batchQuestions.length > 0) {
          batches.push({
            id: `conservative_enhanced_batch_${++this.batchCounter}`,
            questions: batchQuestions,
            complexity: complexity as any,
            confidenceRange: this.calculateConfidenceRange(batchAnalyses),
            recommendedModel: model,
            batchSize: batchQuestions.length,
            priority: this.calculateConservativePriority(complexity as any, batchAnalyses)
          });
        }
      }
    }

    // Sort with conservative priority (accuracy over speed)
    return batches.sort((a, b) => b.priority - a.priority);
  }

  private calculateConservativeOptimalBatchSize(
    complexity: 'simple' | 'medium' | 'complex',
    confidence: 'high' | 'medium' | 'low',
    questionCount: number
  ): number {
    // Conservative batch sizes regardless of optimization level
    let baseSize = this.getConservativeMaxBatchSize(complexity);

    // Reduce size for low confidence
    if (confidence === 'low') {
      baseSize = Math.max(Math.floor(baseSize * 0.5), 1);
    } else if (confidence === 'medium') {
      baseSize = Math.max(Math.floor(baseSize * 0.7), 1);
    }

    return Math.min(baseSize, questionCount, this.config.maxBatchSize);
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
        priority: this.calculateConservativePriority(
          this.getComplexityCategory(analysis?.complexityScore || 50),
          [analysis]
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

  generateConservativeBatchSummary(batches: BatchGroup[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const batchCount = batches.length;
    const avgBatchSize = totalQuestions > 0 ? (totalQuestions / batchCount).toFixed(1) : '0';
    
    const complexityDistribution = batches.reduce((dist, batch) => {
      dist[batch.complexity] = (dist[batch.complexity] || 0) + batch.questions.length;
      return dist;
    }, {} as Record<string, number>);

    return `Conservative Batch Summary: ${totalQuestions} questions → ${batchCount} quality-optimized batches (avg: ${avgBatchSize}). ` +
           `Distribution - Simple: ${complexityDistribution.simple || 0}, Medium: ${complexityDistribution.medium || 0}, Complex: ${complexityDistribution.complex || 0}. ` +
           `Quality-first approach with reduced batch sizes for maximum accuracy.`;
  }

  // Legacy method support
  generateEnhancedBatchSummary(batches: BatchGroup[]): string {
    return this.generateConservativeBatchSummary(batches);
  }

  generateBatchSummary(batches: BatchGroup[]): string {
    return this.generateConservativeBatchSummary(batches);
  }

  enableConservativeMode(): void {
    this.config = {
      ...this.config,
      maxBatchSize: 4,
      optimizationLevel: 'conservative',
      complexityThresholds: {
        simple: 15,
        medium: 35,
        complex: 60
      },
      confidenceThresholds: {
        high: 90,
        medium: 75,
        low: 55
      }
    };
    
    console.log('🎯 Conservative mode enabled in BatchProcessingOptimizer');
  }

  getQualityMetrics(): {
    averageBatchSize: number;
    qualityMode: string;
    conservativeSettings: any;
  } {
    const recentMetrics = this.performanceMetrics.slice(-10);
    const avgBatchSize = recentMetrics.length > 0 
      ? recentMetrics.reduce((sum, m) => sum + (m.throughput || 1), 0) / recentMetrics.length 
      : 0;

    return {
      averageBatchSize: avgBatchSize,
      qualityMode: this.config.optimizationLevel,
      conservativeSettings: {
        maxBatchSize: this.config.maxBatchSize,
        thresholds: this.config.complexityThresholds,
        confidenceRequirements: this.config.confidenceThresholds
      }
    };
  }
}
