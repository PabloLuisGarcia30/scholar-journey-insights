
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Download, Save } from "lucide-react";
import type { Question } from "@/utils/pdfGenerator";

interface TestPreviewProps {
  examId: string;
  testTitle: string;
  testDescription: string;
  timeLimit: number;
  questions: Question[];
  onBack: () => void;
  onSave: () => void;
  onDownload: () => void;
  isSaving?: boolean;
}

export const TestPreview = ({
  examId,
  testTitle,
  testDescription,
  timeLimit,
  questions,
  onBack,
  onSave,
  onDownload,
  isSaving = false
}: TestPreviewProps) => {
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <FileText className="h-6 w-6" />
          Test Preview
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Answer Key
          </Button>
          <Button onClick={onDownload} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
          <Button onClick={onSave} disabled={isSaving}>
            {isSaving ? (
              <>Saving...</>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Test
              </>
            )}
          </Button>
        </div>
      </div>

      {examId && (
        <Card className="border-2 border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-green-800">Exam ID:</span>
              <span className="font-mono text-lg text-green-900 bg-white px-3 py-1 rounded border">
                {examId}
              </span>
            </div>
            <p className="text-sm text-green-700 mt-2">
              Your test is ready! Use this ID for grading and tracking.
            </p>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>{testTitle || 'Untitled Test'}</CardTitle>
          {testDescription && (
            <p className="text-gray-600">{testDescription}</p>
          )}
          <div className="flex gap-4 text-sm text-gray-500">
            <span>Time Limit: {timeLimit} minutes</span>
            <span>Total Points: {totalPoints}</span>
            <span>Questions: {questions.length}</span>
          </div>
        </CardHeader>
      </Card>

      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <span className="text-sm font-medium bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {question.points} {question.points === 1 ? 'point' : 'points'}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="mb-4">{question.question}</p>
              
              {question.type === 'multiple-choice' && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optionIndex) => (
                    <div key={optionIndex} className="flex items-center gap-2">
                      <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">
                        {String.fromCharCode(65 + optionIndex)}
                      </span>
                      <span>{option}</span>
                      {option === question.correctAnswer && (
                        <span className="text-green-600 font-medium">(Correct)</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {question.type === 'true-false' && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">A</span>
                    <span>True</span>
                    {question.correctAnswer === 'true' && (
                      <span className="text-green-600 font-medium">(Correct)</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-sm bg-gray-100 px-2 py-1 rounded">B</span>
                    <span>False</span>
                    {question.correctAnswer === 'false' && (
                      <span className="text-green-600 font-medium">(Correct)</span>
                    )}
                  </div>
                </div>
              )}

              {(question.type === 'short-answer' || question.type === 'essay') && (
                <div className="border-2 border-dashed border-gray-300 p-4 rounded">
                  <p className="text-gray-500 text-sm">
                    {question.type === 'essay' ? 'Essay response area' : 'Short answer response area'}
                  </p>
                </div>
              )}

              {question.explanation && (
                <div className="mt-4 p-3 bg-blue-50 rounded">
                  <span className="font-medium text-blue-800">Explanation: </span>
                  <span className="text-blue-700">{question.explanation}</span>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No questions in this test yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
