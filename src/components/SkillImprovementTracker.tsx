
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { TrendingUp, TrendingDown, Minus, Target, Calendar, Award } from 'lucide-react';
import type { SkillScoreCalculation } from '@/services/practiceExerciseSkillService';

interface SkillImprovementTrackerProps {
  authenticatedStudentId: string;
  recentSkillUpdates?: SkillScoreCalculation[];
  className?: string;
}

export function SkillImprovementTracker({ 
  authenticatedStudentId, 
  recentSkillUpdates = [],
  className 
}: SkillImprovementTrackerProps) {
  const [loading, setLoading] = useState(false);

  const getTrendIcon = (currentScore: number, newScore: number) => {
    if (newScore > currentScore) {
      return <TrendingUp className="h-4 w-4 text-green-600" />;
    } else if (newScore < currentScore) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    } else {
      return <Minus className="h-4 w-4 text-slate-400" />;
    }
  };

  const getTrendColor = (currentScore: number, newScore: number) => {
    if (newScore > currentScore) return 'text-green-600';
    if (newScore < currentScore) return 'text-red-500';
    return 'text-slate-500';
  };

  const getScoreChange = (currentScore: number, newScore: number) => {
    const change = newScore - currentScore;
    if (change === 0) return '±0%';
    return change > 0 ? `+${change}%` : `${change}%`;
  };

  if (recentSkillUpdates.length === 0) {
    return null;
  }

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Target className="h-5 w-5 text-blue-600" />
          Recent Skill Improvements
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {recentSkillUpdates.map((update, index) => {
          return (
            <div key={`${update.skillName}-${index}`} className="p-4 bg-slate-50 rounded-lg border">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-slate-900">{update.skillName}</h4>
                  <Badge variant="outline" className="text-xs">
                    {update.skillType === 'content' ? 'Content' : 'Subject'} Skill
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  {getTrendIcon(update.currentScore, update.updatedScore)}
                  <span className={`font-semibold ${getTrendColor(update.currentScore, update.updatedScore)}`}>
                    {getScoreChange(update.currentScore, update.updatedScore)}
                  </span>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm text-slate-600">
                  <span>Progress</span>
                  <span>{update.updatedScore}%</span>
                </div>
                <Progress value={update.updatedScore} className="h-2" />
                
                <div className="flex justify-between text-xs text-slate-500 mt-2">
                  <span>Previous: {update.currentScore}%</span>
                  <span>New: {update.updatedScore}%</span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-slate-200">
                <div className="flex items-center gap-4 text-xs text-slate-600">
                  <div className="flex items-center gap-1">
                    <Award className="h-3 w-3" />
                    <span>Practice exercise completed</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-3 w-3" />
                    <span>Skill improvement tracked</span>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="text-center py-4">
            <div className="inline-flex items-center gap-2 text-sm text-slate-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              Loading skill history...
            </div>
          </div>
        )}

        <div className="text-xs text-slate-500 text-center pt-2 border-t border-slate-200">
          Skill scores are automatically updated based on practice exercise performance using authenticated student profiles.
        </div>
      </CardContent>
    </Card>
  );
}
