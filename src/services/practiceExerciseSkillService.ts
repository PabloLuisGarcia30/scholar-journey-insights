
import { supabase } from "@/integrations/supabase/client";

export interface PracticeExerciseSkillUpdate {
  studentId: string;
  studentProfileId?: string;
  exerciseId: string;
  skillName: string;
  exerciseScore: number;
  exerciseData: any;
}

export interface SkillScoreCalculation {
  skillName: string;
  skillType: 'content' | 'subject';
  currentScore: number;
  newScore: number;
  updatedScore: number;
  attemptsCount: number;
}

export class PracticeExerciseSkillService {
  
  /**
   * Process skill score updates when a practice exercise is completed
   */
  async processPracticeExerciseCompletion(update: PracticeExerciseSkillUpdate): Promise<{
    success: boolean;
    skillUpdates: SkillScoreCalculation[];
    error?: string;
  }> {
    try {
      console.log('🎯 Processing practice exercise skill updates for:', update.skillName);
      
      // Get student profile ID if not provided
      const studentProfileId = update.studentProfileId || await this.getStudentProfileId(update.studentId);
      
      if (!studentProfileId) {
        throw new Error('Student profile not found');
      }

      // Analyze exercise to extract skill scores
      const skillScores = await this.analyzeExerciseForSkillScores(update);
      
      // Calculate updated skill scores
      const skillUpdates: SkillScoreCalculation[] = [];
      
      for (const skillScore of skillScores) {
        const currentSkillData = await this.getCurrentSkillScore(studentProfileId, skillScore.skillName, skillScore.skillType);
        
        const updatedScore = await this.calculateUpdatedSkillScore(
          currentSkillData.currentScore || 0,
          skillScore.score,
          currentSkillData.attemptsCount || 0
        );

        skillUpdates.push({
          skillName: skillScore.skillName,
          skillType: skillScore.skillType,
          currentScore: currentSkillData.currentScore || 0,
          newScore: skillScore.score,
          updatedScore,
          attemptsCount: currentSkillData.attemptsCount || 0
        });

        // Insert new skill score record
        await this.insertPracticeExerciseSkillScore(
          studentProfileId,
          update.exerciseId,
          skillScore.skillName,
          skillScore.skillType,
          updatedScore,
          skillScore.pointsEarned,
          skillScore.pointsPossible
        );
      }

      console.log('✅ Successfully processed skill updates:', skillUpdates.length);
      
      return {
        success: true,
        skillUpdates
      };

    } catch (error) {
      console.error('❌ Error processing practice exercise skill updates:', error);
      return {
        success: false,
        skillUpdates: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Analyze practice exercise to extract skill-based scores
   */
  private async analyzeExerciseForSkillScores(update: PracticeExerciseSkillUpdate): Promise<Array<{
    skillName: string;
    skillType: 'content' | 'subject';
    score: number;
    pointsEarned: number;
    pointsPossible: number;
  }>> {
    // For now, we'll create a simple mapping based on the exercise data
    // In a real implementation, this could use AI to analyze the questions
    
    const exerciseData = update.exerciseData;
    const totalQuestions = exerciseData?.questions?.length || 5;
    const scorePercentage = update.exerciseScore;
    
    // Calculate points based on score percentage
    const pointsEarned = Math.round((scorePercentage / 100) * totalQuestions);
    const pointsPossible = totalQuestions;

    // Return skill scores - we'll primarily focus on the target skill
    return [
      {
        skillName: update.skillName,
        skillType: 'content', // Default to content skill for practice exercises
        score: scorePercentage,
        pointsEarned,
        pointsPossible
      }
    ];
  }

  /**
   * Get student profile ID from active student ID
   */
  private async getStudentProfileId(studentId: string): Promise<string | null> {
    try {
      // First get the student name from active_students
      const { data: activeStudent, error: activeError } = await supabase
        .from('active_students')
        .select('name')
        .eq('id', studentId)
        .maybeSingle();

      if (activeError || !activeStudent) {
        console.error('Error fetching active student:', activeError);
        return null;
      }

      // Then find the student profile
      const { data: studentProfile, error: profileError } = await supabase
        .from('student_profiles')
        .select('id')
        .eq('student_name', activeStudent.name)
        .maybeSingle();

      if (profileError) {
        console.error('Error fetching student profile:', profileError);
        return null;
      }

      return studentProfile?.id || null;
    } catch (error) {
      console.error('Error getting student profile ID:', error);
      return null;
    }
  }

  /**
   * Get current skill score for a student
   */
  private async getCurrentSkillScore(studentProfileId: string, skillName: string, skillType: 'content' | 'subject'): Promise<{
    currentScore: number | null;
    attemptsCount: number;
  }> {
    try {
      const { data, error } = await supabase.rpc('get_student_current_skill_scores', {
        student_uuid: studentProfileId
      });

      if (error) {
        console.error('Error getting current skill scores:', error);
        return { currentScore: null, attemptsCount: 0 };
      }

      const skillData = data?.find((skill: any) => 
        skill.skill_name === skillName && skill.skill_type === skillType
      );

      return {
        currentScore: skillData?.current_score || null,
        attemptsCount: skillData?.attempts_count || 0
      };
    } catch (error) {
      console.error('Error in getCurrentSkillScore:', error);
      return { currentScore: null, attemptsCount: 0 };
    }
  }

  /**
   * Calculate updated skill score using database function
   */
  private async calculateUpdatedSkillScore(
    currentScore: number,
    newScore: number,
    currentAttempts: number
  ): Promise<number> {
    try {
      const { data, error } = await supabase.rpc('calculate_updated_skill_score', {
        current_score: currentScore,
        new_score: newScore,
        current_attempts: currentAttempts,
        recency_weight: 0.3 // Give 30% weight to recent practice exercises
      });

      if (error) {
        console.error('Error calculating updated skill score:', error);
        // Fallback to simple average
        return Math.round((currentScore + newScore) / 2);
      }

      return data;
    } catch (error) {
      console.error('Error in calculateUpdatedSkillScore:', error);
      // Fallback to simple average
      return Math.round((currentScore + newScore) / 2);
    }
  }

  /**
   * Insert practice exercise skill score record
   */
  private async insertPracticeExerciseSkillScore(
    studentProfileId: string,
    exerciseId: string,
    skillName: string,
    skillType: 'content' | 'subject',
    score: number,
    pointsEarned: number,
    pointsPossible: number
  ): Promise<void> {
    try {
      // Create a mock test result for practice exercises
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          student_id: studentProfileId,
          exam_id: `practice_exercise_${exerciseId}`,
          class_id: '', // Empty for practice exercises
          overall_score: score,
          total_points_earned: pointsEarned,
          total_points_possible: pointsPossible,
          ai_feedback: 'Practice exercise completed'
        })
        .select('id')
        .single();

      if (testError || !testResult) {
        throw new Error(`Failed to create test result: ${testError?.message}`);
      }

      // Insert skill score record
      const skillTable = skillType === 'content' ? 'content_skill_scores' : 'subject_skill_scores';
      
      const { error: skillError } = await supabase
        .from(skillTable)
        .insert({
          test_result_id: testResult.id,
          practice_exercise_id: exerciseId,
          skill_name: skillName,
          score: score,
          points_earned: pointsEarned,
          points_possible: pointsPossible
        });

      if (skillError) {
        throw new Error(`Failed to insert skill score: ${skillError.message}`);
      }

      console.log(`✅ Inserted ${skillType} skill score for ${skillName}: ${score}%`);
      
    } catch (error) {
      console.error('Error inserting practice exercise skill score:', error);
      throw error;
    }
  }

  /**
   * Get skill score history for a student including practice exercises
   */
  async getStudentSkillHistory(studentId: string, skillName: string): Promise<Array<{
    score: number;
    source: 'test' | 'practice_exercise';
    date: string;
    exerciseId?: string;
  }>> {
    try {
      const studentProfileId = await this.getStudentProfileId(studentId);
      if (!studentProfileId) return [];

      // Get content skill scores
      const { data: contentScores, error: contentError } = await supabase
        .from('content_skill_scores')
        .select(`
          score,
          created_at,
          practice_exercise_id,
          test_results!inner(exam_id)
        `)
        .eq('skill_name', skillName)
        .order('created_at', { ascending: false });

      if (contentError) {
        console.error('Error fetching content skill history:', contentError);
        return [];
      }

      // Get subject skill scores
      const { data: subjectScores, error: subjectError } = await supabase
        .from('subject_skill_scores')
        .select(`
          score,
          created_at,
          practice_exercise_id,
          test_results!inner(exam_id)
        `)
        .eq('skill_name', skillName)
        .order('created_at', { ascending: false });

      if (subjectError) {
        console.error('Error fetching subject skill history:', subjectError);
        return [];
      }

      // Combine and format results
      const allScores = [...(contentScores || []), ...(subjectScores || [])];
      
      return allScores.map((score: any) => ({
        score: score.score,
        source: score.practice_exercise_id ? 'practice_exercise' as const : 'test' as const,
        date: score.created_at,
        exerciseId: score.practice_exercise_id
      })).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    } catch (error) {
      console.error('Error getting student skill history:', error);
      return [];
    }
  }
}

// Export singleton instance
export const practiceExerciseSkillService = new PracticeExerciseSkillService();
