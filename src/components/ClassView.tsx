
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Users, BookOpen, TrendingUp, Trash2 } from "lucide-react";
import { CreateClassDialog } from "@/components/CreateClassDialog";
import { AddStudentsDialog } from "@/components/AddStudentsDialog";
import { toast } from "sonner";
import { getAllActiveClasses, createActiveClass, updateActiveClass, deleteActiveClass, type ActiveClass } from "@/services/examService";

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
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadClasses();
  }, []);

  const loadClasses = async () => {
    try {
      setLoading(true);
      const activeClasses = await getAllActiveClasses();
      setClasses(activeClasses);
    } catch (error) {
      console.error('Error loading classes:', error);
      toast.error('Failed to load classes');
    } finally {
      setLoading(false);
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
      const studentGpas = mockStudents
        .filter(s => updatedStudents.includes(s.id))
        .map(s => s.gpa);
      const avgGpa = studentGpas.length > 0 
        ? Number((studentGpas.reduce((sum, gpa) => sum + gpa, 0) / studentGpas.length).toFixed(1))
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

  if (selectedClass) {
    const classData = classes.find(cls => cls.id === selectedClass);
    if (!classData) return null;

    const enrolledStudents = mockStudents.filter(student => 
      classData.students.includes(student.id)
    );

    return (
      <div className="p-6">
        <div className="mb-6">
          <Button variant="ghost" onClick={() => setSelectedClass(null)} className="mb-4">
            ← Back to Classes
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
                <div className="text-2xl font-bold text-gray-900">{classData.avg_gpa}</div>
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
                    onClick={() => onSelectStudent(student.id, classData.id, classData.name)}
                  >
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{student.name}</span>
                    </div>
                    <Badge variant="outline">GPA: {student.gpa}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    );
  }

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
