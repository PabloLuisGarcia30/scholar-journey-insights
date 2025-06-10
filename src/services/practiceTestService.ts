import { supabase } from '@/integrations/supabase/client';

export interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
  skillDistribution?: Array<{
    skill_name: string;
    score: number;
    questions: number;
  }>;
}

export interface PracticeTestQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
}

export interface PracticeTestData {
  title: string;
  description: string;
  questions: PracticeTestQuestion[];
  totalPoints: number;
  estimatedTime: number;
  skillName: string;
}

export interface MultiPracticeTestResult {
  skillName: string;
  skillScore: number;
  status: 'pending' | 'generating' | 'completed' | 'error';
  testData?: PracticeTestData;
  error?: string;
}

export interface HistoricalQuestion {
  question_text: string;
  question_type: string;
  options?: any;
  points: number;
  exam_title?: string;
}

export interface SkillDistribution {
  skill_name: string;
  score: number;
  questions: number;
}

// Enhanced retry configuration with adaptive strategies
const RETRY_CONFIG = {
  maxAttempts: 3, // Increased for better resilience
  baseDelay: 1500, // Slightly longer base delay
  backoffMultiplier: 2,
  maxDelay: 12000, // Increased max delay
  adaptiveRetry: true // Enable adaptive retry strategies
};

// Enhanced client-side retry wrapper with circuit breaker pattern
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold = 3;
  private readonly recoveryTimeout = 60000; // 1 minute

  canExecute(): boolean {
    if (this.failures < this.failureThreshold) {
      return true;
    }
    
    if (Date.now() - this.lastFailureTime > this.recoveryTimeout) {
      this.failures = 0; // Reset on recovery timeout
      return true;
    }
    
    return false;
  }

  onSuccess(): void {
    this.failures = 0;
  }

  onFailure(): void {
    this.failures++;
    this.lastFailureTime = Date.now();
  }
}

const circuitBreaker = new CircuitBreaker();

// Enhanced retry wrapper with adaptive strategies
async function withEnhancedRetry<T>(
  operation: () => Promise<T>,
  context: string = 'operation',
  attempt: number = 1
): Promise<T> {
  // Check circuit breaker
  if (!circuitBreaker.canExecute()) {
    throw new Error('Service temporarily unavailable. Please try again in a moment.');
  }

  try {
    const result = await operation();
    circuitBreaker.onSuccess();
    console.log(`✅ ${context} succeeded on attempt ${attempt}`);
    return result;
  } catch (error) {
    console.log(`❌ ${context} attempt ${attempt} failed:`, error);
    
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      circuitBreaker.onFailure();
      throw error;
    }

    // Enhanced error classification for better retry decisions
    const errorMessage = error instanceof Error ? error.message : String(error);
    const isRetryable = 
      errorMessage.includes('temporarily unavailable') || 
      errorMessage.includes('server had an error') ||
      errorMessage.includes('rate limit') ||
      errorMessage.includes('timeout') ||
      errorMessage.includes('network') ||
      errorMessage.includes('503') ||
      errorMessage.includes('502') ||
      errorMessage.includes('500');
    
    if (!isRetryable) {
      circuitBreaker.onFailure();
      throw error;
    }

    // Adaptive delay calculation
    let delay = RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1);
    
    // Add jitter to prevent thundering herd
    const jitter = Math.random() * 1000;
    delay = Math.min(delay + jitter, RETRY_CONFIG.maxDelay);
    
    // Adaptive retry: reduce complexity on retry for multi-skill requests
    if (RETRY_CONFIG.adaptiveRetry && errorMessage.includes('Question') && errorMessage.includes('missing')) {
      console.log(`🔄 Applying adaptive retry strategy for attempt ${attempt + 1}`);
      // This would be handled in the edge function with simpler question generation
    }
    
    console.log(`⏱️ Retrying ${context} in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    return withEnhancedRetry(operation, context, attempt + 1);
  }
}

// Enhanced skill distribution validator
function validateSkillDistribution(
  skillDistribution: Array<{ skill_name: string; score: number; questions: number }>,
  totalQuestions: number
): { isValid: boolean; errors: string[]; fixedDistribution?: typeof skillDistribution } {
  const errors: string[] = [];
  
  if (!skillDistribution || skillDistribution.length === 0) {
    errors.push('No skills provided for practice test generation');
    return { isValid: false, errors };
  }

  if (totalQuestions <= 0) {
    errors.push('Question count must be greater than 0');
    return { isValid: false, errors };
  }

  // Check for invalid skill data
  const invalidSkills = skillDistribution.filter(skill => 
    !skill.skill_name || 
    typeof skill.score !== 'number' || 
    skill.score < 0 || 
    skill.score > 100 ||
    typeof skill.questions !== 'number' ||
    skill.questions < 0
  );

  if (invalidSkills.length > 0) {
    errors.push(`Invalid skill data found: ${invalidSkills.map(s => s.skill_name || 'unnamed').join(', ')}`);
    return { isValid: false, errors };
  }

  // Calculate totals
  const requestedQuestions = skillDistribution.reduce((sum, skill) => sum + skill.questions, 0);
  
  // Auto-fix distribution if possible
  let fixedDistribution = [...skillDistribution];
  
  if (requestedQuestions !== totalQuestions) {
    const difference = totalQuestions - requestedQuestions;
    
    if (difference > 0) {
      // Add questions to skill with lowest score (needs most practice)
      const lowestScoreSkill = fixedDistribution.reduce((min, skill) => 
        skill.score < min.score ? skill : min
      );
      lowestScoreSkill.questions += difference;
    } else if (difference < 0) {
      // Remove questions from skills with highest scores
      let remaining = Math.abs(difference);
      const sortedByScore = [...fixedDistribution].sort((a, b) => b.score - a.score);
      
      for (const skill of sortedByScore) {
        if (remaining <= 0) break;
        const canRemove = Math.min(remaining, skill.questions - 1); // Keep at least 1
        skill.questions -= canRemove;
        remaining -= canRemove;
      }
    }
  }

  // Handle edge case: more skills than questions
  if (fixedDistribution.length > totalQuestions && totalQuestions > 0) {
    // Select skills with lowest scores (need most practice)
    fixedDistribution = fixedDistribution
      .sort((a, b) => a.score - b.score)
      .slice(0, totalQuestions)
      .map(skill => ({ ...skill, questions: 1 }));
  }

  return { isValid: true, errors: [], fixedDistribution };
}

export async function getHistoricalQuestionsForSkill(classId: string, skillName: string): Promise<HistoricalQuestion[]> {
  console.log('📚 Fetching historical questions for class:', classId, 'skill:', skillName);
  
  try {
    // Get exams for this class
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('exam_id, title')
      .eq('class_id', classId);

    if (examError) {
      console.error('❌ Error fetching class exams:', examError);
      return [];
    }

    if (!exams || exams.length === 0) {
      console.log('📝 No exams found for class:', classId);
      return [];
    }

    const examIds = exams.map(exam => exam.exam_id);
    console.log('📋 Found exams:', examIds);

    // Get answer keys for these exams
    const { data: questions, error: questionsError } = await supabase
      .from('answer_keys')
      .select('question_text, question_type, options, points, exam_id')
      .in('exam_id', examIds)
      .limit(10); // Limit to avoid too many results

    if (questionsError) {
      console.error('❌ Error fetching historical questions:', questionsError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log('📝 No historical questions found for exams:', examIds);
      return [];
    }

    // Enhance questions with exam titles
    const enhancedQuestions = questions.map(q => {
      const exam = exams.find(e => e.exam_id === q.exam_id);
      return {
        ...q,
        exam_title: exam?.title || 'Unknown Exam'
      };
    });

    console.log(`✅ Found ${enhancedQuestions.length} historical questions`);
    return enhancedQuestions;

  } catch (error) {
    console.error('💥 Unexpected error fetching historical questions:', error);
    return [];
  }
}

export interface PracticeTestGenerationRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
  skillDistribution?: SkillDistribution[];
  multiSkillSupport?: boolean;
  exerciseId?: string; // NEW: Add exerciseId for answer key storage
}

export class PracticeTestService {
  static async generatePracticeTest(request: PracticeTestGenerationRequest): Promise<PracticeTestData> {
    console.log('🎯 Generating practice test with request:', request);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-practice-test', {
        body: {
          studentName: request.studentName,
          className: request.className,
          skillName: request.skillName,
          grade: request.grade,
          subject: request.subject,
          questionCount: request.questionCount || 5,
          classId: request.classId,
          skillDistribution: request.skillDistribution,
          multiSkillSupport: request.multiSkillSupport || false,
          exerciseId: request.exerciseId // NEW: Pass exerciseId to edge function
        }
      });

      if (error) {
        console.error('❌ Supabase function error:', error);
        throw error;
      }

      if (!data) {
        throw new Error('No data returned from practice test generation');
      }

      console.log('✅ Practice test generated successfully');
      return data as PracticeTestData;

    } catch (error) {
      console.error('❌ Error generating practice test:', error);
      throw error;
    }
  }

  static async generateMultiplePracticeTests(
    skills: Array<{ name: string; score: number }>,
    baseRequest: Omit<GeneratePracticeTestRequest, 'skillName'>
  ): Promise<MultiPracticeTestResult[]> {
    console.log('🎯 Generating practice tests for multiple skills with enhanced error handling:', skills.map(s => s.name));
    
    // Enhanced input validation
    if (!skills || skills.length === 0) {
      throw new Error('No skills provided for practice test generation');
    }

    if (skills.length > 10) {
      throw new Error('Too many skills requested. Maximum 10 skills per batch.');
    }

    const results: MultiPracticeTestResult[] = skills.map(skill => ({
      skillName: skill.name,
      skillScore: skill.score,
      status: 'pending' as const
    }));

    // Enhanced processing with partial success handling
    let successCount = 0;
    let totalAttempts = 0;

    for (let i = 0; i < skills.length; i++) {
      const skill = skills[i];
      results[i].status = 'generating';
      totalAttempts++;
      
      try {
        console.log(`🔄 Generating test ${i + 1}/${skills.length} for skill: ${skill.name}`);
        
        const testData = await this.generatePracticeTest({
          ...baseRequest,
          skillName: skill.name
        });
        
        results[i].status = 'completed';
        results[i].testData = testData;
        successCount++;
        
        console.log(`✅ Successfully generated practice test ${i + 1}/${skills.length} for skill: ${skill.name}`);
        
        // Add small delay between requests to avoid overwhelming the service
        if (i < skills.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
      } catch (error) {
        console.error(`❌ Failed to generate practice test for skill ${skill.name}:`, error);
        results[i].status = 'error';
        results[i].error = error instanceof Error ? error.message : 'Unknown error';
        
        // Continue with other skills instead of failing completely
        console.log(`⏭️ Continuing with remaining skills...`);
      }
    }

    // Enhanced reporting
    const failureCount = totalAttempts - successCount;
    const successRate = (successCount / totalAttempts) * 100;
    
    console.log(`📊 Batch generation complete: ${successCount}/${totalAttempts} successful (${successRate.toFixed(1)}% success rate)`);
    
    if (successCount === 0) {
      throw new Error('Failed to generate any practice tests. Please try again or contact support.');
    }

    if (failureCount > 0) {
      console.warn(`⚠️ ${failureCount} practice tests failed to generate. ${successCount} were successful.`);
    }

    return results;
  }
}

export async function generatePracticeTest(request: GeneratePracticeTestRequest): Promise<PracticeTestData> {
  console.log('🎯 Calling generate-practice-test function with enhanced error handling:', request);
  
  // Enhanced input validation
  if (!request.studentName || !request.className || !request.skillName) {
    throw new Error('Missing required fields: studentName, className, or skillName');
  }

  if (request.questionCount && (request.questionCount < 1 || request.questionCount > 50)) {
    throw new Error('Question count must be between 1 and 50');
  }

  // Validate skill distribution if provided
  if (request.skillDistribution) {
    const validation = validateSkillDistribution(
      request.skillDistribution, 
      request.questionCount || 5
    );
    
    if (!validation.isValid) {
      throw new Error(`Invalid skill distribution: ${validation.errors.join(', ')}`);
    }
    
    // Use fixed distribution
    request.skillDistribution = validation.fixedDistribution;
  }
  
  return withEnhancedRetry(async () => {
    const { data, error } = await supabase.functions.invoke('generate-practice-test', {
      body: {
        ...request,
        enhancedAnswerPatterns: true,
        multiSkillSupport: true,
        enhancedErrorHandling: true // Flag for enhanced error handling
      }
    });

    if (error) {
      console.error('❌ Error calling generate-practice-test function:', error);
      
      // Enhanced error classification and messaging
      let errorMessage = 'Failed to generate practice test';
      let isRetryable = true;
      
      if (error.message) {
        if (error.message.includes('Invalid skill distribution')) {
          errorMessage = `Skill distribution error: ${error.message}`;
          isRetryable = false;
        } else if (error.message.includes('temporarily unavailable')) {
          errorMessage = 'AI service is temporarily unavailable. Please try again in a moment.';
        } else if (error.message.includes('rate limit')) {
          errorMessage = 'Rate limit reached. Please try again in a moment.';
        } else if (error.message.includes('server had an error')) {
          errorMessage = 'AI service encountered an error. Please try again.';
        } else if (error.message.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message.includes('API key')) {
          errorMessage = 'API configuration error. Please contact support.';
          isRetryable = false;
        } else {
          errorMessage = error.message;
        }
      }
      
      const enhancedError = new Error(errorMessage);
      enhancedError.name = isRetryable ? 'RetryableError' : 'PermanentError';
      throw enhancedError;
    }

    if (!data) {
      throw new Error('No data returned from practice test generation');
    }

    // Enhanced response validation
    if (!data.questions || !Array.isArray(data.questions) || data.questions.length === 0) {
      throw new Error('Invalid response: missing or empty questions array');
    }

    // Validate each question has required fields
    const invalidQuestions = data.questions.filter((q: any, index: number) => {
      const missing = [];
      if (!q.id) missing.push('id');
      if (!q.type) missing.push('type');
      if (!q.question) missing.push('question');
      if (!q.correctAnswer) missing.push('correctAnswer');
      if (typeof q.points !== 'number') missing.push('points');
      
      if (missing.length > 0) {
        console.warn(`⚠️ Question ${index + 1} missing fields:`, missing);
        return true;
      }
      return false;
    });

    if (invalidQuestions.length > 0) {
      console.warn(`⚠️ ${invalidQuestions.length} questions have validation issues but test was generated`);
    }

    console.log('✅ Successfully generated practice test:', {
      title: data.title,
      questionCount: data.questions.length,
      totalPoints: data.totalPoints,
      skillType: data.skillType
    });
    
    return { ...data, skillName: request.skillName } as PracticeTestData;
  }, `practice test generation for ${request.studentName}`);
}

// Enhanced service health check
export async function checkServiceHealth(): Promise<{ 
  isHealthy: boolean; 
  details: { 
    circuitBreakerOpen: boolean; 
    lastFailureTime: number;
    recommendedAction?: string;
  } 
}> {
  const canExecute = circuitBreaker.canExecute();
  
  return {
    isHealthy: canExecute,
    details: {
      circuitBreakerOpen: !canExecute,
      lastFailureTime: (circuitBreaker as any).lastFailureTime || 0,
      recommendedAction: !canExecute ? 'Service is temporarily unavailable. Please wait a moment before trying again.' : undefined
    }
  };
}

// Utility function for graceful degradation
export function createFallbackPracticeTest(
  studentName: string,
  skillName: string,
  className: string,
  subject: string,
  grade: string
): PracticeTestData {
  console.log('🆘 Creating fallback practice test for:', studentName, skillName);
  
  return {
    title: `${subject} Practice - ${skillName}`,
    description: `Emergency practice test for ${studentName}. Please review with instructor.`,
    questions: [{
      id: 'Q1',
      type: 'short-answer',
      question: `Describe a key concept or skill related to "${skillName}" that you have learned in ${className}.`,
      correctAnswer: 'Please review with instructor',
      points: 1
    }],
    totalPoints: 1,
    estimatedTime: 10,
    skillName
  };
}
