import { PerformanceMonitoringService } from "./performanceMonitoringService";
import { withRetry, RetryableError } from "./retryService";

export interface OpenAIGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  reasoning: string;
  gradingMethod: string;
  metadata?: Record<string, any>;
}

export interface ComplexQuestionBatch {
  id: string;
  questions: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: OpenAIGradingResult[];
  errors: Array<{ questionIndex: number; error: string; recoverable: boolean }>;
  processingTime: number;
  costEstimate: number;
}

export interface EnhancedBatchProcessingResult {
  successfulResults: OpenAIGradingResult[];
  errors: Array<{ batch: any[]; error: any; recoverable: boolean }>;
  totalProcessed: number;
  successRate: number;
  processingTimeMs: number;
  batchMetrics: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    avgBatchProcessingTime: number;
    costEfficiency: number;
  };
}

export class OpenAIComplexGradingService {
  private static batches: Map<string, ComplexQuestionBatch> = new Map();
  private static readonly BATCH_SIZE = 6;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY = 2000;
  private static readonly COST_PER_REQUEST = 0.003;

  static async createBatch(questions: any[]): Promise<string> {
    const batchId = `openai_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const batch: ComplexQuestionBatch = {
      id: batchId,
      questions,
      status: 'pending',
      results: [],
      errors: [],
      processingTime: 0,
      costEstimate: questions.length * this.COST_PER_REQUEST
    };

    this.batches.set(batchId, batch);
    console.log(`🚀 Created OpenAI batch: ${batchId} with ${questions.length} questions`);

    // Start processing
    this.processBatchWithEnhancedHandling(batchId).catch(error => {
      console.error(`OpenAI batch ${batchId} failed:`, error);
    });

    return batchId;
  }

  private static async processBatchWithEnhancedHandling(batchId: string): Promise<void> {
    const batch = this.batches.get(batchId);
    if (!batch) return;

    batch.status = 'processing';
    const startTime = Date.now();

    try {
      // Create smart batches for parallel processing
      const smartBatches = this.createSmartBatches(batch.questions);

      console.log(`📦 Processing ${smartBatches.length} smart batches for OpenAI batch ${batchId}`);

      // Enhanced parallel batch processing with Promise.allSettled
      const batchPromises = smartBatches.map((questionBatch, index) => 
        this.processSingleBatch(questionBatch, index)
      );

      const allResults = await Promise.allSettled(batchPromises);

      // Enhanced result handling and error categorization
      const processedResult = this.processEnhancedBatchResults(allResults, smartBatches);

      // Update batch with enhanced results
      batch.results = processedResult.successfulResults;
      batch.errors = processedResult.errors.map(e => ({
        questionIndex: -1,
        error: e.error?.message || String(e.error),
        recoverable: e.recoverable
      }));

      // Determine final status
      if (processedResult.errors.length === 0) {
        batch.status = 'completed';
        console.log(`✅ OpenAI batch ${batchId} completed successfully: ${batch.results.length} questions processed`);
      } else if (processedResult.successfulResults.length > 0) {
        batch.status = 'completed'; // Partial success
        console.warn(`⚠️ OpenAI batch ${batchId} completed with ${processedResult.errors.length} errors, ${batch.results.length} successful`);
      } else {
        batch.status = 'failed';
        console.error(`❌ OpenAI batch ${batchId} failed completely`);
      }

      batch.processingTime = Date.now() - startTime;

      // Log enhanced performance metrics
      PerformanceMonitoringService.recordMetric('openai_batch_processing', batch.processingTime, batch.status === 'completed', {
        batchId,
        questionsProcessed: batch.results.length,
        errors: batch.errors.length,
        costEstimate: batch.costEstimate,
        enhancedProcessing: true
      });

      console.log(`📊 OpenAI batch processing summary for ${batchId}:`, {
        totalQuestions: batch.questions.length,
        successfulQuestions: batch.results.length,
        failedQuestions: batch.errors.length,
        successRate: `${(processedResult.successRate * 100).toFixed(1)}%`,
        processingTime: `${(batch.processingTime / 1000).toFixed(1)}s`,
        costEstimate: `$${batch.costEstimate.toFixed(4)}`
      });

    } catch (error) {
      batch.status = 'failed';
      batch.errors.push({
        questionIndex: -1,
        error: `Batch processing failed: ${error.message}`,
        recoverable: false
      });
      batch.processingTime = Date.now() - startTime;
      console.error(`💥 OpenAI batch ${batchId} failed with critical error:`, error);
    }
  }

  private static async processSingleBatch(questions: any[], batchIndex: number): Promise<OpenAIGradingResult[]> {
    return withRetry(
      async () => {
        console.log(`🔄 Processing OpenAI batch ${batchIndex + 1} with ${questions.length} questions`);
        
        // Simulate OpenAI API processing
        const processingTime = 3000 + (questions.length * 800); // Longer processing for complex questions
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Simulate higher accuracy for OpenAI processing
        const results: OpenAIGradingResult[] = questions.map((question, index) => ({
          questionNumber: question.questionNumber || index + 1,
          isCorrect: Math.random() > 0.1, // 90% accuracy for OpenAI
          pointsEarned: Math.random() > 0.1 ? 1 : 0,
          pointsPossible: 1,
          confidence: 0.90 + (Math.random() * 0.1), // Higher confidence
          gradingMethod: 'openai_complex_processing',
          reasoning: `OpenAI complex reasoning for Q${question.questionNumber || index + 1}: Advanced analysis using GPT-4 with detailed understanding of the problem context and solution methodology.`,
          metadata: {
            batchIndex,
            processingTime,
            apiVersion: 'gpt-4',
            complexity: 'high'
          }
        }));

        console.log(`✅ OpenAI batch ${batchIndex + 1} completed: ${results.length} questions processed`);
        return results;
      },
      {
        maxAttempts: this.MAX_RETRIES,
        baseDelay: this.RETRY_DELAY,
        maxDelay: 15000,
        backoffMultiplier: 2,
        timeoutMs: 45000
      }
    );
  }

  private static processEnhancedBatchResults(
    allResults: PromiseSettledResult<OpenAIGradingResult[]>[],
    smartBatches: any[][]
  ): EnhancedBatchProcessingResult {
    const successfulResults: OpenAIGradingResult[] = [];
    const errors: Array<{ batch: any[]; error: any; recoverable: boolean }> = [];
    let totalProcessingTime = 0;

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(...result.value); // Flatten the array
        totalProcessingTime += result.value.reduce((sum, r) => sum + (r.metadata?.processingTime || 0), 0);
      } else {
        const error = this.categorizeOpenAIError(result.reason, index, smartBatches[index]);
        errors.push(error);
        
        console.warn(`⚠️ OpenAI batch ${index + 1} failed:`, {
          errorMessage: error.error?.message || String(error.error),
          questionsInBatch: error.batch.length,
          recoverable: error.recoverable
        });
      }
    });

    // Enhanced error logging with detailed analysis
    if (errors.length > 0) {
      const errorSummary = this.generateOpenAIErrorSummary(errors);
      console.warn(`🚨 OpenAI processing errors summary:`, errorSummary);
    }

    const totalProcessed = successfulResults.length;
    const successRate = totalProcessed / smartBatches.reduce((sum, batch) => sum + batch.length, 0);
    const avgBatchProcessingTime = allResults.filter(r => r.status === 'fulfilled').length > 0 ? 
      totalProcessingTime / allResults.filter(r => r.status === 'fulfilled').length : 0;

    const batchMetrics = {
      totalBatches: smartBatches.length,
      successfulBatches: allResults.filter(r => r.status === 'fulfilled').length,
      failedBatches: errors.length,
      avgBatchProcessingTime,
      costEfficiency: totalProcessed > 0 ? (totalProcessed * this.COST_PER_REQUEST) / totalProcessed : 0
    };

    return {
      successfulResults,
      errors,
      totalProcessed,
      successRate,
      processingTimeMs: avgBatchProcessingTime,
      batchMetrics
    };
  }

  private static categorizeOpenAIError(
    error: any,
    batchIndex: number,
    batch: any[]
  ): { batch: any[]; error: any; recoverable: boolean } {
    let recoverable = true;
    const errorMessage = error?.message || String(error);

    // Categorize OpenAI-specific error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      recoverable = true; // Rate limits are always recoverable
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      recoverable = true; // Timeouts can be retried
    } else if (errorMessage.includes('API key') || errorMessage.includes('authentication')) {
      recoverable = false; // Auth issues need manual intervention
    } else if (errorMessage.includes('token limit') || errorMessage.includes('context length')) {
      recoverable = false; // Token limits require content modification
    } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      recoverable = true; // Server errors are usually temporary
    }

    return {
      batch,
      error,
      recoverable
    };
  }

  private static generateOpenAIErrorSummary(errors: Array<{ batch: any[]; error: any; recoverable: boolean }>) {
    const errorTypes: Record<string, number> = {};
    let recoverableErrors = 0;
    let criticalErrors = 0;
    let totalAffectedQuestions = 0;

    errors.forEach(error => {
      const errorMessage = error.error?.message || String(error.error);
      
      // Categorize error type for summary
      let errorType = 'unknown';
      if (errorMessage.includes('rate limit')) errorType = 'rate_limit';
      else if (errorMessage.includes('timeout')) errorType = 'timeout';
      else if (errorMessage.includes('API key')) errorType = 'authentication';
      else if (errorMessage.includes('token limit')) errorType = 'token_limit';
      else if (errorMessage.includes('500')) errorType = 'server_error';

      errorTypes[errorType] = (errorTypes[errorType] || 0) + 1;

      if (error.recoverable) {
        recoverableErrors++;
      } else {
        criticalErrors++;
      }

      totalAffectedQuestions += error.batch.length;
    });

    return {
      totalErrors: errors.length,
      errorBreakdown: errorTypes,
      recoverableErrors,
      criticalErrors,
      mostCommonError: Object.entries(errorTypes).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
      affectedQuestions: totalAffectedQuestions,
      recommendedActions: this.generateOpenAIRecommendations(errorTypes)
    };
  }

  private static generateOpenAIRecommendations(errorTypes: Record<string, number>): string[] {
    const recommendations: string[] = [];

    if (errorTypes.rate_limit > 0) {
      recommendations.push('Implement rate limiting and request spacing for OpenAI API calls');
    }
    if (errorTypes.timeout > 0) {
      recommendations.push('Increase timeout values or reduce batch sizes for complex questions');
    }
    if (errorTypes.authentication > 0) {
      recommendations.push('Verify OpenAI API key configuration and permissions');
    }
    if (errorTypes.token_limit > 0) {
      recommendations.push('Implement content truncation or question splitting for long inputs');
    }
    if (errorTypes.server_error > 0) {
      recommendations.push('Implement exponential backoff for server error recovery');
    }

    return recommendations;
  }

  private static createSmartBatches(questions: any[]): any[][] {
    const batches: any[][] = [];
    
    for (let i = 0; i < questions.length; i += this.BATCH_SIZE) {
      batches.push(questions.slice(i, i + this.BATCH_SIZE));
    }

    return batches;
  }

  static getBatch(batchId: string): ComplexQuestionBatch | undefined {
    return this.batches.get(batchId);
  }

  static getAllBatches(): ComplexQuestionBatch[] {
    return Array.from(this.batches.values());
  }

  static getProcessingStats(): {
    totalBatches: number;
    activeBatches: number;
    completedBatches: number;
    failedBatches: number;
    averageProcessingTime: number;
    totalCostEstimate: number;
  } {
    const allBatches = this.getAllBatches();
    
    return {
      totalBatches: allBatches.length,
      activeBatches: allBatches.filter(b => b.status === 'processing').length,
      completedBatches: allBatches.filter(b => b.status === 'completed').length,
      failedBatches: allBatches.filter(b => b.status === 'failed').length,
      averageProcessingTime: allBatches.reduce((sum, b) => sum + b.processingTime, 0) / allBatches.length || 0,
      totalCostEstimate: allBatches.reduce((sum, b) => sum + b.costEstimate, 0)
    };
  }
}
