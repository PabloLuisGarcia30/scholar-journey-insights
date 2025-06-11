import { supabase } from "@/integrations/supabase/client";

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
  exercisesData?: Array<{
    studentId: string;
    studentName: string;
    targetSkillName: string;
    targetSkillScore: number;
    exerciseData: any;
  }> | null;
}

export async function saveLessonPlan(lessonPlanData: LessonPlanData) {
  try {
    // Insert the lesson plan with exercises data
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
        exercises_data: lessonPlanData.exercisesData,
        status: 'draft'
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

export async function getLessonPlan(lessonPlanId: string) {
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
      .eq('id', lessonPlanId)
      .single();

    if (error) {
      throw error;
    }

    return data;
  } catch (error) {
    console.error('Error fetching lesson plan:', error);
    throw error;
  }
}

export async function getLessonPlanByClassId(classId: string) {
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
      .eq('class_id', classId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return data || [];
  } catch (error) {
    console.error('Error fetching lesson plans by class:', error);
    throw error;
  }
}

export async function updateLessonPlanStatus(lessonPlanId: string, status: string) {
  try {
    const { error } = await supabase
      .from('lesson_plans')
      .update({ status })
      .eq('id', lessonPlanId);

    if (error) {
      throw error;
    }
  } catch (error) {
    console.error('Error updating lesson plan status:', error);
    throw error;
  }
}

export async function deleteLessonPlan(lessonPlanId: string) {
  try {
    // First delete related lesson plan students
    const { error: studentsError } = await supabase
      .from('lesson_plan_students')
      .delete()
      .eq('lesson_plan_id', lessonPlanId);

    if (studentsError) {
      throw studentsError;
    }

    // Then delete the lesson plan
    const { error: planError } = await supabase
      .from('lesson_plans')
      .delete()
      .eq('id', lessonPlanId);

    if (planError) {
      throw planError;
    }
  } catch (error) {
    console.error('Error deleting lesson plan:', error);
    throw error;
  }
}
