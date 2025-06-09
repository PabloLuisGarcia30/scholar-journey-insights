
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

    const cacheEvent = await req.json();

    // Log cache event to validation_logs table (reusing existing table)
    const { error } = await supabaseClient
      .from('validation_logs')
      .insert({
        operation_type: 'cache_event',
        validation_type: cacheEvent.event_type,
        success: cacheEvent.event_type === 'hit' || cacheEvent.event_type === 'store',
        processing_time_ms: cacheEvent.processing_time_ms,
        error_message: cacheEvent.event_type === 'miss' ? 'Cache miss' : null,
        user_context: {
          cache_key: cacheEvent.cache_key,
          skill_tags: cacheEvent.skill_tags,
          response_type: cacheEvent.response_type,
          exam_id: cacheEvent.exam_id,
          question_number: cacheEvent.question_number,
          cost_saving_estimate: cacheEvent.cost_saving_estimate
        }
      });

    if (error) {
      console.error('Error logging cache event:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in log-cache-event:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
