
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Calendar, Clock } from "lucide-react";
import { toast } from "sonner";
import { saveLessonPlan } from "@/services/lessonPlanService";
import { useAuth } from "@/contexts/AuthContext";
import { getNextClassDate } from "@/utils/nextClassCalculator";
import type { ActiveClassWithDuration } from "@/services/examService";

interface SaveLessonPlanProps {
  classId: string;
  className: string;
  classData?: ActiveClassWithDuration | null;
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

export function SaveLessonPlan({ classId, className, classData, students, onLessonPlanSaved }: SaveLessonPlanProps) {
  const [open, setOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [loading, setLoading] = useState(false);
  const { profile } = useAuth();

  // Calculate next class date automatically
  const nextClassInfo = getNextClassDate(classData);

  // Update lesson title when next class info changes
  useEffect(() => {
    if (nextClassInfo) {
      setLessonTitle(`${className} - ${nextClassInfo.formattedDate}`);
    }
  }, [className, nextClassInfo]);

  const handleSaveLessonPlan = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }

    if (students.length === 0) {
      toast.error("No students with skills selected for lesson plan");
      return;
    }

    if (!nextClassInfo) {
      toast.error("Unable to determine next class date. Please check class schedule.");
      return;
    }

    if (!profile) {
      toast.error("User not authenticated");
      return;
    }

    setLoading(true);
    try {
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
        teacherName: profile.full_name || "Unknown Teacher",
        subject: classData?.subject || "Unknown Subject",
        grade: classData?.grade || "Unknown Grade",
        scheduledDate: nextClassInfo.date,
        scheduledTime: nextClassInfo.time,
        students: studentsForLessonPlan
      };

      const savedLessonPlan = await saveLessonPlan(lessonPlanData);

      toast.success(`Lesson plan "${lessonTitle}" saved successfully!`);
      setOpen(false);
      
      // Reset lesson title for next time
      if (nextClassInfo) {
        setLessonTitle(`${className} - ${nextClassInfo.formattedDate}`);
      }
      
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
          
          {/* Next Class Information */}
          {nextClassInfo ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="h-4 w-4 text-green-600" />
                <h4 className="font-medium text-green-800">Next Scheduled Class</h4>
              </div>
              <div className="space-y-1 text-sm text-green-700">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{nextClassInfo.dayName}, {nextClassInfo.formattedDate}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3 w-3" />
                  <span>{nextClassInfo.formattedTime}</span>
                  {classData?.duration?.shortFormat && (
                    <span className="text-green-600">({classData.duration.shortFormat})</span>
                  )}
                </div>
                {nextClassInfo.daysUntil > 0 && (
                  <div className="text-xs text-green-600">
                    {nextClassInfo.daysUntil === 1 ? 'Tomorrow' : `In ${nextClassInfo.daysUntil} days`}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2 mb-1">
                <Calendar className="h-4 w-4 text-amber-600" />
                <h4 className="font-medium text-amber-800">Class Schedule</h4>
              </div>
              <p className="text-sm text-amber-700">
                Unable to determine next class date. Please check class schedule.
              </p>
            </div>
          )}
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Lesson plan will include:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {students.length} students with individualized skills</li>
              <li>• {students.reduce((total, student) => total + student.skills.length, 0)} total skill targets</li>
              <li>• Ready to use for starting class sessions</li>
              {nextClassInfo && (
                <li>• Scheduled for {nextClassInfo.formattedDate} at {nextClassInfo.formattedTime}</li>
              )}
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveLessonPlan} disabled={loading || !nextClassInfo}>
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
