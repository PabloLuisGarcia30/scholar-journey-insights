
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User, TrendingDown, Edit, Target, Plus } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents, getActiveClassById } from "@/services/examService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useState, useMemo } from "react";
import { StudentSkillSelector } from "./StudentSkillSelector";
import { StartClassSession } from "./StartClassSession";

interface ClassStudentListProps {
  classId: string;
  className: string;
  onSelectStudent: (studentId: string, studentName: string) => void;
}

interface StudentSkill {
  skill_name: string;
  score: number;
  isTarget?: boolean;
  isAdditional?: boolean;
}

interface StudentCardProps {
  student: any;
  classId: string;
  className: string;
  onEdit: (studentId: string) => void;
  onAddSkills: (studentId: string) => void;
  skills: StudentSkill[];
}

function SkillCircle({ skill, index }: { skill: StudentSkill; index: number }) {
  const [isHovered, setIsHovered] = useState(false);
  
  // Improved skill name truncation - more aggressive for better display
  const truncatedSkillName = skill.skill_name && skill.skill_name.length > 12 ? 
    skill.skill_name.substring(0, 12) + "..." : 
    skill.skill_name || "Unknown";
  
  const getGradientColors = (score: number) => {
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

  const gradientColors = getGradientColors(skill.score);
  const gradientId = `gradient-skill-${index}-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="flex flex-col items-center w-20 mx-1">
      <div 
        className="relative w-12 h-12 mb-2 flex-shrink-0"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        title={skill.skill_name || "Unknown Skill"}
      >
        <svg className="w-12 h-12" viewBox="0 0 48 48">
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={gradientColors.color1} />
              <stop offset="50%" stopColor={gradientColors.color2} />
              <stop offset="100%" stopColor={gradientColors.color3} />
            </linearGradient>
          </defs>
          <circle
            cx="24"
            cy="24"
            r="18"
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
          <span className="text-xs font-bold text-white drop-shadow-sm">
            {Math.round(skill.score || 0)}%
          </span>
        </div>
      </div>

      {/* Skill name and context - improved height and layout */}
      <div className="text-center w-full h-14 flex flex-col justify-start">
        <div className="flex items-center gap-1 justify-center mb-1">
          {skill.isTarget ? (
            <>
              <Target className="h-2.5 w-2.5 text-blue-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-blue-700">Target</span>
            </>
          ) : skill.isAdditional ? (
            <>
              <Plus className="h-2.5 w-2.5 text-green-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-green-700">Added</span>
            </>
          ) : (
            <>
              <TrendingDown className="h-2.5 w-2.5 text-orange-600 flex-shrink-0" />
              <span className="text-xs font-semibold text-orange-700">Weakest</span>
            </>
          )}
        </div>
        <p className="text-xs text-slate-800 font-medium leading-tight text-center px-1 line-clamp-2" style={{ 
          wordBreak: 'break-word',
          hyphens: 'auto'
        }}>
          {truncatedSkillName}
        </p>
      </div>
    </div>
  );
}

function StudentCard({ student, classId, className, onEdit, onAddSkills, skills }: StudentCardProps) {
  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.01] w-full max-w-4xl">
      <CardContent className="p-3">
        {/* Grid Layout: Avatar | Student Info | Buttons | Skills */}
        <div className="grid grid-cols-[auto_1fr_auto_1fr] gap-4 items-start">
          
          {/* Avatar Column */}
          <div className="flex justify-center pt-1">
            <Avatar className="h-8 w-8 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300 flex-shrink-0">
              <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold text-sm">
                {student.name.split(' ').map(n => n[0]).join('')}
              </AvatarFallback>
            </Avatar>
          </div>
          
          {/* Student Info Column */}
          <div className="min-h-[60px] flex flex-col justify-start">
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-sm text-slate-900 truncate group-hover:text-blue-700 transition-colors">
                {student.name}
              </h4>
            </div>
            <p className="text-xs text-slate-500 truncate min-h-[16px]">{student.email || 'No email'}</p>
            
            <div className="flex flex-wrap gap-1 mt-1 min-h-[20px]">
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

          {/* Action Buttons Column */}
          <div className="flex flex-col gap-2 pt-1">
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onEdit(student.id);
              }}
              className="h-7 px-2 text-xs"
              title="Select target skill"
            >
              <Edit className="h-3 w-3 mr-1" />
              Target
            </Button>
            <Button 
              size="sm" 
              variant="outline"
              onClick={(e) => {
                e.stopPropagation();
                onAddSkills(student.id);
              }}
              className="h-7 px-2 text-xs"
              title="Add additional skills"
            >
              <Plus className="h-3 w-3 mr-1" />
              Add Skills
            </Button>
          </div>

          {/* Skills Column */}
          <div className="flex justify-start items-start overflow-x-auto">
            <div className="flex flex-nowrap gap-1 min-w-0">
              {skills.length > 0 ? (
                skills.map((skill, index) => (
                  <SkillCircle key={`${skill.skill_name}-${index}`} skill={skill} index={index} />
                ))
              ) : (
                <div className="flex flex-col items-center w-16">
                  <div className="w-12 h-12 bg-gradient-to-br from-slate-100 to-slate-200 rounded-full flex items-center justify-center mb-1">
                    <span className="text-xs font-bold text-slate-500">?</span>
                  </div>
                  <div className="h-10 flex items-start justify-center">
                    <p className="text-xs text-slate-500 font-medium text-center">
                      No data
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ClassStudentList({ classId, className, onSelectStudent }: ClassStudentListProps) {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [addingSkillsStudentId, setAddingSkillsStudentId] = useState<string | null>(null);
  const [studentTargetSkills, setStudentTargetSkills] = useState<Record<string, StudentSkill | null>>({});
  const [studentAdditionalSkills, setStudentAdditionalSkills] = useState<Record<string, StudentSkill[]>>({});

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

  // Create a hook to get skill data for all students
  const useStudentSkillData = (studentId: string) => {
    const { contentSkillScores } = useStudentProfileData({
      studentId,
      classId,
      className
    });
    return contentSkillScores;
  };

  // Create a map of student skill data including weakest skills
  const studentSkillsMap = useMemo(() => {
    const skillsMap: Record<string, StudentSkill[]> = {};
    
    classStudents.forEach(student => {
      const skills: StudentSkill[] = [];
      const targetSkill = studentTargetSkills[student.id];
      const additionalSkills = studentAdditionalSkills[student.id] || [];
      
      // Add target skill if set, otherwise try to add weakest skill
      if (targetSkill) {
        skills.push(targetSkill);
      } else {
        // We need to get the student's skill data to find the weakest skill
        // This will be handled by individual student cards calling the hook
        // For now, we'll mark that this student needs weakest skill data
        skills.push({
          skill_name: '__WEAKEST_PLACEHOLDER__',
          score: 0,
          isTarget: false,
          isAdditional: false
        });
      }
      
      // Add additional skills
      skills.push(...additionalSkills);
      
      skillsMap[student.id] = skills;
    });
    
    return skillsMap;
  }, [classStudents, studentTargetSkills, studentAdditionalSkills]);

  const isLoading = studentsLoading || classLoading;

  const handleEditStudent = (studentId: string) => {
    setEditingStudentId(studentId);
  };

  const handleAddSkillsStudent = (studentId: string) => {
    setAddingSkillsStudentId(studentId);
  };

  const handleSaveTargetSkill = (studentId: string, targetSkill: { skill_name: string; score: number } | null) => {
    setStudentTargetSkills(prev => ({
      ...prev,
      [studentId]: targetSkill ? { ...targetSkill, isTarget: true } : null
    }));
    setEditingStudentId(null);
  };

  const handleSaveAdditionalSkills = (studentId: string, additionalSkills: { skill_name: string; score: number }[]) => {
    setStudentAdditionalSkills(prev => ({
      ...prev,
      [studentId]: additionalSkills.map(skill => ({ ...skill, isAdditional: true }))
    }));
    setAddingSkillsStudentId(null);
  };

  const handleCancelEdit = () => {
    setEditingStudentId(null);
    setAddingSkillsStudentId(null);
  };

  // Enhanced function to get all skills for a student including weakest skill
  const getStudentSkills = (studentId: string): StudentSkill[] => {
    const baseSkills = studentSkillsMap[studentId] || [];
    const targetSkill = studentTargetSkills[studentId];
    const additionalSkills = studentAdditionalSkills[studentId] || [];
    
    // If we have a target skill, return target + additional skills
    if (targetSkill) {
      return [targetSkill, ...additionalSkills];
    }
    
    // Otherwise, we need to get the weakest skill from student data
    // This will be handled by the StudentCardWithWeakestSkill component
    return [...additionalSkills];
  };

  // Prepare data for StartClassSession component
  const studentsWithSkills = classStudents.map(student => ({
    studentId: student.id,
    studentName: student.name,
    skills: getStudentSkills(student.id).filter(skill => skill.skill_name !== '__WEAKEST_PLACEHOLDER__')
  })).filter(student => student.skills.length > 0);

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

  // If editing a student's target skill, show the skill selector
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
            isMultiSelect={false}
          />
        </div>
      );
    }
  }

  // If adding additional skills, show the multi-select skill selector
  if (addingSkillsStudentId) {
    const editingStudent = classStudents.find(s => s.id === addingSkillsStudentId);
    if (editingStudent) {
      return (
        <div className="mt-6 flex justify-center">
          <StudentSkillSelector
            studentId={addingSkillsStudentId}
            studentName={editingStudent.name}
            classId={classId}
            className={className}
            currentSelectedSkills={studentAdditionalSkills[addingSkillsStudentId] || []}
            onSaveMultiple={handleSaveAdditionalSkills}
            onCancel={handleCancelEdit}
            isMultiSelect={true}
          />
        </div>
      );
    }
  }

  return (
    <div className="mt-6">
      <div className="mb-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-slate-900 mb-1">
              Recommended Lesson Plan based on Student Performance
            </h3>
            <p className="text-sm text-slate-600">
              View each student's skill focus for {className} - click Target to select focus skills, Add Skills for additional content
            </p>
          </div>
          
          {studentsWithSkills.length > 0 && (
            <StartClassSession
              classId={classId}
              className={className}
              students={studentsWithSkills}
            />
          )}
        </div>
      </div>

      <div className="space-y-2">
        {classStudents.map((student) => (
          <StudentCardWithWeakestSkill 
            key={student.id}
            student={student}
            classId={classId}
            className={className}
            onEdit={handleEditStudent}
            onAddSkills={handleAddSkillsStudent}
            targetSkill={studentTargetSkills[student.id]}
            additionalSkills={studentAdditionalSkills[student.id] || []}
          />
        ))}
      </div>
    </div>
  );
}

// New component that handles individual student cards with weakest skill logic
function StudentCardWithWeakestSkill({ 
  student, 
  classId, 
  className, 
  onEdit, 
  onAddSkills,
  targetSkill,
  additionalSkills
}: {
  student: any;
  classId: string;
  className: string;
  onEdit: (studentId: string) => void;
  onAddSkills: (studentId: string) => void;
  targetSkill?: StudentSkill | null;
  additionalSkills: StudentSkill[];
}) {
  // Use the hook to get this student's skill data
  const { contentSkillScores } = useStudentProfileData({
    studentId: student.id,
    classId,
    className
  });

  // Calculate the skills to display
  const skills = useMemo(() => {
    const skillsToShow: StudentSkill[] = [];

    // Add target skill if set, otherwise add weakest skill
    if (targetSkill) {
      skillsToShow.push(targetSkill);
    } else if (contentSkillScores.length > 0) {
      // Find the weakest skill (lowest score)
      const weakestSkill = contentSkillScores.reduce((weakest, current) => 
        current.score < weakest.score ? current : weakest
      );
      skillsToShow.push({
        skill_name: weakestSkill.skill_name,
        score: weakestSkill.score,
        isTarget: false,
        isAdditional: false
      });
    }

    // Add additional skills
    skillsToShow.push(...additionalSkills);

    return skillsToShow;
  }, [targetSkill, additionalSkills, contentSkillScores]);

  return (
    <StudentCard 
      student={student}
      classId={classId}
      className={className}
      onEdit={onEdit}
      onAddSkills={onAddSkills}
      skills={skills}
    />
  );
}
