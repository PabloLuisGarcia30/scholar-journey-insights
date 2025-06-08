
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLocalGradingResult, SkillMapping } from "./enhancedLocalGradingService";

export interface QuestionCacheKey {
  examId: string;
  questionNumber: number;
  studentAnswerHash: string;
  correctAnswerHash: string;
}

export interface QuestionCacheResult extends EnhancedLocalGradingResult {
  cacheHit: true;
  originalGradingMethod: string;
  cachedAt: number;
  cacheVersion: string;
}

export interface QuestionCacheStats {
  totalCachedQuestions: number;
  hitRate: number;
  costSavings: number;
  distilBertCached: number;
  openAICached: number;
  topCachedExams: Array<{ examId: string; questionCount: number; hitRate: number }>;
}

export class QuestionCacheService {
  private static readonly CACHE_VERSION = "v1.0";
  private static readonly QUESTION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static questionCache: Map<string, QuestionCacheResult> = new Map();

  static async generateAnswerHash(answer: string): Promise<string> {
    const cleanAnswer = answer.toLowerCase().trim().replace(/\s+/g, ' ');
    const encoder = new TextEncoder();
    const data = encoder.encode(cleanAnswer);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
  }

  static generateQuestionCacheKey(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string
  ): string {
    return `q_${examId}_${questionNumber}_${studentAnswer}_${correctAnswer}`;
  }

  static async getCachedQuestionResult(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string
  ): Promise<QuestionCacheResult | null> {
    try {
      const cacheKey = this.generateQuestionCacheKey(examId, questionNumber, studentAnswer, correctAnswer);
      
      // Check in-memory cache first
      const memoryResult = this.questionCache.get(cacheKey);
      if (memoryResult && memoryResult.cachedAt + this.QUESTION_CACHE_DURATION > Date.now()) {
        console.log(`📋 Question cache hit (memory): ${examId} Q${questionNumber}`);
        return memoryResult;
      }

      // Check database cache
      const { data, error } = await supabase.functions.invoke('get-question-cache', {
        body: { 
          cacheKey,
          examId,
          questionNumber
        }
      });

      if (error) {
        console.warn('Question cache lookup error:', error);
        return null;
      }

      if (data?.result) {
        const cachedResult: QuestionCacheResult = {
          ...data.result,
          cacheHit: true,
          cachedAt: data.cachedAt
        };
        
        // Store in memory for faster future access
        this.questionCache.set(cacheKey, cachedResult);
        console.log(`📋 Question cache hit (database): ${examId} Q${questionNumber}`);
        return cachedResult;
      }

      return null;
    } catch (error) {
      console.error('Question cache retrieval error:', error);
      return null;
    }
  }

  static async setCachedQuestionResult(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string,
    gradingResult: EnhancedLocalGradingResult
  ): Promise<void> {
    try {
      const cacheKey = this.generateQuestionCacheKey(examId, questionNumber, studentAnswer, correctAnswer);
      const cachedAt = Date.now();

      const cachedResult: QuestionCacheResult = {
        ...gradingResult,
        cacheHit: true,
        originalGradingMethod: gradingResult.gradingMethod,
        gradingMethod: `${gradingResult.gradingMethod}_cached`,
        cachedAt,
        cacheVersion: this.CACHE_VERSION
      };

      // Store in memory
      this.questionCache.set(cacheKey, cachedResult);

      // Store in database
      await supabase.functions.invoke('set-question-cache', {
        body: {
          cacheKey,
          examId,
          questionNumber,
          studentAnswer,
          correctAnswer,
          result: cachedResult,
          cachedAt,
          expiresAt: cachedAt + this.QUESTION_CACHE_DURATION
        }
      });

      console.log(`💾 Question cached: ${examId} Q${questionNumber} (${gradingResult.gradingMethod})`);
    } catch (error) {
      console.error('Question cache storage error:', error);
    }
  }

  static async preProcessCommonExam(
    examId: string,
    commonAnswerPatterns: Array<{
      questionNumber: number;
      correctAnswer: string;
      commonStudentAnswers: string[];
    }>
  ): Promise<void> {
    console.log(`🔄 Pre-processing common exam: ${examId}`);
    
    try {
      // Import grading service
      const { EnhancedLocalGradingService } = await import('./enhancedLocalGradingService');
      
      for (const pattern of commonAnswerPatterns) {
        for (const studentAnswer of pattern.commonStudentAnswers) {
          // Check if already cached
          const cached = await this.getCachedQuestionResult(
            examId,
            pattern.questionNumber,
            studentAnswer,
            pattern.correctAnswer
          );

          if (!cached) {
            // Create mock question and answer key for grading
            const mockQuestion = {
              questionNumber: pattern.questionNumber,
              detectedAnswer: { selectedOption: studentAnswer }
            };

            const mockAnswerKey = {
              question_number: pattern.questionNumber,
              correct_answer: pattern.correctAnswer,
              points: 1
            };

            // Grade using existing workflow
            const result = await EnhancedLocalGradingService.gradeQuestionWithDistilBert(
              mockQuestion,
              mockAnswerKey,
              []
            );

            // Cache the result
            await this.setCachedQuestionResult(
              examId,
              pattern.questionNumber,
              studentAnswer,
              pattern.correctAnswer,
              result
            );
          }
        }
      }

      console.log(`✅ Pre-processing complete for exam: ${examId}`);
    } catch (error) {
      console.error('Pre-processing failed:', error);
    }
  }

  static async getQuestionCacheStats(): Promise<QuestionCacheStats> {
    try {
      const { data, error } = await supabase.functions.invoke('get-question-cache-stats');
      
      if (error) {
        console.warn('Question cache stats error:', error);
        return this.getMemoryQuestionCacheStats();
      }

      return data;
    } catch (error) {
      console.error('Question cache stats retrieval error:', error);
      return this.getMemoryQuestionCacheStats();
    }
  }

  private static getMemoryQuestionCacheStats(): QuestionCacheStats {
    const entries = Array.from(this.questionCache.values());
    const validEntries = entries.filter(e => e.cachedAt + this.QUESTION_CACHE_DURATION > Date.now());
    
    const distilBertCached = validEntries.filter(e => 
      e.originalGradingMethod.includes('distilbert')
    ).length;
    
    const openAICached = validEntries.filter(e => 
      e.originalGradingMethod.includes('openai')
    ).length;

    // Estimate cost savings (rough calculation)
    const openAICostPerQuestion = 0.01;
    const costSavings = openAICached * openAICostPerQuestion;

    return {
      totalCachedQuestions: validEntries.length,
      hitRate: validEntries.length > 0 ? 0.85 : 0, // Estimated hit rate
      costSavings,
      distilBertCached,
      openAICached,
      topCachedExams: []
    };
  }

  static clearQuestionCache(): void {
    this.questionCache.clear();
    console.log('Question cache cleared');
  }

  static async cleanupExpiredQuestionCache(): Promise<void> {
    // Remove expired entries from memory
    const now = Date.now();
    for (const [key, entry] of this.questionCache.entries()) {
      if (entry.cachedAt + this.QUESTION_CACHE_DURATION <= now) {
        this.questionCache.delete(key);
      }
    }

    // Cleanup database cache
    try {
      await supabase.functions.invoke('cleanup-question-cache');
    } catch (error) {
      console.warn('Database question cache cleanup error:', error);
    }
  }
}
