
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, BookOpen, GraduationCap, Target } from "lucide-react";
import { useAuthenticatedStudentData } from "@/hooks/useAuthenticatedStudentData";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";

interface StudentProfileProps {
  studentId: string;
  classId: string;
  className: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const { user, profile } = useAuth();
  
  // Determine if this is for the current authenticated user
  const isCurrentUser = user?.id === studentId;
  
  // Use authenticated data hook
  const {
    classData,
    classLoading,
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    enrolledClasses,
    enrolledClassesLoading,
    isAuthenticated,
    isLoading,
    hasData
  } = useAuthenticatedStudentData({ classId });

  // Create student object from authenticated data
  const student = isCurrentUser && profile ? {
    id: user.id,
    name: profile.full_name || user.email || 'Current User',
    email: user.email,
    year: null,
    major: null,
    gpa: null,
    created_at: profile.created_at,
    updated_at: profile.updated_at
  } : null;

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Authentication Required</h2>
        <p className="text-gray-600">Please log in to view profile data.</p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  if (isLoading || classLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-2 gap-4">
            {[...Array(2)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-48 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!student || !classData) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-2xl font-semibold text-gray-900">Profile Not Available</h2>
        <p className="text-gray-600">
          {!isCurrentUser 
            ? 'You can only view your own profile.' 
            : 'Could not retrieve profile or class data.'
          }
        </p>
        <Button onClick={onBack} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="p-6 space-y-6">
      {/* Back Button */}
      <Button onClick={onBack} variant="ghost" className="mb-4">
        &larr; Back to Dashboard
      </Button>

      {/* Header */}
      <div className="flex items-center gap-6">
        <Avatar className="h-16 w-16">
          <AvatarFallback>{student.name.split(' ').map(n => n[0]).join('')}</AvatarFallback>
        </Avatar>
        <div>
          <h2 className="text-3xl font-bold text-gray-900">{student.name}</h2>
          <p className="text-gray-600">{classData.name} - {classData.subject}</p>
          {isCurrentUser && (
            <Badge className="mt-2 bg-blue-100 text-blue-800 border-0">
              Your Profile
            </Badge>
          )}
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{testResults.length}</div>
            <div className="text-sm text-gray-600">Tests Taken</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <Target className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{contentSkillScores.length + subjectSkillScores.length}</div>
            <div className="text-sm text-gray-600">Skills Tracked</div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4 text-center">
            <GraduationCap className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{enrolledClasses.length}</div>
            <div className="text-sm text-gray-600">Enrolled Classes</div>
          </CardContent>
        </Card>
      </div>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Test Results</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {testResults.length > 0 ? (
            testResults.slice(0, 3).map((test, index) => (
              <div key={test.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">Test {index + 1}</h3>
                  <Badge className="bg-blue-100 text-blue-700">
                    Score: {Math.round(test.overall_score)}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Taken: {formatDate(test.created_at)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Points: {test.total_points_earned}/{test.total_points_possible}
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test results found</h3>
              <p className="text-gray-600">Take some tests to see your results here.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Content Skill Scores */}
      <Card>
        <CardHeader>
          <CardTitle>Content Skill Scores</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {contentSkillScores.length > 0 ? (
            contentSkillScores.slice(0, 5).map((skill, index) => (
              <div key={skill.id || index} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{skill.skill_name}</h3>
                  <Badge className="bg-green-100 text-green-700">
                    Score: {skill.score}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {skill.points_earned} out of {skill.points_possible} points earned
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content skills found</h3>
              <p className="text-gray-600">
                Complete some assessments to see your skill scores here.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Skill Scores */}
      {subjectSkillScores.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Subject Skill Scores</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectSkillScores.slice(0, 5).map((skill, index) => (
              <div key={skill.id || index} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{skill.skill_name}</h3>
                  <Badge className="bg-purple-100 text-purple-700">
                    Score: {skill.score}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {skill.points_earned} out of {skill.points_possible} points earned
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
