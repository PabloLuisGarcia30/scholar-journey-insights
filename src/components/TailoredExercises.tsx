import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Play, CheckCircle, AlertCircle, Brain, Tag } from "lucide-react";
import { getStudentExercises, updateExerciseStatus, type StudentExercise } from "@/services/classSessionService";
import { SmartAnswerGradingService, type GradingResult } from "@/services/smartAnswerGradingService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PracticeExerciseRunner } from "./PracticeExerciseRunner";
import type { ExerciseSubmissionResult } from "@/services/practiceExerciseGradingService";

export function TailoredExercises() {
  const [exercises, setExercises] = useState<StudentExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<StudentExercise | null>(null);

  useEffect(() => {
    loadExercises();
    
    // Set up real-time subscription for new exercises
    const channel = supabase
      .channel('student-exercises-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'student_exercises'
      }, () => {
        loadExercises();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadExercises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const studentExercises = await getStudentExercises(user.id);
      setExercises(studentExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExercise = async (exercise: StudentExercise) => {
    try {
      await updateExerciseStatus(exercise.id, 'in_progress');
      setSelectedExercise(exercise);
      setExercises(prev => 
        prev.map(ex => 
          ex.id === exercise.id 
            ? { ...ex, status: 'in_progress', started_at: new Date().toISOString() }
            : ex
        )
      );
    } catch (error) {
      console.error('Error starting exercise:', error);
      toast.error('Failed to start exercise');
    }
  };

  const handleCompleteExercise = async (results: ExerciseSubmissionResult) => {
    if (!selectedExercise) return;
    
    try {
      await updateExerciseStatus(selectedExercise.id, 'completed', results.percentageScore);
      setExercises(prev => 
        prev.map(ex => 
          ex.id === selectedExercise.id 
            ? { ...ex, status: 'completed', completed_at: new Date().toISOString(), score: results.percentageScore }
            : ex
        )
      );
      setSelectedExercise(null);
      toast.success('Exercise completed successfully!');
    } catch (error) {
      console.error('Error completing exercise:', error);
      toast.error('Failed to complete exercise');
    }
  };

  // Helper function to get skill type from exercise data
  const getSkillType = (exercise: StudentExercise): 'content' | 'subject' | null => {
    return exercise.exercise_data?.skillType || 
           exercise.exercise_data?.skillMetadata?.skillType || 
           null;
  };

  // Helper function to get skill metadata
  const getSkillMetadata = (exercise: StudentExercise) => {
    return exercise.exercise_data?.skillMetadata || null;
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your tailored exercises...</p>
        </CardContent>
      </Card>
    );
  }

  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Exercises</h3>
          <p className="text-slate-500">
            When your teacher starts a class session, your personalized exercises will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selectedExercise) {
    const exerciseDataWithId = {
      ...selectedExercise.exercise_data,
      exerciseId: selectedExercise.id // Add exercise ID for answer key lookup
    };

    return (
      <PracticeExerciseRunner
        exerciseData={exerciseDataWithId}
        onComplete={handleCompleteExercise}
        onExit={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Tailored Exercises</h2>
        <Badge variant="secondary">
          {exercises.filter(ex => ex.status === 'available').length} Available
        </Badge>
      </div>

      <div className="grid gap-4">
        {exercises.map((exercise) => {
          const skillType = getSkillType(exercise);
          const skillMetadata = getSkillMetadata(exercise);
          
          return (
            <Card key={exercise.id} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-lg">{exercise.skill_name}</h3>
                      <Badge 
                        variant={
                          exercise.status === 'completed' ? 'default' :
                          exercise.status === 'in_progress' ? 'secondary' : 'outline'
                        }
                      >
                        {exercise.status === 'completed' ? 'Completed' :
                         exercise.status === 'in_progress' ? 'In Progress' : 'Available'}
                      </Badge>
                      
                      {/* Skill Type Badge */}
                      {skillType && (
                        <Badge variant="outline" className="text-xs">
                          <Tag className="h-3 w-3 mr-1" />
                          {skillType === 'content' ? 'Content Skill' : 'Subject Skill'}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-slate-600 mb-3">
                      {exercise.exercise_data?.description || 'Practice exercise for skill improvement'}
                    </p>
                    
                    {/* Enhanced skill metadata display */}
                    {skillMetadata && (
                      <div className="mb-3 p-2 bg-slate-50 rounded text-xs text-slate-600">
                        <div className="flex items-center gap-4">
                          {skillMetadata.subject && (
                            <span>Subject: {skillMetadata.subject}</span>
                          )}
                          {skillMetadata.grade && (
                            <span>Grade: {skillMetadata.grade}</span>
                          )}
                          {skillMetadata.skillCategory && (
                            <span>Category: {skillMetadata.skillCategory}</span>
                          )}
                        </div>
                      </div>
                    )}
                    
                    <div className="flex items-center gap-4 text-sm text-slate-500">
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        {exercise.exercise_data?.estimated_time_minutes || 15} min
                      </div>
                      <div className="flex items-center gap-1">
                        <BookOpen className="h-4 w-4" />
                        {exercise.exercise_data?.questions?.length || 0} questions
                      </div>
                      <div>
                        Current Score: {Math.round(exercise.skill_score)}%
                      </div>
                    </div>

                    {exercise.status === 'completed' && exercise.score && (
                      <div className="mt-3">
                        <div className="flex items-center gap-2 mb-1">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span className="text-sm font-medium">Exercise Score: {Math.round(exercise.score)}%</span>
                        </div>
                        <Progress value={exercise.score} className="h-2" />
                      </div>
                    )}
                  </div>

                  <div className="ml-4">
                    {exercise.status === 'available' && (
                      <Button onClick={() => handleStartExercise(exercise)}>
                        <Play className="h-4 w-4 mr-2" />
                        Start
                      </Button>
                    )}
                    
                    {exercise.status === 'in_progress' && (
                      <Button variant="secondary" onClick={() => setSelectedExercise(exercise)}>
                        Continue
                      </Button>
                    )}
                    
                    {exercise.status === 'completed' && (
                      <Button variant="outline" onClick={() => setSelectedExercise(exercise)}>
                        Review
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
