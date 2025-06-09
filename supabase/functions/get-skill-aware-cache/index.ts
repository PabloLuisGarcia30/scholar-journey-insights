
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const { cacheKey, skillTags, examId, questionNumber } = await req.json();

    if (!cacheKey) {
      return new Response(
        JSON.stringify({ error: 'Cache key is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get cached result with skill tag awareness
    const { data: cacheEntry, error } = await supabaseClient
      .from('question_cache')
      .select('*')
      .eq('cache_key', cacheKey)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (error) {
      console.log('Skill-aware cache miss for key:', cacheKey);
      return new Response(
        JSON.stringify({ result: null }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update access tracking
    await supabaseClient
      .from('question_cache')
      .update({ 
        access_count: cacheEntry.access_count + 1,
        last_accessed_at: new Date().toISOString()
      })
      .eq('id', cacheEntry.id);

    // Calculate estimated cost saving based on response type
    let estimatedCostSaving = 0.002; // Default OpenAI call cost
    if (cacheEntry.result?.originalMethod?.includes('distilbert')) {
      estimatedCostSaving = 0.001;
    } else if (cacheEntry.result?.originalMethod?.includes('openai')) {
      estimatedCostSaving = 0.005;
    }

    console.log(`Skill-aware cache hit for key: ${cacheKey}, skills: ${skillTags?.join(', ') || 'none'}`);

    return new Response(
      JSON.stringify({
        result: cacheEntry.result,
        cachedAt: cacheEntry.cached_at,
        accessCount: cacheEntry.access_count + 1,
        skillTags: skillTags || [],
        estimatedCostSaving
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-skill-aware-cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
