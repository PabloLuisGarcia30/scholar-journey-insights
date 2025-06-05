import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Users, BookOpen, TrendingUp, Trash2, ArrowLeft, Target } from "lucide-react";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { AddStudentsDialog } from "@/components/AddStudentsDialog";
import { ClassContentSkills } from "@/components/ClassContentSkills";
import { toast } from "sonner";
import { 
  getAllActiveClasses, 
  createActiveClass, 
  updateActiveClass, 
  deleteActiveClass, 
  getAllActiveStudents,
  getActiveStudentById,
  getStudentTestResults,
  getStudentContentSkillScores,
  getStudentSubjectSkillScores,
  type ActiveClass,
  type ActiveStudent,
  type TestResult,
  type SkillScore
} from "@/services/examService";

interface ClassViewProps {
  onSelectStudent: (studentId: string, classId?: string, className?: string) => void;
}

// Mock students for class details
const mockStudents = [
  { id: '1', name: 'Sarah Johnson', gpa: 3.8 },
  { id: '2', name: 'Michael Chen', gpa: 3.2 },
  { id: '3', name: 'Emma Williams', gpa: 3.9 },
  { id: '4', name: 'David Brown', gpa: 3.1 },
  { id: '5', name: 'Lisa Garcia', gpa: 3.6 }
];

export function ClassView({ onSelectStudent }: ClassViewProps) {
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [selectedStudentId, setSelectedStudentId] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<ActiveStudent[]>([]);
  const [studentDetails, setStudentDetails] = useState<{
    student: ActiveStudent | null;
    testResults: TestResult[];
    contentSkills: SkillScore[];
    subjectSkills: SkillScore[];
  }>({
    student: null,
    testResults: [],
    contentSkills: [],
    subjectSkills: []
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [activeClasses, activeStudents] = await Promise.all([
        getAllActiveClasses(),
        getAllActiveStudents()
      ]);
      setClasses(activeClasses);
      setAllStudents(activeStudents);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudentDetails = async (studentId: string) => {
    try {
      const [student, testResults, contentSkills, subjectSkills] = await Promise.all([
        getActiveStudentById(studentId),
        getStudentTestResults(studentId),
        getStudentContentSkillScores(studentId),
        getStudentSubjectSkillScores(studentId)
      ]);

      setStudentDetails({
        student,
        testResults,
        contentSkills,
        subjectSkills
      });
    } catch (error) {
      console.error('Error loading student details:', error);
      toast.error('Failed to load student details');
    }
  };

  const handleCreateClass = async (classData: { name: string; subject: string; grade: string; teacher: string }) => {
    try {
      const newClass = await createActiveClass(classData);
      setClasses([...classes, newClass]);
      toast.success(`Class "${newClass.name}" has been created successfully!`);
    } catch (error) {
      console.error('Error creating class:', error);
      toast.error('Failed to create class. Please try again.');
    }
  };

  const handleDeleteClass = async (classId: string, className: string) => {
    try {
      await deleteActiveClass(classId);
      setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classId));
      toast.success(`Class "${className}" has been deleted`);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class. Please try again.');
    }
  };

  const handleAddStudents = async (classId: string, studentIds: string[]) => {
    try {
      const classToUpdate = classes.find(cls => cls.id === classId);
      if (!classToUpdate) return;

      const updatedStudents = [...classToUpdate.students, ...studentIds];
      const enrolledStudents = allStudents.filter(s => updatedStudents.includes(s.id));
      const avgGpa = enrolledStudents.length > 0 
        ? Number((enrolledStudents.reduce((sum, s) => sum + (s.gpa || 0), 0) / enrolledStudents.length).toFixed(1))
        : 0;

      const updatedClass = await updateActiveClass(classId, {
        students: updatedStudents,
        student_count: updatedStudents.length,
        avg_gpa: avgGpa
      });

      setClasses(prevClasses => 
        prevClasses.map(cls => cls.id === classId ? updatedClass : cls)
      );

      toast.success('Students added successfully!');
    } catch (error) {
      console.error('Error adding students:', error);
      toast.error('Failed to add students. Please try again.');
    }
  };

  const handleStudentClick = (studentId: string, classId: string, className: string) => {
    setSelectedStudentId(studentId);
    loadStudentDetails(studentId);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.teacher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || cls.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(classes.map(cls => cls.subject))];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading classes...</div>
        </div>
      </div>
    );
  }

  // Student Details View
  if (selectedStudentId && studentDetails.student) {
    const { student, testResults, contentSkills, subjectSkills } = studentDetails;
    
    return (
      <div className="p-6">
        <div className="mb-6">
          <Button 
            variant="ghost" 
            onClick={() => {
              setSelectedStudentId(null);
              setStudentDetails({ student: null, testResults: [], contentSkills: [], subjectSkills: [] });
            }} 
            className="mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Class
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
              <p className="text-gray-600 mt-1">{student.email || 'No email provided'}</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">
                {student.gpa ? Number(student.gpa).toFixed(2) : 'N/A'}
              </div>
              <div className="text-sm text-gray-600">GPA</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{student.year || 'N/A'}</div>
              <div className="text-sm text-gray-600">Year</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{student.major || 'N/A'}</div>
              <div className="text-sm text-gray-600">Major</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{testResults.length}</div>
              <div className="text-sm text-gray-600">Test Results</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">
                {testResults.length > 0 
                  ? (testResults.reduce((sum, result) => sum + result.overall_score, 0) / testResults.length).toFixed(1)
                  : 'N/A'
                }%
              </div>
              <div className="text-sm text-gray-600">Avg Score</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
          <Card>
            <CardHeader>
              <CardTitle>Content Skill Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {contentSkills.length > 0 ? (
                <div className="space-y-3">
                  {contentSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.skill_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {skill.points_earned}/{skill.points_possible}
                        </span>
                        <Badge variant="outline">
                          {Number(skill.score).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No content skill scores available</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Subject Skill Scores</CardTitle>
            </CardHeader>
            <CardContent>
              {subjectSkills.length > 0 ? (
                <div className="space-y-3">
                  {subjectSkills.map((skill) => (
                    <div key={skill.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium">{skill.skill_name}</span>
                      <div className="flex items-center gap-2">
                        <span className="text-sm text-gray-600">
                          {skill.points_earned}/{skill.points_possible}
                        </span>
                        <Badge variant="outline">
                          {Number(skill.score).toFixed(1)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">No subject skill scores available</p>
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            {testResults.length > 0 ? (
              <div className="space-y-3">
                {testResults.map((result) => (
                  <div key={result.id} className="flex items-center justify-between p-3 rounded-lg border">
                    <div>
                      <p className="font-medium">Exam ID: {result.exam_id}</p>
                      <p className="text-sm text-gray-600">
                        {new Date(result.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">
                        {result.total_points_earned}/{result.total_points_possible}
                      </div>
                      <Badge 
                        className={
                          result.overall_score >= 90 ? 'bg-green-100 text-green-700' :
                          result.overall_score >= 80 ? 'bg-blue-100 text-blue-700' :
                          result.overall_score >= 70 ? 'bg-yellow-100 text-yellow-700' :
                          'bg-red-100 text-red-700'
                        }
                      >
                        {Number(result.overall_score).toFixed(1)}%
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-4">No test results available</p>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

  // Class Detail View
  if (selectedClass) {
    const classData = classes.find(cls => cls.id === selectedClass);
    if (!classData) return null;

    const enrolledStudents = allStudents.filter(student => 
      classData.students.includes(student.id)
    );

    return (
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setSelectedClass(null)} className="mb-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Classes
          </Button>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">{classData.name}</h1>
              <p className="text-gray-600 mt-1">Teacher: {classData.teacher}</p>
            </div>
            <div className="flex items-center gap-4">
              <AddStudentsDialog
                classId={classData.id}
                className={classData.name}
                onAddStudents={(studentIds) => handleAddStudents(classData.id, studentIds)}
                enrolledStudentIds={classData.students}
              />
              <div className="text-right">
                <div className="text-2xl font-bold text-gray-900">{classData.avg_gpa || 0}</div>
                <div className="text-sm text-gray-600">Class Average GPA</div>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.student_count}</div>
              <div className="text-sm text-gray-600">Total Students</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.subject}</div>
              <div className="text-sm text-gray-600">Subject</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">Grade {classData.grade}</div>
              <div className="text-sm text-gray-600">Grade Level</div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="students" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="skills" className="flex items-center gap-2">
              <Target className="h-4 w-4" />
              Content Skills
            </TabsTrigger>
          </TabsList>

          <TabsContent value="students">
            <Card>
              <CardHeader>
                <CardTitle>Class Roster</CardTitle>
              </CardHeader>
              <CardContent>
                {classData.student_count === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                    <p className="text-gray-600 mb-4">Students will appear here once they are added to this class.</p>
                    <AddStudentsDialog
                      classId={classData.id}
                      className={classData.name}
                      onAddStudents={(studentIds) => handleAddStudents(classData.id, studentIds)}
                      enrolledStudentIds={classData.students}
                    />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {enrolledStudents.map((student) => (
                      <div 
                        key={student.id}
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                        onClick={() => handleStudentClick(student.id, classData.id, classData.name)}
                      >
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="text-xs">
                              {student.name.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <span className="font-medium">{student.name}</span>
                            <p className="text-sm text-gray-600">{student.email || 'No email'}</p>
                          </div>
                        </div>
                        <Badge variant="outline">
                          GPA: {student.gpa ? Number(student.gpa).toFixed(2) : 'N/A'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="skills">
            <ClassContentSkills activeClass={classData} />
          </TabsContent>
        </Tabs>
      </div>
    );
  }

  // Classes List View
  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Classes</h1>
            <p className="text-gray-600">Manage student classes and sections</p>
          </div>
          <CreateClassDialog onCreateClass={handleCreateClass} />
        </div>

        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            placeholder="Search classes or teachers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="max-w-md"
          />
          <Select value={filterSubject} onValueChange={setFilterSubject}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map((subject) => (
                <SelectItem key={subject} value={subject}>{subject}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <p className="text-sm text-gray-500">
          Showing {filteredClasses.length} of {classes.length} classes
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClasses.map((classItem) => (
          <Card 
            key={classItem.id}
            className="hover:shadow-lg transition-shadow"
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div 
                  className="cursor-pointer flex-1"
                  onClick={() => setSelectedClass(classItem.id)}
                >
                  <h3 className="font-semibold text-lg text-gray-900">{classItem.name}</h3>
                  <p className="text-gray-600 text-sm">{classItem.teacher}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">Grade {classItem.grade}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete "{classItem.name}"? This action cannot be undone and will remove all class data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                          onClick={() => handleDeleteClass(classItem.id, classItem.name)}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          Delete
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
              
              <div 
                className="space-y-2 cursor-pointer"
                onClick={() => setSelectedClass(classItem.id)}
              >
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-medium">{classItem.student_count}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg GPA:</span>
                  <span className="font-medium">{classItem.avg_gpa || 'N/A'}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Subject:</span>
                  <span className="font-medium">{classItem.subject}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredClasses.length === 0 && !loading && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or create a new class</p>
        </div>
      )}
    </div>
  );
}
