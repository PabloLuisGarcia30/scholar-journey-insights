
export interface PerformanceMetric {
  id: string;
  timestamp: number;
  operation: 'file_upload' | 'ocr_processing' | 'ai_analysis' | 'full_pipeline';
  duration: number;
  success: boolean;
  fileSize?: number;
  fileName?: string;
  errorMessage?: string;
  metadata?: Record<string, any>;
}

export interface SystemHealthMetrics {
  averageProcessingTime: number;
  successRate: number;
  errorRate: number;
  throughput: number; // files per hour
  peakUsageTime: string;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  apiHealthStatus: {
    googleVision: 'healthy' | 'degraded' | 'down';
    roboflow: 'healthy' | 'degraded' | 'down';
    openai: 'healthy' | 'degraded' | 'down';
  };
}

export interface PerformanceReport {
  period: '1h' | '24h' | '7d' | '30d';
  totalOperations: number;
  successRate: number;
  averageProcessingTime: number;
  topErrors: Array<{ error: string; count: number }>;
  performanceTrends: Array<{ timestamp: number; value: number }>;
  recommendations: string[];
}

export class PerformanceMonitoringService {
  private static metrics: PerformanceMetric[] = [];
  private static readonly MAX_METRICS = 10000; // Keep last 10k metrics
  private static healthCheckInterval: number | null = null;

  static startMonitoring(): void {
    this.loadMetricsFromStorage();
    
    // Start health check interval
    if (!this.healthCheckInterval) {
      this.healthCheckInterval = window.setInterval(() => {
        this.performHealthCheck();
      }, 60000); // Every minute
    }
  }

  static stopMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  static recordMetric(metric: Omit<PerformanceMetric, 'id' | 'timestamp'>): string {
    const fullMetric: PerformanceMetric = {
      id: `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      timestamp: Date.now(),
      ...metric
    };

    this.metrics.push(fullMetric);
    
    // Cleanup old metrics
    if (this.metrics.length > this.MAX_METRICS) {
      this.metrics = this.metrics.slice(-this.MAX_METRICS);
    }

    this.saveMetricsToStorage();
    this.analyzePerformance(fullMetric);
    
    return fullMetric.id;
  }

  static async measureOperation<T>(
    operation: PerformanceMetric['operation'],
    fn: () => Promise<T>,
    metadata?: Record<string, any>
  ): Promise<T> {
    const startTime = Date.now();
    let success = false;
    let errorMessage: string | undefined;

    try {
      const result = await fn();
      success = true;
      return result;
    } catch (error) {
      success = false;
      errorMessage = error instanceof Error ? error.message : 'Unknown error';
      throw error;
    } finally {
      const duration = Date.now() - startTime;
      
      this.recordMetric({
        operation,
        duration,
        success,
        errorMessage,
        metadata
      });
    }
  }

  static getSystemHealth(): SystemHealthMetrics {
    const recentMetrics = this.getMetricsForPeriod('1h');
    
    if (recentMetrics.length === 0) {
      return {
        averageProcessingTime: 0,
        successRate: 1,
        errorRate: 0,
        throughput: 0,
        peakUsageTime: 'N/A',
        systemLoad: 'low',
        apiHealthStatus: {
          googleVision: 'healthy',
          roboflow: 'healthy',
          openai: 'healthy'
        }
      };
    }

    const successCount = recentMetrics.filter(m => m.success).length;
    const successRate = successCount / recentMetrics.length;
    const errorRate = 1 - successRate;
    
    const averageProcessingTime = recentMetrics.reduce((sum, m) => sum + m.duration, 0) / recentMetrics.length;
    
    const throughput = recentMetrics.length; // Simple throughput calculation
    
    // Determine system load
    let systemLoad: SystemHealthMetrics['systemLoad'] = 'low';
    if (averageProcessingTime > 30000) systemLoad = 'critical';
    else if (averageProcessingTime > 15000) systemLoad = 'high';
    else if (averageProcessingTime > 8000) systemLoad = 'medium';

    // Mock API health status (in real implementation, this would ping the APIs)
    const apiHealthStatus = {
      googleVision: successRate > 0.9 ? 'healthy' as const : successRate > 0.7 ? 'degraded' as const : 'down' as const,
      roboflow: successRate > 0.9 ? 'healthy' as const : successRate > 0.7 ? 'degraded' as const : 'down' as const,
      openai: successRate > 0.9 ? 'healthy' as const : successRate > 0.7 ? 'degraded' as const : 'down' as const
    };

    return {
      averageProcessingTime,
      successRate,
      errorRate,
      throughput,
      peakUsageTime: this.calculatePeakUsageTime(recentMetrics),
      systemLoad,
      apiHealthStatus
    };
  }

  static generatePerformanceReport(period: PerformanceReport['period']): PerformanceReport {
    const metrics = this.getMetricsForPeriod(period);
    
    const totalOperations = metrics.length;
    const successCount = metrics.filter(m => m.success).length;
    const successRate = totalOperations > 0 ? successCount / totalOperations : 1;
    
    const averageProcessingTime = totalOperations > 0 
      ? metrics.reduce((sum, m) => sum + m.duration, 0) / totalOperations 
      : 0;

    // Top errors
    const errorCounts = new Map<string, number>();
    metrics.filter(m => !m.success && m.errorMessage).forEach(m => {
      const error = m.errorMessage!;
      errorCounts.set(error, (errorCounts.get(error) || 0) + 1);
    });
    
    const topErrors = Array.from(errorCounts.entries())
      .map(([error, count]) => ({ error, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Performance trends (hourly averages)
    const performanceTrends = this.calculatePerformanceTrends(metrics, period);

    // Generate recommendations
    const recommendations = this.generateRecommendations(metrics, successRate, averageProcessingTime);

    return {
      period,
      totalOperations,
      successRate,
      averageProcessingTime,
      topErrors,
      performanceTrends,
      recommendations
    };
  }

  private static getMetricsForPeriod(period: PerformanceReport['period']): PerformanceMetric[] {
    const now = Date.now();
    let cutoffTime: number;

    switch (period) {
      case '1h': cutoffTime = now - (60 * 60 * 1000); break;
      case '24h': cutoffTime = now - (24 * 60 * 60 * 1000); break;
      case '7d': cutoffTime = now - (7 * 24 * 60 * 60 * 1000); break;
      case '30d': cutoffTime = now - (30 * 24 * 60 * 60 * 1000); break;
    }

    return this.metrics.filter(m => m.timestamp >= cutoffTime);
  }

  private static calculatePeakUsageTime(metrics: PerformanceMetric[]): string {
    const hourCounts = new Map<number, number>();
    
    metrics.forEach(m => {
      const hour = new Date(m.timestamp).getHours();
      hourCounts.set(hour, (hourCounts.get(hour) || 0) + 1);
    });

    let peakHour = 0;
    let maxCount = 0;
    
    hourCounts.forEach((count, hour) => {
      if (count > maxCount) {
        maxCount = count;
        peakHour = hour;
      }
    });

    return `${peakHour}:00 - ${peakHour + 1}:00`;
  }

  private static calculatePerformanceTrends(metrics: PerformanceMetric[], period: PerformanceReport['period']): Array<{ timestamp: number; value: number }> {
    const bucketSize = period === '1h' ? 5 * 60 * 1000 : // 5 minutes
                      period === '24h' ? 60 * 60 * 1000 : // 1 hour
                      period === '7d' ? 6 * 60 * 60 * 1000 : // 6 hours
                      24 * 60 * 60 * 1000; // 1 day

    const buckets = new Map<number, PerformanceMetric[]>();
    
    metrics.forEach(m => {
      const bucketKey = Math.floor(m.timestamp / bucketSize) * bucketSize;
      if (!buckets.has(bucketKey)) buckets.set(bucketKey, []);
      buckets.get(bucketKey)!.push(m);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, bucketMetrics]) => ({
        timestamp,
        value: bucketMetrics.reduce((sum, m) => sum + m.duration, 0) / bucketMetrics.length
      }))
      .sort((a, b) => a.timestamp - b.timestamp);
  }

  private static generateRecommendations(metrics: PerformanceMetric[], successRate: number, avgTime: number): string[] {
    const recommendations: string[] = [];

    if (successRate < 0.8) {
      recommendations.push('Success rate is below 80%. Consider implementing better error handling and retry mechanisms.');
    }

    if (avgTime > 15000) {
      recommendations.push('Average processing time is high. Consider optimizing file compression and using parallel processing.');
    }

    const recentErrors = metrics.filter(m => !m.success && Date.now() - m.timestamp < 60 * 60 * 1000);
    if (recentErrors.length > 10) {
      recommendations.push('High error rate detected in the last hour. Check API status and network connectivity.');
    }

    const largeFiles = metrics.filter(m => m.fileSize && m.fileSize > 5 * 1024 * 1024);
    if (largeFiles.length > metrics.length * 0.3) {
      recommendations.push('Many large files detected. Consider implementing file size warnings and compression.');
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well. Continue monitoring for optimal performance.');
    }

    return recommendations;
  }

  private static analyzePerformance(metric: PerformanceMetric): void {
    // Real-time performance analysis
    if (!metric.success && metric.operation === 'ocr_processing') {
      console.warn('OCR processing failed:', metric.errorMessage);
    }

    if (metric.duration > 30000) {
      console.warn('Long processing time detected:', metric.duration, 'ms for', metric.operation);
    }
  }

  private static async performHealthCheck(): Promise<void> {
    const health = this.getSystemHealth();
    
    if (health.systemLoad === 'critical') {
      console.error('System load is critical. Consider scaling resources.');
    }

    if (health.successRate < 0.5) {
      console.error('Success rate is critically low:', health.successRate);
    }
  }

  private static saveMetricsToStorage(): void {
    try {
      // Only save recent metrics to avoid storage bloat
      const recentMetrics = this.metrics.slice(-1000);
      localStorage.setItem('performanceMetrics', JSON.stringify(recentMetrics));
    } catch (error) {
      console.warn('Failed to save performance metrics:', error);
    }
  }

  private static loadMetricsFromStorage(): void {
    try {
      const saved = localStorage.getItem('performanceMetrics');
      if (saved) {
        this.metrics = JSON.parse(saved);
      }
    } catch (error) {
      console.warn('Failed to load performance metrics:', error);
      this.metrics = [];
    }
  }

  static exportMetrics(): string {
    return JSON.stringify({
      exportDate: new Date().toISOString(),
      metrics: this.metrics,
      systemHealth: this.getSystemHealth()
    }, null, 2);
  }

  static clearMetrics(): void {
    this.metrics = [];
    localStorage.removeItem('performanceMetrics');
  }
}
