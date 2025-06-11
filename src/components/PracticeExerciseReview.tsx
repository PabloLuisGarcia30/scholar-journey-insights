import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CheckCircle, XCircle, HelpCircle, BookOpen, Target, ArrowLeft, Lightbulb, Loader2, ChevronDown, ChevronUp } from 'lucide-react';
import { PracticeAnswerKeyService, type PracticeAnswerKey } from '@/services/practiceAnswerKeyService';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface PracticeExerciseReviewProps {
  exerciseId: string;
  studentAnswers: Record<string, string>;
  exerciseScore: number;
  onBack: () => void;
}

interface QuestionReview {
  id: string;
  question: string;
  type: string;
  studentAnswer: string;
  correctAnswer: string;
  explanation: string;
  isCorrect: boolean;
  points: number;
  targetSkill: string;
  options?: string[];
  learningObjective?: string;
}

export function PracticeExerciseReview({ 
  exerciseId, 
  studentAnswers, 
  exerciseScore, 
  onBack 
}: PracticeExerciseReviewProps) {
  const [answerKey, setAnswerKey] = useState<PracticeAnswerKey | null>(null);
  const [loading, setLoading] = useState(true);
  const [questionReviews, setQuestionReviews] = useState<QuestionReview[]>([]);
  const [detailedExplanations, setDetailedExplanations] = useState<Record<string, string>>({});
  const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});
  const [expandedExplanations, setExpandedExplanations] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadAnswerKey();
  }, [exerciseId]);

  const loadAnswerKey = async () => {
    try {
      setLoading(true);
      const key = await PracticeAnswerKeyService.getAnswerKey(exerciseId);
      
      if (!key) {
        toast.error('Answer key not found for this exercise');
        return;
      }

      setAnswerKey(key);
      
      // Process question reviews
      const reviews: QuestionReview[] = key.questions.map(q => {
        const studentAnswer = studentAnswers[q.id] || '';
        const isCorrect = evaluateAnswer(q, studentAnswer);
        
        return {
          id: q.id,
          question: q.question,
          type: q.type,
          studentAnswer,
          correctAnswer: q.correctAnswer,
          explanation: q.explanation,
          isCorrect,
          points: q.points,
          targetSkill: q.targetSkill,
          options: q.options,
          learningObjective: q.learningObjective
        };
      });
      
      setQuestionReviews(reviews);
    } catch (error) {
      console.error('Error loading answer key:', error);
      toast.error('Failed to load answer key');
    } finally {
      setLoading(false);
    }
  };

  const evaluateAnswer = (question: any, studentAnswer: string): boolean => {
    if (!studentAnswer.trim()) return false;
    
    const cleanStudentAnswer = studentAnswer.trim().toLowerCase();
    const cleanCorrectAnswer = question.correctAnswer.trim().toLowerCase();
    
    // Exact match for multiple choice and true/false
    if (question.type === 'multiple-choice' || question.type === 'true-false') {
      return cleanStudentAnswer === cleanCorrectAnswer;
    }
    
    // For short answer, check against acceptable answers and keywords
    if (question.type === 'short-answer') {
      // Check exact match first
      if (cleanStudentAnswer === cleanCorrectAnswer) return true;
      
      // Check acceptable answers
      if (question.acceptableAnswers?.some((acceptable: string) => 
        cleanStudentAnswer.includes(acceptable.toLowerCase()) ||
        acceptable.toLowerCase().includes(cleanStudentAnswer)
      )) {
        return true;
      }
      
      // Check keywords (partial credit approach)
      if (question.keywords?.some((keyword: string) => 
        cleanStudentAnswer.includes(keyword.toLowerCase())
      )) {
        return true;
      }
    }
    
    return false;
  };

  const handleExplainFurther = async (questionId: string, review: QuestionReview) => {
    if (detailedExplanations[questionId]) {
      // Toggle expanded state if explanation already exists
      setExpandedExplanations(prev => ({
        ...prev,
        [questionId]: !prev[questionId]
      }));
      return;
    }

    setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));

    try {
      const { data, error } = await supabase.functions.invoke('explain-concept', {
        body: {
          question: review.question,
          correctAnswer: review.correctAnswer,
          explanation: review.explanation,
          subject: answerKey?.metadata.subject || 'General',
          grade: answerKey?.metadata.grade || 'Grade 10',
          skillName: review.targetSkill
        }
      });

      if (error) throw error;

      setDetailedExplanations(prev => ({
        ...prev,
        [questionId]: data.detailedExplanation
      }));

      setExpandedExplanations(prev => ({
        ...prev,
        [questionId]: true
      }));

      toast.success('Detailed explanation generated!');
    } catch (error) {
      console.error('Error getting detailed explanation:', error);
      toast.error('Failed to generate detailed explanation. Please try again.');
    } finally {
      setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const correctAnswers = questionReviews.filter(q => q.isCorrect).length;
  const totalQuestions = questionReviews.length;
  const accuracy = totalQuestions > 0 ? Math.round((correctAnswers / totalQuestions) * 100) : 0;

  if (loading) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading answer review...</p>
        </CardContent>
      </Card>
    );
  }

  if (!answerKey) {
    return (
      <Card className="max-w-4xl mx-auto">
        <CardContent className="p-8 text-center">
          <HelpCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Answer Key Not Available</h3>
          <p className="text-slate-500 mb-4">The answer key for this exercise could not be found.</p>
          <Button onClick={onBack}>Back to Exercises</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="sm" onClick={onBack}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
              <div>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Exercise Review
                </CardTitle>
                <p className="text-muted-foreground mt-1">
                  {answerKey.metadata.skillName} - {answerKey.metadata.subject}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className={`text-2xl font-bold ${getScoreColor(exerciseScore)}`}>
                {Math.round(exerciseScore)}%
              </div>
              <p className="text-sm text-muted-foreground">Final Score</p>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      <Card>
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-green-600">{correctAnswers}</div>
              <p className="text-sm text-muted-foreground">Correct</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">{totalQuestions - correctAnswers}</div>
              <p className="text-sm text-muted-foreground">Incorrect</p>
            </div>
            <div>
              <div className={`text-2xl font-bold ${getScoreColor(accuracy)}`}>{accuracy}%</div>
              <p className="text-sm text-muted-foreground">Accuracy</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">{answerKey.metadata.totalPoints}</div>
              <p className="text-sm text-muted-foreground">Total Points</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Question Reviews */}
      <div className="space-y-4">
        {questionReviews.map((review, index) => (
          <Card key={review.id} className={`border-l-4 ${
            review.isCorrect ? 'border-l-green-500' : 'border-l-red-500'
          }`}>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                    <Badge variant={review.isCorrect ? "default" : "destructive"}>
                      {review.isCorrect ? (
                        <CheckCircle className="h-3 w-3 mr-1" />
                      ) : (
                        <XCircle className="h-3 w-3 mr-1" />
                      )}
                      {review.isCorrect ? 'Correct' : 'Incorrect'}
                    </Badge>
                    <Badge variant="outline">{review.points} pts</Badge>
                  </div>
                  <p className="text-base font-medium">{review.question}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Target className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Skill: {review.targetSkill}</span>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Show options for multiple choice */}
              {review.type === 'multiple-choice' && review.options && (
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground">Options:</p>
                  <div className="grid gap-2">
                    {review.options.map((option, optIndex) => (
                      <div
                        key={optIndex}
                        className={`p-2 rounded border text-sm ${
                          option === review.correctAnswer
                            ? 'bg-green-50 border-green-200 text-green-800'
                            : option === review.studentAnswer && !review.isCorrect
                            ? 'bg-red-50 border-red-200 text-red-800'
                            : 'bg-gray-50 border-gray-200'
                        }`}
                      >
                        {option}
                        {option === review.correctAnswer && (
                          <span className="ml-2 text-green-600">✓ Correct</span>
                        )}
                        {option === review.studentAnswer && option !== review.correctAnswer && (
                          <span className="ml-2 text-red-600">Your answer</span>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Your Answer */}
              <div>
                <p className="text-sm font-medium text-muted-foreground mb-1">Your Answer:</p>
                <div className={`p-3 rounded border ${
                  review.isCorrect 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-red-50 border-red-200'
                }`}>
                  <p className="text-sm">{review.studentAnswer || 'No answer provided'}</p>
                </div>
              </div>

              {/* Correct Answer (if different) */}
              {!review.isCorrect && (
                <div>
                  <p className="text-sm font-medium text-muted-foreground mb-1">Correct Answer:</p>
                  <div className="p-3 rounded border bg-green-50 border-green-200">
                    <p className="text-sm text-green-800">{review.correctAnswer}</p>
                  </div>
                </div>
              )}

              <Separator />

              {/* Explanation with Explain Further button */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-medium text-muted-foreground">Explanation:</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleExplainFurther(review.id, review)}
                    disabled={loadingExplanations[review.id]}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    {loadingExplanations[review.id] ? (
                      <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4 mr-1" />
                    )}
                    {detailedExplanations[review.id] ? 
                      (expandedExplanations[review.id] ? 'Hide detailed explanation' : 'Show detailed explanation') : 
                      'Explain further'
                    }
                    {detailedExplanations[review.id] && (
                      expandedExplanations[review.id] ? 
                        <ChevronUp className="h-4 w-4 ml-1" /> : 
                        <ChevronDown className="h-4 w-4 ml-1" />
                    )}
                  </Button>
                </div>
                <p className="text-sm leading-relaxed">{review.explanation}</p>

                {/* Detailed AI Explanation */}
                {detailedExplanations[review.id] && expandedExplanations[review.id] && (
                  <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <Lightbulb className="h-4 w-4 text-blue-600" />
                      <p className="text-sm font-medium text-blue-800">Detailed Explanation (Explained Simply):</p>
                    </div>
                    <div className="text-sm text-blue-700 leading-relaxed whitespace-pre-wrap">
                      {detailedExplanations[review.id]}
                    </div>
                  </div>
                )}
              </div>

              {/* Learning Objective */}
              {review.learningObjective && (
                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <p className="text-sm font-medium text-blue-800 mb-1">Learning Objective:</p>
                  <p className="text-sm text-blue-700">{review.learningObjective}</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Next Steps */}
      <Card>
        <CardHeader>
          <CardTitle>Next Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {accuracy >= 80 ? (
              <p className="text-green-700">
                🎉 Excellent work! You've mastered this skill. Consider trying more advanced exercises.
              </p>
            ) : accuracy >= 60 ? (
              <p className="text-yellow-700">
                📚 Good progress! Review the explanations above and try similar practice questions.
              </p>
            ) : (
              <p className="text-red-700">
                💪 Keep practicing! Focus on the concepts explained above and ask for help if needed.
              </p>
            )}
            <p className="text-sm text-muted-foreground mt-3">
              Skills practiced: {Array.from(new Set(questionReviews.map(q => q.targetSkill))).join(', ')}
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
