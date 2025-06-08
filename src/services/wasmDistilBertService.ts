
import { supabase } from "@/integrations/supabase/client";

export interface WasmDistilBertResult {
  isCorrect: boolean;
  confidence: number;
  similarity: number;
  method: 'wasm_distilbert_large' | 'pattern_fallback_enhanced' | 'pattern_fallback';
  reasoning: string;
  processingTime: number;
  routing?: {
    useWasm: boolean;
    reason: string;
    complexity: 'simple' | 'medium' | 'complex';
  };
  modelInfo?: {
    model: string;
    device: string;
    quantization: string;
    size: string;
    expectedAccuracy: string;
  };
  cacheStats?: {
    cacheSize: number;
    totalInferences: number;
    averageInferenceTime: number;
  };
  error?: string;
}

export class WasmDistilBertService {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.70;
  private static readonly MAX_RETRY_ATTEMPTS = 2;
  
  // Performance tracking
  private static performanceMetrics = {
    totalRequests: 0,
    successfulRequests: 0,
    totalProcessingTime: 0,
    costSavingsEstimate: 0,
    accuracyRate: 0
  };

  static async gradeWithLargeWasm(
    studentAnswer: string,
    correctAnswer: string,
    questionClassification?: any
  ): Promise<WasmDistilBertResult> {
    const startTime = Date.now();
    this.performanceMetrics.totalRequests++;
    
    try {
      console.log('🚀 Calling Large Quantized WASM DistilBERT Edge Function...');
      
      const { data, error } = await supabase.functions.invoke('grade-with-distilbert-wasm', {
        body: {
          studentAnswer,
          correctAnswer,
          questionClassification
        }
      });

      if (error) {
        console.error('❌ Large WASM DistilBERT Edge Function error:', error);
        throw new Error(`Edge Function error: ${error.message}`);
      }

      if (!data?.success) {
        throw new Error(data?.error || 'Unknown error from Edge Function');
      }

      const result = data.result;
      const totalTime = Date.now() - startTime;
      
      // Update performance metrics
      this.performanceMetrics.successfulRequests++;
      this.performanceMetrics.totalProcessingTime += totalTime;
      
      // Estimate cost savings (assuming OpenAI call costs ~$0.002 and WASM is nearly free)
      if (result.method === 'wasm_distilbert_large') {
        this.performanceMetrics.costSavingsEstimate += 0.002; // Estimated cost per OpenAI call
      }
      
      console.log(`✅ Large WASM DistilBERT result: ${result.isCorrect ? 'Correct' : 'Incorrect'} (${result.confidence.toFixed(3)} confidence, ${result.similarity.toFixed(3)} similarity) in ${totalTime}ms`);
      
      if (result.routing) {
        console.log(`🧭 Routing: ${result.routing.reason} (${result.routing.complexity} complexity)`);
      }
      
      if (result.cacheStats) {
        console.log(`💾 Cache efficiency: ${result.cacheStats.cacheSize} entries, ${result.cacheStats.averageInferenceTime}ms avg inference`);
      }
      
      return {
        ...result,
        processingTime: totalTime
      };

    } catch (error) {
      console.error('❌ Large WASM DistilBERT service error:', error);
      
      // Enhanced fallback with better pattern matching
      return this.enhancedFallbackPatternMatching(studentAnswer, correctAnswer, Date.now() - startTime);
    }
  }

  private static enhancedFallbackPatternMatching(
    studentAnswer: string,
    correctAnswer: string,
    processingTime: number
  ): WasmDistilBertResult {
    const cleanStudent = studentAnswer.toLowerCase().trim();
    const cleanCorrect = correctAnswer.toLowerCase().trim();
    
    const isExactMatch = cleanStudent === cleanCorrect;
    const isPartialMatch = cleanStudent.includes(cleanCorrect) || cleanCorrect.includes(cleanStudent);
    
    // Enhanced pattern matching with word-level analysis
    const studentWords = cleanStudent.split(/\s+/).filter(w => w.length > 0);
    const correctWords = cleanCorrect.split(/\s+/).filter(w => w.length > 0);
    
    let wordMatchCount = 0;
    for (const word of studentWords) {
      if (correctWords.includes(word)) {
        wordMatchCount++;
      }
    }
    
    const wordMatchRatio = correctWords.length > 0 ? wordMatchCount / correctWords.length : 0;
    
    let isCorrect = false;
    let confidence = 0.3;
    let similarity = 0.2;
    
    if (isExactMatch) {
      isCorrect = true;
      confidence = 0.90;
      similarity = 1.0;
    } else if (isPartialMatch && wordMatchRatio >= 0.8) {
      isCorrect = true;
      confidence = 0.75;
      similarity = 0.85;
    } else if (wordMatchRatio >= 0.6) {
      isCorrect = true;
      confidence = 0.60;
      similarity = 0.70;
    } else if (isPartialMatch && cleanStudent.length > 0) {
      isCorrect = true;
      confidence = 0.45;
      similarity = 0.50;
    }

    return {
      isCorrect,
      confidence,
      similarity,
      method: 'pattern_fallback_enhanced',
      reasoning: `Enhanced fallback pattern matching: "${studentAnswer}" vs "${correctAnswer}". Word match ratio: ${(wordMatchRatio * 100).toFixed(1)}%. ${isCorrect ? 'Match found' : 'No match'}`,
      processingTime,
      error: 'Large WASM DistilBERT unavailable, using enhanced fallback'
    };
  }

  static isHighConfidence(result: WasmDistilBertResult): boolean {
    return result.confidence >= this.HIGH_CONFIDENCE_THRESHOLD && 
           (result.method === 'wasm_distilbert_large' || result.confidence >= 0.90);
  }

  static isMediumConfidence(result: WasmDistilBertResult): boolean {
    return result.confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD && 
           result.confidence < this.HIGH_CONFIDENCE_THRESHOLD;
  }

  static shouldUseForGrading(result: WasmDistilBertResult): boolean {
    // Use large WASM model results more liberally due to higher accuracy
    return result.method === 'wasm_distilbert_large' && result.confidence >= 0.65;
  }

  static async batchGradeWithLargeWasm(
    questions: Array<{ studentAnswer: string; correctAnswer: string; questionNumber: number; questionClassification?: any }>
  ): Promise<Array<WasmDistilBertResult & { questionNumber: number }>> {
    console.log(`🔄 Batch grading ${questions.length} questions with Large Quantized WASM DistilBERT...`);
    
    const batchStartTime = Date.now();
    
    // Process in smaller chunks for better performance
    const chunkSize = 5;
    const results: Array<WasmDistilBertResult & { questionNumber: number }> = [];
    
    for (let i = 0; i < questions.length; i += chunkSize) {
      const chunk = questions.slice(i, i + chunkSize);
      
      const chunkResults = await Promise.all(
        chunk.map(async (q) => {
          const result = await this.gradeWithLargeWasm(q.studentAnswer, q.correctAnswer, q.questionClassification);
          return { ...result, questionNumber: q.questionNumber };
        })
      );
      
      results.push(...chunkResults);
      
      // Small delay between chunks to prevent overwhelming the system
      if (i + chunkSize < questions.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }

    const totalTime = Date.now() - batchStartTime;
    const wasmCount = results.filter(r => r.method === 'wasm_distilbert_large').length;
    const avgTime = results.reduce((sum, r) => sum + r.processingTime, 0) / results.length;
    const avgConfidence = results.reduce((sum, r) => sum + r.confidence, 0) / results.length;
    
    console.log(`✅ Large WASM Batch complete: ${wasmCount}/${questions.length} used Large WASM model`);
    console.log(`📊 Avg: ${avgTime.toFixed(0)}ms per question, ${avgConfidence.toFixed(3)} confidence, total: ${totalTime}ms`);
    
    return results;
  }

  static getPerformanceMetrics() {
    const successRate = this.performanceMetrics.totalRequests > 0 ? 
      this.performanceMetrics.successfulRequests / this.performanceMetrics.totalRequests : 0;
    
    const avgProcessingTime = this.performanceMetrics.successfulRequests > 0 ?
      this.performanceMetrics.totalProcessingTime / this.performanceMetrics.successfulRequests : 0;

    return {
      totalRequests: this.performanceMetrics.totalRequests,
      successfulRequests: this.performanceMetrics.successfulRequests,
      successRate: successRate,
      averageProcessingTime: avgProcessingTime,
      estimatedCostSavings: this.performanceMetrics.costSavingsEstimate,
      estimatedMonthlySavings: this.performanceMetrics.costSavingsEstimate * 30 // Rough estimate
    };
  }

  static resetPerformanceMetrics() {
    this.performanceMetrics = {
      totalRequests: 0,
      successfulRequests: 0,
      totalProcessingTime: 0,
      costSavingsEstimate: 0,
      accuracyRate: 0
    };
  }

  // Legacy method names for backward compatibility
  static async gradeWithWasm(studentAnswer: string, correctAnswer: string, questionClassification?: any): Promise<WasmDistilBertResult> {
    return this.gradeWithLargeWasm(studentAnswer, correctAnswer, questionClassification);
  }

  static async batchGrade(questions: Array<{ studentAnswer: string; correctAnswer: string; questionNumber: number }>): Promise<Array<WasmDistilBertResult & { questionNumber: number }>> {
    return this.batchGradeWithLargeWasm(questions);
  }
}
