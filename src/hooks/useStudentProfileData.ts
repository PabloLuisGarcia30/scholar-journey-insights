
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
  linkClassToSubjectSkills
} from "@/services/examService";
import { mockBettyContentSkillScores } from "@/data/mockStudentData";

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

  const isBettyJohnson = student?.name === 'Betty Johnson';

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

  // Fetch test results
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['studentTestResults', studentId],
    queryFn: () => getStudentTestResults(studentId),
  });

  // Fetch content skill scores - use mock data for Betty Johnson in ANY Grade 10 Math context
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['studentContentSkills', studentId, classId],
    queryFn: () => {
      console.log('Fetching content skills for:', { 
        studentName: student?.name, 
        isBetty: isBettyJohnson, 
        isClassView, 
        isGrade10Math: isGrade10MathClass(),
        classId,
        className,
        classSubject: classData?.subject,
        classGrade: classData?.grade
      });
      
      // Use mock data for Betty Johnson in any Grade 10 Math class context
      if (isBettyJohnson && classData && classData.subject === 'Math' && classData.grade === 'Grade 10') {
        console.log('Using mock data for Betty Johnson in Grade 10 Math');
        return Promise.resolve(mockBettyContentSkillScores);
      }
      return getStudentContentSkillScores(studentId);
    },
    enabled: !!student, // Wait for student data to load first
  });

  // Fetch subject skill scores
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['studentSubjectSkills', studentId],
    queryFn: () => getStudentSubjectSkillScores(studentId),
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

  // Auto-link Grade 10 Math classes to their skills when class data loads
  useEffect(() => {
    const autoLinkSkills = async () => {
      if (isGrade10MathClass() && classId) {
        try {
          console.log('Auto-linking Grade 10 Math class to Grade 10 Math skills');
          
          // Link Content-Specific Skills
          const allContentSkills = await getContentSkillsBySubjectAndGrade('Math', 'Grade 10');
          const contentSkillIds = allContentSkills.map(skill => skill.id);
          await linkClassToContentSkills(classId, contentSkillIds);
          console.log(`Successfully linked class to ${contentSkillIds.length} Grade 10 Math content skills`);
          
          // Link Subject-Specific Skills
          const allSubjectSkills = await getSubjectSkillsBySubjectAndGrade('Math', 'Grade 10');
          const subjectSkillIds = allSubjectSkills.map(skill => skill.id);
          await linkClassToSubjectSkills(classId, subjectSkillIds);
          console.log(`Successfully linked class to ${subjectSkillIds.length} Grade 10 Math subject skills`);
          
          // Trigger refetch of both skill types
          if (classContentSkillsRefetch) {
            classContentSkillsRefetch();
          }
          if (classSubjectSkillsRefetch) {
            classSubjectSkillsRefetch();
          }
        } catch (error) {
          console.error('Failed to auto-link Grade 10 Math skills:', error);
        }
      }
    };

    if (classData) {
      autoLinkSkills();
    }
  }, [classData, classId]);

  return {
    student,
    studentLoading,
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
    isBettyJohnson,
    isClassView,
    isGrade10MathClass
  };
}
