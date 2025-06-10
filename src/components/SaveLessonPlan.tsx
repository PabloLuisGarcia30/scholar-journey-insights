
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

interface SkillGroup {
  skillName: string;
  students: Array<{
    studentId: string;
    studentName: string;
    targetSkillScore: number;
  }>;
}

interface SkillGenerationResult {
  skillName: string;
  studentCount: number;
  studentNames: string[];
  status: 'pending' | 'generating' | 'completed' | 'failed';
  exerciseData?: any;
  error?: string;
  retryable?: boolean;
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
  const [skillResults, setSkillResults] = useState<SkillGenerationResult[]>([]);
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
      setSkillResults([]);
      setQuestionCount(5); // Reset to default
    }
  }, [open]);

  // Group students by their primary skill
  const groupStudentsBySkill = (students: Array<{
    studentId: string;
    studentName: string;
    skills: Array<{ skill_name: string; score: number; }>;
  }>): SkillGroup[] => {
    const skillMap = new Map<string, SkillGroup>();
    
    students.forEach(student => {
      const primarySkill = student.skills[0];
      if (!primarySkill) return;
      
      const skillName = primarySkill.skill_name;
      if (!skillMap.has(skillName)) {
        skillMap.set(skillName, {
          skillName,
          students: []
        });
      }
      
      skillMap.get(skillName)!.students.push({
        studentId: student.studentId,
        studentName: student.studentName,
        targetSkillScore: primarySkill.score
      });
    });
    
    return Array.from(skillMap.values());
  };

  const generateExerciseForSkill = async (skillGroup: SkillGroup): Promise<any> => {
    const firstStudent = skillGroup.students[0];
    
    try {
      const exerciseData = await generatePracticeTest({
        studentName: firstStudent.studentName,
        className: className,
        skillName: skillGroup.skillName,
        grade: classData?.grade || "Grade 10",
        subject: classData?.subject || "Math",
        questionCount: questionCount,
        classId: classId
      });

      return exerciseData;
    } catch (error) {
      console.error(`Failed to generate exercise for skill ${skillGroup.skillName}:`, error);
      throw error;
    }
  };

  const generateExercisesForStudents = async () => {
    if (!classData) {
      toast.error("Class data not available for exercise generation");
      return;
    }

    setStep('exercises');
    
    // Group students by skills
    const skillGroups = groupStudentsBySkill(students);
    
    // Initialize skill results state
    const initialSkillResults: SkillGenerationResult[] = skillGroups.map(group => ({
      skillName: group.skillName,
      studentCount: group.students.length,
      studentNames: group.students.map(s => s.studentName),
      status: 'pending'
    }));
    setSkillResults(initialSkillResults);
    
    // Initialize individual student results for compatibility
    const initialResults: ExerciseGenerationResult[] = students.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      status: 'pending'
    }));
    setExerciseResults(initialResults);

    const completedExercises: StudentExercise[] = [];
    
    try {
      // Generate exercises for each unique skill
      for (let i = 0; i < skillGroups.length; i++) {
        const skillGroup = skillGroups[i];
        
        // Update skill status to generating
        setSkillResults(prev => prev.map((result, index) => 
          index === i ? { ...result, status: 'generating' } : result
        ));
        
        // Update student statuses to generating for this skill
        setExerciseResults(prev => prev.map(result => {
          const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
          return studentInSkillGroup ? { ...result, status: 'generating' } : result;
        }));

        try {
          const exerciseData = await generateExerciseForSkill(skillGroup);
          
          // Create exercise objects for all students with this skill
          const skillExercises: StudentExercise[] = skillGroup.students.map(student => ({
            studentId: student.studentId,
            studentName: student.studentName,
            targetSkillName: skillGroup.skillName,
            targetSkillScore: student.targetSkillScore,
            exerciseData: exerciseData
          }));
          
          completedExercises.push(...skillExercises);
          
          // Update skill status to completed
          setSkillResults(prev => prev.map((result, index) => 
            index === i ? { ...result, status: 'completed', exerciseData } : result
          ));
          
          // Update student statuses to completed for this skill
          setExerciseResults(prev => prev.map(result => {
            const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
            if (studentInSkillGroup) {
              const exercise = skillExercises.find(ex => ex.studentId === result.studentId);
              return { ...result, status: 'completed', exercise };
            }
            return result;
          }));
          
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          const isRetryable = errorMessage.includes('temporarily unavailable') || 
                             errorMessage.includes('server had an error') ||
                             errorMessage.includes('rate limit');
          
          // Update skill status to failed
          setSkillResults(prev => prev.map((result, index) => 
            index === i ? { 
              ...result, 
              status: 'failed', 
              error: errorMessage,
              retryable: isRetryable
            } : result
          ));
          
          // Update student statuses to failed for this skill
          setExerciseResults(prev => prev.map(result => {
            const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
            return studentInSkillGroup ? { 
              ...result, 
              status: 'failed', 
              error: errorMessage,
              retryable: isRetryable
            } : result;
          }));
          
          console.error(`Failed to generate exercise for skill ${skillGroup.skillName}:`, error);
        }
      }

      if (completedExercises.length > 0) {
        setGeneratedExercises(completedExercises);
        setStep('preview');
        
        const failedCount = students.length - completedExercises.length;
        const skillsGenerated = skillGroups.filter((_, i) => skillResults[i]?.status === 'completed' || completedExercises.some(ex => ex.targetSkillName === skillGroups[i].skillName)).length;
        
        if (failedCount > 0) {
          toast.error(`Generated ${skillsGenerated} skill-based exercises for ${completedExercises.length} students. ${failedCount} failed - you can retry them.`);
        } else {
          toast.success(`Generated ${skillsGenerated} skill-based exercises for all ${completedExercises.length} students!`);
        }
      } else {
        toast.error('Failed to generate exercises for any skills. Please try again.');
        setStep('basic');
      }
    } catch (error) {
      console.error('Error generating exercises:', error);
      toast.error('Failed to generate exercises. Please try again.');
      setStep('basic');
    }
  };

  const retryFailedExercises = async () => {
    const failedSkillResults = skillResults.filter(result => result.status === 'failed' && result.retryable);
    
    if (failedSkillResults.length === 0) {
      return;
    }

    // Group students by skills again for retry
    const skillGroups = groupStudentsBySkill(students);
    
    for (const failedSkillResult of failedSkillResults) {
      const skillGroup = skillGroups.find(group => group.skillName === failedSkillResult.skillName);
      if (!skillGroup) continue;
      
      const skillIndex = skillResults.findIndex(r => r.skillName === failedSkillResult.skillName);

      // Update skill status to generating
      setSkillResults(prev => prev.map((result, index) => 
        index === skillIndex ? { ...result, status: 'generating', error: undefined } : result
      ));
      
      // Update student statuses to generating for this skill
      setExerciseResults(prev => prev.map(result => {
        const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
        return studentInSkillGroup ? { ...result, status: 'generating', error: undefined } : result;
      }));

      try {
        const exerciseData = await generateExerciseForSkill(skillGroup);
        
        // Create exercise objects for all students with this skill
        const skillExercises: StudentExercise[] = skillGroup.students.map(student => ({
          studentId: student.studentId,
          studentName: student.studentName,
          targetSkillName: skillGroup.skillName,
          targetSkillScore: student.targetSkillScore,
          exerciseData: exerciseData
        }));
        
        // Update skill status to completed
        setSkillResults(prev => prev.map((result, index) => 
          index === skillIndex ? { ...result, status: 'completed', exerciseData } : result
        ));
        
        // Update student statuses to completed for this skill
        setExerciseResults(prev => prev.map(result => {
          const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
          if (studentInSkillGroup) {
            const exercise = skillExercises.find(ex => ex.studentId === result.studentId);
            return { ...result, status: 'completed', exercise };
          }
          return result;
        }));
        
        // Add to generated exercises
        setGeneratedExercises(prev => [...prev, ...skillExercises]);
        
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        const isRetryable = errorMessage.includes('temporarily unavailable') || 
                           errorMessage.includes('server had an error');
        
        // Update skill status to failed
        setSkillResults(prev => prev.map((result, index) => 
          index === skillIndex ? { 
            ...result, 
            status: 'failed', 
            error: errorMessage,
            retryable: isRetryable
          } : result
        ));
        
        // Update student statuses to failed for this skill
        setExerciseResults(prev => prev.map(result => {
          const studentInSkillGroup = skillGroup.students.find(s => s.studentId === result.studentId);
          return studentInSkillGroup ? { 
            ...result, 
            status: 'failed', 
            error: errorMessage,
            retryable: isRetryable
          } : result;
        }));
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
      setSkillResults([]);
      
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
    setSkillResults([]);
  };

  const renderExerciseGenerationStep = () => {
    const completedCount = exerciseResults.filter(r => r.status === 'completed').length;
    const failedCount = exerciseResults.filter(r => r.status === 'failed').length;
    const generatingCount = exerciseResults.filter(r => r.status === 'generating').length;
    const retryableFailures = skillResults.filter(r => r.status === 'failed' && r.retryable).length;
    
    const completedSkills = skillResults.filter(r => r.status === 'completed').length;
    const totalSkills = skillResults.length;

    return (
      <div className="space-y-4">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-4">
            <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
            <h3 className="text-lg font-semibold text-slate-900">
              Generating Skill-Based Exercises
            </h3>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Creating {questionCount} question exercises for {totalSkills} unique skills across {students.length} students...
          </p>
          
          <div className="bg-blue-50 p-4 rounded-lg mb-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-green-600">{completedCount}</div>
                <div className="text-xs text-green-700">Students Complete</div>
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
            <div className="mt-2 text-sm text-blue-600">
              Skills: {completedSkills}/{totalSkills} completed
            </div>
          </div>
        </div>

        {/* Show skill-level progress */}
        <div className="space-y-2">
          <h4 className="font-medium text-slate-700">Skills Progress:</h4>
          {skillResults.map((skillResult, index) => (
            <div key={skillResult.skillName} className="p-3 bg-slate-50 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium">{skillResult.skillName}</span>
                <div className="flex items-center gap-2">
                  {skillResult.status === 'completed' && (
                    <span className="text-green-600 text-sm">✓ Complete</span>
                  )}
                  {skillResult.status === 'generating' && (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
                      <span className="text-blue-600 text-sm">Generating...</span>
                    </div>
                  )}
                  {skillResult.status === 'failed' && (
                    <div className="flex items-center gap-2">
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-600 text-sm">Failed</span>
                      {skillResult.retryable && (
                        <span className="text-orange-600 text-xs">(Retryable)</span>
                      )}
                    </div>
                  )}
                  {skillResult.status === 'pending' && (
                    <span className="text-slate-400 text-sm">Waiting...</span>
                  )}
                </div>
              </div>
              <div className="text-xs text-slate-500">
                Students: {skillResult.studentNames.join(', ')} ({skillResult.studentCount} total)
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
                Retry Failed Skills ({retryableFailures})
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

    // Basic step - group students by skill for display
    const skillGroups = groupStudentsBySkill(students);

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
            <li>• Efficient generation: {skillGroups.length} API calls instead of {students.length}</li>
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
