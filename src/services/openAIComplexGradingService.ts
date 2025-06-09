
import { supabase } from '@/integrations/supabase/client';
import { ConsolidatedGradingService, GradingResult } from './consolidatedGradingService';

export interface ComplexGradingRequest {
  questionText: string;
  studentAnswer: string;
  correctAnswer: string;
  questionNumber: number;
  pointsPossible: number;
  rubric?: string;
  context?: string;
}

export interface ComplexGradingResponse {
  result: GradingResult;
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
  cost: number;
}

export class OpenAIComplexGradingService {
  private static readonly MODEL = 'gpt-4.1-2025-04-14';
  private static readonly MAX_RETRIES = 2;
  
  static async gradeComplexQuestion(request: ComplexGradingRequest): Promise<ComplexGradingResponse> {
    console.log(`🧠 Grading complex question ${request.questionNumber} with OpenAI`);
    
    try {
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          questionText: request.questionText,
          studentAnswer: request.studentAnswer,
          correctAnswer: request.correctAnswer,
          pointsPossible: request.pointsPossible,
          questionNumber: request.questionNumber,
          model: this.MODEL
        }
      });

      if (error) {
        throw new Error(`OpenAI grading failed: ${error.message}`);
      }

      return {
        result: data.result,
        usage: data.usage || { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
        cost: data.cost || 0
      };
    } catch (error) {
      console.error(`❌ OpenAI complex grading failed for Q${request.questionNumber}:`, error);
      throw error;
    }
  }

  static async batchGradeComplexQuestions(
    requests: ComplexGradingRequest[]
  ): Promise<ComplexGradingResponse[]> {
    console.log(`🧠 Batch grading ${requests.length} complex questions with OpenAI`);
    
    const results: ComplexGradingResponse[] = [];
    
    // Process sequentially to avoid rate limits
    for (const request of requests) {
      try {
        const result = await this.gradeComplexQuestion(request);
        results.push(result);
      } catch (error) {
        console.error(`Failed to grade question ${request.questionNumber}:`, error);
        // Add fallback result
        results.push({
          result: {
            questionNumber: request.questionNumber,
            isCorrect: false,
            pointsEarned: 0,
            confidence: 0.3,
            reasoning: `OpenAI grading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
            method: 'openai',
            processingTime: 0
          },
          usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
          cost: 0
        });
      }
    }
    
    return results;
  }

  static calculateCost(usage: { promptTokens: number; completionTokens: number }): number {
    // GPT-4 pricing (approximate)
    const promptCostPer1k = 0.03;
    const completionCostPer1k = 0.06;
    
    const promptCost = (usage.promptTokens / 1000) * promptCostPer1k;
    const completionCost = (usage.completionTokens / 1000) * completionCostPer1k;
    
    return promptCost + completionCost;
  }
}
