
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PracticeTestGenerator } from "@/components/PracticeTestGenerator";
import { Zap, BookOpen } from "lucide-react";
import { getScoreColor } from "@/utils/scoreColors";

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

  // Enhanced loading component with realistic skeleton placeholders
  const LoadingSkeleton = () => (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-xl font-semibold text-slate-800">Content-Specific Skills</CardTitle>
        <div className="flex items-center gap-2">
          <Skeleton className="h-9 w-32" />
          <Skeleton className="h-9 w-40" />
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <div className="flex items-center justify-center py-4 mb-6">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-slate-600"></div>
          <span className="ml-3 text-slate-600 animate-pulse">Loading content skills...</span>
        </div>
        
        <div className="space-y-8">
          {/* Skeleton for multiple topic sections */}
          {[1, 2, 3].map((topicIndex) => (
            <div key={topicIndex} className="space-y-4">
              {/* Topic header skeleton */}
              <div className="flex items-center gap-3">
                <div className="h-px bg-gradient-to-r from-slate-300 to-transparent flex-1"></div>
                <Skeleton className="h-6 w-48 rounded-full" />
                <div className="h-px bg-gradient-to-l from-slate-300 to-transparent flex-1"></div>
              </div>
              
              {/* Skills skeleton cards */}
              <div className="space-y-4">
                {[1, 2, 3, 4].map((skillIndex) => (
                  <div key={skillIndex} className="p-4 rounded-lg border border-slate-200 bg-white">
                    <div className="flex items-center justify-between mb-3">
                      <Skeleton className="h-5 w-64" />
                      <div className="flex items-center gap-4">
                        <Skeleton className="h-16 w-16 rounded-full" />
                        <Skeleton className="h-8 w-40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <Card className="w-full border-slate-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-slate-100 bg-slate-50/50">
        <CardTitle className="text-xl font-semibold text-slate-800">
          {classData?.subject || ''} Content-Specific Skills
        </CardTitle>
        {isClassView && (
          <Button
            variant="destructive"
            onClick={() => onGeneratePracticeTest('super-exercise-content')}
            disabled={skillsForSuperExercise.length === 0}
            className="bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow-sm"
          >
            <Zap className="h-4 w-4 mr-2" />
            Create a Super Exercise
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-6">
        {Object.keys(groupedSkills).length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-slate-700 mb-2">No skills data available</h3>
            <p className="text-slate-500 max-w-md mx-auto">
              There are no content skills recorded for this {classData?.subject || 'subject'} yet.
              Skills will appear once they have been assessed.
            </p>
          </div>
        ) : (
          <div className="space-y-8">
            {Object.entries(groupedSkills).map(([topic, skills]) => (
              <div key={topic} className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-px bg-gradient-to-r from-slate-300 to-transparent flex-1"></div>
                  <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider px-3 py-1 bg-slate-100 rounded-full">
                    {topic}
                  </h3>
                  <div className="h-px bg-gradient-to-l from-slate-300 to-transparent flex-1"></div>
                </div>
                <div className="space-y-4">
                  {skills.map((skill: any) => (
                    <div key={skill.id || skill.skill_name} className="group p-4 rounded-lg border border-slate-200 bg-white hover:shadow-md transition-all duration-200">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-slate-900 group-hover:text-slate-700 transition-colors">
                          {skill.skill_name}
                        </h4>
                        <div className="flex items-center gap-4">
                          <div className="flex flex-col items-center">
                            <div className="text-xs text-slate-600 text-center mb-2">Score</div>
                            <div 
                              className={`h-16 w-16 rounded-full bg-gradient-to-br ${getScoreColor(skill.score)} 
                                flex items-center justify-center shadow-sm hover:shadow-md hover:scale-105 
                                transition-all duration-200`}
                            >
                              <span className="text-sm font-bold text-white drop-shadow-sm">
                                {skill.score}%
                              </span>
                            </div>
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => onGeneratePracticeTest(skill.skill_name)}
                            className="text-xs font-medium border-slate-300 hover:bg-slate-50 hover:border-slate-400 transition-all duration-200"
                          >
                            <BookOpen className="h-3 w-3 mr-2" />
                            Generate Practice Exercise
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
