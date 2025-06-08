
import { ValidationMonitoringService } from './validationMonitoringService';
import { jsonValidationService, type GradingResult, type BatchGradingResult, type TestAnalysisResult } from './jsonValidationService';

export interface RecoveryContext {
  originalRequest: any;
  originalResponse: string;
  errorType: 'json_parse' | 'schema_validation' | 'response_format';
  attemptNumber: number;
  maxAttempts: number;
  sessionId: string;
}

export interface RecoveryResult<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  attemptsUsed: number;
  recoveryStrategy: string;
  totalRecoveryTime: number;
}

export class EnhancedErrorRecoveryService {
  private static readonly MAX_RECOVERY_ATTEMPTS = 3;
  private static readonly RECOVERY_TIMEOUT = 30000; // 30 seconds

  static async recoverFromValidationError<T>(
    context: RecoveryContext,
    validationType: 'grading' | 'batch' | 'analysis'
  ): Promise<RecoveryResult<T>> {
    const startTime = Date.now();
    const recoverySessionId = await ValidationMonitoringService.startErrorRecoverySession({
      originalRequestId: context.sessionId,
      errorType: context.errorType,
      recoveryStrategy: 'retry',
      recoveryDetails: {
        validationType,
        originalError: context.originalResponse,
        maxAttempts: context.maxAttempts
      }
    });

    let lastError = '';
    let recoveryStrategy = 'direct_retry';

    for (let attempt = 1; attempt <= this.MAX_RECOVERY_ATTEMPTS; attempt++) {
      try {
        console.log(`🔄 Recovery attempt ${attempt}/${this.MAX_RECOVERY_ATTEMPTS} for ${validationType}`);

        // Update recovery session
        await ValidationMonitoringService.updateErrorRecoverySession(recoverySessionId, {
          attemptsCount: attempt,
          recoveryDetails: {
            currentStrategy: recoveryStrategy,
            attempt,
            lastError
          }
        });

        let recoveredData: T | undefined;

        // Strategy 1: Direct retry with original response
        if (attempt === 1) {
          recoveryStrategy = 'direct_retry';
          recoveredData = await this.attemptDirectRetry<T>(context, validationType);
        }
        // Strategy 2: Schema-corrected retry
        else if (attempt === 2) {
          recoveryStrategy = 'schema_correction';
          recoveredData = await this.attemptSchemaCorrectedRetry<T>(context, validationType);
        }
        // Strategy 3: Fallback response
        else {
          recoveryStrategy = 'fallback_response';
          recoveredData = await this.createFallbackResponse<T>(context, validationType);
        }

        if (recoveredData) {
          const totalRecoveryTime = Date.now() - startTime;
          
          // Update recovery session as successful
          await ValidationMonitoringService.updateErrorRecoverySession(recoverySessionId, {
            finalSuccess: true,
            totalRecoveryTimeMs: totalRecoveryTime,
            recoveryDetails: {
              successfulStrategy: recoveryStrategy,
              finalAttempt: attempt
            }
          });

          // Log successful recovery
          await ValidationMonitoringService.logValidation({
            operationType: validationType,
            validationType: 'schema',
            success: true,
            processingTimeMs: totalRecoveryTime,
            retryCount: attempt,
            sessionId: context.sessionId,
            userContext: { recoveryUsed: true, recoveryStrategy }
          });

          return {
            success: true,
            data: recoveredData,
            attemptsUsed: attempt,
            recoveryStrategy,
            totalRecoveryTime
          };
        }
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`⚠️ Recovery attempt ${attempt} failed:`, lastError);
      }
    }

    const totalRecoveryTime = Date.now() - startTime;

    // Update recovery session as failed
    await ValidationMonitoringService.updateErrorRecoverySession(recoverySessionId, {
      finalSuccess: false,
      totalRecoveryTimeMs: totalRecoveryTime,
      recoveryDetails: {
        finalError: lastError,
        allStrategiesFailed: true
      }
    });

    // Log failed recovery
    await ValidationMonitoringService.logValidation({
      operationType: validationType,
      validationType: 'schema',
      success: false,
      errorMessage: `Recovery failed after ${this.MAX_RECOVERY_ATTEMPTS} attempts: ${lastError}`,
      processingTimeMs: totalRecoveryTime,
      retryCount: this.MAX_RECOVERY_ATTEMPTS,
      sessionId: context.sessionId,
      userContext: { recoveryUsed: true, allStrategiesFailed: true }
    });

    return {
      success: false,
      error: `Recovery failed after ${this.MAX_RECOVERY_ATTEMPTS} attempts: ${lastError}`,
      attemptsUsed: this.MAX_RECOVERY_ATTEMPTS,
      recoveryStrategy: 'failed',
      totalRecoveryTime
    };
  }

  private static async attemptDirectRetry<T>(
    context: RecoveryContext,
    validationType: 'grading' | 'batch' | 'analysis'
  ): Promise<T | undefined> {
    try {
      // Clean up the response and try parsing again
      const cleanedResponse = this.cleanJsonResponse(context.originalResponse);
      const parsed = JSON.parse(cleanedResponse);
      
      // Validate with appropriate schema
      const result = jsonValidationService.parseAndValidateAIResponse(
        JSON.stringify(parsed),
        validationType
      );

      if (result.success && result.data) {
        return result.data as T;
      }
    } catch (error) {
      console.warn('Direct retry failed:', error);
    }
    return undefined;
  }

  private static async attemptSchemaCorrectedRetry<T>(
    context: RecoveryContext,
    validationType: 'grading' | 'batch' | 'analysis'
  ): Promise<T | undefined> {
    try {
      // Attempt to fix common schema issues
      const correctedResponse = this.applySchemaCorrectionHeuristics(
        context.originalResponse,
        validationType
      );
      
      const result = jsonValidationService.parseAndValidateAIResponse(
        correctedResponse,
        validationType
      );

      if (result.success && result.data) {
        return result.data as T;
      }
    } catch (error) {
      console.warn('Schema-corrected retry failed:', error);
    }
    return undefined;
  }

  private static async createFallbackResponse<T>(
    context: RecoveryContext,
    validationType: 'grading' | 'batch' | 'analysis'
  ): Promise<T | undefined> {
    try {
      switch (validationType) {
        case 'grading':
          return jsonValidationService.createFallbackGradingResult(
            1,
            'Error recovery fallback'
          ) as T;
          
        case 'batch':
          // Estimate question count from original request
          const questionCount = this.estimateQuestionCount(context.originalRequest);
          return jsonValidationService.createFallbackBatchResult(
            questionCount,
            'Error recovery fallback'
          ) as T;
          
        case 'analysis':
          return {
            overallScore: 0,
            grade: 'F',
            total_points_earned: 0,
            total_points_possible: 0,
            ai_feedback: 'Analysis could not be completed due to technical issues. Please try again.',
            content_skill_scores: [],
            subject_skill_scores: []
          } as T;
          
        default:
          return undefined;
      }
    } catch (error) {
      console.error('Failed to create fallback response:', error);
      return undefined;
    }
  }

  private static cleanJsonResponse(response: string): string {
    // Remove common JSON formatting issues
    return response
      .trim()
      .replace(/^```json\s*/, '') // Remove markdown code blocks
      .replace(/\s*```$/, '')
      .replace(/[\r\n\t]/g, ' ') // Normalize whitespace
      .replace(/,(\s*[}\]])/g, '$1') // Remove trailing commas
      .replace(/([{,]\s*)"([^"]+)"\s*:\s*"([^"]*)"(\s*[,}])/g, '$1"$2":"$3"$4'); // Fix spacing
  }

  private static applySchemaCorrectionHeuristics(
    response: string,
    validationType: string
  ): string {
    let corrected = this.cleanJsonResponse(response);

    // Common schema corrections based on validation type
    if (validationType === 'grading') {
      // Ensure required grading fields exist
      corrected = corrected.replace(
        /"isCorrect":\s*(true|false)/g,
        '"isCorrect":$1,"pointsEarned":0,"confidence":0.5'
      );
    } else if (validationType === 'batch') {
      // Ensure batch structure
      if (!corrected.includes('"results"')) {
        corrected = `{"results":[${corrected}]}`;
      }
    } else if (validationType === 'analysis') {
      // Ensure analysis structure
      if (!corrected.includes('"overallScore"')) {
        corrected = corrected.replace(/^{/, '{"overallScore":0,"grade":"F",');
      }
    }

    return corrected;
  }

  private static estimateQuestionCount(originalRequest: any): number {
    // Try to estimate question count from the original request
    if (originalRequest?.files?.length) {
      return Math.max(1, originalRequest.files.length * 5); // Estimate 5 questions per file
    }
    if (originalRequest?.questions?.length) {
      return originalRequest.questions.length;
    }
    return 10; // Default fallback
  }

  static async logRecoveryAttempt(
    sessionId: string,
    validationType: 'grading' | 'batch' | 'analysis',
    success: boolean,
    strategy: string,
    processingTime: number,
    errorMessage?: string
  ): Promise<void> {
    await ValidationMonitoringService.logValidation({
      operationType: validationType,
      validationType: 'schema',
      success,
      errorMessage,
      processingTimeMs: processingTime,
      sessionId,
      userContext: {
        isRecoveryAttempt: true,
        recoveryStrategy: strategy
      }
    });
  }
}
