
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
    const { message, studentContext } = await req.json();

    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Create a comprehensive system prompt with student context
    const systemPrompt = `You are an AI learning assistant helping ${studentContext.studentName} in their ${studentContext.classSubject} class (${studentContext.classGrade}). 

    Student Context:
    - Class: ${studentContext.className} (${studentContext.classSubject} - ${studentContext.classGrade})
    - Teacher: ${studentContext.teacher}
    - Content Skills: ${studentContext.contentSkillScores.length} skills tracked
    - Subject Skills: ${studentContext.subjectSkillScores.length} skills tracked  
    - Test Results: ${studentContext.testResults.length} tests completed
    
    Performance Summary:
    ${studentContext.testResults.length > 0 ? 
      `- Average test score: ${Math.round(studentContext.testResults.reduce((sum, test) => sum + test.overall_score, 0) / studentContext.testResults.length)}%` : 
      '- No test results yet'
    }
    ${studentContext.contentSkillScores.length > 0 ? 
      `- Content skills average: ${Math.round(studentContext.contentSkillScores.reduce((sum, skill) => sum + skill.score, 0) / studentContext.contentSkillScores.length)}%` :
      '- No content skill data yet'
    }
    
    Your role:
    - Be encouraging, supportive, and motivational
    - Provide specific, actionable study advice
    - Help analyze their progress and identify improvement areas
    - Answer questions about their performance data
    - Suggest learning strategies appropriate for ${studentContext.classGrade} ${studentContext.classSubject}
    - Keep responses conversational but educational
    - Always relate advice back to their actual performance when possible
    
    Keep responses concise (2-3 sentences usually) unless they ask for detailed explanations.`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: message }
        ],
        temperature: 0.7,
        max_tokens: 300,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: 'Failed to get AI response. Please try again.' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
