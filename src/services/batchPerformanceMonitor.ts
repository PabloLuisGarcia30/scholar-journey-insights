import { BatchProcessingResult } from './batchProcessingOptimizer';
import { BatchRoutingDecision } from './batchAwareModelRouter';

export interface PerformanceMetrics {
  timestamp: number;
  sessionId: string;
  totalQuestions: number;
  totalBatches: number;
  processingTimeMs: number;
  costSavings: number;
  qualityScore: number;
  fallbacksTriggered: number;
  modelDistribution: Record<string, number>;
  batchSizeDistribution: Record<string, number>;
  errorRate: number;
}

export interface PerformanceAnalysis {
  efficiency: {
    avgProcessingTime: number;
    throughputQuestionsPerSecond: number;
    batchEfficiencyRatio: number;
  };
  cost: {
    totalSavings: number;
    avgSavingsPerQuestion: number;
    optimalBatchSize: number;
  };
  quality: {
    avgQualityScore: number;
    successRate: number;
    fallbackRate: number;
  };
  recommendations: string[];
}

export interface RealtimeStats {
  activeProcessing: boolean;
  currentThroughput: number;
  queueDepth: number;
  recentSuccessRate: number;
  avgResponseTime: number;
}

export class BatchPerformanceMonitor {
  private metricsHistory: PerformanceMetrics[] = [];
  private realtimeData: RealtimeStats = {
    activeProcessing: false,
    currentThroughput: 0,
    queueDepth: 0,
    recentSuccessRate: 100,
    avgResponseTime: 0
  };
  private sessionCounter = 0;

  recordBatchProcessingSession(
    results: BatchProcessingResult[],
    decisions: BatchRoutingDecision[],
    totalProcessingTime: number
  ): string {
    const sessionId = `session_${++this.sessionCounter}_${Date.now()}`;
    
    console.log(`📊 Recording performance metrics for session: ${sessionId}`);

    const metrics = this.calculateSessionMetrics(
      sessionId,
      results,
      decisions,
      totalProcessingTime
    );

    this.metricsHistory.push(metrics);
    this.updateRealtimeStats(metrics);

    // Keep only last 100 sessions to prevent memory issues
    if (this.metricsHistory.length > 100) {
      this.metricsHistory = this.metricsHistory.slice(-100);
    }

    console.log(`📈 Session ${sessionId} metrics recorded: ${metrics.totalQuestions} questions, ${metrics.costSavings.toFixed(1)}% savings`);

    return sessionId;
  }

  private calculateSessionMetrics(
    sessionId: string,
    results: BatchProcessingResult[],
    decisions: BatchRoutingDecision[],
    totalProcessingTime: number
  ): PerformanceMetrics {
    const totalQuestions = results.reduce((sum, r) => sum + r.processedQuestions, 0);
    const totalBatches = results.length;
    const avgCostSavings = results.reduce((sum, r) => sum + r.costSavings, 0) / totalBatches;
    const avgQualityScore = results.reduce((sum, r) => sum + r.qualityScore, 0) / totalBatches;
    const totalFallbacks = results.reduce((sum, r) => sum + r.fallbacksTriggered, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failedQuestions, 0);

    const modelDistribution = decisions.reduce((dist, decision) => {
      const model = decision.model === 'gpt-4.1-2025-04-14' ? 'GPT-4.1' : 'GPT-4o-mini';
      dist[model] = (dist[model] || 0) + decision.questions.length;
      return dist;
    }, {} as Record<string, number>);

    const batchSizeDistribution = decisions.reduce((dist, decision) => {
      const size = decision.questions.length;
      const key = size === 1 ? 'individual' : `batch_${size}`;
      dist[key] = (dist[key] || 0) + 1;
      return dist;
    }, {} as Record<string, number>);

    const errorRate = totalQuestions > 0 ? (totalFailed / totalQuestions) * 100 : 0;

    return {
      timestamp: Date.now(),
      sessionId,
      totalQuestions,
      totalBatches,
      processingTimeMs: totalProcessingTime,
      costSavings: avgCostSavings,
      qualityScore: avgQualityScore,
      fallbacksTriggered: totalFallbacks,
      modelDistribution,
      batchSizeDistribution,
      errorRate
    };
  }

  private updateRealtimeStats(metrics: PerformanceMetrics): void {
    this.realtimeData.activeProcessing = false;
    this.realtimeData.currentThroughput = this.calculateCurrentThroughput();
    this.realtimeData.recentSuccessRate = this.calculateRecentSuccessRate();
    this.realtimeData.avgResponseTime = this.calculateAvgResponseTime();
  }

  analyzePerformance(timeRangeMs?: number): PerformanceAnalysis {
    const relevantMetrics = this.getRelevantMetrics(timeRangeMs);
    
    if (relevantMetrics.length === 0) {
      return this.getDefaultAnalysis();
    }

    console.log(`📊 Analyzing performance across ${relevantMetrics.length} sessions`);

    const efficiency = this.calculateEfficiencyMetrics(relevantMetrics);
    const cost = this.calculateCostMetrics(relevantMetrics);
    const quality = this.calculateQualityMetrics(relevantMetrics);
    const recommendations = this.generateRecommendations(efficiency, cost, quality);

    return {
      efficiency,
      cost,
      quality,
      recommendations
    };
  }

  private getRelevantMetrics(timeRangeMs?: number): PerformanceMetrics[] {
    if (!timeRangeMs) return this.metricsHistory;
    
    const cutoffTime = Date.now() - timeRangeMs;
    return this.metricsHistory.filter(m => m.timestamp >= cutoffTime);
  }

  private calculateEfficiencyMetrics(metrics: PerformanceMetrics[]) {
    const totalQuestions = metrics.reduce((sum, m) => sum + m.totalQuestions, 0);
    const totalTime = metrics.reduce((sum, m) => sum + m.processingTimeMs, 0);
    const totalBatches = metrics.reduce((sum, m) => sum + m.totalBatches, 0);

    const avgProcessingTime = totalTime / metrics.length;
    const throughputQuestionsPerSecond = totalTime > 0 ? (totalQuestions / totalTime) * 1000 : 0;
    const batchEfficiencyRatio = totalBatches > 0 ? totalQuestions / totalBatches : 1;

    return {
      avgProcessingTime: Math.round(avgProcessingTime),
      throughputQuestionsPerSecond: Number(throughputQuestionsPerSecond.toFixed(2)),
      batchEfficiencyRatio: Number(batchEfficiencyRatio.toFixed(2))
    };
  }

  private calculateCostMetrics(metrics: PerformanceMetrics[]) {
    const totalQuestions = metrics.reduce((sum, m) => sum + m.totalQuestions, 0);
    const totalSavings = metrics.reduce((sum, m) => sum + m.costSavings, 0);
    const avgSavingsPerQuestion = totalQuestions > 0 ? totalSavings / totalQuestions : 0;

    // Calculate optimal batch size based on cost savings
    const batchSizePerformance = new Map<string, number[]>();
    metrics.forEach(m => {
      Object.entries(m.batchSizeDistribution).forEach(([size, count]) => {
        if (!batchSizePerformance.has(size)) {
          batchSizePerformance.set(size, []);
        }
        batchSizePerformance.get(size)!.push(m.costSavings);
      });
    });

    let optimalBatchSize = 4; // Default
    let bestAvgSavings = 0;
    
    for (const [size, savings] of batchSizePerformance) {
      const avgSavings = savings.reduce((sum, s) => sum + s, 0) / savings.length;
      if (avgSavings > bestAvgSavings) {
        bestAvgSavings = avgSavings;
        const sizeNum = parseInt(size.replace('batch_', ''));
        if (!isNaN(sizeNum)) optimalBatchSize = sizeNum;
      }
    }

    return {
      totalSavings: Number(totalSavings.toFixed(1)),
      avgSavingsPerQuestion: Number(avgSavingsPerQuestion.toFixed(3)),
      optimalBatchSize
    };
  }

  private calculateQualityMetrics(metrics: PerformanceMetrics[]) {
    const totalQuestions = metrics.reduce((sum, m) => sum + m.totalQuestions, 0);
    const totalFallbacks = metrics.reduce((sum, m) => sum + m.fallbacksTriggered, 0);
    const avgQualityScore = metrics.reduce((sum, m) => sum + m.qualityScore, 0) / metrics.length;
    const avgErrorRate = metrics.reduce((sum, m) => sum + m.errorRate, 0) / metrics.length;

    return {
      avgQualityScore: Number(avgQualityScore.toFixed(1)),
      successRate: Number((100 - avgErrorRate).toFixed(1)),
      fallbackRate: totalQuestions > 0 ? Number(((totalFallbacks / totalQuestions) * 100).toFixed(1)) : 0
    };
  }

  private generateRecommendations(
    efficiency: any, 
    cost: any, 
    quality: any
  ): string[] {
    const recommendations: string[] = [];

    // Efficiency recommendations
    if (efficiency.batchEfficiencyRatio < 3) {
      recommendations.push('Consider increasing batch sizes to improve processing efficiency');
    }
    
    if (efficiency.throughputQuestionsPerSecond < 0.5) {
      recommendations.push('Processing throughput is low - consider parallel batch processing');
    }

    // Cost recommendations
    if (cost.avgSavingsPerQuestion < 0.2) {
      recommendations.push('Cost savings are minimal - review batch optimization strategies');
    }
    
    if (cost.optimalBatchSize !== 4) {
      recommendations.push(`Optimal batch size appears to be ${cost.optimalBatchSize} based on cost analysis`);
    }

    // Quality recommendations
    if (quality.avgQualityScore < 80) {
      recommendations.push('Average quality score is below 80% - consider adjusting fallback thresholds');
    }
    
    if (quality.fallbackRate > 15) {
      recommendations.push('High fallback rate detected - review question complexity analysis');
    }
    
    if (quality.successRate < 95) {
      recommendations.push('Success rate below 95% - consider individual processing for complex questions');
    }

    // Default recommendation if no issues found
    if (recommendations.length === 0) {
      recommendations.push('Performance metrics are within optimal ranges');
    }

    return recommendations;
  }

  private calculateCurrentThroughput(): number {
    const recentMetrics = this.getRelevantMetrics(60000); // Last minute
    if (recentMetrics.length === 0) return 0;
    
    const totalQuestions = recentMetrics.reduce((sum, m) => sum + m.totalQuestions, 0);
    const totalTime = recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0);
    
    return totalTime > 0 ? (totalQuestions / totalTime) * 1000 : 0;
  }

  private calculateRecentSuccessRate(): number {
    const recentMetrics = this.getRelevantMetrics(300000); // Last 5 minutes
    if (recentMetrics.length === 0) return 100;
    
    const avgErrorRate = recentMetrics.reduce((sum, m) => sum + m.errorRate, 0) / recentMetrics.length;
    return Math.max(0, 100 - avgErrorRate);
  }

  private calculateAvgResponseTime(): number {
    const recentMetrics = this.getRelevantMetrics(300000); // Last 5 minutes
    if (recentMetrics.length === 0) return 0;
    
    return recentMetrics.reduce((sum, m) => sum + m.processingTimeMs, 0) / recentMetrics.length;
  }

  private getDefaultAnalysis(): PerformanceAnalysis {
    return {
      efficiency: {
        avgProcessingTime: 0,
        throughputQuestionsPerSecond: 0,
        batchEfficiencyRatio: 1
      },
      cost: {
        totalSavings: 0,
        avgSavingsPerQuestion: 0,
        optimalBatchSize: 4
      },
      quality: {
        avgQualityScore: 0,
        successRate: 0,
        fallbackRate: 0
      },
      recommendations: ['No performance data available yet']
    };
  }

  getRealtimeStats(): RealtimeStats {
    return { ...this.realtimeData };
  }

  getMetricsHistory(limit?: number): PerformanceMetrics[] {
    const history = [...this.metricsHistory];
    return limit ? history.slice(-limit) : history;
  }

  generatePerformanceReport(timeRangeMs?: number): string {
    const analysis = this.analyzePerformance(timeRangeMs);
    
    return `Batch Performance Report:
Efficiency: ${analysis.efficiency.throughputQuestionsPerSecond} questions/sec, avg batch size: ${analysis.efficiency.batchEfficiencyRatio}
Cost: ${analysis.cost.totalSavings}% total savings, optimal batch size: ${analysis.cost.optimalBatchSize}
Quality: ${analysis.quality.avgQualityScore}% avg quality, ${analysis.quality.successRate}% success rate
Top Recommendation: ${analysis.recommendations[0]}`;
  }

  clearHistory(): void {
    this.metricsHistory = [];
    console.log('📊 Performance metrics history cleared');
  }

  exportMetrics(): PerformanceMetrics[] {
    return [...this.metricsHistory];
  }
}

// Export singleton instance
export const batchPerformanceMonitor = new BatchPerformanceMonitor();
