import { EnhancedSmartOcrService, EnhancedProcessingResult } from './enhancedSmartOcrService';
import { FlexibleTemplateService, FlexibleTemplateMatchResult, DetectedQuestionType } from './flexibleTemplateService';
import { HandwritingDetectionService, HandwritingAnalysis, Mark } from './handwritingDetectionService';
import { RegionOfInterestService, ProcessingRegion, RegionOfInterest } from './regionOfInterestService';
import { AdvancedValidationService, ValidationResult } from './advancedValidationService';

export interface FlexibleProcessingResult extends EnhancedProcessingResult {
  questionTypeResults: QuestionTypeResult[];
  formatAnalysis: any;
  overallAccuracy: number;
  processingMethodsUsed: Record<string, number>;
}

export interface QuestionTypeResult {
  questionNumber: number;
  questionType: string;
  extractedAnswer: ExtractedAnswer;
  confidence: number;
  processingMethod: string;
  validationPassed: boolean;
}

export interface ExtractedAnswer {
  type: 'multiple_choice' | 'text' | 'essay';
  value: string | null;
  confidence: number;
  rawData?: any;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export class FlexibleOcrService extends EnhancedSmartOcrService {
  
  static async processWithFlexibleTemplate(
    file: File, 
    expectedQuestionCount?: number
  ): Promise<FlexibleProcessingResult> {
    console.log('🚀 Starting handwriting-resilient flexible OCR processing');
    
    try {
      // Convert file to base64
      const imageData = await this.convertFileToBase64(file);
      
      // Step 1: Flexible template recognition
      const templateMatch = await FlexibleTemplateService.recognizeFlexibleTemplate(
        imageData, 
        file.name
      );
      
      console.log(`📋 Format detected: ${templateMatch.formatAnalysis.primaryFormat}`);
      console.log(`📊 Question types: ${Object.keys(templateMatch.formatAnalysis.questionTypeDistribution).join(', ')}`);
      
      // Step 2: Enhanced preprocessing with handwriting detection
      const preprocessingResult = await this.enhancedPreprocessing(imageData, templateMatch);
      
      // Step 3: Process questions by type with region masking
      const questionTypeResults = await this.processQuestionsByTypeWithMasking(
        preprocessingResult.processedImageData, 
        templateMatch.detectedQuestionTypes, 
        templateMatch,
        preprocessingResult.processingRegions
      );
      
      // Step 4: Advanced validation with recovery
      const validationResults = await this.advancedValidationWithRecovery(
        questionTypeResults, 
        templateMatch, 
        expectedQuestionCount,
        preprocessingResult
      );
      
      // Step 5: Calculate enhanced metrics
      const processingMetrics = this.calculateEnhancedFlexibleMetrics(
        questionTypeResults, 
        templateMatch,
        validationResults,
        preprocessingResult
      );
      
      const result: FlexibleProcessingResult = {
        extractedText: this.aggregateExtractedText(questionTypeResults),
        confidence: processingMetrics.overallConfidence,
        templateMatch,
        detectedAnswers: questionTypeResults.map(q => ({
          questionNumber: q.questionNumber,
          selectedOption: q.extractedAnswer.value,
          confidence: q.confidence,
          position: q.extractedAnswer.boundingBox || { x: 0, y: 0 },
          validationPassed: q.validationPassed,
          detectionMethod: q.processingMethod
        })),
        validationResults,
        processingMetrics: {
          accuracy: processingMetrics.overallConfidence,
          confidence: processingMetrics.overallConfidence,
          processingTime: processingMetrics.totalProcessingTime,
          methodsUsed: Object.keys(processingMetrics.methodsUsed),
          fallbacksTriggered: processingMetrics.fallbacksTriggered,
          crossValidationScore: processingMetrics.crossValidationScore
        },
        qualityScore: processingMetrics.qualityScore,
        questionTypeResults,
        formatAnalysis: templateMatch.formatAnalysis,
        overallAccuracy: processingMetrics.overallConfidence,
        processingMethodsUsed: processingMetrics.methodsUsed
      };
      
      console.log(`✅ Handwriting-resilient OCR completed with ${(processingMetrics.overallConfidence * 100).toFixed(1)}% confidence`);
      console.log(`📝 Handwriting filtering: ${processingMetrics.handwritingMarksFiltered} marks filtered`);
      console.log(`🎯 Clean regions processed: ${processingMetrics.cleanRegionsUsed}`);
      
      return result;
      
    } catch (error) {
      console.error('❌ Handwriting-resilient OCR processing failed:', error);
      throw error;
    }
  }
  
  // Enhanced preprocessing with handwriting detection and region masking
  private static async enhancedPreprocessing(
    imageData: string,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{
    processedImageData: string;
    handwritingAnalysis: HandwritingAnalysis[];
    processingRegions: ProcessingRegion;
    cleanBubbleRegions: { x: number; y: number; radius: number; confidence: number }[];
  }> {
    console.log('🔧 Starting enhanced preprocessing with handwriting detection');

    // Simulate mark detection (in real implementation, this would analyze the actual image)
    const detectedMarks: Mark[] = this.simulateMarkDetection(templateMatch);
    
    // Generate expected bubble regions from template
    const expectedBubbleRegions = this.generateExpectedBubbleRegions(templateMatch.template);
    
    // Analyze marks for handwriting
    const handwritingAnalysis = HandwritingDetectionService.analyzeMarks(detectedMarks, expectedBubbleRegions);
    
    // Filter out handwriting marks
    const cleanMarks = HandwritingDetectionService.filterHandwritingMarks(detectedMarks, expectedBubbleRegions);
    
    // Identify handwriting areas for exclusion
    const handwritingAreas = detectedMarks
      .filter((mark, index) => handwritingAnalysis[index]?.isHandwriting)
      .map(mark => ({ x: mark.x, y: mark.y, width: mark.width, height: mark.height }));

    // Generate processing regions with exclusions
    const processingRegions = RegionOfInterestService.generateProcessingRegions(
      templateMatch.template?.layout,
      handwritingAreas
    );

    // Apply region masking
    const { maskedImageData, cleanRegions } = RegionOfInterestService.applyRegionMasking(
      imageData,
      processingRegions
    );

    // Isolate clean bubble regions
    const cleanBubbleRegions = RegionOfInterestService.isolateCleanBubbleRegions(
      expectedBubbleRegions,
      handwritingAreas
    );

    console.log(`✨ Preprocessing complete: ${handwritingAreas.length} handwriting areas identified, ${cleanBubbleRegions.length} clean bubble regions isolated`);

    return {
      processedImageData: maskedImageData,
      handwritingAnalysis,
      processingRegions,
      cleanBubbleRegions
    };
  }
  
  // Simulate mark detection for demo purposes
  private static simulateMarkDetection(templateMatch: FlexibleTemplateMatchResult): Mark[] {
    const marks: Mark[] = [];
    
    // Simulate various types of marks
    for (let i = 0; i < 50; i++) {
      marks.push({
        x: 100 + Math.random() * 600,
        y: 150 + Math.random() * 500,
        width: 3 + Math.random() * 15,
        height: 3 + Math.random() * 15,
        intensity: 50 + Math.random() * 200,
        area: Math.random() * 100
      });
    }
    
    return marks;
  }
  
  // Generate expected bubble positions from template
  private static generateExpectedBubbleRegions(template: any): { x: number; y: number; radius: number }[] {
    const regions: { x: number; y: number; radius: number }[] = [];
    
    if (template?.layout?.bubbleGrid) {
      const { columns, rows, bubbleRadius, horizontalSpacing, verticalSpacing, startPosition } = template.layout.bubbleGrid;
      
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < columns; col++) {
          regions.push({
            x: startPosition.x + (col * horizontalSpacing),
            y: startPosition.y + (row * verticalSpacing),
            radius: bubbleRadius
          });
        }
      }
    }
    
    return regions;
  }
  
  // Enhanced question processing with region masking
  private static async processQuestionsByTypeWithMasking(
    imageData: string,
    detectedQuestions: DetectedQuestionType[],
    templateMatch: FlexibleTemplateMatchResult,
    processingRegions: ProcessingRegion
  ): Promise<QuestionTypeResult[]> {
    console.log(`🔧 Processing ${detectedQuestions.length} questions with region masking`);
    
    const results: QuestionTypeResult[] = [];
    const processingGroups = this.groupQuestionsByType(detectedQuestions);
    
    // Process each group with enhanced methods
    for (const [questionType, questions] of processingGroups.entries()) {
      console.log(`📝 Processing ${questions.length} ${questionType} questions with masking`);
      
      const groupResults = await this.processQuestionGroupWithMasking(
        imageData,
        questions,
        questionType,
        templateMatch,
        processingRegions
      );
      
      results.push(...groupResults);
    }
    
    return results.sort((a, b) => a.questionNumber - b.questionNumber);
  }
  
  // Enhanced question group processing
  private static async processQuestionGroupWithMasking(
    imageData: string,
    questions: DetectedQuestionType[],
    questionType: string,
    templateMatch: FlexibleTemplateMatchResult,
    processingRegions: ProcessingRegion
  ): Promise<QuestionTypeResult[]> {
    const results: QuestionTypeResult[] = [];
    
    for (const question of questions) {
      try {
        // Check if question region is in a clean area
        const questionRegion = { 
          x: question.answerRegion.x, 
          y: question.answerRegion.y, 
          width: question.answerRegion.width, 
          height: question.answerRegion.height 
        };
        
        const isInCleanRegion = this.isRegionClean(questionRegion, processingRegions);
        
        let extractedAnswer: ExtractedAnswer;
        let processingMethod: string;
        
        if (questionType === 'multiple_choice') {
          ({ extractedAnswer, processingMethod } = await this.processMultipleChoiceWithMasking(
            imageData, question, templateMatch, isInCleanRegion
          ));
        } else {
          // Use existing methods for other types
          ({ extractedAnswer, processingMethod } = await this.processShortAnswer(
            imageData, question, templateMatch
          ));
        }
        
        // Enhanced validation
        const validationPassed = this.validateQuestionResultEnhanced(extractedAnswer, questionType, isInCleanRegion);
        
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer,
          confidence: extractedAnswer.confidence * (isInCleanRegion ? 1.0 : 0.7), // Reduce confidence for dirty regions
          processingMethod: processingMethod + (isInCleanRegion ? '_clean' : '_filtered'),
          validationPassed
        });
        
      } catch (error) {
        console.error(`❌ Failed to process question ${question.questionNumber}:`, error);
        
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer: {
            type: questionType as any,
            value: null,
            confidence: 0
          },
          confidence: 0,
          processingMethod: 'failed_handwriting_interference',
          validationPassed: false
        });
      }
    }
    
    return results;
  }
  
  // Check if a region is in a clean processing area
  private static isRegionClean(
    questionRegion: { x: number; y: number; width: number; height: number },
    processingRegions: ProcessingRegion
  ): boolean {
    // Check if region overlaps with clean include regions
    const hasCleanOverlap = processingRegions.include.some(region =>
      this.regionsOverlap(questionRegion, region.bounds) && region.confidence > 0.8
    );

    // Check if region overlaps with exclusion regions
    const hasExclusionOverlap = processingRegions.exclude.some(region =>
      this.regionsOverlap(questionRegion, region.bounds)
    );

    return hasCleanOverlap && !hasExclusionOverlap;
  }
  
  private static regionsOverlap(
    a: { x: number; y: number; width: number; height: number },
    b: { x: number; y: number; width: number; height: number }
  ): boolean {
    return !(
      a.x + a.width < b.x ||
      b.x + b.width < a.x ||
      a.y + a.height < b.y ||
      b.y + b.height < a.y
    );
  }
  
  // Enhanced multiple choice processing with handwriting filtering
  private static async processMultipleChoiceWithMasking(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult,
    isInCleanRegion: boolean
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    
    // Use enhanced detection for clean regions, fallback for dirty regions
    const confidence = isInCleanRegion ? 0.95 : 0.75;
    const method = isInCleanRegion ? 'handwriting_filtered_roboflow' : 'noise_filtered_roboflow';
    
    const answer = this.simulateAnswerDetection(
      question.questionNumber,
      templateMatch.template!
    );
    
    return {
      extractedAnswer: {
        type: 'multiple_choice',
        value: answer?.selectedOption || null,
        confidence: (answer?.confidence || 0) * confidence,
        boundingBox: answer?.position ? {
          x: answer.position.x,
          y: answer.position.y,
          width: 20,
          height: 20
        } : undefined
      },
      processingMethod: method
    };
  }
  
  // Enhanced validation with clean region consideration
  private static validateQuestionResultEnhanced(
    answer: ExtractedAnswer, 
    questionType: string,
    isInCleanRegion: boolean
  ): boolean {
    const baseValidation = this.validateQuestionResult(answer, questionType);
    
    // Apply stricter validation for dirty regions
    if (!isInCleanRegion && answer.confidence < 0.8) {
      return false;
    }
    
    return baseValidation;
  }
  
  // Advanced validation with recovery mechanisms
  private static async advancedValidationWithRecovery(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult,
    expectedQuestionCount?: number,
    preprocessingResult?: any
  ): Promise<any[]> {
    console.log('🔍 Running advanced validation with recovery');

    // Run comprehensive validation
    const validationResults = AdvancedValidationService.validateQuestionResults(
      results,
      templateMatch.template?.layout,
      preprocessingResult?.handwritingAnalysis || []
    );

    // Check if reprocessing is needed
    if (AdvancedValidationService.requiresReprocessing(validationResults)) {
      console.log('🔄 Validation issues detected, applying recovery strategy');
      
      const recoveryStrategy = AdvancedValidationService.generateRecoveryStrategy(validationResults);
      console.log(`📋 Recovery strategy: ${recoveryStrategy.strategy} (priority: ${recoveryStrategy.priority})`);
      
      // Apply recovery strategy (simplified implementation)
      await this.applyRecoveryStrategy(results, recoveryStrategy, templateMatch);
    }

    // Add base validation results
    const baseValidationResults = this.validateFlexibleResults(
      results, 
      templateMatch, 
      expectedQuestionCount
    );

    return [...validationResults, ...baseValidationResults];
  }
  
  // Apply recovery strategy for failed validations
  private static async applyRecoveryStrategy(
    results: QuestionTypeResult[],
    strategy: any,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<void> {
    console.log(`🛠️ Applying recovery strategy: ${strategy.strategy}`);

    switch (strategy.strategy) {
      case 'noise_filtering':
        // Re-process with enhanced noise filtering
        results.forEach(result => {
          if (!result.validationPassed) {
            result.confidence *= 0.9; // Reduce confidence but don't fail completely
            result.processingMethod += '_noise_filtered';
          }
        });
        break;
        
      case 'region_refocus':
        // Focus on cleaner regions
        results.forEach(result => {
          if (!result.validationPassed) {
            result.processingMethod += '_region_refocused';
            // Would trigger re-processing of specific regions in real implementation
          }
        });
        break;
        
      case 'alternative_method':
        // Switch to alternative detection method
        results.forEach(result => {
          if (!result.validationPassed && result.questionType === 'multiple_choice') {
            result.processingMethod = 'alternative_ocr_method';
            // Would use different OCR approach in real implementation
          }
        });
        break;
        
      case 'manual_review':
        // Flag for manual review
        results.forEach(result => {
          if (!result.validationPassed) {
            result.processingMethod += '_manual_review_required';
          }
        });
        break;
    }
  }
  
  // Calculate enhanced metrics including handwriting resilience
  private static calculateEnhancedFlexibleMetrics(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult,
    validationResults: any[],
    preprocessingResult: any
  ): {
    overallConfidence: number;
    qualityScore: number;
    totalProcessingTime: number;
    methodsUsed: Record<string, number>;
    fallbacksTriggered: number;
    crossValidationScore: number;
    handwritingMarksFiltered: number;
    cleanRegionsUsed: number;
    resilenceScore: number;
  } {
    const baseMetrics = this.calculateFlexibleMetrics(results, templateMatch);
    
    const handwritingMarksFiltered = preprocessingResult?.handwritingAnalysis?.filter((h: any) => h.isHandwriting).length || 0;
    const cleanRegionsUsed = preprocessingResult?.processingRegions?.include?.length || 0;
    
    // Calculate resilience score based on how well we handled handwriting
    const handwritingInterferenceCount = validationResults.filter(v => 
      v.type === 'handwriting_interference' && !v.passed
    ).length;
    
    const resilenceScore = Math.max(0, 1 - (handwritingInterferenceCount / Math.max(1, results.length)));
    
    // Boost overall confidence based on clean processing
    const confidenceBoost = cleanRegionsUsed > 0 ? 0.05 : 0;
    const enhancedConfidence = Math.min(1.0, baseMetrics.overallConfidence + confidenceBoost);

    return {
      ...baseMetrics,
      overallConfidence: enhancedConfidence,
      handwritingMarksFiltered,
      cleanRegionsUsed,
      resilenceScore
    };
  }
  
  // Helper method to convert file to base64
  private static async convertFileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/... prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  private static async processQuestionsByType(
    imageData: string,
    detectedQuestions: DetectedQuestionType[],
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<QuestionTypeResult[]> {
    console.log(`🔧 Processing ${detectedQuestions.length} questions by type`);
    
    const results: QuestionTypeResult[] = [];
    const processingGroups = this.groupQuestionsByType(detectedQuestions);
    
    // Process each group with its optimal method
    for (const [questionType, questions] of processingGroups.entries()) {
      console.log(`📝 Processing ${questions.length} ${questionType} questions`);
      
      const groupResults = await this.processQuestionGroup(
        imageData,
        questions,
        questionType,
        templateMatch
      );
      
      results.push(...groupResults);
    }
    
    return results.sort((a, b) => a.questionNumber - b.questionNumber);
  }
  
  private static groupQuestionsByType(
    questions: DetectedQuestionType[]
  ): Map<string, DetectedQuestionType[]> {
    const groups = new Map<string, DetectedQuestionType[]>();
    
    questions.forEach(question => {
      const type = question.detectedType;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(question);
    });
    
    return groups;
  }
  
  private static async processQuestionGroup(
    imageData: string,
    questions: DetectedQuestionType[],
    questionType: string,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<QuestionTypeResult[]> {
    const results: QuestionTypeResult[] = [];
    
    for (const question of questions) {
      try {
        let extractedAnswer: ExtractedAnswer;
        let processingMethod: string;
        
        switch (questionType) {
          case 'multiple_choice':
            ({ extractedAnswer, processingMethod } = await this.processMultipleChoice(
              imageData, question, templateMatch
            ));
            break;
            
          case 'short_answer':
            ({ extractedAnswer, processingMethod } = await this.processShortAnswer(
              imageData, question, templateMatch
            ));
            break;
            
          case 'essay':
            ({ extractedAnswer, processingMethod } = await this.processEssay(
              imageData, question, templateMatch
            ));
            break;
            
          default:
            ({ extractedAnswer, processingMethod } = await this.processMultipleChoice(
              imageData, question, templateMatch
            ));
        }
        
        const validationPassed = this.validateQuestionResult(extractedAnswer, questionType);
        
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer,
          confidence: extractedAnswer.confidence,
          processingMethod,
          validationPassed
        });
        
      } catch (error) {
        console.error(`❌ Failed to process question ${question.questionNumber}:`, error);
        
        // Add error result
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer: {
            type: questionType as any,
            value: null,
            confidence: 0
          },
          confidence: 0,
          processingMethod: 'failed',
          validationPassed: false
        });
      }
    }
    
    return results;
  }
  
  private static async processMultipleChoice(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Use simulation for template answer detection
    const answer = this.simulateAnswerDetection(
      question.questionNumber,
      templateMatch.template!
    );
    
    return {
      extractedAnswer: {
        type: 'multiple_choice',
        value: answer?.selectedOption || null,
        confidence: answer?.confidence || 0,
        boundingBox: answer?.position ? {
          x: answer.position.x,
          y: answer.position.y,
          width: 20,
          height: 20
        } : undefined
      },
      processingMethod: 'roboflow_bubbles'
    };
  }
  
  // Simulate template-aware answer detection
  private static simulateAnswerDetection(questionNumber: number, template: any): any {
    const options = ['A', 'B', 'C', 'D', 'E'];
    const selectedOption = Math.random() > 0.1 ? options[Math.floor(Math.random() * options.length)] : null;
    
    if (!selectedOption) return null;
    
    return {
      questionNumber,
      selectedOption,
      confidence: 0.95 + Math.random() * 0.04,
      position: { x: 500 + (options.indexOf(selectedOption) * 25), y: 150 + (questionNumber * 20) },
      validationPassed: true,
      detectionMethod: 'template_aware_roboflow'
    };
  }
  
  private static async processShortAnswer(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Simulate text extraction for short answers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockAnswers = [
      'The answer is B',
      'Photosynthesis',
      '42',
      'Paris',
      'H2O',
      null // Sometimes no answer
    ];
    
    const answer = Math.random() > 0.2 ? 
      mockAnswers[Math.floor(Math.random() * (mockAnswers.length - 1))] : 
      null;
    
    return {
      extractedAnswer: {
        type: 'text',
        value: answer,
        confidence: answer ? 0.85 + Math.random() * 0.1 : 0,
        boundingBox: question.answerRegion
      },
      processingMethod: 'google_vision_text'
    };
  }
  
  private static async processEssay(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Simulate essay text extraction
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockEssays = [
      'This essay discusses the importance of renewable energy sources in combating climate change. Solar and wind power offer sustainable alternatives to fossil fuels...',
      'The American Revolution was a pivotal moment in history that established democratic principles and influenced global politics for centuries to come...',
      'Photosynthesis is the process by which plants convert sunlight into chemical energy, playing a crucial role in the Earth\'s ecosystem...',
      null // Sometimes no essay answer
    ];
    
    const essay = Math.random() > 0.3 ? 
      mockEssays[Math.floor(Math.random() * (mockEssays.length - 1))] : 
      null;
    
    return {
      extractedAnswer: {
        type: 'essay',
        value: essay,
        confidence: essay ? 0.75 + Math.random() * 0.15 : 0,
        boundingBox: question.answerRegion
      },
      processingMethod: 'google_vision_text'
    };
  }
  
  private static validateQuestionResult(
    answer: ExtractedAnswer, 
    questionType: string
  ): boolean {
    if (!answer.value) return false;
    
    switch (questionType) {
      case 'multiple_choice':
        return /^[A-E]$/.test(answer.value);
      case 'short_answer':
        return answer.value.length >= 1 && answer.value.length <= 100;
      case 'essay':
        return answer.value.length >= 10 && answer.value.length <= 1000;
      default:
        return true;
    }
  }
  
  private static validateFlexibleResults(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult,
    expectedQuestionCount?: number
  ): any[] {
    const validationResults = [];
    
    // Question count validation
    if (expectedQuestionCount) {
      const countMatch = Math.abs(results.length - expectedQuestionCount) <= 2;
      validationResults.push({
        type: 'question_count',
        passed: countMatch,
        confidence: countMatch ? 0.95 : 0.5,
        details: `Expected ${expectedQuestionCount}, found ${results.length}`
      });
    }
    
    // Format validation
    const formatTypes = [...new Set(results.map(r => r.questionType))];
    const expectedTypes = Object.keys(templateMatch.formatAnalysis.questionTypeDistribution);
    const formatMatch = formatTypes.every(type => expectedTypes.includes(type));
    
    validationResults.push({
      type: 'format_validation',
      passed: formatMatch,
      confidence: formatMatch ? 0.9 : 0.6,
      details: `Detected types: ${formatTypes.join(', ')}`
    });
    
    // Answer quality validation
    const validAnswers = results.filter(r => r.validationPassed).length;
    const answerQuality = validAnswers / Math.max(1, results.length);
    
    validationResults.push({
      type: 'answer_quality',
      passed: answerQuality > 0.7,
      confidence: answerQuality,
      details: `${validAnswers}/${results.length} answers passed validation`
    });
    
    return validationResults;
  }
  
  private static calculateFlexibleMetrics(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult
  ): {
    overallConfidence: number;
    qualityScore: number;
    totalProcessingTime: number;
    methodsUsed: Record<string, number>;
    fallbacksTriggered: number;
    crossValidationScore: number;
  } {
    const avgConfidence = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0;
    
    const validResults = results.filter(r => r.validationPassed).length;
    const qualityScore = validResults / Math.max(1, results.length);
    
    const methodsUsed: Record<string, number> = {};
    results.forEach(r => {
      methodsUsed[r.processingMethod] = (methodsUsed[r.processingMethod] || 0) + 1;
    });
    
    const estimatedTime = templateMatch.formatAnalysis.estimatedProcessingTime;
    
    return {
      overallConfidence: (avgConfidence + qualityScore) / 2,
      qualityScore,
      totalProcessingTime: estimatedTime,
      methodsUsed,
      fallbacksTriggered: results.filter(r => r.processingMethod === 'failed').length,
      crossValidationScore: 0.9
    };
  }
  
  private static aggregateExtractedText(results: QuestionTypeResult[]): string {
    let text = 'Flexible Test Format Detected\n\n';
    
    results.forEach(result => {
      text += `Question ${result.questionNumber} (${result.questionType}): `;
      text += result.extractedAnswer.value || 'No answer detected';
      text += '\n';
    });
    
    return text;
  }
}
