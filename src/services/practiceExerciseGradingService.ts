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
}

export interface ExerciseGradingResult {
  questionId: string;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  gradingMethod: 'exact_match' | 'flexible_match' | 'ai_graded';
  confidence: number;
}

export interface ExerciseSubmissionResult {
  totalScore: number;
  totalPossible: number;
  percentageScore: number;
  questionResults: ExerciseGradingResult[];
  overallFeedback: string;
  completedAt: Date;
}

export class PracticeExerciseGradingService {
  
  /**
   * Grade a complete practice exercise submission with enhanced tracking
   */
  static async gradeExerciseSubmission(
    answers: PracticeExerciseAnswer[],
    exerciseTitle?: string,
    studentExerciseId?: string,
    skillName?: string
  ): Promise<ExerciseSubmissionResult> {
    console.log('🎯 Grading practice exercise submission with', answers.length, 'answers');
    
    const questionResults: ExerciseGradingResult[] = [];
    let totalScore = 0;
    let totalPossible = 0;
    
    // Grade each question and record patterns
    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const questionNumber = i + 1;
      
      const result = await this.gradeExerciseQuestion(answer);
      questionResults.push(result);
      totalScore += result.pointsEarned;
      totalPossible += result.pointsPossible;
      
      // Record mistake pattern if we have the required data
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
          feedbackGiven: result.feedback
        });
      }
    }
    
    const percentageScore = totalPossible > 0 ? (totalScore / totalPossible) * 100 : 0;
    const overallFeedback = this.generateOverallFeedback(percentageScore, questionResults);
    
    console.log(`✅ Exercise graded: ${totalScore}/${totalPossible} (${percentageScore.toFixed(1)}%)`);
    
    return {
      totalScore,
      totalPossible,
      percentageScore,
      questionResults,
      overallFeedback,
      completedAt: new Date()
    };
  }
  
  /**
   * Grade a single question from a practice exercise
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
      points
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
    
    return {
      questionId,
      isCorrect: gradingResult.isCorrect,
      pointsEarned,
      pointsPossible: points,
      feedback,
      gradingMethod: gradingResult.method,
      confidence: gradingResult.confidence
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
   * Generate overall feedback for the exercise
   */
  private static generateOverallFeedback(
    percentageScore: number,
    questionResults: ExerciseGradingResult[]
  ): string {
    const correctCount = questionResults.filter(r => r.isCorrect).length;
    const totalCount = questionResults.length;
    const partialCreditCount = questionResults.filter(r => r.pointsEarned > 0 && !r.isCorrect).length;
    
    let feedback = `You answered ${correctCount} out of ${totalCount} questions correctly`;
    
    if (partialCreditCount > 0) {
      feedback += ` and earned partial credit on ${partialCreditCount} additional questions`;
    }
    
    feedback += `. `;
    
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
