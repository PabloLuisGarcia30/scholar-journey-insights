
import { DistilBertLocalGradingService } from './distilBertLocalGrading';
import { QuestionClassification, EnhancedQuestionClassifier } from './enhancedQuestionClassifier';
import { LocalGradingResult, LocalGradingService } from './localGradingService';
import { OptimizedClassificationResult, OptimizedQuestionClassifier } from './optimizedQuestionClassifier';
import { PerformanceMonitoringService } from './performanceMonitoringService';
import { OpenAIComplexGradingService, OpenAIGradingResult } from './openAIComplexGradingService';

export interface LocalSkillScore {
  skill_name: string;
  skill_type: string;
  points_earned: number;
  points_possible: number;
  score: number;
  questions_attempted: number;
  questions_correct: number;
}

export interface SkillMapping {
  skill_name: string;
  skill_type: string;
  skill_weight: number;
}

export interface EnhancedLocalGradingResult extends LocalGradingResult {
  classification?: QuestionClassification | OptimizedClassificationResult;
  reasoning: string;
  skillMappings?: SkillMapping[];
}

export class EnhancedLocalGradingService extends LocalGradingService {
  static async gradeQuestionWithDistilBert(
    question: any,
    answerKey: any,
    contextQuestions: any[]
  ): Promise<EnhancedLocalGradingResult> {
    const startTime = Date.now();
    let classification: QuestionClassification | null = null;
    let distilBertResult: any = null;

    try {
      // 1. Classify question (enhanced)
      classification = await EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
      console.log(`✅ Enhanced classification: ${classification.questionType} (confidence ${classification.confidence.toFixed(2)})`);

      // 2. Grade with DistilBERT (if applicable)
      if (classification.shouldUseLocalGrading) {
        console.log(`🤖 Attempting DistilBERT local grading for Q${question.questionNumber}`);
        
        const distilBertService = DistilBertLocalGradingService.getInstance();
        await distilBertService.initialize();
        
        distilBertResult = await distilBertService.gradeAnswer(
          question.detectedAnswer?.selectedOption || '',
          answerKey.correct_answer,
          classification
        );

        if (distilBertResult) {
          console.log(`✅ DistilBERT grading result: ${distilBertResult.isCorrect ? 'Correct' : 'Incorrect'} (confidence ${distilBertResult.confidence.toFixed(2)})`);
          
          return {
            questionNumber: question.questionNumber || 1,
            isCorrect: distilBertResult.isCorrect,
            pointsEarned: distilBertResult.isCorrect ? answerKey.points || 1 : 0,
            pointsPossible: answerKey.points || 1,
            confidence: distilBertResult.confidence,
            gradingMethod: 'local',
            reasoning: distilBertResult.reasoning,
            processingTime: Date.now() - startTime,
            classification
          };
        } else {
          console.warn('⚠️ DistilBERT grading failed, falling back to standard grading');
        }
      }

      // 3. Fallback to standard local grading
      const localResult = await super.gradeQuestion(question, answerKey, contextQuestions);
      
      return {
        ...localResult,
        classification: classification,
        reasoning: localResult.reasoning || 'Standard local grading'
      };

    } catch (error) {
      console.error('❌ Enhanced local grading failed:', error);
      
      return {
        questionNumber: question.questionNumber || 1,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: 0.1,
        gradingMethod: 'ai_fallback',
        reasoning: `Grading failed: ${error.message}`,
        processingTime: Date.now() - startTime,
        classification: classification || {
          questionType: 'short_answer',
          confidence: 0.2,
          complexity: 'medium',
          estimatedGradingTime: 60,
          requiresHumanReview: false,
          shouldUseLocalGrading: false,
          isSimple: false,
          fallbackReason: error.message
        }
      };
    } finally {
      const duration = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric(
        'enhanced_local_grading',
        duration,
        distilBertResult?.isCorrect || false,
        {
          questionType: classification?.questionType,
          confidence: classification?.confidence,
          usedDistilBert: !!distilBertResult,
          distilBertConfidence: distilBertResult?.confidence,
          questionNumber: question.questionNumber
        }
      );
    }
  }

  static async gradeQuestionOptimized(
    question: any,
    answerKey: any,
    contextQuestions: any[]
  ): Promise<EnhancedLocalGradingResult> {
    const startTime = Date.now();
    let optimizedClassification: OptimizedClassificationResult | null = null;
    let distilBertResult: any = null;

    try {
      // 1. Classify question (optimized)
      optimizedClassification = await OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
      console.log(`✅ Optimized classification: ${optimizedClassification.questionType} (confidence ${optimizedClassification.confidence.toFixed(2)})`);

      // 2. Grade with DistilBERT (if applicable)
      if (optimizedClassification.shouldUseLocalGrading) {
        console.log(`🤖 Attempting DistilBERT local grading for Q${question.questionNumber}`);
        
        const distilBertService = DistilBertLocalGradingService.getInstance();
        await distilBertService.initialize();
        
        distilBertResult = await distilBertService.gradeAnswer(
          question.detectedAnswer?.selectedOption || '',
          answerKey.correct_answer,
          optimizedClassification
        );

        if (distilBertResult) {
          console.log(`✅ DistilBERT grading result: ${distilBertResult.isCorrect ? 'Correct' : 'Incorrect'} (confidence ${distilBertResult.confidence.toFixed(2)})`);
          
          return {
            questionNumber: question.questionNumber || 1,
            isCorrect: distilBertResult.isCorrect,
            pointsEarned: distilBertResult.isCorrect ? answerKey.points || 1 : 0,
            pointsPossible: answerKey.points || 1,
            confidence: distilBertResult.confidence,
            gradingMethod: 'optimized_local',
            reasoning: distilBertResult.reasoning,
            processingTime: Date.now() - startTime,
            classification: optimizedClassification
          };
        } else {
          console.warn('⚠️ DistilBERT grading failed, falling back to standard grading');
        }
      }

      // 3. Fallback to standard local grading
      const localResult = await super.gradeQuestionOptimized(question, answerKey, contextQuestions);
      
      return {
        ...localResult,
        classification: optimizedClassification,
        reasoning: localResult.reasoning || 'Standard local grading'
      };

    } catch (error) {
      console.error('❌ Optimized local grading failed:', error);
      
      return {
        questionNumber: question.questionNumber || 1,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: 0.1,
        gradingMethod: 'ai_fallback',
        reasoning: `Grading failed: ${error.message}`,
        processingTime: Date.now() - startTime,
        classification: optimizedClassification || {
          questionType: 'short_answer',
          confidence: 0.2,
          complexity: 'medium',
          estimatedGradingTime: 60,
          requiresHumanReview: false,
          shouldUseLocalGrading: false,
          isSimple: false,
          questionNumber: question.questionNumber || 1,
          metrics: {
            classificationTime: Date.now() - startTime,
            usedFastPath: false,
            confidence: 0.2,
            fallbackReason: error.message
          }
        }
      };
    } finally {
      const duration = Date.now() - startTime;
      PerformanceMonitoringService.recordMetric(
        'optimized_local_grading',
        duration,
        distilBertResult?.isCorrect || false,
        {
          questionType: optimizedClassification?.questionType,
          confidence: optimizedClassification?.confidence,
          usedDistilBert: !!distilBertResult,
          distilBertConfidence: distilBertResult?.confidence,
          questionNumber: question.questionNumber
        }
      );
    }
  }

  static async gradeComplexQuestionsWithOpenAI(
    questions: any[],
    examId: string,
    studentName: string,
    answerKeys: any[]
  ): Promise<EnhancedLocalGradingResult[]> {
    try {
      console.log(`🤖 Grading ${questions.length} complex questions with OpenAI for ${studentName}`);
      
      const openAIResults = await OpenAIComplexGradingService.gradeComplexQuestions(questions);
      
      // Convert OpenAI results to Enhanced results format
      const enhancedResults: EnhancedLocalGradingResult[] = openAIResults.map((result, index) => ({
        questionNumber: result.questionNumber,
        isCorrect: result.isCorrect,
        pointsEarned: result.pointsEarned,
        pointsPossible: result.pointsPossible,
        confidence: result.confidence,
        gradingMethod: 'ai_fallback',
        reasoning: result.feedback || `OpenAI grading result for question ${result.questionNumber}`,
        processingTime: 2000, // Estimate
        classification: {
          questionType: 'essay',
          confidence: result.confidence,
          complexity: 'complex' as const,
          estimatedGradingTime: 300,
          requiresHumanReview: true,
          shouldUseLocalGrading: false,
          isSimple: false
        }
      }));

      return this.mergeGradingResults(enhancedResults);
    } catch (error) {
      console.error('OpenAI complex grading failed:', error);
      throw error;
    }
  }

  private static mergeGradingResults(results: EnhancedLocalGradingResult[]): EnhancedLocalGradingResult[] {
    // Implement any merging or post-processing logic here if needed
    return results;
  }
}
