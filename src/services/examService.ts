import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";
import { DEV_CONFIG } from "@/config/devConfig";

export const getAllClasses = async () => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*');

    if (error) {
      toast.error(error.message);
      console.error("Error fetching classes:", error);
      return [];
    }

    return data;
  } catch (error) {
    toast.error("Failed to fetch classes");
    console.error("Error fetching classes:", error);
    return [];
  }
};

export const getActiveClassById = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      toast.error(error.message);
      console.error(`Error fetching class with ID ${classId}:`, error);
      return null;
    }

    return data;
  } catch (error) {
    toast.error(`Failed to fetch class with ID ${classId}`);
    console.error(`Error fetching class with ID ${classId}:`, error);
    return null;
  }
};

export const getAllExams = async () => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*');
  
      if (error) {
        toast.error(error.message);
        console.error("Error fetching exams:", error);
        return [];
      }
  
      return data;
    } catch (error) {
      toast.error("Failed to fetch exams");
      console.error("Error fetching exams:", error);
      return [];
    }
  };
  
  export const getExamById = async (examId: string) => {
    try {
      const { data, error } = await supabase
        .from('exams')
        .select('*')
        .eq('id', examId)
        .single();
  
      if (error) {
        toast.error(error.message);
        console.error(`Error fetching exam with ID ${examId}:`, error);
        return null;
      }
  
      return data;
    } catch (error) {
      toast.error(`Failed to fetch exam with ID ${examId}`);
      console.error(`Error fetching exam with ID ${examId}:`, error);
      return null;
    }
  };

export interface SkillScore {
  id: string;
  test_result_id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
  practice_exercise_id?: string;
}

export interface TestResult {
  id: string;
  student_id: string;
  exam_id: string;
  class_id: string;
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  detailed_analysis?: string;
  ai_feedback?: string;
  created_at: string;
}

export interface EnrolledClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  created_at: string;
}
