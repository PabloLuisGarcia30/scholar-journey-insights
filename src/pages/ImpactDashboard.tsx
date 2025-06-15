
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Clock, Target, Users, BookOpen, Award } from "lucide-react";

const ImpactDashboard = () => {
  // Mock data for demonstration - in a real app, this would come from your backend
  const timelineData = [
    {
      id: 1,
      date: "2 hours ago",
      student: "Sarah Johnson",
      action: "Mastered fractions",
      improvement: "+25% accuracy",
      type: "mastery"
    },
    {
      id: 2,
      date: "5 hours ago",
      student: "Michael Chen",
      action: "Completed algebra practice",
      improvement: "+15% speed",
      type: "practice"
    },
    {
      id: 3,
      date: "1 day ago",
      student: "Emma Williams",
      action: "Overcame geometry struggles",
      improvement: "From 45% to 82%",
      type: "breakthrough"
    },
    {
      id: 4,
      date: "2 days ago",
      student: "David Brown",
      action: "Consistent daily practice",
      improvement: "7-day streak",
      type: "consistency"
    },
    {
      id: 5,
      date: "3 days ago",
      student: "Lisa Garcia",
      action: "Word problems breakthrough",
      improvement: "+30% comprehension",
      type: "breakthrough"
    }
  ];

  const getIconForType = (type: string) => {
    switch (type) {
      case "mastery":
        return <Award className="h-4 w-4 text-yellow-600" />;
      case "practice":
        return <BookOpen className="h-4 w-4 text-blue-600" />;
      case "breakthrough":
        return <TrendingUp className="h-4 w-4 text-green-600" />;
      case "consistency":
        return <Target className="h-4 w-4 text-purple-600" />;
      default:
        return <Users className="h-4 w-4 text-gray-600" />;
    }
  };

  const getBadgeColor = (type: string) => {
    switch (type) {
      case "mastery":
        return "bg-yellow-100 text-yellow-800";
      case "practice":
        return "bg-blue-100 text-blue-800";
      case "breakthrough":
        return "bg-green-100 text-green-800";
      case "consistency":
        return "bg-purple-100 text-purple-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Your Impact Dashboard</h1>
          <p className="text-gray-600">Track your teaching effectiveness and student progress</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Clock className="h-6 w-6 text-blue-600" />
                <h2 className="text-xl font-semibold">Time Saved</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">12.4 hours</p>
              <p className="text-sm text-gray-500">in the last 30 days</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold">Feedback Impact</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">+18%</p>
              <p className="text-sm text-gray-500">average student score increase</p>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-3 mb-2">
                <Target className="h-6 w-6 text-purple-600" />
                <h2 className="text-xl font-semibold">Mastery Unlocked</h2>
              </div>
              <p className="text-3xl font-bold text-gray-900">7 skills</p>
              <p className="text-sm text-gray-500">in your class this week</p>
            </CardContent>
          </Card>
        </div>

        {/* Activity Timeline */}
        <Card className="bg-white shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              Student Growth Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {timelineData.map((item) => (
              <div key={item.id} className="flex items-start gap-4 p-4 rounded-lg bg-gray-50 hover:bg-gray-100 transition-colors">
                <div className="flex-shrink-0 mt-1">
                  {getIconForType(item.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{item.student}</p>
                    <Badge className={`text-xs ${getBadgeColor(item.type)} border-0`}>
                      {item.type}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-700 mb-1">{item.action}</p>
                  <p className="text-sm font-medium text-green-600">{item.improvement}</p>
                </div>
                <div className="flex-shrink-0 text-xs text-gray-500">
                  {item.date}
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Additional Insights */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-12">
          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Weekly Highlights</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <span className="text-sm font-medium">Most Improved Student</span>
                <span className="text-sm text-green-700">Emma Williams (+37%)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <span className="text-sm font-medium">Top Skill Mastered</span>
                <span className="text-sm text-blue-700">Fractions (5 students)</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                <span className="text-sm font-medium">Engagement Boost</span>
                <span className="text-sm text-purple-700">+22% participation</span>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white shadow-sm">
            <CardHeader>
              <CardTitle>Teaching Efficiency</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
                <span className="text-sm font-medium">Auto-Graded Tests</span>
                <span className="text-sm text-yellow-700">24 this week</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
                <span className="text-sm font-medium">Personalized Exercises</span>
                <span className="text-sm text-indigo-700">156 generated</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <span className="text-sm font-medium">Quick Interventions</span>
                <span className="text-sm text-red-700">8 students helped</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default ImpactDashboard;
