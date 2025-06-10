
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Activity, BookOpen, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { createClassSession, createStudentExercises } from "@/services/classSessionService";
import { getLessonPlanByClassId } from "@/services/lessonPlanService";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";

interface StartClassSessionFromPlanProps {
  classId: string;
  className: string;
  onSessionStarted?: (sessionId: string) => void;
}

export function StartClassSessionFromPlan({ classId, className, onSessionStarted }: StartClassSessionFromPlanProps) {
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [loading, setLoading] = useState(false);

  // Fetch the latest lesson plan for this class
  const { data: lessonPlan, isLoading: isLoadingPlan } = useQuery({
    queryKey: ['lessonPlan', classId],
    queryFn: async () => {
      const plans = await getLessonPlanByClassId(classId);
      return plans.length > 0 ? plans[0] : null;
    },
    enabled: !!classId && open,
  });

  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (!lessonPlan) {
      toast.error("No lesson plan found for this class");
      return;
    }

    if (!lessonPlan.lesson_plan_students || lessonPlan.lesson_plan_students.length === 0) {
      toast.error("No students found in the lesson plan");
      return;
    }

    setLoading(true);
    try {
      // Get current user (teacher)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create the class session with lesson plan reference
      const session = await createClassSession({
        class_id: classId,
        lesson_plan_id: lessonPlan.id,
        teacher_id: user.id,
        session_name: sessionName
      });

      // Check if lesson plan has pre-generated exercises (with proper type checking)
      const exercisesData = lessonPlan.exercises_data;
      const isExercisesArray = Array.isArray(exercisesData);
      
      if (isExercisesArray && exercisesData.length > 0) {
        console.log('Using pre-generated exercises from lesson plan');
        
        // Use pre-generated exercises
        const exercisesToCreate = exercisesData.map((exercise: any) => ({
          class_session_id: session.id,
          student_id: exercise.studentId,
          student_name: exercise.studentName,
          skill_name: exercise.targetSkillName,
          skill_score: exercise.targetSkillScore,
          exercise_data: exercise.exerciseData
        }));

        await createStudentExercises(exercisesToCreate);

        toast.success(`Class session "${sessionName}" started with pre-generated exercises! Students can now access their tailored content.`);
      } else {
        console.log('No pre-generated exercises found, generating on-the-fly');
        
        // Generate exercises for each student's target skill from the lesson plan (fallback to current behavior)
        const exercisePromises = lessonPlan.lesson_plan_students.map(async (student) => {
          const exerciseResponse = await fetch('/functions/v1/generate-tailored-exercise', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              skill_name: student.target_skill_name,
              skill_score: student.target_skill_score,
              student_name: student.student_name
            })
          });
          
          const exerciseData = await exerciseResponse.json();
          
          return {
            class_session_id: session.id,
            student_id: student.student_id,
            student_name: student.student_name,
            skill_name: student.target_skill_name,
            skill_score: student.target_skill_score,
            exercise_data: exerciseData.exercise_data
          };
        });

        // Wait for all exercises to be generated
        const exercisesToCreate = await Promise.all(exercisePromises);
        
        // Create all student exercises in the database
        await createStudentExercises(exercisesToCreate);

        toast.success(`Class session "${sessionName}" started with generated exercises! Students can now access their tailored content.`);
      }

      setOpen(false);
      setSessionName(`${className} - ${new Date().toLocaleDateString()}`);
      
      // Notify parent component about the new session
      if (onSessionStarted) {
        onSessionStarted(session.id);
      }
      
    } catch (error) {
      console.error('Error starting class session:', error);
      toast.error('Failed to start class session. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const hasPlan = lessonPlan && lessonPlan.lesson_plan_students && lessonPlan.lesson_plan_students.length > 0;
  const exercisesData = lessonPlan?.exercises_data;
  const hasPreGeneratedExercises = Array.isArray(exercisesData) && exercisesData.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
          disabled={!hasPlan}
        >
          <Play className="h-4 w-4" />
          Start Class Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Class Session</DialogTitle>
        </DialogHeader>
        
        {isLoadingPlan ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span className="ml-2">Loading lesson plan...</span>
          </div>
        ) : !hasPlan ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Lesson Plan Found</h3>
            <p className="text-slate-500">Please create a lesson plan first before starting a class session.</p>
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <Label htmlFor="sessionName">Session Name</Label>
              <Input
                id="sessionName"
                value={sessionName}
                onChange={(e) => setSessionName(e.target.value)}
                placeholder="Enter session name"
              />
            </div>
            
            <div className={`p-3 rounded-lg ${hasPreGeneratedExercises ? 'bg-purple-50 border border-purple-200' : 'bg-green-50'}`}>
              {hasPreGeneratedExercises && (
                <div className="flex items-center gap-2 mb-2">
                  <Sparkles className="h-4 w-4 text-purple-600" />
                  <span className="text-sm font-medium text-purple-800">Pre-generated exercises ready!</span>
                </div>
              )}
              <p className="text-sm text-green-800 mb-2">
                <strong>Using saved lesson plan:</strong>
              </p>
              <ul className="text-xs text-green-700 space-y-1">
                <li>• {lessonPlan.lesson_plan_students.length} students will receive exercises</li>
                <li>• Scheduled for {lessonPlan.scheduled_date} at {lessonPlan.scheduled_time}</li>
                <li>• Created by {lessonPlan.teacher_name}</li>
                {hasPreGeneratedExercises ? (
                  <li>• <strong>Instant loading:</strong> Pre-generated exercises will be used</li>
                ) : (
                  <li>• Exercises will be generated when session starts</li>
                )}
                <li>• Students can access exercises during this session</li>
              </ul>
            </div>

            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleStartSession} disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Starting...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Start Session
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
