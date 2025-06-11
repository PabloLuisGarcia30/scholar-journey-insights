
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Target, Trophy, Clock, BarChart3, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { getGradeColor } from "@/utils/studentProfileUtils";

const HomeLearner = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();
  
  // Get student data for scores display
  const { 
    testResults, 
    testResultsLoading, 
    contentSkillScores, 
    contentSkillsLoading,
    enrolledClasses,
    enrolledClassesLoading 
  } = useStudentProfileData({ 
    studentId: profile?.id || '', 
    classId: '', 
    className: '' 
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header with back button */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate('/student-dashboard')}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Options
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">HomeLearner</h1>
          <div></div>
        </div>

        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold bg-gradient-to-r from-green-600 to-blue-600 bg-clip-text text-transparent mb-4">
            Your Personalized Learning Journey
          </h2>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto">
            Welcome to a new way of learning, {profile?.full_name || 'Student'}. 
            Let's make your education adaptive, engaging, and effective.
          </p>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">12</div>
              <div className="text-sm text-gray-600">Lessons Completed</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">85%</div>
              <div className="text-sm text-gray-600">Learning Goals</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">7</div>
              <div className="text-sm text-gray-600">Achievements</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Clock className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">2.5h</div>
              <div className="text-sm text-gray-600">Study Time Today</div>
            </CardContent>
          </Card>
        </div>

        {/* Main Learning Area */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Continue Learning */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-green-600" />
                Continue Learning
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-green-800 mb-2">Mathematics: Algebra Basics</h3>
                  <p className="text-green-600 text-sm mb-3">Continue where you left off</p>
                  <div className="w-full bg-green-200 rounded-full h-2 mb-3">
                    <div className="bg-green-600 h-2 rounded-full w-3/4"></div>
                  </div>
                  <Button className="w-full bg-green-600 hover:bg-green-700">
                    Continue Lesson
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Recommended For You */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="h-5 w-5 text-blue-600" />
                Recommended For You
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <h4 className="font-medium">Practice Quiz: Fractions</h4>
                  <p className="text-sm text-gray-600">Based on your recent progress</p>
                </div>
                <div className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <h4 className="font-medium">Video: Advanced Problem Solving</h4>
                  <p className="text-sm text-gray-600">Strengthen your skills</p>
                </div>
                <div className="p-3 border rounded-lg hover:bg-blue-50 cursor-pointer transition-colors">
                  <h4 className="font-medium">Interactive Exercise: Geometry</h4>
                  <p className="text-sm text-gray-600">New topic to explore</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Academic Performance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
          {/* Test Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Recent Test Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              {testResultsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : testResults.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {testResults.slice(0, 5).map((result, index) => (
                    <div key={result.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                      <div>
                        <h4 className="font-semibold text-gray-900">Test {index + 1}</h4>
                        <p className="text-sm text-gray-600">
                          {new Date(result.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={getGradeColor(result.overall_score)}>
                          {Math.round(result.overall_score)}%
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">
                          {result.total_points_earned}/{result.total_points_possible} pts
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No test results yet</h3>
                  <p className="text-gray-600">Complete some assessments to see your scores here.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Content Skill Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Skill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              {contentSkillsLoading ? (
                <div className="animate-pulse space-y-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="h-16 bg-gray-200 rounded"></div>
                  ))}
                </div>
              ) : contentSkillScores.length > 0 ? (
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {contentSkillScores.slice(0, 5).map((skill, index) => (
                    <div key={skill.id || index} className="p-3 rounded-lg border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-semibold text-gray-900 text-sm">{skill.skill_name}</h4>
                        <Badge className={getGradeColor(skill.score)}>
                          {skill.score}%
                        </Badge>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-orange-600 h-2 rounded-full transition-all duration-500"
                          style={{ width: `${skill.score}%` }}
                        ></div>
                      </div>
                      <p className="text-xs text-gray-600 mt-1">
                        {skill.points_earned}/{skill.points_possible} points
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No skill data yet</h3>
                  <p className="text-gray-600">Take some assessments to track your skill progress.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Enrolled Classes Overview */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Your Classes ({enrolledClasses.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {enrolledClassesLoading ? (
              <div className="animate-pulse grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-24 bg-gray-200 rounded"></div>
                ))}
              </div>
            ) : enrolledClasses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {enrolledClasses.map((classItem) => (
                  <div key={classItem.id} className="p-4 border rounded-lg hover:bg-indigo-50 transition-colors">
                    <h4 className="font-semibold text-indigo-900">{classItem.name}</h4>
                    <p className="text-sm text-indigo-600">{classItem.subject} - {classItem.grade}</p>
                    <p className="text-xs text-gray-600 mt-1">Teacher: {classItem.teacher}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No enrolled classes</h3>
                <p className="text-gray-600">Contact your teacher to get enrolled in classes.</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Coming Soon Notice */}
        <div className="text-center">
          <Card className="max-w-2xl mx-auto bg-gradient-to-r from-blue-50 to-green-50">
            <CardContent className="p-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                More Features Coming Soon!
              </h3>
              <p className="text-gray-600">
                We're working on exciting new features like AI tutoring, adaptive learning paths, 
                gamified challenges, and personalized study plans. Stay tuned!
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default HomeLearner;
