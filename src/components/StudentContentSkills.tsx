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
  studentId: string;
  contentSkillScores: any[];
  classContentSkills: any[];
  isLoading: boolean;
  student: any;
  classData: any;
  isClassView: boolean;
  isPabloLuisGarcia: boolean;
}

export function StudentContentSkills({ 
  studentId, 
  contentSkillScores, 
  classContentSkills, 
  isLoading, 
  student, 
  classData,
  isClassView,
  isPabloLuisGarcia 
}: StudentContentSkillsProps) {
  const [showPracticeGenerator, setShowPracticeGenerator] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);

  // Process skill scores to map to class content skills
  const skillScoresMap = new Map();
  contentSkillScores.forEach(score => {
    skillScoresMap.set(score.skill_name, score);
  });

  // Merge class content skills with student scores
  const mergedSkills = classContentSkills.map((skill: any) => {
    const skillName = skill?.content_skills?.skill_name;
    const score = skillScoresMap.get(skillName);
    return {
      ...skill,
      score: score ? score.score : 0,
      points_earned: score ? score.points_earned : 0,
      points_possible: score ? score.points_possible : 0,
    };
  });

  // Sort skills by score (highest to lowest)
  const sortedSkills = [...mergedSkills].sort((a: any, b: any) => b.score - a.score);

  // Filter skills for "Super Exercise" (all skills below 80%)
  const skillsForSuperExercise = sortedSkills.filter(skill => skill.score < 80);

  if (showPracticeGenerator) {
    return (
      <PracticeTestGenerator
        studentName={student?.name || 'Unknown Student'}
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
                  {sortedSkills.map((skill: any) => (
                    <TableRow key={skill?.content_skills?.id}>
                      <TableCell className="font-medium">{skill?.content_skills?.skill_name}</TableCell>
                      <TableCell>{skill?.content_skills?.topic}</TableCell>
                      <TableCell>{skill?.content_skills?.grade}</TableCell>
                      <TableCell className="text-right">
                        <Progress value={skill.score} />
                        <span className="text-xs text-muted-foreground">
                          {skill.score}% ({skill.points_earned}/{skill.points_possible} pts)
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <Button 
                          variant="secondary" 
                          size="sm"
                          onClick={() => {
                            setSelectedSkill(skill?.content_skills?.skill_name);
                            setShowPracticeGenerator(true);
                          }}
                        >
                          Practice
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
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
            onClick={() => {
              setSelectedSkill('super-exercise-content');
              setShowPracticeGenerator(true);
            }}
            disabled={skillsForSuperExercise.length === 0}
          >
            Generate Super Exercise
          </Button>
        </div>
      )}
    </div>
  );
}
