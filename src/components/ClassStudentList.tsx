
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, TrendingDown, Edit, Target } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents, getActiveClassById } from "@/services/examService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useState } from "react";
import { StudentSkillSelector } from "./StudentSkillSelector";

interface ClassStudentListProps {
  classId: string;
  className: string;
  onSelectStudent: (studentId: string, studentName: string) => void;
}

interface StudentCardProps {
  student: any;
  classId: string;
  className: string;
  onEdit: (studentId: string) => void;
  targetSkill?: { skill_name: string; score: number } | null;
}

function WeakestSkillCircle({ skillName, score, isTargetSkill = false }: { skillName: string; score: number; isTargetSkill?: boolean }) {
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
  const gradientId = `gradient-skill-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col items-center min-w-0">
      <div 
        className="relative w-16 h-16 mb-2 flex-shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        <svg className="w-16 h-16" viewBox="0 0 64 64">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.color1} />
              <stop offset="50%" stopColor={gradientColors.color2} />
              <stop offset="100%" stopColor={gradientColors.color3} />
            </linearGradient>
          </defs>
          <circle
            cx="32"
            cy="32"
            r="26"
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
          <span className="text-sm font-bold text-white drop-shadow-sm">
            {Math.round(score)}%
          </span>
        </div>
      </div>

      {/* Skill name and context */}
      <div className="text-center w-full min-w-0">
        <div className="flex items-center gap-1 justify-center mb-1">
          {isTargetSkill ? (
            <>
              <Target className="h-3 w-3 text-blue-600 flex-shrink-0" />
              <span className="text-sm font-medium text-blue-700">Target</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-3 w-3 text-orange-600 flex-shrink-0" />
              <span className="text-sm font-medium text-orange-700">Weakest</span>
            </>
          )}
        </div>
        <p className="text-sm text-slate-700 font-medium leading-tight break-words hyphens-auto">
          {skillName}
        </p>
      </div>
    </div>
  );
}

function StudentCard({ student, classId, className, onEdit, targetSkill }: StudentCardProps) {
  // Get student profile data to find weakest content skill
  const { contentSkillScores, contentSkillsLoading } = useStudentProfileData({
    studentId: student.id,
    classId,
    className
  });

  // Determine which skill to display
  const skillToDisplay = targetSkill || 
    contentSkillScores.sort((a, b) => a.score - b.score)[0]; // Get the lowest scoring skill

  const isTargetSkill = Boolean(targetSkill);

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.01] w-full max-w-lg">
      <CardContent className="p-3">
        <div className="flex items-center gap-2">
          <Avatar className="h-8 w-8 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold text-sm">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                {student.name}
              </h4>
              {isTargetSkill && (
                <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  Target
                </Badge>
              )}
            </div>
            <p className="text-xs text-slate-500 truncate">{student.email || 'No email'}</p>
            
            <div className="flex flex-wrap gap-1 mt-1">
              {student.year && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 border-blue-200">
                  {student.year}
                </Badge>
              )}
              {student.gpa && (
                <Badge variant="outline" className="text-xs px-1.5 py-0.5 bg-green-50 text-green-700 border-green-200">
                  GPA: {Number(student.gpa).toFixed(1)}
                </Badge>
              )}
            </div>
          </div>

          {/* Edit Button */}
          <div className="flex-shrink-0 mr-2">
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(student.id);
              }}
              className="h-8 w-8 p-0"
              title="Select target skill for lesson planning"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>

          {/* Skill Circle */}
          <div className="flex-shrink-0">
            {contentSkillsLoading ? (
              <div className="w-24 flex justify-center items-center h-20">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
              </div>
            ) : skillToDisplay ? (
              <WeakestSkillCircle 
                skillName={skillToDisplay.skill_name}
                score={skillToDisplay.score}
                isTargetSkill={isTargetSkill}
              />
            ) : (
              <div className="flex flex-col items-center w-24">
                <div className="w-16 h-16 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-2">
                  <span className="text-sm font-bold text-slate-500">?</span>
                </div>
                <p className="text-sm text-slate-500 font-medium text-center">
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
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [studentTargetSkills, setStudentTargetSkills] = useState<Record<string, { skill_name: string; score: number } | null>>({});

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

  const handleEditStudent = (studentId: string) => {
    setEditingStudentId(studentId);
  };

  const handleSaveTargetSkill = (studentId: string, targetSkill: { skill_name: string; score: number } | null) => {
    setStudentTargetSkills(prev => ({
      ...prev,
      [studentId]: targetSkill
    }));
    setEditingStudentId(null);
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
  };

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

  // If editing a student, show the skill selector
  if (editingStudentId) {
    const editingStudent = classStudents.find(s => s.id === editingStudentId);
    if (editingStudent) {
      return (
        <div className="mt-6 flex justify-center">
          <StudentSkillSelector
            studentId={editingStudentId}
            studentName={editingStudent.name}
            classId={classId}
            className={className}
            currentSelectedSkill={studentTargetSkills[editingStudentId]}
            onSave={handleSaveTargetSkill}
            onCancel={handleCancelEdit}
          />
        </div>
      );
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div>
          <h3 className="text-lg font-semibold text-slate-900 mb-1">
            Recommended Lesson Plan based on Student Performance
          </h3>
          <p className="text-sm text-slate-600">
            View each student's skill focus for {className} - click Edit to select target skills for today's lesson
          </p>
        </div>
      </div>

      <div className="space-y-2 max-w-2xl">
        {classStudents.map((student) => (
          <StudentCard 
            key={student.id}
            student={student}
            classId={classId}
            className={className}
            onEdit={handleEditStudent}
            targetSkill={studentTargetSkills[student.id]}
          />
        ))}
      </div>
    </div>
  );
}
