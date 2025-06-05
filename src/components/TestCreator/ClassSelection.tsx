
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Users } from "lucide-react";
import type { ActiveClass } from "@/services/examService";

interface ClassSelectionProps {
  examId: string;
  availableClasses: ActiveClass[];
  selectedClassId: string;
  onClassSelect: (classId: string) => void;
  onBack: () => void;
  onContinue: () => void;
}

export const ClassSelection = ({
  examId,
  availableClasses,
  selectedClassId,
  onClassSelect,
  onBack,
  onContinue
}: ClassSelectionProps) => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Class Information</h2>
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
          <CardTitle>Select Class</CardTitle>
          <p className="text-sm text-blue-600 font-medium mt-2">
            Please select the corresponding class with care. It helps us create better students together!
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {availableClasses.length === 0 ? (
            <div className="text-center py-8">
              <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Classes</h3>
              <p className="text-gray-600">
                You don't have any active classes yet. Please create a class first to continue.
              </p>
            </div>
          ) : (
            <RadioGroup value={selectedClassId} onValueChange={onClassSelect}>
              {availableClasses.map((classData) => (
                <div key={classData.id} className="flex items-center space-x-2 p-3 border rounded-lg">
                  <RadioGroupItem value={classData.id} id={classData.id} />
                  <Label htmlFor={classData.id} className="flex-1 cursor-pointer">
                    <div>
                      <span className="font-medium">{classData.name}</span>
                      <p className="text-sm text-gray-600">
                        {classData.subject} - Grade {classData.grade}
                      </p>
                    </div>
                  </Label>
                </div>
              ))}
            </RadioGroup>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={onContinue} 
        className="w-full"
        disabled={!selectedClassId || availableClasses.length === 0}
      >
        Continue to Skill Selection
      </Button>
    </div>
  );
};
