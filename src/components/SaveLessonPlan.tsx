
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, BookOpen, Calendar } from "lucide-react";
import { toast } from "sonner";
import { saveLessonPlan } from "@/services/lessonPlanService";
import { supabase } from "@/integrations/supabase/client";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { format } from "date-fns";
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

export function SaveLessonPlan({ 
  classId, 
  className, 
  classData, 
  students, 
  onLessonPlanSaved 
}: SaveLessonPlanProps) {
  const [open, setOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [selectedClassInfo, setSelectedClassInfo] = useState<{
    startTime: string;
    endTime?: string;
    duration?: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleDateSelect = (date: Date, classInfo: { startTime: string; endTime?: string; duration?: string }) => {
    setSelectedDate(date);
    setSelectedClassInfo(classInfo);
  };

  const handleSaveLessonPlan = async () => {
    if (!lessonTitle.trim()) {
      toast.error("Please enter a lesson title");
      return;
    }

    if (!selectedDate || !selectedClassInfo) {
      toast.error("Please select a scheduled class session");
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

      // Convert selected time string to time format for database
      const timeMatch = selectedClassInfo.startTime.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
      let scheduledTime = "10:00";
      
      if (timeMatch) {
        let hours = parseInt(timeMatch[1]);
        const minutes = timeMatch[2];
        const period = timeMatch[3].toUpperCase();
        
        if (period === 'PM' && hours !== 12) {
          hours += 12;
        } else if (period === 'AM' && hours === 12) {
          hours = 0;
        }
        
        scheduledTime = `${hours.toString().padStart(2, '0')}:${minutes}`;
      }

      const lessonPlanData = {
        classId,
        className,
        teacherName: profile?.full_name || "Unknown Teacher",
        subject: classData?.subject || "Unknown Subject",
        grade: classData?.grade || "Unknown Grade",
        scheduledDate: format(selectedDate, 'yyyy-MM-dd'),
        scheduledTime,
        students: studentsForLessonPlan
      };

      const savedLessonPlan = await saveLessonPlan(lessonPlanData);

      toast.success(`Lesson plan "${lessonTitle}" saved successfully!`);
      setOpen(false);
      setLessonTitle(`${className} - ${new Date().toLocaleDateString()}`);
      setSelectedDate(null);
      setSelectedClassInfo(null);
      
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
      <DialogContent className="sm:max-w-2xl">
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
          
          <div>
            <Label className="flex items-center gap-2 mb-3">
              <Calendar className="h-4 w-4" />
              Select Class Session
            </Label>
            <WeeklyCalendar 
              classData={classData}
              selectable={true}
              selectedDate={selectedDate}
              onDateSelect={handleDateSelect}
            />
            
            {selectedDate && selectedClassInfo && (
              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm font-medium text-blue-800">
                  Selected: {className} - {format(selectedDate, 'MMMM d, yyyy')} at {selectedClassInfo.startTime}
                  {selectedClassInfo.duration && ` (${selectedClassInfo.duration})`}
                </p>
              </div>
            )}
            
            {!selectedDate && (
              <div className="mt-3 p-3 bg-amber-50 rounded-lg">
                <p className="text-sm text-amber-700">
                  Please select a scheduled class session from the calendar above
                </p>
              </div>
            )}
          </div>
          
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-sm text-blue-800 mb-2">
              <strong>Lesson plan will include:</strong>
            </p>
            <ul className="text-xs text-blue-700 space-y-1">
              <li>• {students.length} students with individualized skills</li>
              <li>• {students.reduce((total, student) => total + student.skills.length, 0)} total skill targets</li>
              <li>• Ready to use for starting class sessions</li>
              {selectedDate && selectedClassInfo && (
                <li>• Scheduled for {format(selectedDate, 'MMMM d, yyyy')} at {selectedClassInfo.startTime}</li>
              )}
            </ul>
          </div>

          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveLessonPlan} 
              disabled={loading || !selectedDate || !selectedClassInfo}
            >
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
