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
  };
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

export class EnhancedBatchGradingService {
  private static jobs = new Map<string, EnhancedBatchJob>();
  private static jobListeners = new Map<string, (job: EnhancedBatchJob) => void>();

  // Smart question classification for routing (now optimized)
  private static classifyQuestionComplexity(question: any, answerKey: any): 'simple' | 'medium' | 'complex' {
    // Use optimized classifier for better performance
    const classification = OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
    
    // Log for analytics
    ClassificationLogger.logClassification(
      question.questionNumber?.toString() || 'unknown',
      classification,
      question,
      answerKey,
      classification.metrics
    );

    // Map detailed classification to simple routing categories
    if (classification.isSimple && classification.shouldUseLocalGrading) {
      if (classification.confidence >= 0.8) return 'simple';
      if (classification.confidence >= 0.6) return 'medium';
    }
    
    return 'complex';
  }

  // PHASE 2: FIXED - Replace index-based matching with proper database matching
  private static async createSmartBatches(questions: any[], examId: string): Promise<Array<{
    questions: any[];
    answerKeys: any[];
    complexity: 'simple' | 'medium' | 'complex';
    batchSize: number;
    processingMethod: 'local' | 'openai_batch' | 'openai_single';
    validationResult: AnswerKeyValidationResult;
  }>> {
    console.log(`🎯 Creating smart batches for ${questions.length} questions, exam: ${examId}`);
    
    // PHASE 2: Use proper answer key matching instead of index-based
    const validationResult = await AnswerKeyMatchingService.matchQuestionsToAnswerKeys(questions, examId);
    
    // Generate validation report
    const report = AnswerKeyMatchingService.generateValidationReport(validationResult);
    console.log(report);

    // PHASE 5: Enhanced Error Handling - Check if validation failed
    if (!validationResult.isValid) {
      console.error('❌ Answer key validation failed:', {
        missing: validationResult.missingQuestions,
        duplicates: validationResult.duplicateQuestions,
        invalidFormats: validationResult.invalidFormats
      });
      
      // For now, we'll continue with available matches but flag the issues
      console.warn('⚠️ Continuing with partial matches - some questions may not be graded correctly');
    }

    const categorized = {
      simple: [] as any[],
      medium: [] as any[],
      complex: [] as any[]
    };

    // Categorize questions by complexity using MATCHED answer keys
    for (const match of validationResult.matches) {
      if (match.answerKey) {
        const question = questions.find(q => q.questionNumber === match.questionNumber);
        if (question) {
          const complexity = this.classifyQuestionComplexity(question, match.answerKey);
          categorized[complexity].push({ question, answerKey: match.answerKey, originalIndex: match.questionNumber });
        }
      } else {
        // Handle missing answer keys - put in complex category for manual review
        const question = questions.find(q => q.questionNumber === match.questionNumber);
        if (question) {
          console.warn(`⚠️ Question ${match.questionNumber} has no answer key - routing to complex batch`);
          categorized.complex.push({ question, answerKey: null, originalIndex: match.questionNumber });
        }
      }
    }

    const batches = [];

    // Simple questions - route to local AI (free + fast)
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
          validationResult
        });
      }
    }

    // Medium questions - batch with OpenAI for efficiency
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
          validationResult
        });
      }
    }

    // Complex questions - smaller batches for quality
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
          validationResult
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
    examId: string, // PHASE 2: Now requires examId instead of answerKeys array
    studentName: string,
    priority: 'low' | 'normal' | 'high' | 'urgent' = 'normal'
  ): Promise<string> {
    const jobId = `enhanced_grading_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    console.log(`🎯 Creating enhanced batch job: ${jobId} for exam: ${examId}`);

    try {
      // PHASE 2: Pre-validate answer keys before creating job
      const validationResult = await AnswerKeyMatchingService.matchQuestionsToAnswerKeys(questions, examId);
      
      // Analyze complexity distribution with optimized classifier
      const complexityDistribution = { simple: 0, medium: 0, complex: 0 };
      for (const match of validationResult.matches) {
        if (match.answerKey) {
          const question = questions.find(q => q.questionNumber === match.questionNumber);
          if (question) {
            const complexity = this.classifyQuestionComplexity(question, match.answerKey);
            complexityDistribution[complexity]++;
          }
        } else {
          complexityDistribution.complex++; // Missing answer keys go to complex
        }
      }

      const job: EnhancedBatchJob = {
        id: jobId,
        questions,
        answerKeys: [], // PHASE 2: Deprecated - will be fetched from database
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
          circuitBreakerTrips: 0
        }
      };

      this.jobs.set(jobId, job);
      
      console.log(`📊 Job created with complexity distribution:`, complexityDistribution);
      console.log(`🔍 Answer key validation:`, {
        valid: validationResult.isValid,
        matched: validationResult.matchedQuestions,
        missing: validationResult.missingQuestions.length
      });

      // Start processing immediately
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
      // PHASE 2: Create smart batches with proper answer key matching
      const smartBatches = await this.createSmartBatches(job.questions, job.examId);
      job.processingMetrics.batchesCreated = smartBatches.length;
      
      console.log(`🔄 Processing ${smartBatches.length} smart batches for job ${jobId}`);

      let processedQuestions = 0;
      const totalQuestions = job.questions.length;

      for (const batch of smartBatches) {
        try {
          const batchStartTime = Date.now();
          let batchResults: BatchGradingResult[] = [];

          // PHASE 5: Enhanced Error Handling - Check for missing answer keys in batch
          const missingAnswerKeys = batch.answerKeys.filter(ak => ak === null).length;
          if (missingAnswerKeys > 0) {
            console.warn(`⚠️ Batch contains ${missingAnswerKeys} questions with missing answer keys`);
          }

          if (batch.processingMethod === 'local') {
            // Process simple questions with local AI
            batchResults = await this.processLocalBatch(batch.questions, batch.answerKeys);
          } else {
            // Process with enhanced OpenAI batch
            batchResults = await this.processOpenAIBatch(batch.questions, batch.answerKeys, job.examId);
            job.processingMetrics.totalApiCalls++;
          }

          job.results.push(...batchResults);
          processedQuestions += batch.questions.length;

          // Update progress
          job.progress = (processedQuestions / totalQuestions) * 100;
          job.estimatedTimeRemaining = this.calculateTimeRemaining(job, processedQuestions, totalQuestions);
          
          const batchTime = Date.now() - batchStartTime;
          console.log(`✅ Batch completed (${batch.complexity}): ${batch.questions.length} questions in ${batchTime}ms`);
          
          this.notifyJobUpdate(job);

          // Small delay between batches to prevent rate limiting
          if (batch.processingMethod !== 'local') {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

        } catch (error) {
          console.error(`❌ Batch failed (${batch.complexity}):`, error);
          job.errors.push(`Batch processing failed: ${error.message}`);
          
          // PHASE 5: Enhanced Error Handling - Create fallback results for failed batch
          const fallbackResults = batch.questions.map((question, index) => ({
            questionNumber: question.questionNumber || index + 1,
            isCorrect: false,
            pointsEarned: 0,
            pointsPossible: batch.answerKeys[index]?.points || 1,
            confidence: 0.3,
            gradingMethod: 'fallback' as const,
            reasoning: `Batch processing failed: ${error.message}`,
            complexityScore: 0.5,
            reasoningDepth: 'medium' as const,
            processingTime: Date.now() - Date.now()
          }));
          
          job.results.push(...fallbackResults);
          processedQuestions += batch.questions.length;
        }
      }

      job.status = job.errors.length > 0 ? 'failed' : 'completed';
      job.progress = 100;
      job.completedAt = Date.now();

      // Calculate final metrics
      const processingTime = job.completedAt - (job.startedAt || job.completedAt);
      job.processingMetrics.costEstimate = this.calculateCostEstimate(job);

      console.log(`🎉 Enhanced batch job completed: ${jobId}`);
      console.log(`📈 Results: ${job.results.length} questions processed in ${processingTime}ms`);
      console.log(`💰 Estimated cost: $${job.processingMetrics.costEstimate.toFixed(4)}`);

    } catch (error) {
      console.error(`❌ Enhanced batch job failed: ${jobId}:`, error);
      job.status = 'failed';
      job.errors.push(`Job processing failed: ${error.message}`);
    }

    this.notifyJobUpdate(job);
  }

  private static async processLocalBatch(questions: any[], answerKeys: any[]): Promise<BatchGradingResult[]> {
    // Simulate local AI processing (replace with actual local AI service)
    return questions.map((question, index) => {
      const answerKey = answerKeys[index];
      const studentAnswer = question.detectedAnswer?.selectedOption || '';
      const correctAnswer = answerKey?.correct_answer || '';
      
      // Simple comparison for multiple choice
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
        processingTime: 50 + Math.random() * 100 // 50-150ms
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
        processingTime: 2000 + Math.random() * 1000 // 2-3 seconds per batch
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
    
    return Math.round((avgTimePerQuestion * remainingQuestions) / 1000); // seconds
  }

  private static calculateCostEstimate(job: EnhancedBatchJob): number {
    const { complexityDistribution, totalApiCalls } = job.processingMetrics;
    
    // Rough cost estimates (per question)
    const costs = {
      simple: 0, // Local AI is free
      medium: 0.002, // Batched OpenAI
      complex: 0.004 // Complex OpenAI processing
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

    return {
      totalJobs: allJobs.length,
      averageProcessingTime: totalProcessingTime / completedJobs.length,
      successRate,
      costEfficiency: totalQuestions / (totalProcessingTime / 1000), // questions per second
      complexityDistribution: aggregatedComplexity,
      optimizationMetrics: {
        classifier: OptimizedQuestionClassifier.getPerformanceMetrics(),
        analytics: ClassificationLogger.getClassificationAnalytics()
      }
    };
  }

  // New optimization method
  static optimizePerformance() {
    OptimizedQuestionClassifier.optimizeCache(2000); // Larger cache for batch processing
    AnswerKeyMatchingService.optimizeCache(100); // NEW: Optimize answer key cache
    ClassificationLogger.clearLogs();
    console.log('🚀 Enhanced batch grading service performance optimized');
  }
}
