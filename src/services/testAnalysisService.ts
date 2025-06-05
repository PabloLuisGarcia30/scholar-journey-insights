import { supabase } from "@/integrations/supabase/client";

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface BubbleDetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface RoboflowResponse {
  predictions: BubbleDetection[];
  image: {
    width: number;
    height: number;
  };
}

export interface EnhancedAnswer {
  questionNumber: number;
  selectedOption: string;
  detectionMethod: 'roboflow_bubble' | 'google_ocr' | 'cross_validated';
  confidence: number;
  bubbleCoordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  crossValidated: boolean;
  fallbackUsed?: boolean;
}

export interface EnhancedQuestion {
  questionNumber: number;
  questionText: string;
  type: string;
  options?: Array<{
    letter: string;
    text: string;
    rawText: string;
    coordinates?: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  }>;
  rawText: string;
  confidence: string;
  notes?: string;
  detectedAnswer?: EnhancedAnswer;
}

export interface ValidationResults {
  questionAnswerAlignment: number;
  bubbleDetectionAccuracy: number;
  textOcrAccuracy: number;
  overallReliability: number;
  crossValidationCount: number;
  fallbackUsageCount: number;
}

export interface StructuredData {
  documentMetadata: {
    totalPages: number;
    processingMethods: string[];
    overallConfidence: number;
    roboflowDetections?: number;
    googleOcrBlocks?: number;
  };
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
  questions: EnhancedQuestion[];
  answers: EnhancedAnswer[];
  validationResults: ValidationResults;
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
  dual_ocr_summary?: {
    processing_methods_used: string[];
    overall_reliability: number;
    cross_validated_answers: number;
    high_confidence_detections: number;
    fallback_detections: number;
  };
}

export const extractTextFromFile = async (request: ExtractTextRequest): Promise<ExtractTextResponse> => {
  try {
    console.log('Calling enhanced dual OCR extract-text function for:', request.fileName);
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to extract text: ${error.message}`)
    }

    console.log('Enhanced dual OCR extract-text function response:', data);
    return data
  } catch (error) {
    console.error('Error calling enhanced extract-text function:', error)
    throw new Error('Failed to extract text from file. Please try again.')
  }
}

export const analyzeTest = async (request: AnalyzeTestRequest): Promise<AnalyzeTestResponse> => {
  try {
    console.log('Calling analyze-test function with enhanced structured data for exam ID:', request.examId);
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request
    })

    if (error) {
      console.error('Supabase function error:', error);
      throw new Error(`Failed to analyze test: ${error.message}`)
    }

    console.log('Enhanced analyze-test function response:', data);
    return data
  } catch (error) {
    console.error('Error calling enhanced analyze-test function:', error)
    throw new Error('Failed to analyze test. Please try again.')
  }
}
