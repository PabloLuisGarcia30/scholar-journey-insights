
export interface QuestionBatch {
  id: string;
  questions: any[];
  answerKeys: any[];
  skillMappings: any[];
  complexity: 'simple' | 'medium' | 'complex';
  optimalBatchSize: number;
  estimatedTokens: number;
  priority: number;
}

export interface BatchProcessingConfig {
  baseBatchSize: number;
  maxBatchSize: number;
  minBatchSize: number;
  adaptiveSizing: boolean;
  complexityThresholds: {
    simple: number;
    medium: number;
    complex: number;
  };
  maxTokensPerBatch: number;
}

export interface BatchProcessingResult {
  totalQuestions: number;
  totalBatches: number;
  avgBatchSize: number;
  totalApiCalls: number;
  estimatedCostSavings: number;
  processingTimeMs: number;
  accuracyMaintained: boolean;
}

const DEFAULT_CONFIG: BatchProcessingConfig = {
  baseBatchSize: 15,
  maxBatchSize: 30,
  minBatchSize: 8,
  adaptiveSizing: true,
  complexityThresholds: {
    simple: 25,
    medium: 50,
    complex: 100
  },
  maxTokensPerBatch: 25000
};

export class QuestionBatchOptimizer {
  private config: BatchProcessingConfig;
  private batchCounter = 0;

  constructor(config: Partial<BatchProcessingConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  optimizeQuestionBatches(
    questions: any[],
    answerKeys: any[],
    skillMappings: any[]
  ): QuestionBatch[] {
    console.log(`🔧 QuestionBatchOptimizer: Optimizing ${questions.length} questions for batch processing`);
    
    if (questions.length === 0) return [];

    // Analyze question complexity
    const complexityAnalysis = this.analyzeQuestionComplexity(questions, answerKeys);
    
    // Group questions by complexity for optimal batching
    const complexityGroups = this.groupQuestionsByComplexity(
      questions, 
      answerKeys, 
      skillMappings, 
      complexityAnalysis
    );
    
    // Create optimized batches
    const batches = this.createOptimizedBatches(complexityGroups);
    
    console.log(`📊 Created ${batches.length} optimized batches`);
    return batches;
  }

  private analyzeQuestionComplexity(questions: any[], answerKeys: any[]): number[] {
    return questions.map((question, index) => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      return this.calculateQuestionComplexity(question, answerKey);
    });
  }

  private calculateQuestionComplexity(question: any, answerKey: any): number {
    let complexity = 0;
    
    // Analyze question text
    const questionText = answerKey?.question_text || question?.questionText || '';
    if (questionText.length > 200) complexity += 20;
    if (questionText.length > 400) complexity += 30;
    
    // Analyze answer complexity
    const correctAnswer = answerKey?.correct_answer || '';
    if (correctAnswer.length > 100) complexity += 15;
    if (correctAnswer.includes('explain') || correctAnswer.includes('because')) complexity += 20;
    
    // Check for multi-part questions
    if (questionText.includes('(a)') || questionText.includes('Part A')) complexity += 25;
    
    // Question type analysis
    if (questionText.toLowerCase().includes('essay') || questionText.toLowerCase().includes('explain')) {
      complexity += 40;
    }
    
    return Math.min(complexity, 100);
  }

  private groupQuestionsByComplexity(
    questions: any[],
    answerKeys: any[],
    skillMappings: any[],
    complexityScores: number[]
  ): Map<string, { questions: any[], answerKeys: any[], skillMappings: any[], avgComplexity: number }> {
    const groups = new Map();
    
    questions.forEach((question, index) => {
      const complexity = complexityScores[index];
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      const skills = skillMappings.filter(sm => sm.question_number === question.questionNumber);
      
      let complexityCategory: string;
      if (complexity < this.config.complexityThresholds.simple) {
        complexityCategory = 'simple';
      } else if (complexity < this.config.complexityThresholds.medium) {
        complexityCategory = 'medium';
      } else {
        complexityCategory = 'complex';
      }
      
      if (!groups.has(complexityCategory)) {
        groups.set(complexityCategory, {
          questions: [],
          answerKeys: [],
          skillMappings: [],
          avgComplexity: 0
        });
      }
      
      const group = groups.get(complexityCategory);
      group.questions.push(question);
      if (answerKey) group.answerKeys.push(answerKey);
      group.skillMappings.push(...skills);
    });
    
    // Calculate average complexity for each group
    for (const [category, group] of groups) {
      const complexities = group.questions.map((_, index) => {
        const questionIndex = questions.findIndex(q => q.questionNumber === group.questions[index].questionNumber);
        return complexityScores[questionIndex] || 0;
      });
      group.avgComplexity = complexities.reduce((sum, c) => sum + c, 0) / complexities.length;
    }
    
    return groups;
  }

  private createOptimizedBatches(
    complexityGroups: Map<string, { questions: any[], answerKeys: any[], skillMappings: any[], avgComplexity: number }>
  ): QuestionBatch[] {
    const batches: QuestionBatch[] = [];
    
    for (const [complexity, group] of complexityGroups) {
      const optimalBatchSize = this.calculateOptimalBatchSize(
        complexity as 'simple' | 'medium' | 'complex',
        group.questions.length
      );
      
      // Split group into batches of optimal size
      for (let i = 0; i < group.questions.length; i += optimalBatchSize) {
        const batchQuestions = group.questions.slice(i, i + optimalBatchSize);
        const batchAnswerKeys = group.answerKeys.slice(i, i + optimalBatchSize);
        const batchSkillMappings = group.skillMappings.filter(sm => 
          batchQuestions.some(q => q.questionNumber === sm.question_number)
        );
        
        batches.push({
          id: `batch_${++this.batchCounter}`,
          questions: batchQuestions,
          answerKeys: batchAnswerKeys,
          skillMappings: batchSkillMappings,
          complexity: complexity as 'simple' | 'medium' | 'complex',
          optimalBatchSize: batchQuestions.length,
          estimatedTokens: this.estimateTokenUsage(batchQuestions, batchAnswerKeys),
          priority: this.calculateBatchPriority(complexity as 'simple' | 'medium' | 'complex', batchQuestions.length)
        });
      }
    }
    
    // Sort by priority (high priority first)
    return batches.sort((a, b) => b.priority - a.priority);
  }

  private calculateOptimalBatchSize(complexity: 'simple' | 'medium' | 'complex', questionCount: number): number {
    if (!this.config.adaptiveSizing) {
      return Math.min(this.config.baseBatchSize, questionCount);
    }
    
    let targetSize: number;
    
    switch (complexity) {
      case 'simple':
        targetSize = this.config.maxBatchSize; // 25-30 for simple questions
        break;
      case 'medium':
        targetSize = Math.floor(this.config.maxBatchSize * 0.7); // ~20 for medium
        break;
      case 'complex':
        targetSize = this.config.minBatchSize; // 8-10 for complex
        break;
      default:
        targetSize = this.config.baseBatchSize;
    }
    
    return Math.min(targetSize, questionCount, this.config.maxBatchSize);
  }

  private estimateTokenUsage(questions: any[], answerKeys: any[]): number {
    // Rough estimation: ~100-200 tokens per question depending on complexity
    let totalTokens = 0;
    
    questions.forEach((question, index) => {
      const answerKey = answerKeys[index];
      const questionText = answerKey?.question_text || '';
      const answerText = answerKey?.correct_answer || '';
      
      // Base tokens for question structure
      totalTokens += 50;
      
      // Tokens for question text (rough: 1 token per 4 characters)
      totalTokens += Math.ceil(questionText.length / 4);
      
      // Tokens for answer text
      totalTokens += Math.ceil(answerText.length / 4);
      
      // Additional tokens for formatting and instructions
      totalTokens += 20;
    });
    
    // Add base prompt tokens
    totalTokens += 500;
    
    return totalTokens;
  }

  private calculateBatchPriority(complexity: 'simple' | 'medium' | 'complex', batchSize: number): number {
    let priority = 0;
    
    // Higher priority for larger batches (better efficiency)
    priority += batchSize * 2;
    
    // Adjust for complexity (simple questions can be processed faster)
    switch (complexity) {
      case 'simple':
        priority += 30;
        break;
      case 'medium':
        priority += 20;
        break;
      case 'complex':
        priority += 10;
        break;
    }
    
    return priority;
  }

  generateBatchSummary(batches: QuestionBatch[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const totalBatches = batches.length;
    const avgBatchSize = totalQuestions > 0 ? (totalQuestions / totalBatches).toFixed(1) : '0';
    
    const complexityDistribution = batches.reduce((dist, batch) => {
      dist[batch.complexity] = (dist[batch.complexity] || 0) + batch.questions.length;
      return dist;
    }, {} as Record<string, number>);
    
    const estimatedApiCalls = totalBatches;
    const estimatedTokens = batches.reduce((sum, batch) => sum + batch.estimatedTokens, 0);
    const estimatedCostSavings = Math.max(0, (totalQuestions / 5) - estimatedApiCalls) * 0.002;
    
    return `Enhanced Question Batch Summary: ${totalQuestions} questions → ${totalBatches} batches (avg: ${avgBatchSize}). ` +
           `Distribution - Simple: ${complexityDistribution.simple || 0}, Medium: ${complexityDistribution.medium || 0}, Complex: ${complexityDistribution.complex || 0}. ` +
           `Estimated API calls: ${estimatedApiCalls}, Tokens: ${estimatedTokens}, Cost savings: $${estimatedCostSavings.toFixed(4)}`;
  }

  updateConfiguration(newConfig: Partial<BatchProcessingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 QuestionBatchOptimizer: Configuration updated', this.config);
  }

  getConfiguration(): BatchProcessingConfig {
    return { ...this.config };
  }

  // Performance tracking methods
  calculatePerformanceMetrics(
    startTime: number,
    totalQuestions: number,
    totalApiCalls: number
  ): BatchProcessingResult {
    const processingTime = Date.now() - startTime;
    const avgBatchSize = totalQuestions / Math.max(totalApiCalls, 1);
    const estimatedCostSavings = Math.max(0, (totalQuestions / 5) - totalApiCalls) * 0.002;
    
    return {
      totalQuestions,
      totalBatches: totalApiCalls,
      avgBatchSize,
      totalApiCalls,
      estimatedCostSavings,
      processingTimeMs: processingTime,
      accuracyMaintained: true // This would be calculated based on actual results
    };
  }
}
