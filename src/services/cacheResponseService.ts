
import { SkillAwareCacheService, SkillAwareCacheKey } from './skillAwareCacheService';
import { QuestionCacheService } from './questionCacheService';

export interface CacheResponseConfig {
  useSkillAware: boolean;
  responseType: 'grading' | 'analysis' | 'feedback';
  fallbackToStandard: boolean;
}

export class CacheResponseService {
  /**
   * Main unified function to fetch or generate responses with skill-aware caching
   */
  static async fetchOrGenerateResponse<T>(
    questionId: string,
    questionText: string,
    generateFunction: (text: string) => Promise<T>,
    skillTags: string[] = [],
    config: CacheResponseConfig = {
      useSkillAware: true,
      responseType: 'grading',
      fallbackToStandard: true
    }
  ): Promise<T> {
    // If skill tags are provided and skill-aware caching is enabled
    if (skillTags.length > 0 && config.useSkillAware) {
      return this.fetchWithSkillAwareCache(
        questionId,
        questionText,
        generateFunction,
        skillTags,
        config
      );
    }

    // Fallback to standard caching if enabled
    if (config.fallbackToStandard) {
      return this.fetchWithStandardCache(questionId, questionText, generateFunction);
    }

    // Direct generation without caching
    return generateFunction(questionText);
  }

  /**
   * Enhanced grading function with skill-aware caching
   */
  static async fetchOrGenerateGradingResponse(
    examId: string,
    questionNumber: number,
    studentAnswer: string,
    correctAnswer: string,
    skillMappings: Array<{ skill_name: string; skill_type: string }>,
    generateFunction: () => Promise<any>,
    originalMethod: string = 'ai_grading'
  ): Promise<any> {
    const skillTags = skillMappings.map(sm => `${sm.skill_type}:${sm.skill_name}`);
    
    const cacheParams: SkillAwareCacheKey = {
      examId,
      questionNumber,
      studentAnswer,
      correctAnswer,
      skillTags,
      questionType: 'grading'
    };

    return SkillAwareCacheService.fetchOrGenerateResponse(
      cacheParams,
      generateFunction,
      'grading',
      originalMethod
    );
  }

  private static async fetchWithSkillAwareCache<T>(
    questionId: string,
    questionText: string,
    generateFunction: (text: string) => Promise<T>,
    skillTags: string[],
    config: CacheResponseConfig
  ): Promise<T> {
    const cacheParams: SkillAwareCacheKey = {
      examId: questionId.split('_')[0] || 'unknown',
      questionNumber: parseInt(questionId.split('_')[1]) || 1,
      studentAnswer: questionText.substring(0, 100), // Use question text as context
      correctAnswer: 'context_based',
      skillTags,
      questionType: config.responseType
    };

    return SkillAwareCacheService.fetchOrGenerateResponse(
      cacheParams,
      () => generateFunction(questionText),
      config.responseType,
      'skill_aware_generation'
    );
  }

  private static async fetchWithStandardCache<T>(
    questionId: string,
    questionText: string,
    generateFunction: (text: string) => Promise<T>
  ): Promise<T> {
    // Use existing QuestionCacheService for backward compatibility
    const examId = questionId.split('_')[0] || 'unknown';
    const questionNumber = parseInt(questionId.split('_')[1]) || 1;
    
    const cached = await QuestionCacheService.getCachedQuestionResult(
      examId,
      questionNumber,
      questionText.substring(0, 50),
      'standard_cache'
    );

    if (cached) {
      return cached.response || cached;
    }

    const result = await generateFunction(questionText);
    
    // Store in standard cache
    await QuestionCacheService.setCachedQuestionResult(
      examId,
      questionNumber,
      questionText.substring(0, 50),
      'standard_cache',
      result as any
    );

    return result;
  }

  /**
   * Get comprehensive cache statistics
   */
  static async getCacheAnalytics() {
    const [skillStats, standardStats] = await Promise.all([
      SkillAwareCacheService.getSkillCacheStats(),
      QuestionCacheService.getQuestionCacheStats()
    ]);

    return {
      skillAware: skillStats,
      standard: standardStats,
      combined: {
        totalCacheHits: Object.values(skillStats.totalBySkill).reduce((a, b) => a + b, 0) + 
                        standardStats.totalCachedQuestions,
        estimatedCostSavings: Object.values(skillStats.costSavingsBySkill).reduce((a, b) => a + b, 0) + 
                             standardStats.costSavings,
        overallHitRate: this.calculateCombinedHitRate(skillStats, standardStats)
      }
    };
  }

  private static calculateCombinedHitRate(skillStats: any, standardStats: any): number {
    const skillQueries = Object.values(skillStats.totalBySkill).reduce((a: number, b: number) => a + b, 0);
    const skillHits = Object.entries(skillStats.hitRateBySkill).reduce(
      (sum, [skill, rate]) => sum + (skillStats.totalBySkill[skill] * (rate as number)), 0
    );
    
    const standardQueries = standardStats.dailyStats?.totalQueries || 0;
    const standardHits = standardStats.dailyStats?.cacheHits || 0;
    
    const totalQueries = skillQueries + standardQueries;
    const totalHits = skillHits + standardHits;
    
    return totalQueries > 0 ? totalHits / totalQueries : 0;
  }
}
