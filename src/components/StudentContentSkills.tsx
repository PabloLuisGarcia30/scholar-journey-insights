
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { PracticeTestGenerator } from "@/components/PracticeTestGenerator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

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

  // Use the comprehensive skill data for rendering
  const sortedSkills = [...comprehensiveSkillData].sort((a: any, b: any) => b.score - a.score);

  // Filter skills for "Super Exercise" (all skills below 80%)
  const skillsForSuperExercise = sortedSkills.filter(skill => skill.score < 80);

  if (showPracticeGenerator) {
    return (
      <PracticeTestGenerator
        studentName="Student" // This will be passed from parent
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

  return (
    <div>
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Content-Specific Skills</CardTitle>
        </CardHeader>
        <CardContent className="pl-2 pb-4">
          {isLoading ? (
            <p>Loading content skills...</p>
          ) : (
            <ScrollArea className="h-[450px] w-full rounded-md border">
              <Table>
                <TableCaption>A list of content-specific skills for this class.</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[200px]">Skill</TableHead>
                    <TableHead>Topic</TableHead>
                    <TableHead>Grade</TableHead>
                    <TableHead className="text-right">Mastery</TableHead>
                    <TableHead className="text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {Object.entries(groupedSkills).map(([topic, skills]) => 
                    skills.map((skill: any) => (
                      <TableRow key={skill.id || skill.skill_name}>
                        <TableCell className="font-medium">{skill.skill_name}</TableCell>
                        <TableCell>{topic}</TableCell>
                        <TableCell>{classData?.grade || 'Grade 10'}</TableCell>
                        <TableCell className="text-right">
                          <Progress value={skill.score} />
                          <span className="text-xs text-muted-foreground">
                            {skill.score}% ({skill.points_earned || 0}/{skill.points_possible || 0} pts)
                          </span>
                        </TableCell>
                        <TableCell className="text-center">
                          <Button 
                            variant="secondary" 
                            size="sm"
                            onClick={() => onGeneratePracticeTest(skill.skill_name)}
                          >
                            Practice
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
      {isClassView && (
        <div className="mt-4">
          <Button
            variant="destructive"
            onClick={() => onGeneratePracticeTest('super-exercise-content')}
            disabled={skillsForSuperExercise.length === 0}
          >
            Generate Super Exercise
          </Button>
        </div>
      )}
    </div>
  );
}
