
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Target, Zap } from "lucide-react";
import { getMasteryColor } from "@/utils/studentProfileUtils";
import { type SkillScore } from "@/services/examService";

interface StudentSubjectSkillsProps {
  comprehensiveSubjectSkillData: SkillScore[];
  subjectSkillsLoading: boolean;
  classSubjectSkillsLoading: boolean;
  isClassView: boolean;
  classSubjectSkills: any[];
  onGeneratePracticeTest?: (skillName?: string) => void;
}

export function StudentSubjectSkills({ 
  comprehensiveSubjectSkillData, 
  subjectSkillsLoading, 
  classSubjectSkillsLoading, 
  isClassView, 
  classSubjectSkills,
  onGeneratePracticeTest 
}: StudentSubjectSkillsProps) {
  // Find skills below 80%
  const skillsBelow80 = comprehensiveSubjectSkillData.filter(skill => skill.score > 0 && skill.score < 80);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Subject Specific Skill Mastery</CardTitle>
          {isClassView && onGeneratePracticeTest && skillsBelow80.length > 0 && (
            <Button 
              onClick={() => onGeneratePracticeTest('super-exercise-subject')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              <Zap className="h-4 w-4 mr-2" />
              Create a Super Exercise
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {(subjectSkillsLoading || classSubjectSkillsLoading) ? (
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : comprehensiveSubjectSkillData.length > 0 ? (
          <div className="space-y-3">
            {comprehensiveSubjectSkillData.map((skill, index) => (
              <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
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
        ) : (
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No subject skill data available</h3>
            <p className="text-gray-600">
              {isClassView && classSubjectSkillsLoading
                ? 'Loading subject skills...' 
                : (classSubjectSkills.length === 0 && isClassView)
                ? 'No subject skills found for this class.'
                : 'Subject-specific skill analysis will appear here after test results are processed.'
              }
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
