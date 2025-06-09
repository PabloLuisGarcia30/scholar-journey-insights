
import { SmartOcrService, DocumentClassification, OcrMethod, ProcessingMetrics } from './smartOcrService';
import { TestTemplateService, TemplateMatchResult, TestTemplate } from './testTemplateService';

export interface TemplateAwareOcrConfig {
  template: TestTemplate | null;
  templateConfidence: number;
  optimizedMethods: OcrMethod[];
  preprocessing: TemplatePreprocessingConfig;
  validation: TemplateValidationConfig;
}

export interface TemplatePreprocessingConfig {
  enableRotationCorrection: boolean;
  enableGridAlignment: boolean;
  enableBubbleEnhancement: boolean;
  contrastBoost: number;
  noiseReduction: boolean;
}

export interface TemplateValidationConfig {
  validateAnswerPositions: boolean;
  validateQuestionCount: boolean;
  validateRequiredElements: boolean;
  enableCrossValidation: boolean;
}

export interface EnhancedProcessingResult {
  extractedText: string;
  confidence: number;
  templateMatch: TemplateMatchResult;
  detectedAnswers: DetectedAnswer[];
  validationResults: ValidationResult[];
  processingMetrics: ProcessingMetrics;
  qualityScore: number;
}

export interface DetectedAnswer {
  questionNumber: number;
  selectedOption: string | null;
  confidence: number;
  position: { x: number; y: number };
  validationPassed: boolean;
  detectionMethod: string;
}

export interface ValidationResult {
  type: 'answer_position' | 'question_count' | 'required_elements' | 'cross_validation';
  passed: boolean;
  confidence: number;
  details: string;
}

export class EnhancedSmartOcrService extends SmartOcrService {
  
  static async processWithTemplate(
    file: File, 
    expectedQuestionCount?: number
  ): Promise<EnhancedProcessingResult> {
    console.log('🚀 Starting enhanced OCR processing with template recognition');
    
    try {
      // Convert file to base64 for processing
      const imageData = await this.fileToBase64(file);
      
      // Step 1: Recognize template
      const templateMatch = await TestTemplateService.recognizeTemplate(imageData, file.name);
      console.log(`📋 Template recognition: ${templateMatch.isMatch ? 'SUCCESS' : 'FAILED'} (${(templateMatch.confidence * 100).toFixed(1)}%)`);
      
      // Step 2: Configure OCR based on template
      const ocrConfig = this.generateTemplateAwareConfig(templateMatch, file);
      
      // Step 3: Process with template-optimized settings
      const processingResult = await this.processWithOptimizedConfig(imageData, ocrConfig, file.name);
      
      // Step 4: Validate results against template expectations
      const validationResults = this.validateWithTemplate(processingResult, templateMatch, expectedQuestionCount);
      
      // Step 5: Calculate quality score
      const qualityScore = this.calculateQualityScore(processingResult, validationResults, templateMatch);
      
      const result: EnhancedProcessingResult = {
        extractedText: processingResult.extractedText,
        confidence: processingResult.confidence,
        templateMatch,
        detectedAnswers: processingResult.detectedAnswers,
        validationResults,
        processingMetrics: processingResult.metrics,
        qualityScore
      };
      
      console.log(`✅ Enhanced OCR completed with quality score: ${(qualityScore * 100).toFixed(1)}%`);
      return result;
      
    } catch (error) {
      console.error('❌ Enhanced OCR processing failed:', error);
      throw error;
    }
  }
  
  private static generateTemplateAwareConfig(
    templateMatch: TemplateMatchResult, 
    file: File
  ): TemplateAwareOcrConfig {
    console.log('⚙️ Generating template-aware OCR configuration');
    
    const baseClassification = {
      type: 'bubble_sheet' as const,
      confidence: templateMatch.confidence,
      characteristics: ['Test Creator Format'],
      recommendedMethods: []
    };
    
    // Optimize methods based on template match
    const optimizedMethods: OcrMethod[] = [];
    
    if (templateMatch.isMatch && templateMatch.template) {
      // High confidence template match - use optimized methods
      optimizedMethods.push(
        { name: 'roboflow_bubbles', confidence: 0.95, processingTime: 2000, accuracy: 0.98, cost: 0.02 },
        { name: 'google_vision', confidence: 0.90, processingTime: 1500, accuracy: 0.95, cost: 0.01 }
      );
    } else {
      // Fallback to standard methods
      optimizedMethods.push(
        { name: 'google_vision', confidence: 0.80, processingTime: 3000, accuracy: 0.85, cost: 0.01 },
        { name: 'roboflow_bubbles', confidence: 0.70, processingTime: 4000, accuracy: 0.80, cost: 0.02 }
      );
    }
    
    const preprocessing: TemplatePreprocessingConfig = {
      enableRotationCorrection: templateMatch.template?.preprocessing.rotationCorrection ?? true,
      enableGridAlignment: templateMatch.template?.preprocessing.gridAlignment ?? true,
      enableBubbleEnhancement: templateMatch.template?.preprocessing.bubbleEnhancement ?? true,
      contrastBoost: templateMatch.template?.preprocessing.contrastEnhancement ?? 1.2,
      noiseReduction: templateMatch.template?.preprocessing.noiseReduction ?? true
    };
    
    const validation: TemplateValidationConfig = {
      validateAnswerPositions: templateMatch.isMatch,
      validateQuestionCount: templateMatch.isMatch,
      validateRequiredElements: templateMatch.isMatch,
      enableCrossValidation: templateMatch.confidence < 0.9
    };
    
    return {
      template: templateMatch.template,
      templateConfidence: templateMatch.confidence,
      optimizedMethods,
      preprocessing,
      validation
    };
  }
  
  private static async processWithOptimizedConfig(
    imageData: string, 
    config: TemplateAwareOcrConfig, 
    fileName: string
  ): Promise<{
    extractedText: string;
    confidence: number;
    detectedAnswers: DetectedAnswer[];
    metrics: ProcessingMetrics;
  }> {
    console.log('🔧 Processing with optimized template configuration');
    
    const startTime = Date.now();
    let extractedText = '';
    let overallConfidence = 0;
    const detectedAnswers: DetectedAnswer[] = [];
    
    try {
      // Primary method processing
      const primaryMethod = config.optimizedMethods[0];
      console.log(`🎯 Using primary method: ${primaryMethod.name}`);
      
      // Simulate enhanced processing with template knowledge
      if (config.template) {
        // Template-aware processing
        extractedText = await this.simulateTemplateAwareOCR(imageData, config.template);
        overallConfidence = Math.min(0.98, primaryMethod.confidence + 0.1); // Template boost
        
        // Generate template-aware answer detection
        const questionCount = this.extractQuestionCount(extractedText);
        for (let i = 1; i <= questionCount; i++) {
          const answer = this.simulateTemplateAnswerDetection(i, config.template);
          if (answer) {
            detectedAnswers.push(answer);
          }
        }
      } else {
        // Standard processing
        extractedText = await this.simulateStandardOCR(imageData);
        overallConfidence = primaryMethod.confidence;
      }
      
      const processingTime = Date.now() - startTime;
      
      const metrics: ProcessingMetrics = {
        accuracy: overallConfidence,
        confidence: overallConfidence,
        processingTime,
        methodsUsed: [primaryMethod.name],
        fallbacksTriggered: 0,
        crossValidationScore: config.validation.enableCrossValidation ? 0.95 : undefined
      };
      
      return {
        extractedText,
        confidence: overallConfidence,
        detectedAnswers,
        metrics
      };
      
    } catch (error) {
      console.error('❌ Optimized processing failed:', error);
      throw error;
    }
  }
  
  private static validateWithTemplate(
    processingResult: any, 
    templateMatch: TemplateMatchResult, 
    expectedQuestionCount?: number
  ): ValidationResult[] {
    const validationResults: ValidationResult[] = [];
    
    if (!templateMatch.isMatch || !templateMatch.template) {
      validationResults.push({
        type: 'required_elements',
        passed: false,
        confidence: 0.5,
        details: 'No template match - basic validation only'
      });
      return validationResults;
    }
    
    // Validate question count
    if (expectedQuestionCount) {
      const detectedCount = processingResult.detectedAnswers.length;
      const countMatch = Math.abs(detectedCount - expectedQuestionCount) <= 1; // Allow 1 question tolerance
      
      validationResults.push({
        type: 'question_count',
        passed: countMatch,
        confidence: countMatch ? 0.95 : 0.3,
        details: `Expected ${expectedQuestionCount}, detected ${detectedCount}`
      });
    }
    
    // Validate answer positions
    const validPositions = processingResult.detectedAnswers.filter((answer: DetectedAnswer) => 
      answer.validationPassed
    ).length;
    const positionValidation = validPositions / Math.max(1, processingResult.detectedAnswers.length);
    
    validationResults.push({
      type: 'answer_position',
      passed: positionValidation > 0.8,
      confidence: positionValidation,
      details: `${validPositions}/${processingResult.detectedAnswers.length} positions validated`
    });
    
    // Validate required elements
    const requiredElements = templateMatch.detectedElements.filter(el => 
      templateMatch.template!.layout.expectedElements.some(req => req.type === el.type && req.required)
    );
    const elementsValidation = requiredElements.length > 0;
    
    validationResults.push({
      type: 'required_elements',
      passed: elementsValidation,
      confidence: elementsValidation ? 0.9 : 0.2,
      details: `${requiredElements.length} required elements found`
    });
    
    return validationResults;
  }
  
  private static calculateQualityScore(
    processingResult: any, 
    validationResults: ValidationResult[], 
    templateMatch: TemplateMatchResult
  ): number {
    const baseScore = processingResult.confidence;
    const templateBonus = templateMatch.isMatch ? 0.1 : 0;
    const validationScore = validationResults.reduce((sum, result) => 
      sum + (result.passed ? result.confidence : 0), 0) / validationResults.length;
    
    return Math.min(1.0, (baseScore + templateBonus + validationScore) / 2);
  }
  
  // Helper methods for simulation (in real implementation, these would use actual image processing)
  private static async fileToBase64(file: File): Promise<string> {
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
  
  private static async simulateTemplateAwareOCR(imageData: string, template: TestTemplate): Promise<string> {
    // Simulate enhanced OCR with template knowledge
    await new Promise(resolve => setTimeout(resolve, 1500)); // Faster processing
    return `Test Creator Generated Test\nExam: EXAM_${Date.now().toString().slice(-6)}\nStudent Name: _______________\n` +
           `Student ID: _______________\nTotal Questions: 20\nGrade: 95%`;
  }
  
  private static async simulateStandardOCR(imageData: string): Promise<string> {
    // Simulate standard OCR
    await new Promise(resolve => setTimeout(resolve, 3000));
    return `Exam Document\nStudent: _______________\nQuestions and answers...`;
  }
  
  private static simulateTemplateAnswerDetection(questionNumber: number, template: TestTemplate): DetectedAnswer | null {
    // Simulate template-aware answer detection with high accuracy
    const options = ['A', 'B', 'C', 'D', 'E'];
    const selectedOption = Math.random() > 0.1 ? options[Math.floor(Math.random() * options.length)] : null;
    
    if (!selectedOption) return null;
    
    return {
      questionNumber,
      selectedOption,
      confidence: 0.95 + Math.random() * 0.04, // High confidence due to template
      position: { x: 500 + (options.indexOf(selectedOption) * 25), y: 150 + (questionNumber * 20) },
      validationPassed: true,
      detectionMethod: 'template_aware_roboflow'
    };
  }
  
  private static extractQuestionCount(text: string): number {
    const match = text.match(/Total Questions:\s*(\d+)/);
    return match ? parseInt(match[1]) : 20; // Default to 20 if not found
  }
}
