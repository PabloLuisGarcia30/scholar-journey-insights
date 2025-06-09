
import { supabase } from "@/integrations/supabase/client";
import { PerformanceMonitoringService } from "./performanceMonitoringService";
import { CacheLoggingService } from "./cacheLoggingService";
import { withRetry, RetryableError } from "./retryService";

export interface EnhancedBatchJob {
  id: string;
  examId: string;
  studentName: string;
  questions: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  results: any[];
  errors: EnhancedBatchError[];
  estimatedTimeRemaining?: number;
  processingMetrics: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    avgBatchTime: number;
    costEstimate: number;
    filesPerSecond: number;
  };
}

export interface EnhancedBatchError {
  batchIndex: number;
  batchQuestions: any[];
  errorType: 'api_failure' | 'rate_limit' | 'timeout' | 'validation' | 'unknown';
  errorMessage: string;
  retryCount: number;
  timestamp: number;
  recoverable: boolean;
}

export interface BatchProcessingResult {
  successfulResults: any[];
  errors: EnhancedBatchError[];
  totalProcessed: number;
  successRate: number;
  processingTimeMs: number;
  batchMetrics: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    avgBatchProcessingTime: number;
  };
}

export class EnhancedBatchGradingService {
  private static jobs: Map<string, EnhancedBatchJob> = new Map();
  private static readonly MAX_BATCH_SIZE = 4;
  private static readonly MAX_RETRIES = 3;
  private static readonly RETRY_DELAY_MS = 2000;

  static async createEnhancedBatchJob(
    questions: any[],
    examId: string,
    studentName: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    answerKeys?: any[]
  ): Promise<string> {
    const jobId = `enhanced_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: EnhancedBatchJob = {
      id: jobId,
      examId,
      studentName,
      questions,
      status: 'pending',
      priority,
      createdAt: Date.now(),
      progress: 0,
      results: [],
      errors: [],
      processingMetrics: {
        totalBatches: 0,
        successfulBatches: 0,
        failedBatches: 0,
        avgBatchTime: 0,
        costEstimate: 0,
        filesPerSecond: 0
      }
    };

    this.jobs.set(jobId, job);
    console.log(`🚀 Enhanced batch job created: ${jobId} with ${questions.length} questions`);

    // Start processing immediately
    this.processBatchJobWithEnhancedHandling(jobId, answerKeys).catch(error => {
      console.error(`Enhanced batch job ${jobId} failed:`, error);
    });

    return jobId;
  }

  private static async processBatchJobWithEnhancedHandling(
    jobId: string,
    answerKeys?: any[]
  ): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = Date.now();
    const startTime = Date.now();

    try {
      // Create smart batches
      const smartBatches = this.createSmartBatches(job.questions);
      job.processingMetrics.totalBatches = smartBatches.length;

      console.log(`📦 Processing ${smartBatches.length} smart batches for job ${jobId}`);

      // Enhanced parallel batch processing with Promise.allSettled
      const batchPromises = smartBatches.map((batch, index) => 
        this.processBatchWithRetry(batch, index, job.examId, job.studentName, answerKeys)
      );

      const allResults = await Promise.allSettled(batchPromises);

      // Enhanced result handling and error categorization
      const batchResult = this.processBatchResults(allResults, smartBatches, job);

      // Update job with enhanced results
      job.results = batchResult.successfulResults.flat();
      job.errors = batchResult.errors;
      job.processingMetrics.successfulBatches = batchResult.batchMetrics.successfulBatches;
      job.processingMetrics.failedBatches = batchResult.batchMetrics.failedBatches;
      job.processingMetrics.avgBatchTime = batchResult.batchMetrics.avgBatchProcessingTime;
      job.processingMetrics.costEstimate = batchResult.successfulResults.length * 0.002;
      job.processingMetrics.filesPerSecond = job.results.length / ((Date.now() - startTime) / 1000);

      // Determine final status
      if (job.errors.length === 0) {
        job.status = 'completed';
        console.log(`✅ Enhanced batch job ${jobId} completed successfully: ${job.results.length} questions processed`);
      } else if (job.results.length > 0) {
        job.status = 'completed'; // Partial success
        console.warn(`⚠️ Enhanced batch job ${jobId} completed with ${job.errors.length} errors, ${job.results.length} successful`);
      } else {
        job.status = 'failed';
        console.error(`❌ Enhanced batch job ${jobId} failed completely`);
      }

      job.progress = 100;
      job.completedAt = Date.now();

      // Log performance metrics
      PerformanceMonitoringService.recordBatchProcessingMetrics({
        jobId,
        totalQuestions: job.questions.length,
        successfulQuestions: job.results.length,
        failedQuestions: job.errors.length,
        processingTimeMs: job.completedAt - job.startedAt!,
        successRate: job.results.length / job.questions.length,
        avgBatchTime: job.processingMetrics.avgBatchTime
      });

    } catch (error) {
      job.status = 'failed';
      job.errors.push({
        batchIndex: -1,
        batchQuestions: job.questions,
        errorType: 'unknown',
        errorMessage: `Job processing failed: ${error.message}`,
        retryCount: 0,
        timestamp: Date.now(),
        recoverable: false
      });
      console.error(`💥 Enhanced batch job ${jobId} failed with critical error:`, error);
    }
  }

  private static async processBatchWithRetry(
    batch: any[],
    batchIndex: number,
    examId: string,
    studentName: string,
    answerKeys?: any[]
  ): Promise<any[]> {
    return withRetry(
      async () => {
        console.log(`🔄 Processing batch ${batchIndex + 1} with ${batch.length} questions`);
        
        // Simulate processing time based on batch size
        const processingTime = 2000 + (batch.length * 500);
        await new Promise(resolve => setTimeout(resolve, processingTime));

        // Create mock results for demonstration
        const results = batch.map((question, index) => ({
          questionNumber: question.questionNumber || index + 1,
          isCorrect: Math.random() > 0.2, // 80% success rate
          pointsEarned: Math.random() > 0.2 ? 1 : 0,
          pointsPossible: 1,
          confidence: 0.85 + (Math.random() * 0.15),
          gradingMethod: 'enhanced_batch_processing',
          reasoning: `Enhanced batch processing result for Q${question.questionNumber || index + 1}`,
          batchIndex,
          processingTime
        }));

        console.log(`✅ Batch ${batchIndex + 1} completed: ${results.length} questions processed`);
        return results;
      },
      {
        maxAttempts: this.MAX_RETRIES,
        baseDelay: this.RETRY_DELAY_MS,
        maxDelay: 10000,
        backoffMultiplier: 2,
        timeoutMs: 30000
      }
    );
  }

  private static processBatchResults(
    allResults: PromiseSettledResult<any[]>[],
    smartBatches: any[][],
    job: EnhancedBatchJob
  ): BatchProcessingResult {
    const successfulResults: any[] = [];
    const errors: EnhancedBatchError[] = [];
    let totalProcessingTime = 0;

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
        totalProcessingTime += result.value[0]?.processingTime || 0;
      } else {
        const error = this.categorizeError(result.reason, index, smartBatches[index]);
        errors.push(error);
        
        console.warn(`⚠️ Batch ${index + 1} failed:`, {
          errorType: error.errorType,
          message: error.errorMessage,
          questionsInBatch: error.batchQuestions.length,
          recoverable: error.recoverable
        });
      }
    });

    // Log comprehensive error summary
    if (errors.length > 0) {
      const errorSummary = this.generateErrorSummary(errors);
      console.warn(`🚨 Enhanced batch processing errors summary:`, errorSummary);
      
      // Log cache events for failed batches
      errors.forEach(error => {
        CacheLoggingService.logCacheEvent(
          'miss',
          `batch_${error.batchIndex}`,
          {
            exam_id: job.examId,
            question_number: error.batchIndex,
            skill_tags: ['batch_processing'],
            response_type: 'grading'
          }
        );
      });
    }

    const batchMetrics = {
      totalBatches: smartBatches.length,
      successfulBatches: successfulResults.length,
      failedBatches: errors.length,
      avgBatchProcessingTime: successfulResults.length > 0 ? totalProcessingTime / successfulResults.length : 0
    };

    return {
      successfulResults,
      errors,
      totalProcessed: successfulResults.reduce((sum, batch) => sum + batch.length, 0),
      successRate: (successfulResults.length / smartBatches.length),
      processingTimeMs: Date.now() - job.startedAt!,
      batchMetrics
    };
  }

  private static categorizeError(
    error: any,
    batchIndex: number,
    batchQuestions: any[]
  ): EnhancedBatchError {
    let errorType: EnhancedBatchError['errorType'] = 'unknown';
    let recoverable = true;

    const errorMessage = error?.message || String(error);

    // Categorize error types
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorType = 'rate_limit';
      recoverable = true;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      errorType = 'timeout';
      recoverable = true;
    } else if (errorMessage.includes('API') || errorMessage.includes('500') || errorMessage.includes('502')) {
      errorType = 'api_failure';
      recoverable = true;
    } else if (errorMessage.includes('validation') || errorMessage.includes('format')) {
      errorType = 'validation';
      recoverable = false;
    }

    return {
      batchIndex,
      batchQuestions,
      errorType,
      errorMessage,
      retryCount: 0,
      timestamp: Date.now(),
      recoverable
    };
  }

  private static generateErrorSummary(errors: EnhancedBatchError[]) {
    const errorTypeCount = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoverableErrors = errors.filter(e => e.recoverable).length;
    const criticalErrors = errors.filter(e => !e.recoverable).length;

    return {
      totalErrors: errors.length,
      errorBreakdown: errorTypeCount,
      recoverableErrors,
      criticalErrors,
      mostCommonError: Object.entries(errorTypeCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
      affectedQuestions: errors.reduce((sum, error) => sum + error.batchQuestions.length, 0)
    };
  }

  private static createSmartBatches(questions: any[]): any[][] {
    const batches: any[][] = [];
    const batchSize = Math.min(this.MAX_BATCH_SIZE, Math.max(2, Math.ceil(questions.length / 8)));

    for (let i = 0; i < questions.length; i += batchSize) {
      batches.push(questions.slice(i, i + batchSize));
    }

    return batches;
  }

  static getJob(jobId: string): EnhancedBatchJob | undefined {
    return this.jobs.get(jobId);
  }

  static getQueueStatus() {
    const allJobs = Array.from(this.jobs.values());
    
    return {
      activeJobs: allJobs.filter(job => job.status === 'processing'),
      pendingJobs: allJobs.filter(job => job.status === 'pending'),
      completedJobs: allJobs.filter(job => job.status === 'completed' || job.status === 'failed'),
      stats: {
        totalJobsProcessed: allJobs.filter(job => job.status === 'completed').length,
        activeWorkers: allJobs.filter(job => job.status === 'processing').length,
        maxWorkers: 8,
        queueDepth: allJobs.filter(job => job.status === 'pending').length,
        currentThroughput: this.calculateCurrentThroughput(allJobs),
        successRate: this.calculateSuccessRate(allJobs),
        averageProcessingTime: this.calculateAverageProcessingTime(allJobs)
      },
      autoScaling: {
        enabled: true,
        currentConcurrency: allJobs.filter(job => job.status === 'processing').length,
        minConcurrency: 2,
        maxConcurrency: 8
      }
    };
  }

  private static calculateCurrentThroughput(jobs: EnhancedBatchJob[]): number {
    const recentJobs = jobs.filter(job => 
      job.completedAt && job.completedAt > Date.now() - 60000 // Last minute
    );
    return recentJobs.length;
  }

  private static calculateSuccessRate(jobs: EnhancedBatchJob[]): number {
    const completedJobs = jobs.filter(job => job.status === 'completed' || job.status === 'failed');
    if (completedJobs.length === 0) return 1;
    
    const successfulJobs = completedJobs.filter(job => job.status === 'completed');
    return successfulJobs.length / completedJobs.length;
  }

  private static calculateAverageProcessingTime(jobs: EnhancedBatchJob[]): number {
    const completedJobs = jobs.filter(job => job.completedAt && job.startedAt);
    if (completedJobs.length === 0) return 0;
    
    const totalTime = completedJobs.reduce((sum, job) => 
      sum + (job.completedAt! - job.startedAt!), 0
    );
    return totalTime / completedJobs.length;
  }

  static updateAutoScalingConfig(config: { enabled: boolean }): void {
    console.log(`Auto-scaling ${config.enabled ? 'enabled' : 'disabled'}`);
  }

  static pauseJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'paused';
      return true;
    }
    return false;
  }

  static resumeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'paused') {
      job.status = 'processing';
      return true;
    }
    return false;
  }
}
