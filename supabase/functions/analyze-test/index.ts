
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Analyze-test function called')
    const { files, examId } = await req.json()
    console.log('Processing exam ID:', examId, 'with', files.length, 'files')
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing')
      throw new Error('Supabase configuration missing')
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch exam and answer key from database
    console.log('Fetching exam data for:', examId)
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle()

    if (examError) {
      console.error('Error fetching exam:', examError)
      throw new Error(`Failed to fetch exam: ${examError.message}`)
    }

    if (!examData) {
      console.error('No exam found with ID:', examId)
      throw new Error(`No exam found with ID: ${examId}. Please ensure the exam has been created and saved.`)
    }

    // Fetch answer keys
    const { data: answerKeys, error: answerError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number')

    if (answerError) {
      console.error('Error fetching answer keys:', answerError)
      throw new Error(`Failed to fetch answer keys: ${answerError.message}`)
    }

    if (!answerKeys || answerKeys.length === 0) {
      console.error('No answer keys found for exam:', examId)
      throw new Error(`No answer keys found for exam: ${examId}`)
    }

    console.log('Found exam:', examData.title, 'with', answerKeys.length, 'answer keys')

    // Combine all extracted text
    const combinedText = files.map((file: any) => 
      `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
    ).join('\n\n---\n\n')

    // Format answer key for AI analysis
    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    console.log('Sending to OpenAI for analysis...')
    // Send to OpenAI for analysis
    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant. You have been provided with the official answer key for exam "${examData.title}" (ID: ${examId}). Grade the student's responses by comparing them to the correct answers. Be fair but thorough in your evaluation.

For multiple choice and true/false questions, answers must match exactly.
For short answer questions, look for key concepts and allow reasonable variations in wording.
For essay questions, evaluate based on the key points and concepts mentioned in the answer key.

Return your response in this JSON format:
{
  "grade": "X/Y points (Z%)" or "letter grade",
  "feedback": "brief summary feedback for the student",
  "analysis": "detailed question-by-question breakdown with scores and explanations"
}`
        },
        {
          role: "user",
          content: `Please grade this student's test responses for "${examData.title}" (Exam ID: ${examId}).

OFFICIAL ANSWER KEY:
${answerKeyText}

STUDENT'S RESPONSES (OCR-extracted):
${combinedText}

Please provide a detailed grade report comparing the student's answers to the official answer key.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.1
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(aiPayload)
    })

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || aiResponse.statusText}`)
    }

    const result = await aiResponse.json()
    console.log('OpenAI analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    // Try to parse as JSON, fallback to plain text
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
    } catch {
      parsedAnalysis = {
        grade: "Analysis completed",
        feedback: "Please see detailed analysis below",
        analysis: analysisText
      }
    }

    return new Response(
      JSON.stringify(parsedAnalysis),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in analyze-test function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
