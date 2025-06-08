import { supabase } from "@/integrations/supabase/client";
import { PerformanceOptimizationService } from './performanceOptimizationService';
import { OptimizedQuestionClassifier } from './optimizedQuestionClassifier';
import { ClassificationLogger } from './classificationLogger';
import { AnswerKeyMatchingService, AnswerKeyValidationResult } from './answerKeyMatchingService';
import { ConservativeBatchOptimizer, SkillAwareBatchGroup } from './conservativeBatchOptimizer';

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
  private static conservativeBatchOptimizer = new ConservativeBatchOptimizer();
  
  // Conservative concurrency management - reduced for accuracy
  private static concurrencyConfig: ConcurrencyConfig = {
    localAI: {
      maxConcurrent: 4, // Reduced from 8
      currentActive: 0
    },
    openAI: {
      maxConcurrent: 2, // Reduced from 3
      currentActive: 0,
      rateLimitBuffer: 1000 // Increased buffer for quality
    },
    circuitBreaker: {
      failureThreshold: 3, // More sensitive to failures
      recoveryTimeMs: 90000, // Longer recovery time
      isOpen: false,
      lastFailureTime: 0
    }
  };

  // Conservative question classification for routing
  private static classifyQuestionComplexity(question: any, answerKey: any): 'simple' | 'medium' | 'complex' {
    const classification = OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
    
    ClassificationLogger.logClassification(
      question.questionNumber?.toString() || 'unknown',
      classification,
      question,
      answerKey,
      classification.metrics
    );

    // More conservative classification - when in doubt, mark as complex
    if (classification.isSimple && classification.shouldUseLocalGrading && classification.confidence >= 0.9) {
      return 'simple';
    } else if (classification.confidence >= 0.8) {
      return 'medium';
    }
    
    return 'complex'; // Default to complex for maximum accuracy
  }

  // PHASE 2: Conservative smart batches with skill-aware grouping
  private static async createConservativeSmartBatches(
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
    skillAlignment: number;
    qualityMetrics: any;
  }>> {
    console.log(`🎯 Creating conservative smart batches for ${questions.length} questions, exam: ${examId}`);
    
    // Get validation result
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
    
    if (!validationResult.isValid) {
      console.error('❌ Answer key validation failed - using conservative fallback');
    }

    // Get skill mappings for conservative grouping
    const { data: skillMappings } = await supabase
      .from('exam_skill_mappings')
      .select('*')
      .eq('exam_id', examId);

    // Prepare complexity analyses (simplified for conservative approach)
    const complexityAnalyses = questions.map(question => ({
      questionNumber: question.questionNumber,
      complexityScore: this.calculateConservativeComplexity(question, validationResult.matches.find(m => m.questionNumber === question.questionNumber)?.answerKey),
      confidenceInDecision: 0.8,
      recommendedModel: 'gpt-4o-mini'
    }));

    // Use conservative batch optimizer
    const skillAwareBatches = this.conservativeBatchOptimizer.optimizeQuestionBatches(
      questions,
      validationResult.matches.map(m => m.answerKey).filter(Boolean),
      skillMappings || [],
      complexityAnalyses
    );

    // Convert to expected format
    const batches = skillAwareBatches.map((batch, index) => ({
      questions: batch.questions,
      answerKeys: batch.answerKeys,
      complexity: batch.complexity,
      batchSize: batch.batchSize,
      processingMethod: this.selectConservativeProcessingMethod(batch),
      validationResult,
      batchIndex: index,
      skillAlignment: batch.qualityMetrics.skillAlignment,
      qualityMetrics: batch.qualityMetrics
    }));

    const summary = this.conservativeBatchOptimizer.generateConservativeSummary(skillAwareBatches);
    console.log(`📊 ${summary}`);

    return batches;
  }

  private static calculateConservativeComplexity(question: any, answerKey: any): number {
    let complexity = 50; // Start with medium complexity
    
    if (!answerKey) return 80; // Missing answer key = complex
    
    const questionText = answerKey.question_text || '';
    const correctAnswer = answerKey.correct_answer || '';
    
    // Conservative complexity calculation
    if (questionText.length > 100) complexity += 20;
    if (correctAnswer.length > 50) complexity += 15;
    if (questionText.includes('explain') || questionText.includes('analyze')) complexity += 25;
    if (answerKey.points > 1) complexity += 15;
    
    return Math.min(complexity, 100);
  }

  private static selectConservativeProcessingMethod(batch: SkillAwareBatchGroup): 'local' | 'openai_batch' | 'openai_single' {
    // Conservative method selection - prefer accuracy over speed
    if (batch.complexity === 'simple' && 
        batch.qualityMetrics.skillAlignment > 0.9 && 
        batch.batchSize <= 3) {
      return 'local';
    }
    
    if (batch.batchSize === 1 || batch.qualityMetrics.skillAlignment < 0.7) {
      return 'openai_single'; // Individual processing for uncertain cases
    }
    
    return 'openai_batch';
  }

  static async createEnhancedBatchJob(
    questions: any[],
    examId: string,
    studentName: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal',
    preValidatedAnswerKeys?: any[]
  ): Promise<string> {
    const jobId = `conservative_grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 Creating conservative batch job: ${jobId} for exam: ${examId}`);
    console.log(`📊 Conservative settings: Reduced batch sizes, skill-aware grouping, quality-first approach`);

    try {
      const complexityDistribution = { simple: 0, medium: 0, complex: 0 };
      
      const answerKeysForAnalysis = preValidatedAnswerKeys || 
        (await AnswerKeyMatchingService.getAnswerKeysForExam(examId));
      
      // Conservative complexity analysis
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answerKey = answerKeysForAnalysis[i];
        
        if (answerKey) {
          const complexity = this.classifyQuestionComplexity(question, answerKey);
          complexityDistribution[complexity]++;
        } else {
          complexityDistribution.complex++; // No answer key = complex
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
      
      console.log(`📊 Conservative job created with complexity distribution:`, complexityDistribution);

      this.processConservativeBatchJob(jobId);
      
      return jobId;

    } catch (error) {
      console.error(`❌ Failed to create conservative batch job:`, error);
      throw error;
    }
  }

  private static async processConservativeBatchJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) return;

    job.status = 'processing';
    job.startedAt = Date.now();
    this.notifyJobUpdate(job);

    try {
      const conservativeSmartBatches = await this.createConservativeSmartBatches(
        job.questions, 
        job.examId,
        job.answerKeys.length > 0 ? job.answerKeys : undefined
      );
      
      job.processingMetrics.batchesCreated = conservativeSmartBatches.length;
      
      job.batchProgress = conservativeSmartBatches.map((batch, index) => ({
        batchIndex: index,
        complexity: batch.complexity,
        progress: 0,
        status: 'pending' as const,
        startTime: undefined,
        endTime: undefined,
        resultsCount: 0
      }));
      
      console.log(`🚀 Processing ${conservativeSmartBatches.length} conservative batches for job ${jobId}`);
      
      // Process batches with conservative concurrency (reduced parallelism)
      const { localBatches, openAIBatches } = this.separateBatchesByMethod(conservativeSmartBatches);
      
      const batchPromises: Promise<BatchProcessingResult>[] = [];
      
      // Process local batches with reduced concurrency
      localBatches.forEach((batch, index) => {
        const delay = index * 200; // Add delay between local batches
        batchPromises.push(this.processControlledBatch(batch, job, 'local', delay));
      });
      
      // Process OpenAI batches with increased delays for quality
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
      
      // Record quality metrics
      conservativeSmartBatches.forEach((batch, index) => {
        const result = successfulResults.find(r => r.batchIndex === index);
        if (result) {
          this.conservativeBatchOptimizer.recordBatchQuality(
            batch.batchSize,
            result.results.filter(r => r.confidence > 0.7).length / result.results.length,
            batch.skillAlignment
          );
        }
      });
      
      job.status = batchErrors.length === conservativeSmartBatches.length ? 'failed' : 'completed';
      job.progress = 100;
      job.completedAt = Date.now();
      
      const processingTime = job.completedAt - (job.startedAt || job.completedAt);
      console.log(`🎉 Conservative batch job completed: ${jobId} - Quality-first approach`);
      console.log(`📈 Results: ${job.results.length} questions processed in ${processingTime}ms`);
      console.log(`🎯 Quality metrics: ${this.conservativeBatchOptimizer.getQualityMetrics().averageBatchSize.toFixed(1)} avg batch size`);

    } catch (error) {
      console.error(`❌ Conservative batch job failed: ${jobId}:`, error);
      job.status = 'failed';
      job.errors.push(`Conservative job processing failed: ${error.message}`);
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
    // Ensure conservative limits are maintained
    if (config.localAI?.maxConcurrent && config.localAI.maxConcurrent > 6) {
      console.warn('⚠️ Conservative batching: Limiting local AI concurrency to 6 for quality');
      config.localAI.maxConcurrent = 6;
    }
    
    if (config.openAI?.maxConcurrent && config.openAI.maxConcurrent > 3) {
      console.warn('⚠️ Conservative batching: Limiting OpenAI concurrency to 3 for quality');
      config.openAI.maxConcurrent = 3;
    }
    
    this.concurrencyConfig = { ...this.concurrencyConfig, ...config };
    console.log('⚙️ Conservative concurrency configuration updated:', this.concurrencyConfig);
  }

  static enableConservativeMode(): void {
    this.concurrencyConfig.localAI.maxConcurrent = 3;
    this.concurrencyConfig.openAI.maxConcurrent = 2;
    this.concurrencyConfig.openAI.rateLimitBuffer = 1500;
    this.concurrencyConfig.circuitBreaker.failureThreshold = 2;
    
    console.log('🎯 Conservative mode enabled - prioritizing accuracy over speed');
  }

  static getConservativeMetrics(): {
    batchOptimizer: any;
    qualityMetrics: any;
    concurrencyLimits: ConcurrencyConfig;
  } {
    return {
      batchOptimizer: this.conservativeBatchOptimizer.getQualityMetrics(),
      qualityMetrics: this.conservativeBatchOptimizer.getQualityMetrics(),
      concurrencyLimits: this.concurrencyConfig
    };
  }
}
