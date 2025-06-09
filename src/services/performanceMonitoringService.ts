import { SmartOcrService } from './smartOcrService';

export interface PerformanceMetric {
  id: string;
  operation: string;
  duration: number;
  success: boolean;
  timestamp: Date;
  metadata?: any;
}

export interface PerformanceReport {
  periodStart: Date;
  periodEnd: Date;
  totalOperations: number;
  successfulOperations: number;
  failedOperations: number;
  successRate: number;
  averageProcessingTime: number;
  totalProcessingTime: number;
  topErrors: Array<{
    error: string;
    count: number;
    percentage: number;
  }>;
  recommendations: string[];
  operationBreakdown: {
    [operation: string]: {
      count: number;
      averageTime: number;
      successRate: number;
    };
  };
  timeRange: string;
}

export interface SystemHealthMetrics {
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  successRate: number;
  averageProcessingTime: number;
  throughput: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  apiHealthStatus: {
    googleVision: 'healthy' | 'degraded' | 'down';
    roboflow: 'healthy' | 'degraded' | 'down';
    openai: 'healthy' | 'degraded' | 'down';
  };
  lastUpdated: Date;
}

export class PerformanceMonitoringService {
  private static metrics: PerformanceMetric[] = [];
  private static isMonitoring = false;
  private static monitoringInterval: NodeJS.Timeout | null = null;

  static startMonitoring(): void {
    if (this.isMonitoring) return;
    
    this.isMonitoring = true;
    console.log('Performance monitoring started');
    
    // Start periodic health checks
    this.monitoringInterval = setInterval(() => {
      this.performHealthCheck();
    }, 30000); // Every 30 seconds
  }

  static stopMonitoring(): void {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('Performance monitoring stopped');
  }

  static getSystemHealth(): SystemHealthMetrics {
    const recentMetrics = this.getRecentMetrics(3600000); // Last hour
    
    if (recentMetrics.length === 0) {
      return {
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        successRate: 0,
        averageProcessingTime: 0,
        throughput: 0,
        systemLoad: 'low',
        apiHealthStatus: {
          googleVision: 'healthy',
          roboflow: 'healthy',
          openai: 'healthy'
        },
        lastUpdated: new Date()
      };
    }

    const totalRequests = recentMetrics.length;
    const successfulRequests = recentMetrics.filter(m => m.success).length;
    const failedRequests = totalRequests - successfulRequests;
    const successRate = successfulRequests / totalRequests;
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / totalRequests;
    const throughput = Math.round((totalRequests / 3600) * 1000); // per hour

    // Determine system load
    let systemLoad: SystemHealthMetrics['systemLoad'] = 'low';
    if (averageProcessingTime > 5000) systemLoad = 'critical';
    else if (averageProcessingTime > 3000) systemLoad = 'high';
    else if (averageProcessingTime > 1500) systemLoad = 'medium';

    return {
      totalRequests,
      successfulRequests,
      failedRequests,
      successRate,
      averageProcessingTime,
      throughput,
      systemLoad,
      apiHealthStatus: this.getApiHealthStatus(),
      lastUpdated: new Date()
    };
  }

  static generatePerformanceReport(timeRange: '1h' | '24h' | '7d' | '30d'): PerformanceReport {
    const timeRangeMs = {
      '1h': 3600000,
      '24h': 86400000,
      '7d': 604800000,
      '30d': 2592000000
    };

    const periodEnd = new Date();
    const periodStart = new Date(periodEnd.getTime() - timeRangeMs[timeRange]);
    const metrics = this.getMetricsByTimeRange(periodStart, periodEnd);

    const totalOperations = metrics.length;
    const successfulOperations = metrics.filter(m => m.success).length;
    const failedOperations = totalOperations - successfulOperations;
    const successRate = totalOperations > 0 ? successfulOperations / totalOperations : 0;
    const averageProcessingTime = totalOperations > 0 ? 
      metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations : 0;
    const totalProcessingTime = metrics.reduce((sum, m) => sum + m.duration, 0);

    // Calculate top errors
    const errorCounts = new Map<string, number>();
    metrics.filter(m => !m.success && m.metadata?.error).forEach(m => {
      const error = m.metadata!.error as string;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });

    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({
        error,
        count,
        percentage: (count / failedOperations) * 100
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Generate recommendations
    const recommendations: string[] = [];
    if (successRate < 0.9) {
      recommendations.push('Consider implementing better error handling and retry mechanisms');
    }
    if (averageProcessingTime > 5000) {
      recommendations.push('Optimize processing algorithms to reduce response times');
    }
    if (failedOperations > totalOperations * 0.1) {
      recommendations.push('Investigate and fix recurring error patterns');
    }

    // Operation breakdown
    const operationBreakdown: PerformanceReport['operationBreakdown'] = {};
    const operationGroups = new Map<string, PerformanceMetric[]>();
    
    metrics.forEach(metric => {
      if (!operationGroups.has(metric.operation)) {
        operationGroups.set(metric.operation, []);
      }
      operationGroups.get(metric.operation)!.push(metric);
    });

    operationGroups.forEach((opMetrics, operation) => {
      const count = opMetrics.length;
      const averageTime = opMetrics.reduce((sum, m) => sum + m.duration, 0) / count;
      const successCount = opMetrics.filter(m => m.success).length;
      const opSuccessRate = successCount / count;

      operationBreakdown[operation] = {
        count,
        averageTime,
        successRate: opSuccessRate
      };
    });

    return {
      periodStart,
      periodEnd,
      totalOperations,
      successfulOperations,
      failedOperations,
      successRate,
      averageProcessingTime,
      totalProcessingTime,
      topErrors,
      recommendations,
      operationBreakdown,
      timeRange
    };
  }

  static recordMetric(operation: string, duration: number, success: boolean, metadata?: any): void {
    const metric: PerformanceMetric = {
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      operation,
      duration,
      success,
      timestamp: new Date(),
      metadata
    };

    this.metrics.push(metric);
    
    // Keep only last 10000 metrics to prevent memory issues
    if (this.metrics.length > 10000) {
      this.metrics = this.metrics.slice(-5000);
    }

    // Log significant performance issues
    if (duration > 10000) {
      console.warn(`Slow operation detected: ${operation} took ${duration}ms`);
    }

    if (!success) {
      console.error(`Failed operation: ${operation}`, metadata);
    }
  }

  private static getRecentMetrics(timeWindowMs: number): PerformanceMetric[] {
    const cutoff = new Date(Date.now() - timeWindowMs);
    return this.metrics.filter(metric => metric.timestamp >= cutoff);
  }

  private static getMetricsByTimeRange(start: Date, end: Date): PerformanceMetric[] {
    return this.metrics.filter(metric => 
      metric.timestamp >= start && metric.timestamp <= end
    );
  }

  private static performHealthCheck(): void {
    // Simulate health check
    const healthMetric: PerformanceMetric = {
      id: `health-${Date.now()}`,
      operation: 'system_health_check',
      duration: Math.random() * 100 + 50,
      success: Math.random() > 0.05, // 95% success rate
      timestamp: new Date()
    };

    this.metrics.push(healthMetric);
  }

  private static getApiHealthStatus(): SystemHealthMetrics['apiHealthStatus'] {
    // Simple health status based on recent performance
    const recentMetrics = this.getRecentMetrics(300000); // Last 5 minutes
    
    const getServiceHealth = (serviceName: string): 'healthy' | 'degraded' | 'down' => {
      const serviceMetrics = recentMetrics.filter(m => 
        m.operation.toLowerCase().includes(serviceName.toLowerCase())
      );
      
      if (serviceMetrics.length === 0) return 'healthy';
      
      const successRate = serviceMetrics.filter(m => m.success).length / serviceMetrics.length;
      const avgDuration = serviceMetrics.reduce((sum, m) => sum + m.duration, 0) / serviceMetrics.length;
      
      if (successRate < 0.5) return 'down';
      if (successRate < 0.9 || avgDuration > 5000) return 'degraded';
      return 'healthy';
    };

    return {
      googleVision: getServiceHealth('google'),
      roboflow: getServiceHealth('roboflow'),
      openai: getServiceHealth('openai')
    };
  }

  static exportMetrics(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      totalMetrics: this.metrics.length,
      metrics: this.metrics,
      summary: this.generatePerformanceReport('24h')
    }, null, 2);
  }

  static clearMetrics(): void {
    this.metrics = [];
    console.log('Performance metrics cleared');
  }

  static getMetricsCount(): number {
    return this.metrics.length;
  }
}
