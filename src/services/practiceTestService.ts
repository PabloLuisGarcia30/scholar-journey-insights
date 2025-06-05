
import { supabase } from '@/integrations/supabase/client';

export interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
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

export interface HistoricalQuestion {
  question_text: string;
  question_type: string;
  options?: any;
  points: number;
  exam_title?: string;
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
