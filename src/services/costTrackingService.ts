export interface CostMetrics {
  timestamp: Date;
  examId: string;
  totalQuestions: number;
  gpt4oMiniQuestions: number;
  gpt41Questions: number;
  fallbacksTriggered: number;
  estimatedCost: number;
  potentialCost: number; // What it would have cost with all GPT-4.1
  savings: number;
  savingsPercentage: number;
}

export interface DailyCostSummary {
  date: string;
  totalExams: number;
  totalQuestions: number;
  totalSavings: number;
  averageSavingsPercentage: number;
  modelDistribution: {
    gpt4oMiniPercentage: number;
    gpt41Percentage: number;
  };
}

export class CostTrackingService {
  private static readonly GPT_4O_MINI_COST_PER_1K = 0.00015;
  private static readonly GPT_41_COST_PER_1K = 0.003;
  private static costHistory: CostMetrics[] = [];

  static trackExamCosts(
    examId: string,
    routingDecisions: any[],
    fallbackCount: number = 0
  ): CostMetrics {
    const gpt4oMiniQuestions = routingDecisions.filter(d => d.selectedModel === 'gpt-4o-mini').length - fallbackCount;
    const gpt41Questions = routingDecisions.filter(d => d.selectedModel === 'gpt-4.1-2025-04-14').length + fallbackCount;
    
    // Calculate actual estimated cost
    const estimatedCost = routingDecisions.reduce((sum, decision) => {
      if (decision.selectedModel === 'gpt-4o-mini') {
        return sum + decision.estimatedCost;
      } else {
        return sum + decision.estimatedCost;
      }
    }, 0);

    // Add fallback costs (fallbacks use GPT-4.1)
    const fallbackCost = fallbackCount * (this.GPT_41_COST_PER_1K * 150 / 1000); // Assuming 150 tokens average
    const totalEstimatedCost = estimatedCost + fallbackCost;

    // Calculate what it would have cost with all GPT-4.1
    const potentialCost = routingDecisions.length * (this.GPT_41_COST_PER_1K * 150 / 1000);
    
    const savings = Math.max(0, potentialCost - totalEstimatedCost);
    const savingsPercentage = potentialCost > 0 ? (savings / potentialCost) * 100 : 0;

    const metrics: CostMetrics = {
      timestamp: new Date(),
      examId,
      totalQuestions: routingDecisions.length,
      gpt4oMiniQuestions,
      gpt41Questions,
      fallbacksTriggered: fallbackCount,
      estimatedCost: totalEstimatedCost,
      potentialCost,
      savings,
      savingsPercentage
    };

    this.costHistory.push(metrics);
    
    // Keep only last 1000 entries to prevent memory issues
    if (this.costHistory.length > 1000) {
      this.costHistory = this.costHistory.slice(-1000);
    }

    console.log(`💰 Cost Tracking: Exam ${examId} - Saved $${savings.toFixed(4)} (${savingsPercentage.toFixed(1)}%)`);
    console.log(`📊 Model Usage: ${gpt4oMiniQuestions} mini + ${gpt41Questions} standard + ${fallbackCount} fallbacks`);

    return metrics;
  }

  static getDailySummary(date: Date = new Date()): DailyCostSummary {
    const dateStr = date.toISOString().split('T')[0];
    const dayMetrics = this.costHistory.filter(m => 
      m.timestamp.toISOString().split('T')[0] === dateStr
    );

    if (dayMetrics.length === 0) {
      return {
        date: dateStr,
        totalExams: 0,
        totalQuestions: 0,
        totalSavings: 0,
        averageSavingsPercentage: 0,
        modelDistribution: {
          gpt4oMiniPercentage: 0,
          gpt41Percentage: 0
        }
      };
    }

    const totalQuestions = dayMetrics.reduce((sum, m) => sum + m.totalQuestions, 0);
    const totalGPT4oMini = dayMetrics.reduce((sum, m) => sum + m.gpt4oMiniQuestions, 0);
    const totalGPT41 = dayMetrics.reduce((sum, m) => sum + m.gpt41Questions, 0);
    const totalSavings = dayMetrics.reduce((sum, m) => sum + m.savings, 0);
    const averageSavingsPercentage = dayMetrics.reduce((sum, m) => sum + m.savingsPercentage, 0) / dayMetrics.length;

    return {
      date: dateStr,
      totalExams: dayMetrics.length,
      totalQuestions,
      totalSavings,
      averageSavingsPercentage,
      modelDistribution: {
        gpt4oMiniPercentage: totalQuestions > 0 ? (totalGPT4oMini / totalQuestions) * 100 : 0,
        gpt41Percentage: totalQuestions > 0 ? (totalGPT41 / totalQuestions) * 100 : 0
      }
    };
  }

  static getWeeklySummary(): DailyCostSummary[] {
    const summaries: DailyCostSummary[] = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      summaries.push(this.getDailySummary(date));
    }
    
    return summaries;
  }

  static getTotalSavings(): { totalSavings: number, totalExams: number, averageSavingsPercentage: number } {
    if (this.costHistory.length === 0) {
      return { totalSavings: 0, totalExams: 0, averageSavingsPercentage: 0 };
    }

    const totalSavings = this.costHistory.reduce((sum, m) => sum + m.savings, 0);
    const averageSavingsPercentage = this.costHistory.reduce((sum, m) => sum + m.savingsPercentage, 0) / this.costHistory.length;
    
    return {
      totalSavings,
      totalExams: this.costHistory.length,
      averageSavingsPercentage
    };
  }

  static generateCostReport(): string {
    const summary = this.getTotalSavings();
    const todaySummary = this.getDailySummary();
    
    return `AI Cost Optimization Report:
    📈 Total Savings: $${summary.totalSavings.toFixed(4)} across ${summary.totalExams} exams
    📊 Average Savings: ${summary.averageSavingsPercentage.toFixed(1)}% per exam
    📅 Today: ${todaySummary.totalExams} exams, $${todaySummary.totalSavings.toFixed(4)} saved
    🎯 Model Distribution Today: ${todaySummary.modelDistribution.gpt4oMiniPercentage.toFixed(1)}% GPT-4o-mini, ${todaySummary.modelDistribution.gpt41Percentage.toFixed(1)}% GPT-4.1`;
  }

  static resetHistory(): void {
    this.costHistory = [];
    console.log('🔄 Cost tracking history has been reset');
  }

  static exportHistory(): CostMetrics[] {
    return [...this.costHistory]; // Return a copy
  }
}
