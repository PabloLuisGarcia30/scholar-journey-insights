
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.9';

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
const supabaseUrl = Deno.env.get('SUPABASE_URL');
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabase = createClient(supabaseUrl!, supabaseServiceKey!);

interface PracticeTestRequest {
  studentName: string;
  skillName: string;
  className: string;
  subject: string;
  grade: string;
  difficulty?: string;
  questionCount?: number;
  includeExplanations?: boolean;
  classId?: string;
  skillDistribution?: Array<{
    skill_name: string;
    score: number;
    questions: number;
  }>;
}

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
  explanation?: string;
  targetSkill?: string;
}

interface PracticeTestData {
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  estimatedTime: number;
  metadata: {
    skillName: string;
    difficulty: string;
    generatedAt: string;
    studentName: string;
    className: string;
  };
}

function buildPrompt(request: PracticeTestRequest): string {
  const { studentName, skillName, className, subject, grade, difficulty = 'mixed', questionCount = 5 } = request;
  
  // Handle multi-skill distribution if provided
  if (request.skillDistribution && request.skillDistribution.length > 1) {
    const skillDescriptions = request.skillDistribution.map(skill => 
      `${skill.skill_name} (${skill.questions} questions)`
    ).join(', ');
    
    return `Create a practice test for ${studentName} in ${className} (${subject}, ${grade}) covering these skills: ${skillDescriptions}.
    
Total questions: ${questionCount}
Difficulty: ${difficulty}
${request.includeExplanations ? 'Include explanations for each answer.' : ''}

Generate exactly ${questionCount} questions distributed across the specified skills. Each question should target the specific skill mentioned.

Format as JSON:
{
  "title": "Practice Test Title",
  "description": "Brief description",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice" | "short-answer" | "essay",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (for multiple choice),
      "correctAnswer": "Correct answer",
      "acceptableAnswers": ["Alternative answers"],
      "keywords": ["key", "words"],
      "points": 1,
      "explanation": "Why this is correct",
      "targetSkill": "Skill this question targets"
    }
  ],
  "totalPoints": ${questionCount},
  "estimatedTime": ${questionCount * 2}
}`;
  }

  // Single skill prompt
  return `Create a practice test for ${studentName} in ${className} (${subject}, ${grade}) focusing on: ${skillName}.

Questions: ${questionCount}
Difficulty: ${difficulty}
${request.includeExplanations ? 'Include explanations for each answer.' : ''}

Generate exactly ${questionCount} questions targeting ${skillName}. Mix question types but focus on the specific skill.

Format as JSON:
{
  "title": "${skillName} Practice Test",
  "description": "Practice test for ${skillName} skill",
  "questions": [
    {
      "id": "q1",
      "type": "multiple-choice" | "short-answer" | "essay",
      "question": "Question text",
      "options": ["A", "B", "C", "D"] (for multiple choice),
      "correctAnswer": "Correct answer",
      "acceptableAnswers": ["Alternative answers"],
      "keywords": ["key", "words"],
      "points": 1,
      "explanation": "Why this is correct",
      "targetSkill": "${skillName}"
    }
  ],
  "totalPoints": ${questionCount},
  "estimatedTime": ${questionCount * 2}
}`;
}

async function generatePracticeTest(request: PracticeTestRequest): Promise<PracticeTestData> {
  console.log('🎯 Generating practice test:', request);
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  const prompt = buildPrompt(request);
  
  try {
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
            content: `You are an expert teacher creating practice exercises. Generate high-quality, educational questions that help students practice specific skills. Always respond with valid JSON only.`
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ OpenAI API error:', response.status, errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error('No content received from OpenAI');
    }

    // Parse the JSON response
    let practiceTest: PracticeTestData;
    try {
      practiceTest = JSON.parse(content);
    } catch (parseError) {
      console.error('❌ Failed to parse OpenAI response:', content);
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Add metadata
    practiceTest.metadata = {
      skillName: request.skillName,
      difficulty: request.difficulty || 'mixed',
      generatedAt: new Date().toISOString(),
      studentName: request.studentName,
      className: request.className
    };

    console.log('✅ Successfully generated practice test with', practiceTest.questions.length, 'questions');
    return practiceTest;

  } catch (error) {
    console.error('❌ Error generating practice test:', error);
    throw error;
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('📥 Practice test generation request received');
    
    if (!openAIApiKey) {
      console.error('❌ OpenAI API key not configured');
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { 
          status: 500, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const requestData: PracticeTestRequest = await req.json();
    console.log('📋 Request data:', requestData);

    // Validate required fields
    if (!requestData.studentName || !requestData.skillName || !requestData.className) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: studentName, skillName, className' }),
        { 
          status: 400, 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
        }
      );
    }

    const practiceTest = await generatePracticeTest(requestData);

    return new Response(
      JSON.stringify(practiceTest),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Error in generate-practice-test function:', error);
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to generate practice test',
        details: errorMessage
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
