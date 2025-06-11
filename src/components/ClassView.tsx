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
import { Users, BookOpen, TrendingUp, Trash2, ArrowLeft, Target, UserX, IdCard } from "lucide-react";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { AddStudentsDialog } from "@/components/AddStudentsDialog";
import { ClassContentSkills } from "@/components/ClassContentSkills";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { 
  getAllActiveClasses, 
  createActiveClass, 
  updateActiveClass, 
  deleteActiveClass, 
  deleteActiveClassOnly,
  getClassDeletionInfo,
  getAllActiveStudents,
  getSubjectSkillsBySubjectAndGrade,
  linkClassToSubjectSkills,
  type ActiveClass,
  type ActiveStudent
} from "@/services/examService";

interface ClassViewProps {
  onSelectStudent: (studentId: string, classId?: string, className?: string) => void;
}

export function ClassView({ onSelectStudent }: ClassViewProps) {
  const { profile } = useAuth();
  const [classes, setClasses] = useState<ActiveClass[]>([]);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [allStudents, setAllStudents] = useState<ActiveStudent[]>([]);
  const [deletionInfo, setDeletionInfo] = useState<{examCount: number; answerKeyCount: number; testResultCount: number} | null>(null);
  const [loadingDeletionInfo, setLoadingDeletionInfo] = useState(false);

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

  const handleCreateClass = async (classData: { name: string; subject: string; grade: string; teacher: string; dayOfWeek?: string[]; classTime?: string; endTime?: string }) => {
    try {
      const newClass = await createActiveClass(classData);
      setClasses([...classes, newClass]);
      
      // Auto-link subject skills for Math Grade 10 classes
      if (classData.subject === 'Math' && classData.grade === 'Grade 10') {
        try {
          console.log('Auto-linking subject skills for Math Grade 10 class:', newClass.id);
          const subjectSkills = await getSubjectSkillsBySubjectAndGrade('Math', 'Grade 10');
          const skillIds = subjectSkills.map(skill => skill.id);
          
          if (skillIds.length > 0) {
            await linkClassToSubjectSkills(newClass.id, skillIds);
            console.log(`Successfully auto-linked ${skillIds.length} Math Grade 10 subject skills to class ${newClass.id}`);
          }
        } catch (skillError) {
          console.warn('Failed to auto-link subject skills to new Math Grade 10 class:', skillError);
          // Don't fail the class creation if skill linking fails
        }
      }
      
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
      toast.success(`Class "${className}" and all associated data have been deleted`);
    } catch (error) {
      console.error('Error deleting class:', error);
      toast.error('Failed to delete class. Please try again.');
    }
  };

  const handleDeleteClassOnly = async (classId: string, className: string) => {
    try {
      await deleteActiveClassOnly(classId);
      setClasses(prevClasses => prevClasses.filter(cls => cls.id !== classId));
      toast.success(`Class "${className}" has been deleted while preserving historical test data`);
    } catch (error) {
      console.error('Error deleting class only:', error);
      toast.error('Failed to delete class. Please try again.');
    }
  };

  const handleGetDeletionInfo = async (classId: string) => {
    try {
      setLoadingDeletionInfo(true);
      const info = await getClassDeletionInfo(classId);
      setDeletionInfo(info);
    } catch (error) {
      console.error('Error getting deletion info:', error);
      toast.error('Failed to get deletion information');
    } finally {
      setLoadingDeletionInfo(false);
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

  const handleRemoveStudent = async (classId: string, studentId: string, studentName: string) => {
    try {
      const classToUpdate = classes.find(cls => cls.id === classId);
      if (!classToUpdate) return;

      const updatedStudents = classToUpdate.students.filter(id => id !== studentId);
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

      toast.success(`${studentName} has been removed from the class`);
    } catch (error) {
      console.error('Error removing student:', error);
      toast.error('Failed to remove student. Please try again.');
    }
  };

  const handleStudentClick = (studentId: string, classId: string, className: string) => {
    // Pass the class context to the parent component
    onSelectStudent(studentId, classId, className);
  };

  const formatClassSchedule = (classItem: ActiveClass) => {
    if (!classItem.day_of_week || classItem.day_of_week.length === 0) {
      return 'No schedule set';
    }

    const days = classItem.day_of_week.map(day => day.slice(0, 3)).join('/');
    
    if (classItem.class_time && classItem.end_time) {
      const startTime = new Date(`2024-01-01 ${classItem.class_time}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      const endTime = new Date(`2024-01-01 ${classItem.end_time}`).toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      });
      return `${days} ${startTime}-${endTime}`;
    }
    
    return days;
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
              <div className="flex items-center gap-3 mt-1">
                <p className="text-gray-600">Teacher: {classData.teacher}</p>
                {profile?.teacher_id && (
                  <Badge variant="secondary" className="flex items-center gap-1">
                    <IdCard className="h-3 w-3" />
                    {profile.teacher_id}
                  </Badge>
                )}
              </div>
              {classData.day_of_week && classData.day_of_week.length > 0 && (
                <p className="text-gray-600 mt-1">Schedule: {formatClassSchedule(classData)}</p>
              )}
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
              <div className="text-2xl font-bold">{classData.grade}</div>
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
                        className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50"
                      >
                        <div 
                          className="flex items-center gap-3 cursor-pointer flex-1"
                          onClick={() => handleStudentClick(student.id, classData.id, classData.name)}
                        >
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
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">
                            GPA: {student.gpa ? Number(student.gpa).toFixed(2) : 'N/A'}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <UserX className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Student</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove "{student.name}" from "{classData.name}"? This action will remove them from the class roster but will not delete their test results or data.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction 
                                  onClick={() => handleRemoveStudent(classData.id, student.id, student.name)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Remove Student
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
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
                  {classItem.day_of_week && classItem.day_of_week.length > 0 && (
                    <p className="text-gray-500 text-xs mt-1">{formatClassSchedule(classItem)}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline">{classItem.grade}</Badge>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        onClick={() => handleGetDeletionInfo(classItem.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent className="max-w-md">
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Class Options</AlertDialogTitle>
                        <AlertDialogDescription className="space-y-3">
                          <p>Choose how you want to delete "{classItem.name}":</p>
                          
                          {loadingDeletionInfo ? (
                            <div className="text-center py-4">
                              <div className="text-sm text-gray-600">Loading deletion information...</div>
                            </div>
                          ) : deletionInfo && (
                            <div className="bg-gray-50 p-3 rounded-lg text-sm">
                              <p className="font-medium text-gray-900 mb-2">This class contains:</p>
                              <ul className="space-y-1 text-gray-600">
                                <li>• {deletionInfo.examCount} exam(s)</li>
                                <li>• {deletionInfo.answerKeyCount} answer key(s)</li>
                                <li>• {deletionInfo.testResultCount} test result(s)</li>
                              </ul>
                            </div>
                          )}

                          <div className="space-y-2">
                            <div className="border rounded-lg p-3">
                              <p className="font-medium text-green-700 mb-1">🗂️ Delete Class Only (Recommended)</p>
                              <p className="text-sm text-gray-600">
                                Removes the class but preserves all historical test data, exams, and results for future reference.
                              </p>
                            </div>
                            
                            <div className="border rounded-lg p-3">
                              <p className="font-medium text-red-700 mb-1">🗑️ Delete Everything</p>
                              <p className="text-sm text-gray-600">
                                Permanently deletes the class and ALL associated data. This cannot be undone.
                              </p>
                            </div>
                          </div>
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter className="flex-col gap-2">
                        <div className="flex gap-2 w-full">
                          <AlertDialogCancel className="flex-1">Cancel</AlertDialogCancel>
                          <AlertDialogAction 
                            onClick={() => handleDeleteClassOnly(classItem.id, classItem.name)}
                            className="flex-1 bg-green-600 hover:bg-green-700"
                          >
                            Delete Class Only
                          </AlertDialogAction>
                        </div>
                        <AlertDialogAction 
                          onClick={() => handleDeleteClass(classItem.id, classItem.name)}
                          className="w-full bg-red-600 hover:bg-red-700"
                        >
                          Delete Everything
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
