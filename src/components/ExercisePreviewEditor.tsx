
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ChevronUp, Edit2, Plus, Trash2, Save, X } from "lucide-react";
import { toast } from "sonner";

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  points: number;
}

interface ExerciseData {
  title: string;
  description: string;
  questions: Question[];
  totalPoints: number;
  estimatedTime: number;
  skillName: string;
}

interface StudentExercise {
  studentId: string;
  studentName: string;
  targetSkillName: string;
  targetSkillScore: number;
  exerciseData: ExerciseData;
}

interface ExercisePreviewEditorProps {
  exercises: StudentExercise[];
  onSave: (editedExercises: StudentExercise[]) => void;
  onCancel: () => void;
  loading?: boolean;
}

function QuestionEditor({ 
  question, 
  questionIndex, 
  onUpdate, 
  onDelete 
}: {
  question: Question;
  questionIndex: number;
  onUpdate: (updatedQuestion: Question) => void;
  onDelete: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [editedQuestion, setEditedQuestion] = useState<Question>(question);

  const handleSave = () => {
    onUpdate(editedQuestion);
    setEditing(false);
    toast.success("Question updated");
  };

  const handleCancel = () => {
    setEditedQuestion(question);
    setEditing(false);
  };

  const addOption = () => {
    if (editedQuestion.type === 'multiple-choice' && editedQuestion.options) {
      setEditedQuestion({
        ...editedQuestion,
        options: [...editedQuestion.options, ""]
      });
    }
  };

  const updateOption = (index: number, value: string) => {
    if (editedQuestion.options) {
      const newOptions = [...editedQuestion.options];
      newOptions[index] = value;
      setEditedQuestion({
        ...editedQuestion,
        options: newOptions
      });
    }
  };

  const removeOption = (index: number) => {
    if (editedQuestion.options && editedQuestion.options.length > 2) {
      const newOptions = editedQuestion.options.filter((_, i) => i !== index);
      setEditedQuestion({
        ...editedQuestion,
        options: newOptions
      });
    }
  };

  if (editing) {
    return (
      <Card className="border-blue-200 bg-blue-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium text-sm">Editing Question {questionIndex + 1}</h4>
            <div className="flex gap-2">
              <Button size="sm" onClick={handleSave} className="h-7">
                <Save className="h-3 w-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleCancel} className="h-7">
                <X className="h-3 w-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <label className="text-xs font-medium text-slate-600">Question Text</label>
            <Textarea
              value={editedQuestion.question}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, question: e.target.value })}
              className="text-sm"
              rows={3}
            />
          </div>

          {editedQuestion.type === 'multiple-choice' && editedQuestion.options && (
            <div>
              <label className="text-xs font-medium text-slate-600">Answer Options</label>
              <div className="space-y-2">
                {editedQuestion.options.map((option, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      value={option}
                      onChange={(e) => updateOption(index, e.target.value)}
                      placeholder={`Option ${index + 1}`}
                      className="text-sm"
                    />
                    {editedQuestion.options!.length > 2 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => removeOption(index)}
                        className="h-9 px-2"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    )}
                  </div>
                ))}
                <Button
                  size="sm"
                  variant="outline"
                  onClick={addOption}
                  className="h-8 text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Add Option
                </Button>
              </div>
            </div>
          )}

          <div>
            <label className="text-xs font-medium text-slate-600">Correct Answer</label>
            <Input
              value={editedQuestion.correctAnswer}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, correctAnswer: e.target.value })}
              className="text-sm"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-slate-600">Points</label>
            <Input
              type="number"
              value={editedQuestion.points}
              onChange={(e) => setEditedQuestion({ ...editedQuestion, points: parseInt(e.target.value) || 1 })}
              className="text-sm w-20"
              min="1"
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-slate-200">
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium">Q{questionIndex + 1}</span>
              <Badge variant="outline" className="text-xs">
                {question.type}
              </Badge>
              <Badge variant="secondary" className="text-xs">
                {question.points} pts
              </Badge>
            </div>
            <p className="text-sm text-slate-800 mb-2">{question.question}</p>
            
            {question.type === 'multiple-choice' && question.options && (
              <div className="space-y-1">
                {question.options.map((option, index) => (
                  <div key={index} className="text-xs text-slate-600 ml-4">
                    {String.fromCharCode(65 + index)}. {option}
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-2">
              <span className="text-xs font-medium text-green-700">
                Answer: {question.correctAnswer}
              </span>
            </div>
          </div>
          
          <div className="flex gap-1 ml-4">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setEditing(true)}
              className="h-7 px-2"
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={onDelete}
              className="h-7 px-2 text-red-600 hover:text-red-700"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function ExercisePreviewEditor({ exercises, onSave, onCancel, loading }: ExercisePreviewEditorProps) {
  const [editedExercises, setEditedExercises] = useState<StudentExercise[]>(exercises);
  const [openCards, setOpenCards] = useState<Record<string, boolean>>({});

  const toggleCard = (studentId: string) => {
    setOpenCards(prev => ({
      ...prev,
      [studentId]: !prev[studentId]
    }));
  };

  const updateExercise = (studentId: string, updatedExercise: ExerciseData) => {
    setEditedExercises(prev =>
      prev.map(exercise =>
        exercise.studentId === studentId
          ? { ...exercise, exerciseData: updatedExercise }
          : exercise
      )
    );
  };

  const updateQuestion = (studentId: string, questionIndex: number, updatedQuestion: Question) => {
    const exercise = editedExercises.find(ex => ex.studentId === studentId);
    if (!exercise) return;

    const updatedQuestions = [...exercise.exerciseData.questions];
    updatedQuestions[questionIndex] = updatedQuestion;

    const newTotalPoints = updatedQuestions.reduce((sum, q) => sum + q.points, 0);

    updateExercise(studentId, {
      ...exercise.exerciseData,
      questions: updatedQuestions,
      totalPoints: newTotalPoints
    });
  };

  const deleteQuestion = (studentId: string, questionIndex: number) => {
    const exercise = editedExercises.find(ex => ex.studentId === studentId);
    if (!exercise || exercise.exerciseData.questions.length <= 1) {
      toast.error("Cannot delete the last question");
      return;
    }

    const updatedQuestions = exercise.exerciseData.questions.filter((_, index) => index !== questionIndex);
    const newTotalPoints = updatedQuestions.reduce((sum, q) => sum + q.points, 0);

    updateExercise(studentId, {
      ...exercise.exerciseData,
      questions: updatedQuestions,
      totalPoints: newTotalPoints
    });

    toast.success("Question deleted");
  };

  const handleSave = () => {
    onSave(editedExercises);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h3 className="text-lg font-semibold text-slate-900 mb-2">
          Preview & Edit Generated Exercises
        </h3>
        <p className="text-sm text-slate-600">
          Review and customize the exercises before saving your lesson plan. Click on each student to expand their exercise.
        </p>
      </div>

      <div className="space-y-4">
        {editedExercises.map((exercise) => (
          <Card key={exercise.studentId} className="border-slate-200">
            <Collapsible
              open={openCards[exercise.studentId]}
              onOpenChange={() => toggleCard(exercise.studentId)}
            >
              <CollapsibleTrigger asChild>
                <CardHeader className="cursor-pointer hover:bg-slate-50 transition-colors">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div>
                        <CardTitle className="text-base">{exercise.studentName}</CardTitle>
                        <p className="text-sm text-slate-600 mt-1">
                          Target Skill: {exercise.targetSkillName} ({exercise.targetSkillScore}%)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {exercise.exerciseData.questions.length} questions
                        </p>
                        <p className="text-xs text-slate-500">
                          {exercise.exerciseData.totalPoints} points • {exercise.exerciseData.estimatedTime} min
                        </p>
                      </div>
                      {openCards[exercise.studentId] ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                    </div>
                  </div>
                </CardHeader>
              </CollapsibleTrigger>
              
              <CollapsibleContent>
                <CardContent className="pt-0">
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-sm text-blue-900 mb-1">
                      {exercise.exerciseData.title}
                    </h4>
                    <p className="text-xs text-blue-800">
                      {exercise.exerciseData.description}
                    </p>
                  </div>

                  <div className="space-y-3">
                    {exercise.exerciseData.questions.map((question, questionIndex) => (
                      <QuestionEditor
                        key={question.id}
                        question={question}
                        questionIndex={questionIndex}
                        onUpdate={(updatedQuestion) => updateQuestion(exercise.studentId, questionIndex, updatedQuestion)}
                        onDelete={() => deleteQuestion(exercise.studentId, questionIndex)}
                      />
                    ))}
                  </div>
                </CardContent>
              </CollapsibleContent>
            </Collapsible>
          </Card>
        ))}
      </div>

      <div className="flex gap-3 justify-end pt-4 border-t">
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Lesson Plan with Exercises"}
        </Button>
      </div>
    </div>
  );
}
