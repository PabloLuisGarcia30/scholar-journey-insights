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

interface StudentSkillGroup {
  studentId: string;
  studentName: string;
  skills: Array<{
    skill_name: string;
    score: number;
  }>;
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

  // Process students with all their skills for multi-skill exercise generation
  const processStudentsWithAllSkills = (students: Array<{
    studentId: string;
    studentName: string;
    skills: Array<{ skill_name: string; score: number; }>;
  }>): StudentSkillGroup[] => {
    return students.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      skills: student.skills // Include ALL skills, not just the first one
    })).filter(student => student.skills.length > 0); // Only include students with skills
  };

  const generateExerciseForStudent = async (studentGroup: StudentSkillGroup): Promise<any> => {
    try {
      // Calculate balanced question distribution across all skills
      const skillCount = studentGroup.skills.length;
      const baseQuestionsPerSkill = Math.floor(questionCount / skillCount);
      const remainderQuestions = questionCount % skillCount;
      
      // Create skill distribution array with balanced question allocation
      const skillDistribution = studentGroup.skills.map((skill, index) => ({
        skill_name: skill.skill_name,
        score: skill.score,
        questions: baseQuestionsPerSkill + (index < remainderQuestions ? 1 : 0)
      }));

      console.log(`Generating multi-skill exercise for ${studentGroup.studentName} with distribution:`, skillDistribution);

      // Generate practice test with multi-skill support
      const exerciseData = await generatePracticeTest({
        studentName: studentGroup.studentName,
        className: className,
        skillName: skillDistribution.map(s => `${s.skill_name} (${s.questions} questions)`).join(', '),
        grade: classData?.grade || "Grade 10",
        subject: classData?.subject || "Math",
        questionCount: questionCount,
        classId: classId,
        skillDistribution: skillDistribution // Pass the skill distribution for balanced generation
      });

      return exerciseData;
    } catch (error) {
      console.error(`Failed to generate exercise for student ${studentGroup.studentName}:`, error);
      throw error;
    }
  };

  const generateExercisesForStudents = async () => {
    if (!classData) {
      toast.error("Class data not available for exercise generation");
      return;
    }

    setStep('exercises');
    
    // Process students with all their skills
    const studentGroups = processStudentsWithAllSkills(students);
    
    // Initialize individual student results
    const initialResults: ExerciseGenerationResult[] = studentGroups.map(group => ({
      studentId: group.studentId,
      studentName: group.studentName,
      status: 'pending'
    }));
    setExerciseResults(initialResults);

    const completedExercises: StudentExercise[] = [];
    
    try {
      // Generate one multi-skill exercise per student
      for (let i = 0; i < studentGroups.length; i++) {
        const studentGroup = studentGroups[i];
        
        // Update student status to generating
        setExerciseResults(prev => prev.map((result, index) => 
          index === i ? { ...result, status: 'generating' } : result
        ));

        try {
          const exerciseData = await generateExerciseForStudent(studentGroup);
          
          // Create exercise object with primary skill as target (for compatibility)
          const primarySkill = studentGroup.skills[0];
          const studentExercise: StudentExercise = {
            studentId: studentGroup.studentId,
            studentName: studentGroup.studentName,
            targetSkillName: primarySkill.skill_name,
            targetSkillScore: primarySkill.score,
            exerciseData: exerciseData
          };
          
          completedExercises.push(studentExercise);
          
          // Update student status to completed
          setExerciseResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'completed', exercise: studentExercise } : result
          ));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isRetryable = errorMessage.includes('temporarily unavailable') || 
                             errorMessage.includes('server had an error') ||
                             errorMessage.includes('rate limit');
          
          // Update student status to failed
          setExerciseResults(prev => prev.map((result, index) => 
            index === i ? { 
              ...result, 
              status: 'failed', 
              error: errorMessage,
              retryable: isRetryable
            } : result
          ));
          
          console.error(`Failed to generate exercise for student ${studentGroup.studentName}:`, error);
        }
      }

      if (completedExercises.length > 0) {
        setGeneratedExercises(completedExercises);
        setStep('preview');
        
        const failedCount = studentGroups.length - completedExercises.length;
        
        if (failedCount > 0) {
          toast.error(`Generated exercises for ${completedExercises.length} students. ${failedCount} failed - you can retry them.`);
        } else {
          toast.success(`Generated multi-skill exercises for all ${completedExercises.length} students!`);
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

    // Process students with all their skills for retries
    const studentGroups = processStudentsWithAllSkills(students);
    
    for (const failedResult of failedResults) {
      const studentGroup = studentGroups.find(group => group.studentId === failedResult.studentId);
      if (!studentGroup) continue;
      
      const resultIndex = exerciseResults.findIndex(r => r.studentId === failedResult.studentId);

      // Update student status to generating
      setExerciseResults(prev => prev.map((result, index) => 
        index === resultIndex ? { ...result, status: 'generating', error: undefined } : result
      ));

      try {
        const exerciseData = await generateExerciseForStudent(studentGroup);
        
        // Create exercise object with primary skill as target (for compatibility)
        const primarySkill = studentGroup.skills[0];
        const studentExercise: StudentExercise = {
          studentId: studentGroup.studentId,
          studentName: studentGroup.studentName,
          targetSkillName: primarySkill.skill_name,
          targetSkillScore: primarySkill.score,
          exerciseData: exerciseData
        };
        
        // Update student status to completed
        setExerciseResults(prev => prev.map((result, index) => 
          index === resultIndex ? { ...result, status: 'completed', exercise: studentExercise } : result
        ));
        
        // Add to generated exercises
        setGeneratedExercises(prev => [...prev, studentExercise]);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRetryable = errorMessage.includes('temporarily unavailable') || 
                           errorMessage.includes('server had an error');
        
        // Update student status to failed
        setExerciseResults(prev => prev.map((result, index) => 
          index === resultIndex ? { 
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
    const retryableCount = exerciseResults.filter(r => r.status === 'failed' && r.retryable).length;

    const progress = exerciseResults.length > 0 ? (completedCount / exerciseResults.length) * 100 : 0;

    return (
      <div className="space-y-6">
        <div className="text-center">
          <h3 className="text-lg font-semibold text-slate-900 mb-2">
            Generating Multi-Skill Practice Exercises
          </h3>
          <p className="text-sm text-slate-600">
            Creating exercises with {questionCount} questions distributed across all selected skills for each student...
          </p>
        </div>

        <div className="w-full bg-slate-200 rounded-full h-3">
          <div 
            className="bg-blue-600 h-3 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="grid grid-cols-4 gap-4 text-center">
          <div>
            <div className="text-2xl font-bold text-green-600">{completedCount}</div>
            <div className="text-sm text-slate-600">Completed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-blue-600">{generatingCount}</div>
            <div className="text-sm text-slate-600">Generating</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-red-600">{failedCount}</div>
            <div className="text-sm text-slate-600">Failed</div>
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-600">{exerciseResults.length}</div>
            <div className="text-sm text-slate-600">Total</div>
          </div>
        </div>

        {retryableCount > 0 && (
          <div className="text-center">
            <Button 
              onClick={retryFailedExercises}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry Failed ({retryableCount})
            </Button>
          </div>
        )}

        <div className="space-y-2 max-h-60 overflow-y-auto">
          {exerciseResults.map((result) => (
            <div 
              key={result.studentId}
              className={`p-3 rounded border ${
                result.status === 'completed' ? 'bg-green-50 border-green-200' :
                result.status === 'failed' ? 'bg-red-50 border-red-200' :
                result.status === 'generating' ? 'bg-blue-50 border-blue-200' :
                'bg-slate-50 border-slate-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-medium">{result.studentName}</span>
                <div className="flex items-center gap-2">
                  {result.status === 'generating' && <Loader2 className="h-4 w-4 animate-spin text-blue-600" />}
                  {result.status === 'completed' && <span className="text-green-600 text-sm">✓ Complete</span>}
                  {result.status === 'failed' && <span className="text-red-600 text-sm">✗ Failed</span>}
                </div>
              </div>
              {result.error && (
                <p className="text-xs text-red-600 mt-1">{result.error}</p>
              )}
            </div>
          ))}
        </div>
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

    // Basic step - group students by skill for display
    const skillGroups = processStudentsWithAllSkills(students);

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
            <li>• {students.length} students across {skillGroups.length} unique skills</li>
            <li>• {questionCount} questions per exercise (skill-based generation)</li>
            <li>• Efficient generation: {students.length} API calls instead of {students.length}</li>
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
             step === 'exercises' ? 'Generating Skill-Based Exercises' : 'Save Lesson Plan'}
          </DialogTitle>
        </DialogHeader>
        
        {renderContent()}
      </DialogContent>
    </Dialog>
  );
}
