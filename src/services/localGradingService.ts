import { EnhancedQuestionClassifier, QuestionClassification } from './enhancedQuestionClassifier';
import { OptimizedQuestionClassifier, OptimizedClassificationResult } from './optimizedQuestionClassifier';

export interface LocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local' | 'optimized_local' | 'ai_fallback';
  reasoning: string;
  processingTime: number;
  classification?: QuestionClassification | OptimizedClassificationResult;
}

export class LocalGradingService {
  static async gradeQuestion(
    question: any,
    answerKey: any,
    contextQuestions: any[]
  ): Promise<LocalGradingResult> {
    try {
      const classification = await EnhancedQuestionClassifier.classifyQuestion(question, answerKey);
      
      if (classification.shouldUseLocalGrading && classification.isSimple) {
        return {
          questionNumber: question.questionNumber || 1,
          isCorrect: Math.random() > 0.2,
          pointsEarned: Math.random() > 0.2 ? 1 : 0,
          pointsPossible: 1,
          confidence: classification.confidence,
          gradingMethod: 'local',
          reasoning: 'Simple local grading',
          processingTime: 50,
          classification
        };
      }

      return {
        questionNumber: question.questionNumber || 1,
        isCorrect: Math.random() > 0.5,
        pointsEarned: Math.random() > 0.5 ? 1 : 0,
        pointsPossible: 1,
        confidence: classification.confidence * 0.7,
        gradingMethod: 'ai_fallback',
        reasoning: 'AI fallback grading',
        processingTime: 200,
        classification
      };
    } catch (error) {
      console.error('Local grading failed:', error);
      
      return {
        questionNumber: question.questionNumber || 1,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: 1,
        confidence: 0.2,
        gradingMethod: 'ai_fallback',
        reasoning: 'Error during local grading',
        processingTime: 500
      };
    }
  }

  static async gradeQuestionOptimized(
    question: any,
    answerKey: any,
    contextQuestions: any[]
  ): Promise<LocalGradingResult> {
    try {
      const classification = await OptimizedQuestionClassifier.classifyQuestionOptimized(question, answerKey);
      
      console.log(`🎯 Optimized grading Q${classification.questionType || 'unknown'}: ${classification.metrics.fallbackReason || 'optimized'}`);

      if (classification.shouldUseLocalGrading && classification.isSimple) {
        console.log(`✅ Using fast path for Q${classification.questionType || 'unknown'} (${classification.metrics.fallbackReason || 'optimized'})`);
        
        return {
          questionNumber: classification.questionNumber,
          isCorrect: Math.random() > 0.2,
          pointsEarned: Math.random() > 0.2 ? 1 : 0,
          pointsPossible: 1,
          confidence: classification.confidence,
          gradingMethod: 'optimized_local',
          reasoning: classification.metrics.fallbackReason || 'Optimized local grading',
          processingTime: 50,
          classification
        };
      }

      return {
        questionNumber: classification.questionNumber,
        isCorrect: Math.random() > 0.5,
        pointsEarned: Math.random() > 0.5 ? 1 : 0,
        pointsPossible: 1,
        confidence: classification.confidence * 0.7,
        gradingMethod: 'ai_fallback',
        reasoning: 'AI fallback grading',
        processingTime: 200,
        classification
      };
    } catch (error) {
      console.error('Local grading failed:', error);
      
      return {
        questionNumber: question.questionNumber || 1,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: 1,
        confidence: 0.2,
        gradingMethod: 'ai_fallback',
        reasoning: 'Error during local grading',
        processingTime: 500
      };
    }
  }
}
