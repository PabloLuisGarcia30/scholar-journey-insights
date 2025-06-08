
import { supabase } from "@/integrations/supabase/client";

export interface AnswerKeyMatch {
  questionNumber: number;
  answerKey: any | null;
  matchType: 'exact' | 'fuzzy' | 'missing';
  confidence: number;
  reasoning: string;
}

export interface AnswerKeyValidationResult {
  isValid: boolean;
  totalQuestions: number;
  matchedQuestions: number;
  missingQuestions: number[];
  duplicateQuestions: number[];
  invalidFormats: Array<{ questionNumber: number; format: string; issue: string }>;
  matches: AnswerKeyMatch[];
}

export class AnswerKeyMatchingService {
  private static answerKeyCache = new Map<string, any[]>();
  private static readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private static cacheTimestamps = new Map<string, number>();

  // Phase 2: Replace Index-Based Matching with Proper Database Matching
  static async getAnswerKeysForExam(examId: string): Promise<any[]> {
    // Check cache first
    const cacheKey = examId;
    const cached = this.answerKeyCache.get(cacheKey);
    const timestamp = this.cacheTimestamps.get(cacheKey);
    
    if (cached && timestamp && (Date.now() - timestamp) < this.CACHE_TTL) {
      console.log(`📋 Using cached answer keys for exam: ${examId}`);
      return cached;
    }

    try {
      console.log(`🔍 Fetching answer keys from database for exam: ${examId}`);
      
      const { data: answerKeys, error } = await supabase
        .from('answer_keys')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number', { ascending: true });

      if (error) {
        console.error('❌ Database error fetching answer keys:', error);
        throw new Error(`Failed to fetch answer keys: ${error.message}`);
      }

      if (!answerKeys || answerKeys.length === 0) {
        console.warn(`⚠️ No answer keys found for exam: ${examId}`);
        return [];
      }

      // Cache the results
      this.answerKeyCache.set(cacheKey, answerKeys);
      this.cacheTimestamps.set(cacheKey, Date.now());

      console.log(`✅ Loaded ${answerKeys.length} answer keys for exam: ${examId}`);
      return answerKeys;

    } catch (error) {
      console.error('❌ Error fetching answer keys:', error);
      throw error;
    }
  }

  // Phase 3: Multi-Level Matching Strategy
  static async matchQuestionsToAnswerKeys(
    questions: any[], 
    examId: string
  ): Promise<AnswerKeyValidationResult> {
    console.log(`🎯 Starting answer key matching for ${questions.length} questions, exam: ${examId}`);
    
    const answerKeys = await this.getAnswerKeysForExam(examId);
    const matches: AnswerKeyMatch[] = [];
    const missingQuestions: number[] = [];
    const duplicateQuestions: number[] = [];
    const invalidFormats: Array<{ questionNumber: number; format: string; issue: string }> = [];

    // Create lookup map for answer keys by question number
    const answerKeyMap = new Map<number, any>();
    const questionNumberCounts = new Map<number, number>();

    // Build answer key map and detect duplicates
    for (const answerKey of answerKeys) {
      const qNum = answerKey.question_number;
      const count = questionNumberCounts.get(qNum) || 0;
      questionNumberCounts.set(qNum, count + 1);
      
      if (count === 0) {
        answerKeyMap.set(qNum, answerKey);
      } else {
        duplicateQuestions.push(qNum);
      }
    }

    // Phase 3.1: Primary Matching - Exact question number match
    for (const question of questions) {
      const questionNumber = question.questionNumber;
      const answerKey = answerKeyMap.get(questionNumber);

      if (answerKey) {
        // Validate answer format (A-D only)
        const correctAnswer = answerKey.correct_answer?.toString().trim();
        const formatValidation = this.validateAnswerFormat(correctAnswer);
        
        if (!formatValidation.isValid) {
          invalidFormats.push({
            questionNumber,
            format: correctAnswer || 'undefined',
            issue: formatValidation.issue || 'Invalid format'
          });
        }

        matches.push({
          questionNumber,
          answerKey,
          matchType: 'exact',
          confidence: 1.0,
          reasoning: `Exact match by question number ${questionNumber}`
        });
      } else {
        missingQuestions.push(questionNumber);
        matches.push({
          questionNumber,
          answerKey: null,
          matchType: 'missing',
          confidence: 0.0,
          reasoning: `No answer key found for question ${questionNumber}`
        });
      }
    }

    // Phase 3.2: Secondary Matching - Fuzzy matching for missing questions
    // TODO: Implement fuzzy text matching for unmatched questions if needed

    const validationResult: AnswerKeyValidationResult = {
      isValid: missingQuestions.length === 0 && duplicateQuestions.length === 0 && invalidFormats.length === 0,
      totalQuestions: questions.length,
      matchedQuestions: matches.filter(m => m.answerKey !== null).length,
      missingQuestions,
      duplicateQuestions: [...new Set(duplicateQuestions)], // Remove duplicates
      invalidFormats,
      matches
    };

    console.log(`📊 Answer key matching results:`, {
      total: validationResult.totalQuestions,
      matched: validationResult.matchedQuestions,
      missing: validationResult.missingQuestions.length,
      duplicates: validationResult.duplicateQuestions.length,
      invalidFormats: validationResult.invalidFormats.length
    });

    return validationResult;
  }

  // Phase 3: Answer Key Validation
  private static validateAnswerFormat(correctAnswer: string): { isValid: boolean; issue?: string } {
    if (!correctAnswer) {
      return { isValid: false, issue: 'Missing correct answer' };
    }

    const trimmed = correctAnswer.trim();
    
    // Validate A-D format only
    if (!/^[A-D]$/i.test(trimmed)) {
      if (/^[E-Z]$/i.test(trimmed)) {
        return { isValid: false, issue: 'Answer option beyond D detected - only A-D supported' };
      }
      return { isValid: false, issue: 'Invalid answer format - expected A, B, C, or D' };
    }

    return { isValid: true };
  }

  // Enhanced Error Handling and Reporting
  static generateValidationReport(result: AnswerKeyValidationResult): string {
    let report = `📋 Answer Key Validation Report\n`;
    report += `Total Questions: ${result.totalQuestions}\n`;
    report += `Successfully Matched: ${result.matchedQuestions}\n`;
    
    if (result.missingQuestions.length > 0) {
      report += `❌ Missing Answer Keys: Questions ${result.missingQuestions.join(', ')}\n`;
    }
    
    if (result.duplicateQuestions.length > 0) {
      report += `⚠️ Duplicate Question Numbers: ${result.duplicateQuestions.join(', ')}\n`;
    }
    
    if (result.invalidFormats.length > 0) {
      report += `🚫 Invalid Answer Formats:\n`;
      result.invalidFormats.forEach(invalid => {
        report += `  - Q${invalid.questionNumber}: "${invalid.format}" (${invalid.issue})\n`;
      });
    }
    
    if (result.isValid) {
      report += `✅ Validation Status: PASSED\n`;
    } else {
      report += `❌ Validation Status: FAILED - Manual review required\n`;
    }
    
    return report;
  }

  // Cache Management
  static clearCache(): void {
    this.answerKeyCache.clear();
    this.cacheTimestamps.clear();
    console.log('🧹 Answer key cache cleared');
  }

  static optimizeCache(maxEntries: number = 50): void {
    if (this.answerKeyCache.size > maxEntries) {
      const oldestEntries = Array.from(this.cacheTimestamps.entries())
        .sort(([,a], [,b]) => a - b)
        .slice(0, Math.floor(maxEntries * 0.3))
        .map(([key]) => key);
      
      oldestEntries.forEach(key => {
        this.answerKeyCache.delete(key);
        this.cacheTimestamps.delete(key);
      });
      
      console.log(`🔧 Answer key cache optimized: removed ${oldestEntries.length} entries`);
    }
  }
}
