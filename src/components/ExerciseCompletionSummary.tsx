
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, BookOpen, TrendingUp, Clock } from 'lucide-react';

interface ExerciseCompletionSummaryProps {
  exerciseScore: number;
  totalQuestions: number;
  correctAnswers: number;
  timeSpent?: number;
  skillName: string;
  hasAnswerKey: boolean;
  onShowReview: () => void;
  onContinue: () => void;
}

export function ExerciseCompletionSummary({
  exerciseScore,
  totalQuestions,
  correctAnswers,
  timeSpent,
  skillName,
  hasAnswerKey,
  onShowReview,
  onContinue
}: ExerciseCompletionSummaryProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getRecommendation = (score: number) => {
    if (score >= 80) {
      return "🎉 Excellent work! You've mastered this skill. Consider trying more advanced exercises.";
    } else if (score >= 60) {
      return "📚 Good progress! Review the explanations and try similar practice questions.";
    } else {
      return "💪 Keep practicing! Focus on the concepts and ask for help if needed.";
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            Exercise Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Score Display */}
          <div className="text-center py-4">
            <div className={`text-4xl font-bold mb-2 ${getScoreColor(exerciseScore)}`}>
              {Math.round(exerciseScore)}%
            </div>
            <p className="text-lg text-muted-foreground">
              {correctAnswers} out of {totalQuestions} questions correct
            </p>
            <Badge variant="outline" className="mt-2">
              {skillName}
            </Badge>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</div>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
          </div>

          {timeSpent && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              <span>Time spent: {Math.round(timeSpent / 60)} minutes</span>
            </div>
          )}

          {/* Recommendation */}
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <TrendingUp className="h-4 w-4 text-blue-600" />
              <span className="font-medium text-blue-800">Recommendation</span>
            </div>
            <p className="text-sm text-blue-700">
              {getRecommendation(exerciseScore)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 justify-center">
            {hasAnswerKey && (
              <Button onClick={onShowReview} variant="outline" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Review Answers
              </Button>
            )}
            <Button onClick={onContinue} className="flex items-center gap-2">
              Continue
            </Button>
          </div>

          {!hasAnswerKey && (
            <p className="text-center text-sm text-muted-foreground">
              Answer review is not available for this exercise
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
