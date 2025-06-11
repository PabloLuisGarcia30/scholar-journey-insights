
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateExerciseStatus } from '@/services/classSessionService';
import { practiceExerciseSkillService, type SkillScoreCalculation } from '@/services/practiceExerciseSkillService';
import { useAuth } from '@/contexts/AuthContext';

interface UsePracticeExerciseCompletionProps {
  onSkillUpdated?: (skillUpdates: SkillScoreCalculation[]) => void;
}

export function usePracticeExerciseCompletion({ 
  onSkillUpdated 
}: UsePracticeExerciseCompletionProps) {
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const completeExerciseMutation = useMutation({
    mutationFn: async ({ 
      exerciseId, 
      score, 
      skillName, 
      exerciseData 
    }: { 
      exerciseId: string; 
      score: number; 
      skillName: string; 
      exerciseData: any; 
    }) => {
      if (!user?.id) {
        throw new Error('User must be authenticated to complete practice exercises');
      }

      console.log('🎯 Completing practice exercise for authenticated user:', user.id);
      
      // Log skill metadata usage
      if (exerciseData?.skillType) {
        console.log('✅ Using stored skill type from exercise:', exerciseData.skillType);
      } else {
        console.warn('⚠️ No skill type metadata found in exercise data');
      }
      
      // First update the exercise status
      await updateExerciseStatus(exerciseId, 'completed', score);
      
      // Then process skill score updates using authenticated user ID
      setIsUpdatingSkills(true);
      
      const skillUpdateResult = await practiceExerciseSkillService.processPracticeExerciseCompletion({
        studentId: user.id, // Use authenticated user ID directly
        exerciseId,
        skillName,
        exerciseScore: score,
        exerciseData // Pass complete exercise data including metadata
      });

      if (!skillUpdateResult.success) {
        console.warn('⚠️ Skill score update failed:', skillUpdateResult.error);
        toast.error('Exercise completed but skill scores could not be updated');
      } else {
        console.log('✅ Skill scores updated successfully for authenticated user:', skillUpdateResult.skillUpdates);
        
        // Enhanced success message with skill type information
        const skillType = exerciseData?.skillType;
        const improvementMessages = skillUpdateResult.skillUpdates
          .filter(update => update.updatedScore > update.currentScore)
          .map(update => `${update.skillName} (${update.skillType}): ${update.currentScore}% → ${update.updatedScore}%`);

        if (improvementMessages.length > 0) {
          const skillTypeMsg = skillType ? ` [${skillType === 'content' ? 'Content' : 'Subject'} Skill]` : '';
          toast.success(`Exercise completed!${skillTypeMsg} Skill improvements: ${improvementMessages.join(', ')}`);
        } else {
          const skillTypeMsg = skillType ? ` [${skillType === 'content' ? 'Content' : 'Subject'} Skill]` : '';
          toast.success(`Exercise completed successfully!${skillTypeMsg}`);
        }

        // Notify parent component
        if (onSkillUpdated) {
          onSkillUpdated(skillUpdateResult.skillUpdates);
        }
      }

      setIsUpdatingSkills(false);
      return { exerciseId, skillUpdates: skillUpdateResult.skillUpdates };
    },
    onSuccess: () => {
      if (!user?.id) return;
      
      // Invalidate relevant queries to refresh skill data using authenticated user ID
      queryClient.invalidateQueries({ 
        queryKey: ['studentContentSkills', user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentSubjectSkills', user.id] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentExercises', user.id] 
      });
    },
    onError: (error) => {
      console.error('❌ Error completing practice exercise:', error);
      toast.error('Failed to complete exercise. Please try again.');
      setIsUpdatingSkills(false);
    }
  });

  return {
    completeExercise: completeExerciseMutation.mutate,
    isCompleting: completeExerciseMutation.isPending,
    isUpdatingSkills,
    error: completeExerciseMutation.error
  };
}
