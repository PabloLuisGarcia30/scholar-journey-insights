
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Target } from "lucide-react";
import { getMasteryColor } from "@/utils/studentProfileUtils";
import { type SkillScore } from "@/services/examService";

interface StudentSubjectSkillsProps {
  comprehensiveSubjectSkillData: SkillScore[];
  subjectSkillsLoading: boolean;
  classSubjectSkillsLoading: boolean;
  isClassView: boolean;
  classSubjectSkills: any[];
}

export function StudentSubjectSkills({ 
  comprehensiveSubjectSkillData, 
  subjectSkillsLoading, 
  classSubjectSkillsLoading, 
  isClassView, 
  classSubjectSkills 
}: StudentSubjectSkillsProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Specific Skill Mastery</CardTitle>
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
