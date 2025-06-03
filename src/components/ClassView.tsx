
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Users, BookOpen, TrendingUp } from "lucide-react";
import { CreateClassDialog } from "@/components/CreateClassDialog";

interface ClassViewProps {
  onSelectStudent: (studentId: string) => void;
}

// Mock class data - in a real app this would come from a database
const initialMockClasses = [
  {
    id: '1',
    name: 'Math Grade 6',
    subject: 'Mathematics',
    grade: '6',
    teacher: 'Ms. Johnson',
    studentCount: 28,
    avgGpa: 3.4,
    students: ['1', '2', '3', '4', '5']
  },
  {
    id: '2',
    name: 'Science Grade 7',
    subject: 'Science',
    grade: '7',
    teacher: 'Mr. Chen',
    studentCount: 24,
    avgGpa: 3.6,
    students: ['6', '7', '8', '9', '10']
  },
  {
    id: '3',
    name: 'English Grade 8',
    subject: 'English',
    grade: '8',
    teacher: 'Mrs. Williams',
    studentCount: 26,
    avgGpa: 3.5,
    students: ['11', '12', '13', '14', '15']
  },
  {
    id: '4',
    name: 'History Grade 9',
    subject: 'History',
    grade: '9',
    teacher: 'Dr. Brown',
    studentCount: 22,
    avgGpa: 3.3,
    students: ['16', '17', '18', '19', '20']
  }
];

// Mock students for class details
const mockStudents = [
  { id: '1', name: 'Sarah Johnson', gpa: 3.8 },
  { id: '2', name: 'Michael Chen', gpa: 3.2 },
  { id: '3', name: 'Emma Williams', gpa: 3.9 },
  { id: '4', name: 'David Brown', gpa: 3.1 },
  { id: '5', name: 'Lisa Garcia', gpa: 3.6 }
];

export function ClassView({ onSelectStudent }: ClassViewProps) {
  const [classes, setClasses] = useState(initialMockClasses);
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [filterSubject, setFilterSubject] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreateClass = (classData: { name: string; subject: string; grade: string; teacher: string }) => {
    const newClass = {
      id: (classes.length + 1).toString(),
      ...classData,
      studentCount: 0,
      avgGpa: 0,
      students: []
    };
    setClasses([...classes, newClass]);
  };

  const filteredClasses = classes.filter(cls => {
    const matchesSearch = cls.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         cls.teacher.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesSubject = filterSubject === 'all' || cls.subject === filterSubject;
    return matchesSearch && matchesSubject;
  });

  const subjects = [...new Set(classes.map(cls => cls.subject))];

  if (selectedClass) {
    const classData = classes.find(cls => cls.id === selectedClass);
    if (!classData) return null;

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
            <div className="text-right">
              <div className="text-2xl font-bold text-gray-900">{classData.avgGpa}</div>
              <div className="text-sm text-gray-600">Class Average GPA</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <Users className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.studentCount}</div>
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
            {classData.studentCount === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No students enrolled</h3>
                <p className="text-gray-600">Students will appear here once they are added to this class.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {mockStudents.map((student) => (
                  <div 
                    key={student.id}
                    className="flex items-center justify-between p-3 rounded-lg border hover:bg-gray-50 cursor-pointer"
                    onClick={() => onSelectStudent(student.id)}
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
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => setSelectedClass(classItem.id)}
          >
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <h3 className="font-semibold text-lg text-gray-900">{classItem.name}</h3>
                  <p className="text-gray-600 text-sm">{classItem.teacher}</p>
                </div>
                <Badge variant="outline">Grade {classItem.grade}</Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Students:</span>
                  <span className="font-medium">{classItem.studentCount}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Avg GPA:</span>
                  <span className="font-medium">{classItem.avgGpa || 'N/A'}</span>
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

      {filteredClasses.length === 0 && (
        <div className="text-center py-12">
          <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No classes found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or create a new class</p>
        </div>
      )}
    </div>
  );
}
