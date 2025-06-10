
import { supabase } from '@/integrations/supabase/client';

export interface PracticeAnswerKeyQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
  targetSkill: string;
  learningObjective?: string;
}

export interface PracticeAnswerKey {
  id: string;
  exercise_id: string;
  questions: PracticeAnswerKeyQuestion[];
  metadata: {
    skillName: string;
    subject: string;
    grade: string;
    totalPoints: number;
    estimatedTime: number;
    generatedAt: string;
  };
  created_at: string;
  updated_at: string;
}

export class PracticeAnswerKeyService {
  static async saveAnswerKey(exerciseId: string, questions: PracticeAnswerKeyQuestion[], metadata: any): Promise<void> {
    console.log('💾 Saving answer key for exercise:', exerciseId);
    
    const { error } = await supabase
      .from('practice_answer_keys')
      .insert({
        exercise_id: exerciseId,
        questions: questions,
        metadata: metadata
      });

    if (error) {
      console.error('❌ Error saving answer key:', error);
      throw new Error(`Failed to save answer key: ${error.message}`);
    }

    console.log('✅ Answer key saved successfully');
  }

  static async getAnswerKey(exerciseId: string): Promise<PracticeAnswerKey | null> {
    console.log('📖 Fetching answer key for exercise:', exerciseId);
    
    const { data, error } = await supabase
      .from('practice_answer_keys')
      .select('*')
      .eq('exercise_id', exerciseId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        console.log('⚠️ No answer key found for exercise:', exerciseId);
        return null;
      }
      console.error('❌ Error fetching answer key:', error);
      throw new Error(`Failed to fetch answer key: ${error.message}`);
    }

    console.log('✅ Answer key fetched successfully');
    return data as PracticeAnswerKey;
  }

  static async hasAnswerKey(exerciseId: string): Promise<boolean> {
    const { data, error } = await supabase
      .from('practice_answer_keys')
      .select('id')
      .eq('exercise_id', exerciseId)
      .single();

    return !error && !!data;
  }
}
