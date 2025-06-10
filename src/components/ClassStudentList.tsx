
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, User, Lightbulb, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getAllActiveStudents, getActiveClassById } from "@/services/examService";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { supabase } from "@/integrations/supabase/client";
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

function StudentCard({ student, classId, className }: StudentCardProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [recommendation, setRecommendation] = useState<string>('');
  
  // Get student profile data to find weakest content skill
  const { contentSkillScores, contentSkillsLoading } = useStudentProfileData({
    studentId: student.id,
    classId,
    className
  });

  const generatePracticeRecommendation = async () => {
    if (contentSkillsLoading || isGenerating) return;
    
    setIsGenerating(true);
    
    try {
      // Find the weakest content skill
      const weakestSkill = contentSkillScores
        .filter(skill => skill.score < 0.8) // Focus on skills below 80%
        .sort((a, b) => a.score - b.score)[0]; // Get the lowest scoring skill
      
      if (!weakestSkill) {
        setRecommendation("Great job! This student is performing well across all content skills.");
        setIsGenerating(false);
        return;
      }

      // Call OpenAI to generate practice exercise recommendation
      const { data, error } = await supabase.functions.invoke('generate-practice-recommendation', {
        body: {
          studentName: student.name,
          className,
          weakestSkill: weakestSkill.skill_name,
          skillScore: weakestSkill.score,
          grade: "Grade 10", // You can make this dynamic based on class data
          subject: "Math" // You can make this dynamic based on class data
        }
      });

      if (error) {
        throw new Error(error.message);
      }

      setRecommendation(data.recommendation);
    } catch (error) {
      console.error('Error generating recommendation:', error);
      setRecommendation("Unable to generate recommendation at this time. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-white/80 backdrop-blur-sm hover:bg-white hover:scale-[1.01]">
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          <Avatar className="h-12 w-12 ring-2 ring-slate-100 group-hover:ring-blue-200 transition-all duration-300 flex-shrink-0">
            <AvatarFallback className="bg-gradient-to-br from-blue-100 to-purple-100 text-slate-700 font-semibold">
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <h4 className="font-semibold text-slate-900 truncate group-hover:text-blue-700 transition-colors text-lg">
                  {student.name}
                </h4>
                <p className="text-sm text-slate-500 truncate">{student.email || 'No email'}</p>
                
                <div className="flex flex-wrap gap-2 mt-2">
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

                {/* Show recommendation if generated */}
                {recommendation && (
                  <div className="mt-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4" />
                      Practice Recommendation
                    </h5>
                    <p className="text-sm text-blue-800">{recommendation}</p>
                  </div>
                )}
              </div>

              <Button 
                onClick={generatePracticeRecommendation}
                disabled={isGenerating || contentSkillsLoading}
                className="h-10 px-6 bg-blue-600 hover:bg-blue-700 text-white flex items-center gap-2 flex-shrink-0"
              >
                {isGenerating ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Lightbulb className="h-4 w-4" />
                    Recommend Practice
                  </>
                )}
              </Button>
            </div>
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
          Generate Practice Recommendations
        </h3>
        <p className="text-sm text-slate-600">
          Get AI-powered practice exercise recommendations for students in {className} based on their weakest content skills
        </p>
      </div>

      <div className="space-y-3 max-w-2xl">
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
