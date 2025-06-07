
export interface ValidationResult {
  type: 'impossibility' | 'pattern_validation' | 'handwriting_interference' | 'geometric_validation';
  passed: boolean;
  confidence: number;
  details: string;
  correctionSuggested?: boolean;
  fallbackRequired?: boolean;
}

export interface ImpossibilityCheck {
  questionNumber: number;
  detectedAnswers: string[];
  impossibilityType: 'multiple_bubbles' | 'out_of_bounds' | 'invalid_mark' | 'conflicting_signals';
  severity: 'critical' | 'warning' | 'minor';
}

export interface PatternAnalysis {
  isConsistent: boolean;
  anomalies: PatternAnomaly[];
  confidenceScore: number;
  handwritingDensity: number;
}

export interface PatternAnomaly {
  type: 'scattered_marks' | 'incomplete_fills' | 'double_marks' | 'smudging';
  location: { x: number; y: number; width: number; height: number };
  severity: number;
}

export class AdvancedValidationService {
  private static readonly VALIDATION_THRESHOLDS = {
    multipleAnswerTolerance: 0.1,
    geometricVarianceThreshold: 0.3,
    handwritingInterferenceThreshold: 0.4,
    minimumFillThreshold: 0.6
  };

  static validateQuestionResults(
    questionResults: any[],
    templateLayout: any,
    handwritingAnalysis: any[]
  ): ValidationResult[] {
    console.log('🔍 Running advanced validation on question results');

    const validationResults: ValidationResult[] = [];

    // Run impossibility detection
    const impossibilityResults = this.detectImpossibilities(questionResults, templateLayout);
    validationResults.push(...impossibilityResults);

    // Run pattern validation
    const patternResults = this.validateAnswerPatterns(questionResults, handwritingAnalysis);
    validationResults.push(...patternResults);

    // Run geometric validation
    const geometricResults = this.validateGeometry(questionResults, templateLayout);
    validationResults.push(...geometricResults);

    // Run handwriting interference check
    const interferenceResults = this.checkHandwritingInterference(questionResults, handwritingAnalysis);
    validationResults.push(...interferenceResults);

    console.log(`✅ Validation complete: ${validationResults.length} checks performed`);
    return validationResults;
  }

  private static detectImpossibilities(
    questionResults: any[],
    templateLayout: any
  ): ValidationResult[] {
    const results: ValidationResult[] = [];
    const impossibilities: ImpossibilityCheck[] = [];

    questionResults.forEach((result, index) => {
      const questionNumber = index + 1;
      const detectedAnswers = this.extractDetectedAnswers(result);

      // Check for multiple bubble fills
      if (detectedAnswers.length > 1) {
        impossibilities.push({
          questionNumber,
          detectedAnswers,
          impossibilityType: 'multiple_bubbles',
          severity: 'critical'
        });
      }

      // Check for out-of-bounds answers
      const validOptions = ['A', 'B', 'C', 'D', 'E'];
      const invalidAnswers = detectedAnswers.filter(answer => !validOptions.includes(answer));
      if (invalidAnswers.length > 0) {
        impossibilities.push({
          questionNumber,
          detectedAnswers: invalidAnswers,
          impossibilityType: 'out_of_bounds',
          severity: 'critical'
        });
      }

      // Check for invalid marks (marks that don't look like intentional fills)
      if (result.confidence < this.VALIDATION_THRESHOLDS.minimumFillThreshold && detectedAnswers.length > 0) {
        impossibilities.push({
          questionNumber,
          detectedAnswers,
          impossibilityType: 'invalid_mark',
          severity: 'warning'
        });
      }
    });

    // Convert impossibilities to validation results
    impossibilities.forEach(impossibility => {
      results.push({
        type: 'impossibility',
        passed: false,
        confidence: impossibility.severity === 'critical' ? 0.95 : 0.7,
        details: this.generateImpossibilityMessage(impossibility),
        correctionSuggested: true,
        fallbackRequired: impossibility.severity === 'critical'
      });
    });

    return results;
  }

  private static extractDetectedAnswers(result: any): string[] {
    // Extract answers from various result formats
    if (result.extractedAnswer?.value) {
      return [result.extractedAnswer.value];
    }
    if (result.selectedOption) {
      return [result.selectedOption];
    }
    if (result.detectedAnswers && Array.isArray(result.detectedAnswers)) {
      return result.detectedAnswers;
    }
    return [];
  }

  private static generateImpossibilityMessage(impossibility: ImpossibilityCheck): string {
    switch (impossibility.impossibilityType) {
      case 'multiple_bubbles':
        return `Question ${impossibility.questionNumber}: Multiple bubbles detected (${impossibility.detectedAnswers.join(', ')}). Only one answer expected.`;
      case 'out_of_bounds':
        return `Question ${impossibility.questionNumber}: Invalid answer option detected (${impossibility.detectedAnswers.join(', ')}). Expected A-E only.`;
      case 'invalid_mark':
        return `Question ${impossibility.questionNumber}: Mark detected but doesn't appear to be intentional bubble fill.`;
      case 'conflicting_signals':
        return `Question ${impossibility.questionNumber}: Conflicting signals detected in answer region.`;
      default:
        return `Question ${impossibility.questionNumber}: Validation anomaly detected.`;
    }
  }

  private static validateAnswerPatterns(
    questionResults: any[],
    handwritingAnalysis: any[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];
    
    // Analyze overall pattern consistency
    const patternAnalysis = this.analyzeAnswerPatterns(questionResults);
    
    results.push({
      type: 'pattern_validation',
      passed: patternAnalysis.isConsistent,
      confidence: patternAnalysis.confidenceScore,
      details: `Answer pattern analysis: ${patternAnalysis.anomalies.length} anomalies detected. Handwriting density: ${(patternAnalysis.handwritingDensity * 100).toFixed(1)}%`,
      correctionSuggested: !patternAnalysis.isConsistent,
      fallbackRequired: patternAnalysis.confidenceScore < 0.5
    });

    // Check each anomaly
    patternAnalysis.anomalies.forEach(anomaly => {
      results.push({
        type: 'pattern_validation',
        passed: false,
        confidence: 1 - anomaly.severity,
        details: `Pattern anomaly: ${anomaly.type} detected at region (${anomaly.location.x}, ${anomaly.location.y})`,
        correctionSuggested: anomaly.severity > 0.6
      });
    });

    return results;
  }

  private static analyzeAnswerPatterns(questionResults: any[]): PatternAnalysis {
    const anomalies: PatternAnomaly[] = [];
    let totalConfidence = 0;
    let handwritingMarks = 0;
    let totalMarks = 0;

    questionResults.forEach((result, index) => {
      const confidence = result.confidence || result.extractedAnswer?.confidence || 0;
      totalConfidence += confidence;
      totalMarks++;

      // Check for scattered marks pattern
      if (confidence > 0.3 && confidence < 0.7) {
        anomalies.push({
          type: 'scattered_marks',
          location: result.position || { x: 500, y: 150 + index * 30, width: 20, height: 20 },
          severity: 0.8 - confidence
        });
      }

      // Check for incomplete fills
      if (confidence < this.VALIDATION_THRESHOLDS.minimumFillThreshold && result.extractedAnswer?.value) {
        anomalies.push({
          type: 'incomplete_fills',
          location: result.position || { x: 500, y: 150 + index * 30, width: 20, height: 20 },
          severity: this.VALIDATION_THRESHOLDS.minimumFillThreshold - confidence
        });
      }

      // Estimate handwriting interference
      if (result.processingMethod && result.processingMethod.includes('handwriting')) {
        handwritingMarks++;
      }
    });

    const avgConfidence = totalConfidence / Math.max(1, questionResults.length);
    const handwritingDensity = handwritingMarks / Math.max(1, totalMarks);
    const isConsistent = anomalies.length < questionResults.length * 0.2; // Less than 20% anomalies

    return {
      isConsistent,
      anomalies,
      confidenceScore: avgConfidence,
      handwritingDensity
    };
  }

  private static validateGeometry(
    questionResults: any[],
    templateLayout: any
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    if (!templateLayout.bubbleGrid) {
      return results;
    }

    const { startPosition, horizontalSpacing, verticalSpacing } = templateLayout.bubbleGrid;

    questionResults.forEach((result, index) => {
      if (!result.position) return;

      // Calculate expected position
      const questionRow = Math.floor(index / 5); // Assuming 5 options per question
      const optionCol = index % 5;
      
      const expectedX = startPosition.x + (optionCol * horizontalSpacing);
      const expectedY = startPosition.y + (questionRow * verticalSpacing);

      // Calculate position deviation
      const deviation = Math.sqrt(
        Math.pow(result.position.x - expectedX, 2) + 
        Math.pow(result.position.y - expectedY, 2)
      );

      const maxAllowedDeviation = 15; // pixels
      const passed = deviation <= maxAllowedDeviation;

      if (!passed) {
        results.push({
          type: 'geometric_validation',
          passed: false,
          confidence: Math.max(0, 1 - (deviation / (maxAllowedDeviation * 2))),
          details: `Answer position deviation: ${deviation.toFixed(1)}px from expected location`,
          correctionSuggested: deviation > maxAllowedDeviation * 1.5,
          fallbackRequired: deviation > maxAllowedDeviation * 2
        });
      }
    });

    return results;
  }

  private static checkHandwritingInterference(
    questionResults: any[],
    handwritingAnalysis: any[]
  ): ValidationResult[] {
    const results: ValidationResult[] = [];

    let interferenceCount = 0;
    let totalQuestions = questionResults.length;

    questionResults.forEach((result, index) => {
      if (result.handwritingInterference || 
          (result.confidence && result.confidence < 0.5) ||
          (result.extractedAnswer?.confidence && result.extractedAnswer.confidence < 0.5)) {
        
        interferenceCount++;
        
        results.push({
          type: 'handwriting_interference',
          passed: false,
          confidence: 0.8,
          details: `Question ${index + 1}: Handwriting interference detected affecting answer detection`,
          correctionSuggested: true,
          fallbackRequired: result.confidence < 0.3
        });
      }
    });

    // Overall interference assessment
    const interferenceRate = interferenceCount / Math.max(1, totalQuestions);
    
    if (interferenceRate > this.VALIDATION_THRESHOLDS.handwritingInterferenceThreshold) {
      results.push({
        type: 'handwriting_interference',
        passed: false,
        confidence: 0.9,
        details: `High handwriting interference: ${(interferenceRate * 100).toFixed(1)}% of questions affected`,
        correctionSuggested: true,
        fallbackRequired: interferenceRate > 0.6
      });
    }

    return results;
  }

  static requiresReprocessing(validationResults: ValidationResult[]): boolean {
    return validationResults.some(result => 
      !result.passed && (result.fallbackRequired || result.type === 'impossibility')
    );
  }

  static generateRecoveryStrategy(validationResults: ValidationResult[]): {
    strategy: 'noise_filtering' | 'region_refocus' | 'alternative_method' | 'manual_review';
    priority: number;
    targetRegions: { x: number; y: number; width: number; height: number }[];
  } {
    const criticalIssues = validationResults.filter(r => !r.passed && r.fallbackRequired);
    
    if (criticalIssues.some(issue => issue.type === 'impossibility')) {
      return {
        strategy: 'region_refocus',
        priority: 4,
        targetRegions: [] // Would be populated with specific problem regions
      };
    }

    if (criticalIssues.some(issue => issue.type === 'handwriting_interference')) {
      return {
        strategy: 'noise_filtering',
        priority: 3,
        targetRegions: []
      };
    }

    if (criticalIssues.some(issue => issue.type === 'geometric_validation')) {
      return {
        strategy: 'alternative_method',
        priority: 2,
        targetRegions: []
      };
    }

    return {
      strategy: 'manual_review',
      priority: 1,
      targetRegions: []
    };
  }
}
