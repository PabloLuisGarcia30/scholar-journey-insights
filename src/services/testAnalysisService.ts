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
  detectionMethod: 'roboflow_bubble' | 'google_ocr' | 'cross_validated' | 'enhanced_bubble' | 'fallback';
  confidence: number;
  bubbleCoordinates?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  crossValidated: boolean;
  fallbackUsed?: boolean;
  // Enhanced bubble detection properties
  bubbleQuality?: 'empty' | 'light' | 'medium' | 'heavy' | 'overfilled' | 'unknown';
  reviewFlag?: boolean;
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

export interface ValidationResults {
  questionAnswerAlignment: number;
  bubbleDetectionAccuracy: number;
  textOcrAccuracy: number;
  qualityAssuranceScore?: number;
  overallReliability: number;
  crossValidationCount: number;
  fallbackUsageCount: number;
  enhancedMetrics?: {
    emptyBubbles: number;
    lightBubbles: number;
    questionableBubbles: number;
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
      bubbleQualityAnalysis: boolean;
      crossValidation: boolean;
      confidenceScoring: boolean;
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
  enhancedBubbleData?: Array<{
    class: string;
    confidence: number;
    x: number;
    y: number;
    width: number;
    height: number;
    quality: {
      fillLevel: 'empty' | 'light' | 'medium' | 'heavy' | 'overfilled';
      confidence: number;
      detectionMethod: string;
      spatialConsistency: number;
    };
    questionContext?: {
      questionNumber: number;
      spatialGroup: number;
    };
  }>;
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

export interface HybridGradingSummary {
  total_questions: number;
  locally_graded: number;
  ai_graded: number;
  local_accuracy: number;
  processing_method: string;
  api_calls_saved: number;
  enhanced_metrics?: {
    high_confidence_graded: number;
    medium_confidence_graded: number;
    enhanced_threshold_graded: number;
    quality_flagged: number;
    bubble_quality_distribution: Record<string, number>;
  };
  quality_report?: {
    overall_quality: string;
    recommendations: string[];
    quality_distribution: Record<string, number>;
  };
}

export interface EnhancedAnalyzeTestResponse extends AnalyzeTestResponse {
  hybrid_grading_summary?: HybridGradingSummary;
  enhanced_bubble_analysis?: {
    total_bubbles_detected: number;
    quality_distribution: Record<string, number>;
    review_flagged_count: number;
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
    console.log('Calling enhanced dual OCR extract-text function with retry logic for:', request.fileName);
    
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

    console.log('Enhanced dual OCR extract-text function response:', result);
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
    console.log('Calling enhanced analyze-test function with hybrid grading and bubble quality analysis for exam ID:', request.examId);
    
    // Determine detail level based on structured data presence and enhanced features
    const hasStructuredData = request.files.some(file => file.structuredData);
    const hasEnhancedFeatures = request.files.some(file => 
      file.structuredData?.documentMetadata?.enhancedFeatures?.bubbleQualityAnalysis
    );
    
    const detailLevel = hasEnhancedFeatures ? "enhanced" : hasStructuredData ? "detailed" : "summary";
    
    console.log('Analysis detail level:', detailLevel, {
      hasStructuredData,
      hasEnhancedFeatures,
      enhancedBubbleCount: request.files.reduce((count, file) => 
        count + (file.structuredData?.enhancedBubbleData?.length || 0), 0
      )
    });
    
    const result = await withRetry(
      async () => {
        const { data, error } = await supabase.functions.invoke('analyze-test', {
          body: request,
          headers: {
            'x-detail-level': detailLevel,
            'x-enhanced-features': hasEnhancedFeatures ? 'true' : 'false'
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

    console.log('Enhanced hybrid analyze-test function response:', result);
    
    // Log enhanced grading performance if available
    if (result.hybrid_grading_summary) {
      const summary = result.hybrid_grading_summary;
      console.log(`Enhanced Hybrid Grading Performance:
        - Total Questions: ${summary.total_questions}
        - Locally Graded: ${summary.locally_graded} (${Math.round(summary.local_accuracy * 100)}%)
        - AI Graded: ${summary.ai_graded}
        - API Calls Saved: ${summary.api_calls_saved}%
        - Processing Method: ${summary.processing_method}`);
        
      if (summary.enhanced_metrics) {
        console.log(`Enhanced Metrics:
          - High Confidence: ${summary.enhanced_metrics.high_confidence_graded}
          - Medium Confidence: ${summary.enhanced_metrics.medium_confidence_graded}  
          - Enhanced Threshold: ${summary.enhanced_metrics.enhanced_threshold_graded}
          - Quality Flagged: ${summary.enhanced_metrics.quality_flagged}
          - Bubble Quality: ${JSON.stringify(summary.enhanced_metrics.bubble_quality_distribution)}`);
      }
      
      if (summary.quality_report) {
        console.log(`Quality Report:
          - Overall Quality: ${summary.quality_report.overall_quality}
          - Recommendations: ${summary.quality_report.recommendations.join(', ')}
          - Quality Distribution: ${JSON.stringify(summary.quality_report.quality_distribution)}`);
      }
    }
    
    // Log enhanced bubble analysis if available
    if (result.enhanced_bubble_analysis) {
      const bubbleAnalysis = result.enhanced_bubble_analysis;
      console.log(`Enhanced Bubble Analysis:
        - Total Bubbles: ${bubbleAnalysis.total_bubbles_detected}
        - Review Flagged: ${bubbleAnalysis.review_flagged_count}
        - Quality Distribution: ${JSON.stringify(bubbleAnalysis.quality_distribution)}
        - Processing Improvements: ${bubbleAnalysis.processing_improvements.join(', ')}`);
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
      bubbleQualityAnalysis: true,
      crossValidation: true,
      confidenceScoring: true,
      reviewFlags: true
    }
  };
};

// Export legacy function for backwards compatibility
export const getServiceHealthStatus = getEnhancedServiceHealthStatus;
