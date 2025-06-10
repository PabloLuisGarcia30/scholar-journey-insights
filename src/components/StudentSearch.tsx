
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { GraduationCap, AlertTriangle, Settings, Search, Users, Plus } from "lucide-react";
import { AddStudentDialog } from "@/components/AddStudentDialog";
import { StudentIdManagement } from "@/components/StudentIdManagement";
import { getAllActiveStudents, type ActiveStudent, getAllActiveClasses, type ActiveClass } from "@/services/examService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface StudentSearchProps {
  onSelectStudent: (studentId: string) => void;
}

interface StudentWithIdStatus extends ActiveStudent {
  hasStudentId?: boolean;
  studentIdFromProfile?: string;
  enrolledClasses?: ActiveClass[];
}

export function StudentSearch({ onSelectStudent }: StudentSearchProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterMajor, setFilterMajor] = useState<string>('all');
  const [filterClass, setFilterClass] = useState<string>('all');
  const [filteredStudents, setFilteredStudents] = useState<StudentWithIdStatus[]>([]);
  const [allStudents, setAllStudents] = useState<StudentWithIdStatus[]>([]);
  const [allClasses, setAllClasses] = useState<ActiveClass[]>([]);
  const [loading, setLoading] = useState(true);
  const [showManagement, setShowManagement] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load students and classes
      const [students, classes] = await Promise.all([
        getAllActiveStudents(),
        getAllActiveClasses()
      ]);
      
      setAllClasses(classes);

      // Get student profiles with IDs
      const { data: profiles, error } = await supabase
        .from('student_profiles')
        .select('student_name, student_id');

      if (error) {
        console.error('Error fetching student profiles:', error);
      }

      // Enhance students with class enrollment data
      const studentsWithStatus: StudentWithIdStatus[] = await Promise.all(
        students.map(async (student) => {
          const profile = profiles?.find(p => p.student_name === student.name);
          
          // Find classes where this student is enrolled
          const enrolledClasses = classes.filter(cls => 
            cls.students && cls.students.includes(student.id)
          );

          return {
            ...student,
            hasStudentId: !!profile?.student_id,
            studentIdFromProfile: profile?.student_id || undefined,
            enrolledClasses
          };
        })
      );

      setAllStudents(studentsWithStatus);
      setFilteredStudents(studentsWithStatus);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  };

  const loadStudents = async () => {
    await loadData();
  };

  const handleSearch = (term: string) => {
    setSearchTerm(term);
    applyFilters(term, filterMajor, filterClass);
  };

  const handleMajorFilter = (majorFilter: string) => {
    setFilterMajor(majorFilter);
    applyFilters(searchTerm, majorFilter, filterClass);
  };

  const handleClassFilter = (classFilter: string) => {
    setFilterClass(classFilter);
    applyFilters(searchTerm, filterMajor, classFilter);
  };

  const applyFilters = (term: string, majorFilter: string, classFilter: string) => {
    let filtered = allStudents.filter(student =>
      student.name.toLowerCase().includes(term.toLowerCase()) ||
      (student.email && student.email.toLowerCase().includes(term.toLowerCase())) ||
      (student.major && student.major.toLowerCase().includes(term.toLowerCase())) ||
      (student.studentIdFromProfile && student.studentIdFromProfile.toLowerCase().includes(term.toLowerCase()))
    );

    if (majorFilter !== 'all') {
      filtered = filtered.filter(student => student.major === majorFilter);
    }

    if (classFilter !== 'all') {
      filtered = filtered.filter(student => 
        student.enrolledClasses && student.enrolledClasses.some(cls => cls.id === classFilter)
      );
    }

    setFilteredStudents(filtered);
  };

  const handleStudentAdded = () => {
    loadStudents();
  };

  const getGpaColor = (gpa?: number) => {
    if (!gpa) return 'text-gray-500';
    if (gpa >= 3.5) return 'text-green-600';
    if (gpa >= 3.0) return 'text-blue-600';
    return 'text-orange-600';
  };

  const getGpaBackground = (gpa?: number) => {
    if (!gpa) return 'bg-gray-50';
    if (gpa >= 3.5) return 'bg-green-50';
    if (gpa >= 3.0) return 'bg-blue-50';
    return 'bg-orange-50';
  };

  const majors = [...new Set(allStudents.map(student => student.major).filter(Boolean))];
  const studentsWithoutIds = allStudents.filter(student => !student.hasStudentId).length;

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-lg text-slate-600">Loading your students...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (showManagement) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <button 
            onClick={() => setShowManagement(false)}
            className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium mb-6 transition-colors"
          >
            ← Back to Student Directory
          </button>
          <StudentIdManagement />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-2">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
                Student Directory
              </h1>
              <p className="text-lg text-slate-600">Discover and connect with your students</p>
            </div>
            <div className="flex items-center gap-3">
              {studentsWithoutIds > 0 && (
                <button
                  onClick={() => setShowManagement(true)}
                  className="flex items-center gap-2 px-4 py-2.5 text-orange-700 bg-orange-50 border border-orange-200 rounded-xl hover:bg-orange-100 transition-all duration-200 font-medium shadow-sm"
                >
                  <Settings className="h-4 w-4" />
                  Manage IDs ({studentsWithoutIds})
                </button>
              )}
              <AddStudentDialog onStudentAdded={handleStudentAdded} />
            </div>
          </div>

          {/* Search and Filter */}
          <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-sm border border-white/50">
            <div className="flex flex-col gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Search by name, email, major, or Student ID..."
                  value={searchTerm}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-11 h-12 border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm focus:bg-white transition-all duration-200"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4">
                <Select value={filterMajor} onValueChange={handleMajorFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm">
                    <SelectValue placeholder="Filter by major" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Majors</SelectItem>
                    {majors.map((major) => (
                      <SelectItem key={major} value={major!}>{major}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={filterClass} onValueChange={handleClassFilter}>
                  <SelectTrigger className="w-full sm:w-48 h-12 border-slate-200 rounded-xl bg-white/50 backdrop-blur-sm">
                    <SelectValue placeholder="Filter by class" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Classes</SelectItem>
                    {allClasses.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} ({cls.subject} - {cls.grade})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-200">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Users className="h-4 w-4" />
                <span>Showing {filteredStudents.length} of {allStudents.length} students</span>
              </div>
              {studentsWithoutIds > 0 && (
                <div className="flex items-center gap-2 text-sm text-orange-600">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{studentsWithoutIds} students need Student IDs</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Students Grid */}
        {filteredStudents.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStudents.map((student) => (
              <Card 
                key={student.id} 
                className="group hover:shadow-xl transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02]"
                onClick={() => onSelectStudent(student.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="relative">
                      <Avatar className="h-14 w-14 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300">
                        <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold text-lg">
                          {student.name.split(' ').map(n => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      {student.hasStudentId && (
                        <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white"></div>
                      )}
                    </div>
                    
                    <div className="flex-1 min-w-0 space-y-3">
                      <div>
                        <h3 className="font-semibold text-slate-900 text-lg truncate group-hover:text-blue-700 transition-colors">
                          {student.name}
                        </h3>
                        <p className="text-sm text-slate-500 truncate">{student.email || 'No email'}</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {student.year && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
                            {student.year}
                          </Badge>
                        )}
                        {student.hasStudentId && student.studentIdFromProfile ? (
                          <Badge className="bg-green-50 text-green-700 border-green-200">
                            ID: {student.studentIdFromProfile}
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            No ID
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        {student.major && (
                          <p className="text-sm text-slate-600 font-medium">{student.major}</p>
                        )}
                        
                        {student.enrolledClasses && student.enrolledClasses.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {student.enrolledClasses.slice(0, 2).map((cls) => (
                              <Badge key={cls.id} variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-xs">
                                {cls.name}
                              </Badge>
                            ))}
                            {student.enrolledClasses.length > 2 && (
                              <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200 text-xs">
                                +{student.enrolledClasses.length - 2} more
                              </Badge>
                            )}
                          </div>
                        )}
                        
                        <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${getGpaBackground(student.gpa)} ${getGpaColor(student.gpa)}`}>
                          GPA: {student.gpa ? Number(student.gpa).toFixed(2) : 'N/A'}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="max-w-md mx-auto">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-100 to-purple-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <GraduationCap className="h-12 w-12 text-slate-400" />
              </div>
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No students found</h3>
              <p className="text-slate-600 mb-6">Try adjusting your search criteria or add a new student to get started.</p>
              <AddStudentDialog onStudentAdded={handleStudentAdded} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
