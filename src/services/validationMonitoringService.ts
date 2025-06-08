
import { supabase } from "@/integrations/supabase/client";

export interface ValidationLogEntry {
  operationType: 'grading' | 'batch' | 'analysis';
  validationType: 'schema' | 'json_parse' | 'response_format';
  success: boolean;
  errorMessage?: string;
  errorDetails?: Record<string, any>;
  processingTimeMs: number;
  inputSizeBytes?: number;
  retryCount?: number;
  schemaVersion?: string;
  modelUsed?: string;
  temperature?: number;
  sessionId?: string;
  userContext?: Record<string, any>;
}

export interface PerformanceBenchmark {
  operationType: string;
  batchSize?: number;
  totalProcessingTimeMs: number;
  validationTimeMs: number;
  validationOverheadPercent: number;
  successRate: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  optimizationNotes?: string;
}

export interface ErrorRecoverySession {
  originalRequestId: string;
  errorType: string;
  recoveryStrategy: 'retry' | 'fallback_prompt' | 'schema_correction';
  attemptsCount: number;
  finalSuccess?: boolean;
  totalRecoveryTimeMs?: number;
  recoveryDetails?: Record<string, any>;
}

export interface ValidationMetrics {
  totalValidations: number;
  successRate: number;
  averageProcessingTime: number;
  errorBreakdown: Record<string, number>;
  performanceTrends: Array<{ timestamp: string; successRate: number; avgTime: number }>;
  topErrors: Array<{ error: string; count: number; percentage: number }>;
}

export class ValidationMonitoringService {
  private static readonly SCHEMA_VERSION = '1.0.0';
  private static sessionId: string = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

  static async logValidation(entry: ValidationLogEntry): Promise<void> {
    try {
      const { error } = await supabase
        .from('validation_logs')
        .insert({
          operation_type: entry.operationType,
          validation_type: entry.validationType,
          success: entry.success,
          error_message: entry.errorMessage,
          error_details: entry.errorDetails,
          processing_time_ms: entry.processingTimeMs,
          input_size_bytes: entry.inputSizeBytes,
          retry_count: entry.retryCount || 0,
          schema_version: entry.schemaVersion || this.SCHEMA_VERSION,
          model_used: entry.modelUsed,
          temperature: entry.temperature,
          session_id: entry.sessionId || this.sessionId,
          user_context: entry.userContext
        });

      if (error) {
        console.error('Failed to log validation entry:', error);
      }
    } catch (error) {
      console.error('Error logging validation:', error);
    }
  }

  static async logPerformanceBenchmark(benchmark: PerformanceBenchmark): Promise<void> {
    try {
      const { error } = await supabase
        .from('performance_benchmarks')
        .insert({
          operation_type: benchmark.operationType,
          batch_size: benchmark.batchSize,
          total_processing_time_ms: benchmark.totalProcessingTimeMs,
          validation_time_ms: benchmark.validationTimeMs,
          validation_overhead_percent: benchmark.validationOverheadPercent,
          success_rate: benchmark.successRate,
          system_load: benchmark.systemLoad,
          optimization_notes: benchmark.optimizationNotes
        });

      if (error) {
        console.error('Failed to log performance benchmark:', error);
      }
    } catch (error) {
      console.error('Error logging performance benchmark:', error);
    }
  }

  static async startErrorRecoverySession(session: Omit<ErrorRecoverySession, 'attemptsCount'>): Promise<string> {
    try {
      const { data, error } = await supabase
        .from('error_recovery_sessions')
        .insert({
          original_request_id: session.originalRequestId,
          error_type: session.errorType,
          recovery_strategy: session.recoveryStrategy,
          attempts_count: 1,
          recovery_details: session.recoveryDetails
        })
        .select('id')
        .single();

      if (error || !data) {
        console.error('Failed to start error recovery session:', error);
        return '';
      }

      return data.id;
    } catch (error) {
      console.error('Error starting recovery session:', error);
      return '';
    }
  }

  static async updateErrorRecoverySession(
    sessionId: string, 
    updates: { 
      attemptsCount?: number;
      finalSuccess?: boolean;
      totalRecoveryTimeMs?: number;
      recoveryDetails?: Record<string, any>;
    }
  ): Promise<void> {
    try {
      const updateData: any = {};
      
      if (updates.attemptsCount !== undefined) updateData.attempts_count = updates.attemptsCount;
      if (updates.finalSuccess !== undefined) updateData.final_success = updates.finalSuccess;
      if (updates.totalRecoveryTimeMs !== undefined) updateData.total_recovery_time_ms = updates.totalRecoveryTimeMs;
      if (updates.recoveryDetails !== undefined) updateData.recovery_details = updates.recoveryDetails;
      
      if (updates.finalSuccess !== undefined) {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from('error_recovery_sessions')
        .update(updateData)
        .eq('id', sessionId);

      if (error) {
        console.error('Failed to update error recovery session:', error);
      }
    } catch (error) {
      console.error('Error updating recovery session:', error);
    }
  }

  static async getValidationMetrics(timeRange: '1h' | '24h' | '7d' | '30d' = '24h'): Promise<ValidationMetrics> {
    try {
      const cutoffTime = this.getCutoffTime(timeRange);
      
      const { data: logs, error } = await supabase
        .from('validation_logs')
        .select('*')
        .gte('timestamp', cutoffTime)
        .order('timestamp', { ascending: false });

      if (error || !logs) {
        console.error('Failed to fetch validation metrics:', error);
        return this.getEmptyMetrics();
      }

      const totalValidations = logs.length;
      const successfulValidations = logs.filter(log => log.success).length;
      const successRate = totalValidations > 0 ? (successfulValidations / totalValidations) * 100 : 0;
      
      const averageProcessingTime = totalValidations > 0 
        ? logs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / totalValidations 
        : 0;

      // Error breakdown
      const errorBreakdown: Record<string, number> = {};
      logs.filter(log => !log.success && log.error_message).forEach(log => {
        const error = log.error_message!;
        errorBreakdown[error] = (errorBreakdown[error] || 0) + 1;
      });

      // Performance trends (hourly buckets)
      const performanceTrends = this.calculatePerformanceTrends(logs, timeRange);

      // Top errors
      const topErrors = Object.entries(errorBreakdown)
        .map(([error, count]) => ({
          error,
          count,
          percentage: totalValidations > 0 ? (count / totalValidations) * 100 : 0
        }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      return {
        totalValidations,
        successRate,
        averageProcessingTime,
        errorBreakdown,
        performanceTrends,
        topErrors
      };
    } catch (error) {
      console.error('Error getting validation metrics:', error);
      return this.getEmptyMetrics();
    }
  }

  private static getCutoffTime(timeRange: '1h' | '24h' | '7d' | '30d'): string {
    const now = new Date();
    const cutoffTime = new Date(now);

    switch (timeRange) {
      case '1h': cutoffTime.setHours(now.getHours() - 1); break;
      case '24h': cutoffTime.setDate(now.getDate() - 1); break;
      case '7d': cutoffTime.setDate(now.getDate() - 7); break;
      case '30d': cutoffTime.setDate(now.getDate() - 30); break;
    }

    return cutoffTime.toISOString();
  }

  private static calculatePerformanceTrends(logs: any[], timeRange: string): Array<{ timestamp: string; successRate: number; avgTime: number }> {
    const bucketSize = timeRange === '1h' ? 5 * 60 * 1000 : // 5 minutes
                      timeRange === '24h' ? 60 * 60 * 1000 : // 1 hour
                      timeRange === '7d' ? 6 * 60 * 60 * 1000 : // 6 hours
                      24 * 60 * 60 * 1000; // 1 day

    const buckets = new Map<number, any[]>();
    
    logs.forEach(log => {
      const timestamp = new Date(log.timestamp).getTime();
      const bucketKey = Math.floor(timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey)!.push(log);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, bucketLogs]) => {
        const successCount = bucketLogs.filter(log => log.success).length;
        const successRate = bucketLogs.length > 0 ? (successCount / bucketLogs.length) * 100 : 0;
        const avgTime = bucketLogs.length > 0 
          ? bucketLogs.reduce((sum, log) => sum + (log.processing_time_ms || 0), 0) / bucketLogs.length 
          : 0;

        return {
          timestamp: new Date(timestamp).toISOString(),
          successRate,
          avgTime
        };
      })
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private static getEmptyMetrics(): ValidationMetrics {
    return {
      totalValidations: 0,
      successRate: 0,
      averageProcessingTime: 0,
      errorBreakdown: {},
      performanceTrends: [],
      topErrors: []
    };
  }

  static async getSystemHealth(): Promise<{
    validationSuccessRate: number;
    averageResponseTime: number;
    errorRecoveryRate: number;
    systemLoad: 'low' | 'medium' | 'high' | 'critical';
    alerts: string[];
  }> {
    try {
      const metrics = await this.getValidationMetrics('1h');
      
      // Get error recovery rate
      const { data: recoverySessions, error: recoveryError } = await supabase
        .from('error_recovery_sessions')
        .select('final_success')
        .gte('created_at', this.getCutoffTime('1h'));

      const errorRecoveryRate = recoverySessions && recoverySessions.length > 0
        ? (recoverySessions.filter(session => session.final_success).length / recoverySessions.length) * 100
        : 0;

      // Determine system load
      let systemLoad: 'low' | 'medium' | 'high' | 'critical' = 'low';
      if (metrics.successRate < 50) systemLoad = 'critical';
      else if (metrics.successRate < 75) systemLoad = 'high';
      else if (metrics.successRate < 90) systemLoad = 'medium';

      // Generate alerts
      const alerts: string[] = [];
      if (metrics.successRate < 80) {
        alerts.push(`Low validation success rate: ${metrics.successRate.toFixed(1)}%`);
      }
      if (metrics.averageProcessingTime > 5000) {
        alerts.push(`High processing time: ${metrics.averageProcessingTime.toFixed(0)}ms`);
      }
      if (errorRecoveryRate < 70 && recoverySessions && recoverySessions.length > 0) {
        alerts.push(`Low error recovery rate: ${errorRecoveryRate.toFixed(1)}%`);
      }

      return {
        validationSuccessRate: metrics.successRate,
        averageResponseTime: metrics.averageProcessingTime,
        errorRecoveryRate,
        systemLoad,
        alerts
      };
    } catch (error) {
      console.error('Error getting system health:', error);
      return {
        validationSuccessRate: 0,
        averageResponseTime: 0,
        errorRecoveryRate: 0,
        systemLoad: 'critical',
        alerts: ['Unable to fetch system health metrics']
      };
    }
  }
}
