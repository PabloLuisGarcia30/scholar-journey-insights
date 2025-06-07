
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BatchJob {
  id: string;
  files: Array<{
    fileName: string;
    fileContent: string;
  }>;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  results: any[];
  errors: string[];
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  retryCount: number;
  maxRetries: number;
  estimatedTimeRemaining?: number;
}

interface QueueManager {
  jobs: Map<string, BatchJob>;
  activeJobs: Set<string>;
  pendingJobs: string[];
  maxConcurrentJobs: number;
  processingRateLimits: {
    maxFilesPerBatch: number;
    delayBetweenBatches: number;
    maxApiCallsPerMinute: number;
  };
}

// Global queue manager state
const queueManager: QueueManager = {
  jobs: new Map(),
  activeJobs: new Set(),
  pendingJobs: [],
  maxConcurrentJobs: 15, // Increased from 3
  processingRateLimits: {
    maxFilesPerBatch: 8, // Increased from 3
    delayBetweenBatches: 2000, // 2 seconds
    maxApiCallsPerMinute: 500, // Rate limiting
  }
};

// Rate limiting state
const apiCallTracker = {
  calls: [] as number[],
  getCurrentMinuteCallCount: () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    apiCallTracker.calls = apiCallTracker.calls.filter(time => time > oneMinuteAgo);
    return apiCallTracker.calls.length;
  },
  recordCall: () => {
    apiCallTracker.calls.push(Date.now());
  }
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    switch (action) {
      case 'submit':
        return await handleJobSubmission(req);
      case 'status':
        return await handleStatusCheck(req);
      case 'queue-stats':
        return await handleQueueStats();
      case 'process-next':
        return await handleProcessNext();
      default:
        return new Response(JSON.stringify({ error: 'Invalid action' }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
  } catch (error) {
    console.error('Queue manager error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
})

async function handleJobSubmission(req: Request) {
  const { files, priority = 'normal', maxRetries = 3 } = await req.json();
  
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const job: BatchJob = {
    id: jobId,
    files,
    priority,
    status: 'pending',
    progress: 0,
    results: [],
    errors: [],
    createdAt: Date.now(),
    retryCount: 0,
    maxRetries
  };

  queueManager.jobs.set(jobId, job);
  
  // Insert job based on priority
  if (priority === 'urgent') {
    queueManager.pendingJobs.unshift(jobId);
  } else if (priority === 'high') {
    const insertIndex = queueManager.pendingJobs.findIndex(id => {
      const existingJob = queueManager.jobs.get(id);
      return existingJob?.priority !== 'urgent';
    });
    queueManager.pendingJobs.splice(insertIndex === -1 ? 0 : insertIndex, 0, jobId);
  } else {
    queueManager.pendingJobs.push(jobId);
  }

  // Trigger processing
  processNextJobs();

  return new Response(JSON.stringify({ 
    jobId, 
    position: queueManager.pendingJobs.indexOf(jobId) + 1,
    estimatedWait: calculateEstimatedWait(jobId)
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleStatusCheck(req: Request) {
  const url = new URL(req.url);
  const jobId = url.searchParams.get('jobId');
  
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Job ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const job = queueManager.jobs.get(jobId);
  if (!job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify(job), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleQueueStats() {
  const stats = {
    totalJobs: queueManager.jobs.size,
    activeJobs: queueManager.activeJobs.size,
    pendingJobs: queueManager.pendingJobs.length,
    completedJobs: Array.from(queueManager.jobs.values()).filter(j => j.status === 'completed').length,
    failedJobs: Array.from(queueManager.jobs.values()).filter(j => j.status === 'failed').length,
    averageProcessingTime: calculateAverageProcessingTime(),
    currentApiCallRate: apiCallTracker.getCurrentMinuteCallCount(),
    maxConcurrentJobs: queueManager.maxConcurrentJobs
  };

  return new Response(JSON.stringify(stats), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleProcessNext() {
  await processNextJobs();
  return new Response(JSON.stringify({ message: 'Processing triggered' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function processNextJobs() {
  while (
    queueManager.activeJobs.size < queueManager.maxConcurrentJobs &&
    queueManager.pendingJobs.length > 0 &&
    apiCallTracker.getCurrentMinuteCallCount() < queueManager.processingRateLimits.maxApiCallsPerMinute
  ) {
    const jobId = queueManager.pendingJobs.shift();
    if (!jobId) break;

    const job = queueManager.jobs.get(jobId);
    if (!job) continue;

    queueManager.activeJobs.add(jobId);
    job.status = 'processing';
    job.startedAt = Date.now();

    // Process job in background
    processJob(job).catch(error => {
      console.error(`Job ${jobId} failed:`, error);
      job.status = 'failed';
      job.errors.push(error.message);
    }).finally(() => {
      queueManager.activeJobs.delete(jobId);
      if (job.status === 'processing') {
        job.status = 'completed';
      }
      job.completedAt = Date.now();
      
      // Continue processing next jobs
      setTimeout(processNextJobs, queueManager.processingRateLimits.delayBetweenBatches);
    });
  }
}

async function processJob(job: BatchJob) {
  const totalFiles = job.files.length;
  const batchSize = queueManager.processingRateLimits.maxFilesPerBatch;
  
  for (let i = 0; i < totalFiles; i += batchSize) {
    const batch = job.files.slice(i, i + batchSize);
    
    // Check rate limits before processing
    if (apiCallTracker.getCurrentMinuteCallCount() >= queueManager.processingRateLimits.maxApiCallsPerMinute) {
      console.log('Rate limit reached, waiting...');
      await new Promise(resolve => setTimeout(resolve, 60000)); // Wait 1 minute
    }

    try {
      const batchResults = await processBatchWithRetry(batch, job.retryCount);
      job.results.push(...batchResults);
      
      // Update progress
      job.progress = Math.min(((i + batch.length) / totalFiles) * 100, 100);
      job.estimatedTimeRemaining = calculateRemainingTime(job, i + batch.length, totalFiles);
      
      // Record API calls
      apiCallTracker.recordCall();
      
    } catch (error) {
      console.error(`Batch processing failed:`, error);
      job.errors.push(`Batch ${Math.floor(i/batchSize) + 1}: ${error.message}`);
      
      // Retry logic
      if (job.retryCount < job.maxRetries) {
        job.retryCount++;
        console.log(`Retrying job ${job.id}, attempt ${job.retryCount}`);
        await new Promise(resolve => setTimeout(resolve, job.retryCount * 5000)); // Exponential backoff
      }
    }

    // Delay between batches to prevent overloading
    if (i + batchSize < totalFiles) {
      await new Promise(resolve => setTimeout(resolve, queueManager.processingRateLimits.delayBetweenBatches));
    }
  }
}

async function processBatchWithRetry(files: any[], retryCount: number): Promise<any[]> {
  try {
    // Call the existing extract-text-batch function
    const response = await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/extract-text-batch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${Deno.env.get('SUPABASE_ANON_KEY')}`
      },
      body: JSON.stringify({ files })
    });

    if (!response.ok) {
      throw new Error(`Batch processing failed: ${response.status}`);
    }

    const result = await response.json();
    return result.results || [];
  } catch (error) {
    if (retryCount < 3) {
      await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000));
      return processBatchWithRetry(files, retryCount + 1);
    }
    throw error;
  }
}

function calculateEstimatedWait(jobId: string): number {
  const position = queueManager.pendingJobs.indexOf(jobId);
  const avgProcessingTime = calculateAverageProcessingTime();
  const activeJobsEta = queueManager.activeJobs.size * avgProcessingTime;
  const queuedJobsEta = position * avgProcessingTime;
  
  return Math.round((activeJobsEta + queuedJobsEta) / 1000); // seconds
}

function calculateAverageProcessingTime(): number {
  const completedJobs = Array.from(queueManager.jobs.values())
    .filter(job => job.status === 'completed' && job.startedAt && job.completedAt);
  
  if (completedJobs.length === 0) return 30000; // 30 seconds default
  
  const totalTime = completedJobs.reduce((sum, job) => 
    sum + (job.completedAt! - job.startedAt!), 0);
  
  return totalTime / completedJobs.length;
}

function calculateRemainingTime(job: BatchJob, processedFiles: number, totalFiles: number): number {
  if (!job.startedAt || processedFiles === 0) return 0;
  
  const elapsed = Date.now() - job.startedAt;
  const avgTimePerFile = elapsed / processedFiles;
  const remainingFiles = totalFiles - processedFiles;
  
  return Math.round((avgTimePerFile * remainingFiles) / 1000); // seconds
}

