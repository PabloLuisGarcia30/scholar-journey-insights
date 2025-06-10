
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { 
  BookOpen, 
  Clock, 
  Target, 
  FileText, 
  Printer, 
  Download,
  CheckCircle,
  AlertCircle
} from "lucide-react";
import type { LessonPlanWithExercises } from "@/services/lessonPlanService";

interface GeneratedExercisesViewerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lessonPlanData: LessonPlanWithExercises | null;
}

export function GeneratedExercisesViewerDialog({ 
  open, 
  onOpenChange, 
  lessonPlanData 
}: GeneratedExercisesViewerDialogProps) {
  const [selectedStudent, setSelectedStudent] = useState<string>("");

  if (!lessonPlanData?.exercises) return null;

  const handlePrintStudent = (studentId: string) => {
    // TODO: Implement individual student exercise printing
    console.log('Print exercises for student:', studentId);
  };

  const handlePrintAll = () => {
    // TODO: Implement printing all exercises
    console.log('Print all exercises');
  };

  const totalQuestions = lessonPlanData.exercises.reduce(
    (sum, exercise) => sum + (exercise.exerciseData.questions?.length || 0), 0
  );

  const totalEstimatedTime = lessonPlanData.exercises.reduce(
    (sum, exercise) => sum + (exercise.exerciseData.estimatedTime || 0), 0
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <BookOpen className="h-6 w-6" />
            Generated Practice Exercises for {lessonPlanData.className}
          </DialogTitle>
          <DialogDescription>
            Review all generated practice exercises for your students. You can print individual exercises or all at once.
          </DialogDescription>
        </DialogHeader>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <div>
                  <p className="text-sm text-slate-600">Students</p>
                  <p className="text-2xl font-bold">{lessonPlanData.exercises.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                <div>
                  <p className="text-sm text-slate-600">Total Questions</p>
                  <p className="text-2xl font-bold">{totalQuestions}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-orange-600" />
                <div>
                  <p className="text-sm text-slate-600">Est. Time</p>
                  <p className="text-2xl font-bold">{totalEstimatedTime} min</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-purple-600" />
                <div>
                  <p className="text-sm text-slate-600">Total Points</p>
                  <p className="text-2xl font-bold">
                    {lessonPlanData.exercises.reduce((sum, ex) => sum + (ex.exerciseData.totalPoints || 0), 0)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mb-6">
          <Button onClick={handlePrintAll} variant="outline" className="flex items-center gap-2">
            <Printer className="h-4 w-4" />
            Print All Exercises
          </Button>
          <Button variant="outline" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Export as PDF
          </Button>
        </div>

        {/* Student Exercises Tabs */}
        <Tabs 
          value={selectedStudent || lessonPlanData.exercises[0]?.studentId} 
          onValueChange={setSelectedStudent}
          className="w-full"
        >
          <TabsList className="grid w-full grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2 h-auto">
            {lessonPlanData.exercises.map((exercise) => (
              <TabsTrigger 
                key={exercise.studentId} 
                value={exercise.studentId}
                className="flex flex-col items-start p-3 h-auto text-left"
              >
                <span className="font-medium">{exercise.studentName}</span>
                <span className="text-xs text-muted-foreground">
                  {exercise.exerciseData.questions?.length || 0} questions
                </span>
              </TabsTrigger>
            ))}
          </TabsList>

          {lessonPlanData.exercises.map((exercise) => (
            <TabsContent key={exercise.studentId} value={exercise.studentId} className="mt-6">
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5" />
                        {exercise.studentName}'s Practice Exercise
                      </CardTitle>
                      <p className="text-sm text-muted-foreground mt-1">
                        {exercise.exerciseData.title}
                      </p>
                    </div>
                    <Button 
                      onClick={() => handlePrintStudent(exercise.studentId)}
                      variant="outline" 
                      size="sm"
                      className="flex items-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      Print
                    </Button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 mt-3">
                    <Badge variant="outline" className="text-blue-600 border-blue-200 bg-blue-50">
                      Target: {exercise.exerciseData.skillName}
                    </Badge>
                    <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                      {exercise.exerciseData.questions?.length || 0} Questions
                    </Badge>
                    <Badge variant="outline" className="text-orange-600 border-orange-200 bg-orange-50">
                      {exercise.exerciseData.estimatedTime || 0} min
                    </Badge>
                    <Badge variant="outline" className="text-purple-600 border-purple-200 bg-purple-50">
                      {exercise.exerciseData.totalPoints || 0} points
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium text-slate-900 mb-2">Description</h4>
                      <p className="text-sm text-slate-600">{exercise.exerciseData.description}</p>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-medium text-slate-900 mb-3">Questions</h4>
                      <div className="space-y-4">
                        {exercise.exerciseData.questions?.map((question, index) => (
                          <Card key={question.id} className="bg-slate-50">
                            <CardContent className="p-4">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium text-slate-900">
                                  Question {index + 1}
                                </h5>
                                <Badge variant="secondary" className="text-xs">
                                  {question.points} pts
                                </Badge>
                              </div>
                              
                              <p className="text-sm text-slate-700 mb-3">{question.question}</p>
                              
                              {question.type === 'multiple-choice' && question.options && (
                                <div className="space-y-1">
                                  {question.options.map((option, optIndex) => (
                                    <div 
                                      key={optIndex} 
                                      className={`text-xs p-2 rounded ${
                                        option === question.correctAnswer 
                                          ? 'bg-green-100 text-green-800 font-medium' 
                                          : 'bg-white text-slate-600'
                                      }`}
                                    >
                                      {String.fromCharCode(65 + optIndex)}. {option}
                                      {option === question.correctAnswer && (
                                        <span className="ml-2">✓ Correct</span>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {question.type === 'true-false' && (
                                <div className="text-xs">
                                  <span className="font-medium">Correct Answer: </span>
                                  <span className="text-green-700">{question.correctAnswer}</span>
                                </div>
                              )}
                              
                              {(question.type === 'short-answer' || question.type === 'essay') && (
                                <div className="text-xs">
                                  <span className="font-medium">Sample Answer: </span>
                                  <span className="text-slate-600">{question.correctAnswer}</span>
                                </div>
                              )}
                              
                              <div className="mt-2 text-xs text-slate-500">
                                Type: {question.type}
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          ))}
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
