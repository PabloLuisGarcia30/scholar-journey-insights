
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar, Clock, Users, BookOpen, Loader2, Play } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { saveLessonPlan, type LessonPlanData } from "@/services/lessonPlanService";
import { ExercisePreviewEditor } from "./ExercisePreviewEditor";

interface Student {
  studentId: string;
  studentName: string;
  skills: Array<{
    skill_name: string;
    score: number;
  }>;
}

interface SaveLessonPlanProps {
  classId: string;
  className: string;
  classData?: any;
  students: Student[];
}

interface SkillGroup {
  skillName: string;
  students: Array<{
    studentId: string;
    studentName: string;
    skillScore: number;
  }>;
  selected: boolean;
}

interface StudentExercise {
  studentId: string;
  studentName: string;
  targetSkillName: string;
  targetSkillScore: number;
  exerciseData: any;
}

// Enhanced function to group students by ALL their skills
function groupStudentsByAllSkills(students: Student[]): SkillGroup[] {
  const skillGroups: { [skillName: string]: SkillGroup } = {};
  
  // Process each student and ALL their skills
  students.forEach(student => {
    student.skills.forEach(skill => {
      if (!skillGroups[skill.skill_name]) {
        skillGroups[skill.skill_name] = {
          skillName: skill.skill_name,
          students: [],
          selected: true // Default to selected
        };
      }
      
      // Add this student to the skill group
      skillGroups[skill.skill_name].students.push({
        studentId: student.studentId,
        studentName: student.studentName,
        skillScore: skill.score
      });
    });
  });
  
  // Convert to array and sort by skill name
  return Object.values(skillGroups).sort((a, b) => a.skillName.localeCompare(b.skillName));
}

async function generateExerciseForSkill(
  skillName: string,
  students: Array<{ studentId: string; studentName: string; skillScore: number }>,
  classData: any
): Promise<StudentExercise[]> {
  const exercises: StudentExercise[] = [];
  
  for (const student of students) {
    try {
      console.log(`🎯 Generating exercise for ${student.studentName} - Skill: ${skillName} (${student.skillScore}%)`);
      
      const { data, error } = await supabase.functions.invoke('generate-practice-test', {
        body: {
          studentName: student.studentName,
          className: classData?.name || 'Unknown Class',
          skillName: skillName,
          grade: classData?.grade || 'Unknown Grade',
          subject: classData?.subject || 'Unknown Subject',
          questionCount: 5,
          classId: classData?.id,
          enhancedAnswerPatterns: true
        }
      });

      if (error) {
        console.error(`❌ Error generating exercise for ${student.studentName}:`, error);
        toast.error(`Failed to generate exercise for ${student.studentName}: ${error.message}`);
        continue;
      }

      if (!data) {
        console.error(`❌ No data returned for ${student.studentName}`);
        toast.error(`No exercise data returned for ${student.studentName}`);
        continue;
      }

      console.log(`✅ Successfully generated exercise for ${student.studentName}`);
      
      exercises.push({
        studentId: student.studentId,
        studentName: student.studentName,
        targetSkillName: skillName,
        targetSkillScore: student.skillScore,
        exerciseData: data
      });

    } catch (error) {
      console.error(`❌ Unexpected error for ${student.studentName}:`, error);
      toast.error(`Unexpected error generating exercise for ${student.studentName}`);
    }
  }
  
  return exercises;
}

export function SaveLessonPlan({ classId, className, classData, students }: SaveLessonPlanProps) {
  const navigate = useNavigate();
  const [generatedExercises, setGeneratedExercises] = useState<StudentExercise[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [skillGroups, setSkillGroups] = useState<SkillGroup[]>([]);
  const [showSkillSelection, setShowSkillSelection] = useState(false);

  // Group students by all their skills when component mounts or students change
  const initializeSkillGroups = () => {
    const groups = groupStudentsByAllSkills(students);
    setSkillGroups(groups);
  };

  const generateExercisesMutation = useMutation({
    mutationFn: async () => {
      // Initialize skill groups if not done already
      if (skillGroups.length === 0) {
        const groups = groupStudentsByAllSkills(students);
        setSkillGroups(groups);
        setShowSkillSelection(true);
        return null; // Don't proceed with generation yet
      }

      // Filter to only selected skills
      const selectedSkills = skillGroups.filter(group => group.selected);
      
      if (selectedSkills.length === 0) {
        throw new Error('Please select at least one skill to generate exercises for');
      }

      console.log(`🚀 Generating exercises for ${selectedSkills.length} skills across students`);
      
      const allExercises: StudentExercise[] = [];
      
      // Generate exercises for each selected skill
      for (const skillGroup of selectedSkills) {
        console.log(`📚 Processing skill: ${skillGroup.skillName} (${skillGroup.students.length} students)`);
        
        const skillExercises = await generateExerciseForSkill(
          skillGroup.skillName,
          skillGroup.students,
          classData
        );
        
        allExercises.push(...skillExercises);
      }

      console.log(`✅ Generated ${allExercises.length} total exercises`);
      
      if (allExercises.length === 0) {
        throw new Error('No exercises were successfully generated');
      }

      return allExercises;
    },
    onSuccess: (exercises) => {
      if (exercises) {
        setGeneratedExercises(exercises);
        setShowPreview(true);
        setShowSkillSelection(false);
        toast.success(`Generated ${exercises.length} exercises successfully!`);
      } else {
        // Skill selection phase
        setShowSkillSelection(true);
      }
    },
    onError: (error) => {
      console.error('❌ Error generating exercises:', error);
      toast.error(`Failed to generate exercises: ${error.message}`);
    }
  });

  const saveLessonPlanMutation = useMutation({
    mutationFn: async (exercisesData: StudentExercise[]) => {
      // Group exercises by student for storage
      const studentExerciseMap: { [studentId: string]: StudentExercise[] } = {};
      exercisesData.forEach(exercise => {
        if (!studentExerciseMap[exercise.studentId]) {
          studentExerciseMap[exercise.studentId] = [];
        }
        studentExerciseMap[exercise.studentId].push(exercise);
      });

      // Convert to the format expected by saveLessonPlan
      const studentsForPlan = Object.entries(studentExerciseMap).map(([studentId, exercises]) => {
        // Use the first exercise's data for primary skill (maintains compatibility)
        const primaryExercise = exercises[0];
        return {
          studentId,
          studentName: primaryExercise.studentName,
          targetSkillName: primaryExercise.targetSkillName,
          targetSkillScore: primaryExercise.targetSkillScore
        };
      });

      const lessonPlanData: LessonPlanData = {
        classId,
        className,
        teacherName: 'Current Teacher',
        subject: classData?.subject || 'Unknown Subject',
        grade: classData?.grade || 'Unknown Grade',
        scheduledDate: new Date().toISOString().split('T')[0],
        scheduledTime: '09:00',
        students: studentsForPlan,
        exercisesData // Store ALL exercises, including multiple per student
      };

      return await saveLessonPlan(lessonPlanData);
    },
    onSuccess: (lessonPlan) => {
      toast.success('Lesson plan saved successfully!');
      navigate(`/lesson-plans/${lessonPlan.id}`);
    },
    onError: (error) => {
      console.error('❌ Error saving lesson plan:', error);
      toast.error(`Failed to save lesson plan: ${error.message}`);
    }
  });

  const handleGenerateExercises = () => {
    generateExercisesMutation.mutate();
  };

  const handleSaveWithExercises = (editedExercises: StudentExercise[]) => {
    saveLessonPlanMutation.mutate(editedExercises);
  };

  const handleSkillToggle = (skillName: string, checked: boolean) => {
    setSkillGroups(prev => 
      prev.map(group => 
        group.skillName === skillName 
          ? { ...group, selected: checked }
          : group
      )
    );
  };

  const handleProceedWithSelection = () => {
    generateExercisesMutation.mutate();
  };

  const handleCancelPreview = () => {
    setShowPreview(false);
    setGeneratedExercises([]);
  };

  const handleCancelSkillSelection = () => {
    setShowSkillSelection(false);
    setSkillGroups([]);
  };

  // If showing skill selection interface
  if (showSkillSelection) {
    const selectedCount = skillGroups.filter(g => g.selected).length;
    const totalStudentExercises = skillGroups
      .filter(g => g.selected)
      .reduce((sum, group) => sum + group.students.length, 0);

    return (
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Select Skills for Exercise Generation
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which skills should have practice exercises generated. Students may receive multiple exercises if they have multiple selected skills.
          </p>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4">
            {skillGroups.map((group) => (
              <div key={group.skillName} className="flex items-start space-x-3 p-4 border rounded-lg">
                <Checkbox
                  id={group.skillName}
                  checked={group.selected}
                  onCheckedChange={(checked) => handleSkillToggle(group.skillName, checked as boolean)}
                />
                <div className="flex-1">
                  <label 
                    htmlFor={group.skillName}
                    className="text-sm font-medium cursor-pointer"
                  >
                    {group.skillName}
                  </label>
                  <div className="mt-2 flex flex-wrap gap-1">
                    {group.students.map((student) => (
                      <Badge key={student.studentId} variant="outline" className="text-xs">
                        {student.studentName} ({student.skillScore}%)
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {group.students.length} student{group.students.length !== 1 ? 's' : ''} will receive exercises for this skill
                  </p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="text-sm text-blue-800">
              <strong>Generation Summary:</strong>
              <ul className="mt-2 space-y-1">
                <li>• {selectedCount} skill{selectedCount !== 1 ? 's' : ''} selected</li>
                <li>• {totalStudentExercises} total exercise{totalStudentExercises !== 1 ? 's' : ''} will be generated</li>
                <li>• Students with multiple skills will receive multiple exercises</li>
              </ul>
            </div>
          </div>

          <div className="flex gap-3 justify-end">
            <Button variant="outline" onClick={handleCancelSkillSelection}>
              Cancel
            </Button>
            <Button 
              onClick={handleProceedWithSelection}
              disabled={selectedCount === 0 || generateExercisesMutation.isPending}
            >
              {generateExercisesMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>Generate {totalStudentExercises} Exercise{totalStudentExercises !== 1 ? 's' : ''}</>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // If showing exercise preview
  if (showPreview && generatedExercises.length > 0) {
    return (
      <ExercisePreviewEditor
        exercises={generatedExercises}
        onSave={handleSaveWithExercises}
        onCancel={handleCancelPreview}
        loading={saveLessonPlanMutation.isPending}
      />
    );
  }

  // Main lesson plan creation interface
  if (students.length === 0) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="p-6 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Students Selected</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Please select students with target skills before creating a lesson plan.
          </p>
        </CardContent>
      </Card>
    );
  }

  // Count total skills across all students
  const totalSkills = students.reduce((total, student) => total + student.skills.length, 0);
  const uniqueSkills = [...new Set(students.flatMap(s => s.skills.map(skill => skill.skill_name)))];

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BookOpen className="h-5 w-5" />
          Create Lesson Plan
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <div className="flex items-center gap-2 text-sm">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <span>{new Date().toLocaleDateString()}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span>9:00 AM</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span>{students.length} student{students.length !== 1 ? 's' : ''}</span>
          </div>

          <div className="text-sm">
            <span className="text-muted-foreground">Skills to practice: </span>
            <span className="font-medium">{uniqueSkills.length} unique skill{uniqueSkills.length !== 1 ? 's' : ''}</span>
            <div className="mt-1 text-xs text-muted-foreground">
              {totalSkills} total skill assignment{totalSkills !== 1 ? 's' : ''} across all students
            </div>
          </div>
        </div>

        <Button 
          onClick={handleGenerateExercises}
          disabled={generateExercisesMutation.isPending}
          className="w-full"
        >
          {generateExercisesMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Generate & Preview Exercises
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
