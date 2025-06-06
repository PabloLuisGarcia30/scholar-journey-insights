
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { TrendingDown } from "lucide-react";
import { 
  getAllActiveStudents,
  getStudentContentSkillScores,
  type ActiveStudent
} from "@/services/examService";

interface SkillScore {
  skill_name: string;
  score: number;
}

interface StudentWithSkills extends ActiveStudent {
  lowestSkills: SkillScore[];
}

export function StudentPerformanceOverview() {
  const [studentsWithSkills, setStudentsWithSkills] = useState<StudentWithSkills[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadStudentPerformanceData();
  }, []);

  const loadStudentPerformanceData = async () => {
    try {
      setLoading(true);
      const students = await getAllActiveStudents();
      
      const studentsWithSkillsData = await Promise.all(
        students.map(async (student) => {
          try {
            const skillScores = await getStudentContentSkillScores(student.id);
            
            // Get the 5 lowest scores
            const sortedSkills = skillScores
              .map(score => ({
                skill_name: score.skill_name,
                score: score.score
              }))
              .sort((a, b) => a.score - b.score)
              .slice(0, 5);

            return {
              ...student,
              lowestSkills: sortedSkills
            };
          } catch (error) {
            console.error(`Error fetching skills for student ${student.id}:`, error);
            return {
              ...student,
              lowestSkills: []
            };
          }
        })
      );

      // Filter out students with no skill data
      const studentsWithData = studentsWithSkillsData.filter(
        student => student.lowestSkills.length > 0
      );

      setStudentsWithSkills(studentsWithData);
    } catch (error) {
      console.error('Error loading student performance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 86) return "from-emerald-400 to-emerald-600";
    if (score >= 76) return "from-yellow-400 to-yellow-600";
    if (score >= 61) return "from-orange-400 to-orange-600";
    return "from-red-400 to-red-600";
  };

  const getScoreTextColor = (score: number) => {
    if (score >= 86) return "text-emerald-700";
    if (score >= 76) return "text-yellow-700";
    if (score >= 61) return "text-orange-700";
    return "text-red-700";
  };

  if (loading) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Student Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg border border-slate-200">
                <Skeleton className="h-12 w-12 rounded-full" />
                <Skeleton className="h-6 w-32" />
                <div className="flex gap-3 ml-auto">
                  {[...Array(5)].map((_, j) => (
                    <Skeleton key={j} className="h-12 w-12 rounded-full" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (studentsWithSkills.length === 0) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <TrendingDown className="h-5 w-5 text-orange-500" />
            Student Performance Overview
          </CardTitle>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <TrendingDown className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Performance Data</h3>
            <p className="text-gray-600">Students need to take tests to see performance data here</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
          <TrendingDown className="h-5 w-5 text-orange-500" />
          Student Performance Overview
          <span className="text-sm font-normal text-slate-500">
            (Top 5 Lowest Content Skills)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        <ScrollArea className="h-96 w-full">
          <div className="space-y-3 pr-4">
            {studentsWithSkills.map((student) => (
              <div 
                key={student.id}
                className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all duration-200"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <Avatar className="h-12 w-12 ring-2 ring-slate-100">
                    <AvatarFallback className="bg-gradient-to-br from-blue-100 to-blue-200 text-blue-700 font-semibold">
                      {student.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-slate-900 truncate">{student.name}</h3>
                    <p className="text-sm text-slate-500 truncate">{student.email || 'No email'}</p>
                  </div>
                </div>
                
                <div className="flex items-center gap-3">
                  {student.lowestSkills.map((skill, index) => (
                    <div key={index} className="group relative">
                      <div 
                        className={`h-12 w-12 rounded-full bg-gradient-to-br ${getScoreColor(skill.score)} 
                          flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 
                          transition-all duration-200 cursor-pointer`}
                        title={`${skill.skill_name}: ${skill.score}%`}
                      >
                        <span className={`text-xs font-bold text-white drop-shadow-sm`}>
                          {skill.score}%
                        </span>
                      </div>
                      
                      {/* Tooltip */}
                      <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 
                        bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 
                        transition-opacity duration-200 pointer-events-none whitespace-nowrap z-10">
                        {skill.skill_name}
                        <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 
                          border-transparent border-t-gray-900"></div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fill remaining slots if less than 5 skills */}
                  {[...Array(Math.max(0, 5 - student.lowestSkills.length))].map((_, index) => (
                    <div 
                      key={`empty-${index}`}
                      className="h-12 w-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-300
                        flex items-center justify-center"
                      title="No data available"
                    >
                      <span className="text-xs text-slate-400">—</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
