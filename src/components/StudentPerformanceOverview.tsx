
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Users, TrendingUp, AlertTriangle, CheckCircle, MousePointer, Zap } from "lucide-react";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";

interface StudentPerformanceOverviewProps {
  onGeneratePracticeTest?: (skillName: string, studentId?: string) => void;
  onSelectStudent?: (studentId: string) => void;
}

export function StudentPerformanceOverview({ 
  onGeneratePracticeTest,
  onSelectStudent
}: StudentPerformanceOverviewProps) {
  const { 
    selectedSkills, 
    isSelectionMode, 
    toggleSelectionMode, 
    toggleSkillSelection, 
    canSelectMore,
    maxSkills 
  } = useMultiSkillSelection();

  // Mock data for demonstration - in a real app, this would come from props or a hook
  const performanceData = [
    {
      studentId: "student-1",
      studentName: "Alex Johnson",
      skills: [
        { name: "Algebra", score: 85, type: "content" as const },
        { name: "Geometry", score: 72, type: "content" as const },
        { name: "Problem Solving", score: 90, type: "subject" as const }
      ]
    },
    {
      studentId: "student-2", 
      studentName: "Sarah Chen",
      skills: [
        { name: "Algebra", score: 78, type: "content" as const },
        { name: "Statistics", score: 88, type: "content" as const },
        { name: "Critical Thinking", score: 82, type: "subject" as const }
      ]
    },
    {
      studentId: "student-3",
      studentName: "Mike Rodriguez", 
      skills: [
        { name: "Calculus", score: 65, type: "content" as const },
        { name: "Trigonometry", score: 70, type: "content" as const },
        { name: "Analysis", score: 68, type: "subject" as const }
      ]
    },
    {
      studentId: "student-4",
      studentName: "Emma Wilson",
      skills: [
        { name: "Algebra", score: 92, type: "content" as const },
        { name: "Geometry", score: 89, type: "content" as const },
        { name: "Communication", score: 94, type: "subject" as const }
      ]
    }
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 70) return "text-yellow-600"; 
    return "text-red-600";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const isSkillSelected = (skillName: string, studentId: string) => {
    return selectedSkills.some(skill => skill.name === skillName && skill.id.includes(studentId));
  };

  const handleSkillClick = (skill: any, studentId: string, studentName: string) => {
    if (isSelectionMode) {
      const canSelect = canSelectMore || isSkillSelected(skill.name, studentId);
      if (canSelect) {
        const skillId = `${studentId}-${skill.name}`;
        toggleSkillSelection({
          id: skillId,
          name: `${skill.name} (${studentName})`,
          score: skill.score,
          type: skill.type,
          studentId,
          studentName
        });
      }
    } else {
      if (onGeneratePracticeTest) {
        onGeneratePracticeTest(skill.name, studentId);
      }
    }
  };

  // Calculate overall stats
  const allSkills = performanceData.flatMap(student => student.skills);
  const averageScore = allSkills.reduce((sum, skill) => sum + skill.score, 0) / allSkills.length;
  const strugglingSkills = allSkills.filter(skill => skill.score < 70).length;
  const excellentSkills = allSkills.filter(skill => skill.score >= 90).length;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Student Performance Overview
          </CardTitle>
          <p className="text-sm text-gray-600 mt-1">
            Click on skill circles to generate practice tests or use multi-select mode
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={isSelectionMode ? "default" : "outline"}
            onClick={toggleSelectionMode}
            className={isSelectionMode ? "bg-blue-600 hover:bg-blue-700" : ""}
          >
            <MousePointer className="h-4 w-4 mr-2" />
            {isSelectionMode ? `Selected ${selectedSkills.length}/${maxSkills}` : 'Multi-Select'}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Quick Stats */}
        <div className="grid grid-cols-4 gap-4">
          <div className="text-center p-3 bg-blue-50 rounded-lg">
            <Users className="h-6 w-6 text-blue-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-blue-600">{performanceData.length}</div>
            <div className="text-xs text-blue-600">Students</div>
          </div>
          <div className="text-center p-3 bg-green-50 rounded-lg">
            <TrendingUp className="h-6 w-6 text-green-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-green-600">{averageScore.toFixed(0)}%</div>
            <div className="text-xs text-green-600">Avg Score</div>
          </div>
          <div className="text-center p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="h-6 w-6 text-red-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-red-600">{strugglingSkills}</div>
            <div className="text-xs text-red-600">Need Help</div>
          </div>
          <div className="text-center p-3 bg-emerald-50 rounded-lg">
            <CheckCircle className="h-6 w-6 text-emerald-600 mx-auto mb-1" />
            <div className="text-2xl font-bold text-emerald-600">{excellentSkills}</div>
            <div className="text-xs text-emerald-600">Excellent</div>
          </div>
        </div>

        {/* Student Performance Grid */}
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Individual Student Performance</h3>
          <div className="grid gap-4">
            {performanceData.map((student) => (
              <div key={student.studentId} className="p-4 border rounded-lg bg-white">
                <div className="flex items-center justify-between mb-3">
                  <div 
                    className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded-lg transition-colors"
                    onClick={() => onSelectStudent?.(student.studentId)}
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">
                        {student.studentName.split(' ').map(n => n[0]).join('')}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <h4 className="font-medium">{student.studentName}</h4>
                      <p className="text-xs text-gray-500">Click to view full profile</p>
                    </div>
                  </div>
                  <Badge variant="outline">
                    Avg: {(student.skills.reduce((sum, skill) => sum + skill.score, 0) / student.skills.length).toFixed(0)}%
                  </Badge>
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                  {student.skills.map((skill) => {
                    const isSelected = isSkillSelected(skill.name, student.studentId);
                    const canSelect = canSelectMore || isSelected;
                    
                    return (
                      <div 
                        key={`${student.studentId}-${skill.name}`}
                        className={`relative p-3 border rounded-lg cursor-pointer transition-all duration-200 ${
                          isSelected 
                            ? 'border-blue-500 bg-blue-50 shadow-md' 
                            : 'border-gray-200 hover:shadow-md hover:border-gray-300'
                        } ${
                          isSelectionMode && !canSelect 
                            ? 'opacity-50 cursor-not-allowed' 
                            : ''
                        }`}
                        onClick={() => handleSkillClick(skill, student.studentId, student.studentName)}
                        title={
                          isSelectionMode 
                            ? (canSelect ? "Click to select skill" : "Maximum skills selected") 
                            : "Click to generate practice exercise"
                        }
                      >
                        {isSelectionMode && (
                          <div className="absolute top-2 right-2 z-10">
                            <Checkbox
                              checked={isSelected}
                              disabled={!canSelect}
                              onCheckedChange={() => handleSkillClick(skill, student.studentId, student.studentName)}
                              className="h-4 w-4"
                            />
                          </div>
                        )}
                        
                        <div className="text-center">
                          <div className={`text-sm font-medium mb-1 ${isSelected ? 'text-blue-900' : ''}`}>
                            {skill.name}
                          </div>
                          <div className={`text-lg font-bold mb-2 ${getScoreColor(skill.score)}`}>
                            {skill.score}%
                          </div>
                          <Progress 
                            value={skill.score} 
                            className="h-2"
                          />
                          <div 
                            className={`absolute bottom-0 left-0 h-1 rounded-b-lg transition-all duration-300 ${getProgressColor(skill.score)}`}
                            style={{ width: `${skill.score}%` }}
                          />
                        </div>
                        
                        {!isSelectionMode && (
                          <div className="mt-2 text-xs text-gray-500 text-center">
                            Click to practice
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
