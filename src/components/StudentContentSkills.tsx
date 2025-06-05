
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PracticeTestGenerator } from "@/components/PracticeTestGenerator";
import { Zap } from "lucide-react";

interface StudentContentSkillsProps {
  groupedSkills: Record<string, any[]>;
  comprehensiveSkillData: any[];
  contentSkillsLoading: boolean;
  classContentSkillsLoading: boolean;
  isClassView: boolean;
  classData: any;
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
  const [showPracticeGenerator, setShowPracticeGenerator] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Filter skills for "Super Exercise" (all skills below 80%)
  const skillsForSuperExercise = comprehensiveSkillData.filter(skill => skill.score < 80);

  if (showPracticeGenerator) {
    return (
      <PracticeTestGenerator
        studentName="Student"
        className={classData ? `${classData.subject} ${classData.grade}` : 'Unknown Class'}
        skillName={selectedSkill}
        grade={classData?.grade}
        subject={classData?.subject}
        classId={classData?.id}
        onBack={() => {
          setShowPracticeGenerator(false);
          setSelectedSkill(null);
        }}
      />
    );
  }

  const isLoading = contentSkillsLoading || classContentSkillsLoading;

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-yellow-600";
    return "text-orange-600";
  };

  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Content-Specific Skills</CardTitle>
        {isClassView && (
          <Button
            variant="destructive"
            onClick={() => onGeneratePracticeTest('super-exercise-content')}
            disabled={skillsForSuperExercise.length === 0}
            className="bg-orange-500 hover:bg-orange-600"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create a Super Exercise
          </Button>
        )}
      </CardHeader>
      <CardContent className="space-y-8">
        {isLoading ? (
          <p>Loading content skills...</p>
        ) : (
          Object.entries(groupedSkills).map(([topic, skills]) => (
            <div key={topic} className="space-y-4">
              <h3 className="text-lg font-semibold text-center text-gray-700 uppercase tracking-wide">
                {topic}
              </h3>
              <div className="space-y-6">
                {skills.map((skill: any) => (
                  <div key={skill.id || skill.skill_name} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className="font-medium text-gray-900">{skill.skill_name}</h4>
                      <div className="flex items-center gap-4">
                        <span className={`font-semibold ${getScoreColor(skill.score)}`}>
                          {skill.score}%
                        </span>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => onGeneratePracticeTest(skill.skill_name)}
                          className="text-sm"
                        >
                          📝 Generate Practice Exercise
                        </Button>
                      </div>
                    </div>
                    <Progress value={skill.score} className="h-6" />
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
