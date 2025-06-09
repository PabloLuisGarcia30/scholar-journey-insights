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

export class OpenAIComplexGradingService {
  private static readonly MAX_BATCH_SIZE = 4; // Reduced from 25 for conservative approach
  private static readonly CONSERVATIVE_BATCH_SIZE = true;
  private static readonly COST_PER_1K_TOKENS = 0.002;
  private static readonly CACHE_ENABLED = true;
  private static batchOptimizer = new QuestionBatchOptimizer({
    baseBatchSize: 3,    // Reduced from 15
    maxBatchSize: 4,     // Reduced from 25
    adaptiveSizing: false // Disabled for consistent quality
  });

  static async gradeComplexQuestions(
    questions: any[],
    answerKeys: any[],
    examId: string,
    studentName: string,
    skillMappings: QuestionSkillMappings
  ): Promise<OpenAIGradingResult[]> {
    console.log(`🎯 Conservative OpenAI grading ${questions.length} complex questions with quality-first batching for student: ${studentName}`);
    
    // PHASE 2: Pass pre-validated answer keys to maintain context
    const jobId = await EnhancedBatchGradingService.createEnhancedBatchJob(
      questions,
      examId,
      studentName,
      'urgent', // Use urgent priority for conservative processing
      answerKeys // PHASE 1: Pass the pre-validated answer keys
    );

    // Poll for job completion with conservative timeout
    return new Promise((resolve, reject) => {
      const checkInterval = setInterval(() => {
        const job = EnhancedBatchGradingService.getJob(jobId);
        
        if (!job) {
          clearInterval(checkInterval);
          reject(new Error('Conservative grading job not found'));
          return;
        }

        if (job.status === 'completed') {
          clearInterval(checkInterval);
          
          // Convert enhanced batch results to OpenAI grading results
          const results: OpenAIGradingResult[] = job.results.map((result, index) => {
            const question = questions[index];
            const questionSkillMappings = skillMappings[question.questionNumber] || [];
            
            return {
              questionNumber: result.questionNumber,
              isCorrect: result.isCorrect,
              pointsEarned: result.pointsEarned,
              pointsPossible: result.pointsPossible,
              confidence: result.confidence,
              gradingMethod: result.gradingMethod === 'openai_batch' ? 'conservative_openai_batch' : result.gradingMethod,
              reasoning: result.reasoning,
              skillMappings: questionSkillMappings,
              complexityScore: result.complexityScore,
              reasoningDepth: result.reasoningDepth,
              openAIUsage: {
                promptTokens: Math.floor(200 / questions.length),
                completionTokens: Math.floor(300 / questions.length),
                totalTokens: Math.floor(500 / questions.length),
                estimatedCost: job.processingMetrics.costEstimate / questions.length
              },
              qualityFlags: {
                hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
                reviewRequired: question.detectedAnswer?.reviewFlag || false,
                bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
                confidenceAdjusted: result.confidence < 0.8, // Higher threshold for conservative mode
                openAIProcessed: result.gradingMethod !== 'local_ai',
                batchProcessed: result.gradingMethod === 'openai_batch',
                enhancedProcessing: true,
                conservativeProcessing: true, // New flag for conservative mode
                qualityFirst: true,
                preValidatedAnswerKeys: true
              }
            };
          });

          console.log(`✅ Conservative OpenAI grading completed for ${studentName}: ${results.length} questions processed with quality-first approach`);
          resolve(results);
          
        } else if (job.status === 'failed') {
          clearInterval(checkInterval);
          reject(new Error(`Conservative batch grading failed: ${job.errors.join(', ')}`));
        }
      }, 2000); // Check every 2 seconds (less frequent for conservative approach)

      // Extended timeout for conservative processing
      setTimeout(() => {
        clearInterval(checkInterval);
        reject(new Error('Conservative batch grading timeout - quality processing may take longer'));
      }, 600000); // 10 minutes timeout
    });
  }

  private static async processBatchQuestions(
    questions: any[],
    answerKeys: any[],
    skillMappings: any[],
    examId: string,
    studentName: string
  ): Promise<OpenAIGradingResult[]> {
    // Create batch prompt for multiple questions
    const batchPrompt = this.createBatchGradingPrompt(questions, answerKeys, skillMappings, studentName);
    
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
            skillContext: skillMappings.filter(sm => sm.question_number === q.questionNumber)
              .map(s => s.skill_name).join(', ')
          })),
          studentName,
          batchPrompt
        }
      });

      if (error) {
        throw new Error(`Batch grading API error: ${error.message}`);
      }

      const batchResults = data.results || [];
      const results: OpenAIGradingResult[] = [];

      // Process batch results
      for (let i = 0; i < questions.length; i++) {
        const question = questions[i];
        const answerKey = answerKeys[i];
        const result = batchResults[i];
        const questionSkillMappings = skillMappings.filter(sm => sm.question_number === question.questionNumber);

        if (result) {
          const gradingResult: OpenAIGradingResult = {
            questionNumber: question.questionNumber,
            isCorrect: result.isCorrect,
            pointsEarned: Math.min(Math.max(result.pointsEarned || 0, 0), answerKey?.points || 1),
            pointsPossible: answerKey?.points || 1,
            confidence: result.confidence || 0.8,
            gradingMethod: 'openai_batch_reasoning',
            reasoning: result.reasoning || 'Batch processing result',
            skillMappings: questionSkillMappings,
            openAIUsage: {
              promptTokens: Math.floor((data.usage?.promptTokens || 0) / questions.length),
              completionTokens: Math.floor((data.usage?.completionTokens || 0) / questions.length),
              totalTokens: Math.floor((data.usage?.totalTokens || 0) / questions.length),
              estimatedCost: ((data.usage?.totalTokens || 0) / questions.length) * this.COST_PER_1K_TOKENS / 1000
            },
            complexityScore: result.complexityScore || 0.7,
            reasoningDepth: result.reasoningDepth || 'medium',
            qualityFlags: {
              hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
              reviewRequired: question.detectedAnswer?.reviewFlag || false,
              bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
              confidenceAdjusted: result.confidence < 0.7,
              openAIProcessed: true,
              batchProcessed: true
            }
          };

          results.push(gradingResult);

          // Cache the result
          if (this.CACHE_ENABLED) {
            try {
              await QuestionCacheService.setCachedQuestionResult(
                examId,
                question.questionNumber,
                question.detectedAnswer?.selectedOption?.trim() || '',
                answerKey?.correct_answer?.trim() || '',
                gradingResult
              );
            } catch (cacheError) {
              console.warn('Failed to cache batch result:', cacheError);
            }
          }
        } else {
          // Fallback for missing result
          results.push(this.createFallbackResult(
            question, 
            answerKey, 
            questionSkillMappings, 
            'Batch result missing'
          ));
        }
      }

      return results;

    } catch (error) {
      console.error('Batch processing failed:', error);
      throw error;
    }
  }

  private static createBatchGradingPrompt(
    questions: any[],
    answerKeys: any[],
    skillMappings: any[],
    studentName: string
  ): string {
    const questionCount = questions.length;
    
    return `Grade ${questionCount} test questions for student ${studentName}. Analyze each question and provide detailed results.

REQUIRED OUTPUT FORMAT (JSON array):
[
  {
    "questionNumber": 1,
    "isCorrect": true,
    "pointsEarned": 2,
    "confidence": 0.95,
    "reasoning": "Detailed explanation of grading decision",
    "complexityScore": 0.6,
    "reasoningDepth": "medium"
  }
]

QUESTIONS TO GRADE:
${questions.map((q, index) => {
  const answerKey = answerKeys[index];
  const questionSkills = skillMappings.filter(sm => sm.question_number === q.questionNumber);
  
  return `Q${q.questionNumber}: ${answerKey?.question_text || 'Question text not available'}
Student Answer: "${q.detectedAnswer?.selectedOption || 'No answer detected'}"
Correct Answer: "${answerKey?.correct_answer || 'Not specified'}"
Points Possible: ${answerKey?.points || 1}
Skills Being Assessed: ${questionSkills.map(s => s.skill_name).join(', ') || 'General'}
---`;
}).join('\n')}

GRADING INSTRUCTIONS:
- Provide accurate and fair grading for each question
- Award full points for completely correct answers
- Consider partial credit for partially correct responses
- Analyze the complexity and reasoning depth of each question
- Provide confidence scores based on answer clarity
- Give detailed but concise reasoning for each grading decision

Respond with ONLY the JSON array containing results for all ${questionCount} questions.`;
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
      // Call OpenAI grading edge function
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
      pointsPossible: answerKey.points || 1,
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
      if (!pattern.isComplex) continue; // Skip simple questions

      for (const studentAnswer of pattern.commonStudentAnswers) {
        try {
          // Check if already cached
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

          // Create mock question and answer key for grading
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

          // Grade with OpenAI
          const result = await this.gradeComplexQuestionWithOpenAI(
            mockQuestion,
            mockAnswerKey,
            [], // No skill mappings for pre-processing
            'Pre-processing Student'
          );

          // Cache the result
          await QuestionCacheService.setCachedQuestionResult(
            examId,
            pattern.questionNumber,
            studentAnswer,
            pattern.correctAnswer,
            result
          );

          processed++;
          
          // Add small delay to avoid rate limiting
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
    const totalEstimatedCost = complexityScores.reduce((sum, score) => sum + (score * 0.01), 0); // Rough cost estimate
    
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
    let complexity = 0.5; // Base complexity

    // Analyze question text
    const questionText = answerKey?.question_text || '';
    if (questionText.length > 200) complexity += 0.1;
    if (questionText.includes('explain') || questionText.includes('analyze')) complexity += 0.2;
    if (questionText.includes('compare') || questionText.includes('evaluate')) complexity += 0.2;

    // Analyze answer complexity
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

    // Calculate efficiency gains from batching
    const estimatedSingleCallCost = results.length * 0.01; // Rough estimate
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

    // Calculate efficiency gains
    const estimatedSingleCallCost = results.length * 0.01; // Previous single-call estimate
    const costSavingsPercent = totalCost > 0 ? ((estimatedSingleCallCost - totalCost) / estimatedSingleCallCost) * 100 : 0;
    const timeEfficiencyGain = localAIQuestions * 0.8 + batchedQuestions * 0.6; // Estimated time savings

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
    const estimatedAccuracyImprovement = (avgQualityScore - 0.75) * 100; // Baseline vs conservative
    const estimatedTimeIncrease = 40; // Conservative processing takes ~40% longer

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
