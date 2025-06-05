
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import type { ActiveStudent, ActiveClass } from "@/services/examService";

interface StudentProfileHeaderProps {
  student: ActiveStudent;
  isClassView: boolean;
  className?: string;
  classData?: ActiveClass;
  overallGrade: number;
  onBack: () => void;
}

export function StudentProfileHeader({
  student,
  isClassView,
  className,
  classData,
  overallGrade,
  onBack
}: StudentProfileHeaderProps) {
  const getGradeColor = (grade: string | number) => {
    const numGrade = typeof grade === 'string' ? 
      (grade.startsWith('A') ? 90 : grade.startsWith('B') ? 80 : grade.startsWith('C') ? 70 : 60) : 
      grade;
    
    if (numGrade >= 90) return 'bg-green-100 text-green-700';
    if (numGrade >= 80) return 'bg-blue-100 text-blue-700';
    if (numGrade >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <div className="mb-6">
      <Button variant="ghost" onClick={onBack} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to {isClassView ? 'Class' : 'Dashboard'}
      </Button>
      
      <div className="flex items-start gap-6">
        <Avatar className="h-20 w-20">
          <AvatarFallback className="text-2xl">
            {student.name.split(' ').map(n => n[0]).join('')}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
          {isClassView ? (
            <p className="text-gray-600 mt-1">Performance in {className}</p>
          ) : (
            <p className="text-gray-600 mt-1">{student.email}</p>
          )}
          <div className="flex items-center gap-4 mt-3">
            {!isClassView && (
              <>
                {student.year && <Badge variant="outline">{student.year}</Badge>}
                {student.major && <Badge variant="outline">{student.major}</Badge>}
                <Badge className="bg-green-100 text-green-700">Active</Badge>
              </>
            )}
            {isClassView && classData && (
              <>
                <Badge variant="outline">{classData.subject}</Badge>
                {overallGrade > 0 && (
                  <Badge className={getGradeColor(overallGrade)}>
                    {overallGrade}%
                  </Badge>
                )}
              </>
            )}
          </div>
        </div>
        
        <div className="text-right">
          {isClassView ? (
            <>
              <div className="text-2xl font-bold text-gray-900">{overallGrade}%</div>
              <div className="text-sm text-gray-600">Class Grade</div>
            </>
          ) : (
            <>
              <div className="text-2xl font-bold text-gray-900">{student.gpa || 'N/A'}</div>
              <div className="text-sm text-gray-600">Current GPA</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
