
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
    console.log('Analyze-test function called')
    const { files, examId } = await req.json()
    console.log('Processing exam ID:', examId, 'with', files.length, 'files')
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    // Combine all extracted text
    const combinedText = files.map((file: any) => 
      `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
    ).join('\n\n---\n\n')

    console.log('Sending to OpenAI for analysis...')
    // Send to OpenAI for analysis
    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant. Analyze the OCR-extracted text from test documents. Match this with exam ID: ${examId} to find the corresponding answer key. Grade the test and provide detailed feedback. Return your response in this JSON format:
          {
            "grade": "percentage or letter grade",
            "feedback": "brief summary feedback",
            "analysis": "detailed analysis with question-by-question breakdown"
          }`
        },
        {
          role: "user",
          content: `Please analyze this OCR-extracted test content for Exam ID: ${examId}. Extract all student answers and grade them against the stored answer key. Provide a detailed grade report.\n\nOCR Content:\n${combinedText}`
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
