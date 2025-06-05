
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FileText, ChevronDown, Target } from "lucide-react";
import type { SkillScore, ContentSkill, SubjectSkill, ActiveClass } from "@/services/examService";

interface SkillScoresTabProps {
  isContentSkills: boolean;
  skillData: SkillScore[];
  classSkills: (ContentSkill | SubjectSkill)[];
  isClassView: boolean;
  classData?: ActiveClass;
  isLoading: boolean;
  onGeneratePracticeTest: (skillName?: string) => void;
}

export function SkillScoresTab({
  isContentSkills,
  skillData,
  classSkills,
  isClassView,
  classData,
  isLoading,
  onGeneratePracticeTest
}: SkillScoresTabProps) {
  const getMasteryColor = (mastery: number) => {
    if (mastery >= 90) return 'bg-green-100 text-green-700';
    if (mastery >= 80) return 'bg-blue-100 text-blue-700';
    if (mastery >= 70) return 'bg-yellow-100 text-yellow-700';
    if (mastery === 0) return 'bg-gray-100 text-gray-600';
    return 'bg-red-100 text-red-700';
  };

  // Create comprehensive skill data combining test scores with class skills
  const getComprehensiveSkillData = () => {
    if (isClassView && classSkills.length > 0) {
      const scoreMap = new Map(skillData.map(score => [score.skill_name, score]));
      return classSkills.map(skill => {
        const existingScore = scoreMap.get(skill.skill_name);
        return existingScore || {
          id: `placeholder-${skill.id}`,
          test_result_id: '',
          skill_name: skill.skill_name,
          score: 0,
          points_earned: 0,
          points_possible: 0,
          created_at: ''
        };
      });
    }
    return skillData;
  };

  const comprehensiveSkillData = getComprehensiveSkillData();

  // Group content skills by topic for better organization
  const groupSkillsByTopic = (skills: typeof comprehensiveSkillData) => {
    if (!isClassView || !isContentSkills) return { 'General Skills': skills };

    const skillsForGrouping = classSkills as ContentSkill[];
    if (!skillsForGrouping.length) return { 'General Skills': skills };

    const grouped: Record<string, typeof skills> = {};
    
    skills.forEach(skillScore => {
      const contentSkill = skillsForGrouping.find(cs => cs.skill_name === skillScore.skill_name);
      const topic = contentSkill?.topic || 'General Skills';
      
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(skillScore);
    });

    // Sort topics for Grade 10 Math
    if (classData && classData.subject === 'Math' && classData.grade === 'Grade 10') {
      const orderedTopics = [
        'ALGEBRA AND FUNCTIONS',
        'GEOMETRY', 
        'TRIGONOMETRY',
        'DATA ANALYSIS AND PROBABILITY',
        'PROBLEM SOLVING AND REASONING'
      ];

      const orderedGrouped: Record<string, typeof skills> = {};
      orderedTopics.forEach(topic => {
        if (grouped[topic]) {
          orderedGrouped[topic] = grouped[topic];
        }
      });

      Object.keys(grouped).forEach(topic => {
        if (!orderedTopics.includes(topic)) {
          orderedGrouped[topic] = grouped[topic];
        }
      });

      return orderedGrouped;
    }

    return grouped;
  };

  const groupedSkills = isContentSkills ? groupSkillsByTopic(comprehensiveSkillData) : { 'Skills': comprehensiveSkillData };

  const title = isContentSkills 
    ? (isClassView && classData ? `${classData.subject} ${classData.grade} Content-Specific Skills` : 'Content-Specific Skills')
    : 'Subject Specific Skill Mastery';

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (comprehensiveSkillData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No skill data available</h3>
            <p className="text-gray-600">
              {isClassView && classSkills.length === 0
                ? `No ${isContentSkills ? 'content' : 'subject'} skills found for this class.`
                : `${isContentSkills ? 'Content-specific' : 'Subject-specific'} skill analysis will appear here after test results are processed.`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{title}</CardTitle>
          {isContentSkills && (
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
          )}
        </div>
      </CardHeader>
      <CardContent>
        {isContentSkills ? (
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
          <div className="space-y-3">
            {comprehensiveSkillData.map((skill, index) => (
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
        )}
      </CardContent>
    </Card>
  );
}
