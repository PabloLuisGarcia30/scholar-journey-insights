
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
}

interface HistoricalQuestion {
  question_text: string;
  question_type: string;
  options?: any;
  points: number;
  exam_title?: string;
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 8000,  // 8 seconds
  backoffMultiplier: 2
};

// Add jitter to prevent thundering herd
function addJitter(delay: number): number {
  return delay + Math.random() * 1000;
}

// Sleep function for delays
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Retry wrapper with exponential backoff
async function withRetry<T>(
  operation: () => Promise<T>,
  attempt: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.log(`Attempt ${attempt} failed:`, error.message);
    
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    // Check if error is retryable (server errors, rate limits)
    const isRetryable = error.message.includes('server had an error') || 
                       error.message.includes('rate limit') ||
                       error.message.includes('timeout') ||
                       error.status >= 500;
    
    if (!isRetryable) {
      throw error;
    }

    // Calculate delay with exponential backoff and jitter
    const baseDelay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelay
    );
    const delayWithJitter = addJitter(baseDelay);
    
    console.log(`Retrying in ${delayWithJitter}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
    await sleep(delayWithJitter);
    
    return withRetry(operation, attempt + 1);
  }
}

async function getHistoricalQuestionsForSkill(supabase: any, classId: string, skillName: string): Promise<HistoricalQuestion[]> {
  console.log('Fetching historical questions for class:', classId, 'skill:', skillName);
  
  try {
    // Get exams for this class
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('exam_id, title')
      .eq('class_id', classId);

    if (examError) {
      console.error('Error fetching class exams:', examError);
      return [];
    }

    if (!exams || exams.length === 0) {
      console.log('No exams found for class:', classId);
      return [];
    }

    const examIds = exams.map((exam: any) => exam.exam_id);
    console.log('Found exams:', examIds);

    // Get answer keys for these exams
    const { data: questions, error: questionsError } = await supabase
      .from('answer_keys')
      .select('question_text, question_type, options, points, exam_id')
      .in('exam_id', examIds)
      .limit(10);

    if (questionsError) {
      console.error('Error fetching historical questions:', questionsError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log('No historical questions found for exams:', examIds);
      return [];
    }

    // Enhance questions with exam titles
    const enhancedQuestions = questions.map((q: any) => {
      const exam = exams.find((e: any) => e.exam_id === q.exam_id);
      return {
        ...q,
        exam_title: exam?.title || 'Unknown Exam'
      };
    });

    console.log(`Found ${enhancedQuestions.length} historical questions`);
    return enhancedQuestions;

  } catch (error) {
    console.error('Unexpected error fetching historical questions:', error);
    return [];
  }
}

async function callOpenAIWithRetry(prompt: string, model: string = 'gpt-4o-mini'): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  return withRetry(async () => {
    console.log(`Sending request to OpenAI ${model} with enhanced prompt including historical questions`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate high-quality practice tests that are engaging, educational, and appropriately challenging for the student\'s level.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    console.log(`OpenAI ${model} response status:`, response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error response:', JSON.stringify(errorData, null, 2));
      
      const errorMessage = errorData.error?.message || 'Unknown OpenAI API error';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log(`OpenAI ${model} practice test generation completed successfully`);
    return data;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate-practice-test function called');
    
    const {
      studentName,
      className,
      skillName,
      grade,
      subject,
      questionCount = 5,
      classId
    }: GeneratePracticeTestRequest = await req.json();

    console.log(`Generating practice test for: ${studentName} in class: ${className} skill: ${skillName} grade: ${grade} subject: ${subject} questionCount: ${questionCount} classId: ${classId}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get historical questions if classId is provided
    let historicalQuestions: HistoricalQuestion[] = [];
    if (classId) {
      historicalQuestions = await getHistoricalQuestionsForSkill(supabase, classId, skillName);
    }

    // Build enhanced prompt with historical context
    let historicalContext = '';
    if (historicalQuestions.length > 0) {
      historicalContext = `\n\nHere are some example questions from previous exams in this class for context:\n${
        historicalQuestions.slice(0, 3).map((q, i) => 
          `Example ${i + 1}: ${q.question_text} (${q.question_type}, ${q.points} points)`
        ).join('\n')
      }\n\nUse these examples to understand the style and difficulty level expected, but create completely new questions.`;
    }

    const prompt = `Create a targeted practice test for a ${grade} ${subject} student named ${studentName}.

SKILL FOCUS: ${skillName}
CLASS: ${className}
NUMBER OF QUESTIONS: ${questionCount}
${historicalContext}

REQUIREMENTS:
1. All questions must directly test the skill: "${skillName}"
2. Questions should be appropriate for ${grade} level
3. Include a mix of question types (multiple-choice, short-answer, true-false)
4. Each question should have clear, educational value
5. Provide detailed but concise correct answers
6. Points should reflect question difficulty (1-3 points each)

RESPONSE FORMAT - Return valid JSON only:
{
  "title": "Practice Test Title",
  "description": "Brief description focusing on ${skillName}",
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Question text here",
      "options": ["A", "B", "C", "D"] (only for multiple-choice),
      "correctAnswer": "Correct answer",
      "points": 1-3
    }
  ],
  "totalPoints": sum of all question points,
  "estimatedTime": estimated completion time in minutes
}

Generate exactly ${questionCount} questions focused on "${skillName}".`;

    // Call OpenAI with retry logic
    const data = await callOpenAIWithRetry(prompt);
    
    const content = data.choices[0].message.content;
    console.log('Raw OpenAI response content:', content);

    // Extract JSON from the response
    let practiceTest;
    try {
      console.log('Successfully extracted JSON from GPT-4o-mini response');
      
      // Try to parse the content directly first
      practiceTest = JSON.parse(content);
    } catch (parseError) {
      console.log('Direct JSON parse failed, attempting to extract JSON from response');
      
      // Try to extract JSON from markdown code blocks or other formatting
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        practiceTest = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not extract valid JSON from OpenAI response');
      }
    }

    // Validate the practice test structure
    if (!practiceTest.questions || !Array.isArray(practiceTest.questions)) {
      throw new Error('Invalid practice test format: missing questions array');
    }

    if (practiceTest.questions.length === 0) {
      throw new Error('No questions generated in practice test');
    }

    // Ensure all questions have required fields
    practiceTest.questions.forEach((q: any, index: number) => {
      if (!q.question || !q.correctAnswer || !q.type) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      if (!q.points) q.points = 1; // Default points
      if (!q.id) q.id = `Q${index + 1}`; // Default ID
    });

    // Calculate total points if not provided
    if (!practiceTest.totalPoints) {
      practiceTest.totalPoints = practiceTest.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    }

    // Set default estimated time if not provided
    if (!practiceTest.estimatedTime) {
      practiceTest.estimatedTime = Math.max(10, practiceTest.questions.length * 3); // 3 minutes per question minimum
    }

    console.log(`Successfully parsed and validated practice test with ${practiceTest.questions.length} questions using GPT-4o-mini`);
    console.log('Practice test generated using historical question patterns from class');

    return new Response(JSON.stringify(practiceTest), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-practice-test function:', error);
    
    // Provide more specific error messages
    let userFriendlyMessage = 'Failed to generate practice test. Please try again.';
    
    if (error.message.includes('OpenAI API')) {
      userFriendlyMessage = 'OpenAI service is temporarily unavailable. Please try again in a moment.';
    } else if (error.message.includes('JSON')) {
      userFriendlyMessage = 'Generated content format error. Please try again.';
    } else if (error.message.includes('API key')) {
      userFriendlyMessage = 'API configuration error. Please contact support.';
    }

    return new Response(
      JSON.stringify({ 
        error: userFriendlyMessage,
        details: error.message,
        retryable: error.message.includes('server had an error') || error.message.includes('temporarily unavailable')
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
