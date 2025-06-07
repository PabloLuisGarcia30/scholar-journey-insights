import { supabase } from "@/integrations/supabase/client";
import { enhancedTestAnalysisService } from './enhancedTestAnalysisService';
import { batchPerformanceMonitor } from './batchPerformanceMonitor';

export interface EnhancedBatchJob {
  id: string;
  files: File[];
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  results: any[];
  errors: string[];
  estimatedTimeRemaining?: number;
  retryCount: number;
  maxRetries: number;
  processingMetrics?: {
    filesPerSecond: number;
    averageFileSize: number;
    apiCallsUsed: number;
    batchProcessingEnabled: boolean;
    aiOptimizationUsed: boolean;
    costSavings: number;
  };
}

export interface AutoScalingConfig {
  enabled: boolean;
  minConcurrency: number;
  maxConcurrency: number;
  targetUtilization: number;
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number;
}

export interface ProcessingStats {
  totalJobsProcessed: number;
  averageProcessingTime: number;
  successRate: number;
  currentThroughput: number;
  queueDepth: number;
  activeWorkers: number;
  maxWorkers: number;
  enhancedMetrics?: {
    batchProcessingEnabled: boolean;
    aiOptimizationEnabled: boolean;
    costSavings: number;
    optimalBatchSize: number;
    recentSuccessRate: number;
    fallbackRate: number;
  };
}

// Constants for Supabase URLs and keys
const SUPABASE_URL = "https://irnkilorodqvhizmujtq.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybmtpbG9yb2Rxdmhpem11anRxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDkwMjM2OTUsImV4cCI6MjA2NDU5OTY5NX0.9wRY7Qj1NTEWukOF902PhpPoR_iASywfAqkTQP6ySOw";

export class EnhancedBatchProcessingService {
  private jobListeners: Map<string, (job: EnhancedBatchJob) => void> = new Map();
  private pollingIntervals: Map<string, NodeJS.Timeout> = new Map();

  async createBatchJob(
    files: File[], 
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    enableAIOptimization: boolean = true
  ): Promise<string> {
    // Convert files to the format expected by the batch queue manager
    const filesData = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        fileContent: await this.convertFileToBase64(file),
        fileSize: file.size
      }))
    );

    try {
      const response = await supabase.functions.invoke('batch-queue-manager', {
        body: {
          files: filesData,
          priority,
          maxRetries: 3,
          enableAIOptimization,
          batchProcessingEnabled: true
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { jobId } = response.data;
      
      console.log(`🚀 Enhanced batch job created: ${jobId} (AI optimization: ${enableAIOptimization})`);
      
      // Start monitoring the job
      this.startJobMonitoring(jobId);
      
      return jobId;
    } catch (error) {
      console.error('Failed to create enhanced batch job:', error);
      throw new Error(`Failed to create batch job: ${error.message}`);
    }
  }

  private async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  private startJobMonitoring(jobId: string) {
    const pollInterval = 2000; // 2 seconds
    
    const monitor = async () => {
      try {
        // Get job status from the queue manager
        const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-queue-manager/status?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
          }
        });

        if (response.ok) {
          const job = await response.json();
          
          // Convert to our interface format
          const enhancedJob: EnhancedBatchJob = {
            id: job.id,
            files: [], // Files not returned from status check
            status: this.mapStatus(job.status),
            priority: job.priority as any,
            createdAt: new Date(job.created_at).getTime(),
            startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
            completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
            progress: job.progress,
            results: job.results || [],
            errors: job.errors || [],
            retryCount: job.retry_count || 0,
            maxRetries: job.max_retries || 3,
            estimatedTimeRemaining: this.calculateEstimatedTime(job)
          };

          this.notifyJobUpdate(enhancedJob);

          // Stop monitoring if job is complete
          if (enhancedJob.status === 'completed' || enhancedJob.status === 'failed') {
            const intervalId = this.pollingIntervals.get(jobId);
            if (intervalId) {
              clearInterval(intervalId);
              this.pollingIntervals.delete(jobId);
            }
            return;
          }
        }
      } catch (error) {
        console.error('Job monitoring failed:', error);
      }
    };

    // Start monitoring
    monitor();
    const intervalId = setInterval(monitor, pollInterval);
    this.pollingIntervals.set(jobId, intervalId);
  }

  private mapStatus(status: string): EnhancedBatchJob['status'] {
    switch (status) {
      case 'pending': return 'queued';
      case 'processing': return 'processing';
      case 'completed': return 'completed';
      case 'failed': return 'failed';
      default: return 'queued';
    }
  }

  private calculateEstimatedTime(job: any): number {
    if (!job.started_at || job.progress === 0) return 0;
    
    const elapsed = Date.now() - new Date(job.started_at).getTime();
    const remainingProgress = 100 - job.progress;
    const estimatedTotal = (elapsed / job.progress) * 100;
    const remaining = estimatedTotal - elapsed;
    
    return Math.max(0, Math.round(remaining / 1000)); // seconds
  }

  subscribeToJob(jobId: string, callback: (job: EnhancedBatchJob) => void): void {
    this.jobListeners.set(jobId, callback);
  }

  unsubscribeFromJob(jobId: string): void {
    this.jobListeners.delete(jobId);
    
    // Stop polling for this job
    const intervalId = this.pollingIntervals.get(jobId);
    if (intervalId) {
      clearInterval(intervalId);
      this.pollingIntervals.delete(jobId);
    }
  }

  private notifyJobUpdate(job: EnhancedBatchJob): void {
    const listener = this.jobListeners.get(job.id);
    if (listener) {
      listener({ ...job });
    }
  }

  async getJob(jobId: string): Promise<EnhancedBatchJob | null> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-queue-manager/status?jobId=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) return null;

      const job = await response.json();
      
      return {
        id: job.id,
        files: [],
        status: this.mapStatus(job.status),
        priority: job.priority as any,
        createdAt: new Date(job.created_at).getTime(),
        startedAt: job.started_at ? new Date(job.started_at).getTime() : undefined,
        completedAt: job.completed_at ? new Date(job.completed_at).getTime() : undefined,
        progress: job.progress,
        results: job.results || [],
        errors: job.errors || [],
        retryCount: job.retry_count || 0,
        maxRetries: job.max_retries || 3,
        estimatedTimeRemaining: this.calculateEstimatedTime(job),
        processingMetrics: {
          filesPerSecond: job.processing_metrics?.files_per_second || 0,
          averageFileSize: job.processing_metrics?.average_file_size || 0,
          apiCallsUsed: job.processing_metrics?.api_calls_used || 0,
          batchProcessingEnabled: job.processing_metrics?.batch_processing_enabled || false,
          aiOptimizationUsed: job.processing_metrics?.ai_optimization_used || false,
          costSavings: job.processing_metrics?.cost_savings || 0
        }
      };
    } catch (error) {
      console.error('Failed to get enhanced job:', error);
      return null;
    }
  }

  async getProcessingStats(): Promise<ProcessingStats> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/batch-queue-manager/queue-stats`, {
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get queue stats');
      }

      const stats = await response.json();
      
      // Get enhanced performance data
      const performanceAnalysis = batchPerformanceMonitor.analyzePerformance();
      const realtimeStats = batchPerformanceMonitor.getRealtimeStats();
      
      return {
        totalJobsProcessed: stats.completedJobs + stats.failedJobs,
        averageProcessingTime: performanceAnalysis.efficiency.avgProcessingTime || 30000,
        successRate: performanceAnalysis.quality.successRate / 100 || 1.0,
        currentThroughput: performanceAnalysis.efficiency.throughputQuestionsPerSecond || 0,
        queueDepth: stats.pendingJobs,
        activeWorkers: stats.activeJobs,
        maxWorkers: stats.maxConcurrentJobs || 8,
        enhancedMetrics: {
          batchProcessingEnabled: true,
          aiOptimizationEnabled: true,
          costSavings: performanceAnalysis.cost.totalSavings,
          optimalBatchSize: performanceAnalysis.cost.optimalBatchSize,
          recentSuccessRate: realtimeStats.recentSuccessRate,
          fallbackRate: performanceAnalysis.quality.fallbackRate
        }
      };
    } catch (error) {
      console.error('Failed to get enhanced processing stats:', error);
      // Return default stats with enhanced features disabled
      return {
        totalJobsProcessed: 0,
        averageProcessingTime: 30000,
        successRate: 1.0,
        currentThroughput: 0,
        queueDepth: 0,
        activeWorkers: 0,
        maxWorkers: 8,
        enhancedMetrics: {
          batchProcessingEnabled: false,
          aiOptimizationEnabled: false,
          costSavings: 0,
          optimalBatchSize: 4,
          recentSuccessRate: 100,
          fallbackRate: 0
        }
      };
    }
  }

  // Enhanced queue status with AI optimization metrics
  getQueueStatus() {
    const baseStatus = {
      activeJobs: [],
      pendingJobs: [],
      completedJobs: [],
      stats: {
        totalJobsProcessed: 0,
        averageProcessingTime: 30000,
        successRate: 1.0,
        currentThroughput: 0,
        queueDepth: 0,
        activeWorkers: 0,
        maxWorkers: 8
      },
      autoScaling: {
        enabled: true,
        currentConcurrency: 8,
        minConcurrency: 3,
        maxConcurrency: 15
      }
    };

    // Add enhanced features
    const performanceAnalysis = batchPerformanceMonitor.analyzePerformance();
    const realtimeStats = batchPerformanceMonitor.getRealtimeStats();

    return {
      ...baseStatus,
      enhancedFeatures: {
        batchProcessingEnabled: true,
        aiOptimizationEnabled: true,
        progressiveFallbackEnabled: true,
        performanceMonitoringEnabled: true
      },
      performanceMetrics: {
        costSavings: performanceAnalysis.cost.totalSavings,
        optimalBatchSize: performanceAnalysis.cost.optimalBatchSize,
        avgQualityScore: performanceAnalysis.quality.avgQualityScore,
        throughput: performanceAnalysis.efficiency.throughputQuestionsPerSecond,
        recentSuccessRate: realtimeStats.recentSuccessRate
      },
      recommendations: performanceAnalysis.recommendations
    };
  }

  pauseJob(jobId: string): boolean {
    // Not implemented in the current queue manager
    console.log('Pause job not implemented yet');
    return false;
  }

  resumeJob(jobId: string): boolean {
    // Not implemented in the current queue manager
    console.log('Resume job not implemented yet');
    return false;
  }

  updateAutoScalingConfig(config: Partial<AutoScalingConfig>): void {
    console.log('Auto-scaling config update not implemented yet');
  }

  async processBatchWithAIOptimization(
    files: File[],
    examId: string,
    studentName: string,
    options: {
      enableBatchProcessing?: boolean;
      enableProgressiveFallback?: boolean;
      maxBatchSize?: number;
      priority?: 'low' | 'normal' | 'high' | 'urgent';
    } = {}
  ): Promise<any> {
    console.log(`🔬 Processing ${files.length} files with AI optimization`);
    const startTime = Date.now();

    try {
      // Convert files to analysis format
      const analysisFiles = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          extractedText: '', // Will be populated by analysis
          structuredData: await this.extractStructuredData(file)
        }))
      );

      // Use enhanced analysis service
      const result = await enhancedTestAnalysisService.analyzeTest({
        files: analysisFiles,
        examId,
        studentName
      });

      const processingTime = Date.now() - startTime;
      
      // Record performance metrics if batch processing was used
      if (result.batchProcessingSummary) {
        const sessionId = batchPerformanceMonitor.recordBatchProcessingSession(
          [], // Metrics would come from actual batch processing
          [], // Routing decisions would come from actual batch processing
          processingTime
        );
        
        console.log(`📊 Performance metrics recorded for session: ${sessionId}`);
      }

      console.log(`✅ AI-optimized processing completed in ${processingTime}ms`);
      
      return {
        ...result,
        processingMetrics: {
          totalProcessingTime: processingTime,
          aiOptimizationEnabled: true,
          batchProcessingUsed: !!result.batchProcessingSummary
        }
      };

    } catch (error) {
      console.error('❌ AI-optimized processing failed:', error);
      throw new Error(`AI-optimized processing failed: ${error.message}`);
    }
  }

  private async extractStructuredData(file: File): Promise<any> {
    try {
      // Convert file to base64 for analysis
      const fileContent = await this.convertFileToBase64(file);
      
      // Use enhanced text extraction
      const extractionResult = await enhancedTestAnalysisService.extractTextFromFile({
        fileName: file.name,
        fileContent
      });

      return extractionResult.structuredData || null;
    } catch (error) {
      console.error(`Failed to extract structured data from ${file.name}:`, error);
      return null;
    }
  }

  async getSystemRecommendations(): Promise<string[]> {
    const stats = await this.getProcessingStats();
    const performanceAnalysis = batchPerformanceMonitor.analyzePerformance();
    const recommendations: string[] = [...performanceAnalysis.recommendations];

    if (stats.queueDepth > 20) {
      recommendations.push('High queue depth detected. Consider processing during off-peak hours.');
    }

    if (stats.successRate < 0.95) {
      recommendations.push('Success rate is below 95%. Check file quality and formats.');
    }

    if (stats.activeWorkers === 0 && stats.queueDepth > 0) {
      recommendations.push('Jobs are queued but no workers are active. Check system status.');
    }

    // Enhanced AI optimization recommendations
    if (stats.enhancedMetrics?.costSavings < 10) {
      recommendations.push('Cost savings are low. Consider enabling batch processing optimization.');
    }

    if (stats.enhancedMetrics?.fallbackRate > 20) {
      recommendations.push('High fallback rate detected. Review question complexity thresholds.');
    }

    if (stats.enhancedMetrics?.recentSuccessRate < 90) {
      recommendations.push('Recent success rate is declining. Consider individual processing for complex content.');
    }

    return recommendations;
  }

  getPerformanceReport(): string {
    return batchPerformanceMonitor.generatePerformanceReport();
  }

  enableAIOptimization(): void {
    enhancedTestAnalysisService.updateConfiguration({
      enableBatchProcessing: true,
      enableProgressiveFallback: true,
      enableCostOptimization: true
    });
    console.log('🚀 AI optimization enabled for batch processing');
  }

  disableAIOptimization(): void {
    enhancedTestAnalysisService.updateConfiguration({
      enableBatchProcessing: false,
      enableProgressiveFallback: false,
      enableCostOptimization: false
    });
    console.log('⏸️ AI optimization disabled for batch processing');
  }

  // Cleanup method to stop all polling
  cleanup(): void {
    for (const intervalId of this.pollingIntervals.values()) {
      clearInterval(intervalId);
    }
    this.pollingIntervals.clear();
    this.jobListeners.clear();
  }
}

export const enhancedBatchService = new EnhancedBatchProcessingService();
