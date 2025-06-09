
export interface PerformanceMetric {
  timestamp: number;
  operation: string;
  duration: number;
  success: boolean;
  metadata?: Record<string, any>;
}

export interface SystemHealthMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeConnections: number;
  queueDepth: number;
  errorRate: number;
  throughput: number;
}

export interface PerformanceReport {
  timeRange: { start: number; end: number };
  metrics: PerformanceMetric[];
  aggregates: {
    totalOperations: number;
    successRate: number;
    averageDuration: number;
    peakThroughput: number;
  };
  systemHealth: SystemHealthMetrics;
}

export interface EnhancedBatchMetrics {
  jobId: string;
  totalQuestions: number;
  successfulQuestions: number;
  failedQuestions: number;
  processingTimeMs: number;
  successRate: number;
  avgBatchTime: number;
  errorBreakdown?: Record<string, number>;
  throughputQuestionsPerSecond?: number;
}

export class PerformanceMonitoringService {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 10000;
  
  static recordMetric(operation: string, duration: number, success: boolean, metadata?: Record<string, any>): void {
    const metric: PerformanceMetric = {
      timestamp: Date.now(),
      operation,
      duration,
      success,
      metadata
    };

    this.metrics.push(metric);
    
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    // Enhanced logging for batch processing operations
    if (operation.includes('batch')) {
      console.log(`📊 Enhanced batch metric recorded: ${operation} - ${duration}ms - ${success ? '✅' : '❌'}`, metadata);
    }
  }

  static recordBatchProcessingMetrics(batchMetrics: EnhancedBatchMetrics): void {
    const throughput = batchMetrics.totalQuestions / (batchMetrics.processingTimeMs / 1000);
    
    this.recordMetric('enhanced_batch_processing', batchMetrics.processingTimeMs, true, {
      jobId: batchMetrics.jobId,
      totalQuestions: batchMetrics.totalQuestions,
      successfulQuestions: batchMetrics.successfulQuestions,
      failedQuestions: batchMetrics.failedQuestions,
      successRate: batchMetrics.successRate,
      avgBatchTime: batchMetrics.avgBatchTime,
      throughputQuestionsPerSecond: throughput,
      errorBreakdown: batchMetrics.errorBreakdown || {},
      enhancedProcessing: true
    });

    // Record individual batch operation metrics for granular analysis
    if (batchMetrics.avgBatchTime > 0) {
      this.recordMetric('batch_operation', batchMetrics.avgBatchTime, batchMetrics.successRate > 0.5, {
        jobId: batchMetrics.jobId,
        batchEfficiency: batchMetrics.successRate,
        parallelProcessing: true
      });
    }

    // Log performance insights
    console.log(`🎯 Enhanced batch processing metrics recorded:`, {
      jobId: batchMetrics.jobId,
      performance: {
        totalQuestions: batchMetrics.totalQuestions,
        successRate: `${(batchMetrics.successRate * 100).toFixed(1)}%`,
        throughput: `${throughput.toFixed(1)} questions/second`,
        avgBatchTime: `${batchMetrics.avgBatchTime.toFixed(0)}ms`,
        efficiency: throughput > 2 ? 'High' : throughput > 1 ? 'Medium' : 'Low'
      }
    });
  }

  static recordFileProcessingMetrics(
    operation: string,
    fileCount: number,
    processingTimeMs: number,
    successCount: number,
    errorBreakdown: Record<string, number> = {}
  ): void {
    const successRate = fileCount > 0 ? successCount / fileCount : 0;
    const throughput = fileCount / (processingTimeMs / 1000);

    this.recordMetric('enhanced_file_processing', processingTimeMs, successRate > 0.8, {
      operation,
      fileCount,
      successCount,
      failedCount: fileCount - successCount,
      successRate,
      throughputFilesPerSecond: throughput,
      errorBreakdown,
      enhancedProcessing: true
    });

    console.log(`📁 Enhanced file processing metrics recorded:`, {
      operation,
      performance: {
        totalFiles: fileCount,
        successfulFiles: successCount,
        successRate: `${(successRate * 100).toFixed(1)}%`,
        throughput: `${throughput.toFixed(1)} files/second`,
        processingTime: `${(processingTimeMs / 1000).toFixed(1)}s`
      },
      errorAnalysis: errorBreakdown
    });
  }

  static recordErrorRecoveryMetrics(
    operation: string,
    originalError: string,
    recoveryAttempts: number,
    recoverySuccess: boolean,
    recoveryTimeMs: number
  ): void {
    this.recordMetric('error_recovery', recoveryTimeMs, recoverySuccess, {
      operation,
      originalError: originalError.substring(0, 100), // Truncate for storage
      recoveryAttempts,
      recoverySuccess,
      enhancedErrorHandling: true
    });

    console.log(`🔧 Error recovery metrics recorded:`, {
      operation,
      originalError: originalError.substring(0, 50) + '...',
      attempts: recoveryAttempts,
      success: recoverySuccess,
      recoveryTime: `${recoveryTimeMs}ms`
    });
  }

  static getMetrics(timeRange?: { start: number; end: number }): PerformanceMetric[] {
    let filteredMetrics = [...this.metrics];
    
    if (timeRange) {
      filteredMetrics = filteredMetrics.filter(
        metric => metric.timestamp >= timeRange.start && metric.timestamp <= timeRange.end
      );
    }
    
    return filteredMetrics.sort((a, b) => b.timestamp - a.timestamp);
  }

  static generateEnhancedPerformanceReport(timeRange?: { start: number; end: number }): PerformanceReport {
    const metrics = this.getMetrics(timeRange);
    const now = Date.now();
    const reportTimeRange = timeRange || { 
      start: now - 24 * 60 * 60 * 1000, // Last 24 hours
      end: now 
    };

    // Enhanced aggregations with batch processing insights
    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;
    const averageDuration = totalOperations > 0 ? 
      metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations : 0;

    // Calculate enhanced throughput metrics
    const batchMetrics = metrics.filter(m => m.operation.includes('batch'));
    const peakThroughput = batchMetrics.length > 0 ? 
      Math.max(...batchMetrics.map(m => m.metadata?.throughputQuestionsPerSecond || 0)) : 0;

    // Enhanced system health calculation
    const recentMetrics = metrics.filter(m => m.timestamp > now - 5 * 60 * 1000); // Last 5 minutes
    const recentErrorRate = recentMetrics.length > 0 ? 
      (recentMetrics.filter(m => !m.success).length / recentMetrics.length) : 0;

    const systemHealth: SystemHealthMetrics = {
      cpuUsage: Math.random() * 100, // Simulated - would connect to actual system monitoring
      memoryUsage: Math.random() * 100,
      activeConnections: recentMetrics.length,
      queueDepth: metrics.filter(m => m.operation.includes('pending')).length,
      errorRate: recentErrorRate,
      throughput: peakThroughput
    };

    const report: PerformanceReport = {
      timeRange: reportTimeRange,
      metrics,
      aggregates: {
        totalOperations,
        successRate,
        averageDuration,
        peakThroughput
      },
      systemHealth
    };

    // Log enhanced performance insights
    console.log(`📈 Enhanced performance report generated:`, {
      timeRange: {
        start: new Date(reportTimeRange.start).toISOString(),
        end: new Date(reportTimeRange.end).toISOString()
      },
      summary: {
        totalOperations,
        successRate: `${(successRate * 100).toFixed(1)}%`,
        avgDuration: `${averageDuration.toFixed(0)}ms`,
        peakThroughput: `${peakThroughput.toFixed(1)} items/second`,
        systemHealth: {
          errorRate: `${(recentErrorRate * 100).toFixed(1)}%`,
          activeConnections: recentMetrics.length
        }
      }
    });

    return report;
  }

  static getOperationMetrics(operation: string): {
    count: number;
    successRate: number;
    averageDuration: number;
    recentTrend: 'improving' | 'stable' | 'degrading';
  } {
    const operationMetrics = this.metrics.filter(m => m.operation === operation);
    
    if (operationMetrics.length === 0) {
      return { count: 0, successRate: 0, averageDuration: 0, recentTrend: 'stable' };
    }

    const count = operationMetrics.length;
    const successRate = operationMetrics.filter(m => m.success).length / count;
    const averageDuration = operationMetrics.reduce((sum, m) => sum + m.duration, 0) / count;

    // Calculate trend based on recent vs historical performance
    const recentMetrics = operationMetrics.slice(-Math.min(10, Math.floor(count / 2)));
    const historicalMetrics = operationMetrics.slice(0, -recentMetrics.length);
    
    let recentTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    
    if (historicalMetrics.length > 0) {
      const recentSuccessRate = recentMetrics.filter(m => m.success).length / recentMetrics.length;
      const historicalSuccessRate = historicalMetrics.filter(m => m.success).length / historicalMetrics.length;
      
      const improvementThreshold = 0.05; // 5% threshold for trend detection
      
      if (recentSuccessRate > historicalSuccessRate + improvementThreshold) {
        recentTrend = 'improving';
      } else if (recentSuccessRate < historicalSuccessRate - improvementThreshold) {
        recentTrend = 'degrading';
      }
    }

    return { count, successRate, averageDuration, recentTrend };
  }

  static getBatchProcessingAnalytics(): {
    totalBatches: number;
    averageSuccessRate: number;
    averageThroughput: number;
    errorPatterns: Record<string, number>;
    performanceTrends: {
      throughputTrend: 'improving' | 'stable' | 'degrading';
      errorRateTrend: 'improving' | 'stable' | 'degrading';
    };
  } {
    const batchMetrics = this.metrics.filter(m => 
      m.operation.includes('batch') && m.metadata?.enhancedProcessing
    );

    if (batchMetrics.length === 0) {
      return {
        totalBatches: 0,
        averageSuccessRate: 0,
        averageThroughput: 0,
        errorPatterns: {},
        performanceTrends: { throughputTrend: 'stable', errorRateTrend: 'stable' }
      };
    }

    const totalBatches = batchMetrics.length;
    const averageSuccessRate = batchMetrics.reduce((sum, m) => sum + (m.metadata?.successRate || 0), 0) / totalBatches;
    const averageThroughput = batchMetrics.reduce((sum, m) => sum + (m.metadata?.throughputQuestionsPerSecond || 0), 0) / totalBatches;

    // Aggregate error patterns
    const errorPatterns: Record<string, number> = {};
    batchMetrics.forEach(m => {
      const errorBreakdown = m.metadata?.errorBreakdown || {};
      Object.entries(errorBreakdown).forEach(([errorType, count]) => {
        errorPatterns[errorType] = (errorPatterns[errorType] || 0) + (count as number);
      });
    });

    // Calculate performance trends
    const recentBatches = batchMetrics.slice(-Math.min(10, Math.floor(totalBatches / 2)));
    const historicalBatches = batchMetrics.slice(0, -recentBatches.length);

    let throughputTrend: 'improving' | 'stable' | 'degrading' = 'stable';
    let errorRateTrend: 'improving' | 'stable' | 'degrading' = 'stable';

    if (historicalBatches.length > 0) {
      const recentAvgThroughput = recentBatches.reduce((sum, m) => sum + (m.metadata?.throughputQuestionsPerSecond || 0), 0) / recentBatches.length;
      const historicalAvgThroughput = historicalBatches.reduce((sum, m) => sum + (m.metadata?.throughputQuestionsPerSecond || 0), 0) / historicalBatches.length;

      const recentAvgErrorRate = 1 - (recentBatches.reduce((sum, m) => sum + (m.metadata?.successRate || 0), 0) / recentBatches.length);
      const historicalAvgErrorRate = 1 - (historicalBatches.reduce((sum, m) => sum + (m.metadata?.successRate || 0), 0) / historicalBatches.length);

      const improvementThreshold = 0.1; // 10% threshold

      if (recentAvgThroughput > historicalAvgThroughput * (1 + improvementThreshold)) {
        throughputTrend = 'improving';
      } else if (recentAvgThroughput < historicalAvgThroughput * (1 - improvementThreshold)) {
        throughputTrend = 'degrading';
      }

      if (recentAvgErrorRate < historicalAvgErrorRate * (1 - improvementThreshold)) {
        errorRateTrend = 'improving';
      } else if (recentAvgErrorRate > historicalAvgErrorRate * (1 + improvementThreshold)) {
        errorRateTrend = 'degrading';
      }
    }

    const analytics = {
      totalBatches,
      averageSuccessRate,
      averageThroughput,
      errorPatterns,
      performanceTrends: { throughputTrend, errorRateTrend }
    };

    console.log(`📊 Batch processing analytics:`, {
      summary: {
        totalBatches,
        avgSuccessRate: `${(averageSuccessRate * 100).toFixed(1)}%`,
        avgThroughput: `${averageThroughput.toFixed(1)} questions/second`
      },
      trends: {
        throughput: throughputTrend,
        errorRate: errorRateTrend
      },
      topErrors: Object.entries(errorPatterns).sort(([,a], [,b]) => b - a).slice(0, 3)
    });

    return analytics;
  }

  static clearMetrics(): void {
    this.metrics = [];
    console.log('🗑️ Performance metrics cleared');
  }

  static exportMetrics(): string {
    return JSON.stringify({
      exportedAt: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      metrics: this.metrics
    }, null, 2);
  }
}
