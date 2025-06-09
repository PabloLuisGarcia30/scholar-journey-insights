import { supabase } from "@/integrations/supabase/client";
import { QuestionCacheService, QuestionCacheResult } from "./questionCacheService";
import { SkillMapping, QuestionSkillMappings, EnhancedLocalGradingResult } from "./enhancedLocalGradingService";
import { QuestionBatchOptimizer, QuestionBatch } from "./questionBatchOptimizer";
import { EnhancedBatchGradingService } from "./enhancedBatchGradingService";

export interface OpenAIGradingResult extends EnhancedLocalGradingResult {
  openAIUsage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    estimatedCost: number;
  };
  complexityScore?: number;
  reasoningDepth?: 'shallow' | 'medium' | 'deep';
}

export interface ComplexQuestionBatch {
  questions: any[];
  totalEstimatedCost: number;
  averageComplexity: number;
  priorityQuestions: number[];
}

export interface EnhancedBatchProcessingResult {
  successfulResults: OpenAIGradingResult[];
  errors: Array<{
    batchIndex: number;
    batchQuestions: any[];
    errorType: 'api_failure' | 'rate_limit' | 'timeout' | 'validation' | 'unknown';
    errorMessage: string;
    retryCount: number;
    recoverable: boolean;
  }>;
  totalProcessed: number;
  successRate: number;
  processingTimeMs: number;
  costAnalysis: {
    totalCost: number;
    averageCostPerQuestion: number;
    estimatedSavings: number;
  };
}

export class OpenAIComplexGradingService {
  private static readonly MAX_BATCH_SIZE = 4;
  private static readonly CONSERVATIVE_BATCH_SIZE = true;
  private static readonly COST_PER_1K_TOKENS = 0.002;
  private static readonly CACHE_ENABLED = true;
  private static batchOptimizer = new QuestionBatchOptimizer({
    baseBatchSize: 3,
    maxBatchSize: 4,
    adaptiveSizing: false
  });

  static async gradeComplexQuestions(
    questions: any[],
    answerKeys: any[],
    examId: string,
    studentName: string,
    skillMappings: QuestionSkillMappings
  ): Promise<OpenAIGradingResult[]> {
    console.log(`🎯 Enhanced OpenAI grading ${questions.length} complex questions with parallel processing for student: ${studentName}`);
    
    const startTime = Date.now();
    
    try {
      // Create optimized batches for parallel processing
      const smartBatches = this.createOptimizedBatches(questions, answerKeys);
      console.log(`📦 Created ${smartBatches.length} optimized batches for parallel processing`);

      // Enhanced parallel batch processing with Promise.allSettled
      const batchPromises = smartBatches.map((batch, index) => 
        this.processBatchWithEnhancedHandling(batch, answerKeys, skillMappings, examId, studentName, index)
      );

      const allResults = await Promise.allSettled(batchPromises);

      // Process results with enhanced error handling
      const processedResult = this.processEnhancedBatchResults(allResults, smartBatches, questions.length, startTime);

      // Generate comprehensive result set
      const finalResults: OpenAIGradingResult[] = [];
      
      // Add successful results
      processedResult.successfulResults.forEach(batchResults => {
        finalResults.push(...batchResults);
      });

      // Handle failed batches with fallback processing
      for (const error of processedResult.errors) {
        if (error.recoverable) {
          console.log(`🔄 Attempting fallback processing for recoverable batch ${error.batchIndex}`);
          const fallbackResults = await this.processFallbackBatch(error.batchQuestions, answerKeys, skillMappings);
          finalResults.push(...fallbackResults);
        } else {
          // Create minimal fallback results for non-recoverable errors
          const fallbackResults = error.batchQuestions.map(question => 
            this.createFallbackResult(question, answerKeys.find(ak => ak.question_number === question.questionNumber), [], error.errorMessage)
          );
          finalResults.push(...fallbackResults);
        }
      }

      // Sort results by question number to maintain order
      finalResults.sort((a, b) => a.questionNumber - b.questionNumber);

      // Log comprehensive processing summary
      console.log(`✅ Enhanced OpenAI grading completed for ${studentName}:`, {
        totalQuestions: questions.length,
        successfulBatches: processedResult.successfulResults.length,
        failedBatches: processedResult.errors.length,
        successRate: `${(processedResult.successRate * 100).toFixed(1)}%`,
        processingTime: `${(processedResult.processingTimeMs / 1000).toFixed(1)}s`,
        totalCost: `$${processedResult.costAnalysis.totalCost.toFixed(4)}`,
        avgCostPerQuestion: `$${processedResult.costAnalysis.averageCostPerQuestion.toFixed(4)}`
      });

      return finalResults;

    } catch (error) {
      console.error(`💥 Enhanced OpenAI grading failed for ${studentName}:`, error);
      
      // Return fallback results for all questions
      return questions.map(question => 
        this.createFallbackResult(
          question, 
          answerKeys.find(ak => ak.question_number === question.questionNumber), 
          skillMappings[question.questionNumber] || [], 
          `Enhanced processing failed: ${error.message}`
        )
      );
    }
  }

  private static async processBatchWithEnhancedHandling(
    batch: any[],
    answerKeys: any[],
    skillMappings: QuestionSkillMappings,
    examId: string,
    studentName: string,
    batchIndex: number
  ): Promise<OpenAIGradingResult[]> {
    const batchStartTime = Date.now();
    
    try {
      console.log(`🔄 Processing enhanced batch ${batchIndex + 1} with ${batch.length} questions`);

      // Create enhanced batch prompt with cross-question isolation
      const enhancedBatchPrompt = this.createEnhancedBatchPrompt(batch, answerKeys, skillMappings, studentName);
      
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          batchMode: true,
          enhancedBatchPrompt,
          questions: batch.map(q => ({
            questionNumber: q.questionNumber,
            questionText: answerKeys.find(ak => ak.question_number === q.questionNumber)?.question_text || `Question ${q.questionNumber}`,
            studentAnswer: q.detectedAnswer?.selectedOption?.trim() || '',
            correctAnswer: answerKeys.find(ak => ak.question_number === q.questionNumber)?.correct_answer?.trim() || '',
            pointsPossible: answerKeys.find(ak => ak.question_number === q.questionNumber)?.points || 1,
            skillContext: Object.values(skillMappings).flat()
              .filter(sm => sm.question_number === q.questionNumber)
              .map(s => s.skill_name).join(', ')
          })),
          examId,
          studentName,
          batchIndex
        }
      });

      if (error) {
        throw new Error(`Enhanced batch API error: ${error.message}`);
      }

      const batchResults = data.results || [];
      const processingTime = Date.now() - batchStartTime;

      // Convert to OpenAI grading results with enhanced metadata
      const results: OpenAIGradingResult[] = batchResults.map((result: any, index: number) => {
        const question = batch[index];
        const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
        const questionSkillMappings = Object.values(skillMappings).flat()
          .filter(sm => sm.question_number === question.questionNumber);

        return {
          questionNumber: question.questionNumber,
          isCorrect: result.isCorrect,
          pointsEarned: Math.min(Math.max(result.pointsEarned || 0, 0), answerKey?.points || 1),
          pointsPossible: answerKey?.points || 1,
          confidence: result.confidence || 0.85,
          gradingMethod: 'enhanced_openai_batch',
          reasoning: result.reasoning || 'Enhanced batch processing result',
          skillMappings: questionSkillMappings,
          openAIUsage: {
            promptTokens: Math.floor((data.usage?.promptTokens || 0) / batch.length),
            completionTokens: Math.floor((data.usage?.completionTokens || 0) / batch.length),
            totalTokens: Math.floor((data.usage?.totalTokens || 0) / batch.length),
            estimatedCost: ((data.usage?.totalTokens || 0) / batch.length) * this.COST_PER_1K_TOKENS / 1000
          },
          complexityScore: result.complexityScore || 0.7,
          reasoningDepth: result.reasoningDepth || 'medium',
          qualityFlags: {
            hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
            reviewRequired: question.detectedAnswer?.reviewFlag || false,
            bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
            confidenceAdjusted: result.confidence < 0.8,
            openAIProcessed: true,
            batchProcessed: true,
            enhancedProcessing: true,
            batchIndex,
            processingTime
          }
        };
      });

      // Cache successful results
      if (this.CACHE_ENABLED) {
        await Promise.all(results.map(result => 
          this.cacheGradingResult(examId, result, answerKeys).catch(err => 
            console.warn(`Failed to cache result for Q${result.questionNumber}:`, err)
          )
        ));
      }

      console.log(`✅ Enhanced batch ${batchIndex + 1} completed: ${results.length} questions processed in ${processingTime}ms`);
      return results;

    } catch (error) {
      const processingTime = Date.now() - batchStartTime;
      console.error(`❌ Enhanced batch ${batchIndex + 1} failed after ${processingTime}ms:`, error);
      throw error;
    }
  }

  private static processEnhancedBatchResults(
    allResults: PromiseSettledResult<OpenAIGradingResult[]>[],
    smartBatches: any[][],
    totalQuestions: number,
    startTime: number
  ): EnhancedBatchProcessingResult {
    const successfulResults: OpenAIGradingResult[][] = [];
    const errors: Array<{
      batchIndex: number;
      batchQuestions: any[];
      errorType: 'api_failure' | 'rate_limit' | 'timeout' | 'validation' | 'unknown';
      errorMessage: string;
      retryCount: number;
      recoverable: boolean;
    }> = [];

    let totalCost = 0;
    let totalTokens = 0;

    allResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successfulResults.push(result.value);
        
        // Calculate costs
        const batchCost = result.value.reduce((sum, res) => sum + (res.openAIUsage?.estimatedCost || 0), 0);
        totalCost += batchCost;
        totalTokens += result.value.reduce((sum, res) => sum + (res.openAIUsage?.totalTokens || 0), 0);
      } else {
        const error = this.categorizeOpenAIError(result.reason, index, smartBatches[index]);
        errors.push(error);
        
        console.warn(`⚠️ Enhanced batch ${index + 1} failed:`, {
          errorType: error.errorType,
          message: error.errorMessage,
          questionsInBatch: error.batchQuestions.length,
          recoverable: error.recoverable
        });
      }
    });

    // Enhanced error logging with actionable insights
    if (errors.length > 0) {
      const errorSummary = this.generateOpenAIErrorSummary(errors);
      console.warn(`🚨 Enhanced OpenAI batch processing errors:`, errorSummary);
    }

    const successfulQuestions = successfulResults.reduce((sum, batch) => sum + batch.length, 0);
    const processingTimeMs = Date.now() - startTime;
    const successRate = successfulQuestions / totalQuestions;

    // Calculate cost analysis
    const averageCostPerQuestion = totalQuestions > 0 ? totalCost / totalQuestions : 0;
    const estimatedSingleCallCost = totalQuestions * 0.01; // Rough baseline
    const estimatedSavings = Math.max(0, estimatedSingleCallCost - totalCost);

    return {
      successfulResults,
      errors,
      totalProcessed: successfulQuestions,
      successRate,
      processingTimeMs,
      costAnalysis: {
        totalCost,
        averageCostPerQuestion,
        estimatedSavings
      }
    };
  }

  private static categorizeOpenAIError(
    error: any,
    batchIndex: number,
    batchQuestions: any[]
  ) {
    let errorType: 'api_failure' | 'rate_limit' | 'timeout' | 'validation' | 'unknown' = 'unknown';
    let recoverable = true;

    const errorMessage = error?.message || String(error);

    // Enhanced error categorization for OpenAI-specific errors
    if (errorMessage.includes('rate limit') || errorMessage.includes('429')) {
      errorType = 'rate_limit';
      recoverable = true;
    } else if (errorMessage.includes('timeout') || errorMessage.includes('TIMEOUT')) {
      errorType = 'timeout';
      recoverable = true;
    } else if (errorMessage.includes('500') || errorMessage.includes('502') || errorMessage.includes('503')) {
      errorType = 'api_failure';
      recoverable = true;
    } else if (errorMessage.includes('400') || errorMessage.includes('validation') || errorMessage.includes('format')) {
      errorType = 'validation';
      recoverable = false;
    } else if (errorMessage.includes('401') || errorMessage.includes('403')) {
      errorType = 'api_failure';
      recoverable = false;
    }

    return {
      batchIndex,
      batchQuestions,
      errorType,
      errorMessage,
      retryCount: 0,
      recoverable
    };
  }

  private static generateOpenAIErrorSummary(errors: any[]) {
    const errorTypeCount = errors.reduce((acc, error) => {
      acc[error.errorType] = (acc[error.errorType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recoverableErrors = errors.filter(e => e.recoverable).length;
    const criticalErrors = errors.filter(e => !e.recoverable).length;

    return {
      totalErrors: errors.length,
      errorBreakdown: errorTypeCount,
      recoverableErrors,
      criticalErrors,
      mostCommonError: Object.entries(errorTypeCount).sort(([,a], [,b]) => b - a)[0]?.[0] || 'none',
      affectedQuestions: errors.reduce((sum, error) => sum + error.batchQuestions.length, 0),
      recommendedActions: this.generateRecommendedActions(errorTypeCount)
    };
  }

  private static generateRecommendedActions(errorTypeCount: Record<string, number>): string[] {
    const actions: string[] = [];

    if (errorTypeCount.rate_limit > 0) {
      actions.push('Implement exponential backoff for rate limit handling');
    }
    if (errorTypeCount.timeout > 0) {
      actions.push('Consider reducing batch sizes or increasing timeout values');
    }
    if (errorTypeCount.api_failure > 0) {
      actions.push('Monitor OpenAI service status and implement circuit breaker');
    }
    if (errorTypeCount.validation > 0) {
      actions.push('Review and validate input data format');
    }

    return actions;
  }

  private static async processFallbackBatch(
    questions: any[],
    answerKeys: any[],
    skillMappings: QuestionSkillMappings
  ): Promise<OpenAIGradingResult[]> {
    console.log(`🔄 Processing fallback batch with ${questions.length} questions`);
    
    // Process questions individually as fallback
    const results: OpenAIGradingResult[] = [];
    
    for (const question of questions) {
      try {
        const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
        const questionSkillMappings = Object.values(skillMappings).flat()
          .filter(sm => sm.question_number === question.questionNumber);
        
        const result = await this.gradeComplexQuestionWithOpenAI(question, answerKey, questionSkillMappings, 'Fallback Student');
        results.push(result);
        
        // Add delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
      } catch (error) {
        console.warn(`Fallback failed for Q${question.questionNumber}:`, error);
        const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
        const questionSkillMappings = Object.values(skillMappings).flat()
          .filter(sm => sm.question_number === question.questionNumber);
        
        results.push(this.createFallbackResult(question, answerKey, questionSkillMappings, `Fallback failed: ${error.message}`));
      }
    }
    
    return results;
  }

  private static createOptimizedBatches(questions: any[], answerKeys: any[]): any[][] {
    const batches: any[][] = [];
    const batchSize = Math.min(this.MAX_BATCH_SIZE, Math.max(2, Math.ceil(questions.length / 8)));

    for (let i = 0; i < questions.length; i += batchSize) {
      batches.push(questions.slice(i, i + batchSize));
    }

    return batches;
  }

  private static createEnhancedBatchPrompt(
    questions: any[],
    answerKeys: any[],
    skillMappings: QuestionSkillMappings,
    studentName: string
  ): string {
    const questionCount = questions.length;
    const delimiter = '---END QUESTION---';
    
    return `Grade ${questionCount} test questions for student ${studentName} with enhanced cross-question isolation.

CRITICAL PROCESSING RULES:
1. Each question is separated by "${delimiter}"
2. Do NOT let answers from one question influence another
3. Process questions as completely separate tasks
4. Match skills ONLY from the provided list for each question
5. Maintain strict question boundaries

QUESTIONS TO GRADE (PROCESS INDEPENDENTLY):
${questions.map((q, index) => {
  const answerKey = answerKeys.find(ak => ak.question_number === q.questionNumber);
  const questionSkills = Object.values(skillMappings).flat()
    .filter(sm => sm.question_number === q.questionNumber);
  
  return `Question ${index + 1} (Q${q.questionNumber}):
Question Text: ${answerKey?.question_text || 'Question text not available'}
Student Answer: "${q.detectedAnswer?.selectedOption || 'No answer detected'}"
Correct Answer: "${answerKey?.correct_answer || 'Not specified'}"
Points Possible: ${answerKey?.points || 1}
Available Skills: ${questionSkills.map(s => s.skill_name).join(', ') || 'General'}
Instructions: Match answer strictly to provided skills. Do not infer additional skills.`;
}).join(`\n${delimiter}\n`)}

REQUIRED OUTPUT FORMAT (JSON object with results array):
{
  "results": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 2,
      "confidence": 0.95,
      "reasoning": "Detailed explanation focusing on this question only",
      "complexityScore": 0.6,
      "reasoningDepth": "medium",
      "matchedSkills": ["skill1"],
      "skillConfidence": 0.9
    }
  ]
}

CRITICAL: Return exactly ${questionCount} results. Process each question independently without cross-contamination.`;
  }

  private static async gradeComplexQuestionWithOpenAI(
    question: any,
    answerKey: any,
    skillMappings: SkillMapping[],
    studentName: string
  ): Promise<OpenAIGradingResult> {
    const studentAnswer = question.detectedAnswer?.selectedOption?.trim() || '';
    const correctAnswer = answerKey.correct_answer?.trim() || '';
    const pointsPossible = answerKey.points || 1;

    try {
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          questionText: answerKey.question_text || `Question ${question.questionNumber}`,
          studentAnswer,
          correctAnswer,
          pointsPossible,
          questionNumber: question.questionNumber,
          studentName,
          skillContext: skillMappings.map(s => s.skill_name).join(', ')
        }
      });

      if (error) {
        console.error('OpenAI grading error:', error);
        return this.createFallbackResult(question, answerKey, skillMappings, 'OpenAI API error');
      }

      const isCorrect = data.isCorrect;
      const pointsEarned = Math.min(Math.max(data.pointsEarned || 0, 0), pointsPossible);
      
      return {
        questionNumber: question.questionNumber,
        isCorrect,
        pointsEarned,
        pointsPossible,
        confidence: data.confidence || 0.8,
        gradingMethod: 'openai_complex_reasoning',
        reasoning: data.reasoning || 'OpenAI complex reasoning analysis',
        skillMappings,
        openAIUsage: {
          promptTokens: data.usage?.promptTokens || 0,
          completionTokens: data.usage?.completionTokens || 0,
          totalTokens: data.usage?.totalTokens || 0,
          estimatedCost: (data.usage?.totalTokens || 0) * this.COST_PER_1K_TOKENS / 1000
        },
        complexityScore: data.complexityScore || 0.7,
        reasoningDepth: data.reasoningDepth || 'medium',
        qualityFlags: {
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          reviewRequired: question.detectedAnswer?.reviewFlag || false,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          confidenceAdjusted: data.confidence < 0.7,
          openAIProcessed: true,
          complexQuestion: true
        }
      };

    } catch (error) {
      console.error('OpenAI grading failed:', error);
      return this.createFallbackResult(question, answerKey, skillMappings, `OpenAI processing failed: ${error.message}`);
    }
  }

  private static createFallbackResult(
    question: any,
    answerKey: any,
    skillMappings: SkillMapping[],
    errorReason: string
  ): OpenAIGradingResult {
    return {
      questionNumber: question.questionNumber,
      isCorrect: false,
      pointsEarned: 0,
      pointsPossible: answerKey?.points || 1,
      confidence: 0.3,
      gradingMethod: 'openai_fallback',
      reasoning: `OpenAI grading unavailable: ${errorReason}. Manual review recommended.`,
      skillMappings,
      qualityFlags: {
        hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
        reviewRequired: true,
        bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
        confidenceAdjusted: true,
        openAIProcessed: false,
        requiresManualReview: true
      }
    };
  }

  private static async cacheGradingResult(
    examId: string,
    result: OpenAIGradingResult,
    answerKeys: any[]
  ): Promise<void> {
    try {
      const answerKey = answerKeys.find(ak => ak.question_number === result.questionNumber);
      if (!answerKey) return;

      await QuestionCacheService.setCachedQuestionResult(
        examId,
        result.questionNumber,
        result.qualityFlags?.studentAnswer || '',
        answerKey.correct_answer?.trim() || '',
        result
      );
    } catch (error) {
      console.warn('Failed to cache result:', error);
    }
  }

  static async preProcessCommonExamQuestions(
    examId: string,
    commonAnswerPatterns: Array<{
      questionNumber: number;
      questionText: string;
      correctAnswer: string;
      commonStudentAnswers: string[];
      isComplex: boolean;
    }>
  ): Promise<{ processed: number; cached: number; errors: number }> {
    console.log(`🔄 Pre-processing ${commonAnswerPatterns.length} common OpenAI questions for exam: ${examId}`);
    
    let processed = 0;
    let cached = 0;
    let errors = 0;

    for (const pattern of commonAnswerPatterns) {
      if (!pattern.isComplex) continue;

      for (const studentAnswer of pattern.commonStudentAnswers) {
        try {
          const existingCache = await QuestionCacheService.getCachedQuestionResult(
            examId,
            pattern.questionNumber,
            studentAnswer,
            pattern.correctAnswer
          );

          if (existingCache) {
            cached++;
            continue;
          }

          const mockQuestion = {
            questionNumber: pattern.questionNumber,
            detectedAnswer: { selectedOption: studentAnswer }
          };

          const mockAnswerKey = {
            question_number: pattern.questionNumber,
            question_text: pattern.questionText,
            correct_answer: pattern.correctAnswer,
            points: 1,
            exam_id: examId
          };

          const result = await this.gradeComplexQuestionWithOpenAI(
            mockQuestion,
            mockAnswerKey,
            [],
            'Pre-processing Student'
          );

          await QuestionCacheService.setCachedQuestionResult(
            examId,
            pattern.questionNumber,
            studentAnswer,
            pattern.correctAnswer,
            result
          );

          processed++;
          await new Promise(resolve => setTimeout(resolve, 100));

        } catch (error) {
          console.error(`Pre-processing failed for Q${pattern.questionNumber}:`, error);
          errors++;
        }
      }
    }

    console.log(`✅ OpenAI pre-processing complete: ${processed} processed, ${cached} already cached, ${errors} errors`);
    return { processed, cached, errors };
  }

  static analyzeBatchComplexity(questions: any[], answerKeys: any[]): ComplexQuestionBatch {
    const complexityScores = questions.map(q => {
      const answerKey = answerKeys.find(ak => ak.question_number === q.questionNumber);
      return this.calculateQuestionComplexity(q, answerKey);
    });

    const averageComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
    const totalEstimatedCost = complexityScores.reduce((sum, score) => sum + (score * 0.01), 0);
    
    const priorityQuestions = questions
      .map((q, index) => ({ questionNumber: q.questionNumber, complexity: complexityScores[index] }))
      .filter(q => q.complexity > 0.7)
      .map(q => q.questionNumber);

    return {
      questions,
      totalEstimatedCost,
      averageComplexity,
      priorityQuestions
    };
  }

  private static calculateQuestionComplexity(question: any, answerKey: any): number {
    let complexity = 0.5;

    const questionText = answerKey?.question_text || '';
    if (questionText.length > 200) complexity += 0.1;
    if (questionText.includes('explain') || questionText.includes('analyze')) complexity += 0.2;
    if (questionText.includes('compare') || questionText.includes('evaluate')) complexity += 0.2;

    const correctAnswer = answerKey?.correct_answer || '';
    if (correctAnswer.length > 50) complexity += 0.1;
    if (correctAnswer.includes('because') || correctAnswer.includes('therefore')) complexity += 0.1;

    return Math.min(complexity, 1.0);
  }

  static generateCostReport(results: OpenAIGradingResult[]): {
    totalCost: number;
    totalTokens: number;
    averageCostPerQuestion: number;
    costBreakdown: { [method: string]: number };
    batchEfficiencyGains: {
      totalQuestions: number;
      batchedQuestions: number;
      estimatedSingleCallCost: number;
      actualBatchCost: number;
      costSavingsPercent: number;
    };
  } {
    let totalCost = 0;
    let totalTokens = 0;
    let batchedQuestions = 0;
    const costBreakdown: { [method: string]: number } = {};

    for (const result of results) {
      const cost = result.openAIUsage?.estimatedCost || 0;
      const tokens = result.openAIUsage?.totalTokens || 0;
      
      totalCost += cost;
      totalTokens += tokens;
      
      if (result.qualityFlags?.batchProcessed) {
        batchedQuestions++;
      }
      
      const method = result.gradingMethod;
      costBreakdown[method] = (costBreakdown[method] || 0) + cost;
    }

    const estimatedSingleCallCost = results.length * 0.01;
    const costSavingsPercent = totalCost > 0 ? ((estimatedSingleCallCost - totalCost) / estimatedSingleCallCost) * 100 : 0;

    return {
      totalCost,
      totalTokens,
      averageCostPerQuestion: results.length > 0 ? totalCost / results.length : 0,
      costBreakdown,
      batchEfficiencyGains: {
        totalQuestions: results.length,
        batchedQuestions,
        estimatedSingleCallCost,
        actualBatchCost: totalCost,
        costSavingsPercent: Math.max(0, costSavingsPercent)
      }
    };
  }

  static generateEnhancedCostReport(results: OpenAIGradingResult[]): {
    totalCost: number;
    totalTokens: number;
    averageCostPerQuestion: number;
    costBreakdown: { [method: string]: number };
    enhancedBatchEfficiency: {
      totalQuestions: number;
      localAIQuestions: number;
      batchedQuestions: number;
      estimatedSingleCallCost: number;
      actualBatchCost: number;
      costSavingsPercent: number;
      timeEfficiencyGain: number;
    };
  } {
    let totalCost = 0;
    let totalTokens = 0;
    let localAIQuestions = 0;
    let batchedQuestions = 0;
    const costBreakdown: { [method: string]: number } = {};

    for (const result of results) {
      const cost = result.openAIUsage?.estimatedCost || 0;
      const tokens = result.openAIUsage?.totalTokens || 0;
      
      totalCost += cost;
      totalTokens += tokens;
      
      if (result.gradingMethod === 'local_ai') {
        localAIQuestions++;
      } else if (result.qualityFlags?.batchProcessed) {
        batchedQuestions++;
      }
      
      const method = result.gradingMethod;
      costBreakdown[method] = (costBreakdown[method] || 0) + cost;
    }

    const estimatedSingleCallCost = results.length * 0.01;
    const costSavingsPercent = totalCost > 0 ? ((estimatedSingleCallCost - totalCost) / estimatedSingleCallCost) * 100 : 0;
    const timeEfficiencyGain = localAIQuestions * 0.8 + batchedQuestions * 0.6;

    return {
      totalCost,
      totalTokens,
      averageCostPerQuestion: results.length > 0 ? totalCost / results.length : 0,
      costBreakdown,
      enhancedBatchEfficiency: {
        totalQuestions: results.length,
        localAIQuestions,
        batchedQuestions,
        estimatedSingleCallCost,
        actualBatchCost: totalCost,
        costSavingsPercent: Math.max(0, costSavingsPercent),
        timeEfficiencyGain
      }
    };
  }

  static generateConservativeCostReport(results: OpenAIGradingResult[]): {
    totalCost: number;
    totalTokens: number;
    averageCostPerQuestion: number;
    costBreakdown: { [method: string]: number };
    conservativeEfficiency: {
      totalQuestions: number;
      conservativeBatchedQuestions: number;
      qualityScore: number;
      accuracyImprovement: number;
      processingTimeIncrease: number;
    };
  } {
    let totalCost = 0;
    let totalTokens = 0;
    let conservativeBatchedQuestions = 0;
    let qualityScoreSum = 0;
    const costBreakdown: { [method: string]: number } = {};

    for (const result of results) {
      const cost = result.openAIUsage?.estimatedCost || 0;
      const tokens = result.openAIUsage?.totalTokens || 0;
      
      totalCost += cost;
      totalTokens += tokens;
      qualityScoreSum += result.confidence;
      
      if (result.qualityFlags?.conservativeProcessing) {
        conservativeBatchedQuestions++;
      }
      
      const method = result.gradingMethod;
      costBreakdown[method] = (costBreakdown[method] || 0) + cost;
    }

    const avgQualityScore = results.length > 0 ? qualityScoreSum / results.length : 0;
    const estimatedAccuracyImprovement = (avgQualityScore - 0.75) * 100;
    const estimatedTimeIncrease = 40;

    return {
      totalCost,
      totalTokens,
      averageCostPerQuestion: results.length > 0 ? totalCost / results.length : 0,
      costBreakdown,
      conservativeEfficiency: {
        totalQuestions: results.length,
        conservativeBatchedQuestions,
        qualityScore: avgQualityScore,
        accuracyImprovement: Math.max(0, estimatedAccuracyImprovement),
        processingTimeIncrease: estimatedTimeIncrease
      }
    };
  }
}
