
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Users, Calendar, Settings, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export default function ClassRunner() {
  const { profile } = useAuth();

  // Fetch active classes for Mr. Cullen
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
            ClassRunner
          </h1>
          <p className="text-lg text-slate-600 mt-2">Manage and run your classes efficiently</p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Play className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Start Session</p>
                  <p className="text-lg font-semibold text-slate-900">Begin Class</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Attendance</p>
                  <p className="text-lg font-semibold text-slate-900">Take Roll</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Calendar className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Schedule</p>
                  <p className="text-lg font-semibold text-slate-900">View Calendar</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <Settings className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Settings</p>
                  <p className="text-lg font-semibold text-slate-900">Configure</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Active Classes */}
          <div className="lg:col-span-2">
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
                    {activeClasses.map((classItem, index) => (
                      <div key={classItem.id} className="p-4 rounded-lg border bg-white/50">
                        <div className="flex items-center justify-between mb-3">
                          <div>
                            <h3 className="font-semibold text-slate-900">{classItem.name}</h3>
                            <p className="text-sm text-slate-600">
                              {classItem.subject} • {classItem.grade}
                            </p>
                          </div>
                          <Button size="sm" variant={index === 0 ? "default" : "outline"}>
                            {index === 0 ? (
                              <>
                                <Play className="h-4 w-4 mr-2" />
                                Start
                              </>
                            ) : (
                              "Schedule"
                            )}
                          </Button>
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
          </div>

          {/* Quick Tools */}
          <div>
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
          </div>
        </div>
      </div>
    </div>
  );
}
