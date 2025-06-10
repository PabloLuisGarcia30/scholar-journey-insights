
import { useState, useCallback } from 'react';
import { 
  generatePracticeTest, 
  generateMultiplePracticeTests,
  checkServiceHealth,
  GeneratePracticeTestRequest,
  PracticeTestData,
  MultiPracticeTestResult
} from '@/services/practiceTestService';
import { practiceTestErrorHandler } from '@/services/enhancedPracticeTestErrorHandler';
import { toast } from 'sonner';

export interface UseEnhancedPracticeTestGenerationOptions {
  enableAutoRecovery?: boolean;
  showDetailedErrors?: boolean;
  maxRetryAttempts?: number;
}

export interface PracticeTestGenerationState {
  isLoading: boolean;
  isHealthy: boolean;
  error: string | null;
  lastGenerationTime: number | null;
  successRate: number;
  totalAttempts: number;
  successfulAttempts: number;
}

export function useEnhancedPracticeTestGeneration(
  options: UseEnhancedPracticeTestGenerationOptions = {}
) {
  const {
    enableAutoRecovery = true,
    showDetailedErrors = false,
    maxRetryAttempts = 3
  } = options;

  const [state, setState] = useState<PracticeTestGenerationState>({
    isLoading: false,
    isHealthy: true,
    error: null,
    lastGenerationTime: null,
    successRate: 100,
    totalAttempts: 0,
    successfulAttempts: 0
  });

  const updateStats = useCallback((success: boolean) => {
    setState(prev => {
      const newTotalAttempts = prev.totalAttempts + 1;
      const newSuccessfulAttempts = prev.successfulAttempts + (success ? 1 : 0);
      const newSuccessRate = (newSuccessfulAttempts / newTotalAttempts) * 100;

      return {
        ...prev,
        totalAttempts: newTotalAttempts,
        successfulAttempts: newSuccessfulAttempts,
        successRate: newSuccessRate,
        lastGenerationTime: Date.now()
      };
    });
  }, []);

  const checkHealth = useCallback(async () => {
    try {
      const health = await checkServiceHealth();
      setState(prev => ({ ...prev, isHealthy: health.isHealthy }));
      
      if (!health.isHealthy && health.details.recommendedAction) {
        toast.warning(health.details.recommendedAction);
      }
      
      return health;
    } catch (error) {
      console.error('Health check failed:', error);
      setState(prev => ({ ...prev, isHealthy: false }));
      return { isHealthy: false, details: { circuitBreakerOpen: true, lastFailureTime: Date.now() } };
    }
  }, []);

  const generateSingleTest = useCallback(async (
    request: GeneratePracticeTestRequest
  ): Promise<PracticeTestData | null> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    let lastError: Error | null = null;
    
    for (let attempt = 1; attempt <= maxRetryAttempts; attempt++) {
      try {
        console.log(`🎯 Generating practice test (attempt ${attempt}/${maxRetryAttempts})`);
        
        // Check service health before each attempt
        if (attempt > 1) {
          const health = await checkHealth();
          if (!health.isHealthy) {
            throw new Error('Service is temporarily unavailable');
          }
        }

        const result = await generatePracticeTest(request);
        
        // Success
        updateStats(true);
        setState(prev => ({ 
          ...prev, 
          isLoading: false, 
          error: null,
          isHealthy: true
        }));
        
        toast.success(`Practice test generated successfully for ${request.skillName}!`);
        return result;
        
      } catch (error) {
        lastError = error as Error;
        console.error(`❌ Attempt ${attempt} failed:`, error);
        
        // Try error recovery if enabled
        if (enableAutoRecovery && attempt === maxRetryAttempts) {
          console.log('🔄 Attempting error recovery...');
          
          try {
            const recoveredTest = await practiceTestErrorHandler.handleError(lastError, {
              operation: 'single-test-generation',
              studentName: request.studentName,
              skillName: request.skillName,
              className: request.className,
              attempt,
              originalError: lastError
            });

            if (recoveredTest) {
              updateStats(true);
              setState(prev => ({ 
                ...prev, 
                isLoading: false, 
                error: null 
              }));
              
              toast.success(`Practice test recovered successfully for ${request.skillName}!`, {
                description: 'A simplified version was created due to generation issues'
              });
              return recoveredTest;
            }
          } catch (recoveryError) {
            console.error('❌ Error recovery failed:', recoveryError);
          }
        }
        
        // If not the last attempt, wait before retrying
        if (attempt < maxRetryAttempts) {
          const delay = Math.min(1000 * Math.pow(2, attempt - 1), 5000);
          console.log(`⏱️ Waiting ${delay}ms before retry...`);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    // All attempts failed
    updateStats(false);
    const errorMessage = showDetailedErrors 
      ? `Failed to generate practice test: ${lastError?.message}` 
      : 'Failed to generate practice test. Please try again.';
    
    setState(prev => ({ 
      ...prev, 
      isLoading: false, 
      error: errorMessage,
      isHealthy: false
    }));
    
    toast.error(errorMessage);
    return null;
  }, [maxRetryAttempts, enableAutoRecovery, showDetailedErrors, updateStats, checkHealth]);

  const generateMultipleTests = useCallback(async (
    skills: Array<{ name: string; score: number }>,
    baseRequest: Omit<GeneratePracticeTestRequest, 'skillName'>
  ): Promise<MultiPracticeTestResult[]> => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      console.log(`🎯 Generating multiple practice tests for ${skills.length} skills`);
      
      // Check service health
      await checkHealth();
      
      let results = await generateMultiplePracticeTests(skills, baseRequest);
      
      // Apply error recovery for failed tests if enabled
      if (enableAutoRecovery) {
        const failedCount = results.filter(r => r.status === 'error').length;
        
        if (failedCount > 0) {
          console.log(`🔄 Applying multi-skill error recovery for ${failedCount} failed tests`);
          
          results = await practiceTestErrorHandler.handleMultiSkillErrors(results, {
            operation: 'multi-test-generation',
            studentName: baseRequest.studentName,
            className: baseRequest.className,
            attempt: 1
          });
        }
      }
      
      // Calculate success metrics
      const successfulCount = results.filter(r => r.status === 'completed').length;
      const successRate = (successfulCount / results.length) * 100;
      
      updateStats(successfulCount > 0);
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: null,
        isHealthy: successRate > 50
      }));
      
      // Show appropriate toast message
      if (successfulCount === results.length) {
        toast.success(`All ${successfulCount} practice tests generated successfully!`);
      } else if (successfulCount > 0) {
        toast.warning(`${successfulCount}/${results.length} practice tests generated successfully`);
      } else {
        toast.error('Failed to generate any practice tests');
      }
      
      return results;
      
    } catch (error) {
      updateStats(false);
      const errorMessage = showDetailedErrors 
        ? `Failed to generate practice tests: ${(error as Error).message}` 
        : 'Failed to generate practice tests. Please try again.';
      
      setState(prev => ({ 
        ...prev, 
        isLoading: false, 
        error: errorMessage,
        isHealthy: false
      }));
      
      toast.error(errorMessage);
      return skills.map(skill => ({
        skillName: skill.name,
        skillScore: skill.score,
        status: 'error' as const,
        error: errorMessage
      }));
    }
  }, [enableAutoRecovery, showDetailedErrors, updateStats, checkHealth]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
  }, []);

  const resetStats = useCallback(() => {
    setState(prev => ({
      ...prev,
      successRate: 100,
      totalAttempts: 0,
      successfulAttempts: 0,
      lastGenerationTime: null
    }));
  }, []);

  return {
    // State
    ...state,
    
    // Actions
    generateSingleTest,
    generateMultipleTests,
    checkHealth,
    clearError,
    resetStats,
    
    // Utility methods
    getRecoveryStats: () => practiceTestErrorHandler.getRecoveryStats(),
    
    // Configuration
    isAutoRecoveryEnabled: enableAutoRecovery,
    maxRetryAttempts
  };
}
