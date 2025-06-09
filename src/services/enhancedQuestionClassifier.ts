
export interface QuestionClassification {
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false' | 'fill_in_blank';
  confidence: number;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedGradingTime: number;
  requiresHumanReview: boolean;
  metadata?: {
    subject?: string;
    topic?: string;
    skillLevel?: string;
  };
}

export interface SimpleAnswerValidation {
  isValid: boolean;
  confidence: number;
  explanation: string;
  suggestedCorrection?: string;
  validationMethod: 'pattern_match' | 'keyword_analysis' | 'fuzzy_match';
}

export class EnhancedQuestionClassifier {
  private static readonly QUESTION_PATTERNS = {
    multiple_choice: /\b(a\)|b\)|c\)|d\)|choose|select|which of the following)\b/i,
    true_false: /\b(true|false|correct|incorrect)\b/i,
    short_answer: /\b(calculate|solve|find|what is|how much)\b/i,
    essay: /\b(explain|describe|discuss|analyze|compare|contrast)\b/i,
    fill_in_blank: /_{3,}|\[.*\]|\(\s*\)/
  };

  static async classifyQuestion(questionText: string): Promise<QuestionClassification> {
    const text = questionText.toLowerCase().trim();
    
    // Determine question type
    let questionType: QuestionClassification['questionType'] = 'short_answer';
    let confidence = 0.5;

    for (const [type, pattern] of Object.entries(this.QUESTION_PATTERNS)) {
      if (pattern.test(text)) {
        questionType = type as QuestionClassification['questionType'];
        confidence = 0.8;
        break;
      }
    }

    // Determine complexity
    const complexity = this.determineComplexity(text);
    const estimatedGradingTime = this.estimateGradingTime(questionType, complexity);
    const requiresHumanReview = complexity === 'complex' || questionType === 'essay';

    return {
      questionType,
      confidence,
      complexity,
      estimatedGradingTime,
      requiresHumanReview,
      metadata: {
        subject: 'unknown',
        topic: 'general',
        skillLevel: complexity
      }
    };
  }

  static async classifyQuestions(file: File): Promise<QuestionClassification[]> {
    // Mock implementation - in real scenario would extract text and classify each question
    console.log(`Classifying questions from ${file.name}`);
    
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // Return mock classifications
    return [
      {
        questionType: 'multiple_choice',
        confidence: 0.9,
        complexity: 'simple',
        estimatedGradingTime: 30,
        requiresHumanReview: false
      },
      {
        questionType: 'essay',
        confidence: 0.8,
        complexity: 'complex',
        estimatedGradingTime: 300,
        requiresHumanReview: true
      },
      {
        questionType: 'short_answer',
        confidence: 0.85,
        complexity: 'medium',
        estimatedGradingTime: 60,
        requiresHumanReview: false
      }
    ];
  }

  static async validateSimpleAnswer(studentAnswer: string, correctAnswer: string): Promise<SimpleAnswerValidation> {
    const student = studentAnswer.toLowerCase().trim();
    const correct = correctAnswer.toLowerCase().trim();

    // Exact match
    if (student === correct) {
      return {
        isValid: true,
        confidence: 1.0,
        explanation: 'Exact match with correct answer',
        validationMethod: 'pattern_match'
      };
    }

    // Fuzzy match for minor variations
    const similarity = this.calculateSimilarity(student, correct);
    if (similarity > 0.8) {
      return {
        isValid: true,
        confidence: similarity,
        explanation: 'Close match with minor variations',
        validationMethod: 'fuzzy_match'
      };
    }

    return {
      isValid: false,
      confidence: similarity,
      explanation: 'Does not match the expected answer',
      suggestedCorrection: correctAnswer,
      validationMethod: 'fuzzy_match'
    };
  }

  static async validateSimpleAnswers(file: File): Promise<SimpleAnswerValidation[]> {
    // Mock implementation
    console.log(`Validating simple answers from ${file.name}`);
    
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    return [
      {
        isValid: true,
        confidence: 0.95,
        explanation: 'Answer matches expected format and content',
        validationMethod: 'pattern_match'
      },
      {
        isValid: false,
        confidence: 0.3,
        explanation: 'Answer does not match expected format',
        suggestedCorrection: 'Expected numerical answer',
        validationMethod: 'keyword_analysis'
      }
    ];
  }

  private static determineComplexity(text: string): 'simple' | 'medium' | 'complex' {
    const complexWords = ['analyze', 'evaluate', 'synthesize', 'compare', 'contrast', 'justify'];
    const mediumWords = ['explain', 'describe', 'calculate', 'solve'];
    
    if (complexWords.some(word => text.includes(word))) {
      return 'complex';
    } else if (mediumWords.some(word => text.includes(word))) {
      return 'medium';
    }
    return 'simple';
  }

  private static estimateGradingTime(type: QuestionClassification['questionType'], complexity: 'simple' | 'medium' | 'complex'): number {
    const baseTime = {
      multiple_choice: 15,
      true_false: 10,
      short_answer: 60,
      essay: 300,
      fill_in_blank: 30
    };

    const multiplier = {
      simple: 1,
      medium: 1.5,
      complex: 2.5
    };

    return Math.round(baseTime[type] * multiplier[complexity]);
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i += 1) {
      matrix[0][i] = i;
    }
    
    for (let j = 0; j <= str2.length; j += 1) {
      matrix[j][0] = j;
    }
    
    for (let j = 1; j <= str2.length; j += 1) {
      for (let i = 1; i <= str1.length; i += 1) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,
          matrix[j - 1][i] + 1,
          matrix[j - 1][i - 1] + indicator
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  }
}
