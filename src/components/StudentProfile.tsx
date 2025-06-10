import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Calendar, Clock, BookOpen, GraduationCap, Target } from "lucide-react";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { Button } from "@/components/ui/button";

interface StudentProfileProps {
  studentId: string;
  classId: string;
  className: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const {
    student,
    studentLoading,
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
    hasMockData
  } = useStudentProfileData({ studentId, classId, className });

  if (studentLoading || classLoading) {
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
        <h2 className="text-2xl font-semibold text-gray-900">Error Loading Profile</h2>
        <p className="text-gray-600">Could not retrieve student or class data.</p>
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

  const showMockDataBadge = isPabloLuisGarcia && hasMockData();

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
        </div>
        {showMockDataBadge && (
          <Badge className="ml-auto bg-yellow-100 text-yellow-800 border-0">
            Using Mock Data
          </Badge>
        )}
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
            <div className="text-2xl font-bold">{contentSkillScores.length}</div>
            <div className="text-sm text-gray-600">Content Skills</div>
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
            testResults.slice(0, 3).map((test) => (
              <div key={test.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{test.test_name}</h3>
                  <Badge className="bg-blue-100 text-blue-700">
                    Score: {test.score}%
                  </Badge>
                </div>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    Taken: {formatDate(test.date_taken)}
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    Time: {test.time_taken} minutes
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No test results found</h3>
              <p className="text-gray-600">This student hasn't taken any tests yet.</p>
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
            contentSkillScores.slice(0, 5).map((skill) => (
              <div key={skill.id} className="p-4 rounded-lg border">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="font-semibold">{skill.skill_name}</h3>
                  <Badge className="bg-green-100 text-green-700">
                    Score: {skill.score}%
                  </Badge>
                </div>
                <p className="text-sm text-gray-600">
                  {skill.skill_description}
                </p>
              </div>
            ))
          ) : (
            <div className="text-center py-8">
              <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No content skills found</h3>
              <p className="text-gray-600">
                This student doesn't have any content skill scores yet.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
