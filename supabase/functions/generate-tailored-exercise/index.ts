
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GenerateExerciseRequest {
  skill_name: string;
  skill_score: number;
  student_name: string;
  difficulty_level?: 'easy' | 'medium' | 'hard';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skill_name, skill_score, student_name, difficulty_level }: GenerateExerciseRequest = await req.json();

    // Determine difficulty based on student's current score
    let targetDifficulty = difficulty_level;
    if (!targetDifficulty) {
      if (skill_score < 60) {
        targetDifficulty = 'easy';
      } else if (skill_score < 80) {
        targetDifficulty = 'medium';
      } else {
        targetDifficulty = 'hard';
      }
    }

    const openAIResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${Deno.env.get('OPENAI_API_KEY')}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4',
        messages: [
          {
            role: 'system',
            content: `You are an educational AI that creates personalized practice exercises for students. Create engaging, interactive exercises that help students improve their skills.`
          },
          {
            role: 'user',
            content: `Create a ${targetDifficulty} level practice exercise for the skill "${skill_name}" for student ${student_name}. 
            The student currently has a score of ${skill_score}% in this skill.
            
            Return a JSON object with this structure:
            {
              "title": "Exercise title",
              "description": "Brief description of what the student will practice",
              "questions": [
                {
                  "id": 1,
                  "question": "Question text",
                  "type": "multiple_choice" | "short_answer" | "true_false",
                  "options": ["A", "B", "C", "D"] (only for multiple choice),
                  "correct_answer": "correct answer",
                  "explanation": "Why this is the correct answer",
                  "points": 10
                }
              ],
              "total_points": 100,
              "estimated_time_minutes": 15,
              "difficulty": "${targetDifficulty}",
              "skill_focus": "${skill_name}"
            }
            
            Include 5-8 questions that progressively build on the skill. Make it engaging and educational.`
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!openAIResponse.ok) {
      throw new Error(`OpenAI API error: ${openAIResponse.statusText}`);
    }

    const openAIData = await openAIResponse.json();
    const exerciseContent = openAIData.choices[0].message.content;

    // Parse the JSON response from OpenAI
    let exerciseData;
    try {
      exerciseData = JSON.parse(exerciseContent);
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      throw new Error('Failed to parse exercise data from AI response');
    }

    // Add metadata
    exerciseData.generated_at = new Date().toISOString();
    exerciseData.student_name = student_name;
    exerciseData.target_skill_score = skill_score;

    return new Response(
      JSON.stringify({ exercise_data: exerciseData }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in generate-tailored-exercise function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
