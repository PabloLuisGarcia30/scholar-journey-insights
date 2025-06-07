
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MoreVertical, ArrowRight, FileText, Zap } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

interface StudentSubjectSkillsProps {
  comprehensiveSubjectSkillData: any[];
  subjectSkillsLoading: boolean;
  classSubjectSkillsLoading: boolean;
  isClassView: boolean;
  classSubjectSkills: any[];
  onGeneratePracticeTest: (skillName?: string) => void;
}

export function StudentSubjectSkills({ 
  comprehensiveSubjectSkillData,
  subjectSkillsLoading,
  classSubjectSkillsLoading,
  isClassView,
  classSubjectSkills,
  onGeneratePracticeTest
}: StudentSubjectSkillsProps) {
  const relevantSkills = comprehensiveSubjectSkillData;

  // Filter skills for "Super Exercise" (all skills below 80%)
  const skillsForSuperExercise = comprehensiveSubjectSkillData.filter(skill => skill.score < 80);

  const handlePractice = (skillName: string) => {
    onGeneratePracticeTest(skillName);
  };

  const isLoading = subjectSkillsLoading || classSubjectSkillsLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subject-Specific Skills</CardTitle>
        {isClassView && (
          <Button
            variant="destructive"
            onClick={() => onGeneratePracticeTest('super-exercise-subject')}
            disabled={skillsForSuperExercise.length === 0}
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 shadow-sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create Subject Super Exercise
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px] w-full">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <p>Loading subject skills...</p>
            ) : relevantSkills.length === 0 ? (
              <p>No subject-specific skills found.</p>
            ) : (
              relevantSkills.map((skill: any) => {
                const skillName = skill.skill_name;
                const score = skill.score || 0;

                return (
                  <div 
                    key={skill.id || skillName} 
                    className="border rounded-lg p-4 cursor-pointer hover:shadow-md transition-all duration-200"
                    onClick={() => handlePractice(skillName)}
                  >
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://avatar.vercel.sh/${skillName}.png`} />
                          <AvatarFallback>{skillName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="text-lg font-semibold">{skillName}</h3>
                          <p className="text-sm text-gray-500">{skill.skill_description || 'No description available'}</p>
                        </div>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button 
                            variant="ghost" 
                            className="h-8 w-8 p-0"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <span className="sr-only">Open menu</span>
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem onClick={(e) => {
                            e.stopPropagation();
                            handlePractice(skillName);
                          }}>
                            <FileText className="h-4 w-4 mr-2" />
                            Generate Practice Exercises
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Progress: {score}%</div>
                      <Progress value={score} />
                    </div>
                    <Button 
                      variant="secondary" 
                      onClick={(e) => {
                        e.stopPropagation();
                        handlePractice(skillName);
                      }}
                    >
                      Practice this Skill <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
