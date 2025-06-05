
import { supabase } from "@/integrations/supabase/client";

export interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName?: string;
  grade?: string;
  subject?: string;
}

export interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer';
  question: string;
  options?: string[];
  correctAnswer?: string;
  points: number;
}

export interface PracticeTestData {
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  estimatedTime: number;
}

export const generatePracticeTest = async (request: GeneratePracticeTestRequest): Promise<PracticeTestData> => {
  try {
    console.log('Calling generate-practice-test function with:', request);
    const { data, error } = await supabase.functions.invoke('generate-practice-test', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to generate practice test: ${error.message}`)
    }

    console.log('Generate-practice-test function response:', data);
    return data
  } catch (error) {
    console.error('Error calling generate-practice-test function:', error)
    throw new Error('Failed to generate practice test. Please try again.')
  }
}
