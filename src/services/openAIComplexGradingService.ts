export interface OpenAIGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  feedback: string;
  confidence: number;
  gradingMethod: 'openai_api' | 'openai_batch' | 'error';
}

export interface ComplexQuestionBatch {
  id: string;
  questions: any[];
  status: 'pending' | 'processing' | 'completed' | 'failed';
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  results: OpenAIGradingResult[];
  progress: number;
  estimatedCompletionTime: number;
  priority: 'low' | 'normal' | 'high';
  errors: {
    timestamp: number;
    errorType: string;
    errorMessage: string;
    questionNumber: number;
  }[];
  processingMetrics: {
    totalBatches: number;
    successfulBatches: number;
    failedBatches: number;
    avgBatchTime: number;
    costEstimate: number;
    filesPerSecond: number;
  };
}

export class OpenAIComplexGradingService {
  private static activeBatches: Map<string, ComplexQuestionBatch> = new Map();
  private static batchSubscribers: Map<string, ((batch: ComplexQuestionBatch) => void)[]> = new Map();

  static async gradeComplexQuestions(questions: any[]): Promise<OpenAIGradingResult[]> {
    console.log(`Grading ${questions.length} complex questions`);
    
    const results: OpenAIGradingResult[] = [];
    
    for (const question of questions) {
      try {
        await new Promise(resolve => setTimeout(resolve, 500)); // Simulate processing
        
        const result: OpenAIGradingResult = {
          questionNumber: question.questionNumber || results.length + 1,
          isCorrect: Math.random() > 0.3,
          pointsEarned: Math.floor(Math.random() * (question.pointsPossible || 10)),
          pointsPossible: question.pointsPossible || 10,
          feedback: `AI feedback for question ${results.length + 1}`,
          confidence: Math.random() * 0.3 + 0.7,
          gradingMethod: 'openai_api'
        };
        
        results.push(result);
      } catch (error) {
        console.error(`Error grading question ${question.questionNumber}:`, error);
        
        const errorResult: OpenAIGradingResult = {
          questionNumber: question.questionNumber || results.length + 1,
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: question.pointsPossible || 10,
          feedback: 'Error occurred during grading',
          confidence: 0,
          gradingMethod: 'error'
        };
        
        results.push(errorResult);
      }
    }
    
    return results;
  }

  static async preProcessCommonExamQuestions(questions: any[]): Promise<{ processed: any[], cached: number, errors: any[] }> {
    console.log(`Pre-processing ${questions.length} common exam questions`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const processed = questions.map((question, index) => ({
      ...question,
      preprocessed: true,
      commonPatterns: ['standard_format', 'clear_instructions'],
      optimizedForGrading: true,
      estimatedGradingTime: Math.random() * 300 + 60,
      complexity: Math.random() > 0.5 ? 'medium' : 'simple',
      preprocessingTimestamp: new Date().toISOString()
    }));

    return {
      processed,
      cached: processed.length,
      errors: []
    };
  }

  static async createBatch(questions: any[]): Promise<string> {
    const batchId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Simulate batch creation
    const batch: ComplexQuestionBatch = {
      id: batchId,
      questions: questions.map((q, index) => ({
        ...q,
        questionNumber: index + 1,
        pointsPossible: q.pointsPossible || 10
      })),
      status: 'pending',
      createdAt: Date.now(),
      results: [],
      progress: 0,
      estimatedCompletionTime: Date.now() + (questions.length * 30000), // 30s per question
      priority: 'normal',
      errors: [], // Add the missing errors property
      processingMetrics: {
        totalBatches: 1,
        successfulBatches: 0,
        failedBatches: 0,
        avgBatchTime: 0,
        costEstimate: questions.length * 0.001,
        filesPerSecond: 0
      }
    };

    this.activeBatches.set(batchId, batch);
    this.startBatchProcessing(batchId);
    
    return batchId;
  }

  static async checkBatchStatus(batchId: string): Promise<ComplexQuestionBatch | null> {
    return this.activeBatches.get(batchId) || null;
  }

  static async retrieveBatchResults(batchId: string): Promise<OpenAIGradingResult[]> {
    const batch = this.activeBatches.get(batchId);
    if (!batch) {
      throw new Error(`Batch ${batchId} not found`);
    }
    
    if (batch.status !== 'completed') {
      throw new Error(`Batch ${batchId} is not completed yet. Status: ${batch.status}`);
    }
    
    return batch.results;
  }

  private static async startBatchProcessing(batchId: string): Promise<void> {
    const batch = this.activeBatches.get(batchId);
    if (!batch) return;

    try {
      batch.status = 'processing';
      batch.startedAt = Date.now();

      const totalQuestions = batch.questions.length;
      const results: OpenAIGradingResult[] = [];

      for (let i = 0; i < totalQuestions; i++) {
        const question = batch.questions[i];
        
        // Simulate processing time
        await new Promise(resolve => setTimeout(resolve, 2000 + Math.random() * 3000));
        
        const result: OpenAIGradingResult = {
          questionNumber: i + 1,
          isCorrect: Math.random() > 0.25,
          pointsEarned: Math.floor(Math.random() * (question.pointsPossible || 10)),
          pointsPossible: question.pointsPossible || 10,
          feedback: `Detailed AI feedback for question ${i + 1}`,
          confidence: Math.random() * 0.3 + 0.7,
          gradingMethod: 'openai_batch'
        };

        results.push(result);
        batch.results = results;
        batch.progress = ((i + 1) / totalQuestions) * 100;

        // Notify subscribers of progress
        this.notifySubscribers(batchId, batch);
      }

      batch.status = 'completed';
      batch.completedAt = Date.now();
      batch.progress = 100;

      // Update metrics
      batch.processingMetrics.successfulBatches = 1;
      batch.processingMetrics.avgBatchTime = batch.completedAt - (batch.startedAt || batch.createdAt);

      this.notifySubscribers(batchId, batch);
      
    } catch (error) {
      console.error(`Error processing batch ${batchId}:`, error);
      batch.status = 'failed';
      batch.errors.push({
        timestamp: Date.now(),
        errorType: 'processing_error',
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
        questionNumber: batch.results.length + 1
      });
      
      batch.processingMetrics.failedBatches = 1;
      this.notifySubscribers(batchId, batch);
    }
  }

  private static notifySubscribers(batchId: string, batch: ComplexQuestionBatch): void {
    const callbacks = this.batchSubscribers.get(batchId) || [];
    callbacks.forEach(callback => {
      try {
        callback(batch);
      } catch (error) {
        console.error('Error in batch subscriber callback:', error);
      }
    });
  }

  static subscribeToBatch(batchId: string, callback: (batch: ComplexQuestionBatch) => void): void {
    if (!this.batchSubscribers.has(batchId)) {
      this.batchSubscribers.set(batchId, []);
    }
    this.batchSubscribers.get(batchId)!.push(callback);
  }

  static unsubscribeFromBatch(batchId: string): void {
    this.batchSubscribers.delete(batchId);
  }

  static getBatchStatus(): {
    active: number;
    completed: number;
    failed: number;
  } {
    const batches = Array.from(this.activeBatches.values());
    return {
      active: batches.filter(b => b.status === 'processing').length,
      completed: batches.filter(b => b.status === 'completed').length,
      failed: batches.filter(b => b.status === 'failed').length
    };
  }

  static clearCompletedBatches(): void {
    const completedBatches = Array.from(this.activeBatches.entries())
      .filter(([_, batch]) => batch.status === 'completed' || batch.status === 'failed');
    
    completedBatches.forEach(([batchId]) => {
      this.activeBatches.delete(batchId);
      this.batchSubscribers.delete(batchId);
    });
    
    console.log(`Cleared ${completedBatches.length} completed batches`);
  }
}
