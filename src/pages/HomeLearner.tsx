
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, BookOpen, Target, BarChart3, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const HomeLearner = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

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
          {/* Recent Test Scores */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-purple-600" />
                Recent Test Scores
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <BarChart3 className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">View Your Test Results</h3>
                <p className="text-gray-600">Complete assessments to see your scores here.</p>
              </div>
            </CardContent>
          </Card>

          {/* Skill Progress */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-orange-600" />
                Skill Progress
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">Track Your Skills</h3>
                <p className="text-gray-600">Take assessments to monitor your skill development.</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Classes */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-indigo-600" />
              Your Classes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8">
              <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Access Your Classes</h3>
              <p className="text-gray-600">View your enrolled classes and progress here.</p>
            </div>
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
