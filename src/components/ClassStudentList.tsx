import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";

import { SaveLessonPlan } from "@/components/SaveLessonPlan";
import type { ActiveClassWithDuration } from "@/services/examService";

interface ClassStudentListProps {
  classId: string;
  className: string;
  classData?: ActiveClassWithDuration | null;
  onSelectStudent?: (studentId: string, studentName: string) => void;
}

export function ClassStudentList({ classId, className, classData, onSelectStudent }: ClassStudentListProps) {
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const initialStudents = [
    { studentId: "1", studentName: "Alice Smith", skills: [{ skill_name: "Reading Comprehension", score: 0.75 }, { skill_name: "Vocabulary", score: 0.65 }] },
    { studentId: "2", studentName: "Bob Johnson", skills: [{ skill_name: "Math - Algebra", score: 0.85 }, { skill_name: "Problem Solving", score: 0.70 }] },
    { studentId: "3", studentName: "Charlie Brown", skills: [{ skill_name: "Science - Biology", score: 0.60 }, { skill_name: "Critical Thinking", score: 0.55 }] },
    { studentId: "4", studentName: "Diana Lee", skills: [{ skill_name: "History - US", score: 0.90 }, { skill_name: "Research", score: 0.80 }] },
    { studentId: "5", studentName: "Ethan Garcia", skills: [{ skill_name: "Writing - Essays", score: 0.78 }, { skill_name: "Grammar", score: 0.72 }] },
    { studentId: "6", studentName: "Fiona Kim", skills: [{ skill_name: "Art - Painting", score: 0.82 }, { skill_name: "Creativity", score: 0.75 }] },
    { studentId: "7", studentName: "George Davis", skills: [{ skill_name: "Music - Piano", score: 0.88 }, { skill_name: "Performance", score: 0.82 }] },
    { studentId: "8", studentName: "Hannah White", skills: [{ skill_name: "Geography", score: 0.70 }, { skill_name: "Global Awareness", score: 0.68 }] },
    { studentId: "9", studentName: "Ivy Taylor", skills: [{ skill_name: "Computer Science", score: 0.92 }, { skill_name: "Coding", score: 0.88 }] },
    { studentId: "10", studentName: "Jack Moore", skills: [{ skill_name: "Physical Education", score: 0.76 }, { skill_name: "Teamwork", score: 0.74 }] },
  ];
  const [students, setStudents] = useState(initialStudents);

  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudentIds((prev) =>
      prev.includes(studentId) ? prev.filter((id) => id !== studentId) : [...prev, studentId]
    );
  };

  const studentsWithSkills = students.filter(student => selectedStudentIds.includes(student.studentId));

  return (
    <div className="space-y-6">
      {/* Student List */}
      <div className="border rounded-md">
        <ScrollArea className="h-[300px] w-full">
          <div className="p-4 space-y-3">
            {students.map((student) => (
              <div key={student.studentId} className="flex items-center justify-between">
                <label
                  htmlFor={`student-${student.studentId}`}
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Checkbox
                    id={`student-${student.studentId}`}
                    checked={selectedStudentIds.includes(student.studentId)}
                    onCheckedChange={() => toggleStudentSelection(student.studentId)}
                  />
                  <div className="flex items-center space-x-2">
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={`https://avatar.vercel.sh/api/name=${student.studentName}`} />
                      <AvatarFallback>{student.studentName.substring(0, 2)}</AvatarFallback>
                    </Avatar>
                    <span>{student.studentName}</span>
                  </div>
                </label>
                <button
                  onClick={() => onSelectStudent?.(student.studentId, student.studentName)}
                  className="text-blue-500 hover:underline text-sm"
                >
                  Plan Lesson
                </button>
              </div>
            ))}
          </div>
        </ScrollArea>
      </div>

      {/* Action Bar */}
      {studentsWithSkills.length > 0 && (
        <div className="border-t pt-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-slate-600">
              <strong>{studentsWithSkills.length}</strong> students selected with{" "}
              <strong>{studentsWithSkills.reduce((total, student) => total + student.skills.length, 0)}</strong> total skills
            </div>
            <SaveLessonPlan
              classId={classId}
              className={className}
              classData={classData}
              students={studentsWithSkills}
              onLessonPlanSaved={(lessonPlanId) => {
                console.log('Lesson plan saved:', lessonPlanId);
                toast.success(`Lesson plan saved successfully!`);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
