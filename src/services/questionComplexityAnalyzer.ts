
export interface ComplexityFactors {
  ocrConfidence: number;          // 0-100
  bubbleQuality: string;          // heavy/medium/light/empty/overfilled/unknown
  hasMultipleMarks: boolean;
  hasReviewFlags: boolean;
  isCrossValidated: boolean;
  questionType: string;           // mcq/essay/math/etc
  answerClarity: number;          // 0-100
  selectedAnswer: string;         // A-D or no_answer
}

export interface ComplexityAnalysis {
  complexityScore: number;        // 0-100 (0=simple, 100=complex)
  recommendedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  factors: ComplexityFactors;
  reasoning: string[];
  confidenceInDecision: number;   // 0-100
}

export class QuestionComplexityAnalyzer {
  private static readonly SIMPLE_THRESHOLD = 25;
  private static readonly COMPLEX_THRESHOLD = 60;

  static analyzeQuestion(question: any, answerKey: any): ComplexityAnalysis {
    const factors = this.extractComplexityFactors(question, answerKey);
    const complexityScore = this.calculateComplexityScore(factors);
    const reasoning = this.generateReasoning(factors, complexityScore);
    
    return {
      complexityScore,
      recommendedModel: complexityScore <= this.SIMPLE_THRESHOLD ? 'gpt-4o-mini' : 'gpt-4.1-2025-04-14',
      factors,
      reasoning,
      confidenceInDecision: this.calculateDecisionConfidence(factors, complexityScore)
    };
  }

  private static extractComplexityFactors(question: any, answerKey: any): ComplexityFactors {
    const detectedAnswer = question.detectedAnswer || {};
    
    return {
      ocrConfidence: detectedAnswer.confidence || 0,
      bubbleQuality: detectedAnswer.bubbleQuality || 'unknown',
      hasMultipleMarks: detectedAnswer.multipleMarksDetected || false,
      hasReviewFlags: detectedAnswer.reviewFlag || false,
      isCrossValidated: detectedAnswer.crossValidated || false,
      questionType: this.determineQuestionType(answerKey),
      answerClarity: this.calculateAnswerClarity(detectedAnswer),
      selectedAnswer: detectedAnswer.selectedOption || 'no_answer'
    };
  }

  private static determineQuestionType(answerKey: any): string {
    if (!answerKey) return 'unknown';
    
    const questionType = answerKey.question_type?.toLowerCase() || '';
    const hasOptions = answerKey.options || /^[A-D]$/i.test(answerKey.correct_answer);
    
    if (questionType.includes('multiple') || hasOptions) {
      return 'mcq';
    } else if (questionType.includes('essay') || questionType.includes('written')) {
      return 'essay';
    } else if (questionType.includes('math') || questionType.includes('calculation')) {
      return 'math';
    } else {
      return 'mcq'; // Default assumption for most questions
    }
  }

  private static calculateAnswerClarity(detectedAnswer: any): number {
    if (!detectedAnswer) return 0;
    
    let clarity = 0;
    
    // Base clarity from confidence
    clarity += (detectedAnswer.confidence || 0) * 0.6;
    
    // Bubble quality impact
    const bubbleQuality = detectedAnswer.bubbleQuality;
    if (bubbleQuality === 'heavy') clarity += 25;
    else if (bubbleQuality === 'medium') clarity += 15;
    else if (bubbleQuality === 'light') clarity += 5;
    else if (bubbleQuality === 'empty' || bubbleQuality === 'overfilled') clarity -= 20;
    
    // Cross-validation bonus
    if (detectedAnswer.crossValidated) clarity += 10;
    
    // Valid answer selection
    if (/^[A-D]$/i.test(detectedAnswer.selectedOption)) clarity += 5;
    
    return Math.max(0, Math.min(100, clarity));
  }

  private static calculateComplexityScore(factors: ComplexityFactors): number {
    let score = 0;
    
    // OCR Confidence (inverse relationship - low confidence = high complexity)
    score += (100 - factors.ocrConfidence) * 0.3;
    
    // Answer Clarity (inverse relationship)
    score += (100 - factors.answerClarity) * 0.25;
    
    // Quality issues add complexity
    if (factors.hasMultipleMarks) score += 30;
    if (factors.hasReviewFlags) score += 25;
    if (!factors.isCrossValidated) score += 15;
    
    // Bubble quality impact
    const bubbleQuality = factors.bubbleQuality;
    if (bubbleQuality === 'empty' || bubbleQuality === 'overfilled') score += 20;
    else if (bubbleQuality === 'unknown') score += 10;
    
    // Question type complexity
    if (factors.questionType === 'essay') score += 40;
    else if (factors.questionType === 'math') score += 25;
    else if (factors.questionType === 'unknown') score += 15;
    
    // No clear answer adds complexity
    if (factors.selectedAnswer === 'no_answer') score += 20;
    else if (!/^[A-D]$/i.test(factors.selectedAnswer)) score += 15;
    
    return Math.max(0, Math.min(100, score));
  }

  private static calculateDecisionConfidence(factors: ComplexityFactors, complexityScore: number): number {
    let confidence = 80; // Base confidence
    
    // High or low scores are more confident decisions
    if (complexityScore <= 20 || complexityScore >= 80) confidence += 15;
    else if (complexityScore >= 40 && complexityScore <= 60) confidence -= 20; // Borderline cases
    
    // Clear indicators boost confidence
    if (factors.isCrossValidated && factors.ocrConfidence > 85) confidence += 10;
    if (factors.hasMultipleMarks || factors.hasReviewFlags) confidence += 10;
    if (factors.bubbleQuality === 'heavy' || factors.bubbleQuality === 'medium') confidence += 5;
    
    return Math.max(50, Math.min(100, confidence));
  }

  private static generateReasoning(factors: ComplexityFactors, complexityScore: number): string[] {
    const reasoning = [];
    
    if (complexityScore <= 25) {
      reasoning.push(`Low complexity (${complexityScore}) - suitable for GPT-4o-mini`);
    } else {
      reasoning.push(`High complexity (${complexityScore}) - requires GPT-4.1`);
    }
    
    if (factors.ocrConfidence > 85) {
      reasoning.push('High OCR confidence suggests clear detection');
    } else if (factors.ocrConfidence < 60) {
      reasoning.push('Low OCR confidence indicates detection issues');
    }
    
    if (factors.hasMultipleMarks) reasoning.push('Multiple marks detected - needs careful analysis');
    if (factors.hasReviewFlags) reasoning.push('Flagged for review due to quality concerns');
    if (!factors.isCrossValidated) reasoning.push('No cross-validation available');
    
    if (factors.bubbleQuality === 'heavy' || factors.bubbleQuality === 'medium') {
      reasoning.push('Good bubble quality');
    } else if (factors.bubbleQuality === 'empty' || factors.bubbleQuality === 'overfilled') {
      reasoning.push('Poor bubble quality requires advanced analysis');
    }
    
    if (factors.questionType === 'essay') {
      reasoning.push('Essay question requires advanced reasoning');
    } else if (factors.questionType === 'math') {
      reasoning.push('Mathematical content may need specialized handling');
    }
    
    return reasoning;
  }

  static batchAnalyzeQuestions(questions: any[], answerKeys: any[]): ComplexityAnalysis[] {
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
