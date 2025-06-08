
import Ajv from 'ajv';

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

  constructor() {
    this.ajv = new Ajv({ allErrors: true, removeAdditional: true });
  }

  // Individual grading result schema (using plain object instead of JSONSchemaType)
  private getGradingResultSchema() {
    return {
      type: 'object',
      required: ['questionNumber', 'isCorrect', 'pointsEarned', 'confidence'],
      properties: {
        questionNumber: { type: 'integer', minimum: 1 },
        isCorrect: { type: 'boolean' },
        pointsEarned: { type: 'number', minimum: 0 },
        confidence: { type: 'number', minimum: 0, maximum: 1 },
        reasoning: { type: 'string' },
        skillAlignment: { 
          type: 'array', 
          items: { type: 'string' }
        }
      },
      additionalProperties: false
    };
  }

  // Batch grading result schema
  private getBatchGradingResultSchema() {
    return {
      type: 'object',
      required: ['results'],
      properties: {
        results: {
          type: 'array',
          items: this.getGradingResultSchema(),
          minItems: 1
        },
        batchId: { type: 'string' },
        processingTime: { type: 'number', minimum: 0 },
        modelUsed: { type: 'string' }
      },
      additionalProperties: false
    };
  }

  // Test analysis result schema
  private getTestAnalysisResultSchema() {
    return {
      type: 'object',
      required: ['overallScore', 'grade', 'total_points_earned', 'total_points_possible'],
      properties: {
        overallScore: { type: 'number', minimum: 0, maximum: 100 },
        grade: { type: 'string', enum: ['A', 'B', 'C', 'D', 'F'] },
        total_points_earned: { type: 'number', minimum: 0 },
        total_points_possible: { type: 'number', minimum: 0 },
        ai_feedback: { type: 'string' },
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
          }
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
          }
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
          additionalProperties: false
        }
      },
      additionalProperties: false
    };
  }

  // Validate individual grading result
  validateGradingResult(data: unknown): { success: boolean; data?: GradingResult; errors?: string[] } {
    const validate = this.ajv.compile(this.getGradingResultSchema());
    const valid = validate(data);
    
    if (valid) {
      return { success: true, data: data as GradingResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { success: false, errors };
    }
  }

  // Validate batch grading results
  validateBatchGradingResult(data: unknown): { success: boolean; data?: BatchGradingResult; errors?: string[] } {
    const validate = this.ajv.compile(this.getBatchGradingResultSchema());
    const valid = validate(data);
    
    if (valid) {
      return { success: true, data: data as BatchGradingResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { success: false, errors };
    }
  }

  // Validate test analysis result
  validateTestAnalysisResult(data: unknown): { success: boolean; data?: TestAnalysisResult; errors?: string[] } {
    const validate = this.ajv.compile(this.getTestAnalysisResultSchema());
    const valid = validate(data);
    
    if (valid) {
      return { success: true, data: data as TestAnalysisResult };
    } else {
      const errors = validate.errors?.map(err => `${err.instancePath}: ${err.message}`) || ['Unknown validation error'];
      return { success: false, errors };
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
