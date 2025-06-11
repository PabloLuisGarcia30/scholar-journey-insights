import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Play, Users, Calendar, Settings, BookOpen, ArrowLeft, FileText, Activity, CheckCircle2, TrendingUp, Clock, GraduationCap, BarChart3, Sparkles, Palette } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { StartClassSessionFromPlan } from "@/components/StartClassSessionFromPlan";
import { LiveSessionMonitoring } from "@/components/LiveSessionMonitoring";
import { getActiveClassSessions } from "@/services/classSessionService";
import { getLessonPlanByClassId } from "@/services/lessonPlanService";
import { getAllActiveClasses } from "@/services/examService";
import { useState, useEffect } from "react";

export default function ClassRunner() {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("classes");
  const [useModernDesign, setUseModernDesign] = useState(() => {
    const saved = localStorage.getItem('classrunner-design-preference');
    return saved !== null ? JSON.parse(saved) : true;
  });

  // Save design preference to localStorage
  useEffect(() => {
    localStorage.setItem('classrunner-design-preference', JSON.stringify(useModernDesign));
  }, [useModernDesign]);

  // Fetch active classes for the teacher using the service function
  const { data: activeClasses = [], isLoading } = useQuery({
    queryKey: ['activeClasses', profile?.id],
    queryFn: async () => {
      console.log('Fetching classes for authenticated teacher');
      return await getAllActiveClasses();
    },
    enabled: !!profile?.id,
  });

  // Fetch lesson plans for all classes to show status
  const { data: allLessonPlans = [] } = useQuery({
    queryKey: ['allLessonPlans'],
    queryFn: async () => {
      const promises = activeClasses.map(async (classItem) => {
        const plans = await getLessonPlanByClassId(classItem.id);
        return {
          classId: classItem.id,
          lessonPlans: plans
        };
      });
      return Promise.all(promises);
    },
    enabled: activeClasses.length > 0,
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

  const getLessonPlanStatus = (classId: string) => {
    const classPlans = allLessonPlans.find(item => item.classId === classId);
    if (!classPlans || classPlans.lessonPlans.length === 0) {
      return { status: 'none', text: 'No Plan', color: 'bg-slate-100 text-slate-600 border-slate-200' };
    }
    
    const latestPlan = classPlans.lessonPlans[0];
    return { 
      status: 'ready', 
      text: 'Plan Ready', 
      color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      plan: latestPlan
    };
  };

  // Calculate summary stats
  const totalClasses = activeClasses.length;
  const classesWithPlans = activeClasses.filter(c => getLessonPlanStatus(c.id).status === 'ready').length;
  const totalStudents = activeClasses.reduce((sum, c) => sum + (c.student_count || 0), 0);

  const quickTools = [
    { icon: Users, title: "Student Roster", description: "Manage class enrollment", color: "from-blue-500 to-blue-600" },
    { icon: Calendar, title: "Lesson Plans", description: "Plan your curriculum", color: "from-purple-500 to-purple-600" },
    { icon: BookOpen, title: "Assignments", description: "Create & track work", color: "from-green-500 to-green-600" },
    { icon: Settings, title: "Class Settings", description: "Configure preferences", color: "from-orange-500 to-orange-600" },
  ];

  return (
    <div className={useModernDesign ? "min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/20 to-indigo-50/30" : "min-h-screen bg-gray-50"}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-4 mb-6">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className={useModernDesign ? "flex items-center gap-2 hover:shadow-md transition-all duration-200 border-slate-200 hover:border-slate-300" : "flex items-center gap-2"}
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Button>
            
            {/* Design Toggle */}
            <div className="flex items-center gap-3">
              <Palette className="h-4 w-4 text-slate-600" />
              <span className="text-sm text-slate-600">Classic</span>
              <Switch 
                checked={useModernDesign}
                onCheckedChange={setUseModernDesign}
              />
              <span className="text-sm text-slate-600">Modern</span>
            </div>
          </div>
          
          {/* Hero Section - Only in Modern Design */}
          {useModernDesign ? (
            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-600 via-purple-600 to-blue-600 p-8 text-white shadow-xl">
              <div className="relative z-10">
                <div className="flex items-center gap-3 mb-4">
                  <div className="p-3 bg-white/20 backdrop-blur-sm rounded-xl">
                    <GraduationCap className="h-8 w-8" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent">ClassRunner</h1>
                    <p className="text-blue-100 text-lg">Manage and run your classes efficiently</p>
                  </div>
                </div>
                
                {/* Stats Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-8">
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <BookOpen className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalClasses}</p>
                        <p className="text-blue-100 text-sm">Active Classes</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{totalStudents}</p>
                        <p className="text-blue-100 text-sm">Total Students</p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-white/20 rounded-lg">
                        <Activity className="h-5 w-5" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold">{activeSessions.length}</p>
                        <p className="text-blue-100 text-sm">Live Sessions</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Background decoration */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-l from-white/10 to-transparent rounded-full blur-3xl"></div>
              <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-gradient-to-r from-blue-400/20 to-transparent rounded-full blur-3xl"></div>
            </div>
          ) : (
            <div className="mb-6">
              <h1 className="text-3xl font-bold bg-gradient-to-r from-yellow-400 to-green-400 bg-clip-text text-transparent mb-2">ClassRunner</h1>
              <p className="text-gray-600">Manage and run your classes efficiently</p>
            </div>
          )}
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className={useModernDesign ? "grid w-full grid-cols-3 bg-white/80 backdrop-blur-sm border border-slate-200 shadow-sm" : "grid w-full grid-cols-3"}>
            <TabsTrigger 
              value="classes" 
              className={useModernDesign ? "data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200" : ""}
            >
              <BookOpen className="h-4 w-4 mr-2" />
              Active Classes
            </TabsTrigger>
            <TabsTrigger 
              value="monitoring" 
              className={useModernDesign ? "flex items-center gap-2 data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200" : "flex items-center gap-2"}
            >
              <Activity className="h-4 w-4" />
              Live Monitoring
              {activeSessions.length > 0 && (
                <span className="ml-1 px-2 py-1 text-xs bg-emerald-500 text-white rounded-full animate-pulse">
                  {activeSessions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="tools"
              className={useModernDesign ? "data-[state=active]:bg-white data-[state=active]:shadow-sm transition-all duration-200" : ""}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Quick Tools
            </TabsTrigger>
          </TabsList>

          <TabsContent value="classes">
            <Card className={useModernDesign ? "bg-white/90 backdrop-blur-sm border-0 shadow-lg ring-1 ring-slate-200/50" : ""}>
              <CardHeader className={useModernDesign ? "border-b border-slate-100" : ""}>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-3">
                    {useModernDesign && (
                      <div className="p-2 bg-blue-50 rounded-lg">
                        <BookOpen className="h-5 w-5 text-blue-600" />
                      </div>
                    )}
                    <div>
                      <span className="text-xl">Active Classes</span>
                      <p className="text-sm text-muted-foreground font-normal">
                        {classesWithPlans}/{totalClasses} classes have lesson plans
                      </p>
                    </div>
                  </CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className={useModernDesign ? "bg-blue-50 text-blue-700 border-blue-200" : ""}>
                      <TrendingUp className="h-3 w-3 mr-1" />
                      {totalClasses} Total
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className={useModernDesign ? "p-6 rounded-xl border border-slate-200 bg-gradient-to-r from-slate-50 to-white animate-pulse" : "p-4 border rounded animate-pulse"}>
                        <div className="flex items-center gap-4 mb-4">
                          <div className={useModernDesign ? "h-12 w-12 bg-slate-200 rounded-xl" : "h-8 w-8 bg-gray-200 rounded"}></div>
                          <div className="flex-1">
                            <div className={useModernDesign ? "h-5 bg-slate-200 rounded w-3/4 mb-2" : "h-4 bg-gray-200 rounded w-3/4 mb-2"}></div>
                            <div className={useModernDesign ? "h-4 bg-slate-200 rounded w-1/2" : "h-3 bg-gray-200 rounded w-1/2"}></div>
                          </div>
                        </div>
                        <div className={useModernDesign ? "h-4 bg-slate-200 rounded w-2/3" : "h-3 bg-gray-200 rounded w-2/3"}></div>
                      </div>
                    ))}
                  </div>
                ) : activeClasses.length > 0 ? (
                  <div className="space-y-6">
                    {activeClasses.map((classItem) => {
                      const planStatus = getLessonPlanStatus(classItem.id);
                      const hasPlan = planStatus.status === 'ready';
                      
                      return (
                        <div key={classItem.id} className={useModernDesign ? "group p-6 rounded-xl border border-slate-200 bg-gradient-to-r from-white to-slate-50/50 hover:shadow-lg hover:border-slate-300 transition-all duration-300" : "p-4 border border-gray-200 rounded-lg bg-white"}>
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-4">
                              <div className={useModernDesign ? "p-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl text-white shadow-lg" : "p-2 bg-blue-500 rounded text-white"}>
                                <BookOpen className={useModernDesign ? "h-6 w-6" : "h-4 w-4"} />
                              </div>
                              <div>
                                <h3 className={useModernDesign ? "text-xl font-semibold text-slate-900 mb-1" : "text-lg font-medium text-gray-900 mb-1"}>{classItem.name}</h3>
                                <p className={useModernDesign ? "text-slate-600 flex items-center gap-2" : "text-gray-600 flex items-center gap-2"}>
                                  <span>{classItem.subject}</span>
                                  <span className={useModernDesign ? "w-1 h-1 bg-slate-400 rounded-full" : "w-1 h-1 bg-gray-400 rounded-full"}></span>
                                  <span>{classItem.grade}</span>
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-3">
                              <Badge className={`px-3 py-1 border ${planStatus.color} ${useModernDesign ? 'shadow-sm' : ''}`}>
                                {hasPlan && <CheckCircle2 className="h-3 w-3 mr-1" />}
                                {planStatus.text}
                              </Badge>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handlePlanClass(classItem)}
                                className={useModernDesign ? "flex items-center gap-2 hover:shadow-md transition-all duration-200 border-slate-300 hover:border-slate-400" : "flex items-center gap-2"}
                              >
                                <FileText className="h-4 w-4" />
                                {hasPlan ? 'Edit Plan' : 'Create Plan'}
                              </Button>
                              {hasPlan && (
                                <StartClassSessionFromPlan
                                  classId={classItem.id}
                                  className={classItem.name}
                                  onSessionStarted={handleSessionStarted}
                                />
                              )}
                            </div>
                          </div>
                          
                          {/* Enhanced metrics row */}
                          <div className={useModernDesign ? "grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-white/80 rounded-lg border border-slate-100" : "grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-gray-50 rounded border"}>
                            <div className="flex items-center gap-2">
                              <Users className={useModernDesign ? "h-4 w-4 text-blue-500" : "h-4 w-4 text-gray-500"} />
                              <span className="text-sm font-medium">{classItem.student_count || 0} students</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Clock className={useModernDesign ? "h-4 w-4 text-green-500" : "h-4 w-4 text-gray-500"} />
                              <span className="text-sm">Next: {getNextClassTime()}</span>
                            </div>
                            {classItem.avg_gpa && (
                              <div className="flex items-center gap-2">
                                <BarChart3 className={useModernDesign ? "h-4 w-4 text-purple-500" : "h-4 w-4 text-gray-500"} />
                                <span className="text-sm">Avg GPA: {Number(classItem.avg_gpa).toFixed(1)}</span>
                              </div>
                            )}
                            {hasPlan && planStatus.plan && (
                              <div className="flex items-center gap-2">
                                <Calendar className={useModernDesign ? "h-4 w-4 text-emerald-500" : "h-4 w-4 text-gray-500"} />
                                <span className={useModernDesign ? "text-sm text-emerald-600 font-medium" : "text-sm"}>
                                  {planStatus.plan.scheduled_date} at {planStatus.plan.scheduled_time}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-16">
                    <div className={useModernDesign ? "p-4 bg-slate-100 rounded-2xl w-fit mx-auto mb-6" : "p-4 bg-gray-100 rounded w-fit mx-auto mb-6"}>
                      <BookOpen className={useModernDesign ? "h-12 w-12 text-slate-400 mx-auto" : "h-8 w-8 text-gray-400 mx-auto"} />
                    </div>
                    <h3 className={useModernDesign ? "text-xl font-semibold text-slate-700 mb-2" : "text-lg font-medium text-gray-700 mb-2"}>No Active Classes</h3>
                    <p className={useModernDesign ? "text-slate-500 mb-1" : "text-gray-500 mb-1"}>No classes found for your account</p>
                    <p className={useModernDesign ? "text-sm text-slate-400" : "text-sm text-gray-400"}>
                      Classes will appear here once they are created and assigned to you.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="monitoring">
            <Card className={useModernDesign ? "bg-white/90 backdrop-blur-sm border-0 shadow-lg ring-1 ring-slate-200/50" : ""}>
              <CardHeader className={useModernDesign ? "border-b border-slate-100" : ""}>
                <CardTitle className="flex items-center gap-3">
                  {useModernDesign && (
                    <div className="p-2 bg-emerald-50 rounded-lg">
                      <Activity className="h-5 w-5 text-emerald-600" />
                    </div>
                  )}
                  <div>
                    <span className="text-xl">Live Session Monitoring</span>
                    {activeSessions.length > 0 && (
                      <div className="flex items-center gap-2 mt-1">
                        <span className="flex h-2 w-2">
                          <span className="animate-ping absolute inline-flex h-2 w-2 rounded-full bg-emerald-400 opacity-75"></span>
                          <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                        </span>
                        <span className="text-sm text-emerald-600 font-medium">
                          {activeSessions.length} active session{activeSessions.length !== 1 ? 's' : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <LiveSessionMonitoring showAllSessions={true} />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="tools">
            <Card className={useModernDesign ? "bg-white/90 backdrop-blur-sm border-0 shadow-lg ring-1 ring-slate-200/50" : ""}>
              <CardHeader className={useModernDesign ? "border-b border-slate-100" : ""}>
                <CardTitle className="flex items-center gap-3">
                  {useModernDesign && (
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Sparkles className="h-5 w-5 text-purple-600" />
                    </div>
                  )}
                  Quick Tools
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {quickTools.map((tool, index) => (
                    <Button 
                      key={index}
                      variant="outline" 
                      className={useModernDesign ? "h-auto p-6 justify-start hover:shadow-lg transition-all duration-300 border-slate-200 hover:border-slate-300 group" : "h-auto p-4 justify-start"}
                    >
                      <div className="flex items-center gap-4 w-full">
                        <div className={useModernDesign ? `p-3 rounded-xl bg-gradient-to-br ${tool.color} text-white shadow-lg group-hover:scale-110 transition-transform duration-200` : "p-2 bg-gray-100 rounded"}>
                          <tool.icon className={useModernDesign ? "h-6 w-6" : "h-4 w-4"} />
                        </div>
                        <div className="text-left">
                          <p className={useModernDesign ? "font-semibold text-slate-900" : "font-medium text-gray-900"}>{tool.title}</p>
                          <p className={useModernDesign ? "text-sm text-slate-500" : "text-sm text-gray-500"}>{tool.description}</p>
                        </div>
                      </div>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
