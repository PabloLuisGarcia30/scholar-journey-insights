
import { ValidationMonitoringService, type PerformanceBenchmark } from './validationMonitoringService';
import { jsonValidationService } from './jsonValidationService';

export interface OptimizationMetrics {
  averageValidationTime: number;
  validationOverhead: number;
  optimalBatchSize: number;
  cacheHitRate: number;
  recommendedOptimizations: string[];
}

export interface CachedSchema {
  schemaKey: string;
  compiledValidator: any;
  lastUsed: number;
  hitCount: number;
}

export class PerformanceOptimizationService {
  private static schemaCache = new Map<string, CachedSchema>();
  private static readonly MAX_CACHE_SIZE = 50;
  private static readonly CACHE_TTL = 60 * 60 * 1000; // 1 hour
  private static performanceHistory: PerformanceBenchmark[] = [];

  // Enhanced validation with performance monitoring
  static async validateWithPerformanceTracking<T>(
    data: unknown,
    validationType: 'grading' | 'batch' | 'analysis',
    batchSize?: number
  ): Promise<{ success: boolean; data?: T; errors?: string[]; metrics: { validationTime: number; fromCache: boolean } }> {
    const startTime = performance.now();
    const schemaKey = `${validationType}_schema`;
    
    let fromCache = false;
    let validator;

    // Try to get validator from cache
    const cached = this.schemaCache.get(schemaKey);
    if (cached && (Date.now() - cached.lastUsed) < this.CACHE_TTL) {
      validator = cached.compiledValidator;
      cached.lastUsed = Date.now();
      cached.hitCount++;
      fromCache = true;
    } else {
      // Create new validator and cache it
      validator = this.createAndCacheValidator(schemaKey, validationType);
    }

    // Perform validation
    let result;
    switch (validationType) {
      case 'grading':
        result = jsonValidationService.validateGradingResult(data);
        break;
      case 'batch':
        result = jsonValidationService.validateBatchGradingResult(data);
        break;
      case 'analysis':
        result = jsonValidationService.validateTestAnalysisResult(data);
        break;
      default:
        result = { success: false, errors: ['Unknown validation type'] };
    }

    const validationTime = performance.now() - startTime;

    // Log performance metrics
    await this.logPerformanceMetrics({
      operationType: validationType,
      batchSize,
      validationTimeMs: validationTime,
      fromCache,
      success: result.success
    });

    return {
      ...result,
      data: result.data as T,
      metrics: {
        validationTime,
        fromCache
      }
    };
  }

  private static createAndCacheValidator(schemaKey: string, validationType: string): any {
    // Clean up cache if it's too large
    if (this.schemaCache.size >= this.MAX_CACHE_SIZE) {
      this.cleanupCache();
    }

    // Create validator (placeholder - would use actual AJV compilation)
    const validator = { type: validationType, compiled: true };

    // Cache the validator
    this.schemaCache.set(schemaKey, {
      schemaKey,
      compiledValidator: validator,
      lastUsed: Date.now(),
      hitCount: 1
    });

    return validator;
  }

  private static cleanupCache(): void {
    // Remove least recently used entries
    const entries = Array.from(this.schemaCache.entries())
      .sort((a, b) => a[1].lastUsed - b[1].lastUsed);

    // Remove oldest 25% of entries
    const toRemove = Math.floor(entries.length * 0.25);
    for (let i = 0; i < toRemove; i++) {
      this.schemaCache.delete(entries[i][0]);
    }
  }

  static async logPerformanceMetrics(metrics: {
    operationType: string;
    batchSize?: number;
    validationTimeMs: number;
    fromCache: boolean;
    success: boolean;
  }): Promise<void> {
    // Calculate overhead percentage (validation time vs estimated total processing time)
    const estimatedTotalTime = metrics.batchSize ? metrics.batchSize * 100 : 1000; // Rough estimate
    const overheadPercent = (metrics.validationTimeMs / estimatedTotalTime) * 100;

    const benchmark: PerformanceBenchmark = {
      operationType: metrics.operationType,
      batchSize: metrics.batchSize,
      totalProcessingTimeMs: estimatedTotalTime,
      validationTimeMs: metrics.validationTimeMs,
      validationOverheadPercent: overheadPercent,
      successRate: metrics.success ? 100 : 0,
      systemLoad: this.determineSystemLoad(metrics.validationTimeMs),
      optimizationNotes: metrics.fromCache ? 'Used cached schema' : 'Compiled new schema'
    };

    // Store in memory for immediate access
    this.performanceHistory.push(benchmark);
    if (this.performanceHistory.length > 1000) {
      this.performanceHistory = this.performanceHistory.slice(-1000);
    }

    // Log to database
    await ValidationMonitoringService.logPerformanceBenchmark(benchmark);
  }

  private static determineSystemLoad(validationTime: number): 'low' | 'medium' | 'high' | 'critical' {
    if (validationTime < 10) return 'low';
    if (validationTime < 50) return 'medium';
    if (validationTime < 200) return 'high';
    return 'critical';
  }

  static async getOptimizationRecommendations(): Promise<OptimizationMetrics> {
    const recentMetrics = this.performanceHistory.slice(-100); // Last 100 operations
    
    if (recentMetrics.length === 0) {
      return {
        averageValidationTime: 0,
        validationOverhead: 0,
        optimalBatchSize: 10,
        cacheHitRate: 0,
        recommendedOptimizations: ['No performance data available yet']
      };
    }

    const averageValidationTime = recentMetrics.reduce((sum, m) => sum + m.validationTimeMs, 0) / recentMetrics.length;
    const validationOverhead = recentMetrics.reduce((sum, m) => sum + m.validationOverheadPercent, 0) / recentMetrics.length;
    
    // Calculate cache hit rate
    const totalCacheOps = Array.from(this.schemaCache.values()).reduce((sum, cache) => sum + cache.hitCount, 0);
    const totalSchemaRequests = totalCacheOps + this.schemaCache.size;
    const cacheHitRate = totalSchemaRequests > 0 ? (totalCacheOps / totalSchemaRequests) * 100 : 0;

    // Find optimal batch size based on performance data
    const batchSizePerformance = new Map<number, number>();
    recentMetrics.filter(m => m.batchSize).forEach(m => {
      const batchSize = m.batchSize!;
      const efficiency = m.validationTimeMs / batchSize; // Time per item
      if (!batchSizePerformance.has(batchSize) || batchSizePerformance.get(batchSize)! > efficiency) {
        batchSizePerformance.set(batchSize, efficiency);
      }
    });

    const optimalBatchSize = batchSizePerformance.size > 0 
      ? Array.from(batchSizePerformance.entries()).sort((a, b) => a[1] - b[1])[0][0]
      : 10;

    // Generate recommendations
    const recommendations: string[] = [];
    
    if (averageValidationTime > 100) {
      recommendations.push('Consider implementing parallel validation for large batches');
    }
    if (validationOverhead > 15) {
      recommendations.push('Validation overhead is high - consider schema caching optimization');
    }
    if (cacheHitRate < 70) {
      recommendations.push('Low cache hit rate - consider extending cache TTL or pre-warming cache');
    }
    if (optimalBatchSize > 20) {
      recommendations.push(`Increase batch size to ${optimalBatchSize} for better performance`);
    } else if (optimalBatchSize < 5) {
      recommendations.push('Decrease batch size to reduce individual processing time');
    }

    return {
      averageValidationTime,
      validationOverhead,
      optimalBatchSize,
      cacheHitRate,
      recommendedOptimizations: recommendations.length > 0 ? recommendations : ['Performance is optimal']
    };
  }

  static async clearPerformanceCache(): Promise<void> {
    this.schemaCache.clear();
    this.performanceHistory = [];
    console.log('Performance cache cleared');
  }

  static getCacheStatistics(): {
    cacheSize: number;
    totalHits: number;
    averageHitCount: number;
    oldestEntry: number;
  } {
    const caches = Array.from(this.schemaCache.values());
    const totalHits = caches.reduce((sum, cache) => sum + cache.hitCount, 0);
    const averageHitCount = caches.length > 0 ? totalHits / caches.length : 0;
    const oldestEntry = caches.length > 0 ? Math.min(...caches.map(cache => cache.lastUsed)) : 0;

    return {
      cacheSize: this.schemaCache.size,
      totalHits,
      averageHitCount,
      oldestEntry
    };
  }

  // Parallel validation for batch operations
  static async validateBatchInParallel<T>(
    items: unknown[],
    validationType: 'grading' | 'batch' | 'analysis',
    concurrency: number = 5
  ): Promise<Array<{ success: boolean; data?: T; errors?: string[]; index: number }>> {
    const results: Array<{ success: boolean; data?: T; errors?: string[]; index: number }> = [];
    
    // Process items in parallel with controlled concurrency
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item, batchIndex) => {
        const result = await this.validateWithPerformanceTracking<T>(item, validationType);
        return {
          ...result,
          index: i + batchIndex
        };
      });

      const batchResults = await Promise.allSettled(batchPromises);
      batchResults.forEach((result) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          results.push({
            success: false,
            errors: [result.reason?.message || 'Unknown error'],
            index: results.length
          });
        }
      });
    }

    return results.sort((a, b) => a.index - b.index);
  }
}
