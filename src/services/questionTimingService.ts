
import { supabase } from '@/integrations/supabase/client';

export interface QuestionTimingData {
  id: string;
  student_exercise_id: string;
  question_id: string;
  question_number: number;
  time_started: string;
  time_answered?: string;
  time_spent_seconds?: number;
  answer_changes_count: number;
  created_at: string;
  updated_at: string;
}

export interface TimingAnalytics {
  skill_name: string;
  avg_time_per_question: number;
  min_time_seconds: number;
  max_time_seconds: number;
  total_questions: number;
  questions_with_multiple_changes: number;
}

export interface StruggleIndicator {
  skill_name: string;
  question_number: number;
  time_spent_seconds: number;
  answer_changes_count: number;
  was_correct: boolean;
  struggle_score: number;
}

export class QuestionTimingService {
  
  /**
   * Start timing for a specific question
   */
  static async startQuestionTiming(
    studentExerciseId: string, 
    questionId: string, 
    questionNumber: number
  ): Promise<string | null> {
    try {
      console.log(`⏱️ Starting timing for question ${questionNumber} in exercise ${studentExerciseId}`);
      
      const { data, error } = await supabase
        .from('question_time_tracking')
        .insert({
          student_exercise_id: studentExerciseId,
          question_id: questionId,
          question_number: questionNumber,
          time_started: new Date().toISOString()
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error starting question timing:', error);
        return null;
      }

      console.log(`✅ Question timing started: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in startQuestionTiming:', error);
      return null;
    }
  }

  /**
   * Record answer for a question (can be called multiple times for answer changes)
   */
  static async recordQuestionAnswer(
    timingId: string,
    isAnswerChange: boolean = false
  ): Promise<void> {
    try {
      console.log(`📝 Recording answer for timing ${timingId}, isChange: ${isAnswerChange}`);
      
      // Get current timing record to calculate time spent
      const { data: currentRecord, error: fetchError } = await supabase
        .from('question_time_tracking')
        .select('time_started, answer_changes_count')
        .eq('id', timingId)
        .single();

      if (fetchError || !currentRecord) {
        console.error('❌ Error fetching timing record:', fetchError);
        return;
      }

      const timeAnswered = new Date().toISOString();
      const timeSpentMs = new Date(timeAnswered).getTime() - new Date(currentRecord.time_started).getTime();
      const timeSpentSeconds = Math.round(timeSpentMs / 1000);
      
      const updateData: any = {
        time_answered: timeAnswered,
        time_spent_seconds: timeSpentSeconds
      };

      // Increment answer changes count if this is a change
      if (isAnswerChange) {
        updateData.answer_changes_count = (currentRecord.answer_changes_count || 0) + 1;
      }

      const { error } = await supabase
        .from('question_time_tracking')
        .update(updateData)
        .eq('id', timingId);

      if (error) {
        console.error('❌ Error updating question timing:', error);
        return;
      }

      console.log(`✅ Question answer recorded: ${timeSpentSeconds}s${isAnswerChange ? ' (answer changed)' : ''}`);
    } catch (error) {
      console.error('❌ Exception in recordQuestionAnswer:', error);
    }
  }

  /**
   * Get timing analytics for a student
   */
  static async getStudentTimingAnalytics(studentId: string): Promise<TimingAnalytics[]> {
    try {
      console.log(`📊 Fetching timing analytics for student: ${studentId}`);
      
      const { data, error } = await supabase.rpc('get_question_timing_analytics', {
        student_uuid: studentId
      });

      if (error) {
        console.error('❌ Error fetching timing analytics:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} timing analytics records`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getStudentTimingAnalytics:', error);
      return [];
    }
  }

  /**
   * Get struggle indicators for a student
   */
  static async getStudentStruggleIndicators(
    studentId: string, 
    timeThreshold: number = 120
  ): Promise<StruggleIndicator[]> {
    try {
      console.log(`🔍 Fetching struggle indicators for student: ${studentId}`);
      
      const { data, error } = await supabase.rpc('get_struggle_indicators', {
        student_uuid: studentId,
        time_threshold_seconds: timeThreshold
      });

      if (error) {
        console.error('❌ Error fetching struggle indicators:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} struggle indicators`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getStudentStruggleIndicators:', error);
      return [];
    }
  }

  /**
   * Get question timing data for an exercise
   */
  static async getExerciseTimingData(studentExerciseId: string): Promise<QuestionTimingData[]> {
    try {
      const { data, error } = await supabase
        .from('question_time_tracking')
        .select('*')
        .eq('student_exercise_id', studentExerciseId)
        .order('question_number');

      if (error) {
        console.error('❌ Error fetching exercise timing data:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Exception in getExerciseTimingData:', error);
      return [];
    }
  }
}
