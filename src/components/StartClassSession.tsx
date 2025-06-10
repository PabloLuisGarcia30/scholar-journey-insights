
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Play, Loader2, Activity } from "lucide-react";
import { toast } from "sonner";
import { createClassSession, createStudentExercises } from "@/services/classSessionService";
import { supabase } from "@/integrations/supabase/client";

interface StartClassSessionProps {
  classId: string;
  className: string;
  students: Array<{
    studentId: string;
    studentName: string;
    skills: Array<{
      skill_name: string;
      score: number;
    }>;
  }>;
  onSessionStarted?: (sessionId: string) => void;
}

export function StartClassSession({ classId, className, students, onSessionStarted }: StartClassSessionProps) {
  const [open, setOpen] = useState(false);
  const [sessionName, setSessionName] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [loading, setLoading] = useState(false);

  const handleStartSession = async () => {
    if (!sessionName.trim()) {
      toast.error("Please enter a session name");
      return;
    }

    if (students.length === 0) {
      toast.error("No students with skills selected for exercises");
      return;
    }

    setLoading(true);
    try {
      // Get current user (teacher)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Create the class session
      const session = await createClassSession({
        class_id: classId,
        teacher_id: user.id,
        session_name: sessionName
      });

      // Generate exercises for each student's skills
      const exercisePromises = [];
      
      for (const student of students) {
        for (const skill of student.skills) {
          // Generate exercise for this skill
          const exercisePromise = fetch('/functions/v1/generate-tailored-exercise', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({
              skill_name: skill.skill_name,
              skill_score: skill.score,
              student_name: student.studentName
            })
          })
          .then(res => res.json())
          .then(data => ({
            class_session_id: session.id,
            student_id: student.studentId,
            student_name: student.studentName,
            skill_name: skill.skill_name,
            skill_score: skill.score,
            exercise_data: data.exercise_data
          }));
          
          exercisePromises.push(exercisePromise);
        }
      }

      // Wait for all exercises to be generated
      const exercisesToCreate = await Promise.all(exercisePromises);
      
      // Create all student exercises in the database
      await createStudentExercises(exercisesToCreate);

      toast.success(`Class session "${sessionName}" started successfully! Students can now access their tailored exercises.`);
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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-green-600 hover:bg-green-700">
          <Play className="h-4 w-4" />
          Start Class Session
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start Class Session</DialogTitle>
        </DialogHeader>
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
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Ready to start:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {students.length} students will receive tailored exercises</li>
              <li>• {students.reduce((total, student) => total + student.skills.length, 0)} total exercises will be generated</li>
              <li>• Students can access exercises on their dashboard during this session</li>
              <li>• You can monitor progress in real-time on the monitoring dashboard</li>
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
      </DialogContent>
    </Dialog>
  );
}
