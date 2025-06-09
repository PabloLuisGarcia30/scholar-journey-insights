
import { supabase } from '@/integrations/supabase/client';
import { ConsolidatedGradingService, GradingResult } from './consolidatedGradingService';

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface ExtractTextResponse {
  fileName: string;
  extractedText: string;
  structuredData: any;
  studentId?: string;
  examId?: string;
  confidence: number;
}

export interface AnalyzeTestRequest {
  files: Array<{
    fileName: string;
    extractedText: string;
    structuredData: any;
  }>;
  examId: string;
  studentName: string;
  studentEmail?: string;
}

export interface AnalyzeTestResponse {
  overall_score: number;
  grade: string;
  total_points_earned: number;
  total_points_possible: number;
  feedback: string;
  content_skill_scores: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  subject_skill_scores: Array<{
    skill_name: string;
    score: number;
    points_earned: number;
    points_possible: number;
  }>;
  detailed_results: GradingResult[];
}

export async function extractTextFromFile(request: ExtractTextRequest): Promise<ExtractTextResponse> {
  console.log(`📄 Extracting text from: ${request.fileName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: {
        fileContent: request.fileContent,
        fileName: request.fileName
      }
    });

    if (error) {
      console.error('Text extraction failed:', error);
      throw new Error(`Failed to extract text: ${error.message}`);
    }

    // Return the extracted data with the expected structure
    return {
      fileName: request.fileName,
      extractedText: data.extractedText || '',
      structuredData: data.structuredData || {},
      studentId: data.studentId,
      examId: data.examId,
      confidence: data.confidence || 0.8
    };
  } catch (error) {
    console.error('Error in extractTextFromFile:', error);
    throw error;
  }
}

export async function analyzeTest(request: AnalyzeTestRequest): Promise<AnalyzeTestResponse> {
  console.log(`🔍 Analyzing test for exam: ${request.examId}, student: ${request.studentName}`);
  
  try {
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: {
        files: request.files,
        examId: request.examId,
        studentName: request.studentName,
        studentEmail: request.studentEmail || ''
      }
    });

    if (error) {
      console.error('Test analysis failed:', error);
      throw new Error(`Failed to analyze test: ${error.message}`);
    }

    // If we have detailed question data, grade them with our consolidated service
    let detailed_results: GradingResult[] = [];
    
    if (data.questions && Array.isArray(data.questions)) {
      console.log(`🎯 Grading ${data.questions.length} questions with consolidated service`);
      
      detailed_results = await ConsolidatedGradingService.batchGradeQuestions(
        data.questions.map((q: any) => ({
          questionText: q.questionText || `Question ${q.questionNumber}`,
          studentAnswer: q.studentAnswer || '',
          correctAnswer: q.correctAnswer || '',
          questionNumber: q.questionNumber || 0,
          pointsPossible: q.pointsPossible || 1
        }))
      );
    }

    return {
      overall_score: data.overall_score || 0,
      grade: data.grade || 'F',
      total_points_earned: data.total_points_earned || 0,
      total_points_possible: data.total_points_possible || 0,
      feedback: data.feedback || 'Analysis completed',
      content_skill_scores: data.content_skill_scores || [],
      subject_skill_scores: data.subject_skill_scores || [],
      detailed_results
    };
  } catch (error) {
    console.error('Error in analyzeTest:', error);
    throw error;
  }
}

// Helper function to calculate grade from score
export function calculateGrade(score: number): string {
  if (score >= 97) return 'A+';
  if (score >= 93) return 'A';
  if (score >= 90) return 'A-';
  if (score >= 87) return 'B+';
  if (score >= 83) return 'B';
  if (score >= 80) return 'B-';
  if (score >= 77) return 'C+';
  if (score >= 73) return 'C';
  if (score >= 70) return 'C-';
  if (score >= 67) return 'D+';
  if (score >= 63) return 'D';
  if (score >= 60) return 'D-';
  return 'F';
}
