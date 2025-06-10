
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { studentName, className, weakestSkill, skillScore, grade, subject } = await req.json()
    console.log('Generating practice recommendation for:', studentName, 'weakest skill:', weakestSkill)
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const prompt = `Generate a specific, actionable practice exercise recommendation for a ${grade} ${subject} student named ${studentName} in ${className}.

Student's weakest content skill: ${weakestSkill}
Current skill score: ${(skillScore * 100).toFixed(1)}%

Please provide:
1. A specific practice exercise or activity to improve this skill
2. Clear instructions on how to complete it
3. Expected time commitment
4. How this will help improve their understanding

Keep the recommendation concise (2-3 sentences), practical, and age-appropriate for ${grade} level. Focus on actionable steps the student can take.`

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educator who creates personalized practice recommendations for students based on their learning needs. Provide specific, actionable advice that helps students improve their weakest skills.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 200,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error:', errorText)
      throw new Error(`OpenAI API error: ${response.status}`)
    }

    const result = await response.json()
    const recommendation = result.choices[0]?.message?.content || 'Unable to generate recommendation'

    console.log('Generated recommendation for', studentName)
    
    return new Response(
      JSON.stringify({ recommendation }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-practice-recommendation function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
