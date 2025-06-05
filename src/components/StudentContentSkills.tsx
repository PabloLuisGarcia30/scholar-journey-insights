
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PracticeTestGenerator } from "@/components/PracticeTestGenerator";
import { Zap, BookOpen } from "lucide-react";

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
    if (score >= 90) return "text-emerald-600";
    if (score >= 80) return "text-blue-600";
    if (score >= 70) return "text-amber-600";
    return "text-rose-600";
  };

  const getProgressColor = (score: number) => {
    return "bg-black";
  };

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
                        <Skeleton className="h-4 w-12" />
                        <Skeleton className="h-8 w-40" />
                      </div>
                    </div>
                    <div className="relative">
                      <Skeleton className="h-2 w-full rounded-full" />
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
        <CardTitle className="text-xl font-semibold text-slate-800">Content-Specific Skills</CardTitle>
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
                        <span className={`font-semibold text-sm ${getScoreColor(skill.score)}`}>
                          {skill.score}%
                        </span>
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
                    <div className="relative">
                      <Progress 
                        value={skill.score} 
                        className="h-2 bg-slate-100"
                      />
                      <div 
                        className={`absolute top-0 left-0 h-2 rounded-full transition-all duration-300 ${getProgressColor(skill.score)}`}
                        style={{ width: `${skill.score}%` }}
                      />
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
}
