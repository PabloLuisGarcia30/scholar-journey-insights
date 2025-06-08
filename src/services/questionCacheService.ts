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
  dailyStats?: {
    totalQueries: number;
    cacheHits: number;
    cacheMisses: number;
    avgResponseTime: number;
  };
  performanceMetrics?: {
    memoryUtilization: number;
    cleanupFrequency: number;
    errorRate: number;
  };
}

export interface CachePerformanceTracker {
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  totalResponseTime: number;
  errorCount: number;
  lastReset: number;
}

export class QuestionCacheService {
  private static readonly CACHE_VERSION = "v1.0";
  private static readonly QUESTION_CACHE_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days
  private static readonly MEMORY_CLEANUP_INTERVAL = 5 * 60 * 1000; // 5 minutes
  private static readonly MAX_MEMORY_CACHE_SIZE = 1000; // Maximum items in memory
  private static questionCache: Map<string, QuestionCacheResult> = new Map();
  private static cleanupInterval: number | null = null;
  private static lastCleanup: number = Date.now();
  
  // Performance tracking
  private static performanceTracker: CachePerformanceTracker = {
    totalQueries: 0,
    cacheHits: 0,
    cacheMisses: 0,
    totalResponseTime: 0,
    errorCount: 0,
    lastReset: Date.now()
  };

  static {
    // Initialize automatic cleanup on service load
    this.startAutomaticCleanup();
  }

  private static startAutomaticCleanup(): void {
    if (this.cleanupInterval) return; // Already started

    this.cleanupInterval = window.setInterval(() => {
      this.performAutomaticMemoryCleanup();
    }, this.MEMORY_CLEANUP_INTERVAL);

    console.log('🧹 Question cache automatic cleanup started (5min intervals)');
  }

  private static performAutomaticMemoryCleanup(): void {
    const now = Date.now();
    let removedCount = 0;
    let totalSize = this.questionCache.size;

    // Remove expired entries
    for (const [key, entry] of this.questionCache.entries()) {
      if (entry.cachedAt + this.QUESTION_CACHE_DURATION <= now) {
        this.questionCache.delete(key);
        removedCount++;
      }
    }

    // If cache is still too large, remove oldest entries
    if (this.questionCache.size > this.MAX_MEMORY_CACHE_SIZE) {
      const entries = Array.from(this.questionCache.entries())
        .sort(([, a], [, b]) => a.cachedAt - b.cachedAt);
      
      const toRemove = this.questionCache.size - this.MAX_MEMORY_CACHE_SIZE;
      for (let i = 0; i < toRemove; i++) {
        this.questionCache.delete(entries[i][0]);
        removedCount++;
      }
    }

    // Schedule database cleanup every hour
    if (now - this.lastCleanup > 60 * 60 * 1000) { // 1 hour
      this.cleanupExpiredQuestionCache().catch(error => {
        console.warn('Database cleanup failed:', error);
      });
      this.lastCleanup = now;
    }

    if (removedCount > 0 || totalSize !== this.questionCache.size) {
      console.log(`🧹 Memory cleanup: removed ${removedCount} expired entries, cache size: ${totalSize} → ${this.questionCache.size}`);
    }
  }

  static stopAutomaticCleanup(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
      console.log('🧹 Question cache automatic cleanup stopped');
    }
  }

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
    const startTime = Date.now();
    this.performanceTracker.totalQueries++;

    try {
      const cacheKey = this.generateQuestionCacheKey(examId, questionNumber, studentAnswer, correctAnswer);
      
      // Check in-memory cache first
      const memoryResult = this.questionCache.get(cacheKey);
      if (memoryResult && memoryResult.cachedAt + this.QUESTION_CACHE_DURATION > Date.now()) {
        this.performanceTracker.cacheHits++;
        this.performanceTracker.totalResponseTime += (Date.now() - startTime);
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
        this.performanceTracker.errorCount++;
        console.warn('Question cache lookup error:', error);
        return null;
      }

      if (data?.result) {
        const cachedResult: QuestionCacheResult = {
          ...data.result,
          cacheHit: true,
          cachedAt: data.cachedAt
        };
        
        this.performanceTracker.cacheHits++;
        this.performanceTracker.totalResponseTime += (Date.now() - startTime);
        
        // Store in memory for faster future access (with size check)
        if (this.questionCache.size < this.MAX_MEMORY_CACHE_SIZE) {
          this.questionCache.set(cacheKey, cachedResult);
        }
        console.log(`📋 Question cache hit (database): ${examId} Q${questionNumber}`);
        return cachedResult;
      }

      this.performanceTracker.cacheMisses++;
      this.performanceTracker.totalResponseTime += (Date.now() - startTime);
      return null;
    } catch (error) {
      this.performanceTracker.errorCount++;
      this.performanceTracker.totalResponseTime += (Date.now() - startTime);
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

      // Store in memory (with size check)
      if (this.questionCache.size < this.MAX_MEMORY_CACHE_SIZE) {
        this.questionCache.set(cacheKey, cachedResult);
      }

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
        return this.getEnhancedMemoryQuestionCacheStats();
      }

      // Enhance with performance metrics
      const enhancedStats: QuestionCacheStats = {
        ...data,
        dailyStats: {
          totalQueries: this.performanceTracker.totalQueries,
          cacheHits: this.performanceTracker.cacheHits,
          cacheMisses: this.performanceTracker.cacheMisses,
          avgResponseTime: this.performanceTracker.totalQueries > 0 
            ? this.performanceTracker.totalResponseTime / this.performanceTracker.totalQueries 
            : 0
        },
        performanceMetrics: {
          memoryUtilization: (this.questionCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100,
          cleanupFrequency: this.MEMORY_CLEANUP_INTERVAL / 1000, // in seconds
          errorRate: this.performanceTracker.totalQueries > 0 
            ? (this.performanceTracker.errorCount / this.performanceTracker.totalQueries) * 100 
            : 0
        }
      };

      return enhancedStats;
    } catch (error) {
      console.error('Question cache stats retrieval error:', error);
      return this.getEnhancedMemoryQuestionCacheStats();
    }
  }

  private static getEnhancedMemoryQuestionCacheStats(): QuestionCacheStats {
    const entries = Array.from(this.questionCache.values());
    const validEntries = entries.filter(e => e.cachedAt + this.QUESTION_CACHE_DURATION > Date.now());
    
    const distilBertCached = validEntries.filter(e => 
      e.originalGradingMethod.includes('distilbert')
    ).length;
    
    const openAICached = validEntries.filter(e => 
      e.originalGradingMethod.includes('openai')
    ).length;

    // Calculate enhanced metrics
    const openAICostPerQuestion = 0.01;
    const distilBertCostPerQuestion = 0.001;
    const costSavings = (openAICached * openAICostPerQuestion) + (distilBertCached * distilBertCostPerQuestion);

    const hitRate = this.performanceTracker.totalQueries > 0 
      ? this.performanceTracker.cacheHits / this.performanceTracker.totalQueries 
      : (validEntries.length > 0 ? 0.85 : 0);

    return {
      totalCachedQuestions: validEntries.length,
      hitRate,
      costSavings,
      distilBertCached,
      openAICached,
      topCachedExams: [],
      dailyStats: {
        totalQueries: this.performanceTracker.totalQueries,
        cacheHits: this.performanceTracker.cacheHits,
        cacheMisses: this.performanceTracker.cacheMisses,
        avgResponseTime: this.performanceTracker.totalQueries > 0 
          ? this.performanceTracker.totalResponseTime / this.performanceTracker.totalQueries 
          : 0
      },
      performanceMetrics: {
        memoryUtilization: (this.questionCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100,
        cleanupFrequency: this.MEMORY_CLEANUP_INTERVAL / 1000,
        errorRate: this.performanceTracker.totalQueries > 0 
          ? (this.performanceTracker.errorCount / this.performanceTracker.totalQueries) * 100 
          : 0
      }
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
      const { data } = await supabase.functions.invoke('cleanup-question-cache');
      if (data?.deletedCount > 0) {
        console.log(`🧹 Database cleanup: removed ${data.deletedCount} expired entries`);
      }
    } catch (error) {
      console.warn('Database question cache cleanup error:', error);
    }
  }

  static getCacheHealthMetrics(): {
    memorySize: number;
    maxSize: number;
    utilizationPercent: number;
    lastCleanup: Date;
    nextCleanup: Date;
    performanceStats: CachePerformanceTracker;
  } {
    return {
      memorySize: this.questionCache.size,
      maxSize: this.MAX_MEMORY_CACHE_SIZE,
      utilizationPercent: (this.questionCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100,
      lastCleanup: new Date(this.lastCleanup),
      nextCleanup: new Date(this.lastCleanup + 60 * 60 * 1000), // Next hour
      performanceStats: { ...this.performanceTracker }
    };
  }

  static resetPerformanceStats(): void {
    this.performanceTracker = {
      totalQueries: 0,
      cacheHits: 0,
      cacheMisses: 0,
      totalResponseTime: 0,
      errorCount: 0,
      lastReset: Date.now()
    };
    console.log('📊 Cache performance stats reset');
  }
}
