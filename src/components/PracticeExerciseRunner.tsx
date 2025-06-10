import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle, BookOpen } from "lucide-react";
import { toast } from "sonner";
import { PracticeExerciseReview } from "./PracticeExerciseReview";

interface PracticeExerciseRunnerProps {
  exercise: any;
  onComplete: (result: { exerciseId: string; score: number; answers: any; totalPoints: number; earnedPoints: number }) => void;
  onBack: () => void;
}

interface Question {
  id: string;
  type: string;
  question: string;
  options?: string[];
  correctAnswer?: string;
  points?: number;
}

export function PracticeExerciseRunner({ 
  exercise, 
  onComplete, 
  onBack 
}: PracticeExerciseRunnerProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [currentAnswers, setCurrentAnswers] = useState<Record<string, any>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [score, setScore] = useState(0);
  const [showReview, setShowReview] = useState(false);

  const questions = exercise?.exercise_data?.questions as Question[];
  const currentQuestion = questions?.[currentQuestionIndex];

  const handleNextQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.min(prev + 1, (questions?.length || 1) - 1));
  };

  const handlePreviousQuestion = () => {
    setCurrentQuestionIndex((prev) => Math.max(prev - 1, 0));
  };

  const handleAnswerChange = (questionId: string, answer: any) => {
    setCurrentAnswers((prev) => ({ ...prev, [questionId]: answer }));
  };

  const handleSubmit = async () => {
    if (!exercise?.exercise_data?.questions) return;

    try {
      setIsSubmitting(true);
      
      const totalPoints = exercise.exercise_data.questions.reduce((sum, q) => sum + (q.points || 1), 0);
      let earnedPoints = 0;

      exercise.exercise_data.questions.forEach((question: Question) => {
        const questionId = `question_${currentQuestionIndex + 1}`;
        const studentAnswer = currentAnswers[questionId];

        if (question.type === 'multiple-choice') {
          if (studentAnswer === question.correctAnswer) {
            earnedPoints += question.points || 1;
          }
        } else if (question.type === 'true-false') {
          if (String(studentAnswer).toLowerCase() === String(question.correctAnswer).toLowerCase()) {
            earnedPoints += question.points || 1;
          }
        } else {
          // For short-answer and essay questions, you might need a more sophisticated grading system
          // This is a placeholder that gives points if the answer is not empty
          if (studentAnswer && studentAnswer.trim() !== '') {
            earnedPoints += question.points || 1;
          }
        }
      });

      const finalScore = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
      
      console.log(`📊 Exercise completed: ${earnedPoints}/${totalPoints} points (${finalScore}%)`);
      
      await onComplete({
        exerciseId: exercise.id,
        score: finalScore,
        answers: currentAnswers,
        totalPoints,
        earnedPoints
      });

      setScore(finalScore);
      setShowResults(true);
      
    } catch (error) {
      console.error('Error submitting exercise:', error);
      toast.error('Failed to submit exercise. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // NEW: Handle showing answer review
  const handleShowReview = () => {
    setShowReview(true);
  };

  const handleBackFromReview = () => {
    setShowReview(false);
  };

  // NEW: If showing review, render the review component
  if (showReview) {
    return (
      <PracticeExerciseReview
        exerciseId={exercise.id}
        studentAnswers={currentAnswers}
        onBack={handleBackFromReview}
        exerciseTitle={exercise.exercise_data?.title || "Practice Exercise"}
        studentScore={score}
        totalPoints={exercise.exercise_data?.totalPoints}
      />
    );
  }

  if (!exercise) {
    return <div>Loading exercise...</div>;
  }

  if (isSubmitting) {
    return <div>Submitting...</div>;
  }

  if (showResults) {
    return (
      <div className="p-6">
        <div className="max-w-2xl mx-auto text-center space-y-6">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exercise Complete!</h2>
            <div className="text-6xl font-bold text-blue-600 mb-4">
              {score}%
            </div>
            <p className="text-gray-600">
              Great work! You've completed the practice exercise.
            </p>
          </div>
          
          <div className="flex gap-3 justify-center">
            <Button onClick={onBack} variant="outline">
              Back to Exercises
            </Button>
            <Button onClick={handleShowReview} className="bg-blue-600 hover:bg-blue-700">
              <BookOpen className="h-4 w-4 mr-2" />
              Review Answers
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-4">
        <Button variant="ghost" onClick={onBack}>
          Go Back
        </Button>
        <div>
          Question {currentQuestionIndex + 1} / {questions?.length}
        </div>
      </div>
      
      <div className="max-w-4xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>{exercise?.exercise_data?.title || 'Practice Exercise'}</CardTitle>
            <CardDescription>{exercise?.exercise_data?.description}</CardDescription>
          </CardHeader>
          
          <CardContent className="p-6">
            {currentQuestion && (
              <div className="space-y-4">
                <div className="text-xl font-semibold">{currentQuestion.question}</div>
                
                {currentQuestion.type === 'multiple-choice' && currentQuestion.options && (
                  <RadioGroup
                    defaultValue={currentAnswers[`question_${currentQuestionIndex + 1}`] || ''}
                    onValueChange={(value) => handleAnswerChange(`question_${currentQuestionIndex + 1}`, value)}
                  >
                    <div className="grid gap-2">
                      {currentQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <RadioGroupItem value={option} id={`r${index}`} />
                          <Label htmlFor={`r${index}`}>{option}</Label>
                        </div>
                      ))}
                    </div>
                  </RadioGroup>
                )}
                
                {currentQuestion.type === 'true-false' && (
                  <RadioGroup
                    defaultValue={currentAnswers[`question_${currentQuestionIndex + 1}`] || ''}
                    onValueChange={(value) => handleAnswerChange(`question_${currentQuestionIndex + 1}`, value)}
                  >
                    <div className="grid gap-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="true" id="true" />
                        <Label htmlFor="true">True</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="false" id="false" />
                        <Label htmlFor="false">False</Label>
                      </div>
                    </div>
                  </RadioGroup>
                )}
                
                {['short-answer', 'essay'].includes(currentQuestion.type) && (
                  <div className="space-y-2">
                    <Label htmlFor="answer">Your Answer</Label>
                    <Textarea 
                      id="answer"
                      value={currentAnswers[`question_${currentQuestionIndex + 1}`] || ''}
                      onChange={(e) => handleAnswerChange(`question_${currentQuestionIndex + 1}`, e.target.value)}
                      placeholder="Enter your answer here"
                    />
                  </div>
                )}
              </div>
            )}
          </CardContent>
          
          <CardFooter className="flex justify-between">
            <Button 
              variant="secondary"
              onClick={handlePreviousQuestion}
              disabled={currentQuestionIndex === 0}
            >
              Previous
            </Button>
            {currentQuestionIndex < (questions?.length || 0) - 1 ? (
              <Button onClick={handleNextQuestion}>Next</Button>
            ) : (
              <Button onClick={handleSubmit}>Submit</Button>
            )}
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
