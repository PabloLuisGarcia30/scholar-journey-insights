
// Shared AI Optimization Logic - Compatible with Edge Functions and Frontend
// This eliminates code duplication between client and server implementations

export interface ComplexityFactors {
  ocrConfidence: number;
  bubbleQuality: string;
  hasMultipleMarks: boolean;
  hasReviewFlags: boolean;
  isCrossValidated: boolean;
  questionType: string;
  answerClarity: number;
  selectedAnswer: string;
}

export interface ComplexityAnalysis {
  complexityScore: number;
  recommendedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  factors: ComplexityFactors;
  reasoning: string[];
  confidenceInDecision: number;
}

export interface ModelRoutingDecision {
  questionNumber: number;
  selectedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14';
  complexityAnalysis: ComplexityAnalysis;
  fallbackAvailable: boolean;
  estimatedCost: number;
  reasoning: string;
}

export interface AIOptimizationConfig {
  simpleThreshold: number;
  complexThreshold: number;
  fallbackConfidenceThreshold: number;
  gpt4oMiniCost: number;
  gpt41Cost: number;
  enableAdaptiveThresholds: boolean;
  validationMode: boolean;
}

// Default configuration - can be overridden
export const DEFAULT_CONFIG: AIOptimizationConfig = {
  simpleThreshold: 25,
  complexThreshold: 60,
  fallbackConfidenceThreshold: 70,
  gpt4oMiniCost: 0.00015,
  gpt41Cost: 0.003,
  enableAdaptiveThresholds: false,
  validationMode: false
};

export class SharedQuestionComplexityAnalyzer {
  private config: AIOptimizationConfig;

  constructor(config: AIOptimizationConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  analyzeQuestion(question: any, answerKey: any): ComplexityAnalysis {
    const factors = this.extractComplexityFactors(question, answerKey);
    const complexityScore = this.calculateComplexityScore(factors);
    const reasoning = this.generateReasoning(factors, complexityScore);
    
    return {
      complexityScore,
      recommendedModel: complexityScore <= this.config.simpleThreshold ? 'gpt-4o-mini' : 'gpt-4.1-2025-04-14',
      factors,
      reasoning,
      confidenceInDecision: this.calculateDecisionConfidence(factors, complexityScore)
    };
  }

  private extractComplexityFactors(question: any, answerKey: any): ComplexityFactors {
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

  private determineQuestionType(answerKey: any): string {
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
      return 'mcq'; // Default assumption
    }
  }

  private calculateAnswerClarity(detectedAnswer: any): number {
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

  private calculateComplexityScore(factors: ComplexityFactors): number {
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

  private calculateDecisionConfidence(factors: ComplexityFactors, complexityScore: number): number {
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

  private generateReasoning(factors: ComplexityFactors, complexityScore: number): string[] {
    const reasoning = [];
    
    if (complexityScore <= this.config.simpleThreshold) {
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
}

// Simplified Fallback Decision Logic
export class SimplifiedFallbackAnalyzer {
  private config: AIOptimizationConfig;

  constructor(config: AIOptimizationConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  // Simplified decision tree for fallback logic
  shouldFallbackToGPT41(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis): {
    shouldFallback: boolean;
    reason: string;
    confidence: number;
  } {
    // Clear failure cases (high confidence fallback)
    if (!gpt4oMiniResult) {
      return { shouldFallback: true, reason: 'No result returned', confidence: 100 };
    }

    if (gpt4oMiniResult.error) {
      return { shouldFallback: true, reason: 'Error in GPT-4o-mini response', confidence: 100 };
    }

    // Missing critical data (high confidence fallback)
    const hasCompleteResponse = gpt4oMiniResult.total_points_earned !== undefined && 
                               gpt4oMiniResult.overall_score !== undefined;
    
    if (!hasCompleteResponse) {
      return { shouldFallback: true, reason: 'Incomplete response data', confidence: 90 };
    }

    // Quality-based fallback decisions
    const resultConfidence = gpt4oMiniResult.confidence || 0;
    const isHighComplexity = originalComplexity.complexityScore > 30;
    
    if (resultConfidence < this.config.fallbackConfidenceThreshold && isHighComplexity) {
      return { 
        shouldFallback: true, 
        reason: `Low confidence (${resultConfidence}) on complex question`, 
        confidence: 75 
      };
    }

    // No fallback needed
    return { shouldFallback: false, reason: 'Response quality acceptable', confidence: 80 };
  }
}

// Shared AI Model Router with configurable thresholds
export class SharedAIModelRouter {
  private analyzer: SharedQuestionComplexityAnalyzer;
  private fallbackAnalyzer: SimplifiedFallbackAnalyzer;
  private config: AIOptimizationConfig;

  constructor(config: AIOptimizationConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.analyzer = new SharedQuestionComplexityAnalyzer(this.config);
    this.fallbackAnalyzer = new SimplifiedFallbackAnalyzer(this.config);
  }

  routeQuestionsForAI(questions: any[], answerKeys: any[]) {
    console.log('🎯 AI Model Router: Analyzing', questions.length, 'questions with configurable thresholds');
    console.log('📊 Using threshold:', this.config.simpleThreshold, '(configurable)');
    
    const routingDecisions: ModelRoutingDecision[] = questions.map(question => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      if (!answerKey) return null;
      
      const analysis = this.analyzer.analyzeQuestion(question, answerKey);
      const estimatedTokens = this.estimateTokens(question);
      const estimatedCost = analysis.recommendedModel === 'gpt-4o-mini' 
        ? this.config.gpt4oMiniCost 
        : this.config.gpt41Cost;
      
      return {
        questionNumber: question.questionNumber,
        selectedModel: analysis.recommendedModel,
        complexityAnalysis: analysis,
        fallbackAvailable: analysis.recommendedModel === 'gpt-4o-mini',
        estimatedCost,
        reasoning: analysis.reasoning.join('; ')
      };
    }).filter(Boolean) as ModelRoutingDecision[];

    const distribution = this.calculateDistribution(routingDecisions);
    
    console.log(`📊 Model Distribution: ${distribution.gpt4oMini} questions → GPT-4o-mini, ${distribution.gpt41} questions → GPT-4.1`);
    console.log(`💰 Estimated cost savings: ${distribution.estimatedCostSavings.toFixed(1)}%`);

    return { routingDecisions, distribution };
  }

  // Use simplified fallback logic
  shouldFallbackToGPT41(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis) {
    return this.fallbackAnalyzer.shouldFallbackToGPT41(gpt4oMiniResult, originalComplexity).shouldFallback;
  }

  private estimateTokens(question: any): number {
    const baseTokens = 150;
    const questionText = question.questionText || '';
    const questionTokens = Math.max(10, questionText.length / 4);
    const answerTokens = 10;
    
    return Math.round(baseTokens + questionTokens + answerTokens);
  }

  private calculateDistribution(decisions: ModelRoutingDecision[]) {
    const gpt4oMini = decisions.filter(d => d.selectedModel === 'gpt-4o-mini').length;
    const gpt41 = decisions.filter(d => d.selectedModel === 'gpt-4.1-2025-04-14').length;
    const total = decisions.length;

    const totalCostWithGPT41 = total * this.config.gpt41Cost;
    const estimatedActualCost = gpt4oMini * this.config.gpt4oMiniCost + gpt41 * this.config.gpt41Cost;
    const savings = total > 0 ? ((totalCostWithGPT41 - estimatedActualCost) / totalCostWithGPT41) * 100 : 0;

    return {
      gpt4oMini,
      gpt41,
      totalQuestions: total,
      estimatedCostSavings: Math.max(0, savings)
    };
  }
}

// Configuration utilities
export class ConfigurationManager {
  static createConfigFromEnvironment(): AIOptimizationConfig {
    // This would work in Edge Functions with environment variables
    return {
      simpleThreshold: parseInt(process.env?.AI_SIMPLE_THRESHOLD || '25'),
      complexThreshold: parseInt(process.env?.AI_COMPLEX_THRESHOLD || '60'),
      fallbackConfidenceThreshold: parseInt(process.env?.AI_FALLBACK_THRESHOLD || '70'),
      gpt4oMiniCost: parseFloat(process.env?.GPT4O_MINI_COST || '0.00015'),
      gpt41Cost: parseFloat(process.env?.GPT41_COST || '0.003'),
      enableAdaptiveThresholds: process.env?.AI_ADAPTIVE_THRESHOLDS === 'true',
      validationMode: process.env?.AI_VALIDATION_MODE === 'true'
    };
  }

  static createValidationConfig(): AIOptimizationConfig {
    return {
      ...DEFAULT_CONFIG,
      validationMode: true,
      simpleThreshold: 30, // More conservative for validation
      fallbackConfidenceThreshold: 80
    };
  }

  static createAggressiveConfig(): AIOptimizationConfig {
    return {
      ...DEFAULT_CONFIG,
      simpleThreshold: 35, // More questions to GPT-4o-mini
      fallbackConfidenceThreshold: 60 // Fewer fallbacks
    };
  }
}
