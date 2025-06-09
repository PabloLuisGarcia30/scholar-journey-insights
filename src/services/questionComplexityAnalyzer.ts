
import { ConsolidatedGradingService, QuestionClassification } from './consolidatedGradingService';

// Re-export the consolidated types for backwards compatibility
export type { QuestionClassification } from './consolidatedGradingService';

export interface ComplexityAnalysis {
  complexityScore: number;
  recommendedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  factors: {
    ocrConfidence: number;
    bubbleQuality: string;
    hasMultipleMarks: boolean;
    hasReviewFlags: boolean;
    isCrossValidated: boolean;
    questionType: string;
    answerClarity: number;
    selectedAnswer: string;
  };
  reasoning: string[];
  confidenceInDecision: number;
}

export class QuestionComplexityAnalyzer {
  static analyzeQuestion(question: any, answerKey: any): ComplexityAnalysis {
    // Use the consolidated grading service for classification
    const classification = ConsolidatedGradingService.classifyQuestion(
      answerKey?.question_text || `Question ${question.questionNumber}`,
      question.detectedAnswer?.selectedOption || '',
      answerKey?.correct_answer || '',
      question.questionNumber || 0
    );

    // Convert to legacy ComplexityAnalysis format
    const complexityScore = classification.complexity === 'simple' ? 25 : 75;
    const recommendedModel = classification.useLocalGrading ? 'gpt-4o-mini' : 'gpt-4.1-2025-04-14';

    return {
      complexityScore,
      recommendedModel,
      factors: {
        ocrConfidence: question.detectedAnswer?.confidence || 0.8,
        bubbleQuality: question.detectedAnswer?.bubbleQuality || 'good',
        hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
        hasReviewFlags: question.detectedAnswer?.reviewFlag || false,
        isCrossValidated: question.detectedAnswer?.crossValidated || false,
        questionType: classification.complexity,
        answerClarity: classification.confidence * 100,
        selectedAnswer: question.detectedAnswer?.selectedOption || 'no_answer'
      },
      reasoning: [classification.reasoning],
      confidenceInDecision: classification.confidence
    };
  }

  static batchAnalyzeQuestions(questions: any[], answerKeys: any[]): ComplexityAnalysis[] {
    console.log(`🎯 Batch analyzing ${questions.length} questions with consolidated classifier`);
    
    return questions.map(question => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      return this.analyzeQuestion(question, answerKey);
    });
  }

  static getModelDistribution(analyses: ComplexityAnalysis[]): { 
    simple: number, 
    complex: number, 
    simplePercentage: number,
    complexPercentage: number 
  } {
    const simple = analyses.filter(a => a.recommendedModel === 'gpt-4o-mini').length;
    const complex = analyses.filter(a => a.recommendedModel === 'gpt-4.1-2025-04-14').length;
    const total = analyses.length;
    
    return {
      simple,
      complex,
      simplePercentage: total > 0 ? (simple / total) * 100 : 0,
      complexPercentage: total > 0 ? (complex / total) * 100 : 0
    };
  }
}
