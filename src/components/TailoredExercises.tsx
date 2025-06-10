
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Clock, Play, CheckCircle, AlertCircle, Brain } from "lucide-react";
import { getStudentExercises, updateExerciseStatus, type StudentExercise } from "@/services/classSessionService";
import { SmartAnswerGradingService, type GradingResult } from "@/services/smartAnswerGradingService";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function TailoredExercises() {
  const [exercises, setExercises] = useState<StudentExercise[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedExercise, setSelectedExercise] = useState<StudentExercise | null>(null);

  useEffect(() => {
    loadExercises();
    
    // Set up real-time subscription for new exercises
    const channel = supabase
      .channel('student-exercises-changes')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'student_exercises'
      }, () => {
        loadExercises();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const loadExercises = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const studentExercises = await getStudentExercises(user.id);
      setExercises(studentExercises);
    } catch (error) {
      console.error('Error loading exercises:', error);
      toast.error('Failed to load exercises');
    } finally {
      setLoading(false);
    }
  };

  const handleStartExercise = async (exercise: StudentExercise) => {
    try {
      await updateExerciseStatus(exercise.id, 'in_progress');
      setSelectedExercise(exercise);
      setExercises(prev => 
        prev.map(ex => 
          ex.id === exercise.id 
            ? { ...ex, status: 'in_progress', started_at: new Date().toISOString() }
            : ex
        )
      );
    } catch (error) {
      console.error('Error starting exercise:', error);
      toast.error('Failed to start exercise');
    }
  };

  const handleCompleteExercise = async (exerciseId: string, score: number) => {
    try {
      await updateExerciseStatus(exerciseId, 'completed', score);
      setExercises(prev => 
        prev.map(ex => 
          ex.id === exerciseId 
            ? { ...ex, status: 'completed', completed_at: new Date().toISOString(), score }
            : ex
        )
      );
      setSelectedExercise(null);
      toast.success('Exercise completed successfully!');
    } catch (error) {
      console.error('Error completing exercise:', error);
      toast.error('Failed to complete exercise');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading your tailored exercises...</p>
        </CardContent>
      </Card>
    );
  }

  if (exercises.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">No Active Exercises</h3>
          <p className="text-slate-500">
            When your teacher starts a class session, your personalized exercises will appear here.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (selectedExercise) {
    return (
      <ExercisePlayer
        exercise={selectedExercise}
        onComplete={handleCompleteExercise}
        onBack={() => setSelectedExercise(null)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-slate-900">Tailored Exercises</h2>
        <Badge variant="secondary">
          {exercises.filter(ex => ex.status === 'available').length} Available
        </Badge>
      </div>

      <div className="grid gap-4">
        {exercises.map((exercise) => (
          <Card key={exercise.id} className="hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold text-lg">{exercise.skill_name}</h3>
                    <Badge 
                      variant={
                        exercise.status === 'completed' ? 'default' :
                        exercise.status === 'in_progress' ? 'secondary' : 'outline'
                      }
                    >
                      {exercise.status === 'completed' ? 'Completed' :
                       exercise.status === 'in_progress' ? 'In Progress' : 'Available'}
                    </Badge>
                  </div>
                  
                  <p className="text-slate-600 mb-3">
                    {exercise.exercise_data?.description || 'Practice exercise for skill improvement'}
                  </p>
                  
                  <div className="flex items-center gap-4 text-sm text-slate-500">
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      {exercise.exercise_data?.estimated_time_minutes || 15} min
                    </div>
                    <div className="flex items-center gap-1">
                      <BookOpen className="h-4 w-4" />
                      {exercise.exercise_data?.questions?.length || 0} questions
                    </div>
                    <div>
                      Current Score: {Math.round(exercise.skill_score)}%
                    </div>
                  </div>

                  {exercise.status === 'completed' && exercise.score && (
                    <div className="mt-3">
                      <div className="flex items-center gap-2 mb-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="text-sm font-medium">Exercise Score: {Math.round(exercise.score)}%</span>
                      </div>
                      <Progress value={exercise.score} className="h-2" />
                    </div>
                  )}
                </div>

                <div className="ml-4">
                  {exercise.status === 'available' && (
                    <Button onClick={() => handleStartExercise(exercise)}>
                      <Play className="h-4 w-4 mr-2" />
                      Start
                    </Button>
                  )}
                  
                  {exercise.status === 'in_progress' && (
                    <Button variant="secondary" onClick={() => setSelectedExercise(exercise)}>
                      Continue
                    </Button>
                  )}
                  
                  {exercise.status === 'completed' && (
                    <Button variant="outline" onClick={() => setSelectedExercise(exercise)}>
                      Review
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

interface ExercisePlayerProps {
  exercise: StudentExercise;
  onComplete: (exerciseId: string, score: number) => void;
  onBack: () => void;
}

function ExercisePlayer({ exercise, onComplete, onBack }: ExercisePlayerProps) {
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [showResults, setShowResults] = useState(false);
  const [gradingResults, setGradingResults] = useState<Record<number, GradingResult>>({});
  const [isGrading, setIsGrading] = useState(false);

  const questions = exercise.exercise_data?.questions || [];
  const isCompleted = exercise.status === 'completed';

  const handleAnswerSelect = (questionId: number, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestion < questions.length - 1) {
      setCurrentQuestion(currentQuestion + 1);
    } else {
      setShowResults(true);
    }
  };

  const handleComplete = async () => {
    setIsGrading(true);
    
    try {
      // Grade all answers using smart grading
      const gradingPromises = questions.map(async (question: any, index: number) => {
        const studentAnswer = answers[index] || '';
        
        if (question.type === 'multiple_choice' || question.type === 'true_false') {
          // Use simple exact matching for multiple choice and true/false
          const isCorrect = studentAnswer === question.correct_answer;
          return {
            isCorrect,
            score: isCorrect ? 1 : 0,
            confidence: 1,
            method: 'exact_match' as const
          };
        } else if (question.type === 'short_answer') {
          // Use smart grading for short answers
          return await SmartAnswerGradingService.gradeShortAnswer(
            studentAnswer,
            {
              text: question.correct_answer,
              acceptableAnswers: question.acceptable_answers,
              keywords: question.keywords
            },
            question.question,
            `${exercise.id}_q${index + 1}`
          );
        }
        
        // Fallback for other question types
        return {
          isCorrect: false,
          score: 0,
          confidence: 0.5,
          method: 'exact_match' as const
        };
      });

      const results = await Promise.all(gradingPromises);
      
      // Store grading results
      const resultMap: Record<number, GradingResult> = {};
      results.forEach((result, index) => {
        resultMap[index] = result;
      });
      setGradingResults(resultMap);

      // Calculate overall score
      const totalScore = results.reduce((sum, result) => sum + result.score, 0);
      const maxScore = questions.length;
      const finalScore = (totalScore / maxScore) * 100;

      onComplete(exercise.id, finalScore);
      
      // Show feedback for AI-graded questions
      const aiGradedCount = results.filter(r => r.method === 'ai_graded').length;
      if (aiGradedCount > 0) {
        toast.success(`Exercise completed! ${aiGradedCount} short answers were graded using AI for accuracy.`);
      }
      
    } catch (error) {
      console.error('Error grading exercise:', error);
      toast.error('Failed to grade exercise. Please try again.');
    } finally {
      setIsGrading(false);
    }
  };

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-slate-700 mb-2">Exercise Not Ready</h3>
          <p className="text-slate-500 mb-4">This exercise is still being prepared. Please try again in a moment.</p>
          <Button onClick={onBack}>Back to Exercises</Button>
        </CardContent>
      </Card>
    );
  }

  if (showResults && !isCompleted) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Exercise Complete!
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {isGrading ? (
            <div className="text-center py-4">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-slate-600">Grading your answers using smart AI analysis...</p>
            </div>
          ) : (
            <>
              <p>You've answered all questions. Ready to submit your exercise?</p>
              {Object.keys(gradingResults).length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Grading Preview:</h4>
                  {questions.map((question: any, index: number) => {
                    const result = gradingResults[index];
                    if (!result) return null;
                    
                    return (
                      <div key={index} className="text-sm p-2 border rounded">
                        <div className="flex items-center justify-between">
                          <span>Question {index + 1}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant={result.isCorrect ? "default" : "secondary"}>
                              {result.score >= 1 ? "Correct" : result.score > 0 ? "Partial" : "Incorrect"}
                            </Badge>
                            {result.method === 'ai_graded' && (
                              <Badge variant="outline" className="text-xs">
                                <Brain className="h-3 w-3 mr-1" />
                                AI
                              </Badge>
                            )}
                          </div>
                        </div>
                        {result.feedback && (
                          <p className="text-xs text-slate-600 mt-1">{result.feedback}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="flex gap-2">
                <Button onClick={handleComplete} disabled={isGrading}>
                  {isGrading ? 'Grading...' : 'Submit Exercise'}
                </Button>
                <Button variant="outline" onClick={() => setShowResults(false)}>Review Answers</Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    );
  }

  const question = questions[currentQuestion];

  return (
    <Card className="max-w-4xl mx-auto">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>{exercise.exercise_data?.title}</CardTitle>
          <Button variant="ghost" onClick={onBack}>Back</Button>
        </div>
        <Progress value={(currentQuestion + 1) / questions.length * 100} className="w-full" />
        <p className="text-sm text-slate-600">
          Question {currentQuestion + 1} of {questions.length}
        </p>
      </CardHeader>
      
      <CardContent className="space-y-6">
        <div>
          <h3 className="text-lg font-semibold mb-4">{question.question}</h3>
          
          {question.type === 'multiple_choice' && (
            <div className="space-y-2">
              {question.options?.map((option: string, index: number) => (
                <button
                  key={index}
                  onClick={() => handleAnswerSelect(currentQuestion, option)}
                  className={`w-full p-3 text-left border rounded-lg hover:bg-slate-50 transition-colors ${
                    answers[currentQuestion] === option 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}

          {question.type === 'short_answer' && (
            <div className="space-y-2">
              <textarea
                value={answers[currentQuestion] || ''}
                onChange={(e) => handleAnswerSelect(currentQuestion, e.target.value)}
                className="w-full p-3 border border-slate-200 rounded-lg"
                rows={4}
                placeholder="Enter your answer here..."
              />
              <div className="text-xs text-slate-500">
                <Brain className="h-3 w-3 inline mr-1" />
                This short answer will be graded using smart AI analysis for accuracy
              </div>
            </div>
          )}

          {question.type === 'true_false' && (
            <div className="flex gap-4">
              {['True', 'False'].map((option) => (
                <button
                  key={option}
                  onClick={() => handleAnswerSelect(currentQuestion, option)}
                  className={`px-6 py-3 border rounded-lg hover:bg-slate-50 transition-colors ${
                    answers[currentQuestion] === option 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-slate-200'
                  }`}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-between">
          <Button 
            variant="outline" 
            onClick={() => setCurrentQuestion(Math.max(0, currentQuestion - 1))}
            disabled={currentQuestion === 0}
          >
            Previous
          </Button>
          
          <Button 
            onClick={handleNext}
            disabled={!answers[currentQuestion]}
          >
            {currentQuestion === questions.length - 1 ? 'Finish' : 'Next'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
