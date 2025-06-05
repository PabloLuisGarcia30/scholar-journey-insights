
import { supabase } from "@/integrations/supabase/client";

export interface ExamIdDetectionResult {
  examId: string | null;
  confidence: number;
  detectionMethod: 'direct_match' | 'pattern_match' | 'fuzzy_match' | 'suggested' | 'failed';
  suggestions: string[];
  rawMatches: string[];
}

export interface ExamValidationResult {
  isValid: boolean;
  examDetails?: {
    id: string;
    title: string;
    class_name: string;
    total_points: number;
  };
  suggestions: string[];
}

export class ExamIdDetectionService {
  private static readonly EXAM_ID_PATTERNS = [
    /(?:exam|test|id)[\s\-_]*:?\s*([A-Z0-9\-_]{3,15})/gi,
    /(?:^|\s)([A-Z]{2,4}[\-_]?\d{2,6})(?:\s|$)/g,
    /(?:^|\s)(EXAM[\-_]?\d{2,6})(?:\s|$)/gi,
    /(?:^|\s)(TEST[\-_]?\d{2,6})(?:\s|$)/gi,
    /(?:^|\s)([A-Z]\d{3,6})(?:\s|$)/g,
    /(?:^|\s)(\d{4,6}[A-Z]{1,3})(?:\s|$)/g,
  ];

  static async detectExamId(extractedText: string): Promise<ExamIdDetectionResult> {
    const rawMatches: string[] = [];
    let bestMatch: string | null = null;
    let confidence = 0;
    let detectionMethod: ExamIdDetectionResult['detectionMethod'] = 'failed';

    // Step 1: Try direct pattern matching
    for (const pattern of this.EXAM_ID_PATTERNS) {
      const matches = extractedText.match(pattern);
      if (matches) {
        rawMatches.push(...matches.map(m => m.trim()));
      }
    }

    // Clean and deduplicate matches
    const cleanMatches = [...new Set(rawMatches)]
      .map(match => match.replace(/[^\w\-]/g, ''))
      .filter(match => match.length >= 3 && match.length <= 15);

    if (cleanMatches.length > 0) {
      // Step 2: Validate against database
      const validationResults = await Promise.all(
        cleanMatches.map(match => this.validateExamId(match))
      );

      const validMatch = validationResults.find(result => result.isValid);
      if (validMatch && validMatch.examDetails) {
        bestMatch = validMatch.examDetails.id;
        confidence = 0.95;
        detectionMethod = 'direct_match';
      } else {
        // Step 3: Try fuzzy matching
        const fuzzyResult = await this.fuzzyMatchExamId(cleanMatches[0]);
        if (fuzzyResult.isValid && fuzzyResult.examDetails) {
          bestMatch = fuzzyResult.examDetails.id;
          confidence = 0.7;
          detectionMethod = 'fuzzy_match';
        }
      }
    }

    // Step 4: Get suggestions from recent/active exams
    const suggestions = await this.getExamSuggestions();

    return {
      examId: bestMatch,
      confidence,
      detectionMethod,
      suggestions,
      rawMatches: cleanMatches
    };
  }

  static async validateExamId(examId: string): Promise<ExamValidationResult> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('id, exam_id, title, class_name, total_points')
        .eq('exam_id', examId)
        .maybeSingle();

      if (error) {
        console.warn('Error validating exam ID:', error);
        return { isValid: false, suggestions: [] };
      }

      if (data) {
        return {
          isValid: true,
          examDetails: {
            id: data.exam_id,
            title: data.title,
            class_name: data.class_name || 'Unknown Class',
            total_points: data.total_points || 0
          },
          suggestions: []
        };
      }

      // If not found, get suggestions
      const suggestions = await this.getExamSuggestions();
      return { isValid: false, suggestions };
    } catch (error) {
      console.error('Error validating exam ID:', error);
      return { isValid: false, suggestions: [] };
    }
  }

  static async fuzzyMatchExamId(candidateId: string): Promise<ExamValidationResult> {
    try {
      // Get recent exams for fuzzy matching
      const { data: exams, error } = await supabase
        .from('exams')
        .select('exam_id, title, class_name, total_points')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error || !exams) {
        return { isValid: false, suggestions: [] };
      }

      // Simple fuzzy matching - look for similar patterns
      for (const exam of exams) {
        const similarity = this.calculateSimilarity(candidateId.toLowerCase(), exam.exam_id.toLowerCase());
        if (similarity > 0.7) {
          return {
            isValid: true,
            examDetails: {
              id: exam.exam_id,
              title: exam.title,
              class_name: exam.class_name || 'Unknown Class',
              total_points: exam.total_points || 0
            },
            suggestions: []
          };
        }
      }

      return { isValid: false, suggestions: exams.map(e => e.exam_id) };
    } catch (error) {
      console.error('Error in fuzzy matching:', error);
      return { isValid: false, suggestions: [] };
    }
  }

  static async getExamSuggestions(): Promise<string[]> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('exam_id, title')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error || !data) {
        return [];
      }

      return data.map(exam => exam.exam_id);
    } catch (error) {
      console.error('Error getting exam suggestions:', error);
      return [];
    }
  }

  private static calculateSimilarity(str1: string, str2: string): number {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const distance = this.levenshteinDistance(longer, shorter);
    return (longer.length - distance) / longer.length;
  }

  private static levenshteinDistance(str1: string, str2: string): number {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }

  static async getRecentExams(limit: number = 5): Promise<Array<{
    exam_id: string;
    title: string;
    class_name: string;
    created_at: string;
  }>> {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('exam_id, title, class_name, created_at')
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) {
        console.warn('Error fetching recent exams:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error fetching recent exams:', error);
      return [];
    }
  }
}
