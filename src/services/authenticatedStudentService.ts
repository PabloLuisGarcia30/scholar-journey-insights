
import { supabase } from "@/integrations/supabase/client";

export interface AuthenticatedStudentContentSkill {
  id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
  test_result_id?: string;
  practice_exercise_id?: string;
}

export interface AuthenticatedStudentSubjectSkill {
  id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
  test_result_id?: string;
  practice_exercise_id?: string;
}

export interface AuthenticatedStudentTestResult {
  id: string;
  exam_id: string;
  class_id?: string;
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  detailed_analysis?: string;
  ai_feedback?: string;
  created_at: string;
}

/**
 * Service for fetching student data using authenticated user IDs
 * This is part of Phase 3 migration to move away from mock student IDs
 */
export class AuthenticatedStudentService {
  
  /**
   * Get content skill scores for authenticated user
   */
  static async getContentSkillScores(authenticatedUserId: string): Promise<AuthenticatedStudentContentSkill[]> {
    try {
      console.log('🔐 Fetching content skills for authenticated user:', authenticatedUserId);
      
      const { data, error } = await supabase.rpc('get_authenticated_user_content_skills', {
        auth_user_id: authenticatedUserId
      });

      if (error) {
        console.error('Error fetching authenticated user content skills:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} content skill scores for authenticated user`);
      return data || [];
    } catch (error) {
      console.error('Error in getContentSkillScores:', error);
      return [];
    }
  }

  /**
   * Get subject skill scores for authenticated user
   */
  static async getSubjectSkillScores(authenticatedUserId: string): Promise<AuthenticatedStudentSubjectSkill[]> {
    try {
      console.log('🔐 Fetching subject skills for authenticated user:', authenticatedUserId);
      
      const { data, error } = await supabase.rpc('get_authenticated_user_subject_skills', {
        auth_user_id: authenticatedUserId
      });

      if (error) {
        console.error('Error fetching authenticated user subject skills:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} subject skill scores for authenticated user`);
      return data || [];
    } catch (error) {
      console.error('Error in getSubjectSkillScores:', error);
      return [];
    }
  }

  /**
   * Get test results for authenticated user
   */
  static async getTestResults(authenticatedUserId: string): Promise<AuthenticatedStudentTestResult[]> {
    try {
      console.log('🔐 Fetching test results for authenticated user:', authenticatedUserId);
      
      const { data, error } = await supabase.rpc('get_authenticated_user_test_results', {
        auth_user_id: authenticatedUserId
      });

      if (error) {
        console.error('Error fetching authenticated user test results:', error);
        return [];
      }

      console.log(`✅ Found ${data?.length || 0} test results for authenticated user`);
      return data || [];
    } catch (error) {
      console.error('Error in getTestResults:', error);
      return [];
    }
  }

  /**
   * Get enrolled classes for authenticated user
   */
  static async getEnrolledClasses(authenticatedUserId: string) {
    try {
      console.log('🔐 Fetching enrolled classes for authenticated user:', authenticatedUserId);
      
      // First try to find student profile
      const { data: studentProfile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('authenticated_user_id', authenticatedUserId)
        .maybeSingle();

      if (profileError && profileError.code !== 'PGRST116') {
        console.error('Error fetching student profile:', profileError);
        return [];
      }

      if (!studentProfile) {
        console.log('⚠️ No student profile found for authenticated user, returning empty classes');
        return [];
      }

      // Get enrolled classes via student profile
      const { data: enrollments, error: enrollmentError } = await supabase
        .from('class_enrollments')
        .select(`
          class_id,
          active_classes!inner(*)
        `)
        .eq('student_profile_id', studentProfile.id)
        .eq('is_active', true);

      if (enrollmentError) {
        console.error('Error fetching class enrollments:', enrollmentError);
        return [];
      }

      const classes = enrollments?.map(enrollment => enrollment.active_classes) || [];
      console.log(`✅ Found ${classes.length} enrolled classes for authenticated user`);
      return classes;
    } catch (error) {
      console.error('Error in getEnrolledClasses:', error);
      return [];
    }
  }
}
