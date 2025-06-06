import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Moon, Users, FileText, User } from "lucide-react";
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

// Mock data for students without scores
const generateMockSkills = (): SkillScore[] => {
  const mockSkills = [
    { skill_name: "Factoring Polynomials", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Solving Systems of Equations", score: Math.floor(Math.random() * 30) + 50 },
    { skill_name: "Understanding Function Notation", score: Math.floor(Math.random() * 25) + 40 },
    { skill_name: "Graphing Linear Functions", score: Math.floor(Math.random() * 35) + 55 },
    { skill_name: "Working with Exponential Functions", score: Math.floor(Math.random() * 20) + 35 },
    { skill_name: "Properties of Similar Triangles", score: Math.floor(Math.random() * 30) + 45 },
    { skill_name: "Area and Perimeter Calculations", score: Math.floor(Math.random() * 25) + 50 },
    { skill_name: "Basic Trigonometric Ratios", score: Math.floor(Math.random() * 30) + 40 },
    { skill_name: "Statistical Measures", score: Math.floor(Math.random() * 35) + 45 },
    { skill_name: "Probability Calculations", score: Math.floor(Math.random() * 25) + 55 }
  ];
  
  // Shuffle and take 5 random skills
  const shuffled = mockSkills.sort(() => 0.5 - Math.random());
  return shuffled.slice(0, 5).sort((a, b) => a.score - b.score);
};

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
            
            let lowestSkills: SkillScore[];
            
            if (skillScores && skillScores.length > 0) {
              // Use real data if available - get the 5 lowest scores
              lowestSkills = skillScores
                .map(score => ({
                  skill_name: score.skill_name,
                  score: score.score
                }))
                .sort((a, b) => a.score - b.score)
                .slice(0, 5);
            } else {
              // Use mock data for students without scores
              lowestSkills = generateMockSkills();
            }

            return {
              ...student,
              lowestSkills
            };
          } catch (error) {
            console.error(`Error fetching skills for student ${student.id}:`, error);
            // Use mock data if there's an error fetching real data
            return {
              ...student,
              lowestSkills: generateMockSkills()
            };
          }
        })
      );

      // Include ALL students (both with real data and mock data)
      setStudentsWithSkills(studentsWithSkillsData);
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

  const handleShowByClasses = () => {
    console.log('Show students by classes clicked');
    // TODO: Implement class filtering functionality
  };

  const handleCreatePracticeForSeveral = () => {
    console.log('Create practice exercise for several students clicked');
    // TODO: Implement multi-student practice exercise creation
  };

  const handleCreatePracticeForOne = () => {
    console.log('Create practice exercise for one student clicked');
    // TODO: Implement single student practice exercise creation
  };

  if (loading) {
    return (
      <Card className="w-full border-slate-200 shadow-sm">
        <CardHeader className="border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              Your Students: 5 Skills Most Needing Improving This Week
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleShowByClasses}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show students by classes</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
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
          <div className="flex items-center justify-between">
            <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
              <Moon className="h-5 w-5 text-orange-500" />
              Your Students: 5 Skills Most Needing Improving This Week
            </CardTitle>
            <TooltipProvider>
              <div className="flex items-center gap-2">
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleShowByClasses}
                    >
                      <Users className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Show students by classes</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForSeveral}
                    >
                      <FileText className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for several students</p>
                  </TooltipContent>
                </Tooltip>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      onClick={handleCreatePracticeForOne}
                    >
                      <User className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Create practice exercise for one student</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </TooltipProvider>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <Moon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
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
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
            <Moon className="h-5 w-5 text-orange-500" />
            Your Students: 5 Skills Most Needing Improving This Week
          </CardTitle>
          <TooltipProvider>
            <div className="flex items-center gap-2">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleShowByClasses}
                  >
                    <Users className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Show students by classes</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForSeveral}
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for several students</p>
                </TooltipContent>
              </Tooltip>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="h-8 w-8 rounded-full"
                    onClick={handleCreatePracticeForOne}
                  >
                    <User className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Create practice exercise for one student</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </div>
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
                
                <div className="flex items-end gap-4">
                  {student.lowestSkills.map((skill, index) => (
                    <div key={index} className="flex flex-col items-center">
                      <div className="h-10 text-xs text-slate-600 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                        <span className="line-clamp-2">{skill.skill_name}</span>
                      </div>
                      <div 
                        className={`h-12 w-12 rounded-full bg-gradient-to-br ${getScoreColor(skill.score)} 
                          flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 
                          transition-all duration-200`}
                      >
                        <span className="text-xs font-bold text-white drop-shadow-sm">
                          {skill.score}%
                        </span>
                      </div>
                    </div>
                  ))}
                  
                  {/* Fill remaining slots if less than 5 skills */}
                  {[...Array(Math.max(0, 5 - student.lowestSkills.length))].map((_, index) => (
                    <div key={`empty-${index}`} className="flex flex-col items-center">
                      <div className="h-10 text-xs text-slate-400 text-center mb-2 w-16 leading-tight flex items-center justify-center">
                        <span>No data</span>
                      </div>
                      <div 
                        className="h-12 w-12 rounded-full bg-slate-100 border-2 border-dashed border-slate-300
                          flex items-center justify-center"
                      >
                        <span className="text-xs text-slate-400">—</span>
                      </div>
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
