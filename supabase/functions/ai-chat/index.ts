
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

    // Process individual skill scores for detailed analysis
    const contentSkillDetails = studentContext.contentSkillScores.map(skill => ({
      name: skill.skill_name,
      score: skill.score,
      pointsEarned: skill.points_earned,
      pointsPossible: skill.points_possible
    }));

    const subjectSkillDetails = studentContext.subjectSkillScores.map(skill => ({
      name: skill.skill_name,
      score: skill.score,
      pointsEarned: skill.points_earned,
      pointsPossible: skill.points_possible
    }));

    // Identify low-scoring skills (below 80%)
    const lowContentSkills = contentSkillDetails.filter(skill => skill.score < 80);
    const lowSubjectSkills = subjectSkillDetails.filter(skill => skill.score < 80);

    // Group skills by topics for better context
    const skillsByTopic = Object.entries(studentContext.groupedSkills).map(([topic, skills]) => ({
      topic,
      skills: skills.map(skill => ({
        name: skill.skill_name,
        score: skill.score,
        status: skill.score >= 80 ? 'Proficient' : skill.score >= 60 ? 'Developing' : 'Needs Practice'
      }))
    }));

    // Create a comprehensive system prompt with detailed skill analysis
    const systemPrompt = `You are an AI learning assistant helping ${studentContext.studentName} in their ${studentContext.classSubject} class (${studentContext.classGrade}). 

    Student Context:
    - Class: ${studentContext.className} (${studentContext.classSubject} - ${studentContext.classGrade})
    - Teacher: ${studentContext.teacher}
    
    DETAILED SKILL ANALYSIS:
    
    Content Skills (Individual Scores):
    ${contentSkillDetails.map(skill => `- ${skill.name}: ${skill.score}% (${skill.pointsEarned}/${skill.pointsPossible} points)`).join('\n')}
    
    Subject Skills (Individual Scores):
    ${subjectSkillDetails.map(skill => `- ${skill.name}: ${skill.score}% (${skill.pointsEarned}/${skill.pointsPossible} points)`).join('\n')}
    
    SKILLS BY TOPIC:
    ${skillsByTopic.map(topic => 
      `${topic.topic}:\n${topic.skills.map(skill => `  - ${skill.name}: ${skill.score}% (${skill.status})`).join('\n')}`
    ).join('\n\n')}
    
    LOW-SCORING AREAS (Below 80%):
    Content Skills Needing Improvement:
    ${lowContentSkills.length > 0 ? lowContentSkills.map(skill => `- ${skill.name}: ${skill.score}%`).join('\n') : '- All content skills are at 80% or above!'}
    
    Subject Skills Needing Improvement:
    ${lowSubjectSkills.length > 0 ? lowSubjectSkills.map(skill => `- ${skill.name}: ${skill.score}%`).join('\n') : '- All subject skills are at 80% or above!'}
    
    Test Performance:
    ${studentContext.testResults.length > 0 ? 
      `- ${studentContext.testResults.length} tests completed
      - Average score: ${Math.round(studentContext.testResults.reduce((sum, test) => sum + test.overall_score, 0) / studentContext.testResults.length)}%
      - Latest test: ${Math.round(studentContext.testResults[0]?.overall_score || 0)}%` : 
      '- No test results yet'
    }
    
    Your role:
    - Be encouraging, supportive, and motivational
    - When asked about low scores or areas to improve, specifically reference the skills listed above under "LOW-SCORING AREAS"
    - Provide specific, actionable study advice based on actual skill scores
    - Help analyze their progress and identify improvement areas using the detailed data provided
    - Answer questions about their performance data with specific numbers and skill names
    - Suggest learning strategies appropriate for ${studentContext.classGrade} ${studentContext.classSubject}
    - Focus on the lowest-scoring skills when giving improvement advice
    - Keep responses conversational but educational
    - Always relate advice back to their actual performance data when possible
    
    ANALYSIS INSTRUCTIONS:
    - Skills below 60% need immediate practice and attention
    - Skills 60-79% are developing and need focused improvement
    - Skills 80%+ are proficient but can still be refined
    - When identifying weak areas, list specific skill names and their scores
    - Prioritize improvement suggestions based on actual score data
    
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
        max_tokens: 400,
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
