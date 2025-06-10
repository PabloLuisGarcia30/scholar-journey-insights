import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { User, TrendingDown, Plus, Edit2, X } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents, getActiveClassById } from "@/services/examService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useState, useMemo } from "react";
import { StudentSkillSelector } from "./StudentSkillSelector";
import { SaveLessonPlan } from "./SaveLessonPlan";

interface ClassStudentListProps {
  classId: string;
  className: string;
  onSelectStudent: (studentId: string, studentName: string) => void;
}

interface StudentSkill {
  skill_name: string;
  score: number;
  isDefault?: boolean;
  isEditedDefault?: boolean;
  isAdditional?: boolean;
}

interface StudentCardProps {
  student: any;
  classId: string;
  className: string;
  onEditDefault: (studentId: string) => void;
  onAddSkills: (studentId: string) => void;
  onRemoveSkill: (studentId: string, skillName: string) => void;
  skills: StudentSkill[];
}

function SkillCircle({ skill, index, isClickable, onClick, isRemovable, onRemove }: { 
  skill: StudentSkill; 
  index: number; 
  isClickable?: boolean;
  onClick?: () => void;
  isRemovable?: boolean;
  onRemove?: () => void;
}) {
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

  const getSkillTypeInfo = () => {
    if (skill.isEditedDefault) {
      return {
        icon: <Edit2 className="h-2.5 w-2.5 text-purple-600 flex-shrink-0" />,
        label: "Edited Default",
        colorClass: "text-purple-700"
      };
    } else if (skill.isDefault) {
      return {
        icon: <TrendingDown className="h-2.5 w-2.5 text-orange-600 flex-shrink-0" />,
        label: "Default (Weakest)",
        colorClass: "text-orange-700"
      };
    } else if (skill.isAdditional) {
      return {
        icon: <Plus className="h-2.5 w-2.5 text-green-600 flex-shrink-0" />,
        label: "Added",
        colorClass: "text-green-700"
      };
    }
    return {
      icon: <TrendingDown className="h-2.5 w-2.5 text-orange-600 flex-shrink-0" />,
      label: "Default",
      colorClass: "text-orange-700"
    };
  };

  const skillTypeInfo = getSkillTypeInfo();

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="flex flex-col items-center w-20 mx-1">
            <div 
              className={`relative w-12 h-12 mb-2 flex-shrink-0 ${
                isClickable ? 'cursor-pointer' : 'cursor-help'
              } transition-transform duration-200 ${
                isHovered && isClickable ? 'transform scale-105' : ''
              }`}
              onMouseEnter={() => setIsHovered(true)}
              onMouseLeave={() => setIsHovered(false)}
              onClick={onClick}
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

              {/* Edit icon for clickable default skills */}
              {isClickable && isHovered && (
                <div className="absolute -top-1 -right-1 bg-blue-600 rounded-full p-0.5">
                  <Edit2 className="h-2 w-2 text-white" />
                </div>
              )}

              {/* Remove icon for removable additional skills */}
              {isRemovable && isHovered && (
                <div 
                  className="absolute -top-1 -right-1 bg-red-600 rounded-full p-0.5 cursor-pointer hover:bg-red-700 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.();
                  }}
                >
                  <X className="h-2 w-2 text-white" />
                </div>
              )}
            </div>

            {/* Skill name and context - improved height and layout */}
            <div className="text-center w-full h-14 flex flex-col justify-start">
              <div className="flex items-center gap-1 justify-center mb-1">
                {skillTypeInfo.icon}
                <span className={`text-xs font-semibold ${skillTypeInfo.colorClass}`}>
                  {skill.isDefault && !skill.isEditedDefault ? 'Default' : 
                   skill.isEditedDefault ? 'Edited' : 
                   skill.isAdditional ? 'Added' : 'Default'}
                </span>
              </div>
              <p className="text-xs text-slate-800 font-medium leading-tight text-center px-1 line-clamp-2" style={{ 
                wordBreak: 'break-word',
                hyphens: 'auto'
              }}>
                {truncatedSkillName}
              </p>
            </div>
          </div>
        </TooltipTrigger>
        <TooltipContent>
          <div className="max-w-xs text-sm">
            <p className="font-medium">{skill.skill_name || "Unknown Skill"}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {isClickable ? "Click to edit this default skill" : 
               isRemovable ? "Hover and click X to remove this added skill" :
               skillTypeInfo.label}
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

function StudentCard({ student, classId, className, onEditDefault, onAddSkills, onRemoveSkill, skills }: StudentCardProps) {
  const hasDefaultSkill = skills.some(skill => skill.isDefault || skill.isEditedDefault);

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
            {hasDefaultSkill && (
              <Button 
                size="sm" 
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onEditDefault(student.id);
                }}
                className="h-7 px-2 text-xs"
                title="Edit the default skill for lesson planning"
              >
                <Edit2 className="h-3 w-3 mr-1" />
                Edit Skill
              </Button>
            )}
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
                skills.map((skill, index) => {
                  // Default skills (not edited) are clickable for editing
                  const isClickableDefault = skill.isDefault && !skill.isEditedDefault;
                  // Additional skills are removable
                  const isRemovableAdditional = skill.isAdditional;
                  
                  return (
                    <SkillCircle 
                      key={`${skill.skill_name}-${index}`} 
                      skill={skill} 
                      index={index}
                      isClickable={isClickableDefault}
                      onClick={isClickableDefault ? () => onEditDefault(student.id) : undefined}
                      isRemovable={isRemovableAdditional}
                      onRemove={isRemovableAdditional ? () => onRemoveSkill(student.id, skill.skill_name) : undefined}
                    />
                  );
                })
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
  const [editedDefaultSkills, setEditedDefaultSkills] = useState<Record<string, StudentSkill | null>>({});
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

  const isLoading = studentsLoading || classLoading;

  const handleEditDefaultSkill = (studentId: string) => {
    setEditingStudentId(studentId);
  };

  const handleAddSkillsStudent = (studentId: string) => {
    setAddingSkillsStudentId(studentId);
  };

  const handleRemoveSkill = (studentId: string, skillName: string) => {
    setStudentAdditionalSkills(prev => ({
      ...prev,
      [studentId]: (prev[studentId] || []).filter(skill => skill.skill_name !== skillName)
    }));
  };

  const handleSaveEditedDefault = (studentId: string, editedSkill: { skill_name: string; score: number } | null) => {
    setEditedDefaultSkills(prev => ({
      ...prev,
      [studentId]: editedSkill ? { ...editedSkill, isEditedDefault: true } : null
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

  // Enhanced function to get all skills for a student
  const getStudentSkills = (studentId: string): StudentSkill[] => {
    const editedDefault = editedDefaultSkills[studentId];
    const additionalSkills = studentAdditionalSkills[studentId] || [];
    
    // If we have an edited default, use it first
    if (editedDefault) {
      return [editedDefault, ...additionalSkills];
    }
    
    // Otherwise, we'll use the weakest skill as default (handled by StudentCardWithWeakestSkill)
    return [...additionalSkills];
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

  // If editing a student's default skill, show the skill selector
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
            currentSelectedSkill={editedDefaultSkills[editingStudentId]}
            onSave={handleSaveEditedDefault}
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
              Click on default skills or use "Edit Skill" to change them, or use "Add Skills" for additional content. Hover over added skills to remove them.
            </p>
          </div>
          
          {/* Show Save Lesson Plan button when students are present */}
          {classStudents.length > 0 && (
            <SaveLessonPlanWithDefaults
              classId={classId}
              className={className}
              students={classStudents}
              editedDefaultSkills={editedDefaultSkills}
              studentAdditionalSkills={studentAdditionalSkills}
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
            onEditDefault={handleEditDefaultSkill}
            onAddSkills={handleAddSkillsStudent}
            onRemoveSkill={handleRemoveSkill}
            editedDefault={editedDefaultSkills[student.id]}
            additionalSkills={studentAdditionalSkills[student.id] || []}
          />
        ))}
      </div>
    </div>
  );
}

// New component that handles the Save Lesson Plan with enhanced default skills
function SaveLessonPlanWithDefaults({ 
  classId, 
  className, 
  students,
  editedDefaultSkills,
  studentAdditionalSkills
}: {
  classId: string;
  className: string;
  students: any[];
  editedDefaultSkills: Record<string, StudentSkill | null>;
  studentAdditionalSkills: Record<string, StudentSkill[]>;
}) {
  return (
    <StudentsWithDefaultSkills
      classId={classId}
      className={className}
      students={students}
      editedDefaultSkills={editedDefaultSkills}
      studentAdditionalSkills={studentAdditionalSkills}
    />
  );
}

// Component that fetches default skills for students and prepares data for SaveLessonPlan
function StudentsWithDefaultSkills({
  classId,
  className,
  students,
  editedDefaultSkills,
  studentAdditionalSkills
}: {
  classId: string;
  className: string;
  students: any[];
  editedDefaultSkills: Record<string, StudentSkill | null>;
  studentAdditionalSkills: Record<string, StudentSkill[]>;
}) {
  // Get skill data for all students to determine default weakest skills
  const studentSkillData = students.map(student => {
    const { contentSkillScores } = useStudentProfileData({
      studentId: student.id,
      classId,
      className
    });
    return {
      studentId: student.id,
      studentName: student.name,
      contentSkillScores
    };
  });

  // Prepare final data with enhanced skill priority: edited defaults > weakest > additional
  const finalStudentsWithSkills = useMemo(() => {
    return students.map(student => {
      const skills: StudentSkill[] = [];
      const editedDefault = editedDefaultSkills[student.id];
      const additionalSkills = studentAdditionalSkills[student.id] || [];
      
      // Priority 1: Edited default skill
      if (editedDefault) {
        skills.push(editedDefault);
      } else {
        // Priority 2: Automatic weakest skill (if no edited default)
        const studentData = studentSkillData.find(s => s.studentId === student.id);
        if (studentData && studentData.contentSkillScores.length > 0) {
          const weakestSkill = studentData.contentSkillScores.reduce((weakest, current) => 
            current.score < weakest.score ? current : weakest
          );
          
          skills.push({
            skill_name: weakestSkill.skill_name,
            score: weakestSkill.score,
            isDefault: true
          });
        }
      }
      
      // Priority 3: Additional skills
      skills.push(...additionalSkills);
      
      return {
        studentId: student.id,
        studentName: student.name,
        skills: skills.map(skill => ({
          skill_name: skill.skill_name,
          score: skill.score
        }))
      };
    }).filter(student => student.skills.length > 0); // Only include students with skills
  }, [students, editedDefaultSkills, studentAdditionalSkills, studentSkillData]);

  return (
    <SaveLessonPlan
      classId={classId}
      className={className}
      students={finalStudentsWithSkills}
    />
  );
}

// Enhanced component that handles individual student cards with weakest skill logic
function StudentCardWithWeakestSkill({ 
  student, 
  classId, 
  className, 
  onEditDefault, 
  onAddSkills,
  onRemoveSkill,
  editedDefault,
  additionalSkills
}: {
  student: any;
  classId: string;
  className: string;
  onEditDefault: (studentId: string) => void;
  onAddSkills: (studentId: string) => void;
  onRemoveSkill: (studentId: string, skillName: string) => void;
  editedDefault?: StudentSkill | null;
  additionalSkills: StudentSkill[];
}) {
  // Use the hook to get this student's skill data
  const { contentSkillScores } = useStudentProfileData({
    studentId: student.id,
    classId,
    className
  });

  // Calculate the skills to display with enhanced priority system
  const skills = useMemo(() => {
    const skillsToShow: StudentSkill[] = [];

    // Priority 1: Edited default skill
    if (editedDefault) {
      skillsToShow.push(editedDefault);
    } else if (contentSkillScores.length > 0) {
      // Priority 2: Automatic weakest skill (if no edited default)
      const weakestSkill = contentSkillScores.reduce((weakest, current) => 
        current.score < weakest.score ? current : weakest
      );
      skillsToShow.push({
        skill_name: weakestSkill.skill_name,
        score: weakestSkill.score,
        isDefault: true
      });
    }

    // Priority 3: Additional skills
    skillsToShow.push(...additionalSkills);

    return skillsToShow;
  }, [editedDefault, additionalSkills, contentSkillScores]);

  return (
    <StudentCard 
      student={student}
      classId={classId}
      className={className}
      onEditDefault={onEditDefault}
      onAddSkills={onAddSkills}
      onRemoveSkill={onRemoveSkill}
      skills={skills}
    />
  );
}

export default ClassStudentList;
