
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Activity, BarChart3, Clock, CheckCircle, AlertCircle, Play } from "lucide-react";
import { getSessionMonitoringData, type SessionMonitoringData } from "@/services/classSessionService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface LiveSessionMonitoringProps {
  sessionId?: string;
  showAllSessions?: boolean;
}

export function LiveSessionMonitoring({ sessionId, showAllSessions = false }: LiveSessionMonitoringProps) {
  const [monitoringData, setMonitoringData] = useState<SessionMonitoringData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  useEffect(() => {
    loadMonitoringData();
    
    // Set up real-time subscription for student exercises
    const channel = supabase
      .channel('session-monitoring')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'student_exercises'
      }, () => {
        loadMonitoringData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [sessionId, showAllSessions]);

  const loadMonitoringData = async () => {
    try {
      const data = await getSessionMonitoringData(sessionId);
      setMonitoringData(data);
    } catch (error) {
      console.error('Error loading monitoring data:', error);
      toast.error('Failed to load session monitoring data');
    } finally {
      setLoading(false);
    }
  };

  // Group data by session
  const sessionGroups = monitoringData.reduce((groups, item) => {
    const key = item.class_session_id;
    if (!groups[key]) {
      groups[key] = {
        session: item,
        exercises: []
      };
    }
    groups[key].exercises.push(item);
    return groups;
  }, {} as Record<string, { session: SessionMonitoringData; exercises: SessionMonitoringData[] }>);

  // Group data by student for individual view
  const studentGroups = monitoringData.reduce((groups, item) => {
    const key = item.student_id;
    if (!groups[key]) {
      groups[key] = {
        student_name: item.student_name,
        exercises: []
      };
    }
    groups[key].exercises.push(item);
    return groups;
  }, {} as Record<string, { student_name: string; exercises: SessionMonitoringData[] }>);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'in_progress': return 'bg-yellow-500';
      default: return 'bg-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'in_progress': return <Play className="h-4 w-4" />;
      default: return <Clock className="h-4 w-4" />;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading session monitoring data...</p>
        </CardContent>
      </Card>
    );
  }

  if (monitoringData.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Activity className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Sessions</h3>
          <p className="text-slate-500">
            Start a class session to begin monitoring student progress in real-time.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Session Overview</TabsTrigger>
          <TabsTrigger value="students">By Student</TabsTrigger>
          <TabsTrigger value="skills">By Skill</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {Object.values(sessionGroups).map(({ session, exercises }) => {
            const completedCount = exercises.filter(ex => ex.status === 'completed').length;
            const inProgressCount = exercises.filter(ex => ex.status === 'in_progress').length;
            const completionRate = (completedCount / exercises.length) * 100;

            return (
              <Card key={session.class_session_id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">{session.session_name}</CardTitle>
                    <Badge variant={session.is_active ? "default" : "secondary"}>
                      {session.is_active ? "Active" : "Ended"}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span className="flex items-center gap-1">
                      <Users className="h-4 w-4" />
                      {Object.keys(exercises.reduce((students, ex) => ({ ...students, [ex.student_id]: true }), {})).length} students
                    </span>
                    <span className="flex items-center gap-1">
                      <BarChart3 className="h-4 w-4" />
                      {completedCount}/{exercises.length} completed
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium">Overall Progress</span>
                        <span className="text-sm text-slate-600">{Math.round(completionRate)}%</span>
                      </div>
                      <Progress value={completionRate} className="h-2" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {Object.values(exercises.reduce((students, ex) => {
                        const studentId = ex.student_id;
                        if (!students[studentId]) {
                          students[studentId] = {
                            name: ex.student_name,
                            exercises: []
                          };
                        }
                        students[studentId].exercises.push(ex);
                        return students;
                      }, {} as Record<string, { name: string; exercises: SessionMonitoringData[] }>)).map(student => {
                        const studentCompletedCount = student.exercises.filter(ex => ex.status === 'completed').length;
                        const studentCompletionRate = (studentCompletedCount / student.exercises.length) * 100;

                        return (
                          <Card key={student.name} className="p-4">
                            <div className="space-y-2">
                              <h4 className="font-medium">{student.name}</h4>
                              <div className="flex items-center gap-2">
                                <Progress value={studentCompletionRate} className="flex-1 h-1" />
                                <span className="text-xs text-slate-600">
                                  {studentCompletedCount}/{student.exercises.length}
                                </span>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {student.exercises.map(ex => (
                                  <div
                                    key={ex.id}
                                    className={`w-2 h-2 rounded-full ${getStatusColor(ex.status)}`}
                                    title={`${ex.skill_name}: ${ex.status}`}
                                  />
                                ))}
                              </div>
                            </div>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="students" className="space-y-4">
          {Object.entries(studentGroups).map(([studentId, { student_name, exercises }]) => {
            const completedCount = exercises.filter(ex => ex.status === 'completed').length;
            const avgScore = exercises
              .filter(ex => ex.exercise_score !== null)
              .reduce((sum, ex, _, arr) => sum + (ex.exercise_score || 0) / arr.length, 0);

            return (
              <Card key={studentId}>
                <CardHeader>
                  <CardTitle className="text-lg">{student_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{completedCount}/{exercises.length} exercises completed</span>
                    {avgScore > 0 && <span>Avg Score: {Math.round(avgScore)}%</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Skill</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Original Score</TableHead>
                        <TableHead>Exercise Score</TableHead>
                        <TableHead>Progress</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercises.map(exercise => (
                        <TableRow key={exercise.id}>
                          <TableCell className="font-medium">{exercise.skill_name}</TableCell>
                          <TableCell>
                            <Badge variant={exercise.status === 'completed' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(exercise.status)}
                              {exercise.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{Math.round(exercise.original_skill_score)}%</TableCell>
                          <TableCell>
                            {exercise.exercise_score ? `${Math.round(exercise.exercise_score)}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {exercise.exercise_score && (
                              <div className="flex items-center gap-2">
                                <Progress 
                                  value={exercise.exercise_score} 
                                  className="w-16 h-2" 
                                />
                                <span className={`text-xs ${
                                  exercise.exercise_score > exercise.original_skill_score 
                                    ? 'text-green-600' 
                                    : 'text-orange-600'
                                }`}>
                                  {exercise.exercise_score > exercise.original_skill_score ? '+' : ''}
                                  {Math.round(exercise.exercise_score - exercise.original_skill_score)}%
                                </span>
                              </div>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>

        <TabsContent value="skills" className="space-y-4">
          {Object.values(monitoringData.reduce((skills, ex) => {
            const skillName = ex.skill_name;
            if (!skills[skillName]) {
              skills[skillName] = {
                skill_name: skillName,
                exercises: []
              };
            }
            skills[skillName].exercises.push(ex);
            return skills;
          }, {} as Record<string, { skill_name: string; exercises: SessionMonitoringData[] }>)).map(({ skill_name, exercises }) => {
            const completedCount = exercises.filter(ex => ex.status === 'completed').length;
            const avgOriginalScore = exercises.reduce((sum, ex, _, arr) => sum + ex.original_skill_score / arr.length, 0);
            const completedExercises = exercises.filter(ex => ex.exercise_score !== null);
            const avgExerciseScore = completedExercises.length > 0 
              ? completedExercises.reduce((sum, ex, _, arr) => sum + (ex.exercise_score || 0) / arr.length, 0)
              : 0;

            return (
              <Card key={skill_name}>
                <CardHeader>
                  <CardTitle className="text-lg">{skill_name}</CardTitle>
                  <div className="flex items-center gap-4 text-sm text-slate-600">
                    <span>{exercises.length} students practicing</span>
                    <span>{completedCount} completed</span>
                    <span>Avg Original: {Math.round(avgOriginalScore)}%</span>
                    {avgExerciseScore > 0 && <span>Avg Exercise: {Math.round(avgExerciseScore)}%</span>}
                  </div>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Original Score</TableHead>
                        <TableHead>Exercise Score</TableHead>
                        <TableHead>Improvement</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {exercises.map(exercise => (
                        <TableRow key={exercise.id}>
                          <TableCell className="font-medium">{exercise.student_name}</TableCell>
                          <TableCell>
                            <Badge variant={exercise.status === 'completed' ? 'default' : 'secondary'} className="flex items-center gap-1 w-fit">
                              {getStatusIcon(exercise.status)}
                              {exercise.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{Math.round(exercise.original_skill_score)}%</TableCell>
                          <TableCell>
                            {exercise.exercise_score ? `${Math.round(exercise.exercise_score)}%` : '-'}
                          </TableCell>
                          <TableCell>
                            {exercise.exercise_score && (
                              <span className={`text-sm font-medium ${
                                exercise.exercise_score > exercise.original_skill_score 
                                  ? 'text-green-600' 
                                  : exercise.exercise_score < exercise.original_skill_score
                                  ? 'text-red-600'
                                  : 'text-slate-600'
                              }`}>
                                {exercise.exercise_score > exercise.original_skill_score ? '+' : ''}
                                {Math.round(exercise.exercise_score - exercise.original_skill_score)}%
                              </span>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            );
          })}
        </TabsContent>
      </Tabs>
    </div>
  );
}
