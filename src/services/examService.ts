
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/utils/pdfGenerator";

export interface ExamData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  totalPoints: number;
  questions: Question[];
}

export interface StoredExam {
  id: string;
  exam_id: string;
  title: string;
  description: string;
  class_name: string;
  time_limit: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface AnswerKey {
  id: string;
  exam_id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  correct_answer: string;
  points: number;
  options: any;
  created_at: string;
}

export const saveExamToDatabase = async (examData: ExamData): Promise<void> => {
  try {
    console.log('Saving exam to database:', examData.examId);
    
    // Insert exam metadata
    const { error: examError } = await supabase
      .from('exams')
      .insert({
        exam_id: examData.examId,
        title: examData.title,
        description: examData.description,
        class_name: examData.className,
        time_limit: examData.timeLimit,
        total_points: examData.totalPoints
      });

    if (examError) {
      console.error('Error saving exam:', examError);
      throw new Error(`Failed to save exam: ${examError.message}`);
    }

    // Insert answer keys
    const answerKeys = examData.questions.map((question, index) => ({
      exam_id: examData.examId,
      question_number: index + 1,
      question_text: question.question,
      question_type: question.type,
      correct_answer: question.correctAnswer || '',
      points: question.points,
      options: question.options ? { options: question.options } : null
    }));

    const { error: answerError } = await supabase
      .from('answer_keys')
      .insert(answerKeys);

    if (answerError) {
      console.error('Error saving answer keys:', answerError);
      throw new Error(`Failed to save answer keys: ${answerError.message}`);
    }

    console.log('Exam and answer keys saved successfully');
  } catch (error) {
    console.error('Error in saveExamToDatabase:', error);
    throw error;
  }
};

export const getExamByExamId = async (examId: string): Promise<StoredExam | null> => {
  try {
    console.log('Fetching exam by ID:', examId);
    
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching exam:', error);
      throw new Error(`Failed to fetch exam: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getExamByExamId:', error);
    throw error;
  }
};

export const getAnswerKeysByExamId = async (examId: string): Promise<AnswerKey[]> => {
  try {
    console.log('Fetching answer keys for exam:', examId);
    
    const { data, error } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number');

    if (error) {
      console.error('Error fetching answer keys:', error);
      throw new Error(`Failed to fetch answer keys: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAnswerKeysByExamId:', error);
    throw error;
  }
};
