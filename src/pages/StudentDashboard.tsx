import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bell, BookOpen, TrendingUp, User, Calendar, Clock, Users, GraduationCap, Target, Play, CheckCircle, AlertCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { DevRoleToggle } from "@/components/DevRoleToggle";
import { useDevRole } from "@/contexts/DevRoleContext";
import { Navigate } from "react-router-dom";
import { DEV_CONFIG } from "@/config/devConfig";
import { 
  getAllActiveClasses, 
  getStudentContentSkillScores, 
  getLinkedContentSkillsForClass,
  type ActiveClass 
} from "@/services/examService";
import { toast } from "sonner";
import { SkillPracticeDialog } from "@/components/SkillPracticeDialog";
import { StudentProfile } from "@/components/StudentProfile";

export default function StudentDashboard() {
  const { profile, signOut } = useAuth();
  
  // ALL HOOKS MUST BE CALLED BEFORE ANY CONDITIONAL LOGIC OR EARLY RETURNS
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [contentSkills, setContentSkills] = useState<any[]>([]);
  const [loadingSkills, setLoadingSkills] = useState(false);
  const [practiceDialogOpen, setPracticeDialogOpen] = useState(false);
  const [showStudentProfile, setShowStudentProfile] = useState(false);
  const [selectedClassForProfile, setSelectedClassForProfile] = useState<{classId: string, className: string} | null>(null);
  const [classSkillCounts, setClassSkillCounts] = useState<{[classId: string]: number}>({});
  
  const [notifications] = useState([
    {
      id: 1,
      title: "New Practice Test Available",
      message: "Your teacher has assigned a new Math practice test",
      type: "assignment",
      isRead: false,
      createdAt: "2024-01-10T10:00:00Z"
    },
    {
      id: 2,
      title: "Progress Update",
      message: "Great improvement in Algebra skills!",
      type: "progress",
      isRead: false,
      createdAt: "2024-01-09T15:30:00Z"
    }
  ]);

  const [assignments] = useState([
    {
      id: 1,
      title: "Quadratic Equations Practice",
      subject: "Math",
      dueDate: "2024-01-15T23:59:59Z",
      progress: 75,
      status: "in-progress"
    },
    {
      id: 2,
      title: "Chemistry Lab Report",
      subject: "Science",
      dueDate: "2024-01-12T23:59:59Z",
      progress: 0,
      status: "pending"
    }
  ]);

  // Get current role (dev or actual)
  let currentRole: 'teacher' | 'student' = 'student';
  try {
    const { currentRole: devRole, isDevMode } = useDevRole();
    if (isDevMode) {
      currentRole = devRole;
    } else if (profile?.role) {
      currentRole = profile.role;
    }
  } catch {
    currentRole = profile?.role || 'student';
  }

  useEffect(() => {
    loadClasses();
  }, []);

  useEffect(() => {
    if (selectedClass && profile?.id) {
      loadContentSkills(selectedClass);
    }
  }, [selectedClass, profile?.id]);

  const loadClasses = async () => {
    try {
      setLoadingClasses(true);
      const classesData = await getAllActiveClasses();
      
      // Filter classes that include this student
      const studentClasses = classesData.filter(cls => 
        cls.students.includes(profile?.id || '')
      );
      
      setClasses(studentClasses);
      
      // Load skill counts for each class
      const skillCounts: {[classId: string]: number} = {};
      for (const cls of studentClasses) {
        try {
          const classSkills = await getLinkedContentSkillsForClass(cls.id);
          skillCounts[cls.id] = classSkills.length;
        } catch (error) {
          console.log(`No skills linked yet for class ${cls.name}`);
          skillCounts[cls.id] = 0;
        }
      }
      setClassSkillCounts(skillCounts);
      
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoadingClasses(false);
    }
  };

  const loadContentSkills = async (classId: string) => {
    try {
      setLoadingSkills(true);
      console.log('Loading content skills for class:', classId, 'student:', profile?.id);
      
      // Get student's content skill scores
      const studentSkills = await getStudentContentSkillScores(profile?.id || '');
      console.log('Student content skills:', studentSkills);
      
      // Get all content skills linked to this class
      const classSkills = await getLinkedContentSkillsForClass(classId);
      console.log('Class content skills:', classSkills);
      
      if (classSkills.length === 0) {
        console.log('No skills linked to this class yet - skills coming soon');
        setContentSkills([]);
        return;
      }
      
      // Merge and find lowest scores
      const mergedSkills = classSkills.map(classSkill => {
        const studentSkill = studentSkills.find(s => s.skill_name === classSkill.skill_name);
        return {
          ...classSkill,
          score: studentSkill?.score || 0,
          points_earned: studentSkill?.points_earned || 0,
          points_possible: studentSkill?.points_possible || 0
        };
      });
      
      // Sort by score (lowest first) and take top 5
      const lowestSkills = mergedSkills
        .sort((a, b) => a.score - b.score)
        .slice(0, 5);
      
      setContentSkills(lowestSkills);
    } catch (error) {
      console.error('Error loading content skills:', error);
      toast.error('Failed to load content skills');
      setContentSkills([]);
    } finally {
      setLoadingSkills(false);
    }
  };

  const handleClassSelect = (classId: string) => {
    console.log('Class selected:', classId);
    setSelectedClass(selectedClass === classId ? null : classId);
  };

  const handlePractice = () => {
    if (selectedClassData && contentSkills.length > 0) {
      setPracticeDialogOpen(true);
    } else {
      toast.info("Please select a class and wait for skills to load first.");
    }
  };

  const handleViewProfile = () => {
    if (selectedClassData && profile?.id) {
      setSelectedClassForProfile({
        classId: selectedClassData.id,
        className: selectedClassData.name
      });
      setShowStudentProfile(true);
    } else {
      toast.info("Please select a class first.");
    }
  };

  const handleBackFromProfile = () => {
    setShowStudentProfile(false);
    setSelectedClassForProfile(null);
  };

  // CONDITIONAL LOGIC AND EARLY RETURNS MUST COME AFTER ALL HOOKS
  // If in teacher view, redirect to main dashboard
  if (currentRole === 'teacher') {
    return <Navigate to="/" replace />;
  }

  // Show StudentProfile if requested
  if (showStudentProfile && profile?.id && selectedClassForProfile) {
    return (
      <StudentProfile
        studentId={profile.id}
        classId={selectedClassForProfile.classId}
        className={selectedClassForProfile.className}
        onBack={handleBackFromProfile}
      />
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in-progress': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getSubjectColor = (subject: string) => {
    switch (subject.toLowerCase()) {
      case 'math': return 'bg-blue-500';
      case 'science': return 'bg-green-500';
      case 'english': return 'bg-purple-500';
      case 'history': return 'bg-orange-500';
      case 'geography': return 'bg-teal-500';
      default: return 'bg-gray-500';
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getSkillStatusInfo = (classId: string) => {
    const skillCount = classSkillCounts[classId] || 0;
    if (skillCount > 0) {
      return {
        icon: CheckCircle,
        text: `${skillCount} skills available`,
        color: 'text-green-600 bg-green-50'
      };
    } else {
      return {
        icon: AlertCircle,
        text: 'Skills coming soon',
        color: 'text-orange-600 bg-orange-50'
      };
    }
  };

  const selectedClassData = selectedClass ? classes.find(cls => cls.id === selectedClass) : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Dev Role Toggle */}
        <div className="mb-6">
          <DevRoleToggle />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
              Welcome, {profile?.full_name || 'Student'}
            </h1>
            <p className="text-lg text-slate-600 mt-2">Ready to continue your learning journey?</p>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={signOut}>
              {DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? 'Sign Out (Dev)' : 'Sign Out'}
            </Button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <BookOpen className="h-6 w-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Active Assignments</p>
                  <p className="text-2xl font-bold text-slate-900">{assignments.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 rounded-xl">
                  <TrendingUp className="h-6 w-6 text-green-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Average Score</p>
                  <p className="text-2xl font-bold text-slate-900">85%</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-orange-100 rounded-xl">
                  <Bell className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Notifications</p>
                  <p className="text-2xl font-bold text-slate-900">{notifications.filter(n => !n.isRead).length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 rounded-xl">
                  <User className="h-6 w-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-sm text-slate-600">Learning Streak</p>
                  <p className="text-2xl font-bold text-slate-900">7 days</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Your Classes Section with Enhanced Skill Display */}
        <div className="mb-8">
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Your Classes
              </CardTitle>
            </CardHeader>
            <CardContent>
              {loadingClasses ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                  <span className="ml-3 text-slate-600">Loading classes...</span>
                </div>
              ) : classes.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {classes.map((cls) => {
                    const skillStatus = getSkillStatusInfo(cls.id);
                    const SkillIcon = skillStatus.icon;
                    
                    return (
                      <div
                        key={cls.id}
                        className={`relative p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer hover:shadow-lg ${
                          selectedClass === cls.id
                            ? 'border-blue-500 bg-blue-50/50 shadow-md'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        onClick={() => handleClassSelect(cls.id)}
                      >
                        <div className="flex items-start justify-between mb-4">
                          <div className={`w-12 h-12 rounded-lg ${getSubjectColor(cls.subject)} flex items-center justify-center`}>
                            <BookOpen className="h-6 w-6 text-white" />
                          </div>
                          <Badge variant="outline" className="text-xs">
                            {cls.grade}
                          </Badge>
                        </div>
                        
                        <h3 className="font-semibold text-slate-900 mb-2">{cls.name}</h3>
                        <p className="text-sm text-slate-600 mb-3">{cls.subject}</p>
                        
                        {/* Skill Status Display */}
                        <div className={`flex items-center gap-2 mb-3 px-2 py-1 rounded-md ${skillStatus.color}`}>
                          <SkillIcon className="h-4 w-4" />
                          <span className="text-xs font-medium">{skillStatus.text}</span>
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-1 text-slate-500">
                            <Users className="h-4 w-4" />
                            <span>{cls.student_count} students</span>
                          </div>
                          <div className="flex items-center gap-1 text-slate-500">
                            <User className="h-4 w-4" />
                            <span>{cls.teacher}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8">
                  <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
                  <p className="text-gray-600">You're not enrolled in any classes yet.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Selected Class Skills Section with Enhanced Empty State */}
        {selectedClass && selectedClassData && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Target className="h-5 w-5" />
                      Let's work on some skills today!
                    </CardTitle>
                    <p className="text-sm text-slate-600">
                      Focus areas for {selectedClassData.name} - {selectedClassData.subject}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      onClick={handleViewProfile}
                      variant="outline"
                      className="font-semibold px-4 py-2 rounded-lg transition-all duration-200 flex items-center gap-2"
                    >
                      <User className="h-4 w-4" />
                      View Profile
                    </Button>
                    <Button 
                      onClick={handlePractice}
                      className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
                      disabled={contentSkills.length === 0}
                    >
                      <Play className="h-4 w-4" />
                      Let's Practice!
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {loadingSkills ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                    <span className="ml-3 text-slate-600">Loading skills...</span>
                  </div>
                ) : contentSkills.length > 0 ? (
                  <div className="space-y-4">
                    <h4 className="font-medium text-slate-700 mb-3">Top 5 Skills to Improve:</h4>
                    {contentSkills.map((skill, index) => (
                      <div key={skill.id || index} className="p-4 rounded-lg border bg-white/50">
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-medium text-slate-900">{skill.skill_name}</h5>
                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-semibold ${getScoreColor(skill.score)}`}>
                              {skill.score.toFixed(1)}%
                            </span>
                            <Badge variant="outline" className="text-xs">
                              {skill.points_earned || 0}/{skill.points_possible || 0} points
                            </Badge>
                          </div>
                        </div>
                        <p className="text-sm text-slate-600 mb-3">{skill.skill_description}</p>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: `${Math.max(skill.score, 5)}%` }}
                          ></div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="h-12 w-12 text-orange-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">Skills coming soon!</h3>
                    <p className="text-gray-600 mb-2">
                      Your teacher is setting up the skills for {selectedClassData.subject} {selectedClassData.grade}.
                    </p>
                    <p className="text-sm text-gray-500">
                      Once skills are added, you'll see personalized practice recommendations here.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Assignments */}
          <div className="lg:col-span-2">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Current Assignments
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {assignments.map((assignment) => (
                  <div key={assignment.id} className="p-4 rounded-lg border bg-white/50">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-semibold text-slate-900">{assignment.title}</h3>
                        <p className="text-sm text-slate-600">{assignment.subject}</p>
                      </div>
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status.replace('-', ' ')}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-4 w-4" />
                        Due: {formatDate(assignment.dueDate)}
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="h-4 w-4" />
                        Progress: {assignment.progress}%
                      </div>
                    </div>

                    <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${assignment.progress}%` }}
                      ></div>
                    </div>

                    <Button size="sm" className="w-full">
                      {assignment.progress > 0 ? 'Continue' : 'Start'} Assignment
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>

          {/* Notifications */}
          <div>
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Recent Notifications
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {notifications.map((notification) => (
                  <div key={notification.id} className="p-3 rounded-lg border bg-white/50">
                    <div className="flex items-start gap-3">
                      <div className="p-2 bg-blue-100 rounded-lg">
                        <Bell className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-slate-900 text-sm">{notification.title}</h4>
                        <p className="text-xs text-slate-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-slate-400 mt-2">{formatDate(notification.createdAt)}</p>
                      </div>
                      {!notification.isRead && (
                        <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
                      )}
                    </div>
                  </div>
                ))}
                
                <Button variant="outline" size="sm" className="w-full">
                  View All Notifications
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Skill Practice Dialog */}
      <SkillPracticeDialog
        open={practiceDialogOpen}
        onOpenChange={setPracticeDialogOpen}
        skills={contentSkills}
        className={selectedClassData?.name || ''}
      />
    </div>
  );
}
