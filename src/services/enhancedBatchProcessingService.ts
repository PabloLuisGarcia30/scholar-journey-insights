
import { supabase } from "@/integrations/supabase/client";
import { withRetry, RetryableError } from "./retryService";
import { scalabilityMonitor, SystemMetrics } from "./scalabilityMonitoringService";

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
  targetUtilization: number; // 0-1
  scaleUpThreshold: number;
  scaleDownThreshold: number;
  cooldownPeriod: number; // ms
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
  private jobs: Map<string, EnhancedBatchJob> = new Map();
  private jobQueue: string[] = [];
  private activeJobs: Set<string> = new Set();
  private completedJobs: string[] = [];
  
  private autoScalingConfig: AutoScalingConfig = {
    enabled: true,
    minConcurrency: 5,
    maxConcurrency: 20,
    targetUtilization: 0.75,
    scaleUpThreshold: 0.85,
    scaleDownThreshold: 0.60,
    cooldownPeriod: 300000 // 5 minutes
  };

  private currentConcurrency = 10;
  private lastScaleAction = 0;
  private processingStats: ProcessingStats = {
    totalJobsProcessed: 0,
    averageProcessingTime: 0,
    successRate: 1.0,
    currentThroughput: 0,
    queueDepth: 0,
    activeWorkers: 0,
    maxWorkers: this.currentConcurrency
  };

  private jobListeners: Map<string, (job: EnhancedBatchJob) => void> = new Map();

  async createBatchJob(
    files: File[], 
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<string> {
    const jobId = `enhanced_batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: EnhancedBatchJob = {
      id: jobId,
      files,
      status: 'queued',
      priority,
      createdAt: Date.now(),
      progress: 0,
      results: [],
      errors: [],
      retryCount: 0,
      maxRetries: 3
    };

    this.jobs.set(jobId, job);
    this.insertJobInQueue(jobId, priority);
    this.updateProcessingStats();
    
    // Submit to server-side queue manager for processing
    try {
      const response = await supabase.functions.invoke('batch-queue-manager', {
        body: {
          files: files.map(file => ({
            fileName: file.name,
            fileContent: file // Will be converted to base64 in the actual implementation
          })),
          priority,
          maxRetries: job.maxRetries
        }
      });

      if (response.error) {
        throw new Error(response.error.message);
      }

      // Start local monitoring of the job
      this.startJobMonitoring(jobId, response.data.jobId);
      
    } catch (error) {
      console.error('Failed to submit job to server:', error);
      job.status = 'failed';
      job.errors.push(`Failed to submit to server: ${error.message}`);
    }

    this.processNextJobs();
    return jobId;
  }

  private insertJobInQueue(jobId: string, priority: 'low' | 'normal' | 'high' | 'urgent') {
    switch (priority) {
      case 'urgent':
        this.jobQueue.unshift(jobId);
        break;
      case 'high':
        const highInsertIndex = this.jobQueue.findIndex(id => {
          const job = this.jobs.get(id);
          return job?.priority !== 'urgent';
        });
        this.jobQueue.splice(highInsertIndex === -1 ? 0 : highInsertIndex, 0, jobId);
        break;
      case 'normal':
        const normalInsertIndex = this.jobQueue.findIndex(id => {
          const job = this.jobs.get(id);
          return job?.priority === 'low';
        });
        this.jobQueue.splice(normalInsertIndex === -1 ? this.jobQueue.length : normalInsertIndex, 0, jobId);
        break;
      case 'low':
      default:
        this.jobQueue.push(jobId);
        break;
    }
  }

  private async startJobMonitoring(localJobId: string, serverJobId: string) {
    const pollInterval = 2000; // 2 seconds
    
    const monitor = async () => {
      try {
        const response = await supabase.functions.invoke('batch-queue-manager', {
          body: null,
          method: 'GET'
        });

        if (response.data) {
          const job = this.jobs.get(localJobId);
          if (job) {
            job.progress = response.data.progress || 0;
            job.status = response.data.status || job.status;
            job.results = response.data.results || job.results;
            job.errors = response.data.errors || job.errors;
            job.estimatedTimeRemaining = response.data.estimatedTimeRemaining;

            this.notifyJobUpdate(job);

            if (job.status === 'completed' || job.status === 'failed') {
              this.finalizeJob(localJobId);
              return; // Stop monitoring
            }
          }
        }

        // Continue monitoring if job is still active
        if (this.jobs.has(localJobId)) {
          setTimeout(monitor, pollInterval);
        }
      } catch (error) {
        console.error('Job monitoring failed:', error);
        setTimeout(monitor, pollInterval * 2); // Back off on error
      }
    };

    setTimeout(monitor, pollInterval);
  }

  private finalizeJob(jobId: string) {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.completedAt = Date.now();
    this.activeJobs.delete(jobId);
    this.completedJobs.unshift(jobId);
    
    // Update stats
    this.processingStats.totalJobsProcessed++;
    if (job.startedAt && job.completedAt) {
      const processingTime = job.completedAt - job.startedAt;
      this.processingStats.averageProcessingTime = 
        (this.processingStats.averageProcessingTime * (this.processingStats.totalJobsProcessed - 1) + processingTime) 
        / this.processingStats.totalJobsProcessed;
    }

    this.updateProcessingStats();
    this.notifyJobUpdate(job);
  }

  private async processNextJobs() {
    // Auto-scaling check
    if (this.autoScalingConfig.enabled) {
      await this.checkAutoScaling();
    }

    while (
      this.activeJobs.size < this.currentConcurrency &&
      this.jobQueue.length > 0
    ) {
      const jobId = this.jobQueue.shift();
      if (!jobId) break;

      const job = this.jobs.get(jobId);
      if (!job || job.status !== 'queued') continue;

      this.activeJobs.add(jobId);
      job.status = 'processing';
      job.startedAt = Date.now();

      this.notifyJobUpdate(job);
    }

    this.updateProcessingStats();
  }

  private async checkAutoScaling() {
    const now = Date.now();
    
    // Respect cooldown period
    if (now - this.lastScaleAction < this.autoScalingConfig.cooldownPeriod) {
      return;
    }

    const currentUtilization = this.activeJobs.size / this.currentConcurrency;
    const queuePressure = this.jobQueue.length > 0 ? Math.min(this.jobQueue.length / 10, 1) : 0;
    const effectiveUtilization = currentUtilization + (queuePressure * 0.3);

    // Scale up conditions
    if (
      effectiveUtilization > this.autoScalingConfig.scaleUpThreshold &&
      this.currentConcurrency < this.autoScalingConfig.maxConcurrency
    ) {
      const newConcurrency = Math.min(
        this.currentConcurrency + Math.ceil(this.currentConcurrency * 0.25),
        this.autoScalingConfig.maxConcurrency
      );
      
      console.log(`Auto-scaling UP: ${this.currentConcurrency} -> ${newConcurrency} (utilization: ${Math.round(effectiveUtilization * 100)}%)`);
      this.currentConcurrency = newConcurrency;
      this.lastScaleAction = now;
      this.processingStats.maxWorkers = newConcurrency;
    }
    
    // Scale down conditions
    else if (
      effectiveUtilization < this.autoScalingConfig.scaleDownThreshold &&
      this.currentConcurrency > this.autoScalingConfig.minConcurrency &&
      this.jobQueue.length === 0 // Only scale down when no queue pressure
    ) {
      const newConcurrency = Math.max(
        this.currentConcurrency - Math.ceil(this.currentConcurrency * 0.20),
        this.autoScalingConfig.minConcurrency
      );
      
      console.log(`Auto-scaling DOWN: ${this.currentConcurrency} -> ${newConcurrency} (utilization: ${Math.round(effectiveUtilization * 100)}%)`);
      this.currentConcurrency = newConcurrency;
      this.lastScaleAction = now;
      this.processingStats.maxWorkers = newConcurrency;
    }
  }

  private updateProcessingStats() {
    this.processingStats.queueDepth = this.jobQueue.length;
    this.processingStats.activeWorkers = this.activeJobs.size;
    this.processingStats.maxWorkers = this.currentConcurrency;
    
    // Calculate success rate
    const recentJobs = this.completedJobs.slice(0, 100); // Last 100 jobs
    if (recentJobs.length > 0) {
      const successfulJobs = recentJobs.filter(jobId => {
        const job = this.jobs.get(jobId);
        return job?.status === 'completed';
      }).length;
      
      this.processingStats.successRate = successfulJobs / recentJobs.length;
    }

    // Calculate throughput (jobs per minute)
    const oneMinuteAgo = Date.now() - 60000;
    const recentCompletedJobs = this.completedJobs.filter(jobId => {
      const job = this.jobs.get(jobId);
      return job?.completedAt && job.completedAt > oneMinuteAgo;
    });
    
    this.processingStats.currentThroughput = recentCompletedJobs.length;
  }

  subscribeToJob(jobId: string, callback: (job: EnhancedBatchJob) => void): void {
    this.jobListeners.set(jobId, callback);
  }

  unsubscribeFromJob(jobId: string): void {
    this.jobListeners.delete(jobId);
  }

  private notifyJobUpdate(job: EnhancedBatchJob): void {
    const listener = this.jobListeners.get(job.id);
    if (listener) {
      listener({ ...job });
    }
  }

  getJob(jobId: string): EnhancedBatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  getProcessingStats(): ProcessingStats {
    return { ...this.processingStats };
  }

  getQueueStatus() {
    return {
      activeJobs: Array.from(this.activeJobs).map(id => this.jobs.get(id)).filter(Boolean),
      pendingJobs: this.jobQueue.map(id => this.jobs.get(id)).filter(Boolean),
      completedJobs: this.completedJobs.slice(0, 10).map(id => this.jobs.get(id)).filter(Boolean),
      stats: this.getProcessingStats(),
      autoScaling: {
        enabled: this.autoScalingConfig.enabled,
        currentConcurrency: this.currentConcurrency,
        minConcurrency: this.autoScalingConfig.minConcurrency,
        maxConcurrency: this.autoScalingConfig.maxConcurrency
      }
    };
  }

  pauseJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'processing') {
      job.status = 'paused';
      this.notifyJobUpdate(job);
      return true;
    }
    return false;
  }

  resumeJob(jobId: string): boolean {
    const job = this.jobs.get(jobId);
    if (job && job.status === 'paused') {
      job.status = 'queued';
      this.insertJobInQueue(jobId, job.priority);
      this.processNextJobs();
      return true;
    }
    return false;
  }

  updateAutoScalingConfig(config: Partial<AutoScalingConfig>): void {
    this.autoScalingConfig = { ...this.autoScalingConfig, ...config };
    console.log('Auto-scaling config updated:', this.autoScalingConfig);
  }

  async getSystemRecommendations(): Promise<string[]> {
    const stats = this.getProcessingStats();
    const metrics = await scalabilityMonitor.collectMetrics();
    const recommendations: string[] = [];

    if (stats.queueDepth > 50) {
      recommendations.push('High queue depth detected. Consider increasing concurrency limits.');
    }

    if (stats.successRate < 0.95) {
      recommendations.push('Success rate is below 95%. Check error logs and API reliability.');
    }

    if (metrics.averageResponseTime > 30000) {
      recommendations.push('Response times are high. Consider optimizing processing pipeline.');
    }

    if (stats.currentThroughput < stats.queueDepth / 10) {
      recommendations.push('Throughput is low relative to queue depth. Check for bottlenecks.');
    }

    return recommendations;
  }
}

export const enhancedBatchService = new EnhancedBatchProcessingService();
