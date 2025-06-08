
import Ajv, { JSONSchemaType } from 'ajv';

// Grading result schema for individual questions
export interface GradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  confidence: number;
  reasoning?: string;
  skillAlignment?: string[];
}

// Batch grading result schema
export interface BatchGradingResult {
  results: GradingResult[];
  batchId?: string;
  processingTime?: number;
  modelUsed?: string;
}

// Analysis result schema for complete test analysis
export interface TestAnalysisResult {
  overallScore: number;
  grade: string;
  total_points_earned: number;
  total_points_possible: number;
  ai_feedback?: string;
  content_skill_scores?: SkillScore[];
  subject_skill_scores?: SkillScore[];
  processingMetrics?: ProcessingMetrics;
}

export interface SkillScore {
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
}

export interface ProcessingMetrics {
  totalProcessingTime: number;
  batchProcessingUsed: boolean;
  totalApiCalls: number;
  avgQuestionsPerCall: number;
  optimalBatchSize: number;
  totalTokensUsed: number;
  estimatedCostSavings: number;
}

export class JsonValidationService {
  private ajv: Ajv;
  private gradingResultSchema: JSONSchemaType<GradingResult>;
  private batchGradingResultSchema: JSONSchemaType<BatchGradingResult>;
  private testAnalysisResultSchema: JSONSchemaType<TestAnalysisResult>;

  constructor() {
    this.ajv = new Ajv({ allErrors: true, removeAdditional: true });
    
    // Individual grading result schema
    this.gradingResultSchema = {
      type: 'object',
      required: ['questionNumber', 'isCorrect', 'pointsEarned', 'confidence'],
      properties: {
        questionNumber: { type: 'integer', minimum: 1 },
        isCorrect: { type: 'boolean' },
        pointsEarned: { type: 'number', minimum: 0 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string', nullable: true },
        skillAlignment: { 
          type: 'array', 
          items: { type: 'string' },
          nullable: true 
        }
      },
      additionalProperties: false
    };

    // Batch grading result schema
    this.batchGradingResultSchema = {
      type: 'object',
      required: ['results'],
      properties: {
        results: {
          type: 'array',
          items: this.gradingResultSchema,
          minItems: 1
        },
        batchId: { type: 'string', nullable: true },
        processingTime: { type: 'number', minimum: 0, nullable: true },
        modelUsed: { type: 'string', nullable: true }
      },
      additionalProperties: false
    };

    // Test analysis result schema
    this.testAnalysisResultSchema = {
      type: 'object',
      required: ['overallScore', 'grade', 'total_points_earned', 'total_points_possible'],
      properties: {
        overallScore: { type: 'number', minimum: 0, maximum: 100 },
        grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
        total_points_earned: { type: 'number', minimum: 0 },
        total_points_possible: { type: 'number', minimum: 0 },
        ai_feedback: { type: 'string', nullable: true },
        content_skill_scores: {
          type: 'array',
          items: {
            type: 'object',
            required: ['skill_name', 'score', 'points_earned', 'points_possible'],
            properties: {
              skill_name: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 100 },
              points_earned: { type: 'number', minimum: 0 },
              points_possible: { type: 'number', minimum: 0 }
            },
            additionalProperties: false
          },
          nullable: true
        },
        subject_skill_scores: {
          type: 'array',
          items: {
            type: 'object',
            required: ['skill_name', 'score', 'points_earned', 'points_possible'],
            properties: {
              skill_name: { type: 'string' },
              score: { type: 'number', minimum: 0, maximum: 100 },
              points_earned: { type: 'number', minimum: 0 },
              points_possible: { type: 'number', minimum: 0 }
            },
            additionalProperties: false
          },
          nullable: true
        },
        processingMetrics: {
          type: 'object',
          required: ['totalProcessingTime', 'batchProcessingUsed', 'totalApiCalls'],
          properties: {
            totalProcessingTime: { type: 'number', minimum: 0 },
            batchProcessingUsed: { type: 'boolean' },
            totalApiCalls: { type: 'number', minimum: 0 },
            avgQuestionsPerCall: { type: 'number', minimum: 0 },
            optimalBatchSize: { type: 'number', minimum: 1 },
            totalTokensUsed: { type: 'number', minimum: 0 },
            estimatedCostSavings: { type: 'number', minimum: 0 }
          },
          additionalProperties: false,
          nullable: true
        }
      },
      additionalProperties: false
    };
  }

  // Validate individual grading result
  validateGradingResult(data: unknown): { valid: boolean; data?: GradingResult; errors?: string[] } {
    const validate = this.ajv.compile(this.gradingResultSchema);
    const valid = validate(data);
    
    if (valid) {
      return { valid: true, data: data as GradingResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { valid: false, errors };
    }
  }

  // Validate batch grading results
  validateBatchGradingResult(data: unknown): { valid: boolean; data?: BatchGradingResult; errors?: string[] } {
    const validate = this.ajv.compile(this.batchGradingResultSchema);
    const valid = validate(data);
    
    if (valid) {
      return { valid: true, data: data as BatchGradingResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { valid: false, errors };
    }
  }

  // Validate test analysis result
  validateTestAnalysisResult(data: unknown): { valid: boolean; data?: TestAnalysisResult; errors?: string[] } {
    const validate = this.ajv.compile(this.testAnalysisResultSchema);
    const valid = validate(data);
    
    if (valid) {
      return { valid: true, data: data as TestAnalysisResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { valid: false, errors };
    }
  }

  // Parse and validate JSON response from AI
  parseAndValidateAIResponse(
    jsonString: string,
    expectedType: 'grading' | 'batch' | 'analysis'
  ): { success: boolean; data?: any; errors?: string[] } {
    try {
      const parsed = JSON.parse(jsonString);
      
      switch (expectedType) {
        case 'grading':
          return this.validateGradingResult(parsed);
        case 'batch':
          return this.validateBatchGradingResult(parsed);
        case 'analysis':
          return this.validateTestAnalysisResult(parsed);
        default:
          return { success: false, errors: ['Unknown validation type'] };
      }
    } catch (parseError) {
      return { 
        success: false, 
        errors: [`JSON parsing failed: ${parseError instanceof Error ? parseError.message : 'Unknown error'}`] 
      };
    }
  }

  // Create sanitized fallback data for failed validations
  createFallbackGradingResult(questionNumber: number, reason: string): GradingResult {
    return {
      questionNumber,
      isCorrect: false,
      pointsEarned: 0,
      confidence: 0.1,
      reasoning: `Validation failed: ${reason}`
    };
  }

  // Create sanitized fallback batch result
  createFallbackBatchResult(questionCount: number, reason: string): BatchGradingResult {
    const results: GradingResult[] = [];
    for (let i = 1; i <= questionCount; i++) {
      results.push(this.createFallbackGradingResult(i, reason));
    }
    
    return {
      results,
      batchId: `fallback_${Date.now()}`,
      processingTime: 0,
      modelUsed: 'fallback'
    };
  }

  // Get validation statistics
  getValidationStats(): Record<string, number> {
    return {
      totalValidations: 0, // This would be tracked in practice
      successfulValidations: 0,
      failedValidations: 0,
      successRate: 0
    };
  }
}

// Export singleton instance
export const jsonValidationService = new JsonValidationService();
