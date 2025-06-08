
import { jsonValidationService, type GradingResult, type BatchGradingResult, type TestAnalysisResult } from './jsonValidationService';
import { ValidationMonitoringService } from './validationMonitoringService';
import { EnhancedErrorRecoveryService, type RecoveryContext } from './enhancedErrorRecoveryService';
import { PerformanceOptimizationService } from './performanceOptimizationService';

export interface EnhancedValidationResult<T = any> {
  success: boolean;
  data?: T;
  errors?: string[];
  metadata: {
    processingTime: number;
    retryCount: number;
    usedCache: boolean;
    recoveryUsed: boolean;
    validationVersion: string;
  };
}

export class EnhancedJsonValidationService {
  private static readonly VALIDATION_VERSION = '2.0.0';
  private static requestCounter = 0;

  // Enhanced validation with full monitoring and recovery
  static async validateWithEnhancement<T>(
    jsonString: string,
    expectedType: 'grading' | 'batch' | 'analysis',
    context?: {
      sessionId?: string;
      batchSize?: number;
      modelUsed?: string;
      temperature?: number;
    }
  ): Promise<EnhancedValidationResult<T>> {
    const startTime = performance.now();
    const requestId = `req_${++this.requestCounter}_${Date.now()}`;
    const sessionId = context?.sessionId || `session_${Date.now()}`;
    
    let retryCount = 0;
    let recoveryUsed = false;
    let usedCache = false;

    try {
      // First attempt with performance tracking
      const result = await PerformanceOptimizationService.validateWithPerformanceTracking<T>(
        JSON.parse(jsonString),
        expectedType,
        context?.batchSize
      );

      usedCache = result.metrics.fromCache;

      if (result.success && result.data) {
        const processingTime = performance.now() - startTime;

        // Log successful validation
        await ValidationMonitoringService.logValidation({
          operationType: expectedType,
          validationType: 'schema',
          success: true,
          processingTimeMs: processingTime,
          inputSizeBytes: jsonString.length,
          retryCount: 0,
          modelUsed: context?.modelUsed,
          temperature: context?.temperature,
          sessionId,
          userContext: { enhanced: true, cached: usedCache }
        });

        return {
          success: true,
          data: result.data,
          metadata: {
            processingTime,
            retryCount: 0,
            usedCache,
            recoveryUsed: false,
            validationVersion: this.VALIDATION_VERSION
          }
        };
      }

      // If validation failed, attempt error recovery
      console.log(`⚠️ Initial validation failed for ${expectedType}, attempting recovery...`);
      recoveryUsed = true;

      const recoveryContext: RecoveryContext = {
        originalRequest: context,
        originalResponse: jsonString,
        errorType: 'schema_validation',
        attemptNumber: 1,
        maxAttempts: 3,
        sessionId: requestId
      };

      const recoveryResult = await EnhancedErrorRecoveryService.recoverFromValidationError<T>(
        recoveryContext,
        expectedType
      );

      retryCount = recoveryResult.attemptsUsed;
      const totalProcessingTime = performance.now() - startTime;

      if (recoveryResult.success && recoveryResult.data) {
        return {
          success: true,
          data: recoveryResult.data,
          metadata: {
            processingTime: totalProcessingTime,
            retryCount,
            usedCache,
            recoveryUsed: true,
            validationVersion: this.VALIDATION_VERSION
          }
        };
      }

      // Recovery failed
      await ValidationMonitoringService.logValidation({
        operationType: expectedType,
        validationType: 'schema',
        success: false,
        errorMessage: `Enhanced validation failed: ${recoveryResult.error}`,
        errorDetails: { originalErrors: result.errors, recoveryError: recoveryResult.error },
        processingTimeMs: totalProcessingTime,
        inputSizeBytes: jsonString.length,
        retryCount,
        modelUsed: context?.modelUsed,
        temperature: context?.temperature,
        sessionId,
        userContext: { enhanced: true, recoveryFailed: true }
      });

      return {
        success: false,
        errors: [`Enhanced validation failed: ${recoveryResult.error}`],
        metadata: {
          processingTime: totalProcessingTime,
          retryCount,
          usedCache,
          recoveryUsed: true,
          validationVersion: this.VALIDATION_VERSION
        }
      };

    } catch (parseError) {
      // JSON parsing error - attempt recovery
      console.log('📝 JSON parsing error, attempting recovery...');
      recoveryUsed = true;

      const recoveryContext: RecoveryContext = {
        originalRequest: context,
        originalResponse: jsonString,
        errorType: 'json_parse',
        attemptNumber: 1,
        maxAttempts: 3,
        sessionId: requestId
      };

      const recoveryResult = await EnhancedErrorRecoveryService.recoverFromValidationError<T>(
        recoveryContext,
        expectedType
      );

      retryCount = recoveryResult.attemptsUsed;
      const totalProcessingTime = performance.now() - startTime;

      if (recoveryResult.success && recoveryResult.data) {
        return {
          success: true,
          data: recoveryResult.data,
          metadata: {
            processingTime: totalProcessingTime,
            retryCount,
            usedCache,
            recoveryUsed: true,
            validationVersion: this.VALIDATION_VERSION
          }
        };
      }

      // Complete failure
      const errorMessage = parseError instanceof Error ? parseError.message : 'Unknown parsing error';
      
      await ValidationMonitoringService.logValidation({
        operationType: expectedType,
        validationType: 'json_parse',
        success: false,
        errorMessage: `Parse and recovery failed: ${errorMessage}`,
        errorDetails: { parseError: errorMessage, recoveryError: recoveryResult.error },
        processingTimeMs: totalProcessingTime,
        inputSizeBytes: jsonString.length,
        retryCount,
        modelUsed: context?.modelUsed,
        temperature: context?.temperature,
        sessionId,
        userContext: { enhanced: true, completeFailed: true }
      });

      return {
        success: false,
        errors: [`Parse and recovery failed: ${errorMessage}`],
        metadata: {
          processingTime: totalProcessingTime,
          retryCount,
          usedCache,
          recoveryUsed: true,
          validationVersion: this.VALIDATION_VERSION
        }
      };
    }
  }

  // Batch validation with parallel processing
  static async validateBatchWithEnhancement<T>(
    items: Array<{ jsonString: string; id?: string }>,
    expectedType: 'grading' | 'batch' | 'analysis',
    options: {
      sessionId?: string;
      concurrency?: number;
      batchSize?: number;
      modelUsed?: string;
      temperature?: number;
    } = {}
  ): Promise<{
    results: Array<EnhancedValidationResult<T> & { id?: string }>;
    summary: {
      totalItems: number;
      successCount: number;
      failureCount: number;
      totalProcessingTime: number;
      averageItemTime: number;
      recoveryUsageRate: number;
    };
  }> {
    const startTime = performance.now();
    const concurrency = options.concurrency || 5;
    
    console.log(`🔄 Starting enhanced batch validation: ${items.length} items with concurrency ${concurrency}`);

    const results: Array<EnhancedValidationResult<T> & { id?: string }> = [];
    
    // Process items in parallel batches
    for (let i = 0; i < items.length; i += concurrency) {
      const batch = items.slice(i, i + concurrency);
      const batchPromises = batch.map(async (item) => {
        const result = await this.validateWithEnhancement<T>(
          item.jsonString,
          expectedType,
          {
            ...options,
            batchSize: items.length,
            sessionId: options.sessionId || `batch_${Date.now()}`
          }
        );
        return { ...result, id: item.id };
      });

      const batchResults = await Promise.allSettled(batchPromises);
      
      batchResults.forEach((result, batchIndex) => {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error(`Batch item ${i + batchIndex} failed:`, result.reason);
          results.push({
            success: false,
            errors: [result.reason?.message || 'Unknown batch processing error'],
            metadata: {
              processingTime: 0,
              retryCount: 0,
              usedCache: false,
              recoveryUsed: false,
              validationVersion: this.VALIDATION_VERSION
            },
            id: batch[batchIndex].id
          });
        }
      });
    }

    const totalProcessingTime = performance.now() - startTime;
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    const recoveryUsageCount = results.filter(r => r.metadata.recoveryUsed).length;
    const recoveryUsageRate = results.length > 0 ? (recoveryUsageCount / results.length) * 100 : 0;

    // Log batch performance
    await ValidationMonitoringService.logPerformanceBenchmark({
      operationType: `batch_${expectedType}`,
      batchSize: items.length,
      totalProcessingTimeMs: totalProcessingTime,
      validationTimeMs: results.reduce((sum, r) => sum + r.metadata.processingTime, 0),
      validationOverheadPercent: 0, // Calculated elsewhere
      successRate: (successCount / results.length) * 100,
      systemLoad: totalProcessingTime > 10000 ? 'high' : totalProcessingTime > 5000 ? 'medium' : 'low',
      optimizationNotes: `Enhanced batch validation with ${concurrency} concurrency, ${recoveryUsageRate.toFixed(1)}% recovery usage`
    });

    console.log(`✅ Enhanced batch validation complete: ${successCount}/${results.length} successful`);

    return {
      results,
      summary: {
        totalItems: items.length,
        successCount,
        failureCount,
        totalProcessingTime,
        averageItemTime: totalProcessingTime / items.length,
        recoveryUsageRate
      }
    };
  }

  // Legacy compatibility method
  static async parseAndValidateAIResponse(
    jsonString: string,
    expectedType: 'grading' | 'batch' | 'analysis'
  ): Promise<{ success: boolean; data?: any; errors?: string[] }> {
    const result = await this.validateWithEnhancement(jsonString, expectedType);
    return {
      success: result.success,
      data: result.data,
      errors: result.errors
    };
  }

  // Get enhanced service statistics
  static async getEnhancedStatistics(): Promise<{
    validationMetrics: any;
    optimizationMetrics: any;
    systemHealth: any;
    cacheStatistics: any;
  }> {
    const [validationMetrics, optimizationMetrics, systemHealth] = await Promise.all([
      ValidationMonitoringService.getValidationMetrics('24h'),
      PerformanceOptimizationService.getOptimizationRecommendations(),
      ValidationMonitoringService.getSystemHealth()
    ]);

    const cacheStatistics = PerformanceOptimizationService.getCacheStatistics();

    return {
      validationMetrics,
      optimizationMetrics,
      systemHealth,
      cacheStatistics
    };
  }
}

// Export enhanced service as default
export const enhancedJsonValidationService = EnhancedJsonValidationService;
