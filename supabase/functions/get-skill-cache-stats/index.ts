
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

    // Get skill-aware cache statistics
    const { data: skillCacheEntries, error } = await supabaseClient
      .from('question_cache')
      .select('*')
      .like('cache_version', '%skill_aware%')
      .gt('expires_at', new Date().toISOString());

    if (error) {
      console.error('Error fetching skill cache stats:', error);
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Analyze skill performance
    const skillStats: Record<string, { total: number; hits: number; costSavings: number }> = {};
    const skillCombinations: Record<string, { count: number; avgAccess: number }> = {};
    
    let totalCostSavings = 0;
    let totalEntries = skillCacheEntries?.length || 0;

    skillCacheEntries?.forEach(entry => {
      const result = entry.result || {};
      const skillTags = result.skillTags || [];
      const originalMethod = result.originalMethod || 'unknown';
      
      // Calculate cost savings
      let costSaving = 0.002; // Default
      if (originalMethod.includes('openai')) costSaving = 0.005;
      else if (originalMethod.includes('distilbert')) costSaving = 0.001;
      
      totalCostSavings += costSaving * entry.access_count;
      
      // Track individual skills
      skillTags.forEach((skill: string) => {
        if (!skillStats[skill]) {
          skillStats[skill] = { total: 0, hits: 0, costSavings: 0 };
        }
        skillStats[skill].total += 1;
        skillStats[skill].hits += entry.access_count;
        skillStats[skill].costSavings += costSaving * entry.access_count;
      });
      
      // Track skill combinations
      if (skillTags.length > 1) {
        const combo = skillTags.sort().join('|');
        if (!skillCombinations[combo]) {
          skillCombinations[combo] = { count: 0, avgAccess: 0 };
        }
        skillCombinations[combo].count += 1;
        skillCombinations[combo].avgAccess += entry.access_count;
      }
    });

    // Calculate final statistics
    const topSkillCombinations = Object.entries(skillCombinations)
      .map(([combo, stats]) => ({
        skillCombination: combo.split('|'),
        hitCount: stats.count,
        hitRate: stats.count > 0 ? stats.avgAccess / stats.count : 0
      }))
      .sort((a, b) => b.hitCount - a.hitCount)
      .slice(0, 10);

    const result = {
      totalBySkill: Object.fromEntries(
        Object.entries(skillStats).map(([skill, stats]) => [skill, stats.total])
      ),
      hitRateBySkill: Object.fromEntries(
        Object.entries(skillStats).map(([skill, stats]) => [
          skill, 
          stats.total > 0 ? stats.hits / stats.total : 0
        ])
      ),
      costSavingsBySkill: Object.fromEntries(
        Object.entries(skillStats).map(([skill, stats]) => [skill, stats.costSavings])
      ),
      topSkillCombinations,
      summary: {
        totalSkillAwareEntries: totalEntries,
        totalCostSavings,
        uniqueSkills: Object.keys(skillStats).length,
        avgHitRate: totalEntries > 0 ? 
          Object.values(skillStats).reduce((sum, stats) => sum + (stats.hits / stats.total), 0) / Object.keys(skillStats).length : 0
      }
    };

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in get-skill-cache-stats:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
