
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { LayoutDashboard, GraduationCap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const StudentLanding = () => {
  const navigate = useNavigate();
  const { profile } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="container mx-auto px-4 py-12">
        {/* Header */}
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Welcome back, {profile?.full_name || 'Student'}!
          </h1>
          <p className="text-xl text-gray-600">
            Choose how you'd like to learn today
          </p>
        </div>

        {/* Two Card Options */}
        <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Dashboard Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-blue-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-blue-200 transition-colors">
                <LayoutDashboard className="h-8 w-8 text-blue-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                Dashboard
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                Access your traditional learning dashboard with assignments, progress tracking, and comprehensive study tools.
              </p>
              <Button 
                onClick={() => navigate('/student-dashboard/main')}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                Open Dashboard
              </Button>
            </CardContent>
          </Card>

          {/* HomeLearner Card */}
          <Card className="hover:shadow-lg transition-shadow cursor-pointer group">
            <CardHeader className="text-center pb-4">
              <div className="mx-auto mb-4 p-4 bg-green-100 rounded-full w-16 h-16 flex items-center justify-center group-hover:bg-green-200 transition-colors">
                <GraduationCap className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl font-bold text-gray-900">
                HomeLearner
              </CardTitle>
            </CardHeader>
            <CardContent className="text-center">
              <p className="text-gray-600 mb-6 leading-relaxed">
                Experience personalized learning with adaptive content, interactive lessons, and AI-powered study assistance.
              </p>
              <Button 
                onClick={() => navigate('/student-dashboard/home-learner')}
                className="w-full bg-green-600 hover:bg-green-700"
                size="lg"
              >
                Start Learning
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentLanding;
