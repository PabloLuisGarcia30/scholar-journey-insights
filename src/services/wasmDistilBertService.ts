
import { supabase } from "@/integrations/supabase/client";

export interface WasmDistilBertResult {
  isCorrect: boolean;
  confidence: number;
  similarity: number;
  method: 'wasm_distilbert' | 'pattern_fallback';
  reasoning: string;
  processingTime: number;
  modelInfo?: {
    model: string;
    device: string;
    quantization: string;
  };
  error?: string;
}

export class WasmDistilBertService {
  private static readonly CONFIDENCE_THRESHOLD = 0.6;
  private static readonly MAX_RETRY_ATTEMPTS = 2;
  
  static async gradeWithWasm(
    studentAnswer: string,
    correctAnswer: string,
    questionClassification?: any
  ): Promise<WasmDistilBertResult> {
    const startTime = Date.now();
    
    try {
      console.log('🤖 Calling WASM DistilBERT Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('grade-with-distilbert-wasm', {
        body: {
          studentAnswer,
          correctAnswer,
          questionClassification
        }
      });

      if (error) {
        console.error('❌ WASM DistilBERT Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error from Edge Function');
      }

      const result = data.result;
      const totalTime = Date.now() - startTime;
      
      console.log(`✅ WASM DistilBERT result: ${result.isCorrect ? 'Correct' : 'Incorrect'} (${result.confidence.toFixed(2)} confidence) in ${totalTime}ms`);
      
      return {
        ...result,
        processingTime: totalTime
      };

    } catch (error) {
      console.error('❌ WASM DistilBERT service error:', error);
      
      // Fallback to simple pattern matching when WASM fails
      return this.fallbackPatternMatching(studentAnswer, correctAnswer, Date.now() - startTime);
    }
  }

  private static fallbackPatternMatching(
    studentAnswer: string,
    correctAnswer: string,
    processingTime: number
  ): WasmDistilBertResult {
    const cleanStudent = studentAnswer.toLowerCase().trim();
    const cleanCorrect = correctAnswer.toLowerCase().trim();
    
    const isExactMatch = cleanStudent === cleanCorrect;
    const isPartialMatch = cleanStudent.includes(cleanCorrect) || cleanCorrect.includes(cleanStudent);
    
    let isCorrect = false;
    let confidence = 0.3;
    
    if (isExactMatch) {
      isCorrect = true;
      confidence = 0.85;
    } else if (isPartialMatch && cleanStudent.length > 0) {
      isCorrect = true;
      confidence = 0.65;
    }

    return {
      isCorrect,
      confidence,
      similarity: isCorrect ? 0.8 : 0.2,
      method: 'pattern_fallback',
      reasoning: `Fallback pattern matching: "${studentAnswer}" vs "${correctAnswer}". ${isCorrect ? 'Match found' : 'No match'}`,
      processingTime,
      error: 'WASM DistilBERT unavailable, using fallback'
    };
  }

  static isHighConfidence(result: WasmDistilBertResult): boolean {
    return result.confidence >= this.CONFIDENCE_THRESHOLD && result.method === 'wasm_distilbert';
  }

  static async batchGrade(
    questions: Array<{ studentAnswer: string; correctAnswer: string; questionNumber: number }>
  ): Promise<Array<WasmDistilBertResult & { questionNumber: number }>> {
    console.log(`🔄 Batch grading ${questions.length} questions with WASM DistilBERT...`);
    
    const results = await Promise.all(
      questions.map(async (q) => {
        const result = await this.gradeWithWasm(q.studentAnswer, q.correctAnswer);
        return { ...result, questionNumber: q.questionNumber };
      })
    );

    const wasmCount = results.filter(r => r.method === 'wasm_distilbert').length;
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    
    console.log(`✅ Batch complete: ${wasmCount}/${questions.length} used WASM, avg ${avgTime.toFixed(0)}ms per question`);
    
    return results;
  }
}
