
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap } from "lucide-react";

interface StudentSearchProps {
  onSelectStudent: (studentId: string) => void;
}

// Mock data for demonstration with class assignments
const mockStudents = Array.from({ length: 50 }, (_, i) => ({
  id: String(i + 1),
  name: `Student ${i + 1}`,
  email: `student${i + 1}@university.edu`,
  gpa: Number((Math.random() * 2 + 2).toFixed(2)),
  year: ['Freshman', 'Sophomore', 'Junior', 'Senior'][Math.floor(Math.random() * 4)],
  major: ['Computer Science', 'Mathematics', 'Physics', 'Biology', 'Chemistry'][Math.floor(Math.random() * 5)],
  status: Math.random() > 0.8 ? 'At Risk' : Math.random() > 0.3 ? 'Good Standing' : 'Excellent',
  class: ['Math Grade 6', 'Science Grade 7', 'English Grade 8', 'History Grade 9'][Math.floor(Math.random() * 4)]
}));

const classes = [...new Set(mockStudents.map(student => student.class))];

export function StudentSearch({ onSelectStudent }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filteredStudents, setFilteredStudents] = useState(mockStudents);

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, filterClass);
  };

  const handleClassFilter = (classFilter: string) => {
    setFilterClass(classFilter);
    applyFilters(searchTerm, classFilter);
  };

  const applyFilters = (term: string, classFilter: string) => {
    let filtered = mockStudents.filter(student =>
      student.name.toLowerCase().includes(term.toLowerCase()) ||
      student.email.toLowerCase().includes(term.toLowerCase()) ||
      student.major.toLowerCase().includes(term.toLowerCase())
    );

    if (classFilter !== 'all') {
      filtered = filtered.filter(student => student.class === classFilter);
    }

    setFilteredStudents(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Excellent': return 'bg-green-100 text-green-700';
      case 'Good Standing': return 'bg-blue-100 text-blue-700';
      case 'At Risk': return 'bg-red-100 text-red-700';
      default: return 'bg-gray-100 text-gray-700';
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Student Directory</h1>
        <p className="text-gray-600">Search and manage student profiles</p>
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
          <Select value={filterClass} onValueChange={handleClassFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((className) => (
                <SelectItem key={className} value={className}>{className}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Showing {filteredStudents.length} of {mockStudents.length} students
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
                  <p className="text-sm text-gray-600 truncate">{student.email}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge variant="outline">{student.year}</Badge>
                    <Badge variant="outline" className={getStatusColor(student.status)}>
                      {student.status}
                    </Badge>
                  </div>
                  <div className="mt-2">
                    <p className="text-xs text-blue-600 font-medium">{student.class}</p>
                    <p className="text-sm text-gray-600">{student.major}</p>
                    <p className="text-sm font-medium text-gray-900">GPA: {student.gpa}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredStudents.length === 0 && (
        <div className="text-center py-12">
          <GraduationCap className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No students found</h3>
          <p className="text-gray-600">Try adjusting your search criteria</p>
        </div>
      )}
    </div>
  );
}
