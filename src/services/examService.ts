import { supabase } from "@/integrations/supabase/client";
import { StudentIdGenerationService } from "./studentIdGenerationService";
import { calculateClassDuration, getClassDurationInMinutes, formatDurationShort, DurationInfo } from "@/utils/classDurationUtils";
import { DEV_CONFIG, MOCK_USER_DATA } from "@/config/devConfig";
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

export interface ActiveClass {
  id: string;
  name: string;
  subject: string;
  grade: string;
  teacher: string;
  student_count: number;
  avg_gpa: number;
  students: string[];
  day_of_week?: string[]; // Changed from string to string[] to support multiple days
  class_time?: string;
  end_time?: string;
  created_at: string;
  updated_at: string;
}

export interface ActiveClassWithDuration extends ActiveClass {
  duration?: DurationInfo;
  durationMinutes?: number;
  durationFormatted?: string;
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

export interface ContentSkill {
  id: string;
  subject: string;
  grade: string;
  topic: string;
  skill_name: string;
  skill_description: string;
  created_at: string;
  updated_at: string;
}

export interface SubjectSkill {
  id: string;
  subject: string;
  grade: string;
  skill_name: string;
  skill_description: string;
  created_at: string;
  updated_at: string;
}

export interface ClassContentSkill {
  id: string;
  class_id: string;
  content_skill_id: string;
  created_at: string;
}

export interface ClassSubjectSkill {
  id: string;
  class_id: string;
  subject_skill_id: string;
  created_at: string;
}

export const getAllActiveClasses = async (): Promise<ActiveClass[]> => {
  try {
    console.log('Fetching all active classes for current teacher');
    
    // Check if we're in dev mode
    if (DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
      // In dev mode, get the mock teacher ID
      const mockTeacherId = MOCK_USER_DATA.teacher.user.id;
      
      const { data, error } = await supabase
        .from('active_classes')
        .select('*')
        .eq('teacher_id', mockTeacherId)
        .order('name');

      if (error) {
        console.error('Error fetching active classes:', error);
        throw new Error(`Failed to fetch active classes: ${error.message}`);
      }

      return data || [];
    }
    
    // Get the current user's ID to filter classes
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      console.log('No authenticated user found');
      return [];
    }

    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('teacher_id', user.id)
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
  dayOfWeek?: string[];
  classTime?: string;
  endTime?: string;
}): Promise<ActiveClass> => {
  try {
    console.log('Creating active class:', classData);
    
    let teacherId: string;
    
    // Check if we're in dev mode
    if (DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
      // In dev mode, use the mock teacher ID
      teacherId = MOCK_USER_DATA.teacher.user.id;
      console.log('Using dev mode teacher ID:', teacherId);
    } else {
      // Get the current user's ID
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error('Must be authenticated to create a class');
      }
      
      teacherId = user.id;
    }

    const insertData: any = {
      name: classData.name,
      subject: classData.subject,
      grade: classData.grade,
      teacher: classData.teacher,
      teacher_id: teacherId, // Use the determined teacher ID
      student_count: 0,
      avg_gpa: 0,
      students: []
    };

    // Add scheduling fields if provided
    if (classData.dayOfWeek && classData.dayOfWeek.length > 0) {
      insertData.day_of_week = classData.dayOfWeek;
    }
    if (classData.classTime) {
      insertData.class_time = classData.classTime;
    }
    if (classData.endTime) {
      insertData.end_time = classData.endTime;
    }

    const { data, error } = await supabase
      .from('active_classes')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Error creating active class:', error);
      throw new Error(`Failed to create active class: ${error.message}`);
    }

    // Auto-link content skills based on subject and grade
    try {
      await autoLinkClassToContentSkills(data.id, classData.subject, classData.grade);
    } catch (skillError) {
      console.warn('Failed to auto-link content skills:', skillError);
      // Don't fail the class creation if skill linking fails
    }

    // Auto-link subject skills based on subject and grade
    try {
      await autoLinkClassToSubjectSkills(data.id, classData.subject, classData.grade);
    } catch (skillError) {
      console.warn('Failed to auto-link subject skills:', skillError);
      // Don't fail the class creation if skill linking fails
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
    console.log('Deleting active class with cascade:', classId);
    
    // Start a transaction-like approach by deleting related data first
    
    // Step 1: Get all exams for this class
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('exam_id')
      .eq('class_id', classId);

    if (examError) {
      console.error('Error fetching exams for class:', examError);
      throw new Error(`Failed to fetch exams for class: ${examError.message}`);
    }

    // Step 2: Delete answer keys for all exams in this class
    if (exams && exams.length > 0) {
      const examIds = exams.map(exam => exam.exam_id);
      
      for (const examId of examIds) {
        const { error: answerKeyError } = await supabase
          .from('answer_keys')
          .delete()
          .eq('exam_id', examId);

        if (answerKeyError) {
          console.error('Error deleting answer keys for exam:', examId, answerKeyError);
          throw new Error(`Failed to delete answer keys for exam ${examId}: ${answerKeyError.message}`);
        }
        
        console.log(`Deleted answer keys for exam: ${examId}`);
      }
    }

    // Step 3: Delete all exams for this class
    const { error: deleteExamsError } = await supabase
      .from('exams')
      .delete()
      .eq('class_id', classId);

    if (deleteExamsError) {
      console.error('Error deleting exams for class:', deleteExamsError);
      throw new Error(`Failed to delete exams for class: ${deleteExamsError.message}`);
    }

    console.log(`Deleted exams for class: ${classId}`);

    // Step 4: Delete class content skill links
    const { error: contentSkillError } = await supabase
      .from('class_content_skills')
      .delete()
      .eq('class_id', classId);

    if (contentSkillError) {
      console.error('Error deleting class content skills:', contentSkillError);
      throw new Error(`Failed to delete class content skills: ${contentSkillError.message}`);
    }

    // Step 5: Delete class subject skill links
    const { error: subjectSkillError } = await supabase
      .from('class_subject_skills')
      .delete()
      .eq('class_id', classId);

    if (subjectSkillError) {
      console.error('Error deleting class subject skills:', subjectSkillError);
      throw new Error(`Failed to delete class subject skills: ${subjectSkillError.message}`);
    }

    // Step 6: Finally delete the class itself
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting active class:', error);
      throw new Error(`Failed to delete active class: ${error.message}`);
    }

    console.log(`Successfully deleted class and all related data: ${classId}`);
  } catch (error) {
    console.error('Error in deleteActiveClass:', error);
    throw error;
  }
};

export const deleteActiveClassOnly = async (classId: string): Promise<void> => {
  try {
    console.log('Deleting only the class (preserving historical data):', classId);
    
    // Step 1: Update all exams to remove class_id reference but keep the exams
    const { error: updateExamsError } = await supabase
      .from('exams')
      .update({ 
        class_id: null,
        class_name: 'Archived Class Data'
      })
      .eq('class_id', classId);

    if (updateExamsError) {
      console.error('Error updating exams for class:', updateExamsError);
      throw new Error(`Failed to update exams for class: ${updateExamsError.message}`);
    }

    // Step 2: Delete class content skill links
    const { error: contentSkillError } = await supabase
      .from('class_content_skills')
      .delete()
      .eq('class_id', classId);

    if (contentSkillError) {
      console.error('Error deleting class content skills:', contentSkillError);
      throw new Error(`Failed to delete class content skills: ${contentSkillError.message}`);
    }

    // Step 3: Delete class subject skill links
    const { error: subjectSkillError } = await supabase
      .from('class_subject_skills')
      .delete()
      .eq('class_id', classId);

    if (subjectSkillError) {
      console.error('Error deleting class subject skills:', subjectSkillError);
      throw new Error(`Failed to delete class subject skills: ${subjectSkillError.message}`);
    }

    // Step 4: Update test results to remove class_id reference but keep the results
    const { error: updateTestResultsError } = await supabase
      .from('test_results')
      .update({ class_id: null })
      .eq('class_id', classId);

    if (updateTestResultsError) {
      console.error('Error updating test results for class:', updateTestResultsError);
      throw new Error(`Failed to update test results for class: ${updateTestResultsError.message}`);
    }

    // Step 5: Finally delete the class itself
    const { error } = await supabase
      .from('active_classes')
      .delete()
      .eq('id', classId);

    if (error) {
      console.error('Error deleting active class:', error);
      throw new Error(`Failed to delete active class: ${error.message}`);
    }

    console.log(`Successfully deleted class while preserving historical data: ${classId}`);
  } catch (error) {
    console.error('Error in deleteActiveClassOnly:', error);
    throw error;
  }
};

export const getClassDeletionInfo = async (classId: string): Promise<{
  examCount: number;
  answerKeyCount: number;
  testResultCount: number;
}> => {
  try {
    console.log('Getting deletion info for class:', classId);
    
    // Count exams
    const { count: examCount, error: examError } = await supabase
      .from('exams')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (examError) {
      console.error('Error counting exams:', examError);
      throw new Error(`Failed to count exams: ${examError.message}`);
    }

    // Count answer keys for exams in this class
    const { data: exams, error: examFetchError } = await supabase
      .from('exams')
      .select('exam_id')
      .eq('class_id', classId);

    if (examFetchError) {
      console.error('Error fetching exams for class:', examFetchError);
      throw new Error(`Failed to fetch exams for class: ${examFetchError.message}`);
    }

    let answerKeyCount = 0;
    if (exams && exams.length > 0) {
      const examIds = exams.map(exam => exam.exam_id);
      
      const { count, error: answerKeyError } = await supabase
        .from('answer_keys')
        .select('*', { count: 'exact', head: true })
        .in('exam_id', examIds);

      if (answerKeyError) {
        console.error('Error counting answer keys:', answerKeyError);
        throw new Error(`Failed to count answer keys: ${answerKeyError.message}`);
      }

      answerKeyCount = count || 0;
    }

    // Count test results
    const { count: testResultCount, error: testResultError } = await supabase
      .from('test_results')
      .select('*', { count: 'exact', head: true })
      .eq('class_id', classId);

    if (testResultError) {
      console.error('Error counting test results:', testResultError);
      throw new Error(`Failed to count test results: ${testResultError.message}`);
    }

    return {
      examCount: examCount || 0,
      answerKeyCount,
      testResultCount: testResultCount || 0
    };
  } catch (error) {
    console.error('Error in getClassDeletionInfo:', error);
    throw error;
  }
};

export const getActiveClassById = async (classId: string): Promise<ActiveClass | null> => {
  try {
    console.log('Fetching active class by ID:', classId);
    
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .eq('id', classId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching active class:', error);
      throw new Error(`Failed to fetch active class: ${error.message}`);
    }

    return data;
  } catch (error) {
    console.error('Error in getActiveClassById:', error);
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
    
    // Generate unique Student ID
    const studentId = await StudentIdGenerationService.generateUniqueStudentId(studentData.year);
    console.log('🆔 Generated Student ID:', studentId);
    
    // First create or find the student in student_profiles with the generated ID
    const studentProfile = await createOrFindStudent(studentData.name, studentData.email, studentId);
    
    // Then create the active student record
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

    console.log('Successfully created student with auto-generated Student ID:', {
      activeStudentId: data.id,
      studentProfileId: studentProfile.id,
      generatedStudentId: studentId
    });

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
    
    // Fix: Use student_id instead of active_student_id to match the database column
    const { data, error } = await supabase
      .from('test_results')
      .select('*')
      .eq('student_id', studentId)
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
    
    // Check if exam already exists
    const { data: existingExam, error: checkError } = await supabase
      .from('exams')
      .select('id')
      .eq('exam_id', examData.examId)
      .maybeSingle();

    if (checkError) {
      console.error('Error checking existing exam:', checkError);
      throw new Error(`Failed to check existing exam: ${checkError.message}`);
    }

    // If exam doesn't exist, insert it
    if (!existingExam) {
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
    } else {
      console.log('Exam already exists, updating instead');
      // Update existing exam
      const { error: updateError } = await supabase
        .from('exams')
        .update({
          title: examData.title,
          description: examData.description,
          class_name: examData.className,
          class_id: classId,
          time_limit: examData.timeLimit,
          total_points: examData.totalPoints
        })
        .eq('exam_id', examData.examId);

      if (updateError) {
        console.error('Error updating exam:', updateError);
        throw new Error(`Failed to update exam: ${updateError.message}`);
      }
    }

    // Delete existing answer keys for this exam to avoid duplicates
    const { error: deleteError } = await supabase
      .from('answer_keys')
      .delete()
      .eq('exam_id', examData.examId);

    if (deleteError) {
      console.error('Error deleting existing answer keys:', deleteError);
      // Don't throw here, just log the warning
      console.warn('Could not delete existing answer keys, proceeding with insertion');
    }

    // Insert answer keys - convert correctAnswer to string properly handling all types
    const answerKeys = examData.questions.map((question, index) => {
      // Convert correctAnswer to string format, handling boolean values
      let correctAnswerString = '';
      if (Array.isArray(question.correctAnswer)) {
        correctAnswerString = question.correctAnswer.join(', ');
      } else if (typeof question.correctAnswer === 'boolean') {
        correctAnswerString = question.correctAnswer.toString();
      } else if (question.correctAnswer !== undefined && question.correctAnswer !== null) {
        correctAnswerString = String(question.correctAnswer);
      } else {
        correctAnswerString = '';
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

export const createOrFindStudent = async (
  studentName: string, 
  email?: string, 
  studentId?: string
): Promise<StudentProfile> => {
  try {
    console.log('Creating or finding student:', studentName, 'with ID:', studentId);
    
    // Try to find existing student by name first
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
      
      // If existing student doesn't have a Student ID but we have one, update it
      if (!existingStudent.student_id && studentId) {
        console.log('🆔 Updating existing student with Student ID:', studentId);
        
        const { data: updatedStudent, error: updateError } = await supabase
          .from('student_profiles')
          .update({ student_id: studentId })
          .eq('id', existingStudent.id)
          .select()
          .single();

        if (updateError) {
          console.error('Error updating student with Student ID:', updateError);
          throw new Error(`Failed to update student with Student ID: ${updateError.message}`);
        }

        return updatedStudent;
      }
      
      return existingStudent;
    }

    // Generate Student ID if not provided
    const finalStudentId = studentId || await StudentIdGenerationService.generateUniqueStudentId();

    // Create new student profile with Student ID
    const { data: newStudent, error: createError } = await supabase
      .from('student_profiles')
      .insert({
        student_name: studentName,
        email: email,
        student_id: finalStudentId
      })
      .select()
      .single();

    if (createError) {
      console.error('Error creating student:', createError);
      throw new Error(`Failed to create student: ${createError.message}`);
    }

    console.log('Created new student with Student ID:', newStudent.id, finalStudentId);
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

export const getContentSkillsBySubjectAndGrade = async (subject: string, grade: string): Promise<ContentSkill[]> => {
  try {
    console.log('Fetching content skills for:', subject, grade);
    
    const { data, error } = await supabase
      .from('content_skills')
      .select('*')
      .eq('subject', subject)
      .eq('grade', grade)
      .order('topic')
      .order('skill_name');

    if (error) {
      console.error('Error fetching content skills:', error);
      throw new Error(`Failed to fetch content skills: ${error.message}`);
    }

    return data || [];
  } catch (error) {
    console.error('Error in getContentSkillsBySubjectAndGrade:', error);
    throw error;
  }
};

export const linkClassToContentSkills = async (classId: string, contentSkillIds: string[]): Promise<void> => {
  try {
    console.log('Linking class to content skills:', classId, contentSkillIds);
    
    // Remove existing links for this class
    const { error: deleteError } = await supabase
      .from('class_content_skills')
      .delete()
      .eq('class_id', classId);

    if (deleteError) {
      console.error('Error removing existing class content skills:', deleteError);
      throw new Error(`Failed to remove existing links: ${deleteError.message}`);
    }

    // Add new links if there are skills to link
    if (contentSkillIds.length > 0) {
      const newLinks = contentSkillIds.map(skillId => ({
        class_id: classId,
        content_skill_id: skillId
      }));

      const { error: insertError } = await supabase
        .from('class_content_skills')
        .insert(newLinks);

      if (insertError) {
        console.error('Error linking class to content skills:', insertError);
        throw new Error(`Failed to link class to content skills: ${insertError.message}`);
      }
    }

    console.log('Successfully linked class to content skills');
  } catch (error) {
    console.error('Error in linkClassToContentSkills:', error);
    throw error;
  }
};

export const getLinkedContentSkillsForClass = async (classId: string): Promise<ContentSkill[]> => {
  try {
    console.log('Fetching linked content skills for class:', classId);
    
    const { data, error } = await supabase
      .from('class_content_skills')
      .select(`
        content_skills (
          id,
          subject,
          grade,
          topic,
          skill_name,
          skill_description,
          created_at,
          updated_at
        )
      `)
      .eq('class_id', classId);

    if (error) {
      console.error('Error fetching linked content skills:', error);
      throw new Error(`Failed to fetch linked content skills: ${error.message}`);
    }

    // Extract the content_skills from the nested structure
    const contentSkills = data?.map((item: any) => item.content_skills).filter(Boolean) || [];
    console.log('Found linked content skills:', contentSkills.length);
    return contentSkills;
  } catch (error) {
    console.error('Error in getLinkedContentSkillsForClass:', error);
    throw error;
  }
};

export const autoLinkClassToContentSkills = async (classId: string, subject: string, grade: string): Promise<void> => {
  try {
    console.log(`Auto-linking class ${classId} to ${subject} ${grade} skills`);
    
    // Get all content skills for the subject and grade
    const contentSkills = await getContentSkillsBySubjectAndGrade(subject, grade);
    const skillIds = contentSkills.map(skill => skill.id);

    if (skillIds.length > 0) {
      // Link the class to all matching content skills
      await linkClassToContentSkills(classId, skillIds);
      console.log(`Successfully auto-linked class to ${skillIds.length} ${subject} ${grade} content skills`);
    } else {
      console.log(`No content skills found for ${subject} ${grade}`);
    }
  } catch (error) {
    console.error('Error in autoLinkClassToContentSkills:', error);
    throw error;
  }
};

export const autoLinkMathClassToGrade10Skills = async (): Promise<void> => {
  try {
    console.log('Auto-linking Math Studies 10 class to Grade 10 Math skills');
    
    // Find the Math Studies 10 class
    const { data: mathClass, error: classError } = await supabase
      .from('active_classes')
      .select('*')
      .eq('name', 'Math Studies 10')
      .eq('subject', 'Math')
      .eq('grade', 'Grade 10')
      .maybeSingle();

    if (classError) {
      console.error('Error finding Math Studies 10 class:', classError);
      throw new Error(`Failed to find Math Studies 10 class: ${classError.message}`);
    }

    if (!mathClass) {
      console.log('Math Studies 10 class not found, skipping auto-link');
      return;
    }

    // Get all Grade 10 Math content skills
    const contentSkills = await getContentSkillsBySubjectAndGrade('Math', 'Grade 10');
    const skillIds = contentSkills.map(skill => skill.id);

    // Link the class to all Grade 10 Math skills
    await linkClassToContentSkills(mathClass.id, skillIds);
    
    console.log(`Successfully auto-linked Math Studies 10 class to ${skillIds.length} Grade 10 Math skills`);
  } catch (error) {
    console.error('Error in autoLinkMathClassToGrade10Skills:', error);
    throw error;
  }
};

export const autoLinkGeographyClassToGrade11Skills = async (): Promise<void> => {
  try {
    console.log('Auto-linking Geography 11 classes to Grade 11 Geography skills');
    
    // Find all Geography Grade 11 classes
    const { data: geographyClasses, error: classError } = await supabase
      .from('active_classes')
      .select('*')
      .eq('subject', 'Geography')
      .eq('grade', 'Grade 11');

    if (classError) {
      console.error('Error finding Geography Grade 11 classes:', classError);
      throw new Error(`Failed to find Geography Grade 11 classes: ${classError.message}`);
    }

    if (!geographyClasses || geographyClasses.length === 0) {
      console.log('No Geography Grade 11 classes found, skipping auto-link');
      return;
    }

    // Get all Grade 11 Geography content skills
    const contentSkills = await getContentSkillsBySubjectAndGrade('Geography', 'Grade 11');
    const skillIds = contentSkills.map(skill => skill.id);

    if (skillIds.length === 0) {
      console.log('No Geography Grade 11 skills found to link');
      return;
    }

    // Link each Geography Grade 11 class to all Grade 11 Geography skills
    for (const geographyClass of geographyClasses) {
      await linkClassToContentSkills(geographyClass.id, skillIds);
      console.log(`Successfully auto-linked ${geographyClass.name} to ${skillIds.length} Grade 11 Geography skills`);
    }
    
    console.log(`Successfully auto-linked ${geographyClasses.length} Geography Grade 11 classes to Grade 11 Geography skills`);
  } catch (error) {
    console.error('Error in autoLinkGeographyClassToGrade11Skills:', error);
    throw error;
  }
};

export const getSubjectSkillsBySubjectAndGrade = async (subject: string, grade: string): Promise<SubjectSkill[]> => {
  const { data, error } = await supabase
    .from('subject_skills')
    .select('*')
    .eq('subject', subject)
    .eq('grade', grade)
    .order('skill_name');

  if (error) {
    console.error('Error fetching subject skills:', error);
    throw error;
  }

  return data || [];
};

export const getLinkedSubjectSkillsForClass = async (classId: string): Promise<SubjectSkill[]> => {
  const { data, error } = await supabase
    .from('class_subject_skills')
    .select(`
      subject_skills (
        id,
        skill_name,
        skill_description,
        subject,
        grade,
        created_at,
        updated_at
      )
    `)
    .eq('class_id', classId);

  if (error) {
    console.error('Error fetching linked subject skills for class:', error);
    throw error;
  }

  return data?.map((item: any) => item.subject_skills).filter(Boolean) || [];
};

export const linkClassToSubjectSkills = async (classId: string, subjectSkillIds: string[]): Promise<void> => {
  // First, delete existing links
  const { error: deleteError } = await supabase
    .from('class_subject_skills')
    .delete()
    .eq('class_id', classId);

  if (deleteError) {
    console.error('Error deleting existing subject skill links:', deleteError);
    throw deleteError;
  }

  // Then, insert new links
  if (subjectSkillIds.length > 0) {
    const links = subjectSkillIds.map(skillId => ({
      class_id: classId,
      subject_skill_id: skillId
    }));

    const { error: insertError } = await supabase
      .from('class_subject_skills')
      .insert(links);

    if (insertError) {
      console.error('Error linking class to subject skills:', insertError);
      throw insertError;
    }
  }
};

export const autoLinkClassToSubjectSkills = async (classId: string, subject: string, grade: string): Promise<void> => {
  try {
    console.log(`Auto-linking class ${classId} to ${subject} ${grade} subject skills`);
    
    // Get all subject skills for the subject and grade
    const subjectSkills = await getSubjectSkillsBySubjectAndGrade(subject, grade);
    const skillIds = subjectSkills.map(skill => skill.id);

    if (skillIds.length > 0) {
      // Link the class to all matching subject skills
      await linkClassToSubjectSkills(classId, skillIds);
      console.log(`Successfully auto-linked class to ${skillIds.length} ${subject} ${grade} subject skills`);
    } else {
      console.log(`No subject skills found for ${subject} ${grade}`);
    }
  } catch (error) {
    console.error('Error in autoLinkClassToSubjectSkills:', error);
    throw error;
  }
};

export const createContentSkill = async (skillData: {
  skill_name: string;
  skill_description: string;
  topic: string;
  subject: string;
  grade: string;
}): Promise<ContentSkill> => {
  console.log('Creating content skill:', skillData);
  
  const { data, error } = await supabase
    .from('content_skills')
    .insert([skillData])
    .select()
    .single();
  
  if (error) {
    console.error('Error creating content skill:', error);
    throw error;
  }
  
  console.log('Content skill created successfully:', data);
  return data;
};

export const getStudentEnrolledClasses = async (studentId: string): Promise<ActiveClass[]> => {
  try {
    console.log('Fetching enrolled classes for student:', studentId);
    
    const { data, error } = await supabase
      .from('active_classes')
      .select('*')
      .contains('students', [studentId])
      .order('subject');

    if (error) {
      console.error('Error fetching enrolled classes:', error);
      throw new Error(`Failed to fetch enrolled classes: ${error.message}`);
    }

    console.log('Found enrolled classes:', data?.length || 0);
    return data || [];
  } catch (error) {
    console.error('Error in getStudentEnrolledClasses:', error);
    throw error;
  }
};

/**
 * Get class duration information for a single class
 */
export const getClassDuration = (activeClass: ActiveClass): DurationInfo | null => {
  return calculateClassDuration(activeClass.class_time, activeClass.end_time);
};

/**
 * Get class duration in minutes for a single class
 */
export const getClassDurationMinutes = (activeClass: ActiveClass): number => {
  return getClassDurationInMinutes(activeClass.class_time, activeClass.end_time);
};

/**
 * Get formatted duration string for a single class
 */
export const getClassDurationFormatted = (activeClass: ActiveClass): string => {
  const duration = getClassDuration(activeClass);
  return duration?.formattedDuration || 'Duration not available';
};

/**
 * Get short formatted duration for a single class
 */
export const getClassDurationShort = (activeClass: ActiveClass): string => {
  const duration = getClassDuration(activeClass);
  return duration?.shortFormat || 'N/A';
};

/**
 * Enhance active classes with duration information
 */
export const enhanceClassesWithDuration = (classes: ActiveClass[]): ActiveClassWithDuration[] => {
  return classes.map(activeClass => {
    const duration = getClassDuration(activeClass);
    return {
      ...activeClass,
      duration,
      durationMinutes: duration?.totalMinutes,
      durationFormatted: duration?.formattedDuration
    };
  });
};

/**
 * Get all active classes with duration information
 */
export const getAllActiveClassesWithDuration = async (): Promise<ActiveClassWithDuration[]> => {
  try {
    const classes = await getAllActiveClasses();
    return enhanceClassesWithDuration(classes);
  } catch (error) {
    console.error('Error in getAllActiveClassesWithDuration:', error);
    throw error;
  }
};

/**
 * Get active class by ID with duration information
 */
export const getActiveClassByIdWithDuration = async (classId: string): Promise<ActiveClassWithDuration | null> => {
  try {
    const activeClass = await getActiveClassById(classId);
    if (!activeClass) return null;
    
    const duration = getClassDuration(activeClass);
    return {
      ...activeClass,
      duration,
      durationMinutes: duration?.totalMinutes,
      durationFormatted: duration?.formattedDuration
    };
  } catch (error) {
    console.error('Error in getActiveClassByIdWithDuration:', error);
    throw error;
  }
};

/**
 * Get student enrolled classes with duration information
 */
export const getStudentEnrolledClassesWithDuration = async (studentId: string): Promise<ActiveClassWithDuration[]> => {
  try {
    const classes = await getStudentEnrolledClasses(studentId);
    return enhanceClassesWithDuration(classes);
  } catch (error) {
    console.error('Error in getStudentEnrolledClassesWithDuration:', error);
    throw error;
  }
};
