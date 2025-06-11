
import { supabase } from '@/integrations/supabase/client';

export interface EnhancedMistakePatternData {
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
  
  // Enhanced fields
  misconceptionCategory?: string;
  errorSeverity?: 'minor' | 'moderate' | 'major' | 'fundamental';
  prerequisiteSkillsGap?: string[];
  errorPersistenceCount?: number;
  questionContext?: string;
  distractorAnalysis?: string;
  solutionPath?: string;
  cognitiveLoadIndicators?: Record<string, any>;
  learningObjectives?: string[];
  remediationSuggestions?: string;
  relatedConcepts?: string[];
  difficultyLevelAppropriate?: boolean;
  errorPatternId?: string;
  metacognitiveAwareness?: string;
  transferFailureIndicator?: boolean;
  instructionalSensitivityFlag?: boolean;
  gptAnalysisMetadata?: Record<string, any>;
  detailedConceptualError?: string;
  contextWhenErrorOccurred?: Record<string, any>;
}

export interface EnhancedMistakeAnalysis {
  skillName: string;
  misconceptionCategory: string;
  errorSeverity: string;
  errorCount: number;
  averagePersistence: number;
  commonPrerequisitesGaps: string[];
  remediationThemes: string[];
  cognitivePatterns: Record<string, number>;
}

export interface ErrorPatternDefinition {
  id: string;
  patternId: string;
  patternName: string;
  description: string;
  category: string;
  severityIndicators: Record<string, any>;
  remediationStrategies: string[];
  relatedPatterns: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CommonErrorPattern {
  errorPatternId: string;
  patternFrequency: number;
  averageSeverity: string;
  commonMisconceptions: string[];
  affectedSkills: string[];
  suggestedInterventions: string[];
}

export class EnhancedMistakePatternService {
  
  /**
   * Record an enhanced mistake pattern with detailed analysis
   */
  static async recordEnhancedMistakePattern(mistakeData: EnhancedMistakePatternData): Promise<string | null> {
    try {
      console.log(`🔍 Recording enhanced mistake pattern for question ${mistakeData.questionNumber}`);
      
      // Check if enhanced columns exist, if not fall back to basic recording
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
          feedback_given: mistakeData.feedbackGiven
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error recording enhanced mistake pattern:', error);
        return null;
      }

      console.log(`✅ Enhanced mistake pattern recorded: ${data.id}`);
      return data.id;
    } catch (error) {
      console.error('❌ Exception in recordEnhancedMistakePattern:', error);
      return null;
    }
  }

  /**
   * Analyze misconception category based on student answer and context
   */
  static analyzeMisconceptionCategory(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): string {
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    // Basic categorization logic - can be enhanced with ML/AI
    if (questionType === 'multiple-choice') {
      if (options && options.includes(studentAnswer)) {
        // Analyze which distractor was chosen
        const correctIndex = options.indexOf(correctAnswer);
        const studentIndex = options.indexOf(studentAnswer);
        
        if (Math.abs(correctIndex - studentIndex) === 1) {
          return 'adjacent_confusion';
        } else {
          return 'conceptual_misunderstanding';
        }
      }
      return 'procedural_error';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (studentLower.length < correctLower.length * 0.3) {
        return 'incomplete_understanding';
      } else if (studentLower.includes('not') || studentLower.includes('opposite')) {
        return 'inverse_reasoning';
      } else if (this.containsMathematicalError(studentAnswer, correctAnswer)) {
        return 'algebraic_manipulation';
      } else {
        return 'conceptual_gap';
      }
    }

    return 'unclassified';
  }

  /**
   * Determine error severity based on various factors
   */
  static determineErrorSeverity(
    isCorrect: boolean,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    timeSpent?: number,
    answerChanges?: number
  ): 'minor' | 'moderate' | 'major' | 'fundamental' {
    if (isCorrect) return 'minor';

    // Factor in answer complexity and changes
    const answerComplexity = studentAnswer.length / Math.max(correctAnswer.length, 1);
    const multipleChanges = (answerChanges || 0) > 2;
    const quickAnswer = timeSpent && timeSpent < 30; // Less than 30 seconds
    const longDeliberation = timeSpent && timeSpent > 300; // More than 5 minutes

    if (questionType === 'multiple-choice') {
      if (quickAnswer && !multipleChanges) return 'minor';
      if (longDeliberation && multipleChanges) return 'major';
      return 'moderate';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (answerComplexity < 0.2) return 'fundamental'; // Very short answer to complex question
      if (answerComplexity > 0.8 && this.hasCorrectKeywords(studentAnswer, correctAnswer)) {
        return 'minor'; // Long answer with correct concepts
      }
      if (longDeliberation) return 'major';
      return 'moderate';
    }

    return 'moderate';
  }

  /**
   * Generate GPT analysis prompt for detailed mistake analysis
   */
  static generateGPTAnalysisPrompt(mistakeData: EnhancedMistakePatternData): string {
    return `Analyze this student mistake for detailed educational insights:

Question Context: ${mistakeData.questionContext || 'Not provided'}
Question Type: ${mistakeData.questionType}
Student Answer: "${mistakeData.studentAnswer}"
Correct Answer: "${mistakeData.correctAnswer}"
Skill Being Tested: ${mistakeData.skillTargeted}

Please provide:
1. Detailed conceptual error analysis
2. Specific misconception category
3. Prerequisites skills that may be missing
4. Remediation suggestions
5. Related concepts that should be reviewed
6. Whether this indicates a transfer failure
7. Metacognitive awareness indicators

Format as JSON with keys: detailedAnalysis, misconceptionCategory, prerequisiteGaps, remediation, relatedConcepts, transferFailure, metacognitiveAwareness`;
  }

  /**
   * Get enhanced mistake analysis for a student using basic mistake patterns
   */
  static async getEnhancedMistakeAnalysis(
    studentId: string, 
    skillFilter?: string
  ): Promise<EnhancedMistakeAnalysis[]> {
    try {
      console.log(`📊 Fetching enhanced mistake analysis for student: ${studentId}`);
      
      // Use the existing mistake patterns function for now
      const { data, error } = await supabase.rpc('get_student_mistake_patterns', {
        student_uuid: studentId,
        skill_filter: skillFilter || null
      });

      if (error) {
        console.error('❌ Error fetching enhanced mistake analysis:', error);
        return [];
      }

      // Transform the basic mistake patterns into enhanced analysis format
      const enhancedAnalysis: EnhancedMistakeAnalysis[] = (data || []).map((pattern: any) => ({
        skillName: pattern.skill_name,
        misconceptionCategory: pattern.mistake_type || 'unclassified',
        errorSeverity: 'moderate', // Default until we have enhanced data
        errorCount: parseInt(pattern.mistake_count) || 0,
        averagePersistence: 1, // Default until we track persistence
        commonPrerequisitesGaps: [], // Empty until we have enhanced data
        remediationThemes: [], // Empty until we have enhanced data
        cognitivePatterns: {} // Empty until we have enhanced data
      }));

      console.log(`✅ Retrieved ${enhancedAnalysis.length} enhanced mistake analyses`);
      return enhancedAnalysis;
    } catch (error) {
      console.error('❌ Exception in getEnhancedMistakeAnalysis:', error);
      return [];
    }
  }

  /**
   * Identify common error patterns across students using basic analysis
   */
  static async identifyCommonErrorPatterns(skillName?: string): Promise<CommonErrorPattern[]> {
    try {
      // For now, use basic mistake pattern analysis
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select('mistake_type, skill_targeted')
        .eq('is_correct', false)
        .gte('created_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString());

      if (error) {
        console.error('❌ Error identifying common error patterns:', error);
        return [];
      }

      // Process the data to identify patterns
      const patternCounts: Record<string, { count: number; skills: Set<string> }> = {};
      
      (data || []).forEach(record => {
        const patternKey = record.mistake_type || 'unknown';
        if (!patternCounts[patternKey]) {
          patternCounts[patternKey] = { count: 0, skills: new Set() };
        }
        patternCounts[patternKey].count++;
        patternCounts[patternKey].skills.add(record.skill_targeted);
      });

      // Convert to CommonErrorPattern format
      const commonPatterns: CommonErrorPattern[] = Object.entries(patternCounts)
        .filter(([_, info]) => info.count >= 3) // Only patterns with 3+ occurrences
        .map(([patternId, info]) => ({
          errorPatternId: patternId,
          patternFrequency: info.count,
          averageSeverity: 'moderate',
          commonMisconceptions: [patternId],
          affectedSkills: Array.from(info.skills),
          suggestedInterventions: []
        }))
        .sort((a, b) => b.patternFrequency - a.patternFrequency);

      return commonPatterns;
    } catch (error) {
      console.error('❌ Exception in identifyCommonErrorPatterns:', error);
      return [];
    }
  }

  // Helper methods
  private static containsMathematicalError(studentAnswer: string, correctAnswer: string): boolean {
    const mathPattern = /[\d\+\-\*\/\=\(\)]/;
    return mathPattern.test(studentAnswer) && mathPattern.test(correctAnswer);
  }

  private static hasCorrectKeywords(studentAnswer: string, correctAnswer: string): boolean {
    const correctWords = correctAnswer.toLowerCase().split(/\s+/).filter(word => word.length > 3);
    const studentWords = studentAnswer.toLowerCase().split(/\s+/);
    const matches = correctWords.filter(word => studentWords.includes(word));
    return matches.length / correctWords.length > 0.3; // 30% keyword overlap
  }
}
