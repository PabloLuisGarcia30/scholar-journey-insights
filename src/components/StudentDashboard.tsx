
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  BookOpen, 
  Target,
  GraduationCap,
  Clock,
  Award
} from "lucide-react";
import { toast } from "sonner";
import { 
  getAllActiveStudents, 
  getAllActiveClasses,
  getStudentContentSkillScores,
  type ActiveStudent,
  type ActiveClass,
  type SkillScore
} from "@/services/examService";

interface StudentDashboardProps {
  onSelectStudent: (studentId: string, classId?: string, className?: string) => void;
}

// Mock content skills data for when no real data exists
const mockContentSkills = [
  { skill_name: "Polynomial Operations", score: 85, topic: "Algebra" },
  { skill_name: "Quadratic Functions", score: 78, topic: "Algebra" },
  { skill_name: "Trigonometric Ratios", score: 92, topic: "Trigonometry" },
  { skill_name: "Linear Systems", score: 88, topic: "Algebra" },
  { skill_name: "Exponential Functions", score: 74, topic: "Functions" },
  { skill_name: "Statistical Analysis", score: 81, topic: "Statistics" },
];

export function StudentDashboard({ onSelectStudent }: StudentDashboardProps) {
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [contentSkills, setContentSkills] = useState<SkillScore[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [studentsData, classesData] = await Promise.all([
        getAllActiveStudents(),
        getAllActiveClasses()
      ]);
      
      setStudents(studentsData);
      setClasses(classesData);

      // Try to load content skills for the first student as an example
      if (studentsData.length > 0) {
        const skillsData = await getStudentContentSkillScores(studentsData[0].id);
        setContentSkills(skillsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (student.email && student.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (filterClass === 'all') return matchesSearch;
    
    const studentInClass = classes.find(cls => 
      cls.id === filterClass && cls.students.includes(student.id)
    );
    
    return matchesSearch && studentInClass;
  });

  // Use mock data if no content skills exist
  const displaySkills = contentSkills.length > 0 ? 
    contentSkills.map(skill => ({
      skill_name: skill.skill_name,
      score: skill.score,
      topic: 'General' // Default topic since it's not in SkillScore type
    })) : 
    mockContentSkills;

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'bg-green-100 text-green-700';
    if (score >= 80) return 'bg-blue-100 text-blue-700';
    if (score >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
        <p className="text-gray-600">Overview of student performance and class management</p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{students.length}</div>
            <div className="text-sm text-gray-600">Total Students</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{classes.length}</div>
            <div className="text-sm text-gray-600">Active Classes</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">
              {students.length > 0 ? 
                (students.reduce((sum, s) => sum + (s.gpa || 0), 0) / students.length).toFixed(1) : 
                '0.0'
              }
            </div>
            <div className="text-sm text-gray-600">Average GPA</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">95%</div>
            <div className="text-sm text-gray-600">Attendance Rate</div>
          </CardContent>
        </Card>
      </div>

      {/* Content Specific Skills Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Content-Specific Skills Overview
            {contentSkills.length === 0 && (
              <Badge variant="outline" className="ml-2">Mock Data</Badge>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {displaySkills.slice(0, 6).map((skill, index) => (
              <div key={index} className="p-4 rounded-lg border border-gray-100 bg-gray-50">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-sm">{skill.skill_name}</h4>
                  <Badge className={getScoreColor(skill.score)} variant="outline">
                    {Math.round(skill.score)}%
                  </Badge>
                </div>
                <div className="text-xs text-gray-600 mb-2">{skill.topic}</div>
                <Progress value={skill.score} className="h-2" />
              </div>
            ))}
          </div>
          {displaySkills.length > 6 && (
            <div className="text-center mt-4">
              <Button variant="outline" size="sm">
                View All Skills ({displaySkills.length})
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Student List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recent Students</CardTitle>
            <div className="flex gap-4">
              <Input
                type="text"
                placeholder="Search students..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-md"
              />
              <Select value={filterClass} onValueChange={setFilterClass}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredStudents.length > 0 ? (
            <div className="space-y-3">
              {filteredStudents.slice(0, 8).map((student) => (
                <div 
                  key={student.id}
                  className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                  onClick={() => onSelectStudent(student.id)}
                >
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {student.name.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h3 className="font-medium">{student.name}</h3>
                      <p className="text-sm text-gray-600">{student.email || 'No email'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {student.year && <Badge variant="outline">{student.year}</Badge>}
                    {student.gpa && (
                      <Badge className="bg-blue-100 text-blue-700">
                        GPA: {Number(student.gpa).toFixed(2)}
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
              <p className="text-gray-600">Try adjusting your search criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
