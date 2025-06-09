
export interface FastPathDetectionResult {
  usedFastPath: boolean;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false' | 'fill_in_blank' | 'numeric';
  confidence: number;
  reason?: string;
  detectionMethod: string;
}

export class FastPathQuestionDetectionService {
  static async detectQuestionType(question: any): Promise<FastPathDetectionResult> {
    const questionText = question?.questionText || question?.text || '';
    const text = questionText.toLowerCase().trim();
    
    // Fast pattern matching
    if (/\b(a\)|b\)|c\)|d\)|choose|select|which of the following)\b/i.test(text)) {
      return {
        usedFastPath: true,
        questionType: 'multiple_choice',
        confidence: 0.9,
        detectionMethod: 'pattern_match'
      };
    }
    
    if (/\b(true|false|correct|incorrect)\b/i.test(text)) {
      return {
        usedFastPath: true,
        questionType: 'true_false',
        confidence: 0.85,
        detectionMethod: 'pattern_match'
      };
    }
    
    if (/\b(\d+\.?\d*|\$\d+|percent|%)\b/i.test(text)) {
      return {
        usedFastPath: true,
        questionType: 'numeric',
        confidence: 0.8,
        detectionMethod: 'pattern_match'
      };
    }
    
    return {
      usedFastPath: false,
      questionType: 'short_answer',
      confidence: 0.3,
      reason: 'No clear pattern detected',
      detectionMethod: 'fallback'
    };
  }
}
