
import { supabase } from "@/integrations/supabase/client";
import { QuestionCacheService } from "./questionCacheService";

export interface SkillAwareCacheKey {
  examId: string;
  questionNumber: number;
  studentAnswer: string;
  correctAnswer: string;
  skillTags: string[];
  questionType?: string;
}

export interface SkillAwareCacheResult {
  response: any;
  skillTags: string[];
  responseType: 'grading' | 'analysis' | 'feedback';
  cacheHit: true;
  cachedAt: number;
  cacheVersion: string;
  originalMethod: string;
}

export interface SkillCacheStats {
  totalBySkill: Record<string, number>;
  hitRateBySkill: Record<string, number>;
  topSkillCombinations: Array<{
    skillCombination: string[];
    hitCount: number;
    hitRate: number;
  }>;
  costSavingsBySkill: Record<string, number>;
}

export class SkillAwareCacheService {
  private static readonly CACHE_VERSION = "v1.1_skill_aware";
  private static readonly SKILL_CACHE_DURATION = 14 * 24 * 60 * 60 * 1000; // 14 days
  
  // Performance tracking by skill
  private static skillMetrics: Record<string, {
    queries: number;
    hits: number;
    costSavings: number;
  }> = {};

  static generateSkillAwareCacheKey(params: SkillAwareCacheKey): string {
    const { examId, questionNumber, studentAnswer, correctAnswer, skillTags, questionType } = params;
    
    // Sort skill tags for consistent key generation
    const sortedSkills = [...skillTags].sort().join('|');
    const answersHash = `${studentAnswer}_${correctAnswer}`.substring(0, 30);
    const typePrefix = questionType ? `${questionType}_` : '';
    
    return `skill_${examId}_${questionNumber}_${typePrefix}${sortedSkills}_${answersHash}`;
  }

  static async getCachedSkillResponse(params: SkillAwareCacheKey): Promise<SkillAwareCacheResult | null> {
    try {
      const cacheKey = this.generateSkillAwareCacheKey(params);
      const skillTag = params.skillTags.join(',');
      
      // Track metrics
      this.updateSkillMetrics(skillTag, 'query');
      
      // Check database cache with skill awareness
      const { data, error } = await supabase.functions.invoke('get-skill-aware-cache', {
        body: { 
          cacheKey,
          skillTags: params.skillTags,
          examId: params.examId,
          questionNumber: params.questionNumber
        }
      });

      if (error || !data?.result) {
        return null;
      }

      // Track hit
      this.updateSkillMetrics(skillTag, 'hit');
      this.updateSkillMetrics(skillTag, 'cost_saving', data.estimatedCostSaving || 0.002);
      
      console.log(`🎯 Skill-aware cache hit: ${cacheKey} (skills: ${skillTag})`);
      
      return {
        ...data.result,
        cacheHit: true,
        cachedAt: data.cachedAt,
        skillTags: params.skillTags
      };
    } catch (error) {
      console.error('Skill-aware cache retrieval error:', error);
      return null;
    }
  }

  static async setCachedSkillResponse(
    params: SkillAwareCacheKey,
    response: any,
    responseType: 'grading' | 'analysis' | 'feedback' = 'grading',
    originalMethod: string = 'unknown'
  ): Promise<void> {
    try {
      const cacheKey = this.generateSkillAwareCacheKey(params);
      const cachedAt = Date.now();

      const cachedResult: SkillAwareCacheResult = {
        response,
        skillTags: params.skillTags,
        responseType,
        cacheHit: true,
        cachedAt,
        cacheVersion: this.CACHE_VERSION,
        originalMethod
      };

      await supabase.functions.invoke('set-skill-aware-cache', {
        body: {
          cacheKey,
          examId: params.examId,
          questionNumber: params.questionNumber,
          skillTags: params.skillTags,
          responseType,
          result: cachedResult,
          cachedAt,
          expiresAt: cachedAt + this.SKILL_CACHE_DURATION,
          originalMethod
        }
      });

      console.log(`💾 Skill-aware cache stored: ${cacheKey} (skills: ${params.skillTags.join(', ')})`);
    } catch (error) {
      console.error('Skill-aware cache storage error:', error);
    }
  }

  static async fetchOrGenerateResponse<T>(
    params: SkillAwareCacheKey,
    generateFunction: () => Promise<T>,
    responseType: 'grading' | 'analysis' | 'feedback' = 'grading',
    originalMethod: string = 'ai_generated'
  ): Promise<T> {
    // Try skill-aware cache first
    const cached = await this.getCachedSkillResponse(params);
    if (cached) {
      return cached.response as T;
    }

    // Generate new response
    const response = await generateFunction();
    
    // Cache the response with skill context
    await this.setCachedSkillResponse(params, response, responseType, originalMethod);
    
    return response;
  }

  static async getSkillCacheStats(): Promise<SkillCacheStats> {
    try {
      const { data } = await supabase.functions.invoke('get-skill-cache-stats');
      
      if (data) {
        return {
          ...data,
          // Enhance with local metrics
          hitRateBySkill: this.calculateSkillHitRates(),
          costSavingsBySkill: this.extractCostSavings()
        };
      }
      
      return this.getLocalSkillStats();
    } catch (error) {
      console.error('Skill cache stats error:', error);
      return this.getLocalSkillStats();
    }
  }

  private static updateSkillMetrics(skillTag: string, type: 'query' | 'hit' | 'cost_saving', value: number = 1): void {
    if (!this.skillMetrics[skillTag]) {
      this.skillMetrics[skillTag] = { queries: 0, hits: 0, costSavings: 0 };
    }
    
    if (type === 'query') {
      this.skillMetrics[skillTag].queries += 1;
    } else if (type === 'hit') {
      this.skillMetrics[skillTag].hits += 1;
    } else if (type === 'cost_saving') {
      this.skillMetrics[skillTag].costSavings += value;
    }
  }

  private static calculateSkillHitRates(): Record<string, number> {
    const hitRates: Record<string, number> = {};
    
    for (const [skill, metrics] of Object.entries(this.skillMetrics)) {
      hitRates[skill] = metrics.queries > 0 ? metrics.hits / metrics.queries : 0;
    }
    
    return hitRates;
  }

  private static extractCostSavings(): Record<string, number> {
    const savings: Record<string, number> = {};
    
    for (const [skill, metrics] of Object.entries(this.skillMetrics)) {
      savings[skill] = metrics.costSavings;
    }
    
    return savings;
  }

  private static getLocalSkillStats(): SkillCacheStats {
    return {
      totalBySkill: Object.fromEntries(
        Object.entries(this.skillMetrics).map(([skill, metrics]) => [skill, metrics.queries])
      ),
      hitRateBySkill: this.calculateSkillHitRates(),
      topSkillCombinations: [],
      costSavingsBySkill: this.extractCostSavings()
    };
  }

  static clearSkillCache(): void {
    this.skillMetrics = {};
    console.log('Skill-aware cache metrics cleared');
  }

  static preloadCommonSkillResponses(
    examId: string,
    commonPatterns: Array<{
      questionNumber: number;
      skillTags: string[];
      commonAnswers: Array<{ student: string; correct: string }>;
    }>
  ): Promise<void> {
    console.log(`🔄 Pre-loading skill-aware cache for exam: ${examId}`);
    
    return Promise.all(
      commonPatterns.flatMap(pattern =>
        pattern.commonAnswers.map(async answers => {
          const params: SkillAwareCacheKey = {
            examId,
            questionNumber: pattern.questionNumber,
            studentAnswer: answers.student,
            correctAnswer: answers.correct,
            skillTags: pattern.skillTags
          };
          
          // Check if already cached
          const existing = await this.getCachedSkillResponse(params);
          if (!existing) {
            // Pre-generate and cache common responses
            // This would integrate with existing grading services
            console.log(`Pre-loading cache for Q${pattern.questionNumber} with skills: ${pattern.skillTags.join(', ')}`);
          }
        })
      )
    ).then(() => {
      console.log(`✅ Skill-aware pre-loading complete for exam: ${examId}`);
    });
  }
}
