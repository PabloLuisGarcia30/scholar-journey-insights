
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, AlertTriangle, Settings } from "lucide-react";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { StudentIdManagement } from "@/components/StudentIdManagement";
import { getAllActiveStudents, type ActiveStudent } from "@/services/examService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentSearchProps {
  onSelectStudent: (studentId: string) => void;
}

interface StudentWithIdStatus extends ActiveStudent {
  hasStudentId?: boolean;
  studentIdFromProfile?: string;
}

export function StudentSearch({ onSelectStudent }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMajor, setFilterMajor] = useState<string>('all');
  const [filteredStudents, setFilteredStudents] = useState<StudentWithIdStatus[]>([]);
  const [allStudents, setAllStudents] = useState<StudentWithIdStatus[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManagement, setShowManagement] = useState(false);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      
      // Get all active students
      const students = await getAllActiveStudents();
      
      // Get student profiles to check for Student IDs
      const { data: profiles, error } = await supabase
        .from('student_profiles')
        .select('student_name, student_id');

      if (error) {
        console.error('Error fetching student profiles:', error);
      }

      // Map students with Student ID status
      const studentsWithStatus: StudentWithIdStatus[] = students.map(student => {
        const profile = profiles?.find(p => p.student_name === student.name);
        return {
          ...student,
          hasStudentId: !!profile?.student_id,
          studentIdFromProfile: profile?.student_id || undefined
        };
      });

      setAllStudents(studentsWithStatus);
      setFilteredStudents(studentsWithStatus);
    } catch (error) {
      console.error('Error loading students:', error);
      toast.error('Failed to load students');
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, filterMajor);
  };

  const handleMajorFilter = (majorFilter: string) => {
    setFilterMajor(majorFilter);
    applyFilters(searchTerm, majorFilter);
  };

  const applyFilters = (term: string, majorFilter: string) => {
    let filtered = allStudents.filter(student =>
      student.name.toLowerCase().includes(term.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(term.toLowerCase())) ||
      (student.major && student.major.toLowerCase().includes(term.toLowerCase())) ||
      (student.studentIdFromProfile && student.studentIdFromProfile.toLowerCase().includes(term.toLowerCase()))
    );

    if (majorFilter !== 'all') {
      filtered = filtered.filter(student => student.major === majorFilter);
    }

    setFilteredStudents(filtered);
  };

  const handleStudentAdded = () => {
    loadStudents();
  };

  const getStatusColor = (gpa?: number) => {
    if (!gpa) return 'bg-gray-100 text-gray-700';
    if (gpa >= 3.5) return 'bg-green-100 text-green-700';
    if (gpa >= 3.0) return 'bg-blue-100 text-blue-700';
    return 'bg-red-100 text-red-700';
  };

  const getStatusText = (gpa?: number) => {
    if (!gpa) return 'No GPA';
    if (gpa >= 3.5) return 'Excellent';
    if (gpa >= 3.0) return 'Good Standing';
    return 'At Risk';
  };

  const getStudentIdBadge = (student: StudentWithIdStatus) => {
    if (student.hasStudentId && student.studentIdFromProfile) {
      return (
        <Badge variant="outline" className="text-green-600 border-green-300 bg-green-50">
          ID: {student.studentIdFromProfile}
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="text-orange-600 border-orange-300 bg-orange-50">
          <AlertTriangle className="h-3 w-3 mr-1" />
          No ID
        </Badge>
      );
    }
  };

  const majors = [...new Set(allStudents.map(student => student.major).filter(Boolean))];
  const studentsWithoutIds = allStudents.filter(student => !student.hasStudentId).length;

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading students...</div>
        </div>
      </div>
    );
  }

  if (showManagement) {
    return (
      <div className="p-6">
        <div className="mb-4">
          <button 
            onClick={() => setShowManagement(false)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium"
          >
            ← Back to Student Directory
          </button>
        </div>
        <StudentIdManagement />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-2">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Student Directory</h1>
            <p className="text-gray-600">Search and manage student profiles</p>
          </div>
          <div className="flex gap-2">
            {studentsWithoutIds > 0 && (
              <button
                onClick={() => setShowManagement(true)}
                className="flex items-center gap-2 px-4 py-2 text-orange-600 bg-orange-50 border border-orange-200 rounded-lg hover:bg-orange-100 transition-colors"
              >
                <Settings className="h-4 w-4" />
                Manage IDs ({studentsWithoutIds} missing)
              </button>
            )}
            <AddStudentDialog onStudentAdded={handleStudentAdded} />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            placeholder="Search by name, email, major, or Student ID..."
            value={searchTerm}
            onChange={(e) => handleSearch(e.target.value)}
            className="max-w-md"
          />
          <Select value={filterMajor} onValueChange={handleMajorFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by major" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Majors</SelectItem>
              {majors.map((major) => (
                <SelectItem key={major} value={major!}>{major}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredStudents.length} of {allStudents.length} students
          {studentsWithoutIds > 0 && (
            <span className="ml-2 text-orange-600">
              • {studentsWithoutIds} students need Student IDs
            </span>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredStudents.map((student) => (
          <Card 
            key={student.id} 
            className="hover:shadow-lg transition-shadow cursor-pointer"
            onClick={() => onSelectStudent(student.id)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-10 w-10">
                  <AvatarFallback>
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{student.name}</h3>
                  <p className="text-sm text-gray-600 truncate">{student.email || 'No email'}</p>
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    {student.year && <Badge variant="outline">{student.year}</Badge>}
                    <Badge variant="outline" className={getStatusColor(student.gpa)}>
                      {getStatusText(student.gpa)}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    {getStudentIdBadge(student)}
                  </div>
                  <div className="mt-2">
                    {student.major && <p className="text-sm text-gray-600">{student.major}</p>}
                    <p className="text-sm font-medium text-gray-900">
                      GPA: {student.gpa ? Number(student.gpa).toFixed(2) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && !loading && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600">Try adjusting your search criteria or add a new student</p>
        </div>
      )}
    </div>
  );
}
