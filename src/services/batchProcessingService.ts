
export interface BatchJob {
  id: string;
  files: File[];
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  progress: number;
  results: any[];
  errors: string[];
  estimatedTimeRemaining?: number;
}

export interface ProcessingQueue {
  activeJobs: BatchJob[];
  pendingJobs: BatchJob[];
  completedJobs: BatchJob[];
  maxConcurrentJobs: number;
}

export class BatchProcessingService {
  private static queue: ProcessingQueue = {
    activeJobs: [],
    pendingJobs: [],
    completedJobs: [],
    maxConcurrentJobs: 3
  };

  private static jobListeners: Map<string, (job: BatchJob) => void> = new Map();

  static createBatchJob(files: File[], priority: 'low' | 'normal' | 'high' = 'normal'): string {
    const jobId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const job: BatchJob = {
      id: jobId,
      files,
      status: 'pending',
      priority,
      createdAt: Date.now(),
      progress: 0,
      results: [],
      errors: []
    };

    // Insert based on priority
    if (priority === 'high') {
      this.queue.pendingJobs.unshift(job);
    } else {
      this.queue.pendingJobs.push(job);
    }

    this.saveQueueState();
    this.processNextJob();
    
    return jobId;
  }

  static async processNextJob(): Promise<void> {
    if (this.queue.activeJobs.length >= this.queue.maxConcurrentJobs) {
      return;
    }

    const nextJob = this.queue.pendingJobs.shift();
    if (!nextJob) return;

    nextJob.status = 'processing';
    nextJob.startedAt = Date.now();
    this.queue.activeJobs.push(nextJob);

    this.notifyJobUpdate(nextJob);

    try {
      await this.processBatchJob(nextJob);
    } catch (error) {
      nextJob.status = 'failed';
      nextJob.errors.push(error instanceof Error ? error.message : 'Unknown error');
    }

    // Move to completed
    const activeIndex = this.queue.activeJobs.findIndex(j => j.id === nextJob.id);
    if (activeIndex >= 0) {
      this.queue.activeJobs.splice(activeIndex, 1);
    }
    
    nextJob.completedAt = Date.now();
    this.queue.completedJobs.unshift(nextJob);

    this.saveQueueState();
    this.notifyJobUpdate(nextJob);

    // Process next job
    setTimeout(() => this.processNextJob(), 1000);
  }

  private static async processBatchJob(job: BatchJob): Promise<void> {
    const totalFiles = job.files.length;
    
    for (let i = 0; i < totalFiles; i++) {
      const file = job.files[i];
      
      try {
        job.progress = ((i + 1) / totalFiles) * 100;
        job.estimatedTimeRemaining = this.calculateEstimatedTime(job, i, totalFiles);
        
        this.notifyJobUpdate(job);

        // Process individual file (placeholder for actual processing)
        const result = await this.processIndividualFile(file);
        job.results.push(result);

      } catch (error) {
        const errorMsg = `Failed to process ${file.name}: ${error instanceof Error ? error.message : 'Unknown error'}`;
        job.errors.push(errorMsg);
      }
    }

    job.status = job.errors.length === 0 ? 'completed' : 'failed';
    job.progress = 100;
  }

  private static async processIndividualFile(file: File): Promise<any> {
    // Simulate processing time
    await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
    
    return {
      fileName: file.name,
      size: file.size,
      processedAt: Date.now(),
      success: Math.random() > 0.1 // 90% success rate simulation
    };
  }

  private static calculateEstimatedTime(job: BatchJob, currentIndex: number, totalFiles: number): number {
    if (!job.startedAt || currentIndex === 0) return 0;
    
    const elapsed = Date.now() - job.startedAt;
    const avgTimePerFile = elapsed / (currentIndex + 1);
    const remainingFiles = totalFiles - (currentIndex + 1);
    
    return Math.round((avgTimePerFile * remainingFiles) / 1000); // seconds
  }

  static subscribeToJob(jobId: string, callback: (job: BatchJob) => void): void {
    this.jobListeners.set(jobId, callback);
  }

  static unsubscribeFromJob(jobId: string): void {
    this.jobListeners.delete(jobId);
  }

  private static notifyJobUpdate(job: BatchJob): void {
    const listener = this.jobListeners.get(job.id);
    if (listener) {
      listener({ ...job });
    }
  }

  static getJob(jobId: string): BatchJob | null {
    const allJobs = [
      ...this.queue.activeJobs,
      ...this.queue.pendingJobs,
      ...this.queue.completedJobs
    ];
    
    return allJobs.find(job => job.id === jobId) || null;
  }

  static getQueueStatus(): ProcessingQueue {
    return { ...this.queue };
  }

  static pauseJob(jobId: string): boolean {
    const job = this.queue.activeJobs.find(j => j.id === jobId);
    if (job) {
      job.status = 'paused';
      return true;
    }
    return false;
  }

  static resumeJob(jobId: string): boolean {
    const job = this.queue.activeJobs.find(j => j.id === jobId);
    if (job && job.status === 'paused') {
      job.status = 'processing';
      return true;
    }
    return false;
  }

  private static saveQueueState(): void {
    try {
      localStorage.setItem('batchProcessingQueue', JSON.stringify(this.queue));
    } catch (error) {
      console.warn('Failed to save queue state:', error);
    }
  }

  static loadQueueState(): void {
    try {
      const saved = localStorage.getItem('batchProcessingQueue');
      if (saved) {
        this.queue = { ...this.queue, ...JSON.parse(saved) };
        // Reset active jobs to pending on reload
        this.queue.pendingJobs.push(...this.queue.activeJobs);
        this.queue.activeJobs = [];
      }
    } catch (error) {
      console.warn('Failed to load queue state:', error);
    }
  }
}
