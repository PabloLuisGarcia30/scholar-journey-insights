
import { supabase } from "@/integrations/supabase/client";
import { QuestionCacheService, QuestionCacheResult } from "./questionCacheService";
import { SkillMapping, QuestionSkillMappings, EnhancedLocalGradingResult } from "./enhancedLocalGradingService";

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
  private static readonly MAX_BATCH_SIZE = 10;
  private static readonly COST_PER_1K_TOKENS = 0.002; // Rough estimate for GPT-4
  private static readonly CACHE_ENABLED = true;

  static async gradeComplexQuestions(
    questions: any[],
    answerKeys: any[],
    examId: string,
    studentName: string,
    skillMappings: QuestionSkillMappings
  ): Promise<OpenAIGradingResult[]> {
    console.log(`🤖 OpenAI grading ${questions.length} complex questions with caching enabled`);
    
    const results: OpenAIGradingResult[] = [];
    let cacheHits = 0;
    let openAIProcessed = 0;

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      if (!answerKey) {
        console.warn(`No answer key found for question ${question.questionNumber}`);
        continue;
      }

      const studentAnswer = question.detectedAnswer?.selectedOption?.trim() || '';
      const correctAnswer = answerKey.correct_answer?.trim() || '';
      const questionSkillMappings = skillMappings[question.questionNumber] || [];

      // STEP 1: Check question-level cache first
      let result: OpenAIGradingResult | null = null;
      
      if (this.CACHE_ENABLED) {
        try {
          const cachedResult = await QuestionCacheService.getCachedQuestionResult(
            examId,
            question.questionNumber,
            studentAnswer,
            correctAnswer
          ) as QuestionCacheResult | null;

          if (cachedResult) {
            result = {
              ...cachedResult,
              skillMappings: questionSkillMappings, // Update with current skill mappings
              qualityFlags: {
                ...cachedResult.qualityFlags,
                cacheHit: true,
                openAIProcessed: false
              }
            } as OpenAIGradingResult;
            
            cacheHits++;
            console.log(`⚡ Cache hit for OpenAI question ${question.questionNumber}: ${cachedResult.originalGradingMethod}`);
          }
        } catch (error) {
          console.warn('Cache lookup failed for OpenAI question, proceeding with normal grading:', error);
        }
      }

      // STEP 2: Process with OpenAI if not cached
      if (!result) {
        result = await this.gradeComplexQuestionWithOpenAI(
          question,
          answerKey,
          questionSkillMappings,
          studentName
        );
        
        openAIProcessed++;

        // STEP 3: Cache the result for future use
        if (this.CACHE_ENABLED) {
          try {
            await QuestionCacheService.setCachedQuestionResult(
              examId,
              question.questionNumber,
              studentAnswer,
              correctAnswer,
              result
            );
          } catch (cacheError) {
            console.warn('Failed to cache OpenAI question result:', cacheError);
          }
        }
      }

      results.push(result);
    }

    const cacheHitRate = questions.length > 0 ? (cacheHits / questions.length) * 100 : 0;
    console.log(`✅ OpenAI grading complete: ${cacheHits} cached + ${openAIProcessed} processed (${cacheHitRate.toFixed(1)}% cache hit rate)`);

    return results;
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
  } {
    let totalCost = 0;
    let totalTokens = 0;
    const costBreakdown: { [method: string]: number } = {};

    for (const result of results) {
      const cost = result.openAIUsage?.estimatedCost || 0;
      const tokens = result.openAIUsage?.totalTokens || 0;
      
      totalCost += cost;
      totalTokens += tokens;
      
      const method = result.gradingMethod;
      costBreakdown[method] = (costBreakdown[method] || 0) + cost;
    }

    return {
      totalCost,
      totalTokens,
      averageCostPerQuestion: results.length > 0 ? totalCost / results.length : 0,
      costBreakdown
    };
  }
}
