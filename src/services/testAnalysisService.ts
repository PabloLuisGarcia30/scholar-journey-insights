
import { supabase } from "@/integrations/supabase/client";
import { withRetry, CircuitBreaker, RetryableError } from "./retryService";

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
  detectionMethod: 'question_based_selection' | 'ai_fallback' | 'no_clear_selection' | 'fallback';
  confidence: number;
  bubbleCoordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  crossValidated: boolean;
  fallbackUsed?: boolean;
  // Enhanced question-based detection properties
  bubbleQuality?: 'empty' | 'light' | 'medium' | 'heavy' | 'overfilled' | 'unknown';
  reviewFlag?: boolean;
  multipleMarksDetected?: boolean;
  qualityAssessment?: {
    bubbleCount: number;
    maxBubbleConfidence: number;
    fillLevelConsistency: number;
    spatialAlignment: number;
  };
  processingNotes?: string[];
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

export interface QuestionGroup {
  questionNumber: number;
  bubbleCount: number;
  selectedAnswer: {
    optionLetter: string;
    bubble: any;
    confidence: number;
  } | null;
  hasMultipleMarks: boolean;
  reviewRequired: boolean;
  processingNotes: string[];
}

export interface ValidationResults {
  questionAnswerAlignment: number;
  bubbleDetectionAccuracy: number;
  textOcrAccuracy: number;
  qualityAssuranceScore?: number;
  overallReliability: number;
  crossValidationCount: number;
  qualityFlaggedCount: number;
  enhancedMetrics?: {
    questionsWithClearAnswers: number;
    questionsWithMultipleMarks: number;
    questionsNeedingReview: number;
    highConfidenceAnswers: number;
    reviewFlaggedAnswers: number;
  };
}

export interface StructuredData {
  documentMetadata: {
    totalPages: number;
    processingMethods: string[];
    overallConfidence: number;
    roboflowDetections?: number;
    googleOcrBlocks?: number;
    enhancedFeatures?: {
      questionBasedGrouping: boolean;
      singleAnswerPerQuestion: boolean;
      multipleMarkDetection: boolean;
      reviewFlags: boolean;
    };
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
  questionGroups?: QuestionGroup[];
  validationResults: ValidationResults;
  answerPatternAnalysis?: {
    consistencyScore: number;
    potentialIssues: string[];
    reviewRecommendations: string[];
  };
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

export interface QuestionBasedGradingSummary {
  total_questions: number;
  locally_graded: number;
  ai_graded: number;
  local_accuracy: number;
  processing_method: string;
  api_calls_saved: number;
  enhanced_metrics?: {
    question_based_graded: number;
    high_confidence_graded: number;
    medium_confidence_graded: number;
    enhanced_threshold_graded: number;
    multiple_marks_detected: number;
    review_flagged: number;
    bubble_quality_distribution: Record<string, number>;
  };
  quality_report?: {
    overall_quality: string;
    recommendations: string[];
    quality_distribution: Record<string, number>;
  };
}

export interface EnhancedAnalyzeTestResponse extends AnalyzeTestResponse {
  question_based_grading_summary?: QuestionBasedGradingSummary;
  enhanced_question_analysis?: {
    total_questions_processed: number;
    questions_with_clear_answers: number;
    questions_with_multiple_marks: number;
    questions_needing_review: number;
    processing_improvements: string[];
  };
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

// Create circuit breakers for external services
const googleVisionCircuitBreaker = new CircuitBreaker(3, 30000);
const roboflowCircuitBreaker = new CircuitBreaker(3, 30000);
const openaiCircuitBreaker = new CircuitBreaker(3, 30000);

export const extractTextFromFile = async (request: ExtractTextRequest): Promise<ExtractTextResponse> => {
  try {
    console.log('Calling enhanced question-based extract-text function for:', request.fileName);
    
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('extract-text', {
          body: request
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw new RetryableError(`Failed to extract text: ${error.message}`);
        }

        return data;
      },
      {
        maxAttempts: 3,
        baseDelay: 2000,
        timeoutMs: 120000, // 2 minutes for OCR processing
      }
    );

    console.log('Enhanced question-based extract-text function response:', result);
    return result;
  } catch (error) {
    console.error('Error calling enhanced extract-text function:', error);
    
    if (error instanceof RetryableError) {
      throw new Error(`Failed to extract text after multiple attempts: ${error.message}`);
    }
    
    throw new Error('Failed to extract text from file. Please try again.');
  }
};

export const analyzeTest = async (request: AnalyzeTestRequest): Promise<EnhancedAnalyzeTestResponse> => {
  try {
    console.log('Calling enhanced question-based analyze-test function for exam ID:', request.examId);
    
    // Determine detail level based on structured data presence and question-based features
    const hasStructuredData = request.files.some(file => file.structuredData);
    const hasQuestionBasedFeatures = request.files.some(file => 
      file.structuredData?.documentMetadata?.enhancedFeatures?.questionBasedGrouping
    );
    
    const detailLevel = hasQuestionBasedFeatures ? "question_based" : hasStructuredData ? "detailed" : "summary";
    
    console.log('Analysis detail level:', detailLevel, {
      hasStructuredData,
      hasQuestionBasedFeatures,
      questionGroupCount: request.files.reduce((count, file) => 
        count + (file.structuredData?.questionGroups?.length || 0), 0
      )
    });
    
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('analyze-test', {
          body: request,
          headers: {
            'x-detail-level': detailLevel,
            'x-question-based-features': hasQuestionBasedFeatures ? 'true' : 'false'
          }
        });

        if (error) {
          console.error('Supabase function error:', error);
          throw new RetryableError(`Failed to analyze test: ${error.message}`);
        }

        return data;
      },
      {
        maxAttempts: 2,
        baseDelay: 3000,
        timeoutMs: 120000, // Increased timeout for enhanced analysis
      }
    );

    console.log('Enhanced question-based analyze-test function response:', result);
    
    // Log question-based grading performance if available
    if (result.question_based_grading_summary) {
      const summary = result.question_based_grading_summary;
      console.log(`Question-Based Grading Performance:
        - Total Questions: ${summary.total_questions}
        - Locally Graded: ${summary.locally_graded} (${Math.round(summary.local_accuracy * 100)}%)
        - AI Graded: ${summary.ai_graded}
        - API Calls Saved: ${summary.api_calls_saved}%
        - Processing Method: ${summary.processing_method}`);
        
      if (summary.enhanced_metrics) {
        console.log(`Enhanced Question-Based Metrics:
          - Question-Based Graded: ${summary.enhanced_metrics.question_based_graded}
          - High Confidence: ${summary.enhanced_metrics.high_confidence_graded}
          - Medium Confidence: ${summary.enhanced_metrics.medium_confidence_graded}  
          - Enhanced Threshold: ${summary.enhanced_metrics.enhanced_threshold_graded}
          - Multiple Marks Detected: ${summary.enhanced_metrics.multiple_marks_detected}
          - Review Flagged: ${summary.enhanced_metrics.review_flagged}
          - Bubble Quality: ${JSON.stringify(summary.enhanced_metrics.bubble_quality_distribution)}`);
      }
      
      if (summary.quality_report) {
        console.log(`Quality Report:
          - Overall Quality: ${summary.quality_report.overall_quality}
          - Recommendations: ${summary.quality_report.recommendations.join(', ')}
          - Quality Distribution: ${JSON.stringify(summary.quality_report.quality_distribution)}`);
      }
    }
    
    // Log enhanced question analysis if available
    if (result.enhanced_question_analysis) {
      const questionAnalysis = result.enhanced_question_analysis;
      console.log(`Enhanced Question Analysis:
        - Total Questions: ${questionAnalysis.total_questions_processed}
        - Clear Answers: ${questionAnalysis.questions_with_clear_answers}
        - Multiple Marks: ${questionAnalysis.questions_with_multiple_marks}
        - Needing Review: ${questionAnalysis.questions_needing_review}
        - Processing Improvements: ${questionAnalysis.processing_improvements.join(', ')}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error calling enhanced analyze-test function:', error);
    
    if (error instanceof RetryableError) {
      throw new Error(`Failed to analyze test after multiple attempts: ${error.message}`);
    }
    
    throw new Error('Failed to analyze test. Please try again.');
  }
};

// Enhanced service health monitoring
export const getEnhancedServiceHealthStatus = () => {
  return {
    googleVision: googleVisionCircuitBreaker.getState(),
    roboflow: roboflowCircuitBreaker.getState(),
    openai: openaiCircuitBreaker.getState(),
    enhancedFeatures: {
      questionBasedGrouping: true,
      singleAnswerPerQuestion: true,
      multipleMarkDetection: true,
      reviewFlags: true
    }
  };
};

// Export legacy function for backwards compatibility
export const getServiceHealthStatus = getEnhancedServiceHealthStatus;
