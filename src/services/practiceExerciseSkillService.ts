
import { supabase } from "@/integrations/supabase/client";

export interface SkillScoreCalculation {
  skillName: string;
  currentScore: number;
  exerciseScore: number;
  updatedScore: number;
  skillType?: string;
}

export class PracticeExerciseSkillService {
  /**
   * Get student's content skills using authenticated student ID
   */
  static async getStudentContentSkills(authenticatedStudentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('content_skill_scores')
        .select('*')
        .eq('authenticated_student_id', authenticatedStudentId);

      if (error) {
        console.error('❌ Error fetching content skills:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getStudentContentSkills:', error);
      return [];
    }
  }

  /**
   * Get student's subject skills using authenticated student ID
   */
  static async getStudentSubjectSkills(authenticatedStudentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('subject_skill_scores')
        .select('*')
        .eq('authenticated_student_id', authenticatedStudentId);

      if (error) {
        console.error('❌ Error fetching subject skills:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('❌ Error in getStudentSubjectSkills:', error);
      return [];
    }
  }

  /**
   * Calculate content skill update
   */
  static async calculateContentSkillUpdate(
    authenticatedStudentId: string,
    skillName: string,
    exerciseScore: number,
    existingSkills: any[]
  ): Promise<SkillScoreCalculation | null> {
    try {
      const currentSkill = existingSkills.find(skill => skill.skill_name === skillName);
      const currentScore = currentSkill ? currentSkill.score : 0;
      const updatedScore = Math.min(100, currentScore + exerciseScore);

      console.log('📈 Calculating content skill update:', {
        authenticatedStudentId,
        skillName,
        currentScore,
        exerciseScore,
        updatedScore
      });

      return {
        skillName,
        currentScore,
        exerciseScore,
        updatedScore,
        skillType: 'content'
      };
    } catch (error) {
      console.error('❌ Error calculating content skill update:', error);
      return null;
    }
  }

  /**
   * Calculate subject skill update
   */
  static async calculateSubjectSkillUpdate(
    authenticatedStudentId: string,
    skillName: string,
    exerciseScore: number,
    existingSkills: any[]
  ): Promise<SkillScoreCalculation | null> {
    try {
      const currentSkill = existingSkills.find(skill => skill.skill_name === skillName);
      const currentScore = currentSkill ? currentSkill.score : 0;
      const updatedScore = Math.min(100, currentScore + exerciseScore);

      console.log('📈 Calculating subject skill update:', {
        authenticatedStudentId,
        skillName,
        currentScore,
        exerciseScore,
        updatedScore
      });

      return {
        skillName,
        currentScore,
        exerciseScore,
        updatedScore,
        skillType: 'subject'
      };
    } catch (error) {
      console.error('❌ Error calculating subject skill update:', error);
      return null;
    }
  }

  /**
   * Enhanced practice exercise completion using authenticated student profiles
   */
  static async processPracticeExerciseCompletion({
    authenticatedStudentId,
    exerciseId,
    skillName,
    exerciseScore,
    exerciseData
  }: {
    authenticatedStudentId: string;
    exerciseId: string;
    skillName: string;
    exerciseScore: number;
    exerciseData: any;
  }): Promise<{
    success: boolean;
    skillUpdates: SkillScoreCalculation[];
    error?: string;
  }> {
    try {
      console.log('🎯 Processing practice exercise completion with authenticated student:', {
        authenticatedStudentId,
        exerciseId,
        skillName,
        exerciseScore
      });

      // Get existing skill scores for comparison
      const existingContentSkills = await this.getStudentContentSkills(authenticatedStudentId);
      const existingSubjectSkills = await this.getStudentSubjectSkills(authenticatedStudentId);

      // Calculate skill updates
      const skillUpdates: SkillScoreCalculation[] = [];

      // Process content skill updates
      const skillType = exerciseData?.skillType || exerciseData?.metadata?.skillType;
      if (skillType === 'content' || !skillType) {
        const contentSkillUpdate = await this.calculateContentSkillUpdate(
          authenticatedStudentId,
          skillName,
          exerciseScore,
          existingContentSkills
        );

        if (contentSkillUpdate) {
          // Store content skill score with authenticated student linking
          const { error: contentError } = await supabase
            .from('content_skill_scores')
            .insert({
              authenticated_student_id: authenticatedStudentId,
              practice_exercise_id: exerciseId,
              skill_name: skillName,
              score: contentSkillUpdate.updatedScore,
              points_earned: Math.round((contentSkillUpdate.updatedScore / 100) * 10),
              points_possible: 10
            });

          if (contentError) {
            console.error('❌ Error storing content skill score:', contentError);
          } else {
            skillUpdates.push(contentSkillUpdate);
            console.log('✅ Content skill score stored with authenticated student link');
          }
        }
      }

      // Process subject skill updates
      if (skillType === 'subject') {
        const subjectSkillUpdate = await this.calculateSubjectSkillUpdate(
          authenticatedStudentId,
          skillName,
          exerciseScore,
          existingSubjectSkills
        );

        if (subjectSkillUpdate) {
          // Store subject skill score with authenticated student linking
          const { error: subjectError } = await supabase
            .from('subject_skill_scores')
            .insert({
              authenticated_student_id: authenticatedStudentId,
              practice_exercise_id: exerciseId,
              skill_name: skillName,
              score: subjectSkillUpdate.updatedScore,
              points_earned: Math.round((subjectSkillUpdate.updatedScore / 100) * 10),
              points_possible: 10
            });

          if (subjectError) {
            console.error('❌ Error storing subject skill score:', subjectError);
          } else {
            skillUpdates.push(subjectSkillUpdate);
            console.log('✅ Subject skill score stored with authenticated student link');
          }
        }
      }

      console.log('🎉 Practice exercise completion processed successfully:', {
        authenticatedStudentId,
        skillUpdates: skillUpdates.length
      });

      return {
        success: true,
        skillUpdates
      };

    } catch (error) {
      console.error('❌ Error processing practice exercise completion:', error);
      return {
        success: false,
        skillUpdates: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }
}

export const practiceExerciseSkillService = new PracticeExerciseSkillService();
