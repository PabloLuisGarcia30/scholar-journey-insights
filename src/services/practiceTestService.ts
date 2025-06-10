import { supabase } from '@/integrations/supabase/client';

export interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
  skillDistribution?: Array<{
    skill_name: string;
    score: number;
    questions: number;
  }>;
}

export interface PracticeTestQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[]; // New: multiple acceptable answers
  keywords?: string[]; // New: key concepts that should be present
  points: number;
}

export interface PracticeTestData {
  title: string;
  description: string;
  questions: PracticeTestQuestion[];
  totalPoints: number;
  estimatedTime: number;
  skillName: string;
}

export interface MultiPracticeTestResult {
  skillName: string;
  skillScore: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  testData?: PracticeTestData;
  error?: string;
}

export interface HistoricalQuestion {
  question_text: string;
  question_type: string;
  options?: any;
  points: number;
  exam_title?: string;
}

// Retry configuration for client-side retries
const RETRY_CONFIG = {
  maxAttempts: 2, // Client-side retries (edge function has its own retry logic)
  baseDelay: 2000, // 2 seconds
  backoffMultiplier: 2
};

// Client-side retry wrapper
async function withRetry<T>(
  operation: () => Promise<T>,
  attempt: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.log(`Client retry attempt ${attempt} failed:`, error);
    
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    // Only retry on specific errors
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryable = errorMessage.includes('temporarily unavailable') || 
                       errorMessage.includes('server had an error') ||
                       errorMessage.includes('rate limit') ||
                       errorMessage.includes('timeout');
    
    if (!isRetryable) {
      throw error;
    }

    // Wait before retrying
    const delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
    console.log(`Retrying in ${delay}ms... (client attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withRetry(operation, attempt + 1);
  }
}

export async function getHistoricalQuestionsForSkill(classId: string, skillName: string): Promise<HistoricalQuestion[]> {
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

    const examIds = exams.map(exam => exam.exam_id);
    console.log('Found exams:', examIds);

    // Get answer keys for these exams
    const { data: questions, error: questionsError } = await supabase
      .from('answer_keys')
      .select('question_text, question_type, options, points, exam_id')
      .in('exam_id', examIds)
      .limit(10); // Limit to avoid too many results

    if (questionsError) {
      console.error('Error fetching historical questions:', questionsError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log('No historical questions found for exams:', examIds);
      return [];
    }

    // Enhance questions with exam titles
    const enhancedQuestions = questions.map(q => {
      const exam = exams.find(e => e.exam_id === q.exam_id);
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

export async function generatePracticeTest(request: GeneratePracticeTestRequest): Promise<PracticeTestData> {
  console.log('Calling generate-practice-test function with:', request);
  
  return withRetry(async () => {
    const { data, error } = await supabase.functions.invoke('generate-practice-test', {
      body: {
        ...request,
        enhancedAnswerPatterns: true, // Request enhanced answer patterns
        multiSkillSupport: true // Enable multi-skill support
      }
    });

    if (error) {
      console.error('Error calling generate-practice-test function:', error);
      
      // Create a more specific error message
      let errorMessage = 'Failed to generate practice test';
      if (error.message) {
        if (error.message.includes('temporarily unavailable')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit reached. Please try again in a moment.';
        } else if (error.message.includes('server had an error')) {
          errorMessage = 'AI service encountered an error. Please try again.';
        } else {
          errorMessage = error.message;
        }
      }
      
      throw new Error(errorMessage);
    }

    if (!data) {
      throw new Error('No data returned from practice test generation');
    }

    console.log('Successfully generated practice test:', data);
    return { ...data, skillName: request.skillName } as PracticeTestData;
  });
}

export async function generateMultiplePracticeTests(
  skills: Array<{ name: string; score: number }>,
  baseRequest: Omit<GeneratePracticeTestRequest, 'skillName'>
): Promise<MultiPracticeTestResult[]> {
  console.log('Generating practice tests for multiple skills:', skills.map(s => s.name));
  
  const results: MultiPracticeTestResult[] = skills.map(skill => ({
    skillName: skill.name,
    skillScore: skill.score,
    status: 'pending' as const
  }));

  // Generate tests for each skill individually with built-in retry logic
  for (let i = 0; i < skills.length; i++) {
    const skill = skills[i];
    results[i].status = 'generating';
    
    try {
      const testData = await generatePracticeTest({
        ...baseRequest,
        skillName: skill.name
      });
      
      results[i].status = 'completed';
      results[i].testData = testData;
      console.log(`Successfully generated practice test for skill: ${skill.name}`);
    } catch (error) {
      console.error(`Failed to generate practice test for skill ${skill.name}:`, error);
      results[i].status = 'error';
      results[i].error = error instanceof Error ? error.message : 'Unknown error';
    }
  }

  return results;
}
