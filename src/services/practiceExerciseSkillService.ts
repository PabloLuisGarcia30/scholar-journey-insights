import { supabase } from "@/integrations/supabase/client";
import { studentIdIntegration } from "./studentIdIntegrationService";

export interface SkillScoreCalculation {
  skillName: string;
  currentScore: number;
  exerciseScore: number;
  updatedScore: number;
  skillType?: string;
}

export class PracticeExerciseSkillService {
  /**
   * Get student's content skills
   */
  static async getStudentContentSkills(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('content_skill_scores')
        .select('*')
        .eq('student_id', studentId);

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
   * Get student's subject skills
   */
  static async getStudentSubjectSkills(studentId: string): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('subject_skill_scores')
        .select('*')
        .eq('student_id', studentId);

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
    studentId: string,
    skillName: string,
    exerciseScore: number,
    existingSkills: any[]
  ): Promise<SkillScoreCalculation | null> {
    try {
      const currentSkill = existingSkills.find(skill => skill.skill_name === skillName);
      const currentScore = currentSkill ? currentSkill.score : 0;
      const updatedScore = Math.min(100, currentScore + exerciseScore);

      console.log('📈 Calculating content skill update:', {
        studentId,
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
    studentId: string,
    skillName: string,
    exerciseScore: number,
    existingSkills: any[]
  ): Promise<SkillScoreCalculation | null> {
    try {
      const currentSkill = existingSkills.find(skill => skill.skill_name === skillName);
      const currentScore = currentSkill ? currentSkill.score : 0;
      const updatedScore = Math.min(100, currentScore + exerciseScore);

      console.log('📈 Calculating subject skill update:', {
        studentId,
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
   * Enhanced practice exercise completion with Student ID integration
   */
  static async processPracticeExerciseCompletion({
    studentId,
    exerciseId,
    skillName,
    exerciseScore,
    exerciseData
  }: {
    studentId: string;
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
      console.log('🎯 Processing practice exercise completion with Student ID integration:', {
        studentId,
        exerciseId,
        skillName,
        exerciseScore
      });

      // Step 1: Ensure student has proper Student ID integration
      const studentResult = await studentIdIntegration.getOrCreateProfile(
        exerciseData?.studentName || 'Unknown Student',
        exerciseData?.classId,
        exerciseData?.email,
        exerciseData?.gradeLevel
      );

      if (!studentResult.success) {
        throw new Error(`Student ID integration failed: ${studentResult.error}`);
      }

      console.log('✅ Student ID integration completed:', {
        studentId: studentResult.studentId,
        profileId: studentResult.studentProfileId
      });

      // Step 2: Get existing skill scores for comparison
      const existingContentSkills = await this.getStudentContentSkills(studentResult.studentProfileId);
      const existingSubjectSkills = await this.getStudentSubjectSkills(studentResult.studentProfileId);

      // Step 3: Calculate skill updates with Student ID linking
      const skillUpdates: SkillScoreCalculation[] = [];

      // Process content skill updates
      const skillType = exerciseData?.skillType || exerciseData?.metadata?.skillType;
      if (skillType === 'content' || !skillType) {
        const contentSkillUpdate = await this.calculateContentSkillUpdate(
          studentResult.studentProfileId,
          skillName,
          exerciseScore,
          existingContentSkills
        );

        if (contentSkillUpdate) {
          // Store content skill score with Student ID linking
          const { error: contentError } = await supabase
            .from('content_skill_scores')
            .insert({
              student_id: studentResult.studentProfileId, // Link to student profile
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
            console.log('✅ Content skill score stored with Student ID link');
          }
        }
      }

      // Process subject skill updates
      if (skillType === 'subject') {
        const subjectSkillUpdate = await this.calculateSubjectSkillUpdate(
          studentResult.studentProfileId,
          skillName,
          exerciseScore,
          existingSubjectSkills
        );

        if (subjectSkillUpdate) {
          // Store subject skill score with Student ID linking
          const { error: subjectError } = await supabase
            .from('subject_skill_scores')
            .insert({
              student_id: studentResult.studentProfileId, // Link to student profile
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
            console.log('✅ Subject skill score stored with Student ID link');
          }
        }
      }

      console.log('🎉 Practice exercise completion processed successfully:', {
        studentId: studentResult.studentId,
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
