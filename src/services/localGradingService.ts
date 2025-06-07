
interface LocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local_mcq' | 'local_confident' | 'requires_ai';
  reasoning?: string;
}

interface QuestionClassification {
  questionNumber: number;
  isEasyMCQ: boolean;
  confidence: number;
  detectionMethod: string;
  shouldUseLocalGrading: boolean;
  fallbackReason?: string;
}

export class LocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.9;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.7;

  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
    let confidence = 0;
    let isEasyMCQ = false;
    let detectionMethod = 'none';
    let shouldUseLocal = false;

    // Check if it's a multiple choice question
    const isMCQ = answerKey.question_type?.toLowerCase().includes('multiple') || 
                  answerKey.options || 
                  /^[A-E]$/i.test(answerKey.correct_answer);

    if (!isMCQ) {
      return {
        questionNumber: question.questionNumber,
        isEasyMCQ: false,
        confidence: 0,
        detectionMethod: 'not_mcq',
        shouldUseLocalGrading: false,
        fallbackReason: 'Not a multiple choice question'
      };
    }

    // Check OCR confidence from structured data
    if (question.detectedAnswer) {
      confidence = question.detectedAnswer.confidence || 0;
      detectionMethod = question.detectedAnswer.detectionMethod || 'unknown';
      
      // High confidence bubble detection
      if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD && 
          detectionMethod.includes('roboflow')) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
      // Medium confidence with cross-validation
      else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD && 
               question.detectedAnswer.crossValidated) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
    }

    return {
      questionNumber: question.questionNumber,
      isEasyMCQ,
      confidence,
      detectionMethod,
      shouldUseLocalGrading: shouldUseLocal,
      fallbackReason: shouldUseLocal ? undefined : 'Low confidence or no cross-validation'
    };
  }

  static gradeQuestion(question: any, answerKey: any): LocalGradingResult {
    const classification = this.classifyQuestion(question, answerKey);
    
    if (!classification.shouldUseLocalGrading) {
      return {
        questionNumber: question.questionNumber,
        isCorrect: false,
        pointsEarned: 0,
        pointsPossible: answerKey.points || 1,
        confidence: 0,
        gradingMethod: 'requires_ai',
        reasoning: classification.fallbackReason
      };
    }

    const studentAnswer = question.detectedAnswer?.selectedOption?.toUpperCase() || '';
    const correctAnswer = answerKey.correct_answer?.toUpperCase() || '';
    const isCorrect = studentAnswer === correctAnswer;
    const pointsPossible = answerKey.points || 1;
    const pointsEarned = isCorrect ? pointsPossible : 0;

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned,
      pointsPossible,
      confidence: classification.confidence,
      gradingMethod: classification.confidence >= this.HIGH_CONFIDENCE_THRESHOLD ? 'local_confident' : 'local_mcq',
      reasoning: `Local MCQ grading: Student selected ${studentAnswer}, correct answer is ${correctAnswer}`
    };
  }

  static processQuestions(questions: any[], answerKeys: any[]): {
    localResults: LocalGradingResult[];
    aiRequiredQuestions: any[];
    summary: {
      totalQuestions: number;
      locallyGraded: number;
      requiresAI: number;
      localAccuracy: number;
    };
  } {
    const localResults: LocalGradingResult[] = [];
    const aiRequiredQuestions: any[] = [];
    let locallyGradedCount = 0;

    for (const question of questions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      
      if (!answerKey) {
        aiRequiredQuestions.push(question);
        continue;
      }

      const result = this.gradeQuestion(question, answerKey);
      
      if (result.gradingMethod === 'requires_ai') {
        aiRequiredQuestions.push(question);
      } else {
        localResults.push(result);
        locallyGradedCount++;
      }
    }

    return {
      localResults,
      aiRequiredQuestions,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length
      }
    };
  }

  static generateLocalFeedback(results: LocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);

    return `Automatically graded ${total} multiple choice questions with high confidence. Score: ${correct}/${total} (${percentage}%)`;
  }
}
