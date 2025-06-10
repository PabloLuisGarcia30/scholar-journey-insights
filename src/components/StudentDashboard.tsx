
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Users, 
  TrendingUp, 
  Calendar, 
  BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { 
  getAllActiveStudents, 
  getAllActiveClasses,
  type ActiveStudent,
  type ActiveClass
} from "@/services/examService";
import { StudentPerformanceOverview } from "@/components/StudentPerformanceOverview";
import { MultiSkillActionBar } from "@/components/MultiSkillActionBar";
import { generateMultiplePracticeTests } from "@/services/practiceTestService";

interface StudentDashboardProps {
  onSelectStudent: (studentId: string, classId?: string, className?: string) => void;
}

export function StudentDashboard({ onSelectStudent }: StudentDashboardProps) {
  const [students, setStudents] = useState<ActiveStudent[]>([]);
  const [classes, setClasses] = useState<ActiveClass[]>([]);
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

  const handleGenerateTests = async () => {
    // This will be handled by the MultiSkillActionBar
    toast.success('Generating practice tests...');
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
      {/* Inspirational Header */}
      <div className="text-center py-8">
        <h1 className="text-6xl font-bold bg-gradient-to-r from-blue-700 via-blue-900 to-blue-600 bg-clip-text text-transparent leading-tight tracking-tight font-sans">
          Let's Empower Students Today.
        </h1>
        <div className="mt-4 w-24 h-1 bg-gradient-to-r from-blue-500 to-blue-700 mx-auto rounded-full"></div>
      </div>

      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-gray-900">Teacher Dashboard</h2>
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

      {/* Student Performance Overview */}
      <StudentPerformanceOverview students={students} classes={classes} />

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

      {/* Multi-Skill Action Bar */}
      <MultiSkillActionBar onGenerateTests={handleGenerateTests} />
    </div>
  );
}
