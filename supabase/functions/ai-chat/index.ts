
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

    // Combine all skills for practice recommendations
    const allSkills = [...contentSkillDetails, ...subjectSkillDetails];
    const prioritySkills = allSkills.filter(skill => skill.score < 70).slice(0, 3);
    const reviewSkills = allSkills.filter(skill => skill.score >= 70 && skill.score < 85).slice(0, 2);
    const challengeSkills = allSkills.filter(skill => skill.score >= 85).slice(0, 2);

    // Check if this is a practice-related question
    const practiceKeywords = [
      'what should i work on', 'what to practice', 'what to study', 'what should i practice',
      'help me practice', 'create practice', 'generate practice', 'practice recommendations',
      'what to improve', 'areas to focus', 'skills to work on', 'study suggestions'
    ];
    
    const isPracticeQuestion = practiceKeywords.some(keyword => 
      message.toLowerCase().includes(keyword)
    );

    // Group skills by topics for better context
    const skillsByTopic = Object.entries(studentContext.groupedSkills).map(([topic, skills]) => ({
      topic,
      skills: skills.map(skill => ({
        name: skill.skill_name,
        score: skill.score,
        status: skill.score >= 80 ? 'Proficient' : skill.score >= 60 ? 'Developing' : 'Needs Practice'
      }))
    }));

    // Create a comprehensive system prompt with practice recommendations capability
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

    PRACTICE RECOMMENDATION SYSTEM:
    When students ask about what to practice, study, or work on, you should provide specific practice exercise recommendations using this special format:

    **PRACTICE_RECOMMENDATIONS**
    ${prioritySkills.length > 0 ? `
    PRIORITY (Needs immediate attention):
    ${prioritySkills.map(skill => `- ${skill.name}: ${skill.score}% | Difficulty: Review | Time: 15-20 min | Improvement: +15-20%`).join('\n')}` : ''}
    ${reviewSkills.length > 0 ? `
    REVIEW (Strengthen understanding):
    ${reviewSkills.map(skill => `- ${skill.name}: ${skill.score}% | Difficulty: Standard | Time: 10-15 min | Improvement: +10-15%`).join('\n')}` : ''}
    ${challengeSkills.length > 0 ? `
    CHALLENGE (Advanced practice):
    ${challengeSkills.map(skill => `- ${skill.name}: ${skill.score}% | Difficulty: Challenge | Time: 20-25 min | Improvement: +5-10%`).join('\n')}` : ''}
    **END_PRACTICE_RECOMMENDATIONS**

    Your role:
    - Be encouraging, supportive, and motivational
    - When asked about practice or what to work on, ALWAYS include the PRACTICE_RECOMMENDATIONS section
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
    
    Keep responses concise (2-3 sentences usually) unless they ask for detailed explanations or practice recommendations.`;

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
        max_tokens: 600,
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
