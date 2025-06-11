
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

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
    const { question, correctAnswer, explanation, subject, grade, skillName } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    console.log('Generating detailed explanation for:', { question, skillName, subject, grade });

    const systemPrompt = `You are an expert teacher who explains concepts to 12-year-old students. Your goal is to make complex ideas simple, engaging, and easy to understand.

Instructions:
- Explain the concept as if talking to a 12-year-old student
- Use simple words, analogies, and examples from everyday life
- Make it engaging and interesting
- Write approximately 500 words
- Break down complex ideas into smaller, digestible parts
- Use encouraging and supportive language
- Include practical examples or real-world connections when possible
- Avoid jargon and technical terms, or explain them simply if necessary

The student is learning ${subject} in ${grade} and working on the skill: ${skillName}`;

    const userPrompt = `The student answered this question: "${question}"

The correct answer was: "${correctAnswer}"

The basic explanation given was: "${explanation}"

Please provide a detailed, engaging explanation of this concept that a 12-year-old would understand. Make it about 500 words and help them really grasp why this answer is correct and how this concept works in general.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 800,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const detailedExplanation = data.choices[0].message.content;

    console.log('Successfully generated detailed explanation');

    return new Response(JSON.stringify({ detailedExplanation }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in explain-concept function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to generate detailed explanation. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
