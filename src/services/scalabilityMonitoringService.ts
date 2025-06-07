import { supabase } from "@/integrations/supabase/client";

export interface SystemMetrics {
  timestamp: number;
  activeUsers: number;
  queueDepth: number;
  processingRate: number;
  averageResponseTime: number;
  errorRate: number;
  apiUsage: {
    openai: number;
    roboflow: number;
    googleVision: number;
  };
  resourceUtilization: {
    cpu: number;
    memory: number;
    database: number;
  };
}

export interface PerformanceAlert {
  id: string;
  type: 'warning' | 'critical';
  message: string;
  timestamp: number;
  resolved: boolean;
  metrics: Partial<SystemMetrics>;
}

export interface ScalabilityStats {
  currentCapacity: {
    maxConcurrentUsers: number;
    currentActiveUsers: number;
    utilizationPercent: number;
  };
  performance: {
    averageProcessingTime: number;
    successRate: number;
    queueWaitTime: number;
  };
  costs: {
    dailyCost: number;
    costPerStudent: number;
    projectedMonthlyCost: number;
  };
  recommendations: string[];
}

export interface HybridGradingMetrics {
  totalTests: number;
  localGradingRate: number;
  apiCallsSaved: number;
  averageProcessingTime: number;
  costSavings: number;
}

class ScalabilityMonitoringService {
  private metricsBuffer: SystemMetrics[] = [];
  private alerts: PerformanceAlert[] = [];
  private lastMetricsUpdate = 0;
  private hybridGradingStats: HybridGradingMetrics = {
    totalTests: 0,
    localGradingRate: 0,
    apiCallsSaved: 0,
    averageProcessingTime: 0,
    costSavings: 0
  };
  private thresholds = {
    maxQueueDepth: 100,
    maxResponseTime: 30000, // 30 seconds
    maxErrorRate: 0.05, // 5%
    maxConcurrentUsers: 300, // Target after scaling
    criticalMemoryUsage: 0.85,
    criticalCpuUsage: 0.80
  };

  async collectMetrics(): Promise<SystemMetrics> {
    try {
      const [queueStats, systemHealth] = await Promise.all([
        this.getQueueStats(),
        this.getSystemHealth()
      ]);

      const metrics: SystemMetrics = {
        timestamp: Date.now(),
        activeUsers: await this.getActiveUserCount(),
        queueDepth: queueStats.pendingJobs,
        processingRate: queueStats.completedJobsLastHour,
        averageResponseTime: queueStats.averageProcessingTime,
        errorRate: queueStats.errorRate,
        apiUsage: await this.getApiUsage(),
        resourceUtilization: systemHealth
      };

      this.metricsBuffer.push(metrics);
      this.checkAlerts(metrics);
      
      // Keep only last 1000 metrics (about 16-17 hours at 1-minute intervals)
      if (this.metricsBuffer.length > 1000) {
        this.metricsBuffer = this.metricsBuffer.slice(-1000);
      }

      return metrics;
    } catch (error) {
      console.error('Failed to collect metrics:', error);
      throw error;
    }
  }

  private async getQueueStats() {
    try {
      const response = await supabase.functions.invoke('batch-queue-manager', {
        body: null,
        method: 'GET'
      });

      if (response.error) throw response.error;
      return response.data;
    } catch (error) {
      console.warn('Queue stats unavailable:', error);
      return {
        pendingJobs: 0,
        completedJobsLastHour: 0,
        averageProcessingTime: 0,
        errorRate: 0
      };
    }
  }

  private async getActiveUserCount(): Promise<number> {
    try {
      // Count recent activity in last 5 minutes
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
      
      const { data, error } = await supabase
        .from('student_upload_sessions')
        .select('student_name')
        .gte('updated_at', fiveMinutesAgo);

      if (error) throw error;
      
      // Count unique student names
      const uniqueStudents = new Set(data?.map(session => session.student_name) || []);
      return uniqueStudents.size;
    } catch (error) {
      console.warn('Failed to get active user count:', error);
      return 0;
    }
  }

  private async getApiUsage() {
    // This would integrate with actual API usage tracking
    // For now, returning mock data based on system load
    const baseUsage = this.metricsBuffer.length > 0 
      ? this.metricsBuffer[this.metricsBuffer.length - 1]?.apiUsage 
      : { openai: 0, roboflow: 0, googleVision: 0 };

    return {
      openai: baseUsage.openai + Math.floor(Math.random() * 10),
      roboflow: baseUsage.roboflow + Math.floor(Math.random() * 5),
      googleVision: baseUsage.googleVision + Math.floor(Math.random() * 8)
    };
  }

  private async getSystemHealth() {
    // Mock system health data - in production this would come from actual monitoring
    return {
      cpu: Math.random() * 0.6 + 0.2, // 20-80%
      memory: Math.random() * 0.5 + 0.3, // 30-80%
      database: Math.random() * 0.4 + 0.2 // 20-60%
    };
  }

  private checkAlerts(metrics: SystemMetrics) {
    const alerts: PerformanceAlert[] = [];

    // Queue depth alert
    if (metrics.queueDepth > this.thresholds.maxQueueDepth) {
      alerts.push({
        id: `queue_depth_${Date.now()}`,
        type: metrics.queueDepth > this.thresholds.maxQueueDepth * 1.5 ? 'critical' : 'warning',
        message: `High queue depth: ${metrics.queueDepth} jobs pending`,
        timestamp: metrics.timestamp,
        resolved: false,
        metrics: { queueDepth: metrics.queueDepth }
      });
    }

    // Response time alert
    if (metrics.averageResponseTime > this.thresholds.maxResponseTime) {
      alerts.push({
        id: `response_time_${Date.now()}`,
        type: metrics.averageResponseTime > this.thresholds.maxResponseTime * 2 ? 'critical' : 'warning',
        message: `Slow response time: ${Math.round(metrics.averageResponseTime / 1000)}s average`,
        timestamp: metrics.timestamp,
        resolved: false,
        metrics: { averageResponseTime: metrics.averageResponseTime }
      });
    }

    // Error rate alert
    if (metrics.errorRate > this.thresholds.maxErrorRate) {
      alerts.push({
        id: `error_rate_${Date.now()}`,
        type: metrics.errorRate > this.thresholds.maxErrorRate * 2 ? 'critical' : 'warning',
        message: `High error rate: ${Math.round(metrics.errorRate * 100)}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        metrics: { errorRate: metrics.errorRate }
      });
    }

    // Resource utilization alerts
    if (metrics.resourceUtilization.cpu > this.thresholds.criticalCpuUsage) {
      alerts.push({
        id: `cpu_usage_${Date.now()}`,
        type: 'critical',
        message: `Critical CPU usage: ${Math.round(metrics.resourceUtilization.cpu * 100)}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        metrics: { resourceUtilization: metrics.resourceUtilization }
      });
    }

    if (metrics.resourceUtilization.memory > this.thresholds.criticalMemoryUsage) {
      alerts.push({
        id: `memory_usage_${Date.now()}`,
        type: 'critical',
        message: `Critical memory usage: ${Math.round(metrics.resourceUtilization.memory * 100)}%`,
        timestamp: metrics.timestamp,
        resolved: false,
        metrics: { resourceUtilization: metrics.resourceUtilization }
      });
    }

    this.alerts.push(...alerts);
    
    // Auto-resolve old alerts (after 30 minutes)
    const thirtyMinutesAgo = Date.now() - 30 * 60 * 1000;
    this.alerts.forEach(alert => {
      if (alert.timestamp < thirtyMinutesAgo && !alert.resolved) {
        alert.resolved = true;
      }
    });
  }

  updateHybridGradingStats(summary: any) {
    if (!summary) return;

    this.hybridGradingStats.totalTests++;
    this.hybridGradingStats.localGradingRate = 
      (this.hybridGradingStats.localGradingRate * (this.hybridGradingStats.totalTests - 1) + 
       summary.local_accuracy) / this.hybridGradingStats.totalTests;
    
    this.hybridGradingStats.apiCallsSaved = 
      (this.hybridGradingStats.apiCallsSaved * (this.hybridGradingStats.totalTests - 1) + 
       summary.api_calls_saved) / this.hybridGradingStats.totalTests;

    // Estimate cost savings (assume $0.002 per API call saved)
    this.hybridGradingStats.costSavings += summary.api_calls_saved * 0.002;

    console.log('Updated hybrid grading stats:', this.hybridGradingStats);
  }

  getHybridGradingStats(): HybridGradingMetrics {
    return { ...this.hybridGradingStats };
  }

  async getScalabilityStats(): Promise<ScalabilityStats> {
    const latestMetrics = this.metricsBuffer[this.metricsBuffer.length - 1];
    
    if (!latestMetrics) {
      // Return default stats if no metrics available
      return {
        currentCapacity: {
          maxConcurrentUsers: this.thresholds.maxConcurrentUsers,
          currentActiveUsers: 0,
          utilizationPercent: 0
        },
        performance: {
          averageProcessingTime: 0,
          successRate: 1,
          queueWaitTime: 0
        },
        costs: {
          dailyCost: 0,
          costPerStudent: 0,
          projectedMonthlyCost: 0
        },
        recommendations: ['Collect more data to provide recommendations']
      };
    }

    const utilizationPercent = (latestMetrics.activeUsers / this.thresholds.maxConcurrentUsers) * 100;
    const successRate = 1 - latestMetrics.errorRate;
    
    // Calculate costs with hybrid grading savings
    const baseApiCost = (latestMetrics.apiUsage.openai * 0.002) + 
                        (latestMetrics.apiUsage.roboflow * 0.001) + 
                        (latestMetrics.apiUsage.googleVision * 0.0015);
    
    const adjustedCost = baseApiCost * (1 - this.hybridGradingStats.localGradingRate);
    const costPerStudent = latestMetrics.activeUsers > 0 ? adjustedCost / latestMetrics.activeUsers : 0;

    return {
      currentCapacity: {
        maxConcurrentUsers: this.thresholds.maxConcurrentUsers,
        currentActiveUsers: latestMetrics.activeUsers,
        utilizationPercent: Math.round(utilizationPercent)
      },
      performance: {
        averageProcessingTime: Math.round(latestMetrics.averageResponseTime / 1000),
        successRate: Math.round(successRate * 100) / 100,
        queueWaitTime: Math.round(latestMetrics.queueDepth * 30) // Estimate 30s per job
      },
      costs: {
        dailyCost: Math.round(adjustedCost * 100) / 100,
        costPerStudent: Math.round(costPerStudent * 100) / 100,
        projectedMonthlyCost: Math.round(adjustedCost * 30 * 100) / 100
      },
      recommendations: this.generateRecommendations(latestMetrics, utilizationPercent)
    };
  }

  private generateRecommendations(metrics: SystemMetrics, utilizationPercent: number): string[] {
    const recommendations: string[] = [];

    if (utilizationPercent > 80) {
      recommendations.push('Consider increasing concurrent processing capacity');
      recommendations.push('Monitor for potential need to scale infrastructure');
    }

    if (metrics.queueDepth > 50) {
      recommendations.push('High queue depth detected - consider batch optimization');
    }

    if (metrics.errorRate > 0.03) {
      recommendations.push('Error rate above 3% - investigate API reliability');
    }

    if (metrics.averageResponseTime > 20000) {
      recommendations.push('Response times are slow - optimize processing pipeline');
    }

    if (metrics.resourceUtilization.cpu > 0.7) {
      recommendations.push('CPU usage is high - consider load balancing');
    }

    // Add hybrid grading recommendations
    if (this.hybridGradingStats.localGradingRate < 0.5) {
      recommendations.push('Local grading rate is low - check OCR confidence thresholds');
    } else if (this.hybridGradingStats.localGradingRate > 0.8) {
      recommendations.push(`Excellent local grading performance (${Math.round(this.hybridGradingStats.localGradingRate * 100)}% local)`);
    }

    if (recommendations.length === 0) {
      recommendations.push('System is performing well within normal parameters');
    }

    return recommendations;
  }

  getActiveAlerts(): PerformanceAlert[] {
    return this.alerts.filter(alert => !alert.resolved);
  }

  getMetricsHistory(hours: number = 24): SystemMetrics[] {
    const cutoff = Date.now() - (hours * 60 * 60 * 1000);
    return this.metricsBuffer.filter(metrics => metrics.timestamp > cutoff);
  }

  async startMonitoring(intervalMs: number = 60000) {
    // Collect initial metrics
    await this.collectMetrics();
    
    // Set up periodic collection
    setInterval(async () => {
      try {
        await this.collectMetrics();
      } catch (error) {
        console.error('Metrics collection failed:', error);
      }
    }, intervalMs);

    console.log(`Scalability monitoring started with ${intervalMs}ms interval`);
  }
}

export const scalabilityMonitor = new ScalabilityMonitoringService();
