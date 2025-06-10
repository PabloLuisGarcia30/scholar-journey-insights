
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, User } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents } from "@/services/examService";

interface ClassStudentListProps {
  classId: string;
  className: string;
  onSelectStudent: (studentId: string, studentName: string) => void;
}

export function ClassStudentList({ classId, className, onSelectStudent }: ClassStudentListProps) {
  const { data: allStudents = [], isLoading } = useQuery({
    queryKey: ['allActiveStudents'],
    queryFn: getAllActiveStudents,
  });

  // Filter students who are enrolled in this class
  const classStudents = allStudents.filter(student => 
    // This assumes the class has a students array with student IDs
    // You may need to adjust this logic based on your data structure
    true // For now, show all students - you can filter by class enrollment later
  );

  if (isLoading) {
    return (
      <div className="mt-6">
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (classStudents.length === 0) {
    return (
      <div className="mt-6">
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
          <CardContent className="p-8 text-center">
            <User className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-slate-700 mb-2">No Students Found</h3>
            <p className="text-slate-500">No students are currently enrolled in {className}.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-slate-900 mb-1">
          Select a Student for Individualized Planning
        </h3>
        <p className="text-sm text-slate-600">
          Choose a student from {className} to create a personalized lesson plan
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {classStudents.map((student) => (
          <Card 
            key={student.id} 
            className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.02]"
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar className="h-10 w-10 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300">
                  <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                    {student.name}
                  </h4>
                  <p className="text-xs text-slate-500 truncate">{student.email || 'No email'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 mb-3">
                {student.year && (
                  <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                    {student.year}
                  </Badge>
                )}
                {student.gpa && (
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    GPA: {Number(student.gpa).toFixed(1)}
                  </Badge>
                )}
              </div>

              <Button 
                onClick={() => onSelectStudent(student.id, student.name)}
                className="w-full h-8 text-sm bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2"
              >
                <BookOpen className="h-3 w-3" />
                Create Lesson Plan
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
