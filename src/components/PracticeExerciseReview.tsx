
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, XCircle, ArrowLeft, BookOpen } from "lucide-react";
import { PracticeAnswerKeyService, StudentAnswerComparison } from "@/services/practiceAnswerKeyService";
import { toast } from "sonner";

interface PracticeExerciseReviewProps {
  exerciseId: string;
  studentAnswers: Record<string, any>;
  onBack: () => void;
  exerciseTitle?: string;
  studentScore?: number;
  totalPoints?: number;
}

export function PracticeExerciseReview({
  exerciseId,
  studentAnswers,
  onBack,
  exerciseTitle = "Practice Exercise",
  studentScore,
  totalPoints
}: PracticeExerciseReviewProps) {
  const [comparisons, setComparisons] = useState<StudentAnswerComparison[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadAnswerComparisons();
  }, [exerciseId, studentAnswers]);

  const loadAnswerComparisons = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const answerComparisons = await PracticeAnswerKeyService.compareStudentAnswers(
        exerciseId,
        studentAnswers
      );
      
      setComparisons(answerComparisons);
    } catch (error) {
      console.error('Failed to load answer comparisons:', error);
      setError('Failed to load answer review. Please try again.');
      toast.error('Failed to load answer review');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = () => {
    const totalQuestions = comparisons.length;
    const correctAnswers = comparisons.filter(c => c.isCorrect).length;
    const totalEarnedPoints = comparisons.reduce((sum, c) => sum + c.earnedPoints, 0);
    const totalPossiblePoints = comparisons.reduce((sum, c) => sum + c.points, 0);
    
    return {
      totalQuestions,
      correctAnswers,
      totalEarnedPoints,
      totalPossiblePoints,
      percentage: totalPossiblePoints > 0 ? Math.round((totalEarnedPoints / totalPossiblePoints) * 100) : 0
    };
  };

  const formatAnswer = (answer: string, questionType: string, options?: any) => {
    if (questionType === 'multiple-choice' && options?.options) {
      // Try to find the full option text if it's just a letter
      const letterMatch = answer.match(/^[A-D]$/i);
      if (letterMatch) {
        const optionIndex = letterMatch[0].toUpperCase().charCodeAt(0) - 65;
        if (options.options[optionIndex]) {
          return `${letterMatch[0].toUpperCase()}) ${options.options[optionIndex]}`;
        }
      }
    }
    return answer;
  };

  if (loading) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">Loading answer review...</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <div className="flex items-center gap-2 mb-6">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <div className="max-w-4xl mx-auto">
          <Card>
            <CardContent className="p-6">
              <div className="text-center text-red-600">{error}</div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  const stats = calculateStats();

  return (
    <div className="p-6">
      <div className="flex items-center gap-2 mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Exercise Summary */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-blue-600" />
              {exerciseTitle} - Answer Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{stats.correctAnswers}</p>
                <p className="text-sm text-blue-700">Correct</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{stats.totalQuestions - stats.correctAnswers}</p>
                <p className="text-sm text-red-700">Incorrect</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{stats.totalEarnedPoints}</p>
                <p className="text-sm text-green-700">Points Earned</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{stats.percentage}%</p>
                <p className="text-sm text-purple-700">Overall Score</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Question by Question Review */}
        <div className="space-y-4">
          {comparisons.map((comparison) => (
            <Card key={comparison.questionNumber} className="border-l-4 border-l-gray-300">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Question {comparison.questionNumber}</span>
                      <Badge 
                        variant={comparison.isCorrect ? "default" : "destructive"}
                        className="flex items-center gap-1"
                      >
                        {comparison.isCorrect ? (
                          <CheckCircle className="h-3 w-3" />
                        ) : (
                          <XCircle className="h-3 w-3" />
                        )}
                        {comparison.isCorrect ? 'Correct' : 'Incorrect'}
                      </Badge>
                      <span className="text-sm text-gray-500">
                        {comparison.earnedPoints}/{comparison.points} points
                      </span>
                    </div>
                    <p className="text-gray-800">{comparison.questionText}</p>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Multiple Choice Options */}
                {comparison.questionType === 'multiple-choice' && comparison.options?.options && (
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="font-medium text-sm text-gray-600 mb-2">Options:</p>
                    <div className="grid grid-cols-1 gap-1">
                      {comparison.options.options.map((option: string, index: number) => (
                        <div key={index} className="text-sm">
                          {String.fromCharCode(65 + index)}) {option}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Answer Comparison */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="font-medium text-sm text-gray-600 mb-1">Your Answer:</p>
                    <div className={`p-3 rounded border ${
                      comparison.isCorrect 
                        ? 'border-green-200 bg-green-50' 
                        : 'border-red-200 bg-red-50'
                    }`}>
                      <p className={comparison.isCorrect ? 'text-green-800' : 'text-red-800'}>
                        {formatAnswer(comparison.studentAnswer, comparison.questionType, comparison.options) || 'No answer provided'}
                      </p>
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-sm text-gray-600 mb-1">Correct Answer:</p>
                    <div className="p-3 rounded border border-green-200 bg-green-50">
                      <p className="text-green-800">
                        {formatAnswer(comparison.correctAnswer, comparison.questionType, comparison.options)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Acceptable Answers */}
                {comparison.acceptableAnswers.length > 0 && (
                  <div>
                    <p className="font-medium text-sm text-gray-600 mb-1">Also Acceptable:</p>
                    <div className="p-3 rounded border border-blue-200 bg-blue-50">
                      <p className="text-blue-800 text-sm">
                        {comparison.acceptableAnswers.join(', ')}
                      </p>
                    </div>
                  </div>
                )}

                {/* Explanation */}
                <div>
                  <p className="font-medium text-sm text-gray-600 mb-1">Explanation:</p>
                  <div className="p-3 rounded border border-gray-200 bg-gray-50">
                    <p className="text-gray-700 text-sm">{comparison.explanation}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
