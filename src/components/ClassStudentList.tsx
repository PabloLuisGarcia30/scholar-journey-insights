import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { User, TrendingDown } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents, getActiveClassById } from "@/services/examService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { getMasteryColor } from "@/utils/studentProfileUtils";
import { useState } from "react";

interface ClassStudentListProps {
  classId: string;
  className: string;
  onSelectStudent: (studentId: string, studentName: string) => void;
}

interface StudentCardProps {
  student: any;
  classId: string;
  className: string;
}

function WeakestSkillCircle({ skillName, score }: { skillName: string; score: number }) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getGradientColors = (score: number) => {
    // Treat score as already being a percentage (0-100)
    const percentage = score;
    if (percentage >= 80) {
      return {
        color1: "#10b981", // emerald-500
        color2: "#059669", // emerald-600
        color3: "#047857"  // emerald-700
      };
    }
    if (percentage >= 70) {
      return {
        color1: "#3b82f6", // blue-500
        color2: "#2563eb", // blue-600
        color3: "#1d4ed8"  // blue-700
      };
    }
    if (percentage >= 60) {
      return {
        color1: "#eab308", // yellow-500
        color2: "#f59e0b", // amber-500
        color3: "#d97706"  // amber-600
      };
    }
    if (percentage >= 50) {
      return {
        color1: "#f97316", // orange-500
        color2: "#ea580c", // orange-600
        color3: "#dc2626"  // red-600
      };
    }
    return {
      color1: "#ef4444", // red-500
      color2: "#dc2626", // red-600
      color3: "#b91c1c"  // red-700
    };
  };

  const gradientColors = getGradientColors(score);
  const gradientId = `gradient-weakest-skill-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col items-center min-w-0">
      <div 
        className="relative w-8 h-8 mb-1 flex-shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg className="w-8 h-8" viewBox="0 0 32 32">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.color1} />
              <stop offset="50%" stopColor={gradientColors.color2} />
              <stop offset="100%" stopColor={gradientColors.color3} />
            </linearGradient>
          </defs>
          <circle
            cx="16"
            cy="16"
            r="13"
            fill={`url(#${gradientId})`}
            style={{ 
              filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
              transform: isHovered ? 'scale(1.05)' : 'scale(1)',
              transformOrigin: 'center',
            }}
            className="transition-all duration-300 ease-in-out"
          />
        </svg>
        
        {/* Percentage in center */}
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-[9px] font-bold text-white drop-shadow-sm">
            {Math.round(score)}%
          </span>
        </div>
      </div>

      {/* Skill name and context */}
      <div className="text-center w-full min-w-0">
        <div className="flex items-center gap-0.5 justify-center mb-0.5">
          <TrendingDown className="h-2 w-2 text-orange-600 flex-shrink-0" />
          <span className="text-[8px] font-medium text-orange-700">Weakest</span>
        </div>
        <p className="text-[8px] text-slate-700 font-medium leading-tight break-words hyphens-auto">
          {skillName}
        </p>
      </div>
    </div>
  );
}

function StudentCard({ student, classId, className }: StudentCardProps) {
  // Get student profile data to find weakest content skill
  const { contentSkillScores, contentSkillsLoading } = useStudentProfileData({
    studentId: student.id,
    classId,
    className
  });

  // Find the weakest content skill (absolute lowest score)
  const weakestSkill = contentSkillScores
    .sort((a, b) => a.score - b.score)[0]; // Get the lowest scoring skill

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.01] max-w-lg">
      <CardContent className="p-2">
        <div className="flex items-center gap-3">
          <Avatar className="h-7 w-7 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold text-xs">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-700 transition-colors">
              {student.name}
            </h4>
            <p className="text-[10px] text-slate-500 truncate">{student.email || 'No email'}</p>
            
            <div className="flex flex-wrap gap-1 mt-0.5">
              {student.year && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-blue-50 text-blue-700 border-blue-200">
                  {student.year}
                </Badge>
              )}
              {student.gpa && (
                <Badge variant="outline" className="text-[8px] px-1 py-0 bg-green-50 text-green-700 border-green-200">
                  GPA: {Number(student.gpa).toFixed(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Weakest Skill Circle - positioned closer */}
          <div className="flex-shrink-0">
            {contentSkillsLoading ? (
              <div className="w-16 flex justify-center items-center h-12">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              </div>
            ) : weakestSkill ? (
              <WeakestSkillCircle 
                skillName={weakestSkill.skill_name}
                score={weakestSkill.score}
              />
            ) : (
              <div className="flex flex-col items-center w-16">
                <div className="w-8 h-8 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-1">
                  <span className="text-[9px] font-bold text-slate-500">?</span>
                </div>
                <p className="text-[8px] text-slate-500 font-medium text-center">
                  No data
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassStudentList({ classId, className, onSelectStudent }: ClassStudentListProps) {
  const { data: allStudents = [], isLoading: studentsLoading } = useQuery({
    queryKey: ['allActiveStudents'],
    queryFn: getAllActiveStudents,
  });

  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => getActiveClassById(classId),
    enabled: !!classId,
  });

  // Filter students who are enrolled in this class
  const classStudents = allStudents.filter(student => 
    classData?.students?.includes(student.id)
  );

  const isLoading = studentsLoading || classLoading;

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
          Student Skill Overview
        </h3>
        <p className="text-sm text-slate-600">
          View each student's weakest content skill in {className} - automatically identified based on their performance
        </p>
      </div>

      <div className="space-y-2 max-w-2xl">
        {classStudents.map((student) => (
          <StudentCard 
            key={student.id}
            student={student}
            classId={classId}
            className={className}
          />
        ))}
      </div>
    </div>
  );
}
