
export interface ClassificationLogEntry {
  questionId: string;
  timestamp: number;
  classification: {
    questionType: string;
    isSimple: boolean;
    confidence: number;
    detectionMethod: string;
    shouldUseLocalGrading: boolean;
    usedFastPath: boolean;
    classificationTime: number;
  };
  question: {
    questionNumber: number;
    hasOptions: boolean;
    questionType?: string;
    ocrConfidence: number;
    bubbleQuality: string;
  };
  performance: {
    cacheHit: boolean;
    processingTime: number;
  };
}

export class ClassificationLogger {
  private static logs: ClassificationLogEntry[] = [];
  private static maxLogs = 10000; // Keep last 10k classifications

  static logClassification(
    questionId: string,
    classification: any,
    question: any,
    answerKey: any,
    metrics: any
  ): void {
    const logEntry: ClassificationLogEntry = {
      questionId,
      timestamp: Date.now(),
      classification: {
        questionType: classification.questionType,
        isSimple: classification.isSimple,
        confidence: classification.confidence,
        detectionMethod: classification.detectionMethod,
        shouldUseLocalGrading: classification.shouldUseLocalGrading,
        usedFastPath: metrics.usedFastPath,
        classificationTime: metrics.classificationTime
      },
      question: {
        questionNumber: question.questionNumber,
        hasOptions: Boolean(answerKey?.options),
        questionType: answerKey?.question_type,
        ocrConfidence: question.detectedAnswer?.confidence || 0,
        bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown'
      },
      performance: {
        cacheHit: metrics.classificationTime < 1, // Heuristic for cache hits
        processingTime: metrics.classificationTime
      }
    };

    this.logs.push(logEntry);

    // Maintain log size limit
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Console logging for development
    console.log(`📊 Question ${questionId} classified: ${classification.questionType} (${metrics.usedFastPath ? 'fast-path' : 'comprehensive'}) in ${metrics.classificationTime.toFixed(2)}ms`);
  }

  static getClassificationAnalytics(): {
    totalClassifications: number;
    fastPathUsage: number;
    averageTime: number;
    typeDistribution: Record<string, number>;
    confidenceDistribution: { high: number; medium: number; low: number };
    qualityIssues: Record<string, number>;
  } {
    if (this.logs.length === 0) {
      return {
        totalClassifications: 0,
        fastPathUsage: 0,
        averageTime: 0,
        typeDistribution: {},
        confidenceDistribution: { high: 0, medium: 0, low: 0 },
        qualityIssues: {}
      };
    }

    const totalClassifications = this.logs.length;
    const fastPathCount = this.logs.filter(log => log.classification.usedFastPath).length;
    const totalTime = this.logs.reduce((sum, log) => sum + log.classification.classificationTime, 0);

    // Type distribution
    const typeDistribution: Record<string, number> = {};
    this.logs.forEach(log => {
      const type = log.classification.questionType;
      typeDistribution[type] = (typeDistribution[type] || 0) + 1;
    });

    // Confidence distribution
    const confidenceDistribution = { high: 0, medium: 0, low: 0 };
    this.logs.forEach(log => {
      const confidence = log.classification.confidence;
      if (confidence >= 0.8) confidenceDistribution.high++;
      else if (confidence >= 0.6) confidenceDistribution.medium++;
      else confidenceDistribution.low++;
    });

    // Quality issues
    const qualityIssues: Record<string, number> = {};
    this.logs.forEach(log => {
      if (log.question.bubbleQuality === 'empty') {
        qualityIssues.emptyBubbles = (qualityIssues.emptyBubbles || 0) + 1;
      }
      if (log.question.ocrConfidence < 0.6) {
        qualityIssues.lowOcrConfidence = (qualityIssues.lowOcrConfidence || 0) + 1;
      }
      if (!log.classification.shouldUseLocalGrading) {
        qualityIssues.requiresAI = (qualityIssues.requiresAI || 0) + 1;
      }
    });

    return {
      totalClassifications,
      fastPathUsage: (fastPathCount / totalClassifications) * 100,
      averageTime: totalTime / totalClassifications,
      typeDistribution,
      confidenceDistribution,
      qualityIssues
    };
  }

  static exportLogs(): ClassificationLogEntry[] {
    return [...this.logs];
  }

  static clearLogs(): void {
    this.logs = [];
    console.log('🧹 Classification logs cleared');
  }

  static getRecentLogs(count: number = 100): ClassificationLogEntry[] {
    return this.logs.slice(-count);
  }
}
