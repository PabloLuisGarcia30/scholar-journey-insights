
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { saveLessonPlan } from "@/services/lessonPlanService";
import { supabase } from "@/integrations/supabase/client";

interface SaveLessonPlanProps {
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
  onLessonPlanSaved?: (lessonPlanId: string) => void;
}

export function SaveLessonPlan({ classId, className, students, onLessonPlanSaved }: SaveLessonPlanProps) {
  const [open, setOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [scheduledDate, setScheduledDate] = useState(new Date().toISOString().split('T')[0]);
  const [scheduledTime, setScheduledTime] = useState("10:00");
  const [loading, setLoading] = useState(false);

  const handleSaveLessonPlan = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }

    if (students.length === 0) {
      toast.error("No students with skills selected for lesson plan");
      return;
    }

    setLoading(true);
    try {
      // Get current user (teacher)
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      // Get teacher profile for name
      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single();

      // Prepare students data with their primary skill (first skill in the array)
      const studentsForLessonPlan = students.map(student => ({
        studentId: student.studentId,
        studentName: student.studentName,
        targetSkillName: student.skills[0]?.skill_name || "No skill selected",
        targetSkillScore: student.skills[0]?.score || 0
      }));

      const lessonPlanData = {
        classId,
        className,
        teacherName: profile?.full_name || "Unknown Teacher",
        subject: "Unknown Subject", // Could be enhanced to get from class data
        grade: "Unknown Grade", // Could be enhanced to get from class data
        scheduledDate,
        scheduledTime,
        students: studentsForLessonPlan
      };

      const savedLessonPlan = await saveLessonPlan(lessonPlanData);

      toast.success(`Lesson plan "${lessonTitle}" saved successfully!`);
      setOpen(false);
      setLessonTitle(`${className} - ${new Date().toLocaleDateString()}`);
      
      // Notify parent component about the saved lesson plan
      if (onLessonPlanSaved) {
        onLessonPlanSaved(savedLessonPlan.id);
      }
      
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      toast.error('Failed to save lesson plan. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4" />
          Save Lesson Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Save Lesson Plan</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="lessonTitle">Lesson Title</Label>
            <Input
              id="lessonTitle"
              value={lessonTitle}
              onChange={(e) => setLessonTitle(e.target.value)}
              placeholder="Enter lesson title"
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduledDate">Scheduled Date</Label>
              <Input
                id="scheduledDate"
                type="date"
                value={scheduledDate}
                onChange={(e) => setScheduledDate(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="scheduledTime">Scheduled Time</Label>
              <Input
                id="scheduledTime"
                type="time"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Lesson plan will include:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {students.length} students with individualized skills</li>
              <li>• {students.reduce((total, student) => total + student.skills.length, 0)} total skill targets</li>
              <li>• Ready to use for starting class sessions</li>
              <li>• Scheduled for {scheduledDate} at {scheduledTime}</li>
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLessonPlan} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Lesson Plan
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
