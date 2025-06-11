
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQuery } from "@tanstack/react-query";

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

// Active Classes functions
export const getAllActiveClasses = async () => {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(error.message);
      console.error("Error fetching active classes:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    toast.error("Failed to fetch active classes");
    console.error("Error fetching active classes:", error);
    return [];
  }
};

export const createActiveClass = async (classData: {
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  dayOfWeek?: string[];
  classTime?: string;
  endTime?: string;
  teacher_id?: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .insert([{
        name: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        teacher: classData.teacher,
        day_of_week: classData.dayOfWeek || [],
        class_time: classData.classTime || null,
        end_time: classData.endTime || null,
        teacher_id: classData.teacher_id || null,
        students: [],
        student_count: 0,
        avg_gpa: 0
      }])
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      console.error("Error creating active class:", error);
      return null;
    }

    toast.success("Class created successfully!");
    return data;
  } catch (error) {
    toast.error("Failed to create class");
    console.error("Error creating active class:", error);
    return null;
  }
};

export const updateActiveClass = async (classId: string, updates: Partial<ActiveClass>) => {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      console.error("Error updating active class:", error);
      return null;
    }

    toast.success("Class updated successfully!");
    return data;
  } catch (error) {
    toast.error("Failed to update class");
    console.error("Error updating active class:", error);
    return null;
  }
};

export const deleteActiveClass = async (classId: string) => {
  try {
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) {
      toast.error(error.message);
      console.error("Error deleting active class:", error);
      return false;
    }

    toast.success("Class deleted successfully!");
    return true;
  } catch (error) {
    toast.error("Failed to delete class");
    console.error("Error deleting active class:", error);
    return false;
  }
};

export const deleteActiveClassOnly = async (classId: string) => {
  return await deleteActiveClass(classId);
};

export const getClassDeletionInfo = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('id', classId)
      .single();

    if (error) {
      console.error("Error fetching class deletion info:", error);
      return null;
    }

    return {
      class: data,
      enrolledStudents: data.students?.length || 0,
      hasTestResults: false // For now, we'll assume no test results
    };
  } catch (error) {
    console.error("Error fetching class deletion info:", error);
    return null;
  }
};

// Active Students functions
export const getAllActiveStudents = async () => {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      toast.error(error.message);
      console.error("Error fetching active students:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    toast.error("Failed to fetch active students");
    console.error("Error fetching active students:", error);
    return [];
  }
};

export const createActiveStudent = async (studentData: {
  name: string;
  email?: string;
  year?: string;
  major?: string;
  gpa?: number;
}) => {
  try {
    const { data, error } = await supabase
      .from('active_students')
      .insert([{
        name: studentData.name,
        email: studentData.email || null,
        year: studentData.year || null,
        major: studentData.major || null,
        gpa: studentData.gpa || null
      }])
      .select()
      .single();

    if (error) {
      toast.error(error.message);
      console.error("Error creating active student:", error);
      return null;
    }

    toast.success("Student created successfully!");
    return data;
  } catch (error) {
    toast.error("Failed to create student");
    console.error("Error creating active student:", error);
    return null;
  }
};

// Content Skills functions
export const getContentSkillsBySubjectAndGrade = async (subject: string, grade: string) => {
  try {
    const { data, error } = await supabase
      .from('content_skills')
      .select('*')
      .eq('subject', subject)
      .eq('grade', grade)
      .order('skill_name');

    if (error) {
      console.error("Error fetching content skills:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching content skills:", error);
    return [];
  }
};

export const getLinkedContentSkillsForClass = async (classId: string) => {
  try {
    const { data, error } = await supabase
      .from('class_content_skills')
      .select(`
        content_skill_id,
        content_skills (*)
      `)
      .eq('class_id', classId);

    if (error) {
      console.error("Error fetching linked content skills:", error);
      return [];
    }

    return data?.map(item => item.content_skills).filter(Boolean) || [];
  } catch (error) {
    console.error("Error fetching linked content skills:", error);
    return [];
  }
};

export const linkClassToContentSkills = async (classId: string, skillIds: string[]) => {
  try {
    // First, remove existing links
    await supabase
      .from('class_content_skills')
      .delete()
      .eq('class_id', classId);

    // Then add new links
    const links = skillIds.map(skillId => ({
      class_id: classId,
      content_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_content_skills')
      .insert(links);

    if (error) {
      console.error("Error linking class to content skills:", error);
      toast.error("Failed to link content skills to class");
      return false;
    }

    toast.success("Content skills linked to class successfully!");
    return true;
  } catch (error) {
    console.error("Error linking class to content skills:", error);
    toast.error("Failed to link content skills to class");
    return false;
  }
};

export const createContentSkill = async (skillData: {
  skill_name: string;
  skill_description: string;
  topic: string;
  subject: string;
  grade: string;
}) => {
  try {
    const { data, error } = await supabase
      .from('content_skills')
      .insert([skillData])
      .select()
      .single();

    if (error) {
      console.error("Error creating content skill:", error);
      throw error;
    }

    return data;
  } catch (error) {
    console.error("Error creating content skill:", error);
    throw error;
  }
};

export const autoLinkMathClassToGrade10Skills = async (classId: string) => {
  try {
    const mathSkills = await getContentSkillsBySubjectAndGrade('Math', 'Grade 10');
    const skillIds = mathSkills.map(skill => skill.id);
    return await linkClassToContentSkills(classId, skillIds);
  } catch (error) {
    console.error("Error auto-linking math skills:", error);
    return false;
  }
};

export const autoLinkGeographyClassToGrade11Skills = async (classId: string) => {
  try {
    const geoSkills = await getContentSkillsBySubjectAndGrade('Geography', 'Grade 11');
    const skillIds = geoSkills.map(skill => skill.id);
    return await linkClassToContentSkills(classId, skillIds);
  } catch (error) {
    console.error("Error auto-linking geography skills:", error);
    return false;
  }
};

// Subject Skills functions
export const getSubjectSkillsBySubjectAndGrade = async (subject: string, grade: string) => {
  try {
    const { data, error } = await supabase
      .from('subject_skills')
      .select('*')
      .eq('subject', subject)
      .eq('grade', grade)
      .order('skill_name');

    if (error) {
      console.error("Error fetching subject skills:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching subject skills:", error);
    return [];
  }
};

export const linkClassToSubjectSkills = async (classId: string, skillIds: string[]) => {
  try {
    // First, remove existing links
    await supabase
      .from('class_subject_skills')
      .delete()
      .eq('class_id', classId);

    // Then add new links
    const links = skillIds.map(skillId => ({
      class_id: classId,
      subject_skill_id: skillId
    }));

    const { error } = await supabase
      .from('class_subject_skills')
      .insert(links);

    if (error) {
      console.error("Error linking class to subject skills:", error);
      toast.error("Failed to link subject skills to class");
      return false;
    }

    toast.success("Subject skills linked to class successfully!");
    return true;
  } catch (error) {
    console.error("Error linking class to subject skills:", error);
    toast.error("Failed to link subject skills to class");
    return false;
  }
};

// Content Skill Scores function
export const getStudentContentSkillScores = async (studentId: string) => {
  try {
    const { data, error } = await supabase
      .from('content_skill_scores')
      .select('*')
      .eq('authenticated_student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error("Error fetching student content skill scores:", error);
      return [];
    }

    return data || [];
  } catch (error) {
    console.error("Error fetching student content skill scores:", error);
    return [];
  }
};

// Type definitions
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

export interface ActiveStudent {
  id: string;
  name: string;
  email?: string;
  year?: string;
  major?: string;
  gpa?: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  teacher_id?: string;
  day_of_week?: string[];
  class_time?: string;
  end_time?: string;
  students: string[];
  student_count: number;
  avg_gpa: number;
  created_at: string;
  updated_at: string;
}

export interface ActiveClassWithDuration extends ActiveClass {
  duration?: number;
}

export interface ContentSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  topic: string;
  subject: string;
  grade: string;
  created_at: string;
  updated_at: string;
}
