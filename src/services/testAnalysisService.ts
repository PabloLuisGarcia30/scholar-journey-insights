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
  skill_mapping_available?: boolean;
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
    questions_with_skill_mapping?: number;
    local_skill_scores_calculated?: number;
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
        timeoutMs: 120000,
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
    console.log('Calling enhanced analyze-test function with skill mapping for exam ID:', request.examId);
    
    // Determine detail level based on structured data presence and question-based features
    const hasStructuredData = request.files.some(file => file.structuredData);
    const hasQuestionBasedFeatures = request.files.some(file => 
      file.structuredData?.documentMetadata?.enhancedFeatures?.questionBasedGrouping
    );
    
    const detailLevel = hasQuestionBasedFeatures ? "question_based_skills" : hasStructuredData ? "detailed_skills" : "summary_skills";
    
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
            'x-question-based-features': hasQuestionBasedFeatures ? 'true' : 'false',
            'x-skill-mapping-enabled': 'true'
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
        timeoutMs: 150000, // Increased timeout for skill analysis
      }
    );

    console.log('Enhanced analyze-test function with skill mapping response:', result);
    
    // Log enhanced performance metrics
    if (result.question_based_grading_summary) {
      const summary = result.question_based_grading_summary;
      console.log(`Enhanced Question-Based Grading with Skills Performance:
        - Total Questions: ${summary.total_questions}
        - Locally Graded: ${summary.locally_graded} (${Math.round(summary.local_accuracy * 100)}%)
        - AI Graded: ${summary.ai_graded}
        - API Calls Saved: ${summary.api_calls_saved}%
        - Skill Mapping Available: ${summary.skill_mapping_available}
        - Processing Method: ${summary.processing_method}`);
        
      if (summary.enhanced_metrics) {
        console.log(`Enhanced Metrics:
          - Question-Based Graded: ${summary.enhanced_metrics.question_based_graded}
          - High Confidence: ${summary.enhanced_metrics.high_confidence_graded}
          - Multiple Marks Detected: ${summary.enhanced_metrics.multiple_marks_detected}
          - Review Flagged: ${summary.enhanced_metrics.review_flagged}`);
      }
    }
    
    // Log skill mapping results
    if (result.enhanced_question_analysis) {
      const questionAnalysis = result.enhanced_question_analysis;
      console.log(`Enhanced Question Analysis with Skills:
        - Total Questions: ${questionAnalysis.total_questions_processed}
        - Clear Answers: ${questionAnalysis.questions_with_clear_answers}
        - With Skill Mapping: ${questionAnalysis.questions_with_skill_mapping || 0}
        - Local Skill Scores: ${questionAnalysis.local_skill_scores_calculated || 0}
        - Processing Improvements: ${questionAnalysis.processing_improvements.join(', ')}`);
    }
    
    return result;
  } catch (error) {
    console.error('Error calling enhanced analyze-test function with skills:', error);
    
    if (error instanceof RetryableError) {
      throw new Error(`Failed to analyze test after multiple attempts: ${error.message}`);
    }
    
    throw new Error('Failed to analyze test. Please try again.');
  }
};

// New function to trigger skill analysis for an exam
export const analyzeExamSkills = async (examId: string) => {
  try {
    console.log('Triggering skill analysis for exam:', examId);
    
    const { data, error } = await supabase.functions.invoke('analyze-exam-skills', {
      body: { examId }
    });

    if (error) {
      console.error('Error triggering skill analysis:', error);
      throw new Error(`Failed to analyze exam skills: ${error.message}`);
    }

    console.log('Skill analysis result:', data);
    return data;
  } catch (error) {
    console.error('Error in analyzeExamSkills:', error);
    throw new Error('Failed to analyze exam skills. Please try again.');
  }
};

// Check if skill mappings exist for an exam
export const checkExamSkillMappings = async (examId: string): Promise<boolean> => {
  try {
    const { data } = await supabase
      .from('exam_skill_analysis')
      .select('analysis_status')
      .eq('exam_id', examId)
      .maybeSingle();

    return data?.analysis_status === 'completed';
  } catch (error) {
    console.error('Error checking skill mappings:', error);
    return false;
  }
};

// Get skill mapping status for an exam
export const getExamSkillMappingStatus = async (examId: string) => {
  try {
    const { data, error } = await supabase
      .from('exam_skill_analysis')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching skill mapping status:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Error in getExamSkillMappingStatus:', error);
    return null;
  }
};

// Enhanced service health monitoring with skill mapping
export const getEnhancedServiceHealthStatus = () => {
  return {
    googleVision: googleVisionCircuitBreaker.getState(),
    roboflow: roboflowCircuitBreaker.getState(),
    openai: openaiCircuitBreaker.getState(),
    enhancedFeatures: {
      questionBasedGrouping: true,
      singleAnswerPerQuestion: true,
      multipleMarkDetection: true,
      reviewFlags: true,
      skillMapping: true,
      oneTimeSkillAnalysis: true
    }
  };
};

// Export legacy function for backwards compatibility
export const getServiceHealthStatus = getEnhancedServiceHealthStatus;
