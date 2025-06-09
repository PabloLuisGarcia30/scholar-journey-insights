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
  recommendedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14' | 'local_distilbert';
  factors: ComplexityFactors;
  reasoning: string[];
  confidenceInDecision: number;
}

export interface ModelRoutingDecision {
  questionNumber: number;
  selectedModel: 'gpt-4o-mini' | 'gpt-4.1-2025-04-14' | 'local_distilbert';
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
  // Enhanced batch processing features
  crossQuestionLeakagePrevention: boolean;
  questionDelimiter: string;
  maxQuestionsPerBatch: number;
  skillAmbiguityResolution: boolean;
  maxSkillsPerQuestion: number;
  skillEscalationThreshold: number;
}

// Default configuration - can be overridden
export const DEFAULT_CONFIG: AIOptimizationConfig = {
  simpleThreshold: 25,
  complexThreshold: 60,
  fallbackConfidenceThreshold: 70,
  gpt4oMiniCost: 0.00015,
  gpt41Cost: 0.003,
  enableAdaptiveThresholds: false,
  validationMode: false,
  // Enhanced features
  crossQuestionLeakagePrevention: true,
  questionDelimiter: '\n---END QUESTION---\n',
  maxQuestionsPerBatch: 8, // Reduced for better isolation
  skillAmbiguityResolution: true,
  maxSkillsPerQuestion: 2,
  skillEscalationThreshold: 0.7
};

export interface EnhancedBatchPrompt {
  delimiter: string;
  questions: Array<{
    questionNumber: number;
    questionText: string;
    studentAnswer: string;
    availableSkills: string[];
    instructions: string;
  }>;
  batchInstructions: string;
}

export class EnhancedBatchProcessor {
  private config: AIOptimizationConfig;

  constructor(config: AIOptimizationConfig = DEFAULT_CONFIG) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  createEnhancedBatchPrompt(
    questions: any[],
    answerKeys: any[],
    skillMappings: any[]
  ): EnhancedBatchPrompt {
    const delimiter = this.config.questionDelimiter;
    
    const enhancedQuestions = questions.slice(0, this.config.maxQuestionsPerBatch).map((question, index) => {
      const answerKey = answerKeys[index];
      const questionSkills = skillMappings.filter(sm => sm.question_number === question.questionNumber);
      const availableSkills = questionSkills.map(sm => sm.skill_name);

      return {
        questionNumber: question.questionNumber,
        questionText: answerKey?.question_text || `Question ${question.questionNumber}`,
        studentAnswer: question.detectedAnswer?.selectedOption || 'No answer detected',
        availableSkills,
        instructions: this.createQuestionInstructions(availableSkills, answerKey)
      };
    });

    return {
      delimiter,
      questions: enhancedQuestions,
      batchInstructions: this.createBatchInstructions(enhancedQuestions.length)
    };
  }

  private createQuestionInstructions(availableSkills: string[], answerKey: any): string {
    const instructions = [
      `Match the answer strictly to the provided skills: ${availableSkills.join(', ')}`,
      'Do not infer additional skills beyond those listed',
      `Maximum ${this.config.maxSkillsPerQuestion} skills per question`,
      'Focus on the PRIMARY skill being assessed'
    ];

    if (answerKey?.question_type) {
      instructions.push(`Question type: ${answerKey.question_type}`);
    }

    return instructions.join('. ');
  }

  private createBatchInstructions(questionCount: number): string {
    return `BATCH PROCESSING INSTRUCTIONS:
1. Process each question INDEPENDENTLY - do not let context from one question affect another
2. Each question is separated by "${this.config.questionDelimiter}"
3. Return results for exactly ${questionCount} questions in order
4. Use only the skills provided for each specific question
5. Maintain strict question boundaries - no cross-question contamination
6. If skill matching is ambiguous, indicate low confidence for escalation

CRITICAL: Treat each question as a completely separate analysis task.`;
  }

  formatBatchPrompt(enhancedPrompt: EnhancedBatchPrompt): string {
    const questionBlocks = enhancedPrompt.questions.map((q, index) => `
Question ${index + 1} (Q${q.questionNumber}):
Question Text: ${q.questionText}
Student Answer: ${q.studentAnswer}
Available Skills: ${q.availableSkills.join(', ')}
Instructions: ${q.instructions}
    `).join(enhancedPrompt.delimiter);

    return `${enhancedPrompt.batchInstructions}

${questionBlocks}

REQUIRED OUTPUT FORMAT (JSON array with ${enhancedPrompt.questions.length} results):
[
  {
    "questionNumber": 1,
    "isCorrect": true,
    "pointsEarned": 1,
    "confidence": 0.95,
    "reasoning": "Detailed grading explanation",
    "matchedSkills": ["skill1"],
    "skillConfidence": 0.9,
    "complexityScore": 0.6
  }
]

Return EXACTLY ${enhancedPrompt.questions.length} results in the array.`;
  }

  parseBatchedResponse(
    gptResponse: string,
    expectedQuestions: number,
    delimiter: string
  ): Array<{
    questionNumber: number;
    isCorrect: boolean;
    pointsEarned: number;
    confidence: number;
    reasoning: string;
    matchedSkills: string[];
    skillConfidence: number;
    complexityScore: number;
    parseError?: string;
  }> {
    try {
      // Try to parse as JSON first
      const parsed = JSON.parse(gptResponse);
      if (Array.isArray(parsed) && parsed.length === expectedQuestions) {
        return parsed.map(result => this.validateQuestionResult(result));
      }
    } catch (jsonError) {
      console.warn('JSON parsing failed, attempting delimiter-based parsing');
    }

    // Fallback to delimiter-based parsing
    return this.parseWithDelimiters(gptResponse, delimiter, expectedQuestions);
  }

  private parseWithDelimiters(
    response: string,
    delimiter: string,
    expectedQuestions: number
  ): any[] {
    const blocks = response.split(delimiter);
    const results = [];

    for (let i = 0; i < Math.min(blocks.length, expectedQuestions); i++) {
      try {
        const block = blocks[i].trim();
        const result = this.extractResultFromBlock(block, i + 1);
        results.push(result);
      } catch (error) {
        console.error(`Failed to parse block ${i + 1}:`, error);
        results.push(this.createErrorResult(i + 1, error.message));
      }
    }

    // Fill missing results with error placeholders
    while (results.length < expectedQuestions) {
      results.push(this.createErrorResult(results.length + 1, 'Missing result from batch response'));
    }

    return results;
  }

  private extractResultFromBlock(block: string, questionNumber: number): any {
    // Extract key information using regex patterns
    const patterns = {
      isCorrect: /(?:correct|accurate):\s*(true|false)/i,
      pointsEarned: /points?\s*earned?:\s*(\d+(?:\.\d+)?)/i,
      confidence: /confidence:\s*(\d+(?:\.\d+)?)/i,
      skills: /matched?\s*skills?:\s*\[(.*?)\]/i,
      reasoning: /reasoning:\s*["']?(.*?)["']?(?:\n|$)/i
    };

    const result = {
      questionNumber,
      isCorrect: this.extractBoolean(block, patterns.isCorrect),
      pointsEarned: this.extractNumber(block, patterns.pointsEarned, 0),
      confidence: this.extractNumber(block, patterns.confidence, 0.5),
      reasoning: this.extractString(block, patterns.reasoning, 'Batch processing result'),
      matchedSkills: this.extractSkills(block, patterns.skills),
      skillConfidence: 0.7,
      complexityScore: 0.5
    };

    return this.validateQuestionResult(result);
  }

  private extractBoolean(text: string, pattern: RegExp): boolean {
    const match = text.match(pattern);
    return match ? match[1].toLowerCase() === 'true' : false;
  }

  private extractNumber(text: string, pattern: RegExp, defaultValue: number): number {
    const match = text.match(pattern);
    return match ? Math.max(0, parseFloat(match[1])) : defaultValue;
  }

  private extractString(text: string, pattern: RegExp, defaultValue: string): string {
    const match = text.match(pattern);
    return match ? match[1].trim() : defaultValue;
  }

  private extractSkills(text: string, pattern: RegExp): string[] {
    const match = text.match(pattern);
    if (!match) return [];
    
    return match[1]
      .split(',')
      .map(skill => skill.trim().replace(/['"]/g, ''))
      .filter(skill => skill.length > 0)
      .slice(0, this.config.maxSkillsPerQuestion);
  }

  private validateQuestionResult(result: any): any {
    return {
      questionNumber: result.questionNumber || 0,
      isCorrect: Boolean(result.isCorrect),
      pointsEarned: Math.max(0, Number(result.pointsEarned) || 0),
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
      reasoning: String(result.reasoning || 'Batch processing result'),
      matchedSkills: Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
      skillConfidence: Math.max(0, Math.min(1, Number(result.skillConfidence) || 0.7)),
      complexityScore: Math.max(0, Math.min(1, Number(result.complexityScore) || 0.5))
    };
  }

  private createErrorResult(questionNumber: number, error: string): any {
    return {
      questionNumber,
      isCorrect: false,
      pointsEarned: 0,
      confidence: 0.3,
      reasoning: `Parse error: ${error}`,
      matchedSkills: [],
      skillConfidence: 0.3,
      complexityScore: 0.5,
      parseError: error
    };
  }
}

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
  shouldFallbackToGPT41(gpt4oMiniResult: any, originalComplexity: ComplexityAnalysis) {
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
      validationMode: process.env?.AI_VALIDATION_MODE === 'true',
      crossQuestionLeakagePrevention: true,
      questionDelimiter: '\n---END QUESTION---\n',
      maxQuestionsPerBatch: 8, // Reduced for better isolation
      skillAmbiguityResolution: true,
      maxSkillsPerQuestion: 2,
      skillEscalationThreshold: 0.7
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
