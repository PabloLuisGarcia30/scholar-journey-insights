
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { 
  BookOpen, 
  GraduationCap, 
  LineChart, 
  User, 
  TrendingUp, 
  Calendar, 
  Star,
  Clock,
  Target,
  Trophy,
  Brain,
  CheckCircle2,
  PlayCircle,
  BarChart3,
  Users,
  Award
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { TailoredExercises } from "@/components/TailoredExercises";
import { DashboardHeader } from "@/components/DashboardHeader";
import { useAuth } from "@/contexts/AuthContext";

interface StudentProfile {
  id: string;
  name: string;
  email?: string;
  major?: string;
  year?: string;
}

// Mock data for student dashboard
const mockProgressData = [
  { subject: "Mathematics", progress: 78, grade: "B+", recentScore: 85 },
  { subject: "Science", progress: 82, grade: "A-", recentScore: 88 },
  { subject: "English", progress: 74, grade: "B", recentScore: 79 },
  { subject: "History", progress: 89, grade: "A", recentScore: 92 },
];

const mockRecentActivities = [
  { title: "Algebra Practice Test", type: "assessment", score: 85, date: "2 days ago", status: "completed" },
  { title: "Chemistry Lab Report", type: "assignment", score: 92, date: "3 days ago", status: "completed" },
  { title: "Literature Essay", type: "assignment", score: 88, date: "5 days ago", status: "completed" },
  { title: "Physics Quiz", type: "assessment", score: 76, date: "1 week ago", status: "completed" },
];

const mockUpcomingTasks = [
  { title: "Biology Test", type: "test", dueDate: "Tomorrow", priority: "high" },
  { title: "Math Homework", type: "homework", dueDate: "In 2 days", priority: "medium" },
  { title: "History Project", type: "project", dueDate: "Next week", priority: "low" },
];

const mockLearningGoals = [
  { goal: "Master Quadratic Equations", progress: 65, target: "End of month" },
  { goal: "Improve Essay Writing", progress: 45, target: "Next quarter" },
  { goal: "Chemistry Formulas", progress: 80, target: "This week" },
];

export default function StudentDashboard() {
  const { user, loading } = useAuth();

  const { data: studentProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['studentProfile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      
      // Try to get from active_students first
      const { data: activeStudent } = await supabase
        .from('active_students')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (activeStudent) {
        return {
          id: activeStudent.id,
          name: activeStudent.name,
          email: activeStudent.email,
          major: activeStudent.major,
          year: activeStudent.year
        };
      }

      // Fallback to user email if no profile found
      return {
        id: user.id,
        name: user.email?.split('@')[0] || 'Student',
        email: user.email,
        major: 'Unknown',
        year: 'Unknown'
      };
    },
    enabled: !!user?.id,
  });

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <User className="h-16 w-16 text-slate-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Access Required</h2>
          <p className="text-slate-600 mb-6">Please log in to access your student dashboard.</p>
          <Button onClick={() => window.location.href = '/auth'} className="bg-blue-600 hover:bg-blue-700">
            Go to Login
          </Button>
        </div>
      </div>
    );
  }

  const overallGPA = mockProgressData.reduce((sum, subject) => sum + subject.progress, 0) / mockProgressData.length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <DashboardHeader 
          title="Student Dashboard" 
          subtitle={`Welcome back, ${studentProfile?.name || 'Student'}!`}
        />

        {/* Welcome Section with Key Stats */}
        <div className="mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {/* Student Profile Card */}
            <Card className="md:col-span-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white border-0">
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16 ring-4 ring-white/20">
                    <AvatarFallback className="bg-white/20 text-white text-lg font-bold">
                      {studentProfile?.name?.split(' ').map(n => n[0]).join('') || 'S'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h2 className="text-2xl font-bold">{studentProfile?.name || 'Student'}</h2>
                    <p className="text-blue-100">{studentProfile?.email}</p>
                    <div className="flex gap-2 mt-2">
                      {studentProfile?.year && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          {studentProfile.year}
                        </Badge>
                      )}
                      {studentProfile?.major && (
                        <Badge variant="secondary" className="bg-white/20 text-white border-0">
                          {studentProfile.major}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardContent className="p-6 text-center">
                <Trophy className="h-8 w-8 text-yellow-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-800">{overallGPA.toFixed(1)}%</div>
                <div className="text-sm text-slate-600">Overall Progress</div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6 text-center">
                <Target className="h-8 w-8 text-green-500 mx-auto mb-2" />
                <div className="text-2xl font-bold text-slate-800">{mockRecentActivities.length}</div>
                <div className="text-sm text-slate-600">Completed Tasks</div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="exercises">Practice</TabsTrigger>
            <TabsTrigger value="progress">Progress</TabsTrigger>
            <TabsTrigger value="goals">Goals</TabsTrigger>
            <TabsTrigger value="profile">Profile</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Subject Progress */}
              <Card className="lg:col-span-2">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BarChart3 className="h-5 w-5" />
                    Subject Progress
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {mockProgressData.map((subject, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                          <span className="font-medium">{subject.subject}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{subject.grade}</Badge>
                          <span className="text-sm text-slate-600">{subject.progress}%</span>
                        </div>
                      </div>
                      <Progress value={subject.progress} className="h-2" />
                    </div>
                  ))}
                </CardContent>
              </Card>

              {/* Upcoming Tasks */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    Upcoming Tasks
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {mockUpcomingTasks.map((task, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                      <div>
                        <h4 className="font-medium text-sm">{task.title}</h4>
                        <p className="text-xs text-slate-600">{task.dueDate}</p>
                      </div>
                      <Badge 
                        variant={task.priority === 'high' ? 'destructive' : 
                               task.priority === 'medium' ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {task.priority}
                      </Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </div>

            {/* Recent Activities */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activities
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockRecentActivities.map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                          <CheckCircle2 className="h-5 w-5 text-green-600" />
                        </div>
                        <div>
                          <h4 className="font-medium">{activity.title}</h4>
                          <p className="text-sm text-slate-600 capitalize">{activity.type} • {activity.date}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">{activity.score}%</div>
                        <Badge variant="outline" className="text-xs">
                          {activity.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="exercises">
            <TailoredExercises />
          </TabsContent>

          <TabsContent value="progress">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Academic Performance
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {mockProgressData.map((subject, index) => (
                      <div key={index} className="space-y-3">
                        <div className="flex items-center justify-between">
                          <h4 className="font-medium">{subject.subject}</h4>
                          <span className="text-2xl font-bold text-slate-800">{subject.grade}</span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-slate-600">Overall Progress</span>
                            <div className="font-medium">{subject.progress}%</div>
                          </div>
                          <div>
                            <span className="text-slate-600">Recent Score</span>
                            <div className="font-medium">{subject.recentScore}%</div>
                          </div>
                        </div>
                        <Progress value={subject.progress} className="h-3" />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Award className="h-5 w-5" />
                    Achievements
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-lg">
                      <Trophy className="h-8 w-8 text-yellow-500" />
                      <div>
                        <h4 className="font-medium">Honor Roll</h4>
                        <p className="text-sm text-slate-600">Maintained 85%+ average</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                      <Star className="h-8 w-8 text-blue-500" />
                      <div>
                        <h4 className="font-medium">Perfect Attendance</h4>
                        <p className="text-sm text-slate-600">No missed classes this month</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                      <Brain className="h-8 w-8 text-green-500" />
                      <div>
                        <h4 className="font-medium">Quick Learner</h4>
                        <p className="text-sm text-slate-600">Completed 15 practice tests</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="goals">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Learning Goals
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {mockLearningGoals.map((goal, index) => (
                  <div key={index} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium">{goal.goal}</h4>
                      <span className="text-sm text-slate-600">Target: {goal.target}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Progress value={goal.progress} className="flex-1 h-3" />
                      <span className="text-sm font-medium w-12">{goal.progress}%</span>
                    </div>
                  </div>
                ))}
                
                <Button className="w-full mt-4" variant="outline">
                  <Target className="h-4 w-4 mr-2" />
                  Set New Goal
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5" />
                  Student Profile
                </CardTitle>
              </CardHeader>
              <CardContent>
                {profileLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <label className="text-sm font-medium text-slate-700">Full Name</label>
                        <p className="text-lg font-medium">{studentProfile?.name || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Email</label>
                        <p className="text-lg font-medium">{studentProfile?.email || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Academic Year</label>
                        <p className="text-lg font-medium">{studentProfile?.year || 'Not set'}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-slate-700">Major</label>
                        <p className="text-lg font-medium">{studentProfile?.major || 'Not set'}</p>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h3 className="text-lg font-semibold mb-4">Academic Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <div className="text-2xl font-bold text-blue-600">{overallGPA.toFixed(1)}%</div>
                          <div className="text-sm text-slate-600">Overall Average</div>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <div className="text-2xl font-bold text-green-600">{mockRecentActivities.length}</div>
                          <div className="text-sm text-slate-600">Completed Assessments</div>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <div className="text-2xl font-bold text-purple-600">{mockProgressData.length}</div>
                          <div className="text-sm text-slate-600">Active Subjects</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
