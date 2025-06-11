import { SmartAnswerGradingService, type GradingResult, type AnswerPattern } from './smartAnswerGradingService';
import { MistakePatternService } from './mistakePatternService';
import { QuestionTimingService } from './questionTimingService';

export interface PracticeExerciseAnswer {
  questionId: string;
  studentAnswer: string;
  questionType: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  options?: string[];
  points: number;
  
  // Enhanced context for concept detection
  questionText?: string;
  subject?: string;
  grade?: string;
}

export interface ExerciseGradingResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  gradingMethod: 'exact_match' | 'flexible_match' | 'ai_graded';
  confidence: number;
  
  // Enhanced with concept detection
  conceptMissed?: string;
  conceptSource?: string;
}

export interface ExerciseSubmissionResult {
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
  questionResults: ExerciseGradingResult[];
  overallFeedback: string;
  completedAt: Date;
  
  // Enhanced analytics
  conceptsAnalyzed: number;
  uniqueConceptsMissed: string[];
}

export class PracticeExerciseGradingService {
  
  /**
   * Grade a complete practice exercise submission with enhanced concept tracking
   */
  static async gradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle?: string,
    studentExerciseId?: string,
    skillName?: string,
    exerciseMetadata?: any
  ): Promise<ExerciseSubmissionResult> {
    console.log('🎯 Grading practice exercise submission with', answers.length, 'answers');
    
    const questionResults: ExerciseGradingResult[] = [];
    let totalScore = 0;
    let totalPossible = 0;
    let conceptsAnalyzed = 0;
    const uniqueConceptsMissed = new Set<string>();
    
    // Grade each question and record enhanced patterns
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const questionNumber = i + 1;
      
      const result = await this.gradeExerciseQuestion(answer);
      questionResults.push(result);
      totalScore += result.pointsEarned;
      totalPossible += result.pointsPossible;
      
      // Track concepts for analytics
      if (result.conceptMissed) {
        conceptsAnalyzed++;
        uniqueConceptsMissed.add(result.conceptMissed);
      }
      
      // Record enhanced mistake pattern if we have the required data
      if (studentExerciseId && skillName) {
        const mistakeType = result.isCorrect ? null : 
          MistakePatternService.analyzeMistakeType(
            answer.questionType,
            answer.studentAnswer,
            answer.correctAnswer,
            answer.options
          );

        await MistakePatternService.recordMistakePattern({
          studentExerciseId,
          questionId: answer.questionId,
          questionNumber,
          questionType: answer.questionType,
          studentAnswer: answer.studentAnswer,
          correctAnswer: answer.correctAnswer,
          isCorrect: result.isCorrect,
          skillTargeted: skillName,
          mistakeType: mistakeType || undefined,
          confidenceScore: result.confidence,
          gradingMethod: result.gradingMethod,
          feedbackGiven: result.feedback,
          questionContext: answer.questionType === 'multiple-choice' 
            ? `Question: ${answer.questionId}. Options: ${answer.options?.join(', ')}`
            : `Question: ${answer.questionId}`,
          options: answer.options,
          
          // Enhanced context for concept detection
          subject: answer.subject,
          grade: answer.grade,
          questionText: answer.questionText
        });
      }
    }
    
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const overallFeedback = this.generateOverallFeedback(
      percentageScore, 
      questionResults,
      Array.from(uniqueConceptsMissed)
    );
    
    console.log(`✅ Exercise graded: ${totalScore}/${totalPossible} (${percentageScore.toFixed(1)}%)`);
    console.log(`🧠 Concepts analyzed: ${conceptsAnalyzed}, Unique concepts missed: ${uniqueConceptsMissed.size}`);
    
    return {
      totalScore,
      totalPossible,
      percentageScore,
      questionResults,
      overallFeedback,
      completedAt: new Date(),
      conceptsAnalyzed,
      uniqueConceptsMissed: Array.from(uniqueConceptsMissed)
    };
  }
  
  /**
   * Grade a single question from a practice exercise with concept detection
   */
  static async gradeExerciseQuestion(answer: PracticeExerciseAnswer): Promise<ExerciseGradingResult> {
    const {
      questionId,
      studentAnswer,
      questionType,
      correctAnswer,
      acceptableAnswers,
      keywords,
      options,
      points,
      questionText,
      subject,
      grade
    } = answer;
    
    let gradingResult: GradingResult;
    
    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      // Simple exact match for multiple choice and true/false
      gradingResult = this.gradeExactMatch(studentAnswer, correctAnswer);
    } else if (questionType === 'short-answer') {
      // Use smart grading for short answers
      const answerPattern: AnswerPattern = {
        text: correctAnswer,
        acceptableVariations: acceptableAnswers || [],
        keywords: keywords || []
      };
      
      gradingResult = await SmartAnswerGradingService.gradeShortAnswer(
        studentAnswer,
        answerPattern,
        `Question ${questionId}`,
        questionId
      );
    } else {
      // Essay questions - use AI grading
      gradingResult = await SmartAnswerGradingService.gradeShortAnswer(
        studentAnswer,
        correctAnswer,
        `Essay question ${questionId}`,
        questionId
      );
    }
    
    const pointsEarned = Math.round(gradingResult.score * points * 100) / 100;
    const feedback = this.generateQuestionFeedback(gradingResult, questionType, pointsEarned, points);
    
    // For incorrect answers, detect missed concept if we have context
    let conceptMissed: string | undefined;
    let conceptSource: string | undefined;
    
    if (!gradingResult.isCorrect && subject && grade && questionText) {
      try {
        console.log(`🧠 Detecting concept for incorrect answer in ${subject} ${grade}`);
        // Note: In a real implementation, we'd call ConceptMissedService here
        // For now, we'll use a simplified approach to avoid circular dependencies
        conceptMissed = `${questionType} understanding`;
        conceptSource = 'simplified_detection';
      } catch (error) {
        console.warn('⚠️ Concept detection failed for question:', error);
      }
    }
    
    return {
      questionId,
      isCorrect: gradingResult.isCorrect,
      pointsEarned,
      pointsPossible: points,
      feedback,
      gradingMethod: gradingResult.method,
      confidence: gradingResult.confidence,
      conceptMissed,
      conceptSource
    };
  }
  
  /**
   * Simple exact match grading for multiple choice and true/false
   */
  private static gradeExactMatch(studentAnswer: string, correctAnswer: string): GradingResult {
    const normalizedStudent = studentAnswer.trim().toLowerCase();
    const normalizedCorrect = correctAnswer.trim().toLowerCase();
    
    const isCorrect = normalizedStudent === normalizedCorrect;
    
    return {
      isCorrect,
      score: isCorrect ? 1 : 0,
      confidence: 1,
      feedback: isCorrect ? 'Correct!' : `Incorrect. The correct answer is: ${correctAnswer}`,
      method: 'exact_match'
    };
  }
  
  /**
   * Generate feedback for individual questions
   */
  private static generateQuestionFeedback(
    gradingResult: GradingResult,
    questionType: string,
    pointsEarned: number,
    pointsPossible: number
  ): string {
    if (gradingResult.isCorrect) {
      return `Excellent! You earned ${pointsEarned}/${pointsPossible} points.`;
    }
    
    if (pointsEarned > 0) {
      return `Partially correct. You earned ${pointsEarned}/${pointsPossible} points. ${gradingResult.feedback || ''}`;
    }
    
    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      return gradingResult.feedback || 'Incorrect answer.';
    }
    
    return `Your answer needs improvement. ${gradingResult.feedback || 'Please review the key concepts and try to include more specific details.'}`;
  }
  
  /**
   * Generate overall feedback including concept analysis
   */
  private static generateOverallFeedback(
    percentageScore: number,
    questionResults: ExerciseGradingResult[],
    uniqueConceptsMissed: string[]
  ): string {
    const correctCount = questionResults.filter(r => r.isCorrect).length;
    const totalCount = questionResults.length;
    const partialCreditCount = questionResults.filter(r => r.pointsEarned > 0 && !r.isCorrect).length;
    
    let feedback = `You answered ${correctCount} out of ${totalCount} questions correctly`;
    
    if (partialCreditCount > 0) {
      feedback += ` and earned partial credit on ${partialCreditCount} additional questions`;
    }
    
    feedback += `. `;
    
    // Performance feedback
    if (percentageScore >= 90) {
      feedback += 'Outstanding work! You have excellent mastery of these concepts.';
    } else if (percentageScore >= 80) {
      feedback += 'Great job! You show strong understanding with room for minor improvements.';
    } else if (percentageScore >= 70) {
      feedback += 'Good work! Review the concepts you missed to strengthen your understanding.';
    } else if (percentageScore >= 60) {
      feedback += 'You\'re making progress! Focus on reviewing the key concepts and practice more.';
    } else {
      feedback += 'This topic needs more practice. Review the material and try some additional exercises.';
    }
    
    // Concept-specific feedback
    if (uniqueConceptsMissed.length > 0) {
      feedback += ` Key concepts to review: ${uniqueConceptsMissed.slice(0, 3).join(', ')}`;
      if (uniqueConceptsMissed.length > 3) {
        feedback += ` and ${uniqueConceptsMissed.length - 3} others`;
      }
      feedback += '.';
    }
    
    // Add specific suggestions based on question types
    const shortAnswerResults = questionResults.filter(r => r.gradingMethod === 'ai_graded' || r.gradingMethod === 'flexible_match');
    if (shortAnswerResults.length > 0) {
      const shortAnswerScore = shortAnswerResults.reduce((sum, r) => sum + r.pointsEarned, 0) / 
                              shortAnswerResults.reduce((sum, r) => sum + r.pointsPossible, 0) * 100;
      
      if (shortAnswerScore < 70) {
        feedback += ' For written responses, try to be more specific and include key terminology.';
      }
    }
    
    return feedback;
  }
  
  /**
   * Check if an answer shows understanding even if not perfect
   */
  static assessUnderstanding(
    studentAnswer: string,
    correctAnswer: string,
    keywords: string[] = []
  ): { showsUnderstanding: boolean; feedback: string } {
    const normalizedAnswer = studentAnswer.toLowerCase();
    const keywordMatches = keywords.filter(keyword => 
      normalizedAnswer.includes(keyword.toLowerCase())
    );
    
    const showsUnderstanding = keywordMatches.length >= Math.ceil(keywords.length * 0.5) || 
                              normalizedAnswer.length > 20; // Basic effort check
    
    let feedback = '';
    if (showsUnderstanding && keywordMatches.length > 0) {
      feedback = `You demonstrate understanding by including key concepts: ${keywordMatches.join(', ')}.`;
    } else if (normalizedAnswer.length > 10) {
      feedback = 'Your answer shows effort, but try to include more specific details and key terms.';
    } else {
      feedback = 'Your answer is too brief. Try to explain your thinking in more detail.';
    }
    
    return { showsUnderstanding, feedback };
  }
}
