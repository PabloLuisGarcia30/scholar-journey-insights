import { supabase } from "@/integrations/supabase/client";

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface StructuredData {
  pages: Array<{
    pageNumber: number;
    blocks: Array<{
      blockIndex: number;
      text: string;
      confidence: number;
      boundingBox?: any;
      type: string;
    }>;
    text: string;
    confidence: number;
  }>;
  questions: Array<{
    questionNumber: number;
    questionText: string;
    type: string;
    options?: Array<{
      letter: string;
      text: string;
      rawText: string;
    }>;
    rawText: string;
    confidence: string;
    notes?: string;
  }>;
  answers: Array<{
    questionNumber: number;
    studentAnswer: string;
    type: string;
    rawText: string;
    confidence: string;
  }>;
  metadata: {
    totalPages: number;
    processingNotes: string[];
  };
}

export interface ExtractTextResponse {
  extractedText: string;
  examId: string | null;
  studentName: string | null;
  fileName: string;
  structuredData?: StructuredData;
}

export interface AnalyzeTestRequest {
  files: Array<{
    fileName: string;
    extractedText: string;
    structuredData?: StructuredData;
  }>;
  examId: string;
  studentName: string;
  studentEmail?: string;
}

export interface SkillScore {
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
}

export interface AnalyzeTestResponse {
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  grade: string;
  feedback: string;
  detailed_analysis: string;
  content_skill_scores: SkillScore[];
  subject_skill_scores: SkillScore[];
  student_id: string;
  test_result_id: string;
}

export const extractTextFromFile = async (request: ExtractTextRequest): Promise<ExtractTextResponse> => {
  try {
    console.log('Calling extract-text function with enhanced OCR for:', request.fileName);
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to extract text: ${error.message}`)
    }

    console.log('Enhanced extract-text function response:', data);
    return data
  } catch (error) {
    console.error('Error calling extract-text function:', error)
    throw new Error('Failed to extract text from file. Please try again.')
  }
}

export const analyzeTest = async (request: AnalyzeTestRequest): Promise<AnalyzeTestResponse> => {
  try {
    console.log('Calling analyze-test function with exam ID:', request.examId);
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to analyze test: ${error.message}`)
    }

    console.log('Analyze-test function response:', data);
    return data
  } catch (error) {
    console.error('Error calling analyze-test function:', error)
    throw new Error('Failed to analyze test. Please try again.')
  }
}
