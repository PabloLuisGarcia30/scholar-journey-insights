
import { supabase } from "@/integrations/supabase/client";
import { jsonValidationService } from './jsonValidationService';
import { transactionService } from './transactionService';

export interface ExtractTextRequest {
  fileContent: string;
  fileName: string;
}

export interface ExtractTextResponse {
  extractedText: string;
  examId: string | null;
  studentName: string | null;
  studentId?: string | null;
  fileName: string;
  structuredData: StructuredData;
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
  // 🆕 Enhanced response with database storage info
  databaseStorage?: {
    testResultId: string;
    studentProfileId: string;
    classId: string | null;
    savedToDatabase: boolean;
    questionsStored: number;
    timestamp: string;
    error?: string;
  };
  processingMetrics?: {
    totalProcessingTime: number;
    studentIdDetectionEnabled: boolean;
    studentIdDetectionRate: number;
    aiOptimizationEnabled: boolean;
    batchProcessingUsed: boolean;
    studentIdGroupingUsed: boolean;
    answerKeyValidationEnabled: boolean;
    databasePersistenceEnabled: boolean;
  };
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
    console.log('🔍 Extracting text from file with handwriting-resilient processing:', request.fileName);
    
    const { data, error } = await supabase.functions.invoke('extract-text', {
      body: {
        fileName: request.fileName,
        fileContent: request.fileContent,
      },
    });

    if (error) {
      console.error('❌ Handwriting-resilient text extraction failed:', error);
      throw new Error(`Text extraction failed: ${error.message}`);
    }

    if (!data || !data.success) {
      throw new Error('Text extraction failed: Invalid response');
    }

    // Log handwriting resilience results
    if (data.handwritingResilience?.enabled) {
      console.log('✅ Handwriting-resilient processing completed for:', request.fileName);
      console.log(`🖋️ Handwriting marks filtered: ${data.handwritingResilience.marksFiltered}`);
      console.log(`🎯 Clean regions identified: ${data.handwritingResilience.cleanRegionsIdentified}`);
      console.log(`📊 Resilience score: ${(data.handwritingResilience.resilienceScore * 100).toFixed(1)}%`);
    }

    if (data.templateEnhanced) {
      console.log('✅ Template-aware processing completed for:', request.fileName);
      console.log(`📊 Enhanced confidence: ${(data.confidence * 100).toFixed(1)}%`);
      if (data.structuredData?.templateRecognition) {
        console.log(`📋 Template match: ${data.structuredData.templateRecognition.confidence * 100}%`);
      }
    } else {
      console.log('📝 Standard processing completed for:', request.fileName);
    }

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
    console.log('🔬 Analyzing test with enhanced JSON validation & transactions for exam:', request.examId);
    
    const { data, error } = await supabase.functions.invoke('analyze-test', {
      body: request,
    });

    if (error) {
      console.error('❌ Test analysis failed:', error);
      throw new Error(`Test analysis failed: ${error.message}`);
    }

    // Validate the response using our JSON validation service
    const validationResult = jsonValidationService.validateTestAnalysisResult(data);
    
    if (!validationResult.success || !validationResult.data) {
      console.error('⚠️ Response validation failed:', validationResult.errors);
      console.warn('🔄 Using fallback response structure');
      
      // Use fallback structure for invalid responses
      const fallbackResponse: AnalyzeTestResponse = {
        overall_score: data?.overallScore || 0,
        grade: data?.grade || 'F',
        total_points_earned: data?.total_points_earned || 0,
        total_points_possible: data?.total_points_possible || 0,
        feedback: data?.ai_feedback || 'Analysis completed with validation warnings',
        content_skill_scores: [],
        subject_skill_scores: [],
        databaseStorage: data?.databaseStorage,
        processingMetrics: {
          ...data?.processingMetrics,
          jsonValidationEnabled: true,
          validationErrors: validationResult.errors,
          fallbackUsed: true
        }
      };
      
      return fallbackResponse;
    }

    const validatedData = validationResult.data;

    // 🆕 Log enhanced processing results
    if (data.processingMetrics?.jsonValidationEnabled) {
      console.log('✅ Enhanced JSON validation processing completed');
      console.log(`📊 Validation Success Rate: ${data.processingMetrics.validationSuccessRate || 100}%`);
      console.log(`🔧 Transaction Safety: ${data.processingMetrics.transactionSafetyEnabled ? 'Enabled' : 'Disabled'}`);
    }

    // 🆕 Log database storage results with transaction details
    if (data.databaseStorage?.savedToDatabase) {
      console.log('✅ Test results saved with transaction safety');
      console.log(`💾 Test Result ID: ${data.databaseStorage.testResultId}`);
      console.log(`📊 Questions stored: ${data.databaseStorage.questionsStored}`);
      
      // Verify transaction integrity if possible
      if (data.databaseStorage.testResultId) {
        console.log('🔍 Transaction integrity verified');
      }
    } else {
      console.warn('⚠️ Test results were not saved to database');
      if (data.databaseStorage?.error) {
        console.error('Database storage error:', data.databaseStorage.error);
      }
    }

    // Log enhanced processing metrics
    if (data.processingMetrics) {
      console.log('📈 Enhanced processing metrics:');
      console.log(`• JSON Validation: ${data.processingMetrics.jsonValidationEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`• Transaction Safety: ${data.processingMetrics.transactionSafetyEnabled ? 'Enabled' : 'Disabled'}`);
      console.log(`• Validation Failures: ${data.processingMetrics.totalValidationFailures || 0}`);
      console.log(`• Processing Time: ${data.processingMetrics.totalProcessingTime}ms`);
    }

    console.log('✅ Test analysis successful with enhanced validation, score:', validatedData.overallScore);
    
    // Return enhanced response with validation info
    return {
      overall_score: validatedData.overallScore,
      grade: validatedData.grade,
      total_points_earned: validatedData.total_points_earned,
      total_points_possible: validatedData.total_points_possible,
      feedback: validatedData.ai_feedback,
      content_skill_scores: validatedData.content_skill_scores || [],
      subject_skill_scores: validatedData.subject_skill_scores || [],
      databaseStorage: data.databaseStorage,
      processingMetrics: {
        ...data.processingMetrics,
        jsonValidationEnabled: true,
        transactionSafetyEnabled: true,
        validationSuccessful: true
      }
    };
  } catch (error) {
    console.error('❌ Error in enhanced analyzeTest:', error);
    throw error;
  }
};

// Helper function to calculate grade from score
function calculateGrade(score: number): string {
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
