
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- ENHANCED CONFIG ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_API_CALLS_PER_MINUTE = Number(Deno.env.get("API_RATE_LIMIT") || 50); // Increased for higher throughput
const MAX_CONCURRENT_JOBS = 12; // Increased from 8
const MAX_FILES_PER_BATCH = 12; // Increased from 6 - Phase 1 optimization
const JOB_CLEANUP_DAYS = 2; // completed/failed jobs deleted after this

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Enhanced file grouping for optimal batch processing
function groupFilesBySize(files: any[]): any[][] {
  // Sort files by estimated size (base64 length as proxy)
  const sortedFiles = [...files].sort((a, b) => {
    const sizeA = a.fileContent?.length || 1000;
    const sizeB = b.fileContent?.length || 1000;
    return sizeA - sizeB;
  });

  const groups: any[][] = [];
  let currentGroup: any[] = [];
  let currentGroupSize = 0;
  const maxGroupSize = 500000; // ~500KB total per group

  for (const file of sortedFiles) {
    const fileSize = file.fileContent?.length || 1000;
    
    if (currentGroup.length >= MAX_FILES_PER_BATCH || 
        (currentGroupSize + fileSize > maxGroupSize && currentGroup.length > 0)) {
      groups.push(currentGroup);
      currentGroup = [file];
      currentGroupSize = fileSize;
    } else {
      currentGroup.push(file);
      currentGroupSize += fileSize;
    }
  }

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  console.log(`Grouped ${files.length} files into ${groups.length} optimized batches`);
  return groups;
}

// --- RATE LIMIT STATE ---
const apiCallTracker = {
  calls: [] as number[],
  getCurrentMinuteCallCount: () => {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;
    apiCallTracker.calls = apiCallTracker.calls.filter((time) => time > oneMinuteAgo);
    return apiCallTracker.calls.length;
  },
  recordCall: () => {
    apiCallTracker.calls.push(Date.now());
  }
};

function nowIso() {
  return new Date().toISOString();
}

// --- MAIN SERVER ---
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  
  try {
    const url = new URL(req.url);
    const path = url.pathname;

    // CLEANUP OLD JOBS (once per request)
    await cleanupOldJobs();

    switch (path) {
      case '/submit':
        return await handleJobSubmission(req);
      case '/status':
        return await handleStatusCheck(url);
      case '/queue-stats':
        return await handleQueueStats();
      case '/process-next':
        return await handleProcessNext();
      default:
        return new Response(JSON.stringify({ error: 'Invalid endpoint' }), {
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
});

// --- ENDPOINT HANDLERS ---

async function handleJobSubmission(req: Request) {
  const { files, priority = 'normal', maxRetries = 3 } = await req.json();
  const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  const createdAt = nowIso();
  
  const job = {
    id: jobId,
    files,
    priority,
    status: 'pending',
    progress: 0,
    results: [],
    errors: [],
    created_at: createdAt,
    started_at: null,
    completed_at: null,
    retry_count: 0,
    max_retries: maxRetries
  };

  const { error } = await supabase.from('jobs').insert([job]);
  if (error) {
    throw new Error(`Failed to create job: ${error.message}`);
  }

  // Trigger processing
  processNextJobs().catch(console.error);

  // Enhanced queue position/ETA calculation
  const { count: pendingCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  const estimatedTimePerFile = 2; // seconds per file with optimizations
  const estimatedWait = Math.round((pendingCount || 0) * files.length * estimatedTimePerFile / MAX_CONCURRENT_JOBS);

  return new Response(JSON.stringify({
    jobId,
    position: pendingCount || 0,
    estimatedWait: estimatedWait,
    optimizationEnabled: true,
    maxConcurrentJobs: MAX_CONCURRENT_JOBS,
    maxFilesPerBatch: MAX_FILES_PER_BATCH
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleStatusCheck(url: URL) {
  const jobId = url.searchParams.get('jobId');
  if (!jobId) {
    return new Response(JSON.stringify({ error: 'Job ID required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  const { data: job, error } = await supabase
    .from('jobs')
    .select('*')
    .eq('id', jobId)
    .maybeSingle();

  if (error || !job) {
    return new Response(JSON.stringify({ error: 'Job not found' }), {
      status: 404,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  return new Response(JSON.stringify({
    ...job,
    optimizationStats: {
      batchOptimizationEnabled: true,
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      maxFilesPerBatch: MAX_FILES_PER_BATCH
    }
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

async function handleQueueStats() {
  try {
    // Aggregate queue info
    const [total, pending, active, completed, failed] = await Promise.all([
      supabase.from('jobs').select('id', { count: 'exact', head: true }),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'pending'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'processing'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'completed'),
      supabase.from('jobs').select('id', { count: 'exact', head: true }).eq('status', 'failed')
    ]);

    return new Response(JSON.stringify({
      totalJobs: total.count || 0,
      pendingJobs: pending.count || 0,
      activeJobs: active.count || 0,
      completedJobs: completed.count || 0,
      failedJobs: failed.count || 0,
      currentApiCallRate: apiCallTracker.getCurrentMinuteCallCount(),
      maxConcurrentJobs: MAX_CONCURRENT_JOBS,
      maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE,
      maxFilesPerBatch: MAX_FILES_PER_BATCH,
      optimizationLevel: "Phase 1 - Safe Optimization",
      throughputImprovement: "3-4x expected"
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Failed to get queue stats:', error);
    return new Response(JSON.stringify({ error: 'Failed to get queue stats' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

async function handleProcessNext() {
  await processNextJobs();
  return new Response(JSON.stringify({ 
    message: 'Processing triggered',
    optimizationEnabled: true
  }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });
}

// --- CORE JOB PROCESSING ---

async function processNextJobs() {
  try {
    // Count currently active jobs
    const { data: activeJobs } = await supabase
      .from('jobs')
      .select('id')
      .eq('status', 'processing');

    const activeCount = activeJobs?.length || 0;
    
    if (activeCount >= MAX_CONCURRENT_JOBS) {
      console.log(`Max concurrent jobs reached: ${activeCount}/${MAX_CONCURRENT_JOBS}`);
      return;
    }
    
    if (apiCallTracker.getCurrentMinuteCallCount() >= MAX_API_CALLS_PER_MINUTE) {
      console.log('Rate limit reached');
      return;
    }

    // Find next pending jobs (priority order)
    const { data: nextJobs } = await supabase
      .from('jobs')
      .select('*')
      .eq('status', 'pending')
      .order('priority', { ascending: false })
      .order('created_at')
      .limit(MAX_CONCURRENT_JOBS - activeCount);

    if (!nextJobs?.length) {
      console.log('No pending jobs found');
      return;
    }

    console.log(`Processing ${nextJobs.length} jobs with enhanced optimization`);

    for (const job of nextJobs) {
      // Set job to processing
      const { error } = await supabase
        .from('jobs')
        .update({ 
          status: 'processing', 
          started_at: nowIso() 
        })
        .eq('id', job.id);

      if (error) {
        console.error(`Failed to update job ${job.id}:`, error);
        continue;
      }

      // Launch processing in background (no await)
      processJobWithOptimization(job).catch(async (error) => {
        console.error(`Job ${job.id} failed:`, error);
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed', 
            errors: [error.message], 
            completed_at: nowIso() 
          })
          .eq('id', job.id);
      });

      // Record API call
      apiCallTracker.recordCall();
    }
  } catch (error) {
    console.error('Error in processNextJobs:', error);
  }
}

async function processJobWithOptimization(job: any) {
  console.log(`Starting optimized job ${job.id} with ${job.files.length} files`);
  
  const totalFiles = job.files.length;
  let allResults: any[] = [];
  
  // Group files by size for optimal batching
  const fileGroups = groupFilesBySize(job.files);
  let processedFiles = 0;

  for (let groupIndex = 0; groupIndex < fileGroups.length; groupIndex++) {
    const group = fileGroups[groupIndex];
    
    // Rate limit enforcement
    while (apiCallTracker.getCurrentMinuteCallCount() >= MAX_API_CALLS_PER_MINUTE) {
      console.log(`Job ${job.id}: Waiting for rate limit...`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    let results: any[] = [];
    let retry = 0;

    while (retry <= job.max_retries) {
      try {
        console.log(`Job ${job.id}: Processing optimized group ${groupIndex + 1}/${fileGroups.length} (${group.length} files)`);
        
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract-text-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ files: group })
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Batch failed: ${resp.status} - ${errorText}`);
        }

        const json = await resp.json();
        results = json.results || [];
        
        console.log(`Job ${job.id}: Group ${groupIndex + 1} completed with ${results.length} results`);
        break; // Success, exit retry loop
        
      } catch (error) {
        retry++;
        console.error(`Job ${job.id}: Group attempt ${retry} failed:`, error);
        
        if (retry > job.max_retries) {
          throw new Error(`Group processing failed after ${job.max_retries} retries: ${error.message}`);
        }
        
        // Exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, retry - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    // Append results to accumulated results
    allResults = allResults.concat(results);
    processedFiles += group.length;
    
    // Update job progress in database
    const progress = Math.round((processedFiles / totalFiles) * 100);
    
    await supabase
      .from('jobs')
      .update({
        results: allResults,
        progress: progress
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} progress: ${progress}% (${processedFiles}/${totalFiles} files)`);
    
    // Record API call for this batch
    apiCallTracker.recordCall();

    // Small delay between batches to be nice to the system
    if (groupIndex + 1 < fileGroups.length) {
      await new Promise((resolve) => setTimeout(resolve, 300)); // Reduced delay for faster processing
    }
  }

  // Mark job complete
  console.log(`Completing optimized job ${job.id} with ${allResults.length} results`);
  
  await supabase
    .from('jobs')
    .update({ 
      status: 'completed', 
      completed_at: nowIso(), 
      progress: 100 
    })
    .eq('id', job.id);

  console.log(`Job ${job.id} completed successfully with optimization`);
}

async function cleanupOldJobs() {
  try {
    const cutoff = new Date(Date.now() - JOB_CLEANUP_DAYS * 86400000).toISOString();
    
    const { error } = await supabase
      .from('jobs')
      .delete()
      .lt('completed_at', cutoff)
      .or('status.eq.completed,status.eq.failed');

    if (error) {
      console.error('Failed to cleanup old jobs:', error);
    }
  } catch (error) {
    console.error('Error in cleanupOldJobs:', error);
  }
}
