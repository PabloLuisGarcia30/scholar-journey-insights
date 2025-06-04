
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft } from "lucide-react";

interface TestDetailsProps {
  examId: string;
  testTitle: string;
  testDescription: string;
  timeLimit: number;
  onTestTitleChange: (title: string) => void;
  onTestDescriptionChange: (description: string) => void;
  onTimeLimitChange: (timeLimit: number) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const TestDetails = ({
  examId,
  testTitle,
  testDescription,
  timeLimit,
  onTestTitleChange,
  onTestDescriptionChange,
  onTimeLimitChange,
  onBack,
  onContinue
}: TestDetailsProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Test Details</h2>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
      
      {examId && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-800">Exam ID:</span>
              <span className="font-mono text-lg text-red-900 bg-white px-3 py-1 rounded border">
                {examId}
              </span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              This unique ID will be used to identify this exam for grading purposes.
            </p>
          </CardContent>
        </Card>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-title">Test Title</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => onTestTitleChange(e.target.value)}
              placeholder="Enter test title"
            />
          </div>
          
          <div>
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              value={testDescription}
              onChange={(e) => onTestDescriptionChange(e.target.value)}
              placeholder="Enter test description"
            />
          </div>
          
          <div>
            <Label htmlFor="time-limit">Time Limit (minutes)</Label>
            <Input
              id="time-limit"
              type="number"
              value={timeLimit}
              onChange={(e) => onTimeLimitChange(parseInt(e.target.value) || 60)}
              min="1"
              max="300"
            />
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={onContinue} className="w-full">
        Continue to Questions
      </Button>
    </div>
  );
};
