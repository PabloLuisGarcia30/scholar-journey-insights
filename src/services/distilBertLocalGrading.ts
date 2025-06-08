import { pipeline } from '@huggingface/transformers';
import { QuestionClassification, SimpleAnswerValidation } from './enhancedQuestionClassifier';
import { WasmDistilBertService, WasmDistilBertResult } from './wasmDistilBertService';

export interface DistilBertConfig {
  model: string;
  device: 'cpu' | 'webgpu' | 'wasm';
  similarityThreshold: number;
  confidenceThreshold: number;
  enableWasmFallback: boolean;
}

export interface DistilBertGradingResult {
  isCorrect: boolean;
  confidence: number;
  similarity: number;
  method: 'semantic_matching' | 'pattern_fallback' | 'wasm_distilbert';
  reasoning: string;
  processingTime?: number;
  embeddings?: {
    student: number[];
    correct: number[];
  };
  wasmResult?: WasmDistilBertResult;
}

export class DistilBertLocalGradingService {
  private static instance: DistilBertLocalGradingService;
  private featureExtractor: any = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  private readonly config: DistilBertConfig = {
    model: 'Xenova/all-MiniLM-L6-v2',
    device: 'webgpu',
    similarityThreshold: 0.75,
    confidenceThreshold: 0.6,
    enableWasmFallback: true // Enable Large WASM as primary method
  };

  static getInstance(): DistilBertLocalGradingService {
    if (!this.instance) {
      this.instance = new DistilBertLocalGradingService();
    }
    return this.instance;
  }

  async initialize(): Promise<void> {
    if (this.featureExtractor) return;
    if (this.isLoading) {
      await this.loadingPromise;
      return;
    }

    this.isLoading = true;
    console.log('🤖 Initializing DistilBERT with Large WASM support...');

    this.loadingPromise = this.loadModel();
    await this.loadingPromise;
    this.isLoading = false;
  }

  private async loadModel(): Promise<void> {
    try {
      // Prioritize Large WASM for better cost efficiency
      if (this.config.enableWasmFallback) {
        console.log('✅ Large Quantized WASM DistilBERT enabled as primary method');
        return; // Skip browser model loading when Large WASM is primary
      }

      // Fallback to browser-based model only if Large WASM is disabled
      let device = this.config.device;
      try {
        this.featureExtractor = await pipeline(
          'feature-extraction',
          this.config.model,
          { device: 'webgpu' }
        );
        console.log('✅ DistilBERT loaded with WebGPU acceleration');
      } catch (webgpuError) {
        console.warn('⚠️ WebGPU not available, falling back to CPU');
        this.featureExtractor = await pipeline(
          'feature-extraction',
          this.config.model,
          { device: 'cpu' }
        );
        device = 'cpu';
        console.log('✅ DistilBERT loaded with CPU');
      }

      console.log(`🚀 Browser-based AI grading ready (${device})`);
    } catch (error) {
      console.error('❌ Failed to load browser DistilBERT model:', error);
      throw new Error('Failed to initialize local AI model');
    }
  }

  async gradeAnswer(
    studentAnswer: string,
    correctAnswer: string,
    classification: QuestionClassification
  ): Promise<DistilBertGradingResult> {
    const startTime = Date.now();

    // Prioritize Large WASM DistilBERT for better accuracy and cost efficiency
    if (this.config.enableWasmFallback) {
      try {
        console.log('🚀 Using Large Quantized WASM DistilBERT for grading...');
        const wasmResult = await WasmDistilBertService.gradeWithLargeWasm(studentAnswer, correctAnswer, classification);
        
        // Convert WASM result to our expected format
        const result: DistilBertGradingResult = {
          isCorrect: wasmResult.isCorrect,
          confidence: wasmResult.confidence,
          similarity: wasmResult.similarity,
          method: wasmResult.method === 'wasm_distilbert_large' ? 'semantic_matching' : 'pattern_fallback',
          reasoning: wasmResult.reasoning,
          processingTime: wasmResult.processingTime,
          wasmResult
        };

        // Use Large WASM results more liberally due to higher accuracy
        if (WasmDistilBertService.shouldUseForGrading(wasmResult)) {
          console.log(`✅ Large WASM result accepted: ${wasmResult.confidence.toFixed(3)} confidence`);
          return result;
        }

        // Still use medium confidence results from Large WASM
        if (WasmDistilBertService.isMediumConfidence(wasmResult)) {
          console.log(`⚠️ Medium confidence Large WASM result (${wasmResult.confidence.toFixed(3)}), accepting due to model accuracy`);
          return result;
        }

        console.log(`⚠️ Low confidence Large WASM result (${wasmResult.confidence.toFixed(3)}), trying browser fallback...`);
        
        // Continue to browser-based model for very low confidence cases
      } catch (error) {
        console.warn('⚠️ Large WASM DistilBERT failed, falling back to browser model:', error);
      }
    }

    // Browser-based fallback (only for very low confidence cases)
    await this.initialize();

    if (!this.featureExtractor) {
      console.warn('⚠️ No DistilBERT model available, using pattern fallback');
      return this.patternFallback(studentAnswer, correctAnswer, classification, startTime);
    }

    // Clean and normalize answers
    const cleanStudent = this.normalizeText(studentAnswer);
    const cleanCorrect = this.normalizeText(correctAnswer);

    // Handle empty answers
    if (!cleanStudent) {
      return {
        isCorrect: false,
        confidence: 1.0,
        similarity: 0,
        method: 'pattern_fallback',
        reasoning: 'No answer provided',
        processingTime: Date.now() - startTime
      };
    }

    try {
      // Get embeddings for both answers
      const [studentEmbedding, correctEmbedding] = await Promise.all([
        this.getEmbedding(cleanStudent),
        this.getEmbedding(cleanCorrect)
      ]);

      // Calculate cosine similarity
      const similarity = this.calculateCosineSimilarity(studentEmbedding, correctEmbedding);
      
      // Determine if correct based on similarity threshold
      const isCorrect = similarity >= this.config.similarityThreshold;
      
      // Calculate confidence based on similarity distance from threshold
      const confidence = this.calculateConfidence(similarity, classification);

      return {
        isCorrect,
        confidence,
        similarity,
        method: 'semantic_matching',
        reasoning: this.generateReasoning(cleanStudent, cleanCorrect, similarity, isCorrect),
        processingTime: Date.now() - startTime,
        embeddings: {
          student: studentEmbedding,
          correct: correctEmbedding
        }
      };

    } catch (error) {
      console.warn('⚠️ Browser DistilBERT grading failed, using pattern fallback:', error);
      
      // Fallback to simple pattern matching
      return this.patternFallback(cleanStudent, cleanCorrect, classification, startTime);
    }
  }

  private async getEmbedding(text: string): Promise<number[]> {
    if (!this.featureExtractor) {
      throw new Error('Feature extractor not initialized');
    }

    const result = await this.featureExtractor(text, {
      pooling: 'mean',
      normalize: true
    });

    return Array.from(result.data);
  }

  private calculateCosineSimilarity(vecA: number[], vecB: number[]): number {
    if (vecA.length !== vecB.length) {
      throw new Error('Vector dimensions must match');
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const similarity = dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    return Math.max(0, Math.min(1, similarity)); // Clamp to [0, 1]
  }

  private calculateConfidence(similarity: number, classification: QuestionClassification): number {
    // Base confidence from classification
    let baseConfidence = classification.confidence;

    // Adjust confidence based on similarity score
    const similarityConfidence = similarity > 0.9 ? 0.95 : 
                                similarity > 0.8 ? 0.85 : 
                                similarity > 0.7 ? 0.75 : 
                                similarity > 0.6 ? 0.65 : 0.5;

    // Combine confidences (weighted average)
    return (baseConfidence * 0.3 + similarityConfidence * 0.7);
  }

  private normalizeText(text: string): string {
    return text
      .toLowerCase()
      .trim()
      .replace(/[^\w\s.-]/g, '') // Remove special chars except periods and hyphens
      .replace(/\s+/g, ' '); // Normalize whitespace
  }

  private generateReasoning(
    studentAnswer: string,
    correctAnswer: string,
    similarity: number,
    isCorrect: boolean
  ): string {
    const similarityPercent = (similarity * 100).toFixed(1);
    const thresholdPercent = (this.config.similarityThreshold * 100).toFixed(1);
    
    return `Local AI semantic analysis: Student "${studentAnswer}" vs correct "${correctAnswer}". ` +
           `Similarity: ${similarityPercent}% (threshold: ${thresholdPercent}%). ` +
           `Result: ${isCorrect ? 'Correct' : 'Incorrect'}`;
  }

  private patternFallback(
    studentAnswer: string,
    correctAnswer: string,
    classification: QuestionClassification,
    startTime: number
  ): DistilBertGradingResult {
    const cleanStudent = this.normalizeText(studentAnswer);
    const cleanCorrect = this.normalizeText(correctAnswer);
    
    // Simple pattern-based fallback
    const isExactMatch = cleanStudent === cleanCorrect;
    const isCaseInsensitiveMatch = cleanStudent.toLowerCase() === cleanCorrect.toLowerCase();
    
    let isCorrect = false;
    let confidence = 0.5;

    if (isExactMatch) {
      isCorrect = true;
      confidence = 0.95;
    } else if (isCaseInsensitiveMatch) {
      isCorrect = true;
      confidence = 0.85;
    } else if (classification.questionType === 'numeric') {
      // Try numeric comparison
      const studentNum = parseFloat(cleanStudent.replace(/[^\d.-]/g, ''));
      const correctNum = parseFloat(cleanCorrect.replace(/[^\d.-]/g, ''));
      
      if (!isNaN(studentNum) && !isNaN(correctNum)) {
        const tolerance = Math.abs(correctNum * 0.01) + 0.01; // 1% tolerance
        isCorrect = Math.abs(studentNum - correctNum) <= tolerance;
        confidence = isCorrect ? 0.8 : 0.3;
      }
    }

    return {
      isCorrect,
      confidence,
      similarity: isCorrect ? 0.9 : 0.1,
      method: 'pattern_fallback',
      reasoning: `Pattern matching fallback: "${studentAnswer}" vs "${correctAnswer}". ${isCorrect ? 'Match found' : 'No match'}`,
      processingTime: Date.now() - startTime
    };
  }

  getModelInfo(): { model: string; device: string; ready: boolean; wasmEnabled: boolean; wasmModel: string } {
    return {
      model: this.config.model,
      device: this.config.device,
      ready: !!this.featureExtractor,
      wasmEnabled: this.config.enableWasmFallback,
      wasmModel: 'all-mpnet-base-v2-quantized (~70MB, 96-98% accuracy)'
    };
  }

  updateConfig(updates: Partial<DistilBertConfig>): void {
    Object.assign(this.config, updates);
    console.log('DistilBERT config updated:', this.config);
  }

  enableLargeWasmMode(): void {
    this.config.enableWasmFallback = true;
    console.log('🚀 Large Quantized WASM DistilBERT mode enabled');
  }

  disableLargeWasmMode(): void {
    this.config.enableWasmFallback = false;
    console.log('🖥️ Browser DistilBERT mode enabled');
  }

  async getPerformanceReport(): Promise<{
    wasmMetrics: any;
    recommendation: string;
    costSavings: string;
  }> {
    const wasmMetrics = WasmDistilBertService.getPerformanceMetrics();
    
    let recommendation = 'Continue using Large WASM DistilBERT for optimal cost efficiency';
    
    if (wasmMetrics.successRate < 0.8) {
      recommendation = 'Consider investigating Large WASM model issues - success rate below 80%';
    } else if (wasmMetrics.averageProcessingTime > 1000) {
      recommendation = 'Large WASM processing time elevated - monitor performance';
    }

    const costSavings = `Estimated savings: $${wasmMetrics.estimatedCostSavings.toFixed(4)} total, $${wasmMetrics.estimatedMonthlySavings.toFixed(2)}/month`;

    return {
      wasmMetrics,
      recommendation,
      costSavings
    };
  }
}
