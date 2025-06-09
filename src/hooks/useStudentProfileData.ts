import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { 
  getActiveStudentById, 
  getStudentTestResults, 
  getStudentContentSkillScores, 
  getStudentSubjectSkillScores,
  getActiveClassById,
  getLinkedContentSkillsForClass,
  getLinkedSubjectSkillsForClass,
  getContentSkillsBySubjectAndGrade,
  getSubjectSkillsBySubjectAndGrade,
  linkClassToContentSkills,
  linkClassToSubjectSkills,
  getStudentEnrolledClasses
} from "@/services/examService";
import { mockPabloContentSkillScores } from "@/data/mockStudentData";
import { supabase } from "@/integrations/supabase/client";

interface UseStudentProfileDataProps {
  studentId: string;
  classId?: string;
  className?: string;
}

export function useStudentProfileData({ studentId, classId, className }: UseStudentProfileDataProps) {
  const isClassView = Boolean(classId && className);

  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['activeStudent', studentId],
    queryFn: () => getActiveStudentById(studentId),
  });

  // 🆕 ENHANCED: Also fetch student profile to link active_students with student_profiles
  const { data: studentProfile, isLoading: studentProfileLoading } = useQuery({
    queryKey: ['studentProfile', student?.name],
    queryFn: async () => {
      if (!student?.name) return null;
      console.log('🔗 Looking up student profile for:', student.name);
      
      const { data, error } = await supabase
        .from('student_profiles')
        .select('*')
        .eq('student_name', student.name)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching student profile:', error);
        return null;
      }

      if (data) {
        console.log('✅ Found student profile:', data.id, 'for', student.name);
      } else {
        console.log('⚠️ No student profile found for:', student.name);
      }

      return data;
    },
    enabled: !!student?.name,
  });

  const isPabloLuisGarcia = student?.name === 'Pablo Luis Garcia';

  // Fetch class data if in class view
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => classId ? getActiveClassById(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // Helper function to check if this is a Grade 10 Math class
  const isGrade10MathClass = () => {
    return classData && classData.subject === 'Math' && classData.grade === 'Grade 10';
  };

  // Helper function to check if this is a Grade 10 Science class
  const isGrade10ScienceClass = () => {
    return classData && classData.subject === 'Science' && classData.grade === 'Grade 10';
  };

  // 🆕 ENHANCED: Fetch test results using student profile ID when available
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['studentTestResults', studentProfile?.id, studentId],
    queryFn: async () => {
      // Try student profile ID first (for newly processed tests)
      if (studentProfile?.id) {
        console.log('📊 Fetching test results using student profile ID:', studentProfile.id);
        try {
          const profileResults = await getStudentTestResults(studentProfile.id);
          if (profileResults.length > 0) {
            console.log(`✅ Found ${profileResults.length} test results via student profile`);
            return profileResults;
          }
        } catch (error) {
          console.warn('Failed to fetch via student profile, trying active student ID:', error);
        }
      }
      
      // Fallback to active student ID
      console.log('📊 Fetching test results using active student ID:', studentId);
      return getStudentTestResults(studentId);
    },
    enabled: !!(studentProfile?.id || studentId),
  });

  // 🆕 ENHANCED: Fetch content skill scores using the correct student identifier
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['studentContentSkills', studentProfile?.id, studentId, classId],
    queryFn: async () => {
      console.log('Fetching content skills for:', { 
        studentName: student?.name, 
        isPablo: isPabloLuisGarcia, 
        isClassView, 
        isGrade10Math: isGrade10MathClass(),
        isGrade10Science: isGrade10ScienceClass(),
        classId,
        className,
        classSubject: classData?.subject,
        classGrade: classData?.grade,
        studentProfileId: studentProfile?.id
      });
      
      // Use mock data for Pablo Luis Garcia in any Grade 10 Math class context
      if (isPabloLuisGarcia && classData && classData.subject === 'Math' && classData.grade === 'Grade 10') {
        console.log('Using mock data for Pablo Luis Garcia in Grade 10 Math');
        return Promise.resolve(mockPabloContentSkillScores);
      }
      
      // Try student profile ID first, then fallback to active student ID
      const searchId = studentProfile?.id || studentId;
      return getStudentContentSkillScores(searchId);
    },
    enabled: !!student, // Wait for student data to load first
    staleTime: isPabloLuisGarcia && classData && classData.subject === 'Math' && classData.grade === 'Grade 10' 
      ? 24 * 60 * 60 * 1000 // 24 hours cache for Pablo's mock data
      : 0, // No cache for regular data
  });

  // 🆕 ENHANCED: Fetch subject skill scores using the correct student identifier
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['studentSubjectSkills', studentProfile?.id, studentId],
    queryFn: async () => {
      const searchId = studentProfile?.id || studentId;
      console.log('📈 Fetching subject skills using ID:', searchId);
      return getStudentSubjectSkillScores(searchId);
    },
    enabled: !!(studentProfile?.id || studentId),
  });

  // Fetch content skills for the class to show complete skill set
  const { data: classContentSkills = [], isLoading: classContentSkillsLoading, refetch: classContentSkillsRefetch } = useQuery({
    queryKey: ['classLinkedContentSkills', classId],
    queryFn: () => classId ? getLinkedContentSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && isClassView,
  });

  // Fetch subject skills for the class to show complete skill set
  const { data: classSubjectSkills = [], isLoading: classSubjectSkillsLoading, refetch: classSubjectSkillsRefetch } = useQuery({
    queryKey: ['classLinkedSubjectSkills', classId],
    queryFn: () => classId ? getLinkedSubjectSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && isClassView,
  });

  // Auto-link Grade 10 Math or Science classes to their skills when class data loads
  useEffect(() => {
    const autoLinkSkills = async () => {
      if ((isGrade10MathClass() || isGrade10ScienceClass()) && classId) {
        try {
          console.log(`Auto-linking Grade 10 ${classData?.subject} class to Grade 10 ${classData?.subject} skills`);
          
          // Link Content-Specific Skills
          const allContentSkills = await getContentSkillsBySubjectAndGrade(classData?.subject || '', classData?.grade || '');
          const contentSkillIds = allContentSkills.map(skill => skill.id);
          await linkClassToContentSkills(classId, contentSkillIds);
          console.log(`Successfully linked class to ${contentSkillIds.length} Grade 10 ${classData?.subject} content skills`);
          
          // Link Subject-Specific Skills
          const allSubjectSkills = await getSubjectSkillsBySubjectAndGrade(classData?.subject || '', classData?.grade || '');
          const subjectSkillIds = allSubjectSkills.map(skill => skill.id);
          await linkClassToSubjectSkills(classId, subjectSkillIds);
          console.log(`Successfully linked class to ${subjectSkillIds.length} Grade 10 ${classData?.subject} subject skills`);
          
          // Trigger refetch of both skill types
          if (classContentSkillsRefetch) {
            classContentSkillsRefetch();
          }
          if (classSubjectSkillsRefetch) {
            classSubjectSkillsRefetch();
          }
        } catch (error) {
          console.error(`Failed to auto-link Grade 10 ${classData?.subject} skills:`, error);
        }
      }
    };

    if (classData) {
      autoLinkSkills();
    }
  }, [classData, classId]);

  // 🆕 NEW: Fetch enrolled classes for the student
  const { data: enrolledClasses = [], isLoading: enrolledClassesLoading } = useQuery({
    queryKey: ['studentEnrolledClasses', studentId],
    queryFn: () => getStudentEnrolledClasses(studentId),
    enabled: !!studentId,
  });

  console.log('🔄 useStudentProfileData summary:', {
    studentId,
    studentName: student?.name,
    studentProfileId: studentProfile?.id,
    testResultsCount: testResults.length,
    contentSkillScoresCount: contentSkillScores.length,
    subjectSkillScoresCount: subjectSkillScores.length,
    enrolledClassesCount: enrolledClasses.length,
    classId,
    className
  });

  return {
    student,
    studentLoading: studentLoading || studentProfileLoading,
    studentProfile,
    classData,
    classLoading,
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    classContentSkills,
    classContentSkillsLoading,
    classSubjectSkills,
    classSubjectSkillsLoading,
    enrolledClasses,
    enrolledClassesLoading,
    isPabloLuisGarcia,
    isClassView,
    isGrade10MathClass,
    isGrade10ScienceClass
  };
}
