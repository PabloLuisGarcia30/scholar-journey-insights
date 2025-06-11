import { supabase } from '@/integrations/supabase/client';
import { EnhancedMistakePatternService, type EnhancedMistakePatternData } from './enhancedMistakePatternService';

export interface MistakePatternData {
  id: string;
  student_exercise_id: string;
  question_id: string;
  question_number: number;
  question_type?: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  mistake_type?: string;
  skill_targeted: string;
  confidence_score?: number;
  grading_method?: 'exact_match' | 'flexible_match' | 'ai_graded';
  feedback_given?: string;
  created_at: string;
}

export interface MistakePattern {
  skill_name: string;
  mistake_type: string;
  mistake_count: number;
  total_questions: number;
  mistake_rate: number;
}

export class MistakePatternService {
  
  /**
   * Record a mistake pattern with enhanced analysis
   */
  static async recordMistakePattern(mistakeData: {
    studentExerciseId: string;
    questionId: string;
    questionNumber: number;
    questionType?: string;
    studentAnswer: string;
    correctAnswer: string;
    isCorrect: boolean;
    skillTargeted: string;
    mistakeType?: string;
    confidenceScore?: number;
    gradingMethod?: 'exact_match' | 'flexible_match' | 'ai_graded';
    feedbackGiven?: string;
    questionContext?: string;
    timeSpent?: number;
    answerChanges?: number;
    options?: string[];
  }): Promise<string | null> {
    try {
      console.log(`🔍 Recording mistake pattern for question ${mistakeData.questionNumber}`);
      
      // Enhance the mistake data with detailed analysis
      const enhancedData: EnhancedMistakePatternData = {
        ...mistakeData,
        misconceptionCategory: EnhancedMistakePatternService.analyzeMisconceptionCategory(
          mistakeData.questionType || 'unknown',
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.questionContext,
          mistakeData.options
        ),
        errorSeverity: EnhancedMistakePatternService.determineErrorSeverity(
          mistakeData.isCorrect,
          mistakeData.questionType || 'unknown',
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.timeSpent,
          mistakeData.answerChanges
        ),
        errorPersistenceCount: 1, // Will be updated if this is a recurring pattern
        cognitiveLoadIndicators: {
          timeSpent: mistakeData.timeSpent,
          answerChanges: mistakeData.answerChanges,
          questionComplexity: mistakeData.correctAnswer.length
        },
        contextWhenErrorOccurred: {
          timestamp: new Date().toISOString(),
          questionPosition: mistakeData.questionNumber,
          questionType: mistakeData.questionType
        }
      };

      // Use enhanced service for recording
      return await EnhancedMistakePatternService.recordEnhancedMistakePattern(enhancedData);
    } catch (error) {
      console.error('❌ Exception in recordMistakePattern:', error);
      return null;
    }
  }

  /**
   * Analyze mistake type based on question type and answers
   */
  static analyzeMistakeType(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    options?: string[]
  ): string {
    if (!studentAnswer || studentAnswer.trim() === '') {
      return 'no_answer';
    }

    switch (questionType) {
      case 'multiple-choice':
        if (options && options.includes(studentAnswer)) {
          return 'wrong_option_selected';
        }
        return 'invalid_selection';
      
      case 'true-false':
        return 'opposite_chosen';
      
      case 'short-answer':
        const studentLower = studentAnswer.toLowerCase().trim();
        const correctLower = correctAnswer.toLowerCase().trim();
        
        if (studentLower.length < correctLower.length * 0.5) {
          return 'incomplete_answer';
        } else if (studentLower.includes(correctLower.substring(0, 3))) {
          return 'partial_understanding';
        } else {
          return 'conceptual_error';
        }
      
      case 'essay':
        if (studentAnswer.length < 50) {
          return 'insufficient_detail';
        } else if (studentAnswer.length < correctAnswer.length * 0.7) {
          return 'incomplete_response';
        } else {
          return 'conceptual_misunderstanding';
        }
      
      default:
        return 'unknown_error';
    }
  }

  /**
   * Get mistake patterns for a student
   */
  static async getStudentMistakePatterns(
    studentId: string, 
    skillFilter?: string
  ): Promise<MistakePattern[]> {
    try {
      console.log(`📊 Fetching mistake patterns for student: ${studentId}`);
      
      const { data, error } = await supabase.rpc('get_student_mistake_patterns', {
        student_uuid: studentId,
        skill_filter: skillFilter || null
      });

      if (error) {
        console.error('❌ Error fetching mistake patterns:', error);
        return [];
      }

      console.log(`✅ Retrieved ${data?.length || 0} mistake patterns`);
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getStudentMistakePatterns:', error);
      return [];
    }
  }

  /**
   * Get detailed mistake data for an exercise
   */
  static async getExerciseMistakeData(studentExerciseId: string): Promise<MistakePatternData[]> {
    try {
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('*')
        .eq('student_exercise_id', studentExerciseId)
        .order('question_number');

      if (error) {
        console.error('❌ Error fetching exercise mistake data:', error);
        return [];
      }

      return (data || []) as MistakePatternData[];
    } catch (error) {
      console.error('❌ Exception in getExerciseMistakeData:', error);
      return [];
    }
  }

  /**
   * Get most common mistakes across all students for a skill
   */
  static async getSkillMistakePatterns(skillName: string): Promise<{
    mistake_type: string;
    count: number;
    percentage: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('mistake_type')
        .eq('skill_targeted', skillName)
        .eq('is_correct', false);

      if (error) {
        console.error('❌ Error fetching skill mistake patterns:', error);
        return [];
      }

      // Count occurrences of each mistake type
      const mistakeCounts: Record<string, number> = {};
      const total = data.length;

      data.forEach(record => {
        const mistakeType = record.mistake_type || 'unknown';
        mistakeCounts[mistakeType] = (mistakeCounts[mistakeType] || 0) + 1;
      });

      // Convert to array and calculate percentages
      return Object.entries(mistakeCounts)
        .map(([mistake_type, count]) => ({
          mistake_type,
          count,
          percentage: Math.round((count / total) * 100)
        }))
        .sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Exception in getSkillMistakePatterns:', error);
      return [];
    }
  }

  /**
   * Get mistake patterns grouped by question type for better analytics
   */
  static async getSkillMistakePatternsByType(skillName: string): Promise<{
    question_type: string;
    mistake_type: string;
    count: number;
    percentage: number;
  }[]> {
    try {
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('question_type, mistake_type')
        .eq('skill_targeted', skillName)
        .eq('is_correct', false)
        .not('question_type', 'is', null);

      if (error) {
        console.error('❌ Error fetching skill mistake patterns by type:', error);
        return [];
      }

      // Group by question type and mistake type
      const groupedCounts: Record<string, Record<string, number>> = {};
      const typeTotals: Record<string, number> = {};

      data.forEach(record => {
        const questionType = record.question_type || 'unknown';
        const mistakeType = record.mistake_type || 'unknown';
        
        if (!groupedCounts[questionType]) {
          groupedCounts[questionType] = {};
          typeTotals[questionType] = 0;
        }
        
        groupedCounts[questionType][mistakeType] = (groupedCounts[questionType][mistakeType] || 0) + 1;
        typeTotals[questionType]++;
      });

      // Convert to array format with percentages
      const results: {
        question_type: string;
        mistake_type: string;
        count: number;
        percentage: number;
      }[] = [];

      Object.entries(groupedCounts).forEach(([questionType, mistakes]) => {
        const total = typeTotals[questionType];
        Object.entries(mistakes).forEach(([mistakeType, count]) => {
          results.push({
            question_type: questionType,
            mistake_type: mistakeType,
            count,
            percentage: Math.round((count / total) * 100)
          });
        });
      });

      return results.sort((a, b) => b.count - a.count);
    } catch (error) {
      console.error('❌ Exception in getSkillMistakePatternsByType:', error);
      return [];
    }
  }
}
