import { supabase } from "@/integrations/supabase/client";
import type { Question } from "@/utils/pdfGenerator";

export interface ExamData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  totalPoints: number;
  questions: Question[];
}

export interface StoredExam {
  id: string;
  exam_id: string;
  title: string;
  description: string;
  class_name: string;
  class_id: string;
  time_limit: number;
  total_points: number;
  created_at: string;
  updated_at: string;
}

export interface AnswerKey {
  id: string;
  exam_id: string;
  question_number: number;
  question_text: string;
  question_type: string;
  correct_answer: string;
  points: number;
  options: any;
  created_at: string;
}

export interface Class {
  id: string;
  name: string;
  description: string;
  content_skills: string[];
  subject_skills: string[];
  created_at: string;
  updated_at: string;
}

export interface ActiveClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  student_count: number;
  avg_gpa: number;
  students: string[];
  created_at: string;
  updated_at: string;
}

export interface StudentProfile {
  id: string;
  student_name: string;
  email?: string;
  student_id?: string;
  created_at: string;
  updated_at: string;
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

export interface TestResult {
  id: string;
  student_id: string;
  exam_id: string;
  class_id: string;
  overall_score: number;
  total_points_earned: number;
  total_points_possible: number;
  ai_feedback?: string;
  detailed_analysis?: string;
  created_at: string;
}

export interface SkillScore {
  id: string;
  test_result_id: string;
  skill_name: string;
  score: number;
  points_earned: number;
  points_possible: number;
  created_at: string;
}

export const getAllClasses = async (): Promise<Class[]> => {
  try {
    console.log('Fetching all classes');
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching classes:', error);
      throw new Error(`Failed to fetch classes: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllClasses:', error);
    throw error;
  }
};

export const getAllActiveClasses = async (): Promise<ActiveClass[]> => {
  try {
    console.log('Fetching all active classes');
    
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching active classes:', error);
      throw new Error(`Failed to fetch active classes: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllActiveClasses:', error);
    throw error;
  }
};

export const createActiveClass = async (classData: {
  name: string;
  subject: string;
  grade: string;
  teacher: string;
}): Promise<ActiveClass> => {
  try {
    console.log('Creating active class:', classData);
    
    const { data, error } = await supabase
      .from('active_classes')
      .insert({
        name: classData.name,
        subject: classData.subject,
        grade: classData.grade,
        teacher: classData.teacher,
        student_count: 0,
        avg_gpa: 0,
        students: []
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating active class:', error);
      throw new Error(`Failed to create active class: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createActiveClass:', error);
    throw error;
  }
};

export const updateActiveClass = async (
  classId: string, 
  updates: Partial<ActiveClass>
): Promise<ActiveClass> => {
  try {
    console.log('Updating active class:', classId, updates);
    
    const { data, error } = await supabase
      .from('active_classes')
      .update(updates)
      .eq('id', classId)
      .select()
      .single();

    if (error) {
      console.error('Error updating active class:', error);
      throw new Error(`Failed to update active class: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in updateActiveClass:', error);
    throw error;
  }
};

export const deleteActiveClass = async (classId: string): Promise<void> => {
  try {
    console.log('Deleting active class:', classId);
    
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting active class:', error);
      throw new Error(`Failed to delete active class: ${error.message}`);
    }
  } catch (error) {
    console.error('Error in deleteActiveClass:', error);
    throw error;
  }
};

export const getClassById = async (classId: string): Promise<Class | null> => {
  try {
    console.log('Fetching class by ID:', classId);
    
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching class:', error);
      throw new Error(`Failed to fetch class: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getClassById:', error);
    throw error;
  }
};

export const createActiveStudent = async (studentData: {
  name: string;
  email?: string;
  year?: string;
  major?: string;
  gpa?: number;
}): Promise<ActiveStudent> => {
  try {
    console.log('Creating active student:', studentData);
    
    const { data, error } = await supabase
      .from('active_students')
      .insert({
        name: studentData.name,
        email: studentData.email,
        year: studentData.year,
        major: studentData.major,
        gpa: studentData.gpa
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating active student:', error);
      throw new Error(`Failed to create active student: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in createActiveStudent:', error);
    throw error;
  }
};

export const getAllActiveStudents = async (): Promise<ActiveStudent[]> => {
  try {
    console.log('Fetching all active students');
    
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .order('name');

    if (error) {
      console.error('Error fetching active students:', error);
      throw new Error(`Failed to fetch active students: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAllActiveStudents:', error);
    throw error;
  }
};

export const getActiveStudentById = async (studentId: string): Promise<ActiveStudent | null> => {
  try {
    console.log('Fetching active student by ID:', studentId);
    
    const { data, error } = await supabase
      .from('active_students')
      .select('*')
      .eq('id', studentId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active student:', error);
      throw new Error(`Failed to fetch active student: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveStudentById:', error);
    throw error;
  }
};

export const getStudentTestResults = async (studentId: string): Promise<TestResult[]> => {
  try {
    console.log('Fetching test results for student:', studentId);
    
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('active_student_id', studentId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching test results:', error);
      throw new Error(`Failed to fetch test results: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStudentTestResults:', error);
    throw error;
  }
};

export const getStudentContentSkillScores = async (studentId: string): Promise<SkillScore[]> => {
  try {
    console.log('Fetching content skill scores for student:', studentId);
    
    const { data, error } = await supabase
      .from('content_skill_scores')
      .select(`
        *,
        test_results!inner(active_student_id)
      `)
      .eq('test_results.active_student_id', studentId);

    if (error) {
      console.error('Error fetching content skill scores:', error);
      throw new Error(`Failed to fetch content skill scores: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStudentContentSkillScores:', error);
    throw error;
  }
};

export const getStudentSubjectSkillScores = async (studentId: string): Promise<SkillScore[]> => {
  try {
    console.log('Fetching subject skill scores for student:', studentId);
    
    const { data, error } = await supabase
      .from('subject_skill_scores')
      .select(`
        *,
        test_results!inner(active_student_id)
      `)
      .eq('test_results.active_student_id', studentId);

    if (error) {
      console.error('Error fetching subject skill scores:', error);
      throw new Error(`Failed to fetch subject skill scores: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getStudentSubjectSkillScores:', error);
    throw error;
  }
};

export const saveExamToDatabase = async (examData: ExamData, classId: string): Promise<void> => {
  try {
    console.log('Saving exam to database:', examData.examId);
    
    // Insert exam metadata with class reference
    const { error: examError } = await supabase
      .from('exams')
      .insert({
        exam_id: examData.examId,
        title: examData.title,
        description: examData.description,
        class_name: examData.className,
        class_id: classId,
        time_limit: examData.timeLimit,
        total_points: examData.totalPoints
      });

    if (examError) {
      console.error('Error saving exam:', examError);
      throw new Error(`Failed to save exam: ${examError.message}`);
    }

    // Insert answer keys - convert correctAnswer to string if it's an array
    const answerKeys = examData.questions.map((question, index) => {
      // Convert correctAnswer to string format
      let correctAnswerString = '';
      if (Array.isArray(question.correctAnswer)) {
        correctAnswerString = question.correctAnswer.join(', ');
      } else {
        correctAnswerString = question.correctAnswer || '';
      }

      return {
        exam_id: examData.examId,
        question_number: index + 1,
        question_text: question.question,
        question_type: question.type,
        correct_answer: correctAnswerString,
        points: question.points,
        options: question.options ? { options: question.options } : null
      };
    });

    const { error: answerError } = await supabase
      .from('answer_keys')
      .insert(answerKeys);

    if (answerError) {
      console.error('Error saving answer keys:', answerError);
      throw new Error(`Failed to save answer keys: ${answerError.message}`);
    }

    console.log('Exam and answer keys saved successfully');
  } catch (error) {
    console.error('Error in saveExamToDatabase:', error);
    throw error;
  }
};

export const createOrFindStudent = async (studentName: string, email?: string): Promise<StudentProfile> => {
  try {
    console.log('Creating or finding student:', studentName);
    
    // Try to find existing student by name
    const { data: existingStudent, error: findError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_name', studentName)
      .maybeSingle();

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Failed to search for student: ${findError.message}`);
    }

    if (existingStudent) {
      console.log('Found existing student:', existingStudent.id);
      return existingStudent;
    }

    // Create new student profile
    const { data: newStudent, error: createError } = await supabase
      .from('student_profiles')
      .insert({
        student_name: studentName,
        email: email
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating student:', createError);
      throw new Error(`Failed to create student: ${createError.message}`);
    }

    console.log('Created new student:', newStudent.id);
    return newStudent;
  } catch (error) {
    console.error('Error in createOrFindStudent:', error);
    throw error;
  }
};

export const saveTestResult = async (
  studentId: string,
  examId: string,
  classId: string,
  overallScore: number,
  totalPointsEarned: number,
  totalPointsPossible: number,
  aiFeedback?: string,
  detailedAnalysis?: string,
  contentSkillScores?: Array<{skill_name: string, score: number, points_earned: number, points_possible: number}>,
  subjectSkillScores?: Array<{skill_name: string, score: number, points_earned: number, points_possible: number}>
): Promise<TestResult> => {
  try {
    console.log('Saving test result for student:', studentId);
    
    // Insert test result
    const { data: testResult, error: resultError } = await supabase
      .from('test_results')
      .insert({
        student_id: studentId,
        exam_id: examId,
        class_id: classId,
        overall_score: overallScore,
        total_points_earned: totalPointsEarned,
        total_points_possible: totalPointsPossible,
        ai_feedback: aiFeedback,
        detailed_analysis: detailedAnalysis
      })
      .select()
      .single();

    if (resultError) {
      console.error('Error saving test result:', resultError);
      throw new Error(`Failed to save test result: ${resultError.message}`);
    }

    // Save content skill scores
    if (contentSkillScores && contentSkillScores.length > 0) {
      const contentScores = contentSkillScores.map(skill => ({
        test_result_id: testResult.id,
        skill_name: skill.skill_name,
        score: skill.score,
        points_earned: skill.points_earned,
        points_possible: skill.points_possible
      }));

      const { error: contentError } = await supabase
        .from('content_skill_scores')
        .insert(contentScores);

      if (contentError) {
        console.error('Error saving content skill scores:', contentError);
        throw new Error(`Failed to save content skill scores: ${contentError.message}`);
      }
    }

    // Save subject skill scores
    if (subjectSkillScores && subjectSkillScores.length > 0) {
      const subjectScores = subjectSkillScores.map(skill => ({
        test_result_id: testResult.id,
        skill_name: skill.skill_name,
        score: skill.score,
        points_earned: skill.points_earned,
        points_possible: skill.points_possible
      }));

      const { error: subjectError } = await supabase
        .from('subject_skill_scores')
        .insert(subjectScores);

      if (subjectError) {
        console.error('Error saving subject skill scores:', subjectError);
        throw new Error(`Failed to save subject skill scores: ${subjectError.message}`);
      }
    }

    console.log('Test result and skill scores saved successfully');
    return testResult;
  } catch (error) {
    console.error('Error in saveTestResult:', error);
    throw error;
  }
};

export const getExamByExamId = async (examId: string): Promise<StoredExam | null> => {
  try {
    console.log('Fetching exam by ID:', examId);
    
    const { data, error } = await supabase
      .from('exams')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching exam:', error);
      throw new Error(`Failed to fetch exam: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getExamByExamId:', error);
    throw error;
  }
};

export const getAnswerKeysByExamId = async (examId: string): Promise<AnswerKey[]> => {
  try {
    console.log('Fetching answer keys for exam:', examId);
    
    const { data, error } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number');

    if (error) {
      console.error('Error fetching answer keys:', error);
      throw new Error(`Failed to fetch answer keys: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getAnswerKeysByExamId:', error);
    throw error;
  }
};
