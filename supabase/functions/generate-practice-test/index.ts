
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
    console.log('Generate-practice-test function called')
    const { studentName, className, skillName } = await req.json()
    console.log('Generating practice test for:', studentName, 'in class:', className, 'skill:', skillName)
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    const prompt = skillName 
      ? `Generate a practice test for a student in ${className} focusing specifically on ${skillName}. Create 8-10 questions that test understanding of this skill at an appropriate difficulty level.`
      : `Generate a comprehensive practice test for a student in ${className} covering all major content areas. Create 10-12 questions that assess various skills and concepts.`

    console.log('Sending request to OpenAI...')
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
            content: `You are an expert educator creating practice tests. Generate a JSON response with the following structure:
            {
              "title": "string",
              "description": "string", 
              "questions": [
                {
                  "id": "string",
                  "type": "multiple-choice|true-false|short-answer",
                  "question": "string",
                  "options": ["string"] (only for multiple-choice),
                  "correctAnswer": "string",
                  "points": number
                }
              ],
              "totalPoints": number,
              "estimatedTime": number (in minutes)
            }
            
            Make questions challenging but appropriate for the grade level. Use a mix of question types. For multiple choice, provide 4 options with only one correct answer.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`)
    }

    const result = await response.json()
    console.log('OpenAI practice test generation completed')
    const generatedContent = result.choices[0]?.message?.content || "{}"
    
    // Try to parse as JSON, fallback to error response
    let parsedTest
    try {
      parsedTest = JSON.parse(generatedContent)
      console.log('Successfully parsed practice test with', parsedTest.questions?.length || 0, 'questions')
    } catch {
      throw new Error('Failed to parse generated test content')
    }

    return new Response(
      JSON.stringify(parsedTest),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in generate-practice-test function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
