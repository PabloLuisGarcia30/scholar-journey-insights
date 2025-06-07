
import { supabase } from "@/integrations/supabase/client";

export interface StudentLink {
  id: string;
  token: string;
  link_type: 'quiz' | 'upload';
  exam_id?: string;
  class_id?: string;
  teacher_name: string;
  student_name?: string;
  title: string;
  description?: string;
  expires_at: string;
  max_attempts: number;
  current_attempts: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentQuizSession {
  id: string;
  student_link_id: string;
  student_name: string;
  started_at: string;
  completed_at?: string;
  current_question: number;
  answers: Record<string, any>;
  total_score?: number;
  is_submitted: boolean;
  created_at: string;
  updated_at: string;
}

export interface StudentUploadSession {
  id: string;
  student_link_id: string;
  student_name: string;
  uploaded_files: any[];
  analysis_results?: any;
  overall_score?: number;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export const createStudentLink = async (linkData: {
  link_type: 'quiz' | 'upload';
  exam_id?: string;
  class_id?: string;
  teacher_name: string;
  title: string;
  description?: string;
  expires_at: string;
  max_attempts: number;
}): Promise<StudentLink> => {
  try {
    console.log('Creating student link:', linkData);
    
    // Generate a unique token
    const token = generateToken();
    
    const { data, error } = await (supabase as any)
      .from('student_links')
      .insert({
        token,
        link_type: linkData.link_type,
        exam_id: linkData.exam_id,
        class_id: linkData.class_id,
        teacher_name: linkData.teacher_name,
        title: linkData.title,
        description: linkData.description,
        expires_at: linkData.expires_at,
        max_attempts: linkData.max_attempts,
        current_attempts: 0,
        is_active: true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating student link:', error);
      throw new Error(`Failed to create student link: ${error.message}`);
    }

    console.log('Student link created successfully:', data);
    return data as StudentLink;
  } catch (error) {
    console.error('Error in createStudentLink:', error);
    throw error;
  }
};

export const getStudentLinkByToken = async (token: string): Promise<StudentLink | null> => {
  try {
    console.log('Fetching student link by token:', token);
    
    const { data, error } = await (supabase as any)
      .from('student_links')
      .select('*')
      .eq('token', token)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('Error fetching student link:', error);
      throw new Error(`Failed to fetch student link: ${error.message}`);
    }

    return data as StudentLink | null;
  } catch (error) {
    console.error('Error in getStudentLinkByToken:', error);
    throw error;
  }
};

export const createQuizSession = async (sessionData: {
  student_link_id: string;
  student_name: string;
}): Promise<StudentQuizSession> => {
  try {
    console.log('Creating quiz session:', sessionData);
    
    const { data, error } = await (supabase as any)
      .from('student_quiz_sessions')
      .insert({
        student_link_id: sessionData.student_link_id,
        student_name: sessionData.student_name,
        current_question: 1,
        answers: {},
        is_submitted: false
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating quiz session:', error);
      throw new Error(`Failed to create quiz session: ${error.message}`);
    }

    console.log('Quiz session created successfully:', data);
    return data as StudentQuizSession;
  } catch (error) {
    console.error('Error in createQuizSession:', error);
    throw error;
  }
};

export const updateQuizSession = async (
  sessionId: string,
  updates: Partial<StudentQuizSession>
): Promise<StudentQuizSession> => {
  try {
    console.log('Updating quiz session:', sessionId, updates);
    
    const { data, error } = await (supabase as any)
      .from('student_quiz_sessions')
      .update(updates)
      .eq('id', sessionId)
      .select()
      .single();

    if (error) {
      console.error('Error updating quiz session:', error);
      throw new Error(`Failed to update quiz session: ${error.message}`);
    }

    console.log('Quiz session updated successfully:', data);
    return data as StudentQuizSession;
  } catch (error) {
    console.error('Error in updateQuizSession:', error);
    throw error;
  }
};

export const getTeacherQuizLinks = async (teacherName: string): Promise<StudentLink[]> => {
  try {
    console.log('Fetching quiz links for teacher:', teacherName);
    
    const { data, error } = await (supabase as any)
      .from('student_links')
      .select('*')
      .eq('teacher_name', teacherName)
      .eq('link_type', 'quiz')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching teacher quiz links:', error);
      throw new Error(`Failed to fetch quiz links: ${error.message}`);
    }

    return (data || []) as StudentLink[];
  } catch (error) {
    console.error('Error in getTeacherQuizLinks:', error);
    throw error;
  }
};

export const incrementLinkAttempts = async (linkId: string): Promise<void> => {
  try {
    console.log('Incrementing attempts for link:', linkId);
    
    // Since we can't use RPC functions that don't exist yet, we'll do this manually
    const { data: currentLink, error: fetchError } = await (supabase as any)
      .from('student_links')
      .select('current_attempts')
      .eq('id', linkId)
      .single();

    if (fetchError) {
      console.error('Error fetching current attempts:', fetchError);
      throw new Error(`Failed to fetch current attempts: ${fetchError.message}`);
    }

    const { error: updateError } = await (supabase as any)
      .from('student_links')
      .update({ current_attempts: (currentLink.current_attempts || 0) + 1 })
      .eq('id', linkId);

    if (updateError) {
      console.error('Error incrementing link attempts:', updateError);
      throw new Error(`Failed to increment attempts: ${updateError.message}`);
    }

    console.log('Link attempts incremented successfully');
  } catch (error) {
    console.error('Error in incrementLinkAttempts:', error);
    throw error;
  }
};

// Helper function to generate unique tokens
const generateToken = (): string => {
  return Math.random().toString(36).substring(2) + 
         Math.random().toString(36).substring(2) + 
         Date.now().toString(36);
};

export { generateToken };
