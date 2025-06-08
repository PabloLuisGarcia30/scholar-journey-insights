
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
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
      studentAnswer, 
      correctAnswer, 
      result, 
      cachedAt, 
      expiresAt 
    } = await req.json();

    if (!cacheKey || !examId || !result) {
      return new Response(
        JSON.stringify({ error: 'Cache key, exam ID, and result are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Insert or update cache entry
    const { data, error } = await supabaseClient
      .from('question_cache')
      .upsert({
        cache_key: cacheKey,
        exam_id: examId,
        question_number: questionNumber,
        student_answer: studentAnswer || '',
        correct_answer: correctAnswer || '',
        result: result,
        cached_at: cachedAt || new Date().toISOString(),
        expires_at: expiresAt || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days
        access_count: 1,
        last_accessed_at: new Date().toISOString(),
        cache_version: 'v1.0'
      }, {
        onConflict: 'cache_key'
      })
      .select()
      .single();

    if (error) {
      console.error('Error caching question result:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Question result cached: ${cacheKey} for exam ${examId} Q${questionNumber}`);

    return new Response(
      JSON.stringify({ success: true, cached: data }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in set-question-cache:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
