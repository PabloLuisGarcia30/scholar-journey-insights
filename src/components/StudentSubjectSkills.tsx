
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import { MoreVertical, ArrowRight, FileText, Zap, MousePointer } from "lucide-react";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";
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
  const { 
    selectedSkills, 
    isSelectionMode, 
    toggleSelectionMode, 
    toggleSkillSelection, 
    canSelectMore,
    maxSkills 
  } = useMultiSkillSelection();

  // Use comprehensive data if available, otherwise fall back to class subject skills
  const relevantSkills = comprehensiveSubjectSkillData.length > 0 
    ? comprehensiveSubjectSkillData 
    : classSubjectSkills.map(skill => ({
        id: skill.id || skill.skill_name,
        skill_name: skill.skill_name || skill.name,
        score: 0, // No score data available yet
        skill_description: skill.skill_description || skill.description || 'No description available'
      }));

  // Filter skills for "Super Exercise" (all skills below 80%)
  const skillsForSuperExercise = relevantSkills.filter(skill => (skill.score || 0) < 80);

  const isSkillSelected = (skillName: string) => {
    return selectedSkills.some(skill => skill.name === skillName);
  };

  const handleSkillSelection = (skill: any, event: React.MouseEvent) => {
    event.stopPropagation();
    toggleSkillSelection({
      id: skill.id || skill.skill_name,
      name: skill.skill_name,
      score: skill.score || 0,
      type: 'subject'
    });
  };

  const handleSkillClick = (skillName: string) => {
    if (isSelectionMode) {
      const skill = relevantSkills.find(s => s.skill_name === skillName);
      if (skill) {
        const canSelect = canSelectMore || isSkillSelected(skillName);
        if (canSelect) {
          handleSkillSelection(skill, { stopPropagation: () => {} } as React.MouseEvent);
        }
      }
    } else {
      onGeneratePracticeTest(skillName);
    }
  };

  const handlePractice = (skillName: string) => {
    if (isSelectionMode) {
      const skill = relevantSkills.find(s => s.skill_name === skillName);
      if (skill) {
        handleSkillSelection(skill, { stopPropagation: () => {} } as React.MouseEvent);
      }
    } else {
      onGeneratePracticeTest(skillName);
    }
  };

  const isLoading = subjectSkillsLoading || classSubjectSkillsLoading;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Subject-Specific Skills</CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className={isSelectionMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <MousePointer className="h-4 w-4 mr-2" />
            {isSelectionMode ? `Selected ${selectedSkills.length}/${maxSkills}` : 'Multi-Select'}
          </Button>

          {isClassView && !isSelectionMode && (
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
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-280px)] w-full">
          <div className="p-4 space-y-4">
            {isLoading ? (
              <p>Loading subject skills...</p>
            ) : relevantSkills.length === 0 ? (
              <p>No subject-specific skills found.</p>
            ) : (
              relevantSkills.map((skill: any) => {
                const skillName = skill.skill_name;
                const score = skill.score || 0;
                const isSelected = isSkillSelected(skillName);
                const canSelect = canSelectMore || isSelected;

                return (
                  <div 
                    key={skill.id || skillName} 
                    className={`relative border rounded-lg p-4 cursor-pointer transition-all duration-200 ${
                      isSelected 
                        ? 'border-blue-500 bg-blue-50 shadow-md' 
                        : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                    } ${
                      isSelectionMode && !canSelect 
                        ? 'opacity-50 cursor-not-allowed' 
                        : ''
                    }`}
                    onClick={() => handleSkillClick(skillName)}
                    title={isSelectionMode ? (canSelect ? "Click to select skill" : "Maximum skills selected") : "Click to generate practice exercise"}
                  >
                    {isSelectionMode && (
                      <div className="absolute top-3 right-3 z-10">
                        <Checkbox
                          checked={isSelected}
                          disabled={!canSelect}
                          onCheckedChange={() => handleSkillSelection(skill, { stopPropagation: () => {} } as React.MouseEvent)}
                          className="h-5 w-5"
                        />
                      </div>
                    )}

                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center space-x-4">
                        <Avatar>
                          <AvatarImage src={`https://avatar.vercel.sh/${skillName}.png`} />
                          <AvatarFallback>{skillName.substring(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className={`text-lg font-semibold ${isSelected ? 'text-blue-900' : ''}`}>
                            {skillName}
                          </h3>
                          <p className="text-sm text-gray-500">{skill.skill_description || 'No description available'}</p>
                        </div>
                      </div>
                      {!isSelectionMode && (
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
                      )}
                    </div>
                    <div className="mb-4">
                      <div className="text-sm font-medium mb-1">Progress: {score}%</div>
                      <Progress value={score} />
                    </div>
                    {!isSelectionMode && (
                      <>
                        <Button 
                          variant="secondary" 
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePractice(skillName);
                          }}
                        >
                          Practice this Skill <ArrowRight className="ml-2 h-4 w-4" />
                        </Button>
                        <div className="mt-2 text-xs text-gray-500">
                          Click anywhere on this card to create a practice exercise
                        </div>
                      </>
                    )}
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
