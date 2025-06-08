
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const {
      questionText,
      studentAnswer,
      correctAnswer,
      pointsPossible,
      questionNumber,
      studentName,
      skillContext
    } = await req.json();

    if (!questionText || !studentAnswer || !correctAnswer) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: questionText, studentAnswer, correctAnswer' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const prompt = `
You are an expert grading assistant for complex questions. Analyze the student's answer and provide detailed feedback.

Question: ${questionText}
Correct Answer: ${correctAnswer}
Student Answer: ${studentAnswer}
Points Possible: ${pointsPossible}
Student: ${studentName}
Skills Context: ${skillContext}

Please evaluate this answer and respond with a JSON object containing:
{
  "isCorrect": boolean,
  "pointsEarned": number (0 to ${pointsPossible}),
  "confidence": number (0.0 to 1.0),
  "reasoning": string (detailed explanation of grading decision),
  "complexityScore": number (0.0 to 1.0, how complex this question is),
  "reasoningDepth": string ("shallow", "medium", or "deep")
}

Consider partial credit for partially correct answers. Be thorough in your reasoning.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational grading assistant. Always respond with valid JSON matching the requested format.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 1000,
        response_format: { type: "json_object" }
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      return new Response(
        JSON.stringify({ error: 'OpenAI API request failed' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      return new Response(
        JSON.stringify({ error: 'No response from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let gradingResult;
    try {
      gradingResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      return new Response(
        JSON.stringify({ error: 'Invalid response format from OpenAI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate and sanitize the response
    const sanitizedResult = {
      isCorrect: Boolean(gradingResult.isCorrect),
      pointsEarned: Math.max(0, Math.min(pointsPossible, Number(gradingResult.pointsEarned) || 0)),
      confidence: Math.max(0, Math.min(1, Number(gradingResult.confidence) || 0.5)),
      reasoning: String(gradingResult.reasoning || 'OpenAI grading completed'),
      complexityScore: Math.max(0, Math.min(1, Number(gradingResult.complexityScore) || 0.5)),
      reasoningDepth: ['shallow', 'medium', 'deep'].includes(gradingResult.reasoningDepth) 
        ? gradingResult.reasoningDepth 
        : 'medium',
      usage: {
        promptTokens: data.usage?.prompt_tokens || 0,
        completionTokens: data.usage?.completion_tokens || 0,
        totalTokens: data.usage?.total_tokens || 0
      }
    };

    console.log(`✅ OpenAI graded Q${questionNumber}: ${sanitizedResult.pointsEarned}/${pointsPossible} points (${sanitizedResult.confidence} confidence)`);

    return new Response(
      JSON.stringify(sanitizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in grade-complex-question:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
