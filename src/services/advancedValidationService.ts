
export interface ImpossibilityDetectionResult {
  isImpossible: boolean;
  reason: string;
  confidence: number;
  suggestedAction: 'retry' | 'manual_review' | 'ignore';
}

export interface AnswerPatternAnalysis {
  isValid: boolean;
  interferenceDetected: boolean;
  patternConsistency: number;
  suspiciousMarks: SuspiciousMark[];
}

export interface SuspiciousMark {
  position: { x: number; y: number };
  type: 'multiple_fills' | 'partial_fill' | 'handwriting_interference' | 'out_of_bounds';
  confidence: number;
}

export interface ValidationRecoveryConfig {
  maxRetries: number;
  noiseFilteringIncrease: number;
  fallbackMethods: string[];
  confidenceThreshold: number;
}

export class AdvancedValidationService {
  
  static detectImpossibilities(
    answers: any[],
    template: any
  ): ImpossibilityDetectionResult[] {
    console.log('🔍 Running impossibility detection on answers');
    
    const results: ImpossibilityDetectionResult[] = [];
    
    answers.forEach((answer, index) => {
      // Check for multiple bubbles filled
      const multipleFillsResult = this.detectMultipleFills(answer, template);
      if (multipleFillsResult.isImpossible) {
        results.push(multipleFillsResult);
      }
      
      // Check for out-of-bounds answers
      const outOfBoundsResult = this.detectOutOfBounds(answer, template);
      if (outOfBoundsResult.isImpossible) {
        results.push(outOfBoundsResult);
      }
      
      // Check for impossible answer patterns
      const patternResult = this.detectImpossiblePatterns(answer, answers);
      if (patternResult.isImpossible) {
        results.push(patternResult);
      }
    });
    
    return results;
  }
  
  static analyzeAnswerPatterns(
    answers: any[],
    template: any
  ): AnswerPatternAnalysis {
    console.log('📊 Analyzing answer patterns for handwriting interference');
    
    const suspiciousMarks: SuspiciousMark[] = [];
    let interferenceDetected = false;
    let totalValidAnswers = 0;
    
    answers.forEach(answer => {
      // Check for handwriting interference around bubbles
      const interference = this.detectHandwritingInterference(answer, template);
      if (interference.detected) {
        interferenceDetected = true;
        suspiciousMarks.push(...interference.marks);
      }
      
      // Validate geometric properties of bubble fills
      const geometricValidation = this.validateBubbleGeometry(answer);
      if (geometricValidation.isValid) {
        totalValidAnswers++;
      } else {
        suspiciousMarks.push(...geometricValidation.suspiciousMarks);
      }
    });
    
    const patternConsistency = totalValidAnswers / Math.max(1, answers.length);
    const isValid = patternConsistency > 0.7 && !interferenceDetected;
    
    return {
      isValid,
      interferenceDetected,
      patternConsistency,
      suspiciousMarks
    };
  }
  
  static async applyRecoveryProcessing(
    originalResult: any,
    config: ValidationRecoveryConfig,
    imageData: string
  ): Promise<any> {
    console.log('🔄 Applying recovery processing for low-confidence results');
    
    let bestResult = originalResult;
    let retryCount = 0;
    
    while (retryCount < config.maxRetries && bestResult.confidence < config.confidenceThreshold) {
      console.log(`🔄 Recovery attempt ${retryCount + 1}/${config.maxRetries}`);
      
      // Increase noise filtering progressively
      const noiseReduction = 1 + (retryCount * config.noiseFilteringIncrease);
      
      // Try fallback methods
      const fallbackMethod = config.fallbackMethods[retryCount % config.fallbackMethods.length];
      
      const recoveryResult = await this.processWithRecoveryMethod(
        imageData,
        fallbackMethod,
        noiseReduction
      );
      
      if (recoveryResult.confidence > bestResult.confidence) {
        bestResult = recoveryResult;
        console.log(`✅ Recovery improved confidence: ${(recoveryResult.confidence * 100).toFixed(1)}%`);
      }
      
      retryCount++;
    }
    
    return bestResult;
  }
  
  static performCrossValidation(
    primaryResult: any,
    secondaryResult: any,
    template: any
  ): { isValid: boolean; confidence: number; discrepancies: string[] } {
    console.log('🔄 Performing cross-validation between results');
    
    const discrepancies: string[] = [];
    let agreementCount = 0;
    let totalComparisons = 0;
    
    // Compare answers between methods
    if (primaryResult.detectedAnswers && secondaryResult.detectedAnswers) {
      primaryResult.detectedAnswers.forEach((primary: any, index: number) => {
        const secondary = secondaryResult.detectedAnswers[index];
        totalComparisons++;
        
        if (secondary && primary.selectedOption === secondary.selectedOption) {
          agreementCount++;
        } else {
          discrepancies.push(`Question ${index + 1}: Primary=${primary.selectedOption}, Secondary=${secondary?.selectedOption}`);
        }
      });
    }
    
    const agreement = totalComparisons > 0 ? agreementCount / totalComparisons : 0;
    const isValid = agreement > 0.8;
    const confidence = Math.min(0.95, agreement + 0.1);
    
    return { isValid, confidence, discrepancies };
  }
  
  private static detectMultipleFills(answer: any, template: any): ImpossibilityDetectionResult {
    // Simulate detection of multiple bubbles filled for single question
    const hasMultipleFills = Math.random() < 0.05; // 5% chance of multiple fills
    
    if (hasMultipleFills) {
      return {
        isImpossible: true,
        reason: `Question ${answer.questionNumber}: Multiple bubbles detected`,
        confidence: 0.9,
        suggestedAction: 'manual_review'
      };
    }
    
    return { isImpossible: false, reason: '', confidence: 0, suggestedAction: 'ignore' };
  }
  
  private static detectOutOfBounds(answer: any, template: any): ImpossibilityDetectionResult {
    // Check if answer is outside expected grid boundaries
    if (!answer.position || !template?.layout?.bubbleGrid) {
      return { isImpossible: false, reason: '', confidence: 0, suggestedAction: 'ignore' };
    }
    
    const grid = template.layout.bubbleGrid;
    const isOutOfBounds = 
      answer.position.x < grid.startPosition.x - 50 ||
      answer.position.x > grid.startPosition.x + (grid.columns * grid.horizontalSpacing) + 50 ||
      answer.position.y < grid.startPosition.y - 50 ||
      answer.position.y > grid.startPosition.y + (grid.rows * grid.verticalSpacing) + 50;
    
    if (isOutOfBounds) {
      return {
        isImpossible: true,
        reason: `Question ${answer.questionNumber}: Answer detected outside expected grid`,
        confidence: 0.85,
        suggestedAction: 'retry'
      };
    }
    
    return { isImpossible: false, reason: '', confidence: 0, suggestedAction: 'ignore' };
  }
  
  private static detectImpossiblePatterns(answer: any, allAnswers: any[]): ImpossibilityDetectionResult {
    // Detect patterns that suggest systematic errors
    const consecutiveUnanswered = this.countConsecutiveUnanswered(answer, allAnswers);
    
    if (consecutiveUnanswered > 10) {
      return {
        isImpossible: true,
        reason: `Suspicious pattern: ${consecutiveUnanswered} consecutive unanswered questions`,
        confidence: 0.7,
        suggestedAction: 'retry'
      };
    }
    
    return { isImpossible: false, reason: '', confidence: 0, suggestedAction: 'ignore' };
  }
  
  private static detectHandwritingInterference(
    answer: any,
    template: any
  ): { detected: boolean; marks: SuspiciousMark[] } {
    // Simulate handwriting interference detection
    const interferenceDetected = Math.random() < 0.15; // 15% chance
    const marks: SuspiciousMark[] = [];
    
    if (interferenceDetected && answer.position) {
      marks.push({
        position: { x: answer.position.x + 10, y: answer.position.y + 5 },
        type: 'handwriting_interference',
        confidence: 0.8
      });
    }
    
    return { detected: interferenceDetected, marks };
  }
  
  private static validateBubbleGeometry(answer: any): { isValid: boolean; suspiciousMarks: SuspiciousMark[] } {
    // Validate that bubble fills have expected geometric properties
    const isValid = Math.random() > 0.1; // 90% validity rate
    const suspiciousMarks: SuspiciousMark[] = [];
    
    if (!isValid && answer.position) {
      suspiciousMarks.push({
        position: answer.position,
        type: 'partial_fill',
        confidence: 0.7
      });
    }
    
    return { isValid, suspiciousMarks };
  }
  
  private static countConsecutiveUnanswered(answer: any, allAnswers: any[]): number {
    let consecutive = 0;
    let foundCurrent = false;
    
    for (const a of allAnswers) {
      if (a.questionNumber === answer.questionNumber) {
        foundCurrent = true;
      }
      
      if (foundCurrent) {
        if (!a.selectedOption) {
          consecutive++;
        } else {
          break;
        }
      }
    }
    
    return consecutive;
  }
  
  private static async processWithRecoveryMethod(
    imageData: string,
    method: string,
    noiseReduction: number
  ): Promise<any> {
    // Simulate processing with different recovery methods
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const baseConfidence = 0.7 + Math.random() * 0.2;
    const recoveryBoost = Math.min(0.15, noiseReduction * 0.05);
    
    return {
      confidence: Math.min(0.95, baseConfidence + recoveryBoost),
      method,
      noiseReduction,
      detectedAnswers: []
    };
  }
}
