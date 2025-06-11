
import { supabase } from "@/integrations/supabase/client";
import { PracticeExerciseSkillService } from "./practiceExerciseSkillService";

export interface StudentPracticeRequest {
  authenticatedStudentId: string;
  studentName: string;
  skillName: string;
  currentSkillScore: number;
  classId: string;
  className: string;
  subject: string;
  grade: string;
  preferredDifficulty?: 'adaptive' | 'review' | 'challenge';
  questionCount?: number;
}

export interface StudentPracticeExercise {
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    acceptableAnswers?: string[];
    keywords?: string[];
    points: number;
    explanation?: string;
    targetSkill: string;
    difficultyLevel: string;
    hint?: string;
  }>;
  totalPoints: number;
  estimatedTime: number;
  adaptiveDifficulty: string;
  studentGuidance: string;
  metadata: {
    skillName: string;
    currentSkillScore: number;
    targetImprovement: number;
    generatedAt: string;
    studentName: string;
    className: string;
    sessionId: string;
    skillType?: string;
    skillMetadata?: any;
  };
}

export interface StudentPracticeSession {
  id: string;
  authenticated_student_id: string;
  student_name: string;
  skill_name: string;
  current_skill_score: number;
  class_id: string;
  class_name: string;
  subject: string;
  grade: string;
  difficulty_level: string;
  question_count: number;
  exercise_generated: boolean;
  started_at: string;
  completed_at?: string;
  final_score?: number;
  improvement_shown?: number;
  created_at: string;
  updated_at: string;
}

export interface StudentPracticeAnalytics {
  id: string;
  authenticated_student_id: string;
  skill_name: string;
  total_practice_sessions: number;
  average_score?: number;
  best_score?: number;
  improvement_rate?: number;
  last_practiced_at?: string;
  streak_count: number;
  created_at: string;
  updated_at: string;
}

export class StudentPracticeService {
  static async generatePracticeExercise(request: StudentPracticeRequest): Promise<StudentPracticeExercise> {
    try {
      console.log('🎯 Generating student practice exercise via service:', request);
      
      const { data, error } = await supabase.functions.invoke('generate-student-practice-exercise', {
        body: request
      });

      if (error) {
        console.error('❌ Error calling student practice exercise function:', error);
        throw new Error(`Failed to generate practice exercise: ${error.message}`);
      }

      if (!data) {
        throw new Error('No data received from practice exercise generation');
      }

      console.log('✅ Successfully generated student practice exercise with skill metadata');
      return data as StudentPracticeExercise;
    } catch (error) {
      console.error('❌ Error in generatePracticeExercise:', error);
      throw error;
    }
  }

  static async updatePracticeSessionScore(sessionId: string, finalScore: number, improvementShown?: number): Promise<void> {
    try {
      const { error } = await supabase
        .from('student_practice_sessions')
        .update({
          completed_at: new Date().toISOString(),
          final_score: finalScore,
          improvement_shown: improvementShown
        })
        .eq('id', sessionId);

      if (error) {
        console.error('❌ Error updating practice session score:', error);
        throw error;
      }

      console.log('✅ Updated practice session score successfully');
    } catch (error) {
      console.error('❌ Error in updatePracticeSessionScore:', error);
      throw error;
    }
  }

  /**
   * Create practice session using authenticated student ID
   */
  static async createPracticeSession(request: StudentPracticeRequest): Promise<{
    sessionId: string;
    authenticatedStudentId: string;
  }> {
    try {
      console.log('🎯 Creating practice session with authenticated student:', request);

      // Create practice session linked to authenticated student
      // Include both student_id and authenticated_student_id for backward compatibility
      const { data: session, error } = await supabase
        .from('student_practice_sessions')
        .insert({
          student_id: request.authenticatedStudentId, // For backward compatibility
          authenticated_student_id: request.authenticatedStudentId,
          student_name: request.studentName,
          skill_name: request.skillName,
          current_skill_score: request.currentSkillScore,
          class_id: request.classId,
          class_name: request.className,
          subject: request.subject,
          grade: request.grade,
          difficulty_level: request.preferredDifficulty || 'adaptive',
          question_count: request.questionCount || 4,
          exercise_generated: true
        })
        .select('id')
        .single();

      if (error) {
        throw new Error(`Failed to create practice session: ${error.message}`);
      }

      console.log('✅ Practice session created with authenticated student:', {
        sessionId: session.id,
        authenticatedStudentId: request.authenticatedStudentId
      });

      return {
        sessionId: session.id,
        authenticatedStudentId: request.authenticatedStudentId
      };

    } catch (error) {
      console.error('❌ Error creating practice session:', error);
      throw error;
    }
  }

  /**
   * Complete a practice exercise with enhanced skill score tracking using authenticated student
   */
  static async completePracticeExerciseWithSkillUpdates(
    exerciseId: string,
    authenticatedStudentId: string,
    skillName: string,
    exerciseScore: number,
    exerciseData: any
  ): Promise<{
    success: boolean;
    skillUpdates: any[];
    error?: string;
  }> {
    try {
      console.log('🎯 Completing practice exercise with authenticated student:', {
        exerciseId,
        authenticatedStudentId,
        skillName,
        exerciseScore
      });

      // Process with enhanced skill service using authenticated student ID
      const result = await PracticeExerciseSkillService.processPracticeExerciseCompletion({
        authenticatedStudentId,
        exerciseId,
        skillName,
        exerciseScore,
        exerciseData
      });

      if (result.success) {
        console.log('✅ Practice exercise completed with authenticated student:', result.skillUpdates.length);
      } else {
        console.warn('⚠️ Practice exercise completed but skill updates failed:', result.error);
      }

      return result;
    } catch (error) {
      console.error('❌ Error completing practice exercise with authenticated student:', error);
      return {
        success: false,
        skillUpdates: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  static async getStudentPracticeSessions(authenticatedStudentId: string, limit = 10): Promise<StudentPracticeSession[]> {
    try {
      const { data, error } = await supabase
        .from('student_practice_sessions')
        .select('*')
        .eq('authenticated_student_id', authenticatedStudentId)
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.error('❌ Error fetching practice sessions:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getStudentPracticeSessions:', error);
      throw error;
    }
  }

  static async getStudentPracticeAnalytics(authenticatedStudentId: string): Promise<StudentPracticeAnalytics[]> {
    try {
      const { data, error } = await supabase
        .from('student_practice_analytics')
        .select('*')
        .eq('authenticated_student_id', authenticatedStudentId)
        .order('total_practice_sessions', { ascending: false });

      if (error) {
        console.error('❌ Error fetching practice analytics:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getStudentPracticeAnalytics:', error);
      throw error;
    }
  }

  static async updatePracticeAnalyticsAfterCompletion(
    authenticatedStudentId: string, 
    skillName: string, 
    score: number
  ): Promise<void> {
    try {
      // Get current analytics
      const { data: currentAnalytics, error: selectError } = await supabase
        .from('student_practice_analytics')
        .select('*')
        .eq('authenticated_student_id', authenticatedStudentId)
        .eq('skill_name', skillName)
        .maybeSingle();

      if (selectError) throw selectError;

      if (currentAnalytics) {
        // Calculate new averages
        const newAverage = currentAnalytics.average_score 
          ? ((currentAnalytics.average_score * (currentAnalytics.total_practice_sessions - 1)) + score) / currentAnalytics.total_practice_sessions
          : score;
        
        const newBestScore = Math.max(currentAnalytics.best_score || 0, score);
        
        const { error: updateError } = await supabase
          .from('student_practice_analytics')
          .update({
            average_score: newAverage,
            best_score: newBestScore,
            last_practiced_at: new Date().toISOString()
          })
          .eq('id', currentAnalytics.id);

        if (updateError) throw updateError;
      }

      console.log('✅ Updated practice analytics after completion');
    } catch (error) {
      console.error('❌ Error updating practice analytics after completion:', error);
      // Don't throw - analytics failure shouldn't block the main flow
    }
  }

  /**
   * Get practice history with skill improvements for an authenticated student
   */
  static async getPracticeHistoryWithImprovements(authenticatedStudentId: string, skillName?: string): Promise<Array<{
    sessionId: string;
    skillName: string;
    completedAt: string;
    finalScore: number;
    improvementShown: number;
    difficultyLevel: string;
  }>> {
    try {
      let query = supabase
        .from('student_practice_sessions')
        .select('id, skill_name, completed_at, final_score, improvement_shown, difficulty_level')
        .eq('authenticated_student_id', authenticatedStudentId)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false });

      if (skillName) {
        query = query.eq('skill_name', skillName);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching practice history:', error);
        throw error;
      }

      return (data || []).map(session => ({
        sessionId: session.id,
        skillName: session.skill_name,
        completedAt: session.completed_at,
        finalScore: session.final_score || 0,
        improvementShown: session.improvement_shown || 0,
        difficultyLevel: session.difficulty_level
      }));
    } catch (error) {
      console.error('❌ Error in getPracticeHistoryWithImprovements:', error);
      return [];
    }
  }
}
