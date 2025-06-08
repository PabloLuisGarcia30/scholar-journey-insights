
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

    // Get total cached questions (non-expired)
    const { count: totalCached } = await supabaseClient
      .from('question_cache')
      .select('*', { count: 'exact', head: true })
      .gt('expires_at', new Date().toISOString());

    // Get cache hit statistics
    const { data: cacheData } = await supabaseClient
      .from('question_cache')
      .select('access_count, result, exam_id')
      .gt('expires_at', new Date().toISOString());

    // Calculate statistics
    let distilBertCached = 0;
    let openAICached = 0;
    let totalAccessCount = 0;
    const examStats: { [examId: string]: { questionCount: number; hitRate: number } } = {};

    if (cacheData) {
      for (const entry of cacheData) {
        totalAccessCount += entry.access_count;
        
        // Check grading method from cached result
        const gradingMethod = entry.result?.gradingMethod || '';
        if (gradingMethod.includes('distilbert')) {
          distilBertCached++;
        } else if (gradingMethod.includes('openai')) {
          openAICached++;
        }

        // Track exam-level stats
        if (!examStats[entry.exam_id]) {
          examStats[entry.exam_id] = { questionCount: 0, hitRate: 0 };
        }
        examStats[entry.exam_id].questionCount++;
        examStats[entry.exam_id].hitRate += entry.access_count;
      }
    }

    // Calculate hit rate and cost savings
    const totalQuestions = totalCached || 0;
    const hitRate = totalQuestions > 0 ? totalAccessCount / totalQuestions : 0;
    const costSavings = openAICached * 0.01; // Estimate $0.01 per OpenAI question

    // Get top cached exams
    const topCachedExams = Object.entries(examStats)
      .map(([examId, stats]) => ({
        examId,
        questionCount: stats.questionCount,
        hitRate: stats.hitRate / stats.questionCount
      }))
      .sort((a, b) => b.questionCount - a.questionCount)
      .slice(0, 10);

    const stats = {
      totalCachedQuestions: totalQuestions,
      hitRate: hitRate,
      costSavings: costSavings,
      distilBertCached: distilBertCached,
      openAICached: openAICached,
      topCachedExams: topCachedExams
    };

    return new Response(
      JSON.stringify(stats),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-question-cache-stats:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
