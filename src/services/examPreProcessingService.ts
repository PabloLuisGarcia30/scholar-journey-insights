import { QuestionCacheService } from "./questionCacheService";
import { OpenAIComplexGradingService } from "./openAIComplexGradingService";
import { EnhancedLocalGradingService } from "./enhancedLocalGradingService";
import { supabase } from "@/integrations/supabase/client";

export interface CommonAnswerPattern {
  questionNumber: number;
  questionText: string;
  correctAnswer: string;
  commonStudentAnswers: string[];
  questionType: 'simple' | 'complex';
  frequency: number;
  confidenceLevel: number;
}

export interface ExamPreProcessingConfig {
  examId: string;
  examTitle: string;
  expectedStudentCount: number;
  priorityQuestions: number[];
  processingStrategy: 'aggressive' | 'conservative' | 'adaptive';
  costLimit?: number;
}

export interface PreProcessingReport {
  examId: string;
  totalQuestions: number;
  processedQuestions: number;
  cacheHitRate: number;
  estimatedCostSavings: number;
  processingTime: number;
  errors: string[];
  recommendations: string[];
}

export class ExamPreProcessingService {
  private static readonly DEFAULT_COMMON_ANSWERS = {
    multipleChoice: ['A', 'B', 'C', 'D', 'E'],
    trueFalse: ['True', 'False', 'T', 'F'],
    numeric: ['0', '1', '2', '3', '4', '5', '10', '100'],
    common: ['None', 'All of the above', 'Not given', 'Cannot be determined']
  };

  static async preProcessExam(config: ExamPreProcessingConfig): Promise<PreProcessingReport> {
    const startTime = Date.now();
    console.log(`🚀 Starting pre-processing for exam: ${config.examId} (${config.examTitle})`);

    const report: PreProcessingReport = {
      examId: config.examId,
      totalQuestions: 0,
      processedQuestions: 0,
      cacheHitRate: 0,
      estimatedCostSavings: 0,
      processingTime: 0,
      errors: [],
      recommendations: []
    };

    try {
      // Step 1: Get exam questions and answer keys
      const { data: answerKeys, error } = await supabase
        .from('answer_keys')
        .select('*')
        .eq('exam_id', config.examId)
        .order('question_number');

      if (error || !answerKeys) {
        report.errors.push(`Failed to fetch answer keys: ${error?.message}`);
        return report;
      }

      report.totalQuestions = answerKeys.length;

      // Step 2: Generate common answer patterns
      const commonPatterns = this.generateCommonAnswerPatterns(answerKeys, config);

      // Step 3: Pre-process with caching strategy
      const processingResults = await this.executePreProcessing(commonPatterns, config);

      // Step 4: Generate final report
      report.processedQuestions = processingResults.totalProcessed;
      report.cacheHitRate = processingResults.cacheHitRate;
      report.estimatedCostSavings = processingResults.costSavings;
      report.errors = processingResults.errors;
      report.recommendations = this.generateRecommendations(processingResults, config);

    } catch (error) {
      report.errors.push(`Pre-processing failed: ${error.message}`);
    }

    report.processingTime = Date.now() - startTime;
    console.log(`✅ Pre-processing complete for ${config.examId}: ${report.processedQuestions}/${report.totalQuestions} questions`);

    return report;
  }

  private static generateCommonAnswerPatterns(
    answerKeys: any[],
    config: ExamPreProcessingConfig
  ): CommonAnswerPattern[] {
    const patterns: CommonAnswerPattern[] = [];

    for (const answerKey of answerKeys) {
      const questionType = this.classifyQuestionComplexity(answerKey);
      const commonAnswers = this.getCommonAnswersForQuestion(answerKey, questionType, config);

      patterns.push({
        questionNumber: answerKey.question_number,
        questionText: answerKey.question_text || `Question ${answerKey.question_number}`,
        correctAnswer: answerKey.correct_answer,
        commonStudentAnswers: commonAnswers,
        questionType,
        frequency: this.estimateAnswerFrequency(questionType),
        confidenceLevel: this.calculateConfidenceLevel(answerKey, questionType)
      });
    }

    return patterns;
  }

  private static classifyQuestionComplexity(answerKey: any): 'simple' | 'complex' {
    const questionText = answerKey.question_text?.toLowerCase() || '';
    const answerText = answerKey.correct_answer?.toLowerCase() || '';

    // Complex question indicators
    const complexIndicators = [
      'explain', 'analyze', 'compare', 'evaluate', 'justify', 'describe',
      'discuss', 'interpret', 'synthesize', 'critique', 'assess'
    ];

    const hasComplexIndicators = complexIndicators.some(indicator => 
      questionText.includes(indicator)
    );

    const isLongAnswer = answerText.length > 50;
    const hasMultipleComponents = answerText.includes('and') || answerText.includes('or');

    return (hasComplexIndicators || isLongAnswer || hasMultipleComponents) ? 'complex' : 'simple';
  }

  private static getCommonAnswersForQuestion(
    answerKey: any,
    questionType: 'simple' | 'complex',
    config: ExamPreProcessingConfig
  ): string[] {
    const correctAnswer = answerKey.correct_answer;
    const questionText = answerKey.question_text?.toLowerCase() || '';

    let commonAnswers: string[] = [];

    // Add correct answer
    commonAnswers.push(correctAnswer);

    if (questionType === 'simple') {
      // Multiple choice detection
      if (questionText.includes('a)') || questionText.includes('(a)')) {
        commonAnswers.push(...this.DEFAULT_COMMON_ANSWERS.multipleChoice);
      }
      // True/False detection
      else if (questionText.includes('true') || questionText.includes('false')) {
        commonAnswers.push(...this.DEFAULT_COMMON_ANSWERS.trueFalse);
      }
      // Numeric detection
      else if (/\d/.test(correctAnswer)) {
        commonAnswers.push(...this.DEFAULT_COMMON_ANSWERS.numeric);
      }
      // Add common wrong answers
      else {
        commonAnswers.push(...this.DEFAULT_COMMON_ANSWERS.common);
      }
    } else {
      // Complex questions - generate variations
      commonAnswers.push(
        '', // Empty answer
        'I don\'t know',
        'Not sure',
        this.generateIncorrectComplexAnswer(correctAnswer),
        this.generatePartiallyCorrectAnswer(correctAnswer)
      );
    }

    // Apply processing strategy
    return this.applyProcessingStrategy(commonAnswers, config.processingStrategy);
  }

  private static generateIncorrectComplexAnswer(correctAnswer: string): string {
    // Generate a plausible but incorrect answer
    const words = correctAnswer.split(' ');
    if (words.length > 3) {
      // Swap some words around
      const shuffled = [...words];
      const idx1 = Math.floor(Math.random() * words.length);
      const idx2 = Math.floor(Math.random() * words.length);
      [shuffled[idx1], shuffled[idx2]] = [shuffled[idx2], shuffled[idx1]];
      return shuffled.join(' ');
    }
    return `Incorrect: ${correctAnswer}`;
  }

  private static generatePartiallyCorrectAnswer(correctAnswer: string): string {
    // Generate a partially correct answer
    const sentences = correctAnswer.split('. ');
    if (sentences.length > 1) {
      return sentences[0] + '.'; // Take first part only
    }
    const words = correctAnswer.split(' ');
    if (words.length > 4) {
      return words.slice(0, Math.floor(words.length / 2)).join(' ');
    }
    return `Partial: ${correctAnswer}`;
  }

  private static applyProcessingStrategy(
    answers: string[],
    strategy: 'aggressive' | 'conservative' | 'adaptive'
  ): string[] {
    const unique = [...new Set(answers)].filter(a => a.trim().length > 0);

    switch (strategy) {
      case 'conservative':
        return unique.slice(0, 3); // Limit to 3 most common
      case 'aggressive':
        return unique.slice(0, 8); // Process up to 8 variations
      case 'adaptive':
      default:
        return unique.slice(0, 5); // Balanced approach
    }
  }

  private static estimateAnswerFrequency(questionType: 'simple' | 'complex'): number {
    // Estimate how often these answers will appear in real exams
    return questionType === 'simple' ? 0.8 : 0.6;
  }

  private static calculateConfidenceLevel(answerKey: any, questionType: 'simple' | 'complex'): number {
    let confidence = 0.7; // Base confidence

    if (questionType === 'simple') confidence += 0.2;
    if (answerKey.correct_answer?.length > 0) confidence += 0.1;
    if (answerKey.question_text?.length > 20) confidence += 0.1;

    return Math.min(confidence, 1.0);
  }

  private static async executePreProcessing(
    patterns: CommonAnswerPattern[],
    config: ExamPreProcessingConfig
  ): Promise<{
    totalProcessed: number;
    cacheHitRate: number;
    costSavings: number;
    errors: string[];
  }> {
    let totalProcessed = 0;
    let cacheHits = 0;
    let openAIProcessed = 0;
    let distilBertProcessed = 0;
    const errors: string[] = [];

    // Separate simple and complex questions
    const simplePatterns = patterns.filter(p => p.questionType === 'simple');
    const complexPatterns = patterns.filter(p => p.questionType === 'complex');

    try {
      // Process simple questions with DistilBERT caching
      if (simplePatterns.length > 0) {
        const simpleResults = await this.preProcessSimpleQuestions(config.examId, simplePatterns);
        distilBertProcessed += simpleResults.processed;
        cacheHits += simpleResults.cached;
        if (simpleResults.errors > 0) {
          errors.push(`${simpleResults.errors} DistilBERT processing errors`);
        }
      }

      // Process complex questions with OpenAI caching
      if (complexPatterns.length > 0) {
        const complexResults = await OpenAIComplexGradingService.preProcessCommonExamQuestions(
          config.examId,
          complexPatterns.map(p => ({
            questionNumber: p.questionNumber,
            questionText: p.questionText,
            correctAnswer: p.correctAnswer,
            commonStudentAnswers: p.commonStudentAnswers,
            isComplex: true
          }))
        );
        openAIProcessed += complexResults.processed;
        cacheHits += complexResults.cached;
        if (complexResults.errors > 0) {
          errors.push(`${complexResults.errors} OpenAI processing errors`);
        }
      }

    } catch (error) {
      errors.push(`Processing execution failed: ${error.message}`);
    }

    totalProcessed = distilBertProcessed + openAIProcessed;
    const totalQuestions = patterns.length;
    const cacheHitRate = totalQuestions > 0 ? (cacheHits / totalQuestions) * 100 : 0;
    
    // Estimate cost savings (rough calculation)
    const costSavings = (openAIProcessed * 0.01) + (distilBertProcessed * 0.001);

    return {
      totalProcessed,
      cacheHitRate,
      costSavings,
      errors
    };
  }

  private static async preProcessSimpleQuestions(
    examId: string,
    patterns: CommonAnswerPattern[]
  ): Promise<{ processed: number; cached: number; errors: number }> {
    let processed = 0;
    let cached = 0;
    let errors = 0;

    for (const pattern of patterns) {
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

          // Grade with DistilBERT
          const result = await EnhancedLocalGradingService.gradeQuestionWithDistilBert(
            mockQuestion,
            mockAnswerKey,
            []
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

        } catch (error) {
          console.error(`Simple question pre-processing failed for Q${pattern.questionNumber}:`, error);
          errors++;
        }
      }
    }

    return { processed, cached, errors };
  }

  private static generateRecommendations(
    results: any,
    config: ExamPreProcessingConfig
  ): string[] {
    const recommendations: string[] = [];

    if (results.cacheHitRate < 50) {
      recommendations.push('Consider running pre-processing during off-peak hours to build cache');
    }

    if (results.errors.length > 0) {
      recommendations.push('Review error logs and retry failed pre-processing operations');
    }

    if (config.expectedStudentCount > 100) {
      recommendations.push('High student count detected - pre-processing will provide significant benefits');
    }

    if (results.costSavings > 1.0) {
      recommendations.push(`Estimated savings of $${results.costSavings.toFixed(2)} - pre-processing is highly recommended`);
    }

    if (recommendations.length === 0) {
      recommendations.push('Pre-processing completed successfully - no additional actions needed');
    }

    return recommendations;
  }

  static async getPreProcessingStatus(examId: string): Promise<{
    isPreProcessed: boolean;
    cacheHitRate: number;
    lastPreProcessed: Date | null;
    questionsInCache: number;
  }> {
    try {
      const cacheStats = await QuestionCacheService.getQuestionCacheStats();
      
      // Find cache entries for this exam
      const examCacheEntries = cacheStats.topCachedExams.find(e => e.examId === examId);
      
      return {
        isPreProcessed: !!examCacheEntries,
        cacheHitRate: examCacheEntries?.hitRate || 0,
        lastPreProcessed: null, // Would need additional tracking
        questionsInCache: examCacheEntries?.questionCount || 0
      };
    } catch (error) {
      console.error('Failed to get pre-processing status:', error);
      return {
        isPreProcessed: false,
        cacheHitRate: 0,
        lastPreProcessed: null,
        questionsInCache: 0
      };
    }
  }
}
