export interface TestTemplate {
  id: string;
  name: string;
  type: 'test_creator_standard';
  layout: TemplateLayout;
  preprocessing: PreprocessingConfig;
  validation: ValidationConfig;
}

export interface TemplateLayout {
  headerRegion: BoundingBox;
  questionRegions: QuestionRegion[];
  bubbleGrid: BubbleGridConfig;
  expectedElements: ExpectedElement[];
}

export interface BoundingBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface QuestionRegion {
  questionNumber: number;
  textArea: BoundingBox;
  answerArea: BoundingBox;
  bubblePositions: BubblePosition[];
}

export interface BubblePosition {
  option: string; // A, B, C, D, E
  center: { x: number; y: number };
  radius: number;
}

export interface BubbleGridConfig {
  columns: number;
  rows: number;
  bubbleRadius: number;
  horizontalSpacing: number;
  verticalSpacing: number;
  startPosition: { x: number; y: number };
}

export interface ExpectedElement {
  type: 'exam_id' | 'student_info' | 'question_header' | 'answer_box';
  pattern: RegExp; // Changed from string to RegExp
  position: BoundingBox;
  required: boolean;
}

export interface PreprocessingConfig {
  rotationCorrection: boolean;
  contrastEnhancement: number;
  noiseReduction: boolean;
  gridAlignment: boolean;
  bubbleEnhancement: boolean;
}

export interface ValidationConfig {
  expectedQuestionCount: number;
  requiredElements: string[];
  answerValidation: AnswerValidation;
}

export interface AnswerValidation {
  allowMultipleAnswers: boolean;
  requireAllAnswers: boolean;
  validOptions: string[];
}

export interface TemplateMatchResult {
  isMatch: boolean;
  confidence: number;
  template: TestTemplate | null;
  detectedElements: DetectedElement[];
  alignmentOffset: { x: number; y: number };
  rotationAngle: number;
}

export interface DetectedElement {
  type: string;
  position: BoundingBox;
  confidence: number;
  content?: string;
}

export class TestTemplateService {
  private static templates: Map<string, TestTemplate> = new Map();

  static {
    // Initialize with Test Creator standard template
    this.initializeTestCreatorTemplate();
  }

  private static initializeTestCreatorTemplate(): void {
    const testCreatorTemplate: TestTemplate = {
      id: 'test_creator_standard',
      name: 'Test Creator Standard Format',
      type: 'test_creator_standard',
      layout: {
        headerRegion: { x: 0, y: 0, width: 100, height: 15 }, // Top 15% for header
        questionRegions: [], // Will be generated based on question count
        bubbleGrid: {
          columns: 5, // A, B, C, D, E
          rows: 50, // Max questions per page
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
          },
          {
            type: 'student_info',
            pattern: /Student.*Name.*:|Name.*:/,
            position: { x: 5, y: 10, width: 90, height: 5 },
            required: false
          }
        ]
      },
      preprocessing: {
        rotationCorrection: true,
        contrastEnhancement: 1.3,
        noiseReduction: true,
        gridAlignment: true,
        bubbleEnhancement: true
      },
      validation: {
        expectedQuestionCount: 0, // Will be set dynamically
        requiredElements: ['exam_id'],
        answerValidation: {
          allowMultipleAnswers: false,
          requireAllAnswers: false,
          validOptions: ['A', 'B', 'C', 'D', 'E']
        }
      }
    };

    this.templates.set('test_creator_standard', testCreatorTemplate);
  }

  static async recognizeTemplate(imageData: string, fileName: string): Promise<TemplateMatchResult> {
    console.log('🔍 Starting template recognition for:', fileName);

    // For now, we know all our tests use the Test Creator template
    const template = this.templates.get('test_creator_standard')!;
    
    try {
      // Detect key elements that identify our template
      const detectedElements = await this.detectTemplateElements(imageData, template);
      
      // Calculate confidence based on detected elements
      const confidence = this.calculateTemplateConfidence(detectedElements, template);
      
      // Determine if this matches our template
      const isMatch = confidence > 0.7; // 70% confidence threshold
      
      const result: TemplateMatchResult = {
        isMatch,
        confidence,
        template: isMatch ? template : null,
        detectedElements,
        alignmentOffset: { x: 0, y: 0 }, // Will be calculated from detected elements
        rotationAngle: 0 // Will be calculated from header alignment
      };

      console.log(`📋 Template recognition result: ${isMatch ? 'MATCH' : 'NO MATCH'} (${(confidence * 100).toFixed(1)}%)`);
      return result;

    } catch (error) {
      console.error('❌ Template recognition failed:', error);
      return {
        isMatch: false,
        confidence: 0,
        template: null,
        detectedElements: [],
        alignmentOffset: { x: 0, y: 0 },
        rotationAngle: 0
      };
    }
  }

  private static async detectTemplateElements(imageData: string, template: TestTemplate): Promise<DetectedElement[]> {
    const detectedElements: DetectedElement[] = [];

    // Simulate element detection (in real implementation, this would use image processing)
    // For now, we'll use pattern matching on OCR text that will be provided later

    // Mock detection of header elements
    detectedElements.push({
      type: 'exam_id',
      position: { x: 60, y: 2, width: 35, height: 8 },
      confidence: 0.9,
      content: 'EXAM_DETECTED'
    });

    detectedElements.push({
      type: 'question_header',
      position: { x: 5, y: 15, width: 90, height: 10 },
      confidence: 0.85
    });

    return detectedElements;
  }

  private static calculateTemplateConfidence(detectedElements: DetectedElement[], template: TestTemplate): number {
    const requiredElements = template.layout.expectedElements.filter(e => e.required);
    const detectedRequiredElements = detectedElements.filter(detected => 
      requiredElements.some(required => required.type === detected.type)
    );

    if (requiredElements.length === 0) return 0.8; // Default confidence if no required elements

    const baseConfidence = detectedRequiredElements.length / requiredElements.length;
    const avgElementConfidence = detectedElements.reduce((sum, el) => sum + el.confidence, 0) / detectedElements.length;

    return Math.min(1.0, (baseConfidence + avgElementConfidence) / 2);
  }

  static generateQuestionRegions(questionCount: number, template: TestTemplate): QuestionRegion[] {
    const regions: QuestionRegion[] = [];
    const { bubbleGrid } = template.layout;

    for (let i = 0; i < questionCount; i++) {
      const row = i % bubbleGrid.rows;
      const questionY = bubbleGrid.startPosition.y + (row * bubbleGrid.verticalSpacing);

      const bubblePositions: BubblePosition[] = [];
      for (let j = 0; j < bubbleGrid.columns; j++) {
        const option = String.fromCharCode(65 + j); // A, B, C, D, E
        bubblePositions.push({
          option,
          center: {
            x: bubbleGrid.startPosition.x + (j * bubbleGrid.horizontalSpacing),
            y: questionY
          },
          radius: bubbleGrid.bubbleRadius
        });
      }

      regions.push({
        questionNumber: i + 1,
        textArea: {
          x: 50,
          y: questionY - 10,
          width: 400,
          height: 20
        },
        answerArea: {
          x: bubbleGrid.startPosition.x - 20,
          y: questionY - 10,
          width: bubbleGrid.columns * bubbleGrid.horizontalSpacing + 20,
          height: 20
        },
        bubblePositions
      });
    }

    return regions;
  }

  static getTemplate(templateId: string): TestTemplate | undefined {
    return this.templates.get(templateId);
  }

  static getAllTemplates(): TestTemplate[] {
    return Array.from(this.templates.values());
  }

  static updateTemplate(templateId: string, updates: Partial<TestTemplate>): void {
    const template = this.templates.get(templateId);
    if (template) {
      this.templates.set(templateId, { ...template, ...updates });
      console.log(`📋 Template ${templateId} updated`);
    }
  }
}
