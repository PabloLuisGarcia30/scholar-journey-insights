
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import type { Question } from "../../utils/pdfGenerator";

interface QuestionEditorProps {
  examId: string;
  questions: Question[];
  onAddQuestion: (type: Question['type']) => void;
  onUpdateQuestion: (questionId: string, field: keyof Question, value: any) => void;
  onUpdateQuestionOption: (questionId: string, optionIndex: number, value: string) => void;
  onDeleteQuestion: (questionId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const QuestionEditor = ({
  examId,
  questions,
  onAddQuestion,
  onUpdateQuestion,
  onUpdateQuestionOption,
  onDeleteQuestion,
  onBack,
  onContinue
}: QuestionEditorProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
          <Button onClick={onContinue}>
            Continue to Answer Key
          </Button>
        </div>
      </div>
      
      {examId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Exam ID: </span>
          <span className="text-sm font-mono text-blue-900">{examId}</span>
        </div>
      )}
      
      <div className="flex gap-2 mb-4">
        <Button onClick={() => onAddQuestion('multiple-choice')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Multiple Choice
        </Button>
        <Button onClick={() => onAddQuestion('true-false')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          True/False
        </Button>
        <Button onClick={() => onAddQuestion('short-answer')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Short Answer
        </Button>
        <Button onClick={() => onAddQuestion('essay')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Essay
        </Button>
      </div>
      
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 capitalize">{question.type.replace('-', ' ')}</span>
                  <Button variant="ghost" size="sm" onClick={() => onDeleteQuestion(question.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => onUpdateQuestion(question.id, 'question', e.target.value)}
                  placeholder="Enter your question"
                />
              </div>
              
              {question.type === 'multiple-choice' && question.options && (
                <div>
                  <Label>Answer Options</Label>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => onUpdateQuestionOption(question.id, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <Checkbox
                          checked={question.correctAnswer === option}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              onUpdateQuestion(question.id, 'correctAnswer', option);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {question.type === 'true-false' && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={question.correctAnswer as string}
                    onValueChange={(value) => onUpdateQuestion(question.id, 'correctAnswer', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`${question.id}-true`} />
                      <Label htmlFor={`${question.id}-true`}>True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`${question.id}-false`} />
                      <Label htmlFor={`${question.id}-false`}>False</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div>
                  <Label htmlFor={`points-${question.id}`}>Points</Label>
                  <Input
                    id={`points-${question.id}`}
                    type="number"
                    value={question.points}
                    onChange={(e) => onUpdateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No questions added yet. Click the buttons above to add questions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
