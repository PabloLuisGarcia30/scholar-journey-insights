
import { supabase } from "@/integrations/supabase/client";

export interface ClassSession {
  id: string;
  class_id: string;
  lesson_plan_id?: string;
  teacher_id: string;
  session_name: string;
  started_at: string;
  ended_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentExercise {
  id: string;
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_score: number;
  exercise_data: any;
  status: 'available' | 'in_progress' | 'completed';
  started_at?: string;
  completed_at?: string;
  score?: number;
  created_at: string;
  updated_at: string;
}

export async function createClassSession(sessionData: {
  class_id: string;
  lesson_plan_id?: string;
  teacher_id: string;
  session_name: string;
}): Promise<ClassSession> {
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .insert({
        class_id: sessionData.class_id,
        lesson_plan_id: sessionData.lesson_plan_id,
        teacher_id: sessionData.teacher_id,
        session_name: sessionData.session_name
      })
      .select()
      .single();

    if (error) throw error;
    return data as ClassSession;
  } catch (error) {
    console.error('Error creating class session:', error);
    throw error;
  }
}

export async function endClassSession(sessionId: string): Promise<void> {
  try {
    const { error } = await supabase
      .from('class_sessions')
      .update({
        ended_at: new Date().toISOString(),
        is_active: false
      })
      .eq('id', sessionId);

    if (error) throw error;
  } catch (error) {
    console.error('Error ending class session:', error);
    throw error;
  }
}

export async function getActiveClassSessions(teacherId: string): Promise<ClassSession[]> {
  try {
    const { data, error } = await supabase
      .from('class_sessions')
      .select('*')
      .eq('teacher_id', teacherId)
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data as ClassSession[];
  } catch (error) {
    console.error('Error fetching active class sessions:', error);
    throw error;
  }
}

export async function createStudentExercises(exercises: {
  class_session_id: string;
  student_id: string;
  student_name: string;
  skill_name: string;
  skill_score: number;
  exercise_data: any;
}[]): Promise<StudentExercise[]> {
  try {
    const { data, error } = await supabase
      .from('student_exercises')
      .insert(exercises)
      .select();

    if (error) throw error;
    return data as StudentExercise[];
  } catch (error) {
    console.error('Error creating student exercises:', error);
    throw error;
  }
}

export async function getStudentExercises(studentId: string): Promise<StudentExercise[]> {
  try {
    const { data, error } = await supabase
      .from('student_exercises')
      .select(`
        *,
        class_sessions!inner(
          is_active,
          class_id,
          session_name
        )
      `)
      .eq('student_id', studentId)
      .eq('class_sessions.is_active', true);

    if (error) throw error;
    return data as StudentExercise[];
  } catch (error) {
    console.error('Error fetching student exercises:', error);
    throw error;
  }
}

export async function updateExerciseStatus(
  exerciseId: string, 
  status: 'in_progress' | 'completed',
  score?: number
): Promise<void> {
  try {
    const updates: any = { status };
    
    if (status === 'in_progress' && !updates.started_at) {
      updates.started_at = new Date().toISOString();
    }
    
    if (status === 'completed') {
      updates.completed_at = new Date().toISOString();
      if (score !== undefined) {
        updates.score = score;
      }
    }

    const { error } = await supabase
      .from('student_exercises')
      .update(updates)
      .eq('id', exerciseId);

    if (error) throw error;
  } catch (error) {
    console.error('Error updating exercise status:', error);
    throw error;
  }
}
