import { supabase } from '@/integrations/supabase/client';
import { EnhancedMistakePatternService, type EnhancedMistakePatternData } from './enhancedMistakePatternService';
import { ConceptualAnchorService } from './conceptualAnchorService';
import { MisconceptionSignatureService } from './misconceptionSignatureService';
import { ConceptMissedService } from './conceptMissedService';

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
  expected_concept?: string;
  concept_mastery_level?: 'mastered' | 'partial' | 'not_demonstrated' | 'unknown';
  concept_source?: 'curriculum_mapping' | 'gpt_inference' | 'manual_tag' | 'skill_mapping';
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
   * Record a mistake pattern with enhanced analysis including confidence scores
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
    subject?: string;
    classSubject?: string;
    expectedConcept?: string;
    grade?: string;
    // NEW: Updated concept missed fields with confidence
    conceptMissedId?: string;
    conceptMissedDescription?: string;
    conceptConfidence?: number; // NEW: GPT confidence score
  }): Promise<string | null> {
    try {
      console.log(`🔍 Recording mistake pattern for question ${mistakeData.questionNumber}`);
      
      // Determine subject from available data
      const subject = mistakeData.subject || mistakeData.classSubject || 'Unknown';
      const grade = mistakeData.grade || 'Unknown';
      
      // If we have a concept missed but no confidence, try to get it from ConceptMissedService
      let conceptConfidence = mistakeData.conceptConfidence;
      if (mistakeData.conceptMissedDescription && !conceptConfidence && mistakeData.questionContext) {
        console.log('🎯 Getting confidence score for concept detection');
        const analysisResult = await ConceptMissedService.analyzeConceptMissed(
          mistakeData.questionContext,
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.skillTargeted,
          subject,
          grade
        );
        conceptConfidence = analysisResult.conceptConfidence;
      }
      
      // Determine conceptual anchor point if not provided
      let expectedConcept = mistakeData.expectedConcept;
      let conceptSource: 'curriculum_mapping' | 'gpt_inference' | 'manual_tag' | 'skill_mapping' = 'manual_tag';
      
      if (!expectedConcept) {
        // Use ConceptualAnchorService to determine the concept
        const conceptResult = await ConceptualAnchorService.determineConceptualAnchor(
          mistakeData.questionContext || mistakeData.correctAnswer,
          mistakeData.skillTargeted,
          subject,
          grade,
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.questionContext
        );
        
        expectedConcept = conceptResult.expectedConcept;
        conceptSource = conceptResult.source;
      }
      
      // Assess concept mastery level
      const conceptMasteryLevel = ConceptualAnchorService.assessConceptMastery(
        mistakeData.isCorrect,
        mistakeData.studentAnswer,
        mistakeData.correctAnswer,
        mistakeData.questionType || 'unknown',
        mistakeData.confidenceScore
      );
      
      // Generate misconception signature if we have a concept missed description
      let misconceptionSignature: string | undefined;
      if (mistakeData.conceptMissedDescription) {
        misconceptionSignature = MisconceptionSignatureService.generateSignature(mistakeData.conceptMissedDescription);
        console.log(`🔗 Generated misconception signature: "${misconceptionSignature}"`);
      }
      
      console.log(`🧠 Conceptual anchor point: "${expectedConcept}" - Mastery: ${conceptMasteryLevel}`);
      if (mistakeData.conceptMissedId) {
        console.log(`🎯 Concept missed: ID ${mistakeData.conceptMissedId} - "${mistakeData.conceptMissedDescription}" (Confidence: ${conceptConfidence || 'N/A'})`);
      }
      
      // Enhance the mistake data with detailed analysis including confidence
      const enhancedData: EnhancedMistakePatternData = {
        ...mistakeData,
        misconceptionCategory: EnhancedMistakePatternService.analyzeMisconceptionCategory(
          mistakeData.questionType || 'unknown',
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.questionContext,
          mistakeData.options,
          subject
        ),
        errorSeverity: EnhancedMistakePatternService.determineErrorSeverity(
          mistakeData.isCorrect,
          mistakeData.questionType || 'unknown',
          mistakeData.studentAnswer,
          mistakeData.correctAnswer,
          mistakeData.timeSpent,
          mistakeData.answerChanges
        ),
        errorPersistenceCount: 1,
        cognitiveLoadIndicators: {
          timeSpent: mistakeData.timeSpent,
          answerChanges: mistakeData.answerChanges,
          questionComplexity: mistakeData.correctAnswer.length
        },
        contextWhenErrorOccurred: {
          timestamp: new Date().toISOString(),
          questionPosition: mistakeData.questionNumber,
          questionType: mistakeData.questionType,
          subject: subject
        },
        remediationSuggestions: EnhancedMistakePatternService.generateSubjectSpecificRemediation(
          subject,
          EnhancedMistakePatternService.analyzeMisconceptionCategory(
            mistakeData.questionType || 'unknown',
            mistakeData.studentAnswer,
            mistakeData.correctAnswer,
            mistakeData.questionContext,
            mistakeData.options,
            subject
          ),
          mistakeData.skillTargeted
        ),
        // Conceptual anchor fields
        expectedConcept: expectedConcept,
        conceptMasteryLevel: conceptMasteryLevel,
        conceptSource: conceptSource,
        // Concept missed data with confidence
        conceptMissedId: mistakeData.conceptMissedId,
        conceptMissedDescription: mistakeData.conceptMissedDescription,
        conceptConfidence: conceptConfidence, // NEW: Include confidence score
        // Misconception signature
        misconceptionSignature: misconceptionSignature
      };

      // Use enhanced service for recording
      const mistakePatternId = await EnhancedMistakePatternService.recordEnhancedMistakePattern(enhancedData);
      
      // Check for shared misconceptions and potentially trigger alerts
      if (misconceptionSignature && mistakePatternId) {
        const sharedCheck = await MisconceptionSignatureService.checkSharedMisconception(misconceptionSignature, 2);
        if (sharedCheck.isShared) {
          console.log(`🚨 Shared misconception detected: "${misconceptionSignature}" affects ${sharedCheck.studentCount} students`);
          // Future: This is where we could trigger teacher alerts
        }
      }
      
      return mistakePatternId;
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
   * Get conceptual mastery data for a student
   */
  static async getStudentConceptualMastery(
    studentId: string,
    subjectFilter?: string
  ): Promise<{
    concept: string;
    mastery_level: string;
    demonstration_count: number;
    latest_demonstration: string;
    related_skills: string[];
  }[]> {
    try {
      console.log(`🧠 Fetching conceptual mastery data for student: ${studentId}`);
      
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select(`
          expected_concept,
          concept_mastery_level,
          skill_targeted,
          created_at
        `)
        .eq('student_exercise_id', studentId)
        .not('expected_concept', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching conceptual mastery data:', error);
        return [];
      }

      // Process the data to group by concept
      const conceptMap = new Map<string, {
        concept: string;
        mastery_level: string;
        demonstration_count: number;
        latest_demonstration: string;
        related_skills: Set<string>;
      }>();

      data.forEach(record => {
        if (!record.expected_concept) return;
        
        if (!conceptMap.has(record.expected_concept)) {
          conceptMap.set(record.expected_concept, {
            concept: record.expected_concept,
            mastery_level: record.concept_mastery_level || 'unknown',
            demonstration_count: 1,
            latest_demonstration: record.created_at,
            related_skills: new Set([record.skill_targeted])
          });
        } else {
          const existing = conceptMap.get(record.expected_concept)!;
          existing.demonstration_count++;
          
          // Update mastery level if this is more recent
          if (new Date(record.created_at) > new Date(existing.latest_demonstration)) {
            existing.latest_demonstration = record.created_at;
            existing.mastery_level = record.concept_mastery_level || existing.mastery_level;
          }
          
          // Add to related skills
          existing.related_skills.add(record.skill_targeted);
        }
      });

      // Convert to array and transform Sets to arrays
      const result = Array.from(conceptMap.values()).map(item => ({
        ...item,
        related_skills: Array.from(item.related_skills)
      }));

      console.log(`✅ Retrieved conceptual mastery data for ${result.length} concepts`);
      return result;
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
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select(`
          expected_concept,
          concept_mastery_level
        `)
        .eq('skill_targeted', skillName)
        .not('expected_concept', 'is', null);

      if (error) {
        console.error('❌ Error fetching conceptual anchor analysis:', error);
        return [];
      }

      // Group by concept and analyze mastery distribution
      const conceptMap = new Map<string, {
        expected_concept: string;
        mastery_distribution: {
          mastered: number;
          partial: number;
          not_demonstrated: number;
          unknown: number;
        };
        total_demonstrations: number;
      }>();

      data.forEach(record => {
        if (!record.expected_concept) return;
        
        if (!conceptMap.has(record.expected_concept)) {
          conceptMap.set(record.expected_concept, {
            expected_concept: record.expected_concept,
            mastery_distribution: {
              mastered: record.concept_mastery_level === 'mastered' ? 1 : 0,
              partial: record.concept_mastery_level === 'partial' ? 1 : 0,
              not_demonstrated: record.concept_mastery_level === 'not_demonstrated' ? 1 : 0,
              unknown: record.concept_mastery_level === 'unknown' ? 1 : 0
            },
            total_demonstrations: 1
          });
        } else {
          const existing = conceptMap.get(record.expected_concept)!;
          existing.total_demonstrations++;
          
          // Update mastery distribution
          if (record.concept_mastery_level === 'mastered') {
            existing.mastery_distribution.mastered++;
          } else if (record.concept_mastery_level === 'partial') {
            existing.mastery_distribution.partial++;
          } else if (record.concept_mastery_level === 'not_demonstrated') {
            existing.mastery_distribution.not_demonstrated++;
          } else {
            existing.mastery_distribution.unknown++;
          }
        }
      });

      // Calculate mastery rates and convert to array
      const result = Array.from(conceptMap.values()).map(item => ({
        ...item,
        mastery_rate: (item.mastery_distribution.mastered + item.mastery_distribution.partial * 0.5) / 
                       item.total_demonstrations * 100
      }));

      return result.sort((a, b) => b.total_demonstrations - a.total_demonstrations);
    } catch (error) {
      console.error('❌ Exception in getSkillConceptualAnchorAnalysis:', error);
      return [];
    }
  }

  /**
   * Get student's missed concepts analysis
   */
  static async getStudentMissedConcepts(
    studentId: string,
    subjectFilter?: string
  ): Promise<{
    concept_id: string;
    concept_name: string;
    concept_description: string;
    miss_count: number;
    recent_description: string;
    last_missed: string;
    subject: string;
    grade: string;
  }[]> {
    try {
      console.log(`🧠 Fetching missed concepts for student: ${studentId}`);
      
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select(`
          concept_missed_id,
          concept_missed_description,
          created_at,
          concept_index!inner(concept_name, subject, grade, description)
        `)
        .not('concept_missed_id', 'is', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('❌ Error fetching missed concepts:', error);
        return [];
      }

      // Group by concept and aggregate data
      const conceptMap = new Map<string, {
        concept_id: string;
        concept_name: string;
        concept_description: string;
        miss_count: number;
        recent_description: string;
        last_missed: string;
        subject: string;
        grade: string;
      }>();

      data.forEach((record: any) => {
        const conceptId = record.concept_missed_id;
        const concept = record.concept_index;
        
        if (!conceptMap.has(conceptId)) {
          conceptMap.set(conceptId, {
            concept_id: conceptId,
            concept_name: concept.concept_name,
            concept_description: concept.description || '',
            miss_count: 1,
            recent_description: record.concept_missed_description || '',
            last_missed: record.created_at,
            subject: concept.subject,
            grade: concept.grade
          });
        } else {
          const existing = conceptMap.get(conceptId)!;
          existing.miss_count++;
          
          // Update with most recent description if newer
          if (new Date(record.created_at) > new Date(existing.last_missed)) {
            existing.recent_description = record.concept_missed_description || existing.recent_description;
            existing.last_missed = record.created_at;
          }
        }
      });

      const result = Array.from(conceptMap.values())
        .sort((a, b) => b.miss_count - a.miss_count);

      console.log(`✅ Retrieved missed concepts for ${result.length} concepts`);
      return result;
    } catch (error) {
      console.error('❌ Exception in getStudentMissedConcepts:', error);
      return [];
    }
  }
}
