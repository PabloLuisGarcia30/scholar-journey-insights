
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Helper function to extract JSON from various response formats
function extractJSON(content: string): any {
  console.log('Raw OpenAI response content:', content)
  
  // Try to parse as direct JSON first
  try {
    return JSON.parse(content)
  } catch {
    // If that fails, try to extract JSON from markdown code blocks
    const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/)
    if (jsonMatch) {
      try {
        console.log('Found JSON in code block:', jsonMatch[1])
        return JSON.parse(jsonMatch[1])
      } catch (e) {
        console.error('Failed to parse JSON from code block:', e)
      }
    }
    
    // Try to find JSON object in the text (look for { ... })
    const objectMatch = content.match(/\{[\s\S]*\}/)
    if (objectMatch) {
      try {
        console.log('Found JSON object in text:', objectMatch[0])
        return JSON.parse(objectMatch[0])
      } catch (e) {
        console.error('Failed to parse JSON object from text:', e)
      }
    }
    
    // If all parsing attempts fail, throw an error
    throw new Error('No valid JSON found in response')
  }
}

// Helper function to validate the test structure
function validateTestStructure(data: any): boolean {
  if (!data || typeof data !== 'object') return false
  if (!data.title || typeof data.title !== 'string') return false
  if (!data.questions || !Array.isArray(data.questions)) return false
  if (data.questions.length === 0) return false
  
  // Validate each question has required fields
  for (const question of data.questions) {
    if (!question.id || !question.type || !question.question || typeof question.points !== 'number') {
      return false
    }
  }
  
  return true
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Generate-practice-test function called')
    const { studentName, className, skillName, grade, subject, questionCount } = await req.json()
    console.log('Generating practice test for:', studentName, 'in class:', className, 'skill:', skillName, 'grade:', grade, 'subject:', subject, 'questionCount:', questionCount)
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not found in environment variables')
      throw new Error('OpenAI API key not configured. Please add your OpenAI API key to Supabase secrets.')
    }

    if (openaiApiKey.length < 10) {
      console.error('OpenAI API key appears to be invalid (too short)')
      throw new Error('OpenAI API key appears to be invalid. Please check your API key.')
    }

    // Create more specific prompts based on grade and subject
    const gradeLevel = grade || 'Grade 10'
    const subjectArea = subject || 'Math'
    const numQuestions = questionCount || 10
    
    const prompt = skillName 
      ? `Generate a practice test for a ${gradeLevel} ${subjectArea} student focusing specifically on ${skillName}. Create exactly ${numQuestions} questions that test understanding of this skill at an appropriate ${gradeLevel} difficulty level. Use ${gradeLevel} ${subjectArea} curriculum standards and age-appropriate language and examples.`
      : `Generate a comprehensive practice test for a ${gradeLevel} ${subjectArea} student covering all major content areas appropriate for ${gradeLevel} ${subjectArea} curriculum. Create exactly ${numQuestions} questions that assess various skills and concepts at the ${gradeLevel} level. Use curriculum-appropriate vocabulary and examples suitable for ${gradeLevel} students.`

    console.log('Sending request to OpenAI with prompt:', prompt)
    console.log('Using API key starting with:', openaiApiKey.substring(0, 10) + '...')
    
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
            content: `You are an expert ${subjectArea} educator specializing in ${gradeLevel} curriculum. 

CRITICAL: You must respond with ONLY a valid JSON object. Do not include any markdown formatting, code blocks, or explanatory text. 

Generate a JSON response with exactly this structure:
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
  "estimatedTime": number
}
            
Make exactly ${numQuestions} questions that are challenging but appropriate for ${gradeLevel} level. Use vocabulary and examples suitable for ${gradeLevel} students. For ${subjectArea}, ensure content aligns with ${gradeLevel} ${subjectArea} curriculum standards. Use a mix of question types. For multiple choice, provide 4 options with only one correct answer.

RESPOND ONLY WITH THE JSON OBJECT - NO OTHER TEXT.`
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

    console.log('OpenAI response status:', response.status)
    console.log('OpenAI response headers:', Object.fromEntries(response.headers.entries()))

    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI API error response:', errorText)
      
      let errorData
      try {
        errorData = JSON.parse(errorText)
      } catch {
        errorData = { error: { message: errorText } }
      }
      
      if (response.status === 401) {
        throw new Error('Invalid OpenAI API key. Please check your API key and try again.')
      } else if (response.status === 429) {
        throw new Error('OpenAI API rate limit exceeded. Please try again in a moment.')
      } else {
        throw new Error(`OpenAI API error: ${errorData.error?.message || 'Unknown error'}`)
      }
    }

    const result = await response.json()
    console.log('OpenAI practice test generation completed successfully')
    const generatedContent = result.choices[0]?.message?.content || "{}"
    
    // Try to parse and validate the generated content
    let parsedTest
    try {
      parsedTest = extractJSON(generatedContent)
      console.log('Successfully extracted JSON from response')
      
      // Validate the structure
      if (!validateTestStructure(parsedTest)) {
        console.error('Invalid test structure:', parsedTest)
        throw new Error('Generated test does not have the required structure')
      }
      
      // Ensure required fields have defaults if missing
      if (!parsedTest.totalPoints) {
        parsedTest.totalPoints = parsedTest.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0)
      }
      if (!parsedTest.estimatedTime) {
        parsedTest.estimatedTime = Math.max(15, parsedTest.questions.length * 2)
      }
      
      console.log('Successfully parsed and validated practice test with', parsedTest.questions?.length || 0, 'questions')
    } catch (error) {
      console.error('Failed to parse or validate generated content:', error)
      console.error('Raw content was:', generatedContent)
      throw new Error(`Failed to parse generated test content: ${error.message}`)
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
