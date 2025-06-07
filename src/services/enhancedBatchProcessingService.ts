
import { supabase } from "@/integrations/supabase/client";

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
}

export class EnhancedBatchProcessingService {
  private jobListeners: Map<string, (job: EnhancedBatchJob) => void> = new Map();
  private pollingIntervals: Map<string, number> = new Map();

  async createBatchJob(
    files: File[], 
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
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
          maxRetries: 3
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      const { jobId } = response.data;
      
      // Start monitoring the job
      this.startJobMonitoring(jobId);
      
      return jobId;
    } catch (error) {
      console.error('Failed to create batch job:', error);
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
        const response = await fetch(`${supabase.supabaseUrl}/functions/v1/batch-queue-manager/status?jobId=${jobId}`, {
          headers: {
            'Authorization': `Bearer ${supabase.supabaseKey}`
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
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/batch-queue-manager/status?jobId=${jobId}`, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
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
        estimatedTimeRemaining: this.calculateEstimatedTime(job)
      };
    } catch (error) {
      console.error('Failed to get job:', error);
      return null;
    }
  }

  async getProcessingStats(): Promise<ProcessingStats> {
    try {
      const response = await fetch(`${supabase.supabaseUrl}/functions/v1/batch-queue-manager/queue-stats`, {
        headers: {
          'Authorization': `Bearer ${supabase.supabaseKey}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to get queue stats');
      }

      const stats = await response.json();
      
      return {
        totalJobsProcessed: stats.completedJobs + stats.failedJobs,
        averageProcessingTime: 30000, // Default estimate
        successRate: stats.completedJobs / Math.max(1, stats.completedJobs + stats.failedJobs),
        currentThroughput: 0, // Would need historical data
        queueDepth: stats.pendingJobs,
        activeWorkers: stats.activeJobs,
        maxWorkers: stats.maxConcurrentJobs
      };
    } catch (error) {
      console.error('Failed to get processing stats:', error);
      // Return default stats
      return {
        totalJobsProcessed: 0,
        averageProcessingTime: 30000,
        successRate: 1.0,
        currentThroughput: 0,
        queueDepth: 0,
        activeWorkers: 0,
        maxWorkers: 8
      };
    }
  }

  getQueueStatus() {
    // This method returns a simplified status for the UI
    // In a real implementation, you'd fetch this from the database
    return {
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

  async getSystemRecommendations(): Promise<string[]> {
    const stats = await this.getProcessingStats();
    const recommendations: string[] = [];

    if (stats.queueDepth > 20) {
      recommendations.push('High queue depth detected. Consider processing during off-peak hours.');
    }

    if (stats.successRate < 0.95) {
      recommendations.push('Success rate is below 95%. Check file quality and formats.');
    }

    if (stats.activeWorkers === 0 && stats.queueDepth > 0) {
      recommendations.push('Jobs are queued but no workers are active. Check system status.');
    }

    return recommendations;
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
