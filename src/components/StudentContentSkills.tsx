
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, ChevronDown } from "lucide-react";
import { getMasteryColor } from "@/utils/studentProfileUtils";
import { type SkillScore, type ActiveClass } from "@/services/examService";

interface StudentContentSkillsProps {
  groupedSkills: Record<string, SkillScore[]>;
  comprehensiveSkillData: SkillScore[];
  contentSkillsLoading: boolean;
  classContentSkillsLoading: boolean;
  isClassView: boolean;
  classData?: ActiveClass;
  classContentSkills: any[];
  onGeneratePracticeTest: (skillName?: string) => void;
}

export function StudentContentSkills({ 
  groupedSkills, 
  comprehensiveSkillData, 
  contentSkillsLoading, 
  classContentSkillsLoading, 
  isClassView, 
  classData, 
  classContentSkills, 
  onGeneratePracticeTest 
}: StudentContentSkillsProps) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>
            {isClassView && classData 
              ? `${classData.subject} ${classData.grade} Content-Specific Skills`
              : 'Content-Specific Skills'
            }
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button className="flex items-center gap-2">
                <FileText className="h-4 w-4" />
                Generate practice exercises
                <ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 bg-white">
              <DropdownMenuItem onClick={() => onGeneratePracticeTest()}>
                All Skills Combined
              </DropdownMenuItem>
              {comprehensiveSkillData.map((skill, index) => (
                <DropdownMenuItem 
                  key={index} 
                  onClick={() => onGeneratePracticeTest(skill.skill_name)}
                  className="flex items-center justify-between"
                >
                  <span>{skill.skill_name}</span>
                  <Badge variant="outline" className="ml-2">
                    {Math.round(skill.score)}%
                  </Badge>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent>
        {(contentSkillsLoading || classContentSkillsLoading) ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : comprehensiveSkillData.length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([topic, skills]) => (
              <div key={topic}>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">{topic}</h3>
                <div className="space-y-3">
                  {skills.map((skill, index) => (
                    <div key={`${topic}-${index}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-gray-900">{skill.skill_name}</h4>
                          {skill.score === 0 && (
                            <Badge variant="outline" className="text-xs">Not tested</Badge>
                          )}
                        </div>
                        <Progress value={skill.score} className="mt-2 w-64" />
                      </div>
                      <div className="text-right">
                        <Badge className={getMasteryColor(skill.score)}>
                          {Math.round(skill.score)}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <p className="text-gray-600">
              {isClassView && classContentSkillsLoading
                ? 'Loading content skills...' 
                : (classContentSkills.length === 0 && isClassView)
                ? 'No content skills found for this class.'
                : 'No content skill data available.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
