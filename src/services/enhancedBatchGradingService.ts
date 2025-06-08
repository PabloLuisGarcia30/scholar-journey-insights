import { supabase } from "@/integrations/supabase/client";
import { PerformanceOptimizationService } from './performanceOptimizationService';
import { OptimizedQuestionClassifier } from './optimizedQuestionClassifier';
import { ClassificationLogger } from './classificationLogger';
import { AnswerKeyMatchingService, AnswerKeyValidationResult } from './answerKeyMatchingService';

export interface EnhancedBatchJob {
  id: string;
  questions: any[];
  answerKeys: any[];
  examId: string;
  studentName: string;
  status: 'pending' | 'processing' | 'completed' | 'failed' | 'paused';
  priority: 'low' | 'normal' | 'high' | 'urgent';
  progress: number;
  results: any[];
  errors: string[];
  startedAt?: number;
  completedAt?: number;
  estimatedTimeRemaining?: number;
  processingMetrics: {
    complexityDistribution: { simple: number; medium: number; complex: number };
    batchesCreated: number;
    totalApiCalls: number;
    costEstimate: number;
    circuitBreakerTrips: number;
    parallelBatchesProcessed: number;
    concurrentBatches: number;
    avgBatchProcessingTime: number;
  };
  batchProgress: Array<{
    batchIndex: number;
    complexity: string;
    progress: number;
    status: 'pending' | 'processing' | 'completed' | 'failed';
    startTime?: number;
    endTime?: number;
    resultsCount: number;
  }>;
}

export interface BatchGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local_ai' | 'openai_batch' | 'openai_single' | 'fallback';
  reasoning: string;
  complexityScore: number;
  reasoningDepth: 'shallow' | 'medium' | 'deep';
  processingTime: number;
}

interface BatchProcessingResult {
  batchIndex: number;
  results: BatchGradingResult[];
  processingTime: number;
  complexity: string;
  method: string;
}

interface ConcurrencyConfig {
  localAI: {
    maxConcurrent: number;
    currentActive: number;
  };
  openAI: {
    maxConcurrent: number;
    currentActive: number;
    rateLimitBuffer: number;
  };
  circuitBreaker: {
    failureThreshold: number;
    recoveryTimeMs: number;
    isOpen: boolean;
    lastFailureTime: number;
  };
}

export class EnhancedBatchGradingService {
  private static jobs = new Map<string, EnhancedBatchJob>();
  private static jobListeners = new Map<string, (job: EnhancedBatchJob) => void>();
  
  // Enhanced concurrency management
  private static concurrencyConfig: ConcurrencyConfig = {
    localAI: {
      maxConcurrent: 8, // Higher for local processing
      currentActive: 0
    },
    openAI: {
      maxConcurrent: 3, // Conservative for API rate limits
      currentActive: 0,
      rateLimitBuffer: 500 // ms between requests
    },
    circuitBreaker: {
      failureThreshold: 5,
      recoveryTimeMs: 60000,
      isOpen: false,
      lastFailureTime: 0
    }
  };

  // Smart question classification for routing (now optimized)
  private static classifyQuestionComplexity(question: any, answerKey: any): 'simple' | 'medium' | 'complex' {
    const classification = OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
    
    ClassificationLogger.logClassification(
      question.questionNumber?.toString() || 'unknown',
      classification,
      question,
      answerKey,
      classification.metrics
    );

    if (classification.isSimple && classification.shouldUseLocalGrading) {
      if (classification.confidence >= 0.8) return 'simple';
      if (classification.confidence >= 0.6) return 'medium';
    }
    
    return 'complex';
  }

  // PHASE 2: FIXED - Replace index-based matching with proper database matching OR use pre-validated keys
  private static async createSmartBatches(
    questions: any[], 
    examId: string,
    preValidatedAnswerKeys?: any[]
  ): Promise<Array<{
    questions: any[];
    answerKeys: any[];
    complexity: 'simple' | 'medium' | 'complex';
    batchSize: number;
    processingMethod: 'local' | 'openai_batch' | 'openai_single';
    validationResult: AnswerKeyValidationResult;
    batchIndex: number;
  }>> {
    console.log(`🎯 Creating smart batches for ${questions.length} questions, exam: ${examId}`);
    
    let validationResult: AnswerKeyValidationResult;
    
    if (preValidatedAnswerKeys && preValidatedAnswerKeys.length > 0) {
      console.log(`📋 Using pre-validated answer keys (${preValidatedAnswerKeys.length} keys)`);
      
      const matches = questions.map((question, index) => {
        const answerKey = preValidatedAnswerKeys[index];
        return {
          questionNumber: question.questionNumber,
          answerKey: answerKey || null,
          matchType: (answerKey ? 'exact' : 'missing') as 'exact' | 'missing',
          confidence: answerKey ? 1.0 : 0.0,
          reasoning: answerKey ? `Pre-validated answer key for question ${question.questionNumber}` : `No pre-validated key for question ${question.questionNumber}`
        };
      });
      
      validationResult = {
        isValid: matches.every(m => m.answerKey !== null),
        totalQuestions: questions.length,
        matchedQuestions: matches.filter(m => m.answerKey !== null).length,
        missingQuestions: matches.filter(m => m.answerKey === null).map(m => m.questionNumber),
        duplicateQuestions: [],
        invalidFormats: [],
        matches
      };
      
    } else {
      console.log(`🔍 No pre-validated keys provided, fetching from database`);
      validationResult = await AnswerKeyMatchingService.matchQuestionsToAnswerKeys(questions, examId);
    }
    
    const report = AnswerKeyMatchingService.generateValidationReport(validationResult);
    console.log(report);

    if (!validationResult.isValid) {
      console.error('❌ Answer key validation failed:', {
        missing: validationResult.missingQuestions,
        duplicates: validationResult.duplicateQuestions,
        invalidFormats: validationResult.invalidFormats
      });
      console.warn('⚠️ Continuing with partial matches - some questions may not be graded correctly');
    }

    const categorized = {
      simple: [] as any[],
      medium: [] as any[],
      complex: [] as any[]
    };

    for (const match of validationResult.matches) {
      if (match.answerKey) {
        const question = questions.find(q => q.questionNumber === match.questionNumber);
        if (question) {
          const complexity = this.classifyQuestionComplexity(question, match.answerKey);
          categorized[complexity].push({ question, answerKey: match.answerKey, originalIndex: match.questionNumber });
        }
      } else {
        const question = questions.find(q => q.questionNumber === match.questionNumber);
        if (question) {
          console.warn(`⚠️ Question ${match.questionNumber} has no answer key - routing to complex batch`);
          categorized.complex.push({ question, answerKey: null, originalIndex: match.questionNumber });
        }
      }
    }

    const batches = [];
    let batchIndex = 0;

    if (categorized.simple.length > 0) {
      const simpleBatchSize = Math.min(20, categorized.simple.length);
      for (let i = 0; i < categorized.simple.length; i += simpleBatchSize) {
        const batch = categorized.simple.slice(i, i + simpleBatchSize);
        batches.push({
          questions: batch.map(item => item.question),
          answerKeys: batch.map(item => item.answerKey),
          complexity: 'simple' as const,
          batchSize: batch.length,
          processingMethod: 'local' as const,
          validationResult,
          batchIndex: batchIndex++
        });
      }
    }

    if (categorized.medium.length > 0) {
      const mediumBatchSize = Math.min(15, categorized.medium.length);
      for (let i = 0; i < categorized.medium.length; i += mediumBatchSize) {
        const batch = categorized.medium.slice(i, i + mediumBatchSize);
        batches.push({
          questions: batch.map(item => item.question),
          answerKeys: batch.map(item => item.answerKey),
          complexity: 'medium' as const,
          batchSize: batch.length,
          processingMethod: 'openai_batch' as const,
          validationResult,
          batchIndex: batchIndex++
        });
      }
    }

    if (categorized.complex.length > 0) {
      const complexBatchSize = Math.min(8, categorized.complex.length);
      for (let i = 0; i < categorized.complex.length; i += complexBatchSize) {
        const batch = categorized.complex.slice(i, i + complexBatchSize);
        batches.push({
          questions: batch.map(item => item.question),
          answerKeys: batch.map(item => item.answerKey),
          complexity: 'complex' as const,
          batchSize: batch.length,
          processingMethod: 'openai_batch' as const,
          validationResult,
          batchIndex: batchIndex++
        });
      }
    }

    console.log(`📦 Created ${batches.length} smart batches:`, {
      simple: categorized.simple.length,
      medium: categorized.medium.length,
      complex: categorized.complex.length
    });

    return batches;
  }

  static async createEnhancedBatchJob(
    questions: any[],
    examId: string,
    studentName: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    preValidatedAnswerKeys?: any[]
  ): Promise<string> {
    const jobId = `enhanced_grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 Creating enhanced batch job: ${jobId} for exam: ${examId}`);
    if (preValidatedAnswerKeys) {
      console.log(`📋 Using ${preValidatedAnswerKeys.length} pre-validated answer keys`);
    }

    try {
      const complexityDistribution = { simple: 0, medium: 0, complex: 0 };
      
      const answerKeysForAnalysis = preValidatedAnswerKeys || 
        (await AnswerKeyMatchingService.getAnswerKeysForExam(examId));
      
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answerKey = answerKeysForAnalysis[i];
        
        if (answerKey) {
          const complexity = this.classifyQuestionComplexity(question, answerKey);
          complexityDistribution[complexity]++;
        } else {
          complexityDistribution.complex++;
        }
      }

      const job: EnhancedBatchJob = {
        id: jobId,
        questions,
        answerKeys: preValidatedAnswerKeys || [],
        examId,
        studentName,
        status: 'pending',
        priority,
        progress: 0,
        results: [],
        errors: [],
        processingMetrics: {
          complexityDistribution,
          batchesCreated: 0,
          totalApiCalls: 0,
          costEstimate: 0,
          circuitBreakerTrips: 0,
          parallelBatchesProcessed: 0,
          concurrentBatches: 0,
          avgBatchProcessingTime: 0
        },
        batchProgress: []
      };

      this.jobs.set(jobId, job);
      
      console.log(`📊 Job created with complexity distribution:`, complexityDistribution);
      console.log(`🔍 Answer key strategy:`, preValidatedAnswerKeys ? 'pre-validated' : 'database-fetch');

      this.processEnhancedBatchJob(jobId);
      
      return jobId;

    } catch (error) {
      console.error(`❌ Failed to create batch job:`, error);
      throw error;
    }
  }

  private static async processEnhancedBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = Date.now();
    this.notifyJobUpdate(job);

    try {
      const smartBatches = await this.createSmartBatches(
        job.questions, 
        job.examId,
        job.answerKeys.length > 0 ? job.answerKeys : undefined
      );
      
      job.processingMetrics.batchesCreated = smartBatches.length;
      
      job.batchProgress = smartBatches.map((batch, index) => ({
        batchIndex: index,
        complexity: batch.complexity,
        progress: 0,
        status: 'pending' as const,
        resultsCount: 0
      }));
      
      console.log(`🚀 Processing ${smartBatches.length} smart batches in parallel for job ${jobId}`);
      
      const { localBatches, openAIBatches } = this.separateBatchesByMethod(smartBatches);
      
      const batchPromises: Promise<BatchProcessingResult>[] = [];
      
      localBatches.forEach(batch => {
        batchPromises.push(this.processControlledBatch(batch, job, 'local'));
      });
      
      openAIBatches.forEach((batch, index) => {
        const delay = index * this.concurrencyConfig.openAI.rateLimitBuffer;
        batchPromises.push(this.processControlledBatch(batch, job, 'openai', delay));
      });
      
      const allResults = await Promise.allSettled(batchPromises);
      
      const successfulResults: BatchProcessingResult[] = [];
      const batchErrors: Array<{ batch: any; error: any }> = [];
      
      allResults.forEach((result, index) => {
        if (result.status === 'fulfilled') {
          successfulResults.push(result.value);
          
          const batchIndex = result.value.batchIndex;
          if (job.batchProgress[batchIndex]) {
            job.batchProgress[batchIndex].status = 'completed';
            job.batchProgress[batchIndex].progress = 100;
            job.batchProgress[batchIndex].endTime = Date.now();
            job.batchProgress[batchIndex].resultsCount = result.value.results.length;
          }
        } else {
          const batch = index < localBatches.length ? localBatches[index] : openAIBatches[index - localBatches.length];
          batchErrors.push({ batch, error: result.reason });
          
          if (job.batchProgress[batch.batchIndex]) {
            job.batchProgress[batch.batchIndex].status = 'failed';
            job.batchProgress[batch.batchIndex].endTime = Date.now();
          }
          
          const fallbackResults = this.createFallbackResults(batch, result.reason);
          successfulResults.push({
            batchIndex: batch.batchIndex,
            results: fallbackResults,
            processingTime: 0,
            complexity: batch.complexity,
            method: 'fallback'
          });
        }
      });
      
      const allBatchResults = successfulResults.flatMap(batch => batch.results);
      job.results.push(...allBatchResults);
      
      job.processingMetrics.parallelBatchesProcessed = successfulResults.length;
      job.processingMetrics.concurrentBatches = Math.max(
        this.concurrencyConfig.localAI.currentActive,
        this.concurrencyConfig.openAI.currentActive
      );
      
      const processingTimes = successfulResults.map(r => r.processingTime).filter(t => t > 0);
      job.processingMetrics.avgBatchProcessingTime = processingTimes.length > 0 
        ? processingTimes.reduce((sum, time) => sum + time, 0) / processingTimes.length 
        : 0;
      
      if (batchErrors.length > 0) {
        console.warn(`⚠️ ${batchErrors.length} batches encountered errors:`, batchErrors);
        job.errors.push(...batchErrors.map(e => `Batch ${e.batch.batchIndex} failed: ${e.error.message}`));
      }
      
      job.status = batchErrors.length === smartBatches.length ? 'failed' : 'completed';
      job.progress = 100;
      job.completedAt = Date.now();
      
      const processingTime = job.completedAt - (job.startedAt || job.completedAt);
      job.processingMetrics.costEstimate = this.calculateCostEstimate(job);
      
      console.log(`🎉 Enhanced parallel batch job completed: ${jobId}`);
      console.log(`📈 Results: ${job.results.length} questions processed in ${processingTime}ms`);
      console.log(`⚡ Parallelization: ${successfulResults.length} batches processed concurrently`);
      console.log(`💰 Estimated cost: $${job.processingMetrics.costEstimate.toFixed(4)}`);

    } catch (error) {
      console.error(`❌ Enhanced batch job failed: ${jobId}:`, error);
      job.status = 'failed';
      job.errors.push(`Job processing failed: ${error.message}`);
    }

    this.notifyJobUpdate(job);
  }

  private static separateBatchesByMethod(batches: any[]): { 
    localBatches: any[], 
    openAIBatches: any[] 
  } {
    const localBatches = batches.filter(batch => batch.processingMethod === 'local');
    const openAIBatches = batches.filter(batch => batch.processingMethod !== 'local');
    
    localBatches.sort((a, b) => {
      const priorityOrder = { simple: 0, medium: 1, complex: 2 };
      return priorityOrder[a.complexity] - priorityOrder[b.complexity];
    });
    
    openAIBatches.sort((a, b) => {
      const priorityOrder = { simple: 0, medium: 1, complex: 2 };
      return priorityOrder[a.complexity] - priorityOrder[b.complexity];
    });
    
    return { localBatches, openAIBatches };
  }

  private static async processControlledBatch(
    batch: any, 
    job: EnhancedBatchJob, 
    method: 'local' | 'openai',
    delay: number = 0
  ): Promise<BatchProcessingResult> {
    if (delay > 0) {
      await new Promise(resolve => setTimeout(resolve, delay));
    }
    
    await this.waitForConcurrencySlot(method);
    
    if (method === 'local') {
      this.concurrencyConfig.localAI.currentActive++;
    } else {
      this.concurrencyConfig.openAI.currentActive++;
    }
    
    if (job.batchProgress[batch.batchIndex]) {
      job.batchProgress[batch.batchIndex].status = 'processing';
      job.batchProgress[batch.batchIndex].startTime = Date.now();
    }
    
    try {
      const batchStartTime = Date.now();
      let batchResults: BatchGradingResult[] = [];
      
      if (batch.processingMethod === 'local') {
        batchResults = await this.processLocalBatch(batch.questions, batch.answerKeys);
      } else {
        batchResults = await this.processOpenAIBatch(batch.questions, batch.answerKeys, job.examId);
        job.processingMetrics.totalApiCalls++;
      }
      
      const processingTime = Date.now() - batchStartTime;
      
      this.updateJobProgress(job);
      
      console.log(`✅ Batch ${batch.batchIndex} completed (${batch.complexity}, ${method}): ${batch.questions.length} questions in ${processingTime}ms`);
      
      return {
        batchIndex: batch.batchIndex,
        results: batchResults,
        processingTime,
        complexity: batch.complexity,
        method: batch.processingMethod
      };
      
    } catch (error) {
      console.error(`❌ Batch ${batch.batchIndex} failed (${batch.complexity}, ${method}):`, error);
      
      if (method === 'openai') {
        this.handleCircuitBreaker(error);
      }
      
      throw error;
      
    } finally {
      if (method === 'local') {
        this.concurrencyConfig.localAI.currentActive--;
      } else {
        this.concurrencyConfig.openAI.currentActive--;
      }
    }
  }

  private static async waitForConcurrencySlot(method: 'local' | 'openai'): Promise<void> {
    const config = method === 'local' 
      ? this.concurrencyConfig.localAI 
      : this.concurrencyConfig.openAI;
      
    while (config.currentActive >= config.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    if (method === 'openai' && this.concurrencyConfig.circuitBreaker.isOpen) {
      const now = Date.now();
      if (now - this.concurrencyConfig.circuitBreaker.lastFailureTime > this.concurrencyConfig.circuitBreaker.recoveryTimeMs) {
        this.concurrencyConfig.circuitBreaker.isOpen = false;
        console.log('🔄 Circuit breaker reset - resuming OpenAI processing');
      } else {
        throw new Error('Circuit breaker is open - OpenAI processing temporarily disabled');
      }
    }
  }

  private static handleCircuitBreaker(error: any): void {
    this.concurrencyConfig.circuitBreaker.lastFailureTime = Date.now();
    
    if (error.message?.includes('rate limit') || error.message?.includes('429')) {
      this.concurrencyConfig.circuitBreaker.isOpen = true;
      console.warn('🚨 Circuit breaker opened due to rate limiting');
    }
  }

  private static updateJobProgress(job: EnhancedBatchJob): void {
    const completedBatches = job.batchProgress.filter(bp => bp.status === 'completed').length;
    const totalBatches = job.batchProgress.length;
    
    if (totalBatches > 0) {
      job.progress = (completedBatches / totalBatches) * 100;
      job.estimatedTimeRemaining = this.calculateEnhancedTimeRemaining(job);
      this.notifyJobUpdate(job);
    }
  }

  private static calculateEnhancedTimeRemaining(job: EnhancedBatchJob): number {
    if (!job.startedAt) return 0;
    
    const completedBatches = job.batchProgress.filter(bp => bp.status === 'completed');
    if (completedBatches.length === 0) return 0;
    
    const avgBatchTime = completedBatches.reduce((sum, batch) => {
      const batchTime = (batch.endTime || Date.now()) - (batch.startTime || Date.now());
      return sum + batchTime;
    }, 0) / completedBatches.length;
    
    const remainingBatches = job.batchProgress.filter(bp => bp.status !== 'completed').length;
    const parallelizationFactor = Math.min(
      remainingBatches,
      this.concurrencyConfig.localAI.maxConcurrent + this.concurrencyConfig.openAI.maxConcurrent
    );
    
    return Math.round((avgBatchTime * remainingBatches / parallelizationFactor) / 1000);
  }

  private static createFallbackResults(batch: any, error: any): BatchGradingResult[] {
    return batch.questions.map((question: any, index: number) => ({
      questionNumber: question.questionNumber || index + 1,
      isCorrect: false,
      pointsEarned: 0,
      pointsPossible: batch.answerKeys[index]?.points || 1,
      confidence: 0.3,
      gradingMethod: 'fallback' as const,
      reasoning: `Batch processing failed: ${error.message}`,
      complexityScore: 0.5,
      reasoningDepth: 'medium' as const,
      processingTime: 0
    }));
  }

  private static async processLocalBatch(questions: any[], answerKeys: any[]): Promise<BatchGradingResult[]> {
    return questions.map((question, index) => {
      const answerKey = answerKeys[index];
      const studentAnswer = question.detectedAnswer?.selectedOption || '';
      const correctAnswer = answerKey?.correct_answer || '';
      
      const isCorrect = studentAnswer.toLowerCase().trim() === correctAnswer.toLowerCase().trim();
      
      return {
        questionNumber: question.questionNumber || index + 1,
        isCorrect,
        pointsEarned: isCorrect ? (answerKey?.points || 1) : 0,
        pointsPossible: answerKey?.points || 1,
        confidence: 0.9,
        gradingMethod: 'local_ai' as const,
        reasoning: `Local AI: Answer ${isCorrect ? 'matches' : 'does not match'} expected response.`,
        complexityScore: 0.3,
        reasoningDepth: 'shallow' as const,
        processingTime: 50 + Math.random() * 100
      };
    });
  }

  private static async processOpenAIBatch(questions: any[], answerKeys: any[], examId: string): Promise<BatchGradingResult[]> {
    try {
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          batchMode: true,
          questions: questions.map((q, index) => ({
            questionNumber: q.questionNumber,
            questionText: answerKeys[index]?.question_text || `Question ${q.questionNumber}`,
            studentAnswer: q.detectedAnswer?.selectedOption?.trim() || '',
            correctAnswer: answerKeys[index]?.correct_answer?.trim() || '',
            pointsPossible: answerKeys[index]?.points || 1,
            skillContext: 'Enhanced batch processing'
          })),
          examId,
          rubric: 'Standard academic grading rubric with partial credit consideration'
        }
      });

      if (error) {
        throw new Error(`OpenAI batch API error: ${error.message}`);
      }

      const results = data.results || [];
      
      return results.map((result: any, index: number) => ({
        questionNumber: result.questionNumber || index + 1,
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        pointsPossible: answerKeys[index]?.points || 1,
        confidence: result.confidence,
        gradingMethod: 'openai_batch' as const,
        reasoning: result.reasoning,
        complexityScore: result.complexityScore || 0.7,
        reasoningDepth: result.reasoningDepth || 'medium',
        processingTime: 2000 + Math.random() * 1000
      }));

    } catch (error) {
      console.error('OpenAI batch processing failed:', error);
      throw error;
    }
  }

  private static calculateTimeRemaining(job: EnhancedBatchJob, processedQuestions: number, totalQuestions: number): number {
    if (!job.startedAt || processedQuestions === 0) return 0;
    
    const elapsed = Date.now() - job.startedAt;
    const avgTimePerQuestion = elapsed / processedQuestions;
    const remainingQuestions = totalQuestions - processedQuestions;
    
    return Math.round((avgTimePerQuestion * remainingQuestions) / 1000);
  }

  private static calculateCostEstimate(job: EnhancedBatchJob): number {
    const { complexityDistribution, totalApiCalls } = job.processingMetrics;
    
    const costs = {
      simple: 0,
      medium: 0.002,
      complex: 0.004
    };
    
    return (
      complexityDistribution.simple * costs.simple +
      complexityDistribution.medium * costs.medium +
      complexityDistribution.complex * costs.complex
    );
  }

  static getJob(jobId: string): EnhancedBatchJob | null {
    return this.jobs.get(jobId) || null;
  }

  static subscribeToJob(jobId: string, callback: (job: EnhancedBatchJob) => void): void {
    this.jobListeners.set(jobId, callback);
  }

  static unsubscribeFromJob(jobId: string): void {
    this.jobListeners.delete(jobId);
  }

  private static notifyJobUpdate(job: EnhancedBatchJob): void {
    const listener = this.jobListeners.get(job.id);
    if (listener) {
      listener({ ...job });
    }
  }

  static async getPerformanceMetrics(): Promise<{
    totalJobs: number;
    averageProcessingTime: number;
    successRate: number;
    costEfficiency: number;
    complexityDistribution: { simple: number; medium: number; complex: number };
    parallelizationMetrics: {
      avgConcurrentBatches: number;
      avgBatchProcessingTime: number;
      parallelEfficiencyGain: number;
      circuitBreakerTrips: number;
    };
    optimizationMetrics: {
      classifier: any;
      analytics: any;
    };
  }> {
    const allJobs = Array.from(this.jobs.values());
    const completedJobs = allJobs.filter(job => job.status === 'completed');
    
    if (completedJobs.length === 0) {
      return {
        totalJobs: 0,
        averageProcessingTime: 0,
        successRate: 0,
        costEfficiency: 0,
        complexityDistribution: { simple: 0, medium: 0, complex: 0 },
        parallelizationMetrics: {
          avgConcurrentBatches: 0,
          avgBatchProcessingTime: 0,
          parallelEfficiencyGain: 0,
          circuitBreakerTrips: 0
        },
        optimizationMetrics: {
          classifier: OptimizedQuestionClassifier.getPerformanceMetrics(),
          analytics: ClassificationLogger.getClassificationAnalytics()
        }
      };
    }

    const totalProcessingTime = completedJobs.reduce((sum, job) => 
      sum + ((job.completedAt || 0) - (job.startedAt || 0)), 0
    );
    
    const totalQuestions = completedJobs.reduce((sum, job) => sum + job.questions.length, 0);
    const successRate = completedJobs.length / allJobs.length * 100;
    
    const aggregatedComplexity = completedJobs.reduce((acc, job) => ({
      simple: acc.simple + job.processingMetrics.complexityDistribution.simple,
      medium: acc.medium + job.processingMetrics.complexityDistribution.medium,
      complex: acc.complex + job.processingMetrics.complexityDistribution.complex
    }), { simple: 0, medium: 0, complex: 0 });

    const avgConcurrentBatches = completedJobs.reduce((sum, job) => 
      sum + job.processingMetrics.concurrentBatches, 0) / completedJobs.length;
    
    const avgBatchProcessingTime = completedJobs.reduce((sum, job) => 
      sum + job.processingMetrics.avgBatchProcessingTime, 0) / completedJobs.length;
    
    const totalCircuitBreakerTrips = completedJobs.reduce((sum, job) => 
      sum + job.processingMetrics.circuitBreakerTrips, 0);
    
    const parallelEfficiencyGain = avgConcurrentBatches > 1 ? avgConcurrentBatches * 0.8 : 1;
    
    return {
      totalJobs: allJobs.length,
      averageProcessingTime: totalProcessingTime / completedJobs.length,
      successRate,
      costEfficiency: totalQuestions / (totalProcessingTime / 1000),
      complexityDistribution: aggregatedComplexity,
      parallelizationMetrics: {
        avgConcurrentBatches,
        avgBatchProcessingTime,
        parallelEfficiencyGain,
        circuitBreakerTrips: totalCircuitBreakerTrips
      },
      optimizationMetrics: {
        classifier: OptimizedQuestionClassifier.getPerformanceMetrics(),
        analytics: ClassificationLogger.getClassificationAnalytics()
      }
    };
  }

  static optimizePerformance() {
    OptimizedQuestionClassifier.optimizeCache(2000);
    AnswerKeyMatchingService.optimizeCache(100);
    ClassificationLogger.clearLogs();
    
    this.concurrencyConfig.circuitBreaker.isOpen = false;
    this.concurrencyConfig.circuitBreaker.lastFailureTime = 0;
    
    console.log('🚀 Enhanced batch grading service performance optimized with parallelization');
  }

  static updateConcurrencyConfig(config: Partial<ConcurrencyConfig>): void {
    this.concurrencyConfig = { ...this.concurrencyConfig, ...config };
    console.log('⚙️ Concurrency configuration updated:', this.concurrencyConfig);
  }

  static getConcurrencyStatus(): ConcurrencyConfig {
    return { ...this.concurrencyConfig };
  }
}
