
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

    const { 
      cacheKey, 
      examId, 
      questionNumber, 
      skillTags,
      responseType,
      result, 
      cachedAt, 
      expiresAt,
      originalMethod
    } = await req.json();

    if (!cacheKey || !examId || !result) {
      return new Response(
        JSON.stringify({ error: 'Cache key, exam ID, and result are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create skill tags string for storage
    const skillTagsString = Array.isArray(skillTags) ? skillTags.join(',') : '';

    // Insert or update cache entry with skill awareness
    const { data, error } = await supabaseClient
      .from('question_cache')
      .upsert({
        cache_key: cacheKey,
        exam_id: examId,
        question_number: questionNumber,
        student_answer: `skill_aware:${skillTagsString}`,
        correct_answer: responseType || 'grading',
        result: {
          ...result,
          skillTags: skillTags || [],
          responseType: responseType || 'grading',
          originalMethod: originalMethod || 'unknown'
        },
        cached_at: cachedAt || new Date().toISOString(),
        expires_at: expiresAt || new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        access_count: 1,
        last_accessed_at: new Date().toISOString(),
        cache_version: 'v1.1_skill_aware'
      }, {
        onConflict: 'cache_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Error caching skill-aware result:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Skill-aware result cached: ${cacheKey} for exam ${examId} Q${questionNumber} with skills: ${skillTagsString}`);

    return new Response(
      JSON.stringify({ success: true, cached: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in set-skill-aware-cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
