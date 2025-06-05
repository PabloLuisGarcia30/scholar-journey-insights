
import { supabase } from '@/integrations/supabase/client';

export interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
}

export interface PracticeTestQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

export interface PracticeTestData {
  title: string;
  description: string;
  questions: PracticeTestQuestion[];
  totalPoints: number;
  estimatedTime: number;
}

export async function generatePracticeTest(request: GeneratePracticeTestRequest): Promise<PracticeTestData> {
  console.log('Calling generate-practice-test function with:', request);
  
  const { data, error } = await supabase.functions.invoke('generate-practice-test', {
    body: request
  });

  if (error) {
    console.error('Error calling generate-practice-test function:', error);
    throw new Error(`Failed to generate practice test: ${error.message}`);
  }

  if (!data) {
    throw new Error('No data returned from practice test generation');
  }

  console.log('Successfully generated practice test:', data);
  return data as PracticeTestData;
}
