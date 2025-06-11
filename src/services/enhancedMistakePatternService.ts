import { supabase } from '@/integrations/supabase/client';
import { SubjectSpecificMisconceptionService } from './subjectSpecificMisconceptionService';

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
          
          // Enhanced fields
          misconception_category: mistakeData.misconceptionCategory,
          error_severity: mistakeData.errorSeverity,
          prerequisite_skills_gap: mistakeData.prerequisiteSkillsGap,
          error_persistence_count: mistakeData.errorPersistenceCount || 1,
          question_context: mistakeData.questionContext,
          distractor_analysis: mistakeData.distractorAnalysis,
          solution_path: mistakeData.solutionPath,
          cognitive_load_indicators: mistakeData.cognitiveLoadIndicators || {},
          learning_objectives: mistakeData.learningObjectives,
          remediation_suggestions: mistakeData.remediationSuggestions,
          related_concepts: mistakeData.relatedConcepts,
          difficulty_level_appropriate: mistakeData.difficultyLevelAppropriate,
          error_pattern_id: mistakeData.errorPatternId,
          metacognitive_awareness: mistakeData.metacognitiveAwareness,
          transfer_failure_indicator: mistakeData.transferFailureIndicator || false,
          instructional_sensitivity_flag: mistakeData.instructionalSensitivityFlag || false,
          gpt_analysis_metadata: mistakeData.gptAnalysisMetadata || {},
          detailed_conceptual_error: mistakeData.detailedConceptualError,
          context_when_error_occurred: mistakeData.contextWhenErrorOccurred || {}
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
   * Generate mock data for demo purposes
   */
  private static generateMockAnalysisData(studentId: string, skillFilter?: string): EnhancedMistakeAnalysis[] {
    const mockSkills = ['Algebraic Expressions', 'Linear Equations', 'Quadratic Functions', 'Geometric Proofs', 'Trigonometry'];
    const misconceptions = ['procedural_error', 'conceptual_gap', 'algebraic_manipulation', 'inverse_reasoning', 'incomplete_understanding'];
    const severities = ['minor', 'moderate', 'major', 'fundamental'];
    const remediationThemes = ['Review fundamental concepts', 'Practice step-by-step procedures', 'Focus on visual representations', 'Work on prerequisite skills'];

    return mockSkills.map((skill, index) => ({
      skillName: skill,
      misconceptionCategory: misconceptions[index % misconceptions.length],
      errorSeverity: severities[index % severities.length],
      errorCount: Math.floor(Math.random() * 10) + 1,
      averagePersistence: Math.round((Math.random() * 3 + 1) * 100) / 100,
      commonPrerequisitesGaps: ['Basic arithmetic', 'Order of operations'],
      remediationThemes: [remediationThemes[index % remediationThemes.length]],
      cognitivePatterns: { attention: 0.7, memory: 0.6, processing: 0.8 }
    }));
  }

  /**
   * Generate mock common error patterns
   */
  private static generateMockCommonPatterns(skillFilter?: string): CommonErrorPattern[] {
    return [
      {
        errorPatternId: 'algebraic_sign_error',
        patternFrequency: 15,
        averageSeverity: 'moderate',
        commonMisconceptions: ['sign_confusion', 'distributive_property'],
        affectedSkills: ['Algebraic Expressions', 'Linear Equations'],
        suggestedInterventions: ['Review sign rules', 'Practice distributive property', 'Use visual aids']
      },
      {
        errorPatternId: 'fraction_operations',
        patternFrequency: 12,
        averageSeverity: 'major',
        commonMisconceptions: ['denominator_addition', 'cross_multiplication'],
        affectedSkills: ['Basic Arithmetic', 'Algebraic Expressions'],
        suggestedInterventions: ['Review fraction basics', 'Practice common denominators', 'Use fraction models']
      },
      {
        errorPatternId: 'geometric_reasoning',
        patternFrequency: 8,
        averageSeverity: 'fundamental',
        commonMisconceptions: ['angle_relationships', 'parallel_lines'],
        affectedSkills: ['Geometric Proofs', 'Angle Calculations'],
        suggestedInterventions: ['Review geometric definitions', 'Practice proof strategies', 'Use geometric software']
      }
    ];
  }

  /**
   * Get enhanced mistake analysis for a student using the new database function
   */
  static async getEnhancedMistakeAnalysis(
    studentId: string, 
    skillFilter?: string
  ): Promise<EnhancedMistakeAnalysis[]> {
    try {
      console.log(`📊 Fetching enhanced mistake analysis for student: ${studentId}`);
      
      // Try to call the database function first
      const { data, error } = await supabase.rpc('get_enhanced_mistake_analysis', {
        student_uuid: studentId,
        skill_filter: skillFilter || null
      });

      if (error) {
        console.warn('⚠️ Database function not available, using mock data:', error.message);
        return this.generateMockAnalysisData(studentId, skillFilter);
      }

      // Transform the database result into our interface format
      const enhancedAnalysis: EnhancedMistakeAnalysis[] = (data || []).map((pattern: any) => ({
        skillName: pattern.skill_name,
        misconceptionCategory: pattern.misconception_category || 'unclassified',
        errorSeverity: pattern.error_severity || 'moderate',
        errorCount: parseInt(pattern.error_count) || 0,
        averagePersistence: parseFloat(pattern.average_persistence) || 1,
        commonPrerequisitesGaps: pattern.common_prerequisites_gaps || [],
        remediationThemes: pattern.remediation_themes || [],
        cognitivePatterns: pattern.cognitive_patterns || {}
      }));

      // If no real data, provide mock data for demo
      if (enhancedAnalysis.length === 0) {
        console.log('📝 No real data found, providing mock data for demo');
        return this.generateMockAnalysisData(studentId, skillFilter);
      }

      console.log(`✅ Retrieved ${enhancedAnalysis.length} enhanced mistake analyses`);
      return enhancedAnalysis;
    } catch (error) {
      console.warn('⚠️ Exception in getEnhancedMistakeAnalysis, using mock data:', error);
      return this.generateMockAnalysisData(studentId, skillFilter);
    }
  }

  /**
   * Identify common error patterns across students using the new database function
   */
  static async identifyCommonErrorPatterns(skillName?: string): Promise<CommonErrorPattern[]> {
    try {
      console.log(`🔍 Identifying common error patterns${skillName ? ` for skill: ${skillName}` : ''}`);
      
      // Try to call the database function first
      const { data, error } = await supabase.rpc('identify_common_error_patterns', {
        skill_name_filter: skillName || null
      });

      if (error) {
        console.warn('⚠️ Database function not available, using mock data:', error.message);
        return this.generateMockCommonPatterns(skillName);
      }

      // Transform the database result into our interface format
      const commonPatterns: CommonErrorPattern[] = (data || []).map((pattern: any) => ({
        errorPatternId: pattern.error_pattern_id,
        patternFrequency: parseInt(pattern.pattern_frequency) || 0,
        averageSeverity: pattern.average_severity || 'moderate',
        commonMisconceptions: pattern.common_misconceptions || [],
        affectedSkills: pattern.affected_skills || [],
        suggestedInterventions: pattern.suggested_interventions || []
      }));

      // If no real data, provide mock data for demo
      if (commonPatterns.length === 0) {
        console.log('📝 No real pattern data found, providing mock data for demo');
        return this.generateMockCommonPatterns(skillName);
      }

      console.log(`✅ Retrieved ${commonPatterns.length} common error patterns`);
      return commonPatterns;
    } catch (error) {
      console.warn('⚠️ Exception in identifyCommonErrorPatterns, using mock data:', error);
      return this.generateMockCommonPatterns(skillName);
    }
  }

  /**
   * Analyze misconception category based on student answer, context, and SUBJECT
   */
  static analyzeMisconceptionCategory(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[],
    subject?: string
  ): string {
    // Use subject-specific analysis if subject is provided
    if (subject) {
      return SubjectSpecificMisconceptionService.analyzeMisconceptionBySubject(
        subject,
        questionType,
        studentAnswer,
        correctAnswer,
        questionContext,
        options
      );
    }

    // Fall back to generic analysis
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    if (questionType === 'multiple-choice') {
      if (options && options.includes(studentAnswer)) {
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
   * Enhanced remediation suggestions based on subject and misconception
   */
  static generateSubjectSpecificRemediation(
    subject: string,
    misconceptionCategory: string,
    skillTargeted: string
  ): string {
    const misconceptionDetails = SubjectSpecificMisconceptionService.getMisconceptionDetails(
      subject,
      misconceptionCategory
    );

    if (misconceptionDetails) {
      const strategies = misconceptionDetails.remediationStrategies.slice(0, 3).join(', ');
      return `For ${misconceptionDetails.name} in ${skillTargeted}: ${strategies}. Focus on ${misconceptionDetails.description.toLowerCase()}.`;
    }

    // Fall back to generic remediation
    return `Review ${skillTargeted} concepts and practice with varied examples. Consider using visual aids and step-by-step approaches.`;
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
   * Store or retrieve error pattern definitions
   */
  static async storeErrorPatternDefinition(definition: Omit<ErrorPatternDefinition, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    try {
      const { data, error } = await supabase
        .from('error_pattern_definitions')
        .insert({
          pattern_id: definition.patternId,
          pattern_name: definition.patternName,
          description: definition.description,
          category: definition.category,
          severity_indicators: definition.severityIndicators,
          remediation_strategies: definition.remediationStrategies,
          related_patterns: definition.relatedPatterns
        })
        .select('id')
        .single();

      if (error) {
        console.error('❌ Error storing error pattern definition:', error);
        return null;
      }

      return data.id;
    } catch (error) {
      console.error('❌ Exception in storeErrorPatternDefinition:', error);
      return null;
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
