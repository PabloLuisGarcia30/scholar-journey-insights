
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { updateExerciseStatus } from '@/services/classSessionService';
import { practiceExerciseSkillService, type SkillScoreCalculation } from '@/services/practiceExerciseSkillService';

interface UsePracticeExerciseCompletionProps {
  studentId: string;
  onSkillUpdated?: (skillUpdates: SkillScoreCalculation[]) => void;
}

export function usePracticeExerciseCompletion({ 
  studentId, 
  onSkillUpdated 
}: UsePracticeExerciseCompletionProps) {
  const [isUpdatingSkills, setIsUpdatingSkills] = useState(false);
  const queryClient = useQueryClient();

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
      console.log('🎯 Completing practice exercise:', { exerciseId, score, skillName });
      
      // Log skill metadata usage
      if (exerciseData?.skillType) {
        console.log('✅ Using stored skill type from exercise:', exerciseData.skillType);
      } else {
        console.warn('⚠️ No skill type metadata found in exercise data');
      }
      
      // First update the exercise status
      await updateExerciseStatus(exerciseId, 'completed', score);
      
      // Then process skill score updates with complete exercise data
      setIsUpdatingSkills(true);
      
      const skillUpdateResult = await practiceExerciseSkillService.processPracticeExerciseCompletion({
        studentId,
        exerciseId,
        skillName,
        exerciseScore: score,
        exerciseData // Pass complete exercise data including metadata
      });

      if (!skillUpdateResult.success) {
        console.warn('⚠️ Skill score update failed:', skillUpdateResult.error);
        toast.error('Exercise completed but skill scores could not be updated');
      } else {
        console.log('✅ Skill scores updated successfully:', skillUpdateResult.skillUpdates);
        
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
      // Invalidate relevant queries to refresh skill data
      queryClient.invalidateQueries({ 
        queryKey: ['studentContentSkills', studentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentSubjectSkills', studentId] 
      });
      queryClient.invalidateQueries({ 
        queryKey: ['studentExercises', studentId] 
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
