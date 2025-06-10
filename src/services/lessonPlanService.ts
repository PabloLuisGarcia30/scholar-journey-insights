import { supabase } from "@/integrations/supabase/client";
import { generatePracticeTest, type GeneratePracticeTestRequest, type PracticeTestData } from "./practiceTestService";

export interface LessonPlanData {
  classId: string;
  className: string;
  teacherName: string;
  subject: string;
  grade: string;
  scheduledDate: string;
  scheduledTime: string;
  students: Array<{
    studentId: string;
    studentName: string;
    targetSkillName: string;
    targetSkillScore: number;
  }>;
}

export interface LessonPlanWithExercises extends LessonPlanData {
  exercises?: Array<{
    studentId: string;
    studentName: string;
    exerciseData: PracticeTestData;
    generatedAt: string;
  }>;
}

export interface ExerciseGenerationProgress {
  studentId: string;
  studentName: string;
  status: 'pending' | 'generating' | 'completed' | 'error';
  error?: string;
}

export async function saveLessonPlan(lessonPlanData: LessonPlanData) {
  try {
    // Insert the lesson plan
    const { data: lessonPlan, error: lessonPlanError } = await supabase
      .from('lesson_plans')
      .insert({
        class_id: lessonPlanData.classId,
        class_name: lessonPlanData.className,
        teacher_name: lessonPlanData.teacherName,
        subject: lessonPlanData.subject,
        grade: lessonPlanData.grade,
        scheduled_date: lessonPlanData.scheduledDate,
        scheduled_time: lessonPlanData.scheduledTime,
        status: 'locked'
      })
      .select()
      .single();

    if (lessonPlanError) {
      throw lessonPlanError;
    }

    // Insert the lesson plan students
    const studentData = lessonPlanData.students.map(student => ({
      lesson_plan_id: lessonPlan.id,
      student_id: student.studentId,
      student_name: student.studentName,
      target_skill_name: student.targetSkillName,
      target_skill_score: student.targetSkillScore
    }));

    const { error: studentsError } = await supabase
      .from('lesson_plan_students')
      .insert(studentData);

    if (studentsError) {
      throw studentsError;
    }

    return lessonPlan;
  } catch (error) {
    console.error('Error saving lesson plan:', error);
    throw error;
  }
}

export async function saveLessonPlanWithExercises(
  lessonPlanData: LessonPlanData,
  onProgress?: (progress: ExerciseGenerationProgress[]) => void
): Promise<LessonPlanWithExercises> {
  try {
    // First save the lesson plan
    console.log('Saving lesson plan...');
    const lessonPlan = await saveLessonPlan(lessonPlanData);
    
    // Initialize progress tracking
    const progressTracker: ExerciseGenerationProgress[] = lessonPlanData.students.map(student => ({
      studentId: student.studentId,
      studentName: student.studentName,
      status: 'pending'
    }));
    
    if (onProgress) {
      onProgress([...progressTracker]);
    }

    console.log('Generating practice exercises for students...');
    const exercises: Array<{
      studentId: string;
      studentName: string;
      exerciseData: PracticeTestData;
      generatedAt: string;
    }> = [];

    // Generate exercises for each student
    for (let i = 0; i < lessonPlanData.students.length; i++) {
      const student = lessonPlanData.students[i];
      
      // Update progress
      progressTracker[i].status = 'generating';
      if (onProgress) {
        onProgress([...progressTracker]);
      }

      try {
        console.log(`Generating practice test for ${student.studentName} targeting ${student.targetSkillName}`);
        
        const practiceTestRequest: GeneratePracticeTestRequest = {
          studentName: student.studentName,
          className: lessonPlanData.className,
          skillName: student.targetSkillName,
          grade: lessonPlanData.grade,
          subject: lessonPlanData.subject,
          questionCount: 8, // Smaller number for lesson plan exercises
          classId: lessonPlanData.classId
        };

        const exerciseData = await generatePracticeTest(practiceTestRequest);
        
        // Store the generated exercise in the database - cast to any to handle JSON type
        const { error: exerciseError } = await supabase
          .from('lesson_plan_practice_exercises')
          .insert({
            lesson_plan_id: lessonPlan.id,
            student_id: student.studentId,
            student_name: student.studentName,
            exercise_data: exerciseData as any,
            exercise_type: 'practice_test'
          });

        if (exerciseError) {
          throw exerciseError;
        }

        exercises.push({
          studentId: student.studentId,
          studentName: student.studentName,
          exerciseData,
          generatedAt: new Date().toISOString()
        });

        // Update progress to completed
        progressTracker[i].status = 'completed';
        if (onProgress) {
          onProgress([...progressTracker]);
        }

        console.log(`Successfully generated practice test for ${student.studentName}`);

      } catch (error) {
        console.error(`Failed to generate practice test for ${student.studentName}:`, error);
        
        // Update progress to error
        progressTracker[i].status = 'error';
        progressTracker[i].error = error instanceof Error ? error.message : 'Unknown error';
        if (onProgress) {
          onProgress([...progressTracker]);
        }
      }
    }

    console.log(`Lesson plan saved with ${exercises.length} practice exercises generated`);

    return {
      ...lessonPlanData,
      exercises
    };

  } catch (error) {
    console.error('Error saving lesson plan with exercises:', error);
    throw error;
  }
}

export async function getLessonPlans() {
  try {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select(`
        *,
        lesson_plan_students (
          student_id,
          student_name,
          target_skill_name,
          target_skill_score
        )
      `)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching lesson plans:', error);
    throw error;
  }
}

export async function getLessonPlanWithExercises(lessonPlanId: string) {
  try {
    const { data, error } = await supabase
      .from('lesson_plans')
      .select(`
        *,
        lesson_plan_students (
          student_id,
          student_name,
          target_skill_name,
          target_skill_score
        ),
        lesson_plan_practice_exercises (
          student_id,
          student_name,
          exercise_data,
          exercise_type,
          generated_at
        )
      `)
      .eq('id', lessonPlanId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching lesson plan with exercises:', error);
    throw error;
  }
}
