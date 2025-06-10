
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/components/ui/use-toast";
import { PracticeTestService, PracticeTestGenerationRequest } from "@/services/practiceTestService";
import { supabase } from "@/integrations/supabase/client";
import { useEffect } from "react";
import { PracticeExerciseRunner } from "./PracticeExerciseRunner";

interface TailoredExercisesProps {
  studentId: string;
  studentName: string;
  classData: any;
  onBack: () => void;
}

interface Exercise {
  id: string;
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_score: number;
  exercise_data: any;
  status: string;
  score?: number;
}

export function TailoredExercises({ 
  studentId, 
  studentName, 
  classData, 
  onBack 
}: TailoredExercisesProps) {
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingSkill, setGeneratingSkill] = useState<string | null>(null);
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  const { toast } = useToast();
  const [sessionId, setSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (!classData) return;

    const fetchExercises = async () => {
      setLoading(true);
      try {
        const { data: existingExercises, error } = await supabase
          .from('student_exercises')
          .select('*')
          .eq('student_id', studentId)
          .eq('class_session_id', sessionId || 'null')
          .order('skill_score', { ascending: false });

        if (error) {
          console.error("Error fetching exercises:", error);
          toast({
            title: "Error",
            description: "Failed to load exercises. Please try again.",
            variant: "destructive",
          });
        } else {
          setExercises(existingExercises || []);
        }
      } finally {
        setLoading(false);
      }
    };

    const createSession = async () => {
      const newSessionId = crypto.randomUUID();
      setSessionId(newSessionId);

      const { error: sessionError } = await supabase
        .from('class_sessions')
        .insert({
          id: newSessionId,
          class_id: classData.id,
          started_at: new Date().toISOString(),
          ended_at: null,
          teacher_id: 'temp-teacher-id' // TODO: Replace with actual teacher ID when auth context is available
        });

      if (sessionError) {
        console.error("Error creating class session:", sessionError);
        toast({
          title: "Error",
          description: "Failed to create class session. Please refresh.",
          variant: "destructive",
        });
      } else {
        fetchExercises();
      }
    };

    createSession();
  }, [studentId, classData, toast, sessionId]);

  const handleGeneratePracticeTest = async (skillName: string, skillScore: number) => {
    if (!classData || isGenerating) return;

    try {
      setIsGenerating(true);
      setGeneratingSkill(skillName);
      
      // Generate a unique exercise ID
      const exerciseId = crypto.randomUUID();
      
      const request: PracticeTestGenerationRequest = {
        studentName,
        className: classData.name,
        skillName,
        grade: classData.grade,
        subject: classData.subject,
        questionCount: 5,
        classId: classData.id,
        exerciseId // NEW: Pass the exercise ID for answer key storage
      };

      const practiceTestData = await PracticeTestService.generatePracticeTest(request);
      
      const { data: newExercise, error: insertError } = await supabase
        .from('student_exercises')
        .insert({
          id: exerciseId, // Use the same ID we passed to the generation
          class_session_id: sessionId,
          student_id: studentId,
          student_name: studentName,
          skill_name: skillName,
          skill_score: skillScore,
          exercise_data: practiceTestData as any, // Cast to any to match Json type
          status: 'available'
        })
        .select()
        .single();

      if (insertError) {
        console.error("Error creating exercise:", insertError);
        toast({
          title: "Error",
          description: "Failed to create exercise. Please try again.",
          variant: "destructive",
        });
      } else {
        setExercises(prevExercises => [...prevExercises, newExercise]);
        toast({
          title: "Success",
          description: `New exercise created for ${skillName}!`,
        });
      }
    } catch (error) {
      console.error("Error generating practice test:", error);
      toast({
        title: "Error",
        description: "Failed to generate practice test. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
      setGeneratingSkill(null);
    }
  };

  const handleExerciseComplete = async ({ exerciseId, score, answers, totalPoints, earnedPoints }: any) => {
    try {
      const { error: updateError } = await supabase
        .from('student_exercises')
        .update({
          status: 'completed',
          score: score,
          answers: answers,
          total_points: totalPoints,
          earned_points: earnedPoints
        })
        .eq('id', exerciseId);

      if (updateError) {
        console.error("Error updating exercise:", updateError);
        toast({
          title: "Error",
          description: "Failed to update exercise status. Please try again.",
          variant: "destructive",
        });
      } else {
        setExercises(prevExercises =>
          prevExercises.map(ex =>
            ex.id === exerciseId ? { ...ex, status: 'completed', score: score } : ex
          )
        );
        toast({
          title: "Success",
          description: "Exercise completed and results saved!",
        });
      }
    } catch (error) {
      console.error("Error completing exercise:", error);
      toast({
        title: "Error",
        description: "Failed to complete exercise. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSelectedExercise(null);
    }
  };

  const handleStartExercise = (exercise: Exercise) => {
    setSelectedExercise(exercise);
  };

  if (selectedExercise) {
    return (
      <PracticeExerciseRunner
        exercise={selectedExercise}
        onComplete={handleExerciseComplete}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="p-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        ← Back to Student Profile
      </Button>

      <div className="max-w-3xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Tailored Exercises</CardTitle>
            <CardDescription>
              Practice exercises tailored to {studentName}'s skill levels in {classData?.name}.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p>Loading exercises...</p>
            ) : (
              <div className="space-y-4">
                {exercises.map((exercise) => (
                  <Card key={exercise.id} className="border-l-4 border-l-blue-500">
                    <CardHeader className="space-y-1">
                      <CardTitle className="text-lg font-semibold">{exercise.skill_name}</CardTitle>
                      <CardDescription>
                        Skill Level: {exercise.skill_score}% | Status: {exercise.status}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {exercise.status === 'available' ? (
                        <Button onClick={() => handleStartExercise(exercise)}>Start Exercise</Button>
                      ) : (
                        <p className="text-green-600">Exercise Completed - Score: {exercise.score}%</p>
                      )}
                    </CardContent>
                  </Card>
                ))}

                <Card className="border-l-4 border-l-green-500">
                  <CardHeader>
                    <CardTitle>Generate New Practice Test</CardTitle>
                    <CardDescription>
                      Generate a new practice test based on a specific skill.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4">
                    {classData?.performance_bands?.map((band: any) => (
                      <div key={band.skill_name} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{band.skill_name}</p>
                          <p className="text-sm text-gray-500">Current Score: {band.score}%</p>
                        </div>
                        {isGenerating && generatingSkill === band.skill_name ? (
                          <Progress value={50} className="w-40" />
                        ) : (
                          <Button
                            onClick={() => handleGeneratePracticeTest(band.skill_name, band.score)}
                            disabled={isGenerating}
                          >
                            Generate Test
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
