
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
  subject?: string;
  grade?: string;
}

// Enhanced skill type detection based on skill name patterns
function detectSkillType(skillName: string, subject?: string): 'content' | 'subject' {
  const contentSkillPatterns = [
    // Math content skills
    'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'probability',
    'fractions', 'decimals', 'integers', 'equations', 'functions', 'graphing',
    'polynomials', 'logarithms', 'matrices', 'sequences', 'series',
    
    // Science content skills
    'chemistry', 'physics', 'biology', 'atomic structure', 'periodic table',
    'chemical bonds', 'reactions', 'thermodynamics', 'mechanics', 'waves',
    'electricity', 'magnetism', 'genetics', 'evolution', 'ecology',
    
    // English content skills
    'grammar', 'vocabulary', 'syntax', 'phonics', 'spelling', 'punctuation',
    'literature', 'poetry', 'prose', 'rhetoric', 'composition',
    
    // History content skills
    'ancient history', 'medieval', 'renaissance', 'industrial revolution',
    'world wars', 'cold war', 'civilizations', 'empires'
  ];

  const subjectSkillPatterns = [
    // Cross-subject cognitive skills
    'critical thinking', 'problem solving', 'analytical reasoning', 'logical reasoning',
    'reading comprehension', 'written communication', 'oral communication',
    'research skills', 'data analysis', 'interpretation', 'synthesis',
    'evaluation', 'application', 'comprehension', 'knowledge recall',
    'creative thinking', 'decision making', 'time management', 'organization',
    'collaboration', 'leadership', 'presentation skills', 'study skills'
  ];

  const skillLower = skillName.toLowerCase();
  
  // Check for content skill patterns
  for (const pattern of contentSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'content';
    }
  }
  
  // Check for subject skill patterns
  for (const pattern of subjectSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'subject';
    }
  }
  
  // Default classification based on skill name characteristics
  if (skillLower.includes('understanding') || skillLower.includes('knowledge') || 
      skillLower.includes('concepts') || skillLower.includes('principles')) {
    return 'content';
  }
  
  if (skillLower.includes('skills') || skillLower.includes('ability') || 
      skillLower.includes('thinking') || skillLower.includes('reasoning')) {
    return 'subject';
  }
  
  // Final fallback: content skills for specific subjects, subject skills for general
  if (subject) {
    const specificSubjects = ['math', 'science', 'english', 'history', 'physics', 'chemistry', 'biology'];
    if (specificSubjects.some(subj => subject.toLowerCase().includes(subj))) {
      return 'content';
    }
  }
  
  return 'subject'; // Default to subject skill
}

// Generate skill metadata
function generateSkillMetadata(skillName: string, skillType: 'content' | 'subject', subject?: string, grade?: string) {
  return {
    skillType,
    skillCategory: skillType === 'content' ? 'domain_specific' : 'cross_curricular',
    subject: subject || 'General',
    grade: grade || 'Unknown',
    detectedPatterns: skillType === 'content' ? ['subject_specific_content'] : ['cognitive_skill'],
    confidence: 0.8,
    classificationMethod: 'pattern_matching_enhanced'
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { skill_name, skill_score, student_name, difficulty_level, subject, grade }: GenerateExerciseRequest = await req.json();

    // Detect skill type and generate metadata
    const skillType = detectSkillType(skill_name, subject);
    const skillMetadata = generateSkillMetadata(skill_name, skillType, subject, grade);
    
    console.log(`Generating tailored exercise - Skill: ${skill_name}, Type: ${skillType}, Score: ${skill_score}%`);

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
            
            SKILL TYPE: ${skillType} (${skillType === 'content' ? 'subject-specific content knowledge' : 'cross-curricular cognitive skill'})
            ${subject ? `SUBJECT: ${subject}` : ''}
            ${grade ? `GRADE: ${grade}` : ''}
            
            Return a JSON object with this structure:
            {
              "title": "Exercise title",
              "description": "Brief description of what the student will practice",
              "skillType": "${skillType}",
              "skillMetadata": ${JSON.stringify(skillMetadata)},
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

    // Ensure skill metadata is included
    if (!exerciseData.skillType) {
      exerciseData.skillType = skillType;
    }
    
    if (!exerciseData.skillMetadata) {
      exerciseData.skillMetadata = skillMetadata;
    }

    // Add metadata
    exerciseData.generated_at = new Date().toISOString();
    exerciseData.student_name = student_name;
    exerciseData.target_skill_score = skill_score;

    console.log(`Generated tailored exercise with skill type: ${exerciseData.skillType}`);

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
