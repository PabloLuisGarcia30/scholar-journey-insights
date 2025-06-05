
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Key } from "lucide-react";
import type { Question } from "@/utils/pdfGenerator";

interface AnswerKeyEditorProps {
  examId: string;
  questions: Question[];
  onUpdateAnswer: (questionId: string, answer: string, explanation?: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const AnswerKeyEditor = ({
  examId,
  questions,
  onUpdateAnswer,
  onBack,
  onContinue
}: AnswerKeyEditorProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Key className="h-6 w-6" />
          Answer Key
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questions
          </Button>
          <Button onClick={onContinue}>
            Continue to Preview
          </Button>
        </div>
      </div>

      {examId && (
        <div className="bg-green-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-green-800">Exam ID: </span>
          <span className="text-sm font-mono text-green-900">{examId}</span>
        </div>
      )}

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">Question {index + 1}</CardTitle>
              <p className="text-sm text-gray-600">{question.question}</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {question.type === 'multiple-choice' && question.options && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={question.correctAnswer as string}
                    onValueChange={(value) => onUpdateAnswer(question.id, value)}
                  >
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`${question.id}-${optionIndex}`} />
                        <Label htmlFor={`${question.id}-${optionIndex}`}>{option}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                </div>
              )}

              {question.type === 'true-false' && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={question.correctAnswer as string}
                    onValueChange={(value) => onUpdateAnswer(question.id, value)}
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

              {(question.type === 'short-answer' || question.type === 'essay') && (
                <div>
                  <Label htmlFor={`answer-${question.id}`}>Sample Answer / Key Points</Label>
                  <Textarea
                    id={`answer-${question.id}`}
                    value={question.correctAnswer as string || ''}
                    onChange={(e) => onUpdateAnswer(question.id, e.target.value)}
                    placeholder="Enter the expected answer or key points for grading"
                    rows={question.type === 'essay' ? 4 : 2}
                  />
                </div>
              )}

              <div>
                <Label htmlFor={`explanation-${question.id}`}>Explanation (Optional)</Label>
                <Textarea
                  id={`explanation-${question.id}`}
                  value={question.explanation || ''}
                  onChange={(e) => onUpdateAnswer(question.id, question.correctAnswer as string, e.target.value)}
                  placeholder="Provide an explanation for the correct answer"
                  rows={2}
                />
              </div>

              <div className="text-sm text-gray-500">
                Points: {question.points}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No questions to create answer key for.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
