
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Save, Loader2, Calendar, Clock, Sparkles, AlertCircle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { saveLessonPlan } from "@/services/lessonPlanService";
import { useAuth } from "@/contexts/AuthContext";
import { getNextClassDate } from "@/utils/nextClassCalculator";
import { generatePracticeTest } from "@/services/practiceTestService";
import { ExercisePreviewEditor } from "./ExercisePreviewEditor";
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

interface StudentExercise {
  studentId: string;
  studentName: string;
  targetSkillName: string;
  targetSkillScore: number;
  exerciseData: any;
}

interface ExerciseGenerationResult {
  studentId: string;
  studentName: string;
  status: 'pending' | 'generating' | 'completed' | 'failed';
  exercise?: StudentExercise;
  error?: string;
  retryable?: boolean;
}

export function SaveLessonPlan({ classId, className, classData, students, onLessonPlanSaved }: SaveLessonPlanProps) {
  const [open, setOpen] = useState(false);
  const [lessonTitle, setLessonTitle] = useState(`${className} - ${new Date().toLocaleDateString()}`);
  const [questionCount, setQuestionCount] = useState(5);
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'basic' | 'exercises' | 'preview'>('basic');
  const [generatedExercises, setGeneratedExercises] = useState<StudentExercise[]>([]);
  const [exerciseResults, setExerciseResults] = useState<ExerciseGenerationResult[]>([]);
  const { profile } = useAuth();

  // Calculate next class date automatically
  const nextClassInfo = getNextClassDate(classData);

  // Update lesson title when next class info changes
  useEffect(() => {
    if (nextClassInfo) {
      setLessonTitle(`${className} - ${nextClassInfo.formattedDate}`);
    }
  }, [className, nextClassInfo]);

  // Reset state when dialog opens/closes
  useEffect(() => {
    if (open) {
      setStep('basic');
      setGeneratedExercises([]);
      setExerciseResults([]);
      setQuestionCount(5); // Reset to default
    }
  }, [open]);

  const generateExerciseForStudent = async (student: any, resultIndex: number): Promise<StudentExercise> => {
    const primarySkill = student.skills[0];
    
    if (!primarySkill) {
      throw new Error(`No skill found for student ${student.studentName}`);
    }

    try {
      const exerciseData = await generatePracticeTest({
        studentName: student.studentName,
        className: className,
        skillName: primarySkill.skill_name,
        grade: classData?.grade || "Grade 10",
        subject: classData?.subject || "Math",
        questionCount: questionCount, // Use selected question count
        classId: classId
      });

      return {
        studentId: student.studentId,
        studentName: student.studentName,
        targetSkillName: primarySkill.skill_name,
        targetSkillScore: primarySkill.score,
        exerciseData: exerciseData
      };
    } catch (error) {
      console.error(`Failed to generate exercise for ${student.studentName}:`, error);
      throw error;
    }
  };

  const generateExercisesForStudents = async () => {
    if (!classData) {
      toast.error("Class data not available for exercise generation");
      return;
    }

    setStep('exercises');
    
    // Initialize results state
    const initialResults: ExerciseGenerationResult[] = students.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      status: 'pending'
    }));
    setExerciseResults(initialResults);

    const completedExercises: StudentExercise[] = [];
    
    try {
      // Generate exercises for each student sequentially to avoid rate limits
      for (let i = 0; i < students.length; i++) {
        const student = students[i];
        
        // Update status to generating
        setExerciseResults(prev => prev.map((result, index) => 
          index === i ? { ...result, status: 'generating' } : result
        ));

        try {
          const exercise = await generateExerciseForStudent(student, i);
          completedExercises.push(exercise);
          
          // Update status to completed
          setExerciseResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'completed', exercise } : result
          ));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isRetryable = errorMessage.includes('temporarily unavailable') || 
                             errorMessage.includes('server had an error') ||
                             errorMessage.includes('rate limit');
          
          // Update status to failed
          setExerciseResults(prev => prev.map((result, index) => 
            index === i ? { 
              ...result, 
              status: 'failed', 
              error: errorMessage,
              retryable: isRetryable
            } : result
          ));
          
          console.error(`Failed to generate exercise for ${student.studentName}:`, error);
        }
      }

      if (completedExercises.length > 0) {
        setGeneratedExercises(completedExercises);
        setStep('preview');
        
        const failedCount = students.length - completedExercises.length;
        if (failedCount > 0) {
          toast.error(`Generated exercises for ${completedExercises.length} students. ${failedCount} failed - you can retry them.`);
        } else {
          toast.success(`Generated exercises for all ${completedExercises.length} students!`);
        }
      } else {
        toast.error('Failed to generate exercises for any students. Please try again.');
        setStep('basic');
      }
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast.error('Failed to generate exercises. Please try again.');
      setStep('basic');
    }
  };

  const retryFailedExercises = async () => {
    const failedResults = exerciseResults.filter(result => result.status === 'failed' && result.retryable);
    
    if (failedResults.length === 0) {
      return;
    }

    for (const failedResult of failedResults) {
      const studentIndex = exerciseResults.findIndex(r => r.studentId === failedResult.studentId);
      const student = students.find(s => s.studentId === failedResult.studentId);
      
      if (!student) continue;

      // Update status to generating
      setExerciseResults(prev => prev.map((result, index) => 
        index === studentIndex ? { ...result, status: 'generating', error: undefined } : result
      ));

      try {
        const exercise = await generateExerciseForStudent(student, studentIndex);
        
        // Update status to completed
        setExerciseResults(prev => prev.map((result, index) => 
          index === studentIndex ? { ...result, status: 'completed', exercise } : result
        ));
        
        // Add to generated exercises
        setGeneratedExercises(prev => [...prev, exercise]);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRetryable = errorMessage.includes('temporarily unavailable') || 
                           errorMessage.includes('server had an error');
        
        // Update status to failed
        setExerciseResults(prev => prev.map((result, index) => 
          index === studentIndex ? { 
            ...result, 
            status: 'failed', 
            error: errorMessage,
            retryable: isRetryable
          } : result
        ));
      }
    }
  };

  const handleSaveLessonPlan = async (exercisesToSave?: StudentExercise[]) => {
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
        students: studentsForLessonPlan,
        exercisesData: exercisesToSave || null
      };

      const savedLessonPlan = await saveLessonPlan(lessonPlanData);

      toast.success(`Lesson plan "${lessonTitle}" saved successfully!`);
      setOpen(false);
      
      // Reset state
      setStep('basic');
      setGeneratedExercises([]);
      setExerciseResults([]);
      
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

  const handleSaveWithExercises = (editedExercises: StudentExercise[]) => {
    handleSaveLessonPlan(editedExercises);
  };

  const handleSaveWithoutExercises = () => {
    handleSaveLessonPlan();
  };

  const handleCancelExercisePreview = () => {
    setStep('basic');
    setGeneratedExercises([]);
    setExerciseResults([]);
  };

  const renderExerciseGenerationStep = () => {
    const completedCount = exerciseResults.filter(r => r.status === 'completed').length;
    const failedCount = exerciseResults.filter(r => r.status === 'failed').length;
    const generatingCount = exerciseResults.filter(r => r.status === 'generating').length;
    const retryableFailures = exerciseResults.filter(r => r.status === 'failed' && r.retryable).length;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Generating Exercises
            </h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Creating {questionCount} question exercises for {students.length} students...
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-green-700">Completed</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-blue-600">{generatingCount}</div>
                <div className="text-xs text-blue-700">Generating</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-red-600">{failedCount}</div>
                <div className="text-xs text-red-700">Failed</div>
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-2">
          {exerciseResults.map((result, index) => (
            <div key={result.studentId} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
              <span className="font-medium">{result.studentName}</span>
              <div className="flex items-center gap-2">
                {result.status === 'completed' && (
                  <span className="text-green-600 text-sm">✓ Complete</span>
                )}
                {result.status === 'generating' && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                    <span className="text-blue-600 text-sm">Generating...</span>
                  </div>
                )}
                {result.status === 'failed' && (
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600" />
                    <span className="text-red-600 text-sm">Failed</span>
                    {result.retryable && (
                      <span className="text-orange-600 text-xs">(Retryable)</span>
                    )}
                  </div>
                )}
                {result.status === 'pending' && (
                  <span className="text-slate-400 text-sm">Waiting...</span>
                )}
              </div>
            </div>
          ))}
        </div>

        {failedCount > 0 && generatingCount === 0 && (
          <div className="space-y-3">
            {retryableFailures > 0 && (
              <Button
                onClick={retryFailedExercises}
                className="w-full"
                variant="outline"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry Failed Exercises ({retryableFailures})
              </Button>
            )}
            
            {completedCount > 0 && (
              <Button
                onClick={() => setStep('preview')}
                className="w-full"
              >
                Continue with {completedCount} Exercises
              </Button>
            )}
          </div>
        )}
      </div>
    );
  };

  const renderContent = () => {
    if (step === 'exercises') {
      return renderExerciseGenerationStep();
    }

    if (step === 'preview') {
      return (
        <ExercisePreviewEditor
          exercises={generatedExercises}
          onSave={handleSaveWithExercises}
          onCancel={handleCancelExercisePreview}
          loading={loading}
        />
      );
    }

    // Basic step
    return (
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
          <Label htmlFor="questionCount">Questions per Exercise</Label>
          <Input
            id="questionCount"
            type="number"
            min="1"
            max="15"
            value={questionCount}
            onChange={(e) => setQuestionCount(Math.max(1, Math.min(15, parseInt(e.target.value) || 5)))}
            placeholder="Number of questions"
          />
          <p className="text-xs text-slate-500 mt-1">
            Estimated time: ~{Math.ceil(questionCount * 2.5)} minutes per exercise
          </p>
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
            <li>• {questionCount} questions per exercise</li>
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
          <Button 
            onClick={generateExercisesForStudents} 
            disabled={!nextClassInfo}
            className="bg-purple-600 hover:bg-purple-700"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            Generate & Preview Exercises
          </Button>
          <Button 
            onClick={handleSaveWithoutExercises} 
            disabled={loading || !nextClassInfo}
            variant="outline"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Without Exercises
              </>
            )}
          </Button>
        </div>
      </div>
    );
  };

  const hasPlan = students.length > 0;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700"
          disabled={!hasPlan}
        >
          <Save className="h-4 w-4" />
          Save Lesson Plan
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'preview' ? 'Preview & Edit Exercises' : 
             step === 'exercises' ? 'Generating Exercises' : 'Save Lesson Plan'}
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
