
export interface QuestionClassification {
  questionNumber: number;
  questionType: 'multiple_choice' | 'true_false' | 'fill_in_blank' | 'numeric' | 'complex';
  isSimple: boolean;
  confidence: number;
  detectionMethod: string;
  shouldUseLocalGrading: boolean;
  fallbackReason?: string;
  answerPattern?: {
    type: 'exact_match' | 'numeric_range' | 'boolean_variation' | 'case_insensitive';
    expectedFormat: string;
    variations?: string[];
  };
}

export interface SimpleAnswerValidation {
  isValid: boolean;
  normalizedAnswer: string;
  confidence: number;
  matchType: 'exact' | 'numeric' | 'boolean' | 'normalized';
}

export class EnhancedQuestionClassifier {
  private static readonly HIGH_CONFIDENCE_THRESHOLD = 0.85;
  private static readonly MEDIUM_CONFIDENCE_THRESHOLD = 0.6;
  private static readonly SIMPLE_CONFIDENCE_THRESHOLD = 0.4;

  // True/False pattern recognition
  private static readonly TRUE_PATTERNS = [
    'true', 't', 'yes', 'y', 'correct', '1', 'right'
  ];
  
  private static readonly FALSE_PATTERNS = [
    'false', 'f', 'no', 'n', 'incorrect', '0', 'wrong'
  ];

  // Numeric pattern recognition
  private static readonly NUMERIC_PATTERN = /^-?\d+(\.\d+)?([eE][+-]?\d+)?$/;
  private static readonly SIMPLE_UNIT_PATTERN = /^-?\d+(\.\d+)?\s*[a-zA-Z°%]{0,5}$/;

  static classifyQuestion(question: any, answerKey: any): QuestionClassification {
    const questionNumber = question.questionNumber;
    let questionType: QuestionClassification['questionType'] = 'complex';
    let isSimple = false;
    let confidence = 0;
    let detectionMethod = 'none';
    let shouldUseLocal = false;
    let answerPattern = undefined;

    // Get OCR confidence and quality from question data
    const ocrConfidence = question.detectedAnswer?.confidence || 0;
    const hasMultipleMarks = question.detectedAnswer?.multipleMarksDetected || false;
    const reviewRequired = question.detectedAnswer?.reviewFlag || false;
    const bubbleQuality = question.detectedAnswer?.bubbleQuality || 'unknown';
    const studentAnswer = question.detectedAnswer?.selectedOption || '';

    // Analyze answer key to determine question type
    const correctAnswer = answerKey.correct_answer?.toString().trim() || '';
    const questionText = answerKey.question_text?.toLowerCase() || '';
    const questionTypeHint = answerKey.question_type?.toLowerCase() || '';

    // 1. Multiple Choice Detection (A-D)
    if (this.isMultipleChoice(answerKey, questionTypeHint)) {
      questionType = 'multiple_choice';
      isSimple = true;
      confidence = ocrConfidence;
      detectionMethod = 'mcq_pattern';
      answerPattern = {
        type: 'exact_match',
        expectedFormat: 'A|B|C|D',
        variations: ['A', 'B', 'C', 'D', 'a', 'b', 'c', 'd']
      };
    }
    // 2. True/False Detection
    else if (this.isTrueFalse(correctAnswer, questionText, questionTypeHint)) {
      questionType = 'true_false';
      isSimple = true;
      confidence = Math.min(ocrConfidence + 0.1, 1.0); // Slight boost for T/F
      detectionMethod = 'true_false_pattern';
      answerPattern = {
        type: 'boolean_variation',
        expectedFormat: 'True|False',
        variations: [...this.TRUE_PATTERNS, ...this.FALSE_PATTERNS]
      };
    }
    // 3. Simple Numeric Detection
    else if (this.isSimpleNumeric(correctAnswer)) {
      questionType = 'numeric';
      isSimple = true;
      confidence = Math.min(ocrConfidence + 0.05, 1.0); // Small boost for numeric
      detectionMethod = 'numeric_pattern';
      answerPattern = {
        type: 'numeric_range',
        expectedFormat: 'number',
        variations: [correctAnswer]
      };
    }
    // 4. Simple Fill-in-the-blank Detection
    else if (this.isSimpleFillInBlank(correctAnswer, questionText)) {
      questionType = 'fill_in_blank';
      isSimple = true;
      confidence = ocrConfidence;
      detectionMethod = 'simple_fill_pattern';
      answerPattern = {
        type: 'case_insensitive',
        expectedFormat: 'text',
        variations: [correctAnswer.toLowerCase(), correctAnswer.toUpperCase()]
      };
    }
    // 5. Complex Question Detection
    else {
      questionType = 'complex';
      isSimple = false;
      confidence = 0;
      detectionMethod = 'complex_fallback';
    }

    // Quality gate checks for simple questions
    if (isSimple) {
      shouldUseLocal = this.passesQualityGates(
        confidence, 
        hasMultipleMarks, 
        reviewRequired, 
        bubbleQuality, 
        studentAnswer,
        questionType
      );
    }

    return {
      questionNumber,
      questionType,
      isSimple,
      confidence,
      detectionMethod,
      shouldUseLocalGrading: shouldUseLocal,
      fallbackReason: shouldUseLocal ? undefined : this.getFallbackReason(
        confidence, 
        hasMultipleMarks, 
        reviewRequired, 
        bubbleQuality, 
        studentAnswer,
        questionType
      ),
      answerPattern
    };
  }

  private static isMultipleChoice(answerKey: any, questionTypeHint: string): boolean {
    const correctAnswer = answerKey.correct_answer?.toString().trim() || '';
    
    return (
      questionTypeHint.includes('multiple') ||
      answerKey.options ||
      /^[A-D]$/i.test(correctAnswer)
    );
  }

  private static isTrueFalse(correctAnswer: string, questionText: string, questionTypeHint: string): boolean {
    const normalizedAnswer = correctAnswer.toLowerCase().trim();
    
    // Check answer key format
    const isBooleanAnswer = [
      ...this.TRUE_PATTERNS,
      ...this.FALSE_PATTERNS
    ].includes(normalizedAnswer);

    // Check question type hint
    const isBooleanType = questionTypeHint.includes('true') || 
                         questionTypeHint.includes('false') ||
                         questionTypeHint.includes('boolean');

    // Check question text patterns
    const hasBooleanPrompt = questionText.includes('true or false') ||
                            questionText.includes('t/f') ||
                            questionText.includes('yes or no') ||
                            questionText.includes('y/n');

    return isBooleanAnswer || isBooleanType || hasBooleanPrompt;
  }

  private static isSimpleNumeric(correctAnswer: string): boolean {
    const trimmed = correctAnswer.trim();
    
    // Pure numbers (including decimals, scientific notation)
    if (this.NUMERIC_PATTERN.test(trimmed)) {
      return true;
    }
    
    // Numbers with simple units
    if (this.SIMPLE_UNIT_PATTERN.test(trimmed)) {
      return true;
    }
    
    // Simple fractions (1/2, 3/4)
    if (/^\d+\/\d+$/.test(trimmed)) {
      return true;
    }
    
    return false;
  }

  private static isSimpleFillInBlank(correctAnswer: string, questionText: string): boolean {
    const answer = correctAnswer.trim();
    
    // Skip if it's clearly complex (long answers, essays)
    if (answer.length > 50) {
      return false;
    }
    
    // Skip if it contains multiple sentences
    if ((answer.match(/[.!?]/g) || []).length > 1) {
      return false;
    }
    
    // Accept single words or short phrases
    const wordCount = answer.split(/\s+/).length;
    if (wordCount <= 3) {
      return true;
    }
    
    // Accept common academic terms and formulas
    const isAcademicTerm = /^[A-Za-z0-9\s\-_+()=<>]+$/.test(answer) && wordCount <= 5;
    
    return isAcademicTerm;
  }

  private static passesQualityGates(
    confidence: number,
    hasMultipleMarks: boolean,
    reviewRequired: boolean,
    bubbleQuality: string,
    studentAnswer: string,
    questionType: QuestionClassification['questionType']
  ): boolean {
    // Basic quality requirements
    if (confidence < this.SIMPLE_CONFIDENCE_THRESHOLD) return false;
    if (reviewRequired) return false;
    if (hasMultipleMarks) return false;
    if (!studentAnswer || studentAnswer === 'no_answer') return false;

    // Question-type specific requirements
    switch (questionType) {
      case 'multiple_choice':
        return confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD && 
               /^[A-D]$/i.test(studentAnswer) &&
               bubbleQuality !== 'empty';
               
      case 'true_false':
        return confidence >= this.SIMPLE_CONFIDENCE_THRESHOLD &&
               bubbleQuality !== 'empty';
               
      case 'numeric':
        return confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD &&
               studentAnswer.length > 0;
               
      case 'fill_in_blank':
        return confidence >= this.MEDIUM_CONFIDENCE_THRESHOLD &&
               studentAnswer.length > 0 &&
               studentAnswer.length <= 50;
               
      default:
        return false;
    }
  }

  private static getFallbackReason(
    confidence: number,
    hasMultipleMarks: boolean,
    reviewRequired: boolean,
    bubbleQuality: string,
    studentAnswer: string,
    questionType: QuestionClassification['questionType']
  ): string {
    const reasons = [];
    
    if (questionType === 'complex') {
      reasons.push('Complex question requiring AI analysis');
    }
    
    if (confidence < this.SIMPLE_CONFIDENCE_THRESHOLD) {
      reasons.push(`Low OCR confidence (${(confidence * 100).toFixed(1)}%)`);
    }
    
    if (reviewRequired) {
      reasons.push('Flagged for manual review');
    }
    
    if (hasMultipleMarks) {
      reasons.push('Multiple marks detected');
    }
    
    if (!studentAnswer || studentAnswer === 'no_answer') {
      reasons.push('No clear answer detected');
    }
    
    if (bubbleQuality === 'empty') {
      reasons.push('Empty or unclear response');
    }
    
    return reasons.length > 0 ? reasons.join(', ') : 'Quality threshold not met';
  }

  static validateSimpleAnswer(
    studentAnswer: string,
    correctAnswer: string,
    answerPattern: QuestionClassification['answerPattern']
  ): SimpleAnswerValidation {
    if (!answerPattern) {
      return { isValid: false, normalizedAnswer: studentAnswer, confidence: 0, matchType: 'exact' };
    }

    const student = studentAnswer.trim();
    const correct = correctAnswer.trim();

    switch (answerPattern.type) {
      case 'exact_match':
        return this.validateExactMatch(student, correct, answerPattern.variations || []);
        
      case 'boolean_variation':
        return this.validateBooleanAnswer(student, correct);
        
      case 'numeric_range':
        return this.validateNumericAnswer(student, correct);
        
      case 'case_insensitive':
        return this.validateCaseInsensitive(student, correct);
        
      default:
        return { isValid: false, normalizedAnswer: student, confidence: 0, matchType: 'exact' };
    }
  }

  private static validateExactMatch(
    student: string,
    correct: string,
    variations: string[]
  ): SimpleAnswerValidation {
    const normalizedStudent = student.toUpperCase();
    const normalizedCorrect = correct.toUpperCase();
    
    if (normalizedStudent === normalizedCorrect) {
      return { isValid: true, normalizedAnswer: normalizedStudent, confidence: 1.0, matchType: 'exact' };
    }
    
    // Check variations
    const isValidVariation = variations.some(v => v.toUpperCase() === normalizedStudent);
    
    return {
      isValid: isValidVariation,
      normalizedAnswer: normalizedStudent,
      confidence: isValidVariation ? 0.95 : 0,
      matchType: 'exact'
    };
  }

  private static validateBooleanAnswer(student: string, correct: string): SimpleAnswerValidation {
    const normalizedStudent = student.toLowerCase().trim();
    const normalizedCorrect = correct.toLowerCase().trim();
    
    const studentIsTrue = this.TRUE_PATTERNS.includes(normalizedStudent);
    const studentIsFalse = this.FALSE_PATTERNS.includes(normalizedStudent);
    const correctIsTrue = this.TRUE_PATTERNS.includes(normalizedCorrect);
    
    if (!studentIsTrue && !studentIsFalse) {
      return { isValid: false, normalizedAnswer: student, confidence: 0, matchType: 'boolean' };
    }
    
    const isCorrect = (studentIsTrue && correctIsTrue) || (studentIsFalse && !correctIsTrue);
    
    return {
      isValid: isCorrect,
      normalizedAnswer: studentIsTrue ? 'True' : 'False',
      confidence: 0.95,
      matchType: 'boolean'
    };
  }

  private static validateNumericAnswer(student: string, correct: string): SimpleAnswerValidation {
    const studentNum = this.parseNumeric(student);
    const correctNum = this.parseNumeric(correct);
    
    if (studentNum === null || correctNum === null) {
      return { isValid: false, normalizedAnswer: student, confidence: 0, matchType: 'numeric' };
    }
    
    // Allow small floating point tolerance
    const tolerance = Math.abs(correctNum * 0.001) + 0.001;
    const isValid = Math.abs(studentNum - correctNum) <= tolerance;
    
    return {
      isValid,
      normalizedAnswer: studentNum.toString(),
      confidence: 0.9,
      matchType: 'numeric'
    };
  }

  private static validateCaseInsensitive(student: string, correct: string): SimpleAnswerValidation {
    const normalizedStudent = student.toLowerCase().trim();
    const normalizedCorrect = correct.toLowerCase().trim();
    
    const isExactMatch = normalizedStudent === normalizedCorrect;
    
    // Allow minor variations (remove punctuation, extra spaces)
    const cleanStudent = normalizedStudent.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const cleanCorrect = normalizedCorrect.replace(/[^\w\s]/g, '').replace(/\s+/g, ' ');
    const isCleanMatch = cleanStudent === cleanCorrect;
    
    return {
      isValid: isExactMatch || isCleanMatch,
      normalizedAnswer: normalizedStudent,
      confidence: isExactMatch ? 0.95 : (isCleanMatch ? 0.85 : 0),
      matchType: 'normalized'
    };
  }

  private static parseNumeric(value: string): number | null {
    const cleaned = value.trim().replace(/[^\d.-]/g, '');
    const parsed = parseFloat(cleaned);
    return isNaN(parsed) ? null : parsed;
  }
}
