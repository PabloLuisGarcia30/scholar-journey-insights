
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, TrendingUp, BookOpen } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useSkillData } from "@/hooks/useSkillData";
import { getGradeColor } from "@/utils/studentProfileUtils";

const StudentClassScores = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { profile } = useAuth();
  
  // Get student data with class context
  const { 
    contentSkillScores, 
    contentSkillsLoading,
    classData,
    classLoading,
    enrolledClasses,
    classContentSkills,
    subjectSkillScores,
    classSubjectSkills
  } = useStudentProfileData({ 
    studentId: profile?.id || '', 
    classId: classId || '',
    className: ''
  });

  // Find the class info from enrolled classes
  const currentClass = enrolledClasses.find(cls => cls.id === classId) || classData;

  // Helper functions for grade checking
  const isGrade10MathClass = () => {
    return currentClass?.subject === 'Math' && currentClass?.grade === 'Grade 10';
  };

  const isGrade10ScienceClass = () => {
    return currentClass?.subject === 'Science' && currentClass?.grade === 'Grade 10';
  };

  // Use skill data hook to get grouped skills
  const { groupedSkills } = useSkillData({
    contentSkillScores,
    subjectSkillScores,
    classContentSkills,
    classSubjectSkills,
    isClassView: true,
    isGrade10MathClass,
    isGrade10ScienceClass
  });

  if (classLoading || !currentClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600 ml-4">Loading class data...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/student-dashboard/home-learner')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to HomeLearner
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">{currentClass.name}</h1>
            <p className="text-gray-600">{currentClass.subject} - {currentClass.grade}</p>
          </div>
          <div></div>
        </div>

        {/* Class Info Card */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Class Information
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <h4 className="font-semibold text-gray-900">Subject</h4>
                <p className="text-gray-600">{currentClass.subject}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Grade Level</h4>
                <p className="text-gray-600">{currentClass.grade}</p>
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Teacher</h4>
                <p className="text-gray-600">{currentClass.teacher}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Content Skills by Topic */}
        {contentSkillsLoading ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Your Content Skills Progress ({currentClass.name})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="animate-pulse space-y-6">
                {[...Array(3)].map((_, i) => (
                  <div key={i}>
                    <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {[...Array(4)].map((_, j) => (
                        <div key={j} className="h-20 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ) : Object.keys(groupedSkills).length > 0 ? (
          <div className="space-y-8">
            {Object.entries(groupedSkills).map(([topic, skills]) => (
              <Card key={topic}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-orange-600" />
                    {topic}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {skills.map((skill, index) => (
                      <div key={skill.id || index} className="p-4 rounded-lg border border-gray-100 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="font-semibold text-gray-900 text-sm">{skill.skill_name}</h4>
                          <Badge className={getGradeColor(skill.score)}>
                            {skill.score}%
                          </Badge>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3 mb-2">
                          <div 
                            className="bg-orange-600 h-3 rounded-full transition-all duration-500"
                            style={{ width: `${skill.score}%` }}
                          ></div>
                        </div>
                        <div className="flex justify-between text-sm text-gray-600">
                          <span>{skill.points_earned}/{skill.points_possible} points earned</span>
                          <span>{skill.score >= 80 ? 'Proficient' : skill.score >= 60 ? 'Developing' : 'Needs Practice'}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Your Content Skills Progress ({currentClass.name})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No skill progress yet</h3>
                <p className="text-gray-600">Complete assessments in this class to see your content skill progress.</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default StudentClassScores;
