
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { getAllActiveStudents, type ActiveStudent } from "@/services/examService";
import { toast } from "sonner";

interface StudentSearchProps {
  onSelectStudent: (studentId: string) => void;
}

export function StudentSearch({ onSelectStudent }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMajor, setFilterMajor] = useState<string>('all');
  const [filteredStudents, setFilteredStudents] = useState<ActiveStudent[]>([]);
  const [allStudents, setAllStudents] = useState<ActiveStudent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudents();
  }, []);

  const loadStudents = async () => {
    try {
      setLoading(true);
      const students = await getAllActiveStudents();
      setAllStudents(students);
      setFilteredStudents(students);
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
      (student.major && student.major.toLowerCase().includes(term.toLowerCase()))
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

  const majors = [...new Set(allStudents.map(student => student.major).filter(Boolean))];

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-center py-12">
          <div className="text-lg text-gray-600">Loading students...</div>
        </div>
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
          <AddStudentDialog onStudentAdded={handleStudentAdded} />
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-4 mb-4">
          <Input
            type="text"
            placeholder="Search by name, email, or major..."
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
                  <div className="flex items-center gap-2 mt-2">
                    {student.year && <Badge variant="outline">{student.year}</Badge>}
                    <Badge variant="outline" className={getStatusColor(student.gpa)}>
                      {getStatusText(student.gpa)}
                    </Badge>
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
