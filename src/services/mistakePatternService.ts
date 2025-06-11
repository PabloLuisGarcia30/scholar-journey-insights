
import { supabase } from '@/integrations/supabase/client';
import { ConceptMissedService } from './conceptMissedService';
import { ConceptualAnchorService } from './conceptualAnchorService';

export interface MistakePatternData {
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
  options?: string[];
  
  // Enhanced context for concept detection
  subject?: string;
  grade?: string;
  questionText?: string;
}

export interface ConceptualMasteryData {
  concept: string;
  mastery_level: string;
  demonstration_count: number;
  latest_demonstration: string;
  related_skills: string[];
}

export interface MistakePatternRecord {
  id: string;
  student_exercise_id: string;
  question_id: string;
  question_number: number;
  question_type?: string;
  student_answer: string;
  correct_answer: string;
  is_correct: boolean;
  skill_targeted: string;
  mistake_type?: string;
  confidence_score?: number;
  grading_method?: string;
  feedback_given?: string;
  question_context?: string;
  expected_concept?: string;
  concept_mastery_level?: string;
  concept_source?: string;
  context_when_error_occurred?: any;
  created_at: string;
}

export class MistakePatternService {
  
  /**
   * Enhanced mistake pattern recording with concept detection
   */
  static async recordMistakePattern(mistakeData: MistakePatternData): Promise<string | null> {
    try {
      console.log(`🔍 Recording mistake pattern for question ${mistakeData.questionNumber}`);
      
      // Detect missed concept if answer is incorrect
      let expectedConcept = null;
      let conceptMasteryLevel = 'unknown';
      let conceptSource = 'skill_mapping';
      
      if (!mistakeData.isCorrect && mistakeData.subject && mistakeData.grade) {
        console.log('🧠 Detecting missed concept via GPT...');
        
        const conceptAnalysis = await ConceptMissedService.detectMissedConcept(
          mistakeData.questionText || mistakeData.questionContext || '',
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.subject,
          mistakeData.grade,
          mistakeData.questionContext,
          mistakeData.skillTargeted
        );
        
        expectedConcept = conceptAnalysis.concept_missed;
        conceptSource = conceptAnalysis.is_new_concept ? 'gpt_inference' : 'curriculum_mapping';
        
        // Assess concept mastery level
        conceptMasteryLevel = this.assessConceptMasteryLevel(
          mistakeData.isCorrect,
          conceptAnalysis.confidence,
          mistakeData.confidenceScore
        );
        
        console.log(`✅ Detected concept: "${expectedConcept}" (${conceptSource})`);
      } else if (!mistakeData.isCorrect) {
        // Fall back to conceptual anchor service for concept detection
        try {
          const conceptMapping = await ConceptualAnchorService.determineConceptualAnchor(
            mistakeData.questionText || mistakeData.questionContext || '',
            mistakeData.skillTargeted,
            mistakeData.subject || 'Math',
            mistakeData.grade || 'Grade 8',
            mistakeData.studentAnswer,
            mistakeData.correctAnswer,
            mistakeData.questionContext
          );
          
          expectedConcept = conceptMapping.expectedConcept;
          conceptSource = conceptMapping.source;
          conceptMasteryLevel = conceptMapping.masteryLevel;
        } catch (error) {
          console.warn('⚠️ Fallback concept detection failed:', error);
        }
      }
      
      // Record in database with enhanced concept data
      const { data, error } = await supabase
        .from('mistake_patterns')
        .insert({
          student_exercise_id: mistakeData.studentExerciseId,
          question_id: mistakeData.questionId,
          question_number: mistakeData.questionNumber,
          question_type: mistakeData.questionType,
          student_answer: mistakeData.studentAnswer,
          correct_answer: mistakeData.correctAnswer,
          is_correct: mistakeData.isCorrect,
          mistake_type: mistakeData.mistakeType,
          skill_targeted: mistakeData.skillTargeted,
          confidence_score: mistakeData.confidenceScore,
          grading_method: mistakeData.gradingMethod,
          feedback_given: mistakeData.feedbackGiven,
          question_context: mistakeData.questionContext,
          
          // Enhanced concept fields
          expected_concept: expectedConcept,
          concept_mastery_level: conceptMasteryLevel,
          concept_source: conceptSource,
          
          // Store additional context for analytics
          context_when_error_occurred: {
            subject: mistakeData.subject,
            grade: mistakeData.grade,
            question_text: mistakeData.questionText,
            options: mistakeData.options
          }
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error recording mistake pattern:', error);
        return null;
      }

      console.log(`✅ Mistake pattern recorded: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in recordMistakePattern:', error);
      return null;
    }
  }
  
  /**
   * Assess concept mastery level based on performance and confidence
   */
  private static assessConceptMasteryLevel(
    isCorrect: boolean,
    conceptConfidence: number,
    answerConfidence?: number
  ): 'mastered' | 'partial' | 'not_demonstrated' | 'unknown' {
    if (isCorrect) {
      if ((answerConfidence || 0.8) > 0.8) {
        return 'mastered';
      } else {
        return 'partial';
      }
    }
    
    // For incorrect answers, consider concept detection confidence
    if (conceptConfidence > 0.8) {
      return 'not_demonstrated'; // High confidence that specific concept was missed
    } else if (conceptConfidence > 0.5) {
      return 'partial'; // Some understanding but gaps
    } else {
      return 'unknown'; // Low confidence in what was missed
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
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    if (questionType === 'multiple-choice') {
      if (options && options.includes(studentAnswer)) {
        const correctIndex = options.indexOf(correctAnswer);
        const studentIndex = options.indexOf(studentAnswer);
        
        if (Math.abs(correctIndex - studentIndex) === 1) {
          return 'adjacent_selection';
        } else {
          return 'conceptual_confusion';
        }
      }
      return 'random_guess';
    }

    if (questionType === 'true-false') {
      return studentLower === correctLower ? 'correct' : 'opposite_logic';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (studentLower.length < correctLower.length * 0.3) {
        return 'insufficient_detail';
      } else if (studentLower.includes('not') || studentLower.includes('opposite')) {
        return 'inverse_reasoning';
      } else if (this.containsNumberError(studentAnswer, correctAnswer)) {
        return 'calculation_error';
      } else {
        return 'conceptual_misunderstanding';
      }
    }

    return 'unknown_mistake';
  }

  /**
   * Get mistake patterns for a student
   */
  static async getStudentMistakePatterns(
    studentId: string, 
    skillFilter?: string
  ): Promise<MistakePatternRecord[]> {
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

      return (data || []).map((item: any) => ({
        studentExerciseId: item.student_exercise_id,
        questionId: item.question_id,
        questionNumber: item.question_number,
        questionType: item.question_type,
        studentAnswer: item.student_answer,
        correctAnswer: item.correct_answer,
        isCorrect: item.is_correct,
        skillTargeted: item.skill_targeted,
        mistakeType: item.mistake_type,
        confidenceScore: item.confidence_score,
        gradingMethod: item.grading_method,
        feedbackGiven: item.feedback_given,
        questionContext: item.question_context,
        subject: item.context_when_error_occurred?.subject,
        grade: item.context_when_error_occurred?.grade,
        questionText: item.context_when_error_occurred?.question_text
      }));
    } catch (error) {
      console.error('❌ Exception in getExerciseMistakeData:', error);
      return [];
    }
  }

  /**
   * Get conceptual mastery data for a student
   */
  static async getStudentConceptualMastery(
    studentId: string,
    subjectFilter?: string
  ): Promise<ConceptualMasteryData[]> {
    try {
      console.log(`🧠 Fetching conceptual mastery data for student: ${studentId}`);
      
      // Use direct query since the RPC function doesn't exist yet
      let query = supabase
        .from('mistake_patterns')
        .select(`
          expected_concept,
          concept_mastery_level,
          skill_targeted,
          created_at,
          student_exercises!inner(student_id)
        `)
        .eq('student_exercises.student_id', studentId)
        .not('expected_concept', 'is', null);
      
      if (subjectFilter) {
        query = query.contains('context_when_error_occurred', { subject: subjectFilter });
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching conceptual mastery:', error);
        return [];
      }

      // Group by concept and calculate mastery
      const conceptGroups: Record<string, any[]> = {};
      (data || []).forEach((item: any) => {
        if (item.expected_concept) {
          if (!conceptGroups[item.expected_concept]) {
            conceptGroups[item.expected_concept] = [];
          }
          conceptGroups[item.expected_concept].push(item);
        }
      });

      return Object.entries(conceptGroups).map(([concept, items]) => {
        const latestItem = items.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        )[0];
        
        const masteryLevels = items.map(item => item.concept_mastery_level);
        const mostCommonMastery = masteryLevels.sort((a, b) =>
          masteryLevels.filter(v => v === a).length - masteryLevels.filter(v => v === b).length
        ).pop() || 'unknown';
        
        const relatedSkills = [...new Set(items.map(item => item.skill_targeted))];

        return {
          concept,
          mastery_level: mostCommonMastery,
          demonstration_count: items.length,
          latest_demonstration: latestItem.created_at,
          related_skills: relatedSkills
        };
      });
    } catch (error) {
      console.error('❌ Exception in getStudentConceptualMastery:', error);
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

  /**
   * Get conceptual anchor analysis for a skill
   */
  static async getSkillConceptualAnchorAnalysis(skillName: string): Promise<{
    expected_concept: string;
    mastery_distribution: {
      mastered: number;
      partial: number;
      not_demonstrated: number;
      unknown: number;
    };
    total_demonstrations: number;
    mastery_rate: number;
  }[]> {
    try {
      // Use direct query since the RPC function doesn't exist yet
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('expected_concept, concept_mastery_level')
        .eq('skill_targeted', skillName)
        .not('expected_concept', 'is', null);

      if (error) {
        console.error('❌ Error fetching skill concept analysis:', error);
        return [];
      }

      // Group by concept and calculate mastery distribution
      const conceptGroups: Record<string, string[]> = {};
      (data || []).forEach((item: any) => {
        if (item.expected_concept) {
          if (!conceptGroups[item.expected_concept]) {
            conceptGroups[item.expected_concept] = [];
          }
          conceptGroups[item.expected_concept].push(item.concept_mastery_level || 'unknown');
        }
      });

      return Object.entries(conceptGroups).map(([expectedConcept, masteryLevels]) => {
        const distribution = {
          mastered: masteryLevels.filter(level => level === 'mastered').length,
          partial: masteryLevels.filter(level => level === 'partial').length,
          not_demonstrated: masteryLevels.filter(level => level === 'not_demonstrated').length,
          unknown: masteryLevels.filter(level => level === 'unknown').length
        };
        
        const totalDemonstrations = masteryLevels.length;
        const masteryRate = totalDemonstrations > 0 
          ? (distribution.mastered / totalDemonstrations) * 100 
          : 0;

        return {
          expected_concept: expectedConcept,
          mastery_distribution: distribution,
          total_demonstrations: totalDemonstrations,
          mastery_rate: Math.round(masteryRate * 100) / 100
        };
      });
    } catch (error) {
      console.error('❌ Exception in getSkillConceptualAnchorAnalysis:', error);
      return [];
    }
  }

  /**
   * Helper method to check for number errors in student answer
   */
  private static containsNumberError(studentAnswer: string, correctAnswer: string): boolean {
    const numberPattern = /\d+/g;
    const studentNumbers = studentAnswer.match(numberPattern);
    const correctNumbers = correctAnswer.match(numberPattern);
    
    return !!(studentNumbers && correctNumbers && 
             studentNumbers.length > 0 && correctNumbers.length > 0);
  }
}
