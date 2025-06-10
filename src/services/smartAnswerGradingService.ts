
import { supabase } from '@/integrations/supabase/client';

export interface GradingResult {
  isCorrect: boolean;
  score: number; // 0-1 for partial credit
  confidence: number;
  feedback?: string;
  method: 'exact_match' | 'flexible_match' | 'ai_graded';
}

export interface AnswerPattern {
  text: string;
  keywords?: string[];
  acceptableVariations?: string[];
}

export class SmartAnswerGradingService {
  private static readonly SIMILARITY_THRESHOLD = 0.8;
  private static readonly PARTIAL_CREDIT_THRESHOLD = 0.6;

  /**
   * Grade a short answer using smart grading logic
   */
  static async gradeShortAnswer(
    studentAnswer: string,
    correctAnswer: string | AnswerPattern,
    questionText: string,
    questionId?: string
  ): Promise<GradingResult> {
    const normalizedStudentAnswer = this.normalizeAnswer(studentAnswer);
    
    // Handle empty answers
    if (!normalizedStudentAnswer.trim()) {
      return {
        isCorrect: false,
        score: 0,
        confidence: 1,
        feedback: 'No answer provided',
        method: 'exact_match'
      };
    }

    // Try exact and flexible matching first
    const localResult = this.tryLocalGrading(normalizedStudentAnswer, correctAnswer);
    if (localResult.confidence >= this.SIMILARITY_THRESHOLD) {
      return localResult;
    }

    // Fall back to AI grading for complex cases
    try {
      const aiResult = await this.gradeWithAI(
        studentAnswer,
        correctAnswer,
        questionText,
        questionId
      );
      return aiResult;
    } catch (error) {
      console.error('AI grading failed, using local result:', error);
      return {
        ...localResult,
        feedback: 'Grading system encountered an issue. Answer marked based on text similarity.'
      };
    }
  }

  /**
   * Normalize answer text for comparison
   */
  private static normalizeAnswer(answer: string): string {
    return answer
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, ' ') // Replace punctuation with spaces
      .replace(/\s+/g, ' ') // Normalize multiple spaces
      .trim();
  }

  /**
   * Try local grading using flexible string matching
   */
  private static tryLocalGrading(
    studentAnswer: string,
    correctAnswer: string | AnswerPattern
  ): GradingResult {
    const correctPatterns = this.extractAnswerPatterns(correctAnswer);
    
    let bestScore = 0;
    let bestMethod: GradingResult['method'] = 'flexible_match';
    
    for (const pattern of correctPatterns) {
      const normalizedCorrect = this.normalizeAnswer(pattern.text);
      
      // Exact match (after normalization)
      if (studentAnswer === normalizedCorrect) {
        return {
          isCorrect: true,
          score: 1,
          confidence: 1,
          method: 'exact_match'
        };
      }
      
      // Keyword matching
      if (pattern.keywords) {
        const keywordScore = this.calculateKeywordScore(studentAnswer, pattern.keywords);
        bestScore = Math.max(bestScore, keywordScore);
      }
      
      // String similarity
      const similarity = this.calculateStringSimilarity(studentAnswer, normalizedCorrect);
      bestScore = Math.max(bestScore, similarity);
      
      // Check acceptable variations
      if (pattern.acceptableVariations) {
        for (const variation of pattern.acceptableVariations) {
          const normalizedVariation = this.normalizeAnswer(variation);
          if (studentAnswer === normalizedVariation) {
            return {
              isCorrect: true,
              score: 1,
              confidence: 0.95,
              method: 'flexible_match'
            };
          }
          
          const variationSimilarity = this.calculateStringSimilarity(studentAnswer, normalizedVariation);
          bestScore = Math.max(bestScore, variationSimilarity);
        }
      }
    }
    
    const isCorrect = bestScore >= this.SIMILARITY_THRESHOLD;
    const hasPartialCredit = bestScore >= this.PARTIAL_CREDIT_THRESHOLD;
    
    return {
      isCorrect,
      score: isCorrect ? 1 : (hasPartialCredit ? bestScore : 0),
      confidence: bestScore,
      feedback: this.generateLocalFeedback(bestScore, isCorrect, hasPartialCredit),
      method: bestMethod
    };
  }

  /**
   * Extract answer patterns from correct answer
   */
  private static extractAnswerPatterns(correctAnswer: string | AnswerPattern): AnswerPattern[] {
    if (typeof correctAnswer === 'string') {
      // Try to parse multiple answers separated by common delimiters
      const answers = correctAnswer.split(/[;,|\/]/).map(a => a.trim()).filter(a => a);
      return answers.map(text => ({ text }));
    }
    
    return [correctAnswer];
  }

  /**
   * Calculate keyword matching score
   */
  private static calculateKeywordScore(studentAnswer: string, keywords: string[]): number {
    const normalizedKeywords = keywords.map(k => this.normalizeAnswer(k));
    const matchedKeywords = normalizedKeywords.filter(keyword => 
      studentAnswer.includes(keyword)
    );
    
    return matchedKeywords.length / keywords.length;
  }

  /**
   * Calculate string similarity using Levenshtein distance
   */
  private static calculateStringSimilarity(str1: string, str2: string): number {
    if (str1 === str2) return 1;
    
    const matrix = [];
    const len1 = str1.length;
    const len2 = str2.length;
    
    // Initialize matrix
    for (let i = 0; i <= len2; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len1; j++) {
      matrix[0][j] = j;
    }
    
    // Fill matrix
    for (let i = 1; i <= len2; i++) {
      for (let j = 1; j <= len1; j++) {
        if (str2[i - 1] === str1[j - 1]) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    const distance = matrix[len2][len1];
    const maxLength = Math.max(len1, len2);
    return maxLength === 0 ? 1 : 1 - (distance / maxLength);
  }

  /**
   * Generate feedback for local grading
   */
  private static generateLocalFeedback(
    score: number,
    isCorrect: boolean,
    hasPartialCredit: boolean
  ): string {
    if (isCorrect) {
      return 'Correct answer!';
    }
    
    if (hasPartialCredit) {
      return `Partially correct. Your answer shows understanding but may be missing some key details.`;
    }
    
    return 'Incorrect answer. Please review the question and try to include key concepts.';
  }

  /**
   * Grade using AI for complex answers
   */
  private static async gradeWithAI(
    studentAnswer: string,
    correctAnswer: string | AnswerPattern,
    questionText: string,
    questionId?: string
  ): Promise<GradingResult> {
    const correctText = typeof correctAnswer === 'string' 
      ? correctAnswer 
      : correctAnswer.text;

    const { data, error } = await supabase.functions.invoke('grade-complex-question', {
      body: {
        questionText,
        studentAnswer,
        correctAnswer: correctText,
        pointsPossible: 1,
        questionNumber: questionId || '1',
        skillContext: 'short_answer_grading'
      }
    });

    if (error) {
      throw new Error(`AI grading failed: ${error.message}`);
    }

    const aiScore = Math.max(0, Math.min(1, data.pointsEarned || 0));
    
    return {
      isCorrect: aiScore >= 0.8,
      score: aiScore,
      confidence: data.confidence || 0.7,
      feedback: data.reasoning || 'AI-graded answer',
      method: 'ai_graded'
    };
  }

  /**
   * Batch grade multiple answers
   */
  static async batchGradeAnswers(
    answers: Array<{
      studentAnswer: string;
      correctAnswer: string | AnswerPattern;
      questionText: string;
      questionId?: string;
    }>
  ): Promise<GradingResult[]> {
    const results = await Promise.allSettled(
      answers.map(answer => 
        this.gradeShortAnswer(
          answer.studentAnswer,
          answer.correctAnswer,
          answer.questionText,
          answer.questionId
        )
      )
    );

    return results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value;
      } else {
        console.error(`Failed to grade answer ${index}:`, result.reason);
        return {
          isCorrect: false,
          score: 0,
          confidence: 0,
          feedback: 'Grading system error',
          method: 'exact_match' as const
        };
      }
    });
  }
}
