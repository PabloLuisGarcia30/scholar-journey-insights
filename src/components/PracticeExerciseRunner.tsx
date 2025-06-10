
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { CheckCircle, XCircle, Clock, BookOpen } from 'lucide-react';
import { PracticeExerciseGradingService, type PracticeExerciseAnswer, type ExerciseSubmissionResult } from '@/services/practiceExerciseGradingService';

interface PracticeQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
  targetSkill: string;
}

interface PracticeExerciseData {
  title: string;
  description: string;
  questions: PracticeQuestion[];
  totalPoints: number;
  estimatedTime: number;
}

interface Props {
  exerciseData: PracticeExerciseData;
  onComplete: (results: ExerciseSubmissionResult) => void;
  onExit?: () => void;
}

export function PracticeExerciseRunner({ exerciseData, onComplete, onExit }: Props) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [startTime] = useState(new Date());
  const [timeElapsed, setTimeElapsed] = useState(0);

  const currentQuestion = exerciseData.questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / exerciseData.questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === exerciseData.questions.length - 1;
  const hasAnsweredCurrent = answers[currentQuestion.id]?.trim().length > 0;

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((Date.now() - startTime.getTime()) / 1000));
    }, 1000);

    return () => clearInterval(timer);
  }, [startTime]);

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < exerciseData.questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);

    try {
      // Prepare answers for grading
      const exerciseAnswers: PracticeExerciseAnswer[] = exerciseData.questions.map(question => ({
        questionId: question.id,
        studentAnswer: answers[question.id] || '',
        questionType: question.type,
        correctAnswer: question.correctAnswer,
        acceptableAnswers: question.acceptableAnswers,
        keywords: question.keywords,
        options: question.options,
        points: question.points
      }));

      // Grade the exercise
      const results = await PracticeExerciseGradingService.gradeExerciseSubmission(
        exerciseAnswers,
        exerciseData.title
      );

      onComplete(results);
    } catch (error) {
      console.error('Error grading exercise:', error);
      // Create fallback results
      const fallbackResults: ExerciseSubmissionResult = {
        totalScore: 0,
        totalPossible: exerciseData.totalPoints,
        percentageScore: 0,
        questionResults: exerciseData.questions.map(q => ({
          questionId: q.id,
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: q.points,
          feedback: 'Unable to grade automatically. Please review with instructor.',
          gradingMethod: 'exact_match' as const,
          confidence: 0
        })),
        overallFeedback: 'There was an issue grading your exercise. Please contact your instructor.',
        completedAt: new Date()
      };
      onComplete(fallbackResults);
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const renderQuestion = () => {
    const answer = answers[currentQuestion.id] || '';

    switch (currentQuestion.type) {
      case 'multiple-choice':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={answer}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              {currentQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`option-${index}`} />
                  <Label htmlFor={`option-${index}`} className="cursor-pointer">
                    {option}
                  </Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        );

      case 'true-false':
        return (
          <div className="space-y-4">
            <RadioGroup
              value={answer}
              onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
            >
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="True" id="true" />
                <Label htmlFor="true" className="cursor-pointer">True</Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="False" id="false" />
                <Label htmlFor="false" className="cursor-pointer">False</Label>
              </div>
            </RadioGroup>
          </div>
        );

      case 'short-answer':
        return (
          <div className="space-y-4">
            <Input
              placeholder="Enter your answer..."
              value={answer}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full"
            />
            <p className="text-sm text-muted-foreground">
              Provide a clear, concise answer. Key concepts will be evaluated.
            </p>
          </div>
        );

      case 'essay':
        return (
          <div className="space-y-4">
            <Textarea
              placeholder="Write your detailed response..."
              value={answer}
              onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
              className="w-full min-h-32"
            />
            <p className="text-sm text-muted-foreground">
              Provide a thorough explanation with examples and reasoning.
            </p>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                {exerciseData.title}
              </CardTitle>
              <p className="text-muted-foreground mt-1">
                {exerciseData.description}
              </p>
            </div>
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {formatTime(timeElapsed)}
              </div>
              {onExit && (
                <Button variant="outline" size="sm" onClick={onExit}>
                  Exit
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Progress */}
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span>Question {currentQuestionIndex + 1} of {exerciseData.questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <Progress value={progress} className="w-full" />
      </div>

      {/* Current Question */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Question {currentQuestionIndex + 1}
            <span className="text-sm font-normal ml-2 text-muted-foreground">
              ({currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'})
            </span>
          </CardTitle>
          <p className="text-base">{currentQuestion.question}</p>
          <p className="text-sm text-muted-foreground">
            Skill: {currentQuestion.targetSkill}
          </p>
        </CardHeader>
        <CardContent>
          {renderQuestion()}
        </CardContent>
      </Card>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <Button
          variant="outline"
          onClick={handlePrevious}
          disabled={currentQuestionIndex === 0}
        >
          Previous
        </Button>

        <div className="flex gap-2">
          {exerciseData.questions.map((_, index) => (
            <button
              key={index}
              className={`w-8 h-8 rounded-full text-sm ${
                index === currentQuestionIndex
                  ? 'bg-primary text-primary-foreground'
                  : answers[exerciseData.questions[index].id]
                  ? 'bg-green-100 text-green-800 border border-green-300'
                  : 'bg-muted text-muted-foreground border'
              }`}
              onClick={() => setCurrentQuestionIndex(index)}
            >
              {index + 1}
            </button>
          ))}
        </div>

        {isLastQuestion ? (
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !hasAnsweredCurrent}
            className="bg-green-600 hover:bg-green-700"
          >
            {isSubmitting ? 'Submitting...' : 'Submit Exercise'}
          </Button>
        ) : (
          <Button
            onClick={handleNext}
            disabled={!hasAnsweredCurrent}
          >
            Next
          </Button>
        )}
      </div>

      {/* Answer Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Progress Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <span>
                Answered: {Object.keys(answers).filter(id => answers[id]?.trim()).length}/{exerciseData.questions.length}
              </span>
            </div>
            <div>
              Total Points: {exerciseData.totalPoints}
            </div>
            <div>
              Estimated Time: {exerciseData.estimatedTime} min
            </div>
            <div>
              Skills: {[...new Set(exerciseData.questions.map(q => q.targetSkill))].length}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
