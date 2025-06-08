
import { pipeline, Pipeline } from '@huggingface/transformers';
import { QuestionClassification, SimpleAnswerValidation } from './enhancedQuestionClassifier';

export interface DistilBertConfig {
  model: string;
  device: 'cpu' | 'webgpu';
  similarityThreshold: number;
  confidenceThreshold: number;
}

export interface DistilBertGradingResult {
  isCorrect: boolean;
  confidence: number;
  similarity: number;
  method: 'semantic_matching' | 'pattern_fallback';
  reasoning: string;
  embeddings?: {
    student: number[];
    correct: number[];
  };
}

export class DistilBertLocalGradingService {
  private static instance: DistilBertLocalGradingService;
  private featureExtractor: Pipeline | null = null;
  private isLoading = false;
  private loadingPromise: Promise<void> | null = null;

  private readonly config: DistilBertConfig = {
    model: 'Xenova/all-MiniLM-L6-v2', // Lightweight sentence transformer
    device: 'webgpu',
    similarityThreshold: 0.75, // Minimum similarity for correct answer
    confidenceThreshold: 0.6   // Minimum confidence to use DistilBERT
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
    console.log('🤖 Initializing DistilBERT for local AI grading...');

    this.loadingPromise = this.loadModel();
    await this.loadingPromise;
    this.isLoading = false;
  }

  private async loadModel(): Promise<void> {
    try {
      // Try WebGPU first, fallback to CPU
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

      console.log(`🚀 Local AI grading ready (${device})`);
    } catch (error) {
      console.error('❌ Failed to load DistilBERT model:', error);
      throw new Error('Failed to initialize local AI model');
    }
  }

  async gradeAnswer(
    studentAnswer: string,
    correctAnswer: string,
    classification: QuestionClassification
  ): Promise<DistilBertGradingResult> {
    await this.initialize();

    if (!this.featureExtractor) {
      throw new Error('DistilBERT model not initialized');
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
        reasoning: 'No answer provided'
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
        embeddings: {
          student: studentEmbedding,
          correct: correctEmbedding
        }
      };

    } catch (error) {
      console.warn('⚠️ DistilBERT grading failed, using pattern fallback:', error);
      
      // Fallback to simple pattern matching
      return this.patternFallback(cleanStudent, cleanCorrect, classification);
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
    classification: QuestionClassification
  ): DistilBertGradingResult {
    // Simple pattern-based fallback
    const isExactMatch = studentAnswer === correctAnswer;
    const isCaseInsensitiveMatch = studentAnswer.toLowerCase() === correctAnswer.toLowerCase();
    
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
      const studentNum = parseFloat(studentAnswer.replace(/[^\d.-]/g, ''));
      const correctNum = parseFloat(correctAnswer.replace(/[^\d.-]/g, ''));
      
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
      reasoning: `Pattern matching fallback: "${studentAnswer}" vs "${correctAnswer}". ${isCorrect ? 'Match found' : 'No match'}`
    };
  }

  // Utility methods
  getModelInfo(): { model: string; device: string; ready: boolean } {
    return {
      model: this.config.model,
      device: this.config.device,
      ready: !!this.featureExtractor
    };
  }

  updateConfig(updates: Partial<DistilBertConfig>): void {
    Object.assign(this.config, updates);
    console.log('DistilBERT config updated:', this.config);
  }
}
