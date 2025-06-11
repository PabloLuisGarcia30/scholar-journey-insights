
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const {
      questionContext,
      studentAnswer,
      correctAnswer,
      skillTargeted,
      subject,
      grade
    } = await req.json();

    console.log('🧠 Detecting missed concept for skill:', skillTargeted);

    // Step 1: Get GPT analysis with enhanced prompt
    const gptAnalysis = await getGPTConceptAnalysis(
      questionContext,
      studentAnswer,
      correctAnswer,
      skillTargeted,
      openAIApiKey
    );

    if (!gptAnalysis) {
      return new Response(
        JSON.stringify({
          concept_missed_id: null,
          concept_missed_description: 'Unable to determine missed concept',
          matching_confidence: 0
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 2: Try to match concept to existing concept_index
    const matchResult = await matchOrCreateConcept(
      gptAnalysis.concept_missed,
      gptAnalysis.concept_id,
      subject,
      grade,
      skillTargeted,
      supabase
    );

    console.log('✅ Concept detection completed:', matchResult);

    return new Response(
      JSON.stringify(matchResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('❌ Error in detect-missed-concept:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function getGPTConceptAnalysis(
  questionContext: string,
  studentAnswer: string,
  correctAnswer: string,
  skillTargeted: string,
  openAIApiKey: string
): Promise<{ concept_missed: string; concept_id: string | null } | null> {
  try {
    const prompt = `You are an expert educational diagnostician and learning architect.

Your job is to:
1. Analyze a student's incorrect answer and the associated mistake pattern.
2. Identify the specific concept the student is misunderstanding.
3. Attempt to match it to an existing concept from the platform's concept index.
4. If no match exists, generate a **new concept** using no more than 5 clear words that describe the specific skill or knowledge gap.

This helps grow the system's internal concept taxonomy.

**Instructions:**
- Use precise, discipline-specific language.
- The concept should represent a teachable idea, not a general category.
- Avoid vague or overly broad phrases like "math error" or "writing skills."

**Examples:**
- "Combining like terms" → concept_id: "uuid-123"
- "Identifying strong topic sentence" → concept_id: "uuid-456"
- "Reasoning in science hypotheses" → new concept generated → concept_id: null

**Context:**
Question: ${questionContext}
Skill Being Tested: ${skillTargeted}
Student Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"

**Output format (JSON only):**
{
  "concept_missed": "Specific concept in 5 words or less",
  "concept_id": null
}`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational diagnostician. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      console.error('OpenAI API call failed:', response.status);
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return null;
    }

    const result = JSON.parse(content);
    
    if (result.concept_missed && result.concept_missed.length > 0) {
      console.log('✅ GPT concept analysis:', result.concept_missed);
      return result;
    }
    
    return null;
  } catch (error) {
    console.error('❌ Error in GPT concept analysis:', error);
    return null;
  }
}

async function matchOrCreateConcept(
  conceptMissed: string,
  conceptId: string | null,
  subject: string = 'Unknown',
  grade: string = 'Unknown',
  skillTargeted: string,
  supabase: any
): Promise<{
  concept_missed_id: string | null;
  concept_missed_description: string;
  matching_confidence: number;
  is_new_concept: boolean;
}> {
  try {
    // If GPT provided a concept_id, try to find it first
    if (conceptId) {
      const { data: existingConcept } = await supabase
        .from('concept_index')
        .select('id')
        .eq('id', conceptId)
        .single();
      
      if (existingConcept) {
        return {
          concept_missed_id: conceptId,
          concept_missed_description: conceptMissed,
          matching_confidence: 1.0,
          is_new_concept: false
        };
      }
    }

    // Try to find similar concepts by name
    const { data: similarConcepts } = await supabase
      .from('concept_index')
      .select('id, concept_name')
      .ilike('concept_name', `%${conceptMissed}%`)
      .limit(5);

    // Check for exact or very close matches
    if (similarConcepts && similarConcepts.length > 0) {
      for (const concept of similarConcepts) {
        const similarity = calculateSimpleSimilarity(conceptMissed, concept.concept_name);
        if (similarity > 0.8) {
          return {
            concept_missed_id: concept.id,
            concept_missed_description: conceptMissed,
            matching_confidence: similarity,
            is_new_concept: false
          };
        }
      }
    }

    // Create new concept if no good match found
    const { data: newConcept, error } = await supabase
      .from('concept_index')
      .insert({
        concept_name: conceptMissed,
        subject: subject,
        grade: grade,
        description: `Auto-generated concept from student mistake analysis`,
        keywords: [conceptMissed.toLowerCase(), skillTargeted.toLowerCase()],
        related_skills: [skillTargeted],
        usage_count: 1
      })
      .select('id')
      .single();

    if (error) {
      console.error('Error creating new concept:', error);
      return {
        concept_missed_id: null,
        concept_missed_description: conceptMissed,
        matching_confidence: 0,
        is_new_concept: false
      };
    }

    console.log(`🆕 Created new concept: "${conceptMissed}" with ID: ${newConcept.id}`);

    return {
      concept_missed_id: newConcept.id,
      concept_missed_description: conceptMissed,
      matching_confidence: 1.0,
      is_new_concept: true
    };

  } catch (error) {
    console.error('❌ Error in matchOrCreateConcept:', error);
    return {
      concept_missed_id: null,
      concept_missed_description: conceptMissed,
      matching_confidence: 0,
      is_new_concept: false
    };
  }
}

function calculateSimpleSimilarity(str1: string, str2: string): number {
  const words1 = str1.toLowerCase().split(' ').filter(w => w.length > 2);
  const words2 = str2.toLowerCase().split(' ').filter(w => w.length > 2);
  
  if (words1.length === 0 || words2.length === 0) return 0;
  
  const commonWords = words1.filter(word => words2.includes(word)).length;
  const totalUniqueWords = new Set([...words1, ...words2]).size;
  
  return commonWords / totalUniqueWords;
}
