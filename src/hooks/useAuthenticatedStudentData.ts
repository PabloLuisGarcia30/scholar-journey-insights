
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { AuthenticatedStudentService } from "@/services/authenticatedStudentService";
import { getActiveClassById } from "@/services/examService";

interface UseAuthenticatedStudentDataProps {
  classId?: string;
}

/**
 * Hook for fetching student data using authenticated user IDs
 * This is part of Phase 3 migration - replaces useStudentProfileData for authenticated users
 */
export function useAuthenticatedStudentData({ classId }: UseAuthenticatedStudentDataProps = {}) {
  const { user, profile } = useAuth();
  const authenticatedUserId = user?.id;

  // Fetch class data if classId is provided
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => classId ? getActiveClassById(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // Fetch content skill scores using authenticated user ID
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['authenticatedUserContentSkills', authenticatedUserId],
    queryFn: () => authenticatedUserId ? AuthenticatedStudentService.getContentSkillScores(authenticatedUserId) : Promise.resolve([]),
    enabled: !!authenticatedUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch subject skill scores using authenticated user ID
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['authenticatedUserSubjectSkills', authenticatedUserId],
    queryFn: () => authenticatedUserId ? AuthenticatedStudentService.getSubjectSkillScores(authenticatedUserId) : Promise.resolve([]),
    enabled: !!authenticatedUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch test results using authenticated user ID
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['authenticatedUserTestResults', authenticatedUserId],
    queryFn: () => authenticatedUserId ? AuthenticatedStudentService.getTestResults(authenticatedUserId) : Promise.resolve([]),
    enabled: !!authenticatedUserId,
    staleTime: 5 * 60 * 1000, // 5 minutes cache
  });

  // Fetch enrolled classes using authenticated user ID
  const { data: enrolledClasses = [], isLoading: enrolledClassesLoading } = useQuery({
    queryKey: ['authenticatedUserEnrolledClasses', authenticatedUserId],
    queryFn: () => authenticatedUserId ? AuthenticatedStudentService.getEnrolledClasses(authenticatedUserId) : Promise.resolve([]),
    enabled: !!authenticatedUserId,
    staleTime: 10 * 60 * 1000, // 10 minutes cache for classes
  });

  console.log('🔄 useAuthenticatedStudentData summary:', {
    authenticatedUserId,
    userEmail: user?.email,
    profileName: profile?.full_name,
    testResultsCount: testResults.length,
    contentSkillScoresCount: contentSkillScores.length,
    subjectSkillScoresCount: subjectSkillScores.length,
    enrolledClassesCount: enrolledClasses.length,
    classId,
    className: classData?.name,
    isAuthenticated: !!authenticatedUserId
  });

  return {
    // User data
    user,
    profile,
    authenticatedUserId,
    
    // Class data
    classData,
    classLoading,
    
    // Student data
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    enrolledClasses,
    enrolledClassesLoading,
    
    // Utility flags
    isAuthenticated: !!authenticatedUserId,
    isLoading: contentSkillsLoading || subjectSkillsLoading || testResultsLoading || (classId ? classLoading : false),
    hasData: contentSkillScores.length > 0 || subjectSkillScores.length > 0 || testResults.length > 0
  };
}
