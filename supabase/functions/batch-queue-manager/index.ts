
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};

// --- CONFIG ---
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_KEY = Deno.env.get("SUPABASE_ANON_KEY");
const MAX_API_CALLS_PER_MINUTE = Number(Deno.env.get("API_RATE_LIMIT") || 30); // Increased for better throughput
const MAX_CONCURRENT_JOBS = 8; // Increased from 5
const MAX_FILES_PER_BATCH = 6; // Increased from 4
const JOB_CLEANUP_DAYS = 2; // completed/failed jobs deleted after this

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

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

  // Queue position/ETA (simple estimate)
  const { count: pendingCount } = await supabase
    .from('jobs')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'pending');

  return new Response(JSON.stringify({
    jobId,
    position: pendingCount || 0,
    estimatedWait: (pendingCount || 0) * 30 // rough estimate, 30s/job
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

  return new Response(JSON.stringify(job), {
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
      maxApiCallsPerMinute: MAX_API_CALLS_PER_MINUTE
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
  return new Response(JSON.stringify({ message: 'Processing triggered' }), {
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
      console.log('Max concurrent jobs reached');
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

    console.log(`Processing ${nextJobs.length} jobs`);

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
      processJob(job).catch(async (error) => {
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

async function processJob(job: any) {
  console.log(`Starting job ${job.id} with ${job.files.length} files`);
  
  const totalFiles = job.files.length;
  let allResults: any[] = [];
  
  for (let i = 0; i < totalFiles; i += MAX_FILES_PER_BATCH) {
    // Rate limit enforcement
    while (apiCallTracker.getCurrentMinuteCallCount() >= MAX_API_CALLS_PER_MINUTE) {
      console.log('Waiting for rate limit...');
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const batch = job.files.slice(i, i + MAX_FILES_PER_BATCH);
    let results: any[] = [];
    let retry = 0;

    while (retry <= job.max_retries) {
      try {
        console.log(`Processing batch ${Math.floor(i/MAX_FILES_PER_BATCH) + 1} for job ${job.id}`);
        
        const resp = await fetch(`${SUPABASE_URL}/functions/v1/extract-text-batch`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${SUPABASE_KEY}`
          },
          body: JSON.stringify({ files: batch })
        });

        if (!resp.ok) {
          const errorText = await resp.text();
          throw new Error(`Batch failed: ${resp.status} - ${errorText}`);
        }

        const json = await resp.json();
        results = json.results || [];
        break; // Success, exit retry loop
        
      } catch (error) {
        retry++;
        console.error(`Batch attempt ${retry} failed for job ${job.id}:`, error);
        
        if (retry > job.max_retries) {
          throw new Error(`Batch processing failed after ${job.max_retries} retries: ${error.message}`);
        }
        
        // Exponential backoff
        const backoffTime = Math.min(1000 * Math.pow(2, retry - 1), 10000);
        await new Promise((resolve) => setTimeout(resolve, backoffTime));
      }
    }

    // Append results to accumulated results
    allResults = allResults.concat(results);
    
    // Update job progress in database
    const progress = Math.round(((i + batch.length) / totalFiles) * 100);
    
    await supabase
      .from('jobs')
      .update({
        results: allResults,
        progress: progress
      })
      .eq('id', job.id);

    console.log(`Job ${job.id} progress: ${progress}%`);
    
    // Record API call for this batch
    apiCallTracker.recordCall();

    // Small delay between batches to be nice to the system
    if (i + MAX_FILES_PER_BATCH < totalFiles) {
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }

  // Mark job complete
  console.log(`Completing job ${job.id}`);
  
  await supabase
    .from('jobs')
    .update({ 
      status: 'completed', 
      completed_at: nowIso(), 
      progress: 100 
    })
    .eq('id', job.id);

  console.log(`Job ${job.id} completed successfully`);
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
