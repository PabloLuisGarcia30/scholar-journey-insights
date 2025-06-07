
interface LocalGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: 'local_mcq' | 'local_confident' | 'local_enhanced' | 'requires_ai';
  reasoning?: string;
  qualityFlags?: {
    bubbleQuality: string;
    reviewRequired: boolean;
    confidenceAdjusted: boolean;
  };
}

interface QuestionClassification {
  questionNumber: number;
  isEasyMCQ: boolean;
  confidence: number;
  detectionMethod: string;
  shouldUseLocalGrading: boolean;
  fallbackReason?: string;
  enhancedAssessment?: {
    bubbleQuality: string;
    qualityScore: number;
    reviewFlag: boolean;
  };
}

export class LocalGradingService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85; // Slightly higher for enhanced system
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6; // Lowered to catch more cases
  private static readonly ENHANCED_CONFIDENCE_THRESHOLD = 0.4; // New threshold for enhanced handling

  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
    let confidence = 0;
    let isEasyMCQ = false;
    let detectionMethod = 'none';
    let shouldUseLocal = false;
    let enhancedAssessment = null;

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

    // Enhanced detection analysis
    if (question.detectedAnswer) {
      confidence = question.detectedAnswer.confidence || 0;
      detectionMethod = question.detectedAnswer.detectionMethod || 'unknown';
      const bubbleQuality = question.detectedAnswer.bubbleQuality || 'unknown';
      const reviewFlag = question.detectedAnswer.reviewFlag || false;
      
      // Create enhanced assessment
      enhancedAssessment = {
        bubbleQuality,
        qualityScore: this.calculateQualityScore(question.detectedAnswer),
        reviewFlag
      };
      
      // Enhanced classification logic
      if (confidence >= this.HIGH_CONFIDENCE_THRESHOLD && 
          !reviewFlag && 
          (bubbleQuality === 'heavy' || bubbleQuality === 'medium')) {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
      // Medium confidence with quality checks
      else if (confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD && 
               !reviewFlag && 
               question.detectedAnswer.crossValidated &&
               bubbleQuality !== 'empty') {
        isEasyMCQ = true;
        shouldUseLocal = true;
      }
      // Enhanced threshold for borderline cases
      else if (confidence >= this.ENHANCED_CONFIDENCE_THRESHOLD &&
               bubbleQuality === 'light' &&
               question.detectedAnswer.crossValidated &&
               !reviewFlag) {
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
      enhancedAssessment,
      fallbackReason: shouldUseLocal ? undefined : this.getFallbackReason(confidence, question.detectedAnswer)
    };
  }

  private static calculateQualityScore(detectedAnswer: any): number {
    if (!detectedAnswer) return 0;
    
    let score = 0.5; // Base score
    
    // Adjust based on bubble quality
    switch (detectedAnswer.bubbleQuality) {
      case 'heavy': score += 0.4; break;
      case 'medium': score += 0.3; break;
      case 'light': score += 0.1; break;
      case 'empty': score -= 0.3; break;
      case 'overfilled': score -= 0.1; break;
    }
    
    // Adjust based on cross-validation
    if (detectedAnswer.crossValidated) score += 0.2;
    
    // Adjust based on detection method
    if (detectedAnswer.detectionMethod?.includes('bubble_clear')) score += 0.2;
    
    return Math.min(1.0, Math.max(0.0, score));
  }

  private static getFallbackReason(confidence: number, detectedAnswer: any): string {
    if (!detectedAnswer) return 'No answer detection data';
    
    const reasons = [];
    
    if (confidence < this.ENHANCED_CONFIDENCE_THRESHOLD) {
      reasons.push('Low confidence detection');
    }
    
    if (detectedAnswer.reviewFlag) {
      reasons.push('Flagged for manual review');
    }
    
    if (detectedAnswer.bubbleQuality === 'empty') {
      reasons.push('Empty bubble detected');
    }
    
    if (detectedAnswer.bubbleQuality === 'overfilled') {
      reasons.push('Overfilled bubble detected');
    }
    
    if (!detectedAnswer.crossValidated) {
      reasons.push('No cross-validation available');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Quality threshold not met';
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
        reasoning: classification.fallbackReason,
        qualityFlags: classification.enhancedAssessment ? {
          bubbleQuality: classification.enhancedAssessment.bubbleQuality,
          reviewRequired: classification.enhancedAssessment.reviewFlag,
          confidenceAdjusted: false
        } : undefined
      };
    }

    const studentAnswer = question.detectedAnswer?.selectedOption?.toUpperCase() || '';
    const correctAnswer = answerKey.correct_answer?.toUpperCase() || '';
    const isCorrect = studentAnswer === correctAnswer;
    const pointsPossible = answerKey.points || 1;
    const pointsEarned = isCorrect ? pointsPossible : 0;

    // Determine grading method based on confidence and quality
    let gradingMethod: LocalGradingResult['gradingMethod'] = 'local_mcq';
    if (classification.confidence >= this.HIGH_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_confident';
    } else if (classification.confidence >= this.ENHANCED_CONFIDENCE_THRESHOLD) {
      gradingMethod = 'local_enhanced';
    }

    // Enhanced quality flags
    const qualityFlags = classification.enhancedAssessment ? {
      bubbleQuality: classification.enhancedAssessment.bubbleQuality,
      reviewRequired: classification.enhancedAssessment.reviewFlag,
      confidenceAdjusted: classification.confidence < this.MEDIUM_CONFIDENCE_THRESHOLD
    } : undefined;

    return {
      questionNumber: question.questionNumber,
      isCorrect,
      pointsEarned,
      pointsPossible,
      confidence: classification.confidence,
      gradingMethod,
      reasoning: this.generateEnhancedReasoning(studentAnswer, correctAnswer, question.detectedAnswer),
      qualityFlags
    };
  }

  private static generateEnhancedReasoning(studentAnswer: string, correctAnswer: string, detectedAnswer: any): string {
    let reasoning = `Enhanced local grading: Student selected ${studentAnswer || 'no answer'}, correct answer is ${correctAnswer}`;
    
    if (detectedAnswer) {
      reasoning += ` (Bubble quality: ${detectedAnswer.bubbleQuality || 'unknown'})`;
      
      if (detectedAnswer.reviewFlag) {
        reasoning += ' [FLAGGED FOR REVIEW]';
      }
      
      if (detectedAnswer.processingNotes && detectedAnswer.processingNotes.length > 0) {
        reasoning += ` Notes: ${detectedAnswer.processingNotes.join(', ')}`;
      }
    }
    
    return reasoning;
  }

  static processQuestions(questions: any[], answerKeys: any[]): {
    localResults: LocalGradingResult[];
    aiRequiredQuestions: any[];
    summary: {
      totalQuestions: number;
      locallyGraded: number;
      requiresAI: number;
      localAccuracy: number;
      enhancedMetrics: {
        highConfidenceGraded: number;
        mediumConfidenceGraded: number;
        enhancedThresholdGraded: number;
        qualityFlagged: number;
        bubbleQualityDistribution: Record<string, number>;
      };
    };
  } {
    const localResults: LocalGradingResult[] = [];
    const aiRequiredQuestions: any[] = [];
    let locallyGradedCount = 0;
    
    // Enhanced metrics tracking
    let highConfidenceCount = 0;
    let mediumConfidenceCount = 0;
    let enhancedThresholdCount = 0;
    let qualityFlaggedCount = 0;
    const bubbleQualityDist: Record<string, number> = {};

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
        
        // Track enhanced metrics
        if (result.gradingMethod === 'local_confident') {
          highConfidenceCount++;
        } else if (result.gradingMethod === 'local_mcq') {
          mediumConfidenceCount++;
        } else if (result.gradingMethod === 'local_enhanced') {
          enhancedThresholdCount++;
        }
        
        if (result.qualityFlags?.reviewRequired) {
          qualityFlaggedCount++;
        }
        
        if (result.qualityFlags?.bubbleQuality) {
          const quality = result.qualityFlags.bubbleQuality;
          bubbleQualityDist[quality] = (bubbleQualityDist[quality] || 0) + 1;
        }
      }
    }

    return {
      localResults,
      aiRequiredQuestions,
      summary: {
        totalQuestions: questions.length,
        locallyGraded: locallyGradedCount,
        requiresAI: aiRequiredQuestions.length,
        localAccuracy: locallyGradedCount / questions.length,
        enhancedMetrics: {
          highConfidenceGraded: highConfidenceCount,
          mediumConfidenceGraded: mediumConfidenceCount,
          enhancedThresholdGraded: enhancedThresholdCount,
          qualityFlagged: qualityFlaggedCount,
          bubbleQualityDistribution: bubbleQualityDist
        }
      }
    };
  }

  static generateLocalFeedback(results: LocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = Math.round((correct / total) * 100);
    
    const qualityFlagged = results.filter(r => r.qualityFlags?.reviewRequired).length;
    const enhancedGraded = results.filter(r => r.gradingMethod === 'local_enhanced').length;
    
    let feedback = `Enhanced automated grading completed for ${total} multiple choice questions. Score: ${correct}/${total} (${percentage}%)`;
    
    if (enhancedGraded > 0) {
      feedback += `. ${enhancedGraded} questions graded using enhanced bubble analysis`;
    }
    
    if (qualityFlagged > 0) {
      feedback += `. ${qualityFlagged} questions flagged for review due to bubble quality concerns`;
    }
    
    return feedback;
  }

  static generateQualityReport(results: LocalGradingResult[]): {
    overallQuality: string;
    recommendations: string[];
    qualityDistribution: Record<string, number>;
  } {
    const qualityDist: Record<string, number> = {};
    const recommendations: string[] = [];
    
    results.forEach(result => {
      if (result.qualityFlags?.bubbleQuality) {
        const quality = result.qualityFlags.bubbleQuality;
        qualityDist[quality] = (qualityDist[quality] || 0) + 1;
      }
    });
    
    const totalWithQuality = Object.values(qualityDist).reduce((a, b) => a + b, 0);
    const lightBubbles = qualityDist['light'] || 0;
    const emptyBubbles = qualityDist['empty'] || 0;
    const overfilledBubbles = qualityDist['overfilled'] || 0;
    
    let overallQuality = 'excellent';
    
    if ((lightBubbles + emptyBubbles + overfilledBubbles) / totalWithQuality > 0.3) {
      overallQuality = 'needs_improvement';
      recommendations.push('Consider instructing students to fill bubbles more completely');
    } else if ((lightBubbles + emptyBubbles + overfilledBubbles) / totalWithQuality > 0.15) {
      overallQuality = 'good';
      recommendations.push('Some bubbles could be filled more clearly');
    }
    
    if (emptyBubbles > 0) {
      recommendations.push(`${emptyBubbles} questions appear to have no answer selected`);
    }
    
    if (overfilledBubbles > 0) {
      recommendations.push(`${overfilledBubbles} questions show potential erasure marks or overfilling`);
    }
    
    return {
      overallQuality,
      recommendations,
      qualityDistribution: qualityDist
    };
  }
}
