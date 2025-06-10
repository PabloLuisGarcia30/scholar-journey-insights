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
import { Calendar, Clock, Users, Target, BookOpen, Eye } from "lucide-react";
import { toast } from "sonner";
import { 
  saveLessonPlanWithExercises, 
  type LessonPlanData, 
  type ExerciseGenerationProgress,
  type LessonPlanWithExercises
} from "@/services/lessonPlanService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { ExerciseGenerationProgress as ExerciseProgressComponent } from "./ExerciseGenerationProgress";
import { GeneratedExercisesViewerDialog } from "./GeneratedExercisesViewerDialog";

interface LockLessonPlanDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanData: LessonPlanData | null;
  onSuccess: () => void;
}

interface StudentSkillData {
  studentId: string;
  studentName: string;
  targetSkillName: string;
  targetSkillScore: number;
}

function StudentSkillFetcher({ 
  studentId, 
  studentName, 
  classId, 
  className, 
  onSkillData 
}: {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  onSkillData: (data: StudentSkillData) => void;
}) {
  const { contentSkillScores, contentSkillsLoading } = useStudentProfileData({
    studentId,
    classId,
    className
  });

  const weakestSkill = contentSkillScores
    .sort((a, b) => a.score - b.score)[0];

  // Call onSkillData when data is available
  if (!contentSkillsLoading && weakestSkill) {
    onSkillData({
      studentId,
      studentName,
      targetSkillName: weakestSkill.skill_name,
      targetSkillScore: weakestSkill.score
    });
  }

  return (
    <div className="p-3 bg-white rounded-lg border">
      <div className="flex items-start justify-between mb-2">
        <div>
          <h4 className="font-medium text-slate-900">{studentName}</h4>
          <div className="flex items-center gap-2 mt-1">
            <Target className="h-3 w-3 text-orange-600" />
            <span className="text-sm text-orange-700">Target Skill</span>
          </div>
        </div>
        {contentSkillsLoading ? (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
        ) : weakestSkill ? (
          <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
            {Math.round(weakestSkill.score)}%
          </Badge>
        ) : (
          <Badge variant="outline" className="text-gray-600 border-gray-200 bg-gray-50">
            No data
          </Badge>
        )}
      </div>
      <p className="text-sm text-slate-700 font-medium">
        {contentSkillsLoading ? "Loading skill data..." : 
         weakestSkill ? weakestSkill.skill_name : "No skill data available"}
      </p>
    </div>
  );
}

export function LockLessonPlanDialog({ 
  open, 
  onOpenChange, 
  lessonPlanData,
  onSuccess 
}: LockLessonPlanDialogProps) {
  const [saving, setSaving] = useState(false);
  const [studentSkillData, setStudentSkillData] = useState<StudentSkillData[]>([]);
  const [exerciseProgress, setExerciseProgress] = useState<ExerciseGenerationProgress[]>([]);
  const [isGeneratingExercises, setIsGeneratingExercises] = useState(false);
  const [exerciseGenerationComplete, setExerciseGenerationComplete] = useState(false);
  const [generatedLessonPlan, setGeneratedLessonPlan] = useState<LessonPlanWithExercises | null>(null);
  const [showExerciseViewer, setShowExerciseViewer] = useState(false);

  const handleSkillData = (data: StudentSkillData) => {
    setStudentSkillData(prev => {
      const existing = prev.find(item => item.studentId === data.studentId);
      if (existing) {
        return prev.map(item => 
          item.studentId === data.studentId ? data : item
        );
      } else {
        return [...prev, data];
      }
    });
  };

  const handleSave = async () => {
    if (!lessonPlanData) return;

    // Use the collected skill data or fallback to basic data
    const studentsWithSkills = lessonPlanData.students.map(student => {
      const skillData = studentSkillData.find(data => data.studentId === student.studentId);
      return skillData || {
        studentId: student.studentId,
        studentName: student.studentName,
        targetSkillName: "Assessment pending",
        targetSkillScore: 0
      };
    });

    const finalLessonPlanData = {
      ...lessonPlanData,
      students: studentsWithSkills
    };

    try {
      setSaving(true);
      setIsGeneratingExercises(true);
      setExerciseGenerationComplete(false);
      setExerciseProgress([]);

      console.log('Starting lesson plan save with exercise generation...');
      
      const result = await saveLessonPlanWithExercises(
        finalLessonPlanData,
        (progress) => {
          console.log('Exercise generation progress:', progress);
          setExerciseProgress(progress);
        }
      );

      setExerciseGenerationComplete(true);
      setGeneratedLessonPlan(result);
      
      const completedCount = result.exercises?.length || 0;
      const totalCount = finalLessonPlanData.students.length;
      
      toast.success(
        `Lesson plan locked in successfully! Generated ${completedCount} of ${totalCount} practice exercises.`
      );
      
      onSuccess();
      
    } catch (error) {
      console.error('Error saving lesson plan with exercises:', error);
      toast.error("Failed to save lesson plan. Please try again.");
      setIsGeneratingExercises(false);
      setExerciseGenerationComplete(false);
    } finally {
      setSaving(false);
    }
  };

  const handleViewExercises = () => {
    setShowExerciseViewer(true);
  };

  const handleCloseDialog = () => {
    onOpenChange(false);
    // Reset states for next time
    setExerciseProgress([]);
    setIsGeneratingExercises(false);
    setExerciseGenerationComplete(false);
    setGeneratedLessonPlan(null);
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
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" />
              Lock in Lesson Plan & Generate Exercises
            </DialogTitle>
            <DialogDescription>
              Review your lesson plan details. When you lock it in, we'll automatically generate personalized practice exercises for each student based on their target skills.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            {/* Show exercise generation progress if in progress */}
            {isGeneratingExercises && (
              <ExerciseProgressComponent 
                progress={exerciseProgress}
                isComplete={exerciseGenerationComplete}
              />
            )}

            {/* Show completion options when generation is complete */}
            {exerciseGenerationComplete && generatedLessonPlan && (
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-2 mb-3">
                  <BookOpen className="h-5 w-5 text-green-600" />
                  <h4 className="font-semibold text-green-900">Exercises Generated Successfully!</h4>
                </div>
                <p className="text-sm text-green-700 mb-4">
                  All practice exercises have been generated and saved. You can now view them or close this dialog.
                </p>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleViewExercises}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
                  >
                    <Eye className="h-4 w-4" />
                    View Generated Exercises
                  </Button>
                  <Button 
                    onClick={handleCloseDialog}
                    variant="outline"
                  >
                    Close
                  </Button>
                </div>
              </div>
            )}

            {/* Only show lesson plan details if not generating exercises and not complete */}
            {!isGeneratingExercises && !exerciseGenerationComplete && (
              <>
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
                    {lessonPlanData.students.map((student) => (
                      <StudentSkillFetcher
                        key={student.studentId}
                        studentId={student.studentId}
                        studentName={student.studentName}
                        classId={lessonPlanData.classId}
                        className={lessonPlanData.className}
                        onSkillData={handleSkillData}
                      />
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Only show action buttons if not complete */}
          {!exerciseGenerationComplete && (
            <DialogFooter>
              <Button 
                variant="outline" 
                onClick={() => onOpenChange(false)}
                disabled={saving}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleSave} 
                disabled={saving || isGeneratingExercises}
                className="bg-green-600 hover:bg-green-700"
              >
                {saving ? 
                  (isGeneratingExercises ? "Generating Exercises..." : "Saving...") : 
                  "Lock in Lesson Plan & Generate Exercises"
                }
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Exercise Viewer Dialog */}
      <GeneratedExercisesViewerDialog
        open={showExerciseViewer}
        onOpenChange={setShowExerciseViewer}
        lessonPlanData={generatedLessonPlan}
      />
    </>
  );
}
