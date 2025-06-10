
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Calendar, Clock, Users, Target, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { saveLessonPlan, type LessonPlanData } from "@/services/lessonPlanService";

interface LockLessonPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanData: LessonPlanData | null;
  onSuccess: () => void;
}

export function LockLessonPlanDialog({ 
  open, 
  onOpenChange, 
  lessonPlanData,
  onSuccess 
}: LockLessonPlanDialogProps) {
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!lessonPlanData) return;

    try {
      setSaving(true);
      await saveLessonPlan(lessonPlanData);
      toast.success("Lesson plan locked in successfully!");
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving lesson plan:', error);
      toast.error("Failed to save lesson plan. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  if (!lessonPlanData) return null;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatTime = (timeString: string) => {
    const [hours, minutes] = timeString.split(':');
    const date = new Date();
    date.setHours(parseInt(hours), parseInt(minutes));
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Lock in Lesson Plan
          </DialogTitle>
          <DialogDescription>
            Review and confirm your lesson plan details before locking it in.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Class Information */}
          <div className="p-4 bg-blue-50 rounded-lg">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Class Information
            </h3>
            <div className="space-y-2 text-sm">
              <div><strong>Class:</strong> {lessonPlanData.className}</div>
              <div><strong>Subject:</strong> {lessonPlanData.subject}</div>
              <div><strong>Grade:</strong> {lessonPlanData.grade}</div>
              <div><strong>Teacher:</strong> {lessonPlanData.teacherName}</div>
            </div>
          </div>

          {/* Schedule Information */}
          <div className="p-4 bg-green-50 rounded-lg">
            <h3 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              Schedule
            </h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(lessonPlanData.scheduledDate)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                <span>{formatTime(lessonPlanData.scheduledTime)}</span>
              </div>
            </div>
          </div>

          {/* Students and Target Skills */}
          <div className="p-4 bg-orange-50 rounded-lg">
            <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4" />
              Students & Target Skills ({lessonPlanData.students.length} students)
            </h3>
            <div className="space-y-3">
              {lessonPlanData.students.map((student, index) => (
                <div key={student.studentId} className="p-3 bg-white rounded-lg border">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <h4 className="font-medium text-slate-900">{student.studentName}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Target className="h-3 w-3 text-orange-600" />
                        <span className="text-sm text-orange-700">Target Skill</span>
                      </div>
                    </div>
                    <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                      {Math.round(student.targetSkillScore)}%
                    </Badge>
                  </div>
                  <p className="text-sm text-slate-700 font-medium">
                    {student.targetSkillName}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? "Saving..." : "Lock in Lesson Plan"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
