
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, BookOpen, Zap } from "lucide-react";
import { getMasteryColor } from "@/utils/studentProfileUtils";
import { type SkillScore, type ContentSkill, type ActiveClass } from "@/services/examService";

interface StudentContentSkillsProps {
  groupedSkills: Record<string, SkillScore[]>;
  comprehensiveSkillData: SkillScore[];
  contentSkillsLoading: boolean;
  classContentSkillsLoading: boolean;
  isClassView: boolean;
  classData?: ActiveClass | null;
  classContentSkills: ContentSkill[];
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
  // Find skills below 80%
  const skillsBelow80 = comprehensiveSkillData.filter(skill => skill.score > 0 && skill.score < 80);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Content-Specific Skills</CardTitle>
          {isClassView && skillsBelow80.length > 0 && (
            <Button 
              onClick={() => onGeneratePracticeTest('super-exercise-content')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Create a Super Exercise
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(contentSkillsLoading || classContentSkillsLoading) ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : Object.keys(groupedSkills).length > 0 ? (
          <div className="space-y-6">
            {Object.entries(groupedSkills).map(([topic, skills]) => (
              <div key={topic} className="space-y-3">
                <h3 className="font-semibold text-lg text-gray-800 border-b pb-2">{topic}</h3>
                <div className="space-y-3">
                  {skills.map((skill, index) => (
                    <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-semibold text-gray-900">{skill.skill_name}</h4>
                          <div className="flex items-center gap-2">
                            {skill.score === 0 && (
                              <Badge variant="outline" className="text-xs">Not tested</Badge>
                            )}
                            <Badge className={getMasteryColor(skill.score)}>
                              {Math.round(skill.score)}%
                            </Badge>
                            {isClassView && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => onGeneratePracticeTest(skill.skill_name)}
                              >
                                <BookOpen className="h-4 w-4 mr-1" />
                                Generate Practice Exercise
                              </Button>
                            )}
                          </div>
                        </div>
                        <Progress value={skill.score} className="mt-2" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content skill data available</h3>
            <p className="text-gray-600">
              {isClassView && classContentSkillsLoading
                ? 'Loading content skills...' 
                : (classContentSkills.length === 0 && isClassView)
                ? 'No content skills found for this class.'
                : 'Content-specific skill analysis will appear here after test results are processed.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
