import { supabase } from "@/integrations/supabase/client";

export interface ExtractTextResponse {
  extractedText: string;
  examId: string | null;
  studentName: string | null;
  studentId?: string | null;
  fileName: string;
  structuredData: StructuredData;
}

export interface AnalyzeTestResponse {
  overall_score: number;
  grade: string;
  total_points_earned: number;
  total_points_possible: number;
  feedback?: string;
  content_skill_scores?: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  subject_skill_scores?: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
}

export interface StructuredData {
  documentMetadata?: {
    totalPages?: number;
    processingMethods?: string[];
    overallConfidence?: number;
  };
  pages?: Array<{
    pageNumber: number;
    text: string;
    confidence: number;
  }>;
  questions?: any[];
  answers?: any[];
  validationResults?: {
    questionAnswerAlignment?: number;
    bubbleDetectionAccuracy?: number;
    textOcrAccuracy?: number;
    overallReliability?: number;
  };
}

export const extractTextFromFile = async (request: {
  fileContent: string;
  fileName: string;
}): Promise<ExtractTextResponse> => {
  try {
    console.log('🔍 Extracting text from file:', request.fileName);
    
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: {
        fileName: request.fileName,
        fileContent: request.fileContent,
      },
    });

    if (error) {
      console.error('❌ Text extraction failed:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Text extraction failed: Invalid response');
    }

    console.log('✅ Text extraction successful for:', request.fileName);
    return {
      extractedText: data.extractedText || '',
      examId: data.examId || null,
      studentName: data.studentName || null,
      studentId: data.studentId || null,
      fileName: request.fileName,
      structuredData: data.structuredData || {},
    };
  } catch (error) {
    console.error('❌ Error in extractTextFromFile:', error);
    throw error;
  }
};

export const analyzeTest = async (request: {
  files: Array<{
    fileName: string;
    extractedText: string;
    structuredData: any;
  }>;
  examId: string;
  studentName: string;
  studentEmail?: string;
}): Promise<AnalyzeTestResponse> => {
  try {
    console.log('🔬 Analyzing test with exam ID:', request.examId);
    
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request,
    });

    if (error) {
      console.error('❌ Test analysis failed:', error);
      throw new Error(`Test analysis failed: ${error.message}`);
    }

    if (!data || typeof data.overall_score !== 'number') {
      throw new Error('Test analysis failed: Invalid response format');
    }

    console.log('✅ Test analysis successful, score:', data.overall_score);
    return data;
  } catch (error) {
    console.error('❌ Error in analyzeTest:', error);
    throw error;
  }
};
