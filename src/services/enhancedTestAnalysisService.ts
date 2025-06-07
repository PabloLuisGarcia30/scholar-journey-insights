import { 
  ExtractTextResponse, 
  AnalyzeTestResponse,
  ExtractTextRequest,
  AnalyzeTestRequest,
  extractTextFromFile,
  analyzeTest
} from './testAnalysisService';
import { BatchProcessingOptimizer, BatchGroup, BatchProcessingResult } from './batchProcessingOptimizer';
import { BatchAwareModelRouter, BatchRoutingDecision } from './batchAwareModelRouter';
import { ProgressiveFallbackHandler, FallbackResult } from './progressiveFallbackHandler';
import { QuestionComplexityAnalyzer } from './questionComplexityAnalyzer';
import { FlexibleOcrService, FlexibleProcessingResult } from './flexibleOcrService';

export interface EnhancedAnalysisConfig {
  enableBatchProcessing: boolean;
  enableProgressiveFallback: boolean;
  enableCostOptimization: boolean;
  enableFlexibleTemplates: boolean;
  maxBatchSize: number;
  qualityThreshold: number;
  validationMode: boolean;
}

// Extend the base response type to include batch processing summary
export interface BatchAnalysisResult extends AnalyzeTestResponse {
  batchProcessingSummary?: {
    totalBatches: number;
    batchDistribution: Record<string, number>;
    totalCostSavings: number;
    avgBatchSize: number;
    fallbacksTriggered: number;
    qualityScore: number;
    processingTimeMs: number;
  };
  enhancedMetrics?: {
    batchProcessingEnabled: boolean;
    progressiveFallbacksUsed: string[];
    modelDistribution: Record<string, number>;
    costOptimizationSavings: number;
    qualityImprovements: number;
    flexibleTemplatesUsed?: boolean;
    questionTypeDistribution?: Record<string, number>;
  };
  processingMetrics?: {
    totalProcessingTime: number;
    aiOptimizationEnabled: boolean;
    batchProcessingUsed: boolean;
    flexibleTemplateProcessing?: boolean;
  };
}

const DEFAULT_CONFIG: EnhancedAnalysisConfig = {
  enableBatchProcessing: true,
  enableProgressiveFallback: true,
  enableCostOptimization: true,
  enableFlexibleTemplates: true,
  maxBatchSize: 6,
  qualityThreshold: 75,
  validationMode: false
};

export class EnhancedTestAnalysisService {
  private batchOptimizer: BatchProcessingOptimizer;
  private batchRouter: BatchAwareModelRouter;
  private fallbackHandler: ProgressiveFallbackHandler;
  private config: EnhancedAnalysisConfig;

  constructor(config: Partial<EnhancedAnalysisConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    
    this.batchOptimizer = new BatchProcessingOptimizer({
      enableBatching: this.config.enableBatchProcessing,
      maxBatchSize: this.config.maxBatchSize
    });
    
    this.batchRouter = new BatchAwareModelRouter({
      enableBatchRouting: this.config.enableBatchProcessing,
      fallbackThreshold: this.config.qualityThreshold
    });
    
    this.fallbackHandler = new ProgressiveFallbackHandler({
      enableProgressiveFallback: this.config.enableProgressiveFallback,
      qualityThreshold: this.config.qualityThreshold
    });

    console.log('🚀 EnhancedTestAnalysisService initialized with flexible templates:', this.config);
  }

  async analyzeTestWithFlexibleProcessing(request: AnalyzeTestRequest): Promise<BatchAnalysisResult> {
    console.log('🔬 Enhanced analysis with flexible template processing');
    const startTime = Date.now();

    try {
      // Check if flexible template processing is enabled
      if (!this.config.enableFlexibleTemplates) {
        return this.analyzeTestWithBatchProcessing(request);
      }

      // Extract and analyze questions with flexible templates
      const flexibleResults = await this.processWithFlexibleTemplates(request);
      
      if (flexibleResults.length === 0) {
        console.log('📝 No flexible results, falling back to standard processing');
        return this.analyzeTestWithBatchProcessing(request);
      }

      console.log(`📊 Flexible processing completed: ${flexibleResults.length} files processed`);

      // Create enhanced response with flexible template data
      const enhancedResponse = await this.createFlexibleResponse(
        request, 
        flexibleResults,
        Date.now() - startTime
      );

      console.log('✅ Flexible enhanced analysis completed successfully');
      return enhancedResponse;

    } catch (error) {
      console.error('❌ Flexible enhanced analysis failed, falling back:', error);
      return this.analyzeTestWithBatchProcessing(request);
    }
  }

  private async processWithFlexibleTemplates(
    request: AnalyzeTestRequest
  ): Promise<FlexibleProcessingResult[]> {
    const results: FlexibleProcessingResult[] = [];

    for (const file of request.files) {
      try {
        console.log(`🔧 Processing ${file.fileName} with flexible templates`);
        
        // Create a mock File object for processing
        const mockFile = new File(
          [new Blob(['mock'])], 
          file.fileName, 
          { type: 'image/jpeg' }
        );

        // Process with flexible OCR service
        const flexibleResult = await FlexibleOcrService.processWithFlexibleTemplate(
          mockFile
        );

        results.push(flexibleResult);
        console.log(`✅ Flexible processing completed for ${file.fileName}`);

      } catch (error) {
        console.error(`❌ Flexible processing failed for ${file.fileName}:`, error);
        // Continue with other files
      }
    }

    return results;
  }

  async analyzeTestWithBatchProcessing(request: AnalyzeTestRequest): Promise<BatchAnalysisResult> {
    console.log('🔬 EnhancedTestAnalysisService: Starting enhanced analysis with batch processing');
    const startTime = Date.now();

    try {
      // Extract questions from structured data
      const questions = this.extractQuestionsFromRequest(request);
      
      if (questions.length === 0) {
        console.log('📝 No questions found, falling back to standard analysis');
        const baseResponse = await analyzeTest(request);
        return baseResponse as BatchAnalysisResult;
      }

      console.log(`📊 Found ${questions.length} questions for enhanced processing`);

      // Analyze question complexity
      const complexityAnalyses = QuestionComplexityAnalyzer.batchAnalyzeQuestions(questions, []);
      
      // Create optimized batches
      const batches = this.batchOptimizer.optimizeQuestionBatches(questions, complexityAnalyses);
      console.log(this.batchOptimizer.generateBatchSummary(batches));

      // Route batches for processing
      const routingDecisions = this.batchRouter.routeBatchesForProcessing(batches);

      // Process batches with fallback support
      const batchResults = await this.processBatchesWithFallback(routingDecisions);

      // Aggregate results and create enhanced response
      const enhancedResponse = await this.createEnhancedResponse(
        request, 
        batchResults, 
        routingDecisions,
        Date.now() - startTime
      );

      console.log('✅ Enhanced analysis completed successfully');
      return enhancedResponse;

    } catch (error) {
      console.error('❌ Enhanced analysis failed, falling back to standard analysis:', error);
      const baseResponse = await analyzeTest(request);
      return baseResponse as BatchAnalysisResult;
    }
  }

  private async createFlexibleResponse(
    request: AnalyzeTestRequest,
    flexibleResults: FlexibleProcessingResult[],
    processingTime: number
  ): Promise<BatchAnalysisResult> {
    // Create base response using standard analysis
    const baseResponse = await analyzeTest(request);
    
    // Calculate flexible template metrics
    const questionTypeDistribution = this.calculateQuestionTypeDistribution(flexibleResults);
    const avgQualityScore = flexibleResults.reduce((sum, r) => sum + r.qualityScore, 0) / flexibleResults.length;
    
    return {
      ...baseResponse,
      enhancedMetrics: {
        batchProcessingEnabled: this.config.enableBatchProcessing,
        progressiveFallbacksUsed: [],
        modelDistribution: this.calculateFlexibleModelDistribution(flexibleResults),
        costOptimizationSavings: 0,
        qualityImprovements: Math.floor(avgQualityScore * 100),
        flexibleTemplatesUsed: true,
        questionTypeDistribution
      },
      processingMetrics: {
        totalProcessingTime: processingTime,
        aiOptimizationEnabled: true,
        batchProcessingUsed: false,
        flexibleTemplateProcessing: true
      }
    };
  }

  private calculateQuestionTypeDistribution(
    results: FlexibleProcessingResult[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};
    let totalQuestions = 0;

    results.forEach(result => {
      result.questionTypeResults.forEach(q => {
        distribution[q.questionType] = (distribution[q.questionType] || 0) + 1;
        totalQuestions++;
      });
    });

    // Convert to percentages
    Object.keys(distribution).forEach(type => {
      distribution[type] = distribution[type] / totalQuestions;
    });

    return distribution;
  }

  private calculateFlexibleModelDistribution(
    results: FlexibleProcessingResult[]
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    results.forEach(result => {
      Object.entries(result.processingMethodsUsed).forEach(([method, count]) => {
        distribution[method] = (distribution[method] || 0) + count;
      });
    });

    return distribution;
  }

  private extractQuestionsFromRequest(request: AnalyzeTestRequest): any[] {
    const allQuestions: any[] = [];
    
    for (const file of request.files) {
      if (file.structuredData?.questions) {
        allQuestions.push(...file.structuredData.questions);
      }
      if (file.structuredData?.questionGroups) {
        for (const group of file.structuredData.questionGroups) {
          if (group.selectedAnswer) {
            allQuestions.push({
              questionNumber: group.questionNumber,
              questionText: `Question ${group.questionNumber}`,
              detectedAnswer: {
                selectedOption: group.selectedAnswer.optionLetter,
                confidence: group.selectedAnswer.confidence
              }
            });
          }
        }
      }
    }

    return allQuestions;
  }

  private async processBatchesWithFallback(
    routingDecisions: BatchRoutingDecision[]
  ): Promise<{ results: any[], metrics: BatchProcessingResult[] }> {
    const allResults: any[] = [];
    const allMetrics: BatchProcessingResult[] = [];

    for (const decision of routingDecisions) {
      try {
        console.log(`🔄 Processing batch ${decision.batchId} (${decision.questions.length} questions)`);
        
        const { results, metrics } = await this.batchRouter.processBatchWithFallback(
          decision,
          this.processBatchQuestions.bind(this)
        );

        allResults.push(...results);
        allMetrics.push(metrics);

        console.log(`✅ Batch ${decision.batchId} completed: ${results.length} results`);

      } catch (error) {
        console.error(`❌ Batch ${decision.batchId} failed:`, error);
        
        // Emergency fallback - process individually
        for (const question of decision.questions) {
          allResults.push({
            question_number: question.questionNumber,
            score: 0,
            error: true,
            fallback_used: true
          });
        }
      }
    }

    return { results: allResults, metrics: allMetrics };
  }

  private async processBatchQuestions(
    questions: any[], 
    model: string, 
    options: any = {}
  ): Promise<any[]> {
    // Simulate batch processing with the specified model
    // In a real implementation, this would call the appropriate AI service
    
    console.log(`🤖 Processing ${questions.length} questions with ${model}`);
    
    // Mock processing with different success rates based on model and options
    const baseSuccessRate = model === 'gpt-4.1-2025-04-14' ? 0.95 : 0.85;
    const enhancedSuccessRate = options.enhanced ? baseSuccessRate + 0.05 : baseSuccessRate;
    
    const results = questions.map(question => {
      const success = Math.random() < enhancedSuccessRate;
      
      if (success) {
        return {
          question_number: question.questionNumber,
          score: Math.floor(Math.random() * 100) + 1,
          feedback: `Processed with ${model}`,
          confidence: enhancedSuccessRate * 100,
          model_used: model
        };
      } else {
        return {
          question_number: question.questionNumber,
          error: true,
          reason: 'Processing failed'
        };
      }
    });

    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, options.individual ? 500 : 200));
    
    return results;
  }

  private async createEnhancedResponse(
    request: AnalyzeTestRequest,
    batchResults: { results: any[], metrics: BatchProcessingResult[] },
    routingDecisions: BatchRoutingDecision[],
    processingTime: number
  ): Promise<BatchAnalysisResult> {
    // Create base response using standard analysis
    const baseResponse = await analyzeTest(request);
    
    // Calculate batch processing summary
    const batchSummary = this.calculateBatchSummary(batchResults.metrics, routingDecisions);
    
    // Calculate enhanced metrics
    const enhancedMetrics = this.calculateEnhancedMetrics(batchResults, routingDecisions);

    return {
      ...baseResponse,
      batchProcessingSummary: {
        ...batchSummary,
        processingTimeMs: processingTime
      },
      enhancedMetrics: {
        batchProcessingEnabled: this.config.enableBatchProcessing,
        progressiveFallbacksUsed: this.extractFallbackStrategies(batchResults.metrics),
        modelDistribution: this.calculateModelDistribution(routingDecisions),
        costOptimizationSavings: batchSummary.totalCostSavings,
        qualityImprovements: this.calculateQualityImprovements(batchResults.metrics)
      }
    };
  }

  private calculateBatchSummary(
    metrics: BatchProcessingResult[], 
    decisions: BatchRoutingDecision[]
  ) {
    const totalBatches = metrics.length;
    const totalCostSavings = metrics.reduce((sum, m) => sum + m.costSavings, 0) / totalBatches;
    const avgBatchSize = metrics.reduce((sum, m) => sum + m.processedQuestions, 0) / totalBatches;
    const fallbacksTriggered = metrics.reduce((sum, m) => sum + m.fallbacksTriggered, 0);
    const avgQualityScore = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / totalBatches;

    const batchDistribution = decisions.reduce((dist, decision) => {
      const size = decision.questions.length;
      const key = size === 1 ? 'individual' : `batch_${size}`;
      dist[key] = (dist[key] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    return {
      totalBatches,
      batchDistribution,
      totalCostSavings,
      avgBatchSize,
      fallbacksTriggered,
      qualityScore: avgQualityScore
    };
  }

  private calculateEnhancedMetrics(
    batchResults: { results: any[], metrics: BatchProcessingResult[] },
    decisions: BatchRoutingDecision[]
  ) {
    const fallbackStrategies = this.extractFallbackStrategies(batchResults.metrics);
    const modelDistribution = this.calculateModelDistribution(decisions);
    const costSavings = batchResults.metrics.reduce((sum, m) => sum + m.costSavings, 0);
    const qualityImprovements = this.calculateQualityImprovements(batchResults.metrics);

    return {
      progressiveFallbacksUsed: fallbackStrategies,
      modelDistribution,
      costOptimizationSavings: costSavings,
      qualityImprovements
    };
  }

  private extractFallbackStrategies(metrics: BatchProcessingResult[]): string[] {
    const strategies = new Set<string>();
    metrics.forEach(metric => {
      if (metric.fallbacksTriggered > 0) {
        strategies.add('progressive_fallback');
      }
    });
    return Array.from(strategies);
  }

  private calculateModelDistribution(decisions: BatchRoutingDecision[]): Record<string, number> {
    return decisions.reduce((dist, decision) => {
      const model = decision.model === 'gpt-4.1-2025-04-14' ? 'GPT-4.1' : 'GPT-4o-mini';
      dist[model] = (dist[model] || 0) + decision.questions.length;
      return dist;
    }, {} as Record<string, number>);
  }

  private calculateQualityImprovements(metrics: BatchProcessingResult[]): number {
    return metrics.reduce((sum, metric) => sum + (metric.qualityScore > 80 ? 1 : 0), 0);
  }

  // Public API methods
  async extractTextFromFile(request: ExtractTextRequest): Promise<ExtractTextResponse> {
    return extractTextFromFile(request);
  }

  async analyzeTest(request: AnalyzeTestRequest): Promise<BatchAnalysisResult> {
    if (this.config.enableFlexibleTemplates) {
      return this.analyzeTestWithFlexibleProcessing(request);
    } else if (this.config.enableBatchProcessing) {
      return this.analyzeTestWithBatchProcessing(request);
    } else {
      const baseResponse = await analyzeTest(request);
      return baseResponse as BatchAnalysisResult;
    }
  }

  // Configuration management
  updateConfiguration(newConfig: Partial<EnhancedAnalysisConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    this.batchOptimizer.updateConfiguration({
      enableBatching: this.config.enableBatchProcessing,
      maxBatchSize: this.config.maxBatchSize
    });
    
    this.batchRouter.updateConfiguration({
      enableBatchRouting: this.config.enableBatchProcessing,
      fallbackThreshold: this.config.qualityThreshold
    });
    
    this.fallbackHandler.updateConfiguration({
      enableProgressiveFallback: this.config.enableProgressiveFallback,
      qualityThreshold: this.config.qualityThreshold
    });

    console.log('🔧 EnhancedTestAnalysisService: Configuration updated', this.config);
  }

  enableValidationMode(): void {
    this.updateConfiguration({ validationMode: true });
    console.log('🧪 EnhancedTestAnalysisService: Validation mode enabled');
  }

  getProcessingStatistics() {
    return {
      batchOptimizer: this.batchOptimizer.getConfiguration(),
      batchRouter: this.batchRouter.getRoutingHistory(),
      fallbackHandler: this.fallbackHandler.getFallbackHistory()
    };
  }

  generateProcessingReport(): string {
    const stats = this.getProcessingStatistics();
    const routingHistory = stats.batchRouter;
    const fallbackHistory = stats.fallbackHandler;

    if (routingHistory.length === 0) {
      return 'No batch processing operations recorded';
    }

    const totalQuestions = routingHistory.reduce((sum, d) => sum + d.questions.length, 0);
    const totalBatches = routingHistory.length;
    const avgBatchSize = totalQuestions / totalBatches;

    return `Enhanced Analysis Report: ${totalQuestions} questions processed in ${totalBatches} batches ` +
           `(avg size: ${avgBatchSize.toFixed(1)}). Fallback operations: ${fallbackHistory.length}. ` +
           `Flexible templates: ${this.config.enableFlexibleTemplates}. ` +
           `Batch processing enabled: ${this.config.enableBatchProcessing}`;
  }
}

// Export singleton instance for backward compatibility
export const enhancedTestAnalysisService = new EnhancedTestAnalysisService();
