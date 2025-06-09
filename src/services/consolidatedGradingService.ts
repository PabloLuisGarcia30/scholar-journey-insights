
import { supabase } from '@/integrations/supabase/client';

export interface GradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  confidence: number;
  reasoning: string;
  method: 'local_ai' | 'openai' | 'pattern_match';
  processingTime: number;
}

export interface QuestionClassification {
  questionNumber: number;
  complexity: 'simple' | 'complex';
  confidence: number;
  useLocalGrading: boolean;
  reasoning: string;
}

export interface ConsolidatedGradingConfig {
  localGradingThreshold: number;
  complexityThreshold: number;
  enableFallback: boolean;
}

export class ConsolidatedGradingService {
  private static config: ConsolidatedGradingConfig = {
    localGradingThreshold: 0.8,
    complexityThreshold: 0.7,
    enableFallback: true
  };

  static async gradeQuestion(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    questionNumber: number,
    pointsPossible: number = 1
  ): Promise<GradingResult> {
    const startTime = Date.now();
    
    console.log(`🎯 Grading Q${questionNumber}: "${studentAnswer}" vs "${correctAnswer}"`);
    
    try {
      // Step 1: Classify question complexity
      const classification = this.classifyQuestion(questionText, studentAnswer, correctAnswer, questionNumber);
      
      // Step 2: Route to appropriate grading method
      if (classification.useLocalGrading) {
        return await this.gradeWithLocalAI(questionText, studentAnswer, correctAnswer, questionNumber, pointsPossible, startTime);
      } else {
        return await this.gradeWithOpenAI(questionText, studentAnswer, correctAnswer, questionNumber, pointsPossible, startTime);
      }
    } catch (error) {
      console.error(`❌ Grading failed for Q${questionNumber}:`, error);
      
      // Fallback to pattern matching
      return this.gradeWithPatternMatch(studentAnswer, correctAnswer, questionNumber, pointsPossible, startTime);
    }
  }

  static classifyQuestion(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    questionNumber: number
  ): QuestionClassification {
    const cleanStudent = this.normalizeText(studentAnswer);
    const cleanCorrect = this.normalizeText(correctAnswer);
    
    // Simple classification logic
    let complexity: 'simple' | 'complex' = 'simple';
    let confidence = 0.8;
    let useLocalGrading = true;
    let reasoning = 'Short answer suitable for local AI';
    
    // Check for exact matches (definitely simple)
    if (cleanStudent === cleanCorrect) {
      confidence = 0.95;
      reasoning = 'Exact match detected';
    }
    // Check for numeric answers
    else if (this.isNumericAnswer(cleanStudent) && this.isNumericAnswer(cleanCorrect)) {
      confidence = 0.9;
      reasoning = 'Numeric answer comparison';
    }
    // Check length and complexity
    else if (cleanStudent.length > 100 || cleanCorrect.length > 100) {
      complexity = 'complex';
      useLocalGrading = false;
      confidence = 0.8;
      reasoning = 'Long answer requires OpenAI analysis';
    }
    // Check for complex patterns
    else if (this.hasComplexPatterns(questionText) || this.hasComplexPatterns(studentAnswer)) {
      complexity = 'complex';
      useLocalGrading = false;
      confidence = 0.75;
      reasoning = 'Complex patterns detected';
    }
    
    return {
      questionNumber,
      complexity,
      confidence,
      useLocalGrading,
      reasoning
    };
  }

  private static async gradeWithLocalAI(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    questionNumber: number,
    pointsPossible: number,
    startTime: number
  ): Promise<GradingResult> {
    console.log(`🤖 Using local AI for Q${questionNumber}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('grade-with-distilbert-wasm', {
        body: {
          studentAnswer,
          correctAnswer,
          questionClassification: { type: 'simple', confidence: 0.8 }
        }
      });

      if (error) throw error;

      const result = data.result;
      const pointsEarned = result.isCorrect ? pointsPossible : 0;

      return {
        questionNumber,
        isCorrect: result.isCorrect,
        pointsEarned,
        confidence: result.confidence,
        reasoning: result.reasoning,
        method: 'local_ai',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('Local AI grading failed:', error);
      throw error;
    }
  }

  private static async gradeWithOpenAI(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    questionNumber: number,
    pointsPossible: number,
    startTime: number
  ): Promise<GradingResult> {
    console.log(`🧠 Using OpenAI for Q${questionNumber}`);
    
    try {
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          questionText,
          studentAnswer,
          correctAnswer,
          pointsPossible,
          questionNumber
        }
      });

      if (error) throw error;

      return {
        questionNumber,
        isCorrect: data.result.isCorrect,
        pointsEarned: data.result.pointsEarned,
        confidence: data.result.confidence,
        reasoning: data.result.reasoning,
        method: 'openai',
        processingTime: Date.now() - startTime
      };
    } catch (error) {
      console.error('OpenAI grading failed:', error);
      throw error;
    }
  }

  private static gradeWithPatternMatch(
    studentAnswer: string,
    correctAnswer: string,
    questionNumber: number,
    pointsPossible: number,
    startTime: number
  ): GradingResult {
    console.log(`📝 Using pattern matching for Q${questionNumber}`);
    
    const cleanStudent = this.normalizeText(studentAnswer);
    const cleanCorrect = this.normalizeText(correctAnswer);
    
    const isCorrect = cleanStudent === cleanCorrect;
    const pointsEarned = isCorrect ? pointsPossible : 0;
    
    return {
      questionNumber,
      isCorrect,
      pointsEarned,
      confidence: isCorrect ? 0.9 : 0.8,
      reasoning: `Pattern matching: ${isCorrect ? 'Exact match found' : 'No match found'}`,
      method: 'pattern_match',
      processingTime: Date.now() - startTime
    };
  }

  private static normalizeText(text: string): string {
    return text.toLowerCase().trim().replace(/[^\w\s.-]/g, '').replace(/\s+/g, ' ');
  }

  private static isNumericAnswer(text: string): boolean {
    const cleaned = text.replace(/[^\d.-]/g, '');
    return !isNaN(parseFloat(cleaned)) && isFinite(parseFloat(cleaned));
  }

  private static hasComplexPatterns(text: string): boolean {
    // Check for mathematical expressions, multiple sentences, etc.
    return text.includes('=') || 
           text.includes('+') || 
           text.includes('-') || 
           text.split('.').length > 2 ||
           text.split(' ').length > 20;
  }

  static async batchGradeQuestions(questions: Array<{
    questionText: string;
    studentAnswer: string;
    correctAnswer: string;
    questionNumber: number;
    pointsPossible?: number;
  }>): Promise<GradingResult[]> {
    console.log(`🎯 Batch grading ${questions.length} questions`);
    
    const results: GradingResult[] = [];
    
    // Process questions sequentially to avoid overwhelming services
    for (const question of questions) {
      try {
        const result = await this.gradeQuestion(
          question.questionText,
          question.studentAnswer,
          question.correctAnswer,
          question.questionNumber,
          question.pointsPossible
        );
        results.push(result);
      } catch (error) {
        console.error(`Failed to grade question ${question.questionNumber}:`, error);
        // Add fallback result
        results.push({
          questionNumber: question.questionNumber,
          isCorrect: false,
          pointsEarned: 0,
          confidence: 0.3,
          reasoning: `Grading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          method: 'pattern_match',
          processingTime: 0
        });
      }
    }
    
    return results;
  }

  static updateConfiguration(newConfig: Partial<ConsolidatedGradingConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated grading configuration:', this.config);
  }

  static getPerformanceMetrics(): {
    localGradingThreshold: number;
    complexityThreshold: number;
    enableFallback: boolean;
  } {
    return { ...this.config };
  }
}
