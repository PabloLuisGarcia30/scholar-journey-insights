
import { TestTemplateService, TestTemplate, BoundingBox, TemplateMatchResult } from './testTemplateService';

export interface FlexibleQuestionType {
  type: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false' | 'fill_blank';
  detectionMethod: 'bubble_detection' | 'text_extraction' | 'hybrid';
  validationRules: QuestionValidationRules;
}

export interface QuestionValidationRules {
  minAnswerLength?: number;
  maxAnswerLength?: number;
  expectedFormat?: RegExp;
  allowMultipleAnswers?: boolean;
  requireAnswer?: boolean;
}

export interface FlexibleTestTemplate extends TestTemplate {
  questionTypes: FlexibleQuestionType[];
  questionLayout: QuestionLayoutConfig;
  answerExtractionMethods: AnswerExtractionMethod[];
}

export interface QuestionLayoutConfig {
  questionsPerPage: number;
  questionSpacing: number;
  answerAreaType: 'bubbles' | 'text_box' | 'mixed';
  textBoxDimensions?: BoundingBox;
  bubblePositions?: { x: number; y: number; radius: number }[];
}

export interface AnswerExtractionMethod {
  questionType: string;
  primaryMethod: 'roboflow_bubbles' | 'google_vision_text' | 'hybrid_ocr';
  fallbackMethods: string[];
  confidenceThreshold: number;
  preprocessingSteps: PreprocessingStep[];
}

export interface PreprocessingStep {
  name: string;
  enabled: boolean;
  parameters: Record<string, any>;
}

export interface FlexibleTemplateMatchResult extends TemplateMatchResult {
  detectedQuestionTypes: DetectedQuestionType[];
  formatAnalysis: FormatAnalysis;
  recommendedExtractionMethods: Record<string, string>;
}

export interface DetectedQuestionType {
  questionNumber: number;
  detectedType: string;
  confidence: number;
  answerRegion: BoundingBox;
  extractionMethod: string;
}

export interface FormatAnalysis {
  primaryFormat: 'bubble_sheet' | 'text_based' | 'mixed_format';
  questionTypeDistribution: Record<string, number>;
  complexity: 'simple' | 'moderate' | 'complex';
  estimatedProcessingTime: number;
}

export class FlexibleTemplateService extends TestTemplateService {
  private static flexibleTemplates: Map<string, FlexibleTestTemplate> = new Map();

  static {
    this.initializeFlexibleTemplates();
  }

  private static initializeFlexibleTemplates(): void {
    // Test Creator Standard (Bubble Sheet)
    const testCreatorBubbleTemplate: FlexibleTestTemplate = {
      ...this.getTemplate('test_creator_standard')!,
      questionTypes: [
        {
          type: 'multiple_choice',
          detectionMethod: 'bubble_detection',
          validationRules: {
            allowMultipleAnswers: false,
            requireAnswer: false
          }
        }
      ],
      questionLayout: {
        questionsPerPage: 50,
        questionSpacing: 20,
        answerAreaType: 'bubbles',
        bubblePositions: [
          { x: 500, y: 0, radius: 8 },
          { x: 525, y: 0, radius: 8 },
          { x: 550, y: 0, radius: 8 },
          { x: 575, y: 0, radius: 8 },
          { x: 600, y: 0, radius: 8 }
        ]
      },
      answerExtractionMethods: [
        {
          questionType: 'multiple_choice',
          primaryMethod: 'roboflow_bubbles',
          fallbackMethods: ['google_vision_text'],
          confidenceThreshold: 0.7,
          preprocessingSteps: [
            { name: 'bubble_enhancement', enabled: true, parameters: { contrast: 1.3 } },
            { name: 'grid_alignment', enabled: true, parameters: {} }
          ]
        }
      ]
    };

    // Test Creator Mixed Format
    const testCreatorMixedTemplate: FlexibleTestTemplate = {
      id: 'test_creator_mixed',
      name: 'Test Creator Mixed Format',
      type: 'test_creator_standard',
      layout: {
        headerRegion: { x: 0, y: 0, width: 100, height: 15 },
        questionRegions: [],
        bubbleGrid: {
          columns: 5,
          rows: 25,
          bubbleRadius: 8,
          horizontalSpacing: 25,
          verticalSpacing: 20,
          startPosition: { x: 500, y: 150 }
        },
        expectedElements: [
          {
            type: 'exam_id',
            pattern: /Exam:\s*([A-Z0-9\-_]+)/,
            position: { x: 60, y: 2, width: 35, height: 8 },
            required: true
          }
        ]
      },
      preprocessing: {
        rotationCorrection: true,
        contrastEnhancement: 1.2,
        noiseReduction: true,
        gridAlignment: true,
        bubbleEnhancement: true
      },
      validation: {
        expectedQuestionCount: 0,
        requiredElements: ['exam_id'],
        answerValidation: {
          allowMultipleAnswers: false,
          requireAllAnswers: false,
          validOptions: ['A', 'B', 'C', 'D', 'E']
        }
      },
      questionTypes: [
        {
          type: 'multiple_choice',
          detectionMethod: 'bubble_detection',
          validationRules: {
            allowMultipleAnswers: false,
            requireAnswer: false
          }
        },
        {
          type: 'short_answer',
          detectionMethod: 'text_extraction',
          validationRules: {
            minAnswerLength: 1,
            maxAnswerLength: 100,
            requireAnswer: false
          }
        },
        {
          type: 'essay',
          detectionMethod: 'text_extraction',
          validationRules: {
            minAnswerLength: 10,
            maxAnswerLength: 1000,
            requireAnswer: false
          }
        }
      ],
      questionLayout: {
        questionsPerPage: 25,
        questionSpacing: 30,
        answerAreaType: 'mixed',
        textBoxDimensions: { x: 50, y: 0, width: 400, height: 60 }
      },
      answerExtractionMethods: [
        {
          questionType: 'multiple_choice',
          primaryMethod: 'roboflow_bubbles',
          fallbackMethods: ['google_vision_text'],
          confidenceThreshold: 0.8,
          preprocessingSteps: [
            { name: 'bubble_enhancement', enabled: true, parameters: { contrast: 1.4 } }
          ]
        },
        {
          questionType: 'short_answer',
          primaryMethod: 'google_vision_text',
          fallbackMethods: ['hybrid_ocr'],
          confidenceThreshold: 0.7,
          preprocessingSteps: [
            { name: 'text_enhancement', enabled: true, parameters: { contrast: 1.2 } },
            { name: 'handwriting_filter', enabled: true, parameters: { threshold: 0.6 } }
          ]
        },
        {
          questionType: 'essay',
          primaryMethod: 'google_vision_text',
          fallbackMethods: ['hybrid_ocr'],
          confidenceThreshold: 0.6,
          preprocessingSteps: [
            { name: 'text_enhancement', enabled: true, parameters: { contrast: 1.1 } },
            { name: 'handwriting_filter', enabled: true, parameters: { threshold: 0.5 } }
          ]
        }
      ]
    };

    this.flexibleTemplates.set('test_creator_standard', testCreatorBubbleTemplate);
    this.flexibleTemplates.set('test_creator_mixed', testCreatorMixedTemplate);
  }

  static async recognizeFlexibleTemplate(
    imageData: string, 
    fileName: string
  ): Promise<FlexibleTemplateMatchResult> {
    console.log('🔍 Starting flexible template recognition for:', fileName);

    try {
      // Step 1: Basic template recognition
      const baseResult = await this.recognizeTemplate(imageData, fileName);
      
      // Step 2: Analyze question format and types
      const formatAnalysis = await this.analyzeQuestionFormat(imageData, baseResult);
      
      // Step 3: Detect individual question types
      const detectedQuestionTypes = await this.detectQuestionTypes(imageData, formatAnalysis);
      
      // Step 4: Recommend extraction methods
      const recommendedMethods = this.recommendExtractionMethods(
        detectedQuestionTypes, 
        formatAnalysis
      );

      // Step 5: Select best template match
      const flexibleTemplate = this.selectBestFlexibleTemplate(formatAnalysis);

      const result: FlexibleTemplateMatchResult = {
        ...baseResult,
        template: flexibleTemplate,
        detectedQuestionTypes,
        formatAnalysis,
        recommendedExtractionMethods: recommendedMethods
      };

      console.log(`📋 Flexible template recognition: ${formatAnalysis.primaryFormat} format detected`);
      console.log(`📊 Question types: ${Object.keys(formatAnalysis.questionTypeDistribution).join(', ')}`);
      
      return result;

    } catch (error) {
      console.error('❌ Flexible template recognition failed:', error);
      return {
        ...await this.recognizeTemplate(imageData, fileName),
        detectedQuestionTypes: [],
        formatAnalysis: {
          primaryFormat: 'bubble_sheet',
          questionTypeDistribution: { 'multiple_choice': 1.0 },
          complexity: 'simple',
          estimatedProcessingTime: 3000
        },
        recommendedExtractionMethods: { 'multiple_choice': 'roboflow_bubbles' }
      };
    }
  }

  private static async analyzeQuestionFormat(
    imageData: string, 
    baseResult: TemplateMatchResult
  ): Promise<FormatAnalysis> {
    // Simulate format analysis based on template detection
    const hasTextRegions = baseResult.detectedElements.some(el => 
      el.type === 'question_header' && el.content?.includes('short') || el.content?.includes('essay')
    );
    
    const hasBubbles = baseResult.detectedElements.some(el => 
      el.type === 'answer_box' || baseResult.isMatch
    );

    let primaryFormat: FormatAnalysis['primaryFormat'];
    let questionTypeDistribution: Record<string, number>;
    let complexity: FormatAnalysis['complexity'];
    let estimatedProcessingTime: number;

    if (hasBubbles && hasTextRegions) {
      primaryFormat = 'mixed_format';
      questionTypeDistribution = { 
        'multiple_choice': 0.6, 
        'short_answer': 0.3, 
        'essay': 0.1 
      };
      complexity = 'complex';
      estimatedProcessingTime = 8000;
    } else if (hasBubbles) {
      primaryFormat = 'bubble_sheet';
      questionTypeDistribution = { 'multiple_choice': 1.0 };
      complexity = 'simple';
      estimatedProcessingTime = 3000;
    } else {
      primaryFormat = 'text_based';
      questionTypeDistribution = { 
        'short_answer': 0.7, 
        'essay': 0.3 
      };
      complexity = 'moderate';
      estimatedProcessingTime = 6000;
    }

    return {
      primaryFormat,
      questionTypeDistribution,
      complexity,
      estimatedProcessingTime
    };
  }

  private static async detectQuestionTypes(
    imageData: string, 
    formatAnalysis: FormatAnalysis
  ): Promise<DetectedQuestionType[]> {
    const detectedTypes: DetectedQuestionType[] = [];
    const questionCount = formatAnalysis.primaryFormat === 'bubble_sheet' ? 20 : 10;

    for (let i = 1; i <= questionCount; i++) {
      const questionY = 150 + (i * 30);
      
      // Determine question type based on format analysis
      let detectedType: string;
      let extractionMethod: string;
      let confidence: number;

      if (formatAnalysis.primaryFormat === 'bubble_sheet') {
        detectedType = 'multiple_choice';
        extractionMethod = 'roboflow_bubbles';
        confidence = 0.95;
      } else if (formatAnalysis.primaryFormat === 'text_based') {
        detectedType = Math.random() > 0.7 ? 'essay' : 'short_answer';
        extractionMethod = 'google_vision_text';
        confidence = 0.85;
      } else {
        // Mixed format
        if (i <= 10) {
          detectedType = 'multiple_choice';
          extractionMethod = 'roboflow_bubbles';
          confidence = 0.90;
        } else if (i <= 15) {
          detectedType = 'short_answer';
          extractionMethod = 'google_vision_text';
          confidence = 0.80;
        } else {
          detectedType = 'essay';
          extractionMethod = 'google_vision_text';
          confidence = 0.75;
        }
      }

      detectedTypes.push({
        questionNumber: i,
        detectedType,
        confidence,
        answerRegion: {
          x: detectedType === 'multiple_choice' ? 500 : 50,
          y: questionY,
          width: detectedType === 'multiple_choice' ? 150 : 400,
          height: detectedType === 'essay' ? 60 : 20
        },
        extractionMethod
      });
    }

    return detectedTypes;
  }

  private static recommendExtractionMethods(
    detectedTypes: DetectedQuestionType[], 
    formatAnalysis: FormatAnalysis
  ): Record<string, string> {
    const methods: Record<string, string> = {};

    detectedTypes.forEach(type => {
      switch (type.detectedType) {
        case 'multiple_choice':
          methods[type.detectedType] = 'roboflow_bubbles';
          break;
        case 'short_answer':
          methods[type.detectedType] = 'google_vision_text';
          break;
        case 'essay':
          methods[type.detectedType] = 'google_vision_text';
          break;
        default:
          methods[type.detectedType] = 'google_vision_text';
      }
    });

    return methods;
  }

  private static selectBestFlexibleTemplate(
    formatAnalysis: FormatAnalysis
  ): FlexibleTestTemplate | null {
    switch (formatAnalysis.primaryFormat) {
      case 'bubble_sheet':
        return this.flexibleTemplates.get('test_creator_standard') || null;
      case 'mixed_format':
      case 'text_based':
        return this.flexibleTemplates.get('test_creator_mixed') || null;
      default:
        return this.flexibleTemplates.get('test_creator_standard') || null;
    }
  }

  static getFlexibleTemplate(templateId: string): FlexibleTestTemplate | undefined {
    return this.flexibleTemplates.get(templateId);
  }

  static getAllFlexibleTemplates(): FlexibleTestTemplate[] {
    return Array.from(this.flexibleTemplates.values());
  }

  static getExtractionMethodForQuestionType(
    questionType: string, 
    templateId: string
  ): AnswerExtractionMethod | null {
    const template = this.flexibleTemplates.get(templateId);
    if (!template) return null;

    return template.answerExtractionMethods.find(
      method => method.questionType === questionType
    ) || null;
  }
}
