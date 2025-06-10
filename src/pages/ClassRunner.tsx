
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Play, Users, Calendar, Settings, BookOpen, ArrowLeft, FileText, Activity } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { StartClassSession } from "@/components/StartClassSession";
import { LiveSessionMonitoring } from "@/components/LiveSessionMonitoring";
import { getActiveClassSessions } from "@/services/classSessionService";
import { useState } from "react";

export default function ClassRunner() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("classes");

  // Fetch active classes for the teacher
  const { data: activeClasses = [], isLoading } = useQuery({
    queryKey: ['activeClasses', profile?.full_name],
    queryFn: async () => {
      console.log('Fetching classes for teacher:', profile?.full_name);
      
      const { data, error } = await supabase
        .from('active_classes')
        .select('*')
        .eq('teacher', profile?.full_name || 'Mr. Cullen')
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching active classes:', error);
        throw error;
      }

      console.log('Found classes:', data);
      return data || [];
    },
    enabled: !!profile?.full_name,
  });

  // Fetch active sessions for monitoring
  const { data: activeSessions = [] } = useQuery({
    queryKey: ['activeSessions', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      return await getActiveClassSessions(profile.id);
    },
    enabled: !!profile?.id,
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const formatTime = (timeString: string) => {
    const date = new Date(`2024-01-01 ${timeString}`);
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  };

  const getNextClassTime = () => {
    // Simple logic to show next class - could be enhanced with real scheduling
    const now = new Date();
    const currentHour = now.getHours();
    
    if (currentHour < 10) return "10:30 AM";
    if (currentHour < 13) return "1:15 PM";
    if (currentHour < 14) return "2:45 PM";
    return "Tomorrow 10:30 AM";
  };

  const handlePlanClass = (classItem: any) => {
    console.log('Planning class:', classItem.name);
    navigate(`/lesson-planner?class=${encodeURIComponent(classItem.name)}&classId=${classItem.id}`);
  };

  const handleSessionStarted = (sessionId: string) => {
    // Switch to monitoring tab when a session is started
    setActiveTab("monitoring");
  };

  const mockStudents = [
    {
      studentId: "student-1",
      studentName: "Alice Johnson",
      skills: [
        { skill_name: "Algebra", score: 75 },
        { skill_name: "Geometry", score: 82 }
      ]
    },
    {
      studentId: "student-2", 
      studentName: "Bob Smith",
      skills: [
        { skill_name: "Algebra", score: 68 },
        { skill_name: "Statistics", score: 71 }
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Teacher Dashboard
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 via-lime-400 to-green-500 bg-clip-text text-transparent inline-block">
            ClassRunner
          </h1>
          <p className="text-lg text-slate-600 mt-2">Manage and run your classes efficiently</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="classes">Active Classes</TabsTrigger>
            <TabsTrigger value="monitoring" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Live Monitoring
              {activeSessions.length > 0 && (
                <span className="ml-1 px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                  {activeSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="tools">Quick Tools</TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Active Classes
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="p-4 rounded-lg border bg-white/50 animate-pulse">
                        <div className="h-4 bg-slate-200 rounded w-3/4 mb-2"></div>
                        <div className="h-3 bg-slate-200 rounded w-1/2 mb-3"></div>
                        <div className="h-3 bg-slate-200 rounded w-2/3"></div>
                      </div>
                    ))}
                  </div>
                ) : activeClasses.length > 0 ? (
                  <div className="space-y-4">
                    {activeClasses.map((classItem) => (
                      <div key={classItem.id} className="p-4 rounded-lg border bg-white/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{classItem.name}</h3>
                            <p className="text-sm text-slate-600">
                              {classItem.subject} • {classItem.grade}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button 
                              size="sm" 
                              variant="outline" 
                              onClick={() => handlePlanClass(classItem)}
                              className="flex items-center gap-2"
                            >
                              <FileText className="h-4 w-4" />
                              Plan
                            </Button>
                            <StartClassSession
                              classId={classItem.id}
                              className={classItem.name}
                              students={mockStudents}
                              onSessionStarted={handleSessionStarted}
                            />
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-slate-600">
                          <span>{classItem.student_count || 0} students</span>
                          <span>•</span>
                          <span>Next: {getNextClassTime()}</span>
                          {classItem.avg_gpa && (
                            <>
                              <span>•</span>
                              <span>Avg GPA: {Number(classItem.avg_gpa).toFixed(1)}</span>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-500">No active classes found for {profile?.full_name}</p>
                    <p className="text-sm text-slate-400 mt-2">
                      Classes will appear here once they are created and assigned to you.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Live Session Monitoring
                  {activeSessions.length > 0 && (
                    <span className="ml-2 px-2 py-1 text-xs bg-green-500 text-white rounded-full">
                      {activeSessions.length} active
                    </span>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <LiveSessionMonitoring showAllSessions={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle>Quick Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button variant="outline" className="w-full justify-start">
                  <Users className="h-4 w-4 mr-2" />
                  Student Roster
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Calendar className="h-4 w-4 mr-2" />
                  Lesson Plans
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <BookOpen className="h-4 w-4 mr-2" />
                  Assignments
                </Button>
                <Button variant="outline" className="w-full justify-start">
                  <Settings className="h-4 w-4 mr-2" />
                  Class Settings
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
