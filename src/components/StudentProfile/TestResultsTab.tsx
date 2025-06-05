
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen } from "lucide-react";
import type { TestResult } from "@/services/examService";

interface TestResultsTabProps {
  testResults: TestResult[];
  isLoading: boolean;
}

export function TestResultsTab({ testResults, isLoading }: TestResultsTabProps) {
  const getGradeColor = (grade: string | number) => {
    const numGrade = typeof grade === 'string' ? 
      (grade.startsWith('A') ? 90 : grade.startsWith('B') ? 80 : grade.startsWith('C') ? 70 : 60) : 
      grade;
    
    if (numGrade >= 90) return 'bg-green-100 text-green-700';
    if (numGrade >= 80) return 'bg-blue-100 text-blue-700';
    if (numGrade >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Test Results</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        ) : testResults.length > 0 ? (
          <div className="space-y-4">
            {testResults.map((result, index) => (
              <div key={result.id} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                <div>
                  <h4 className="font-semibold text-gray-900">Test {index + 1}</h4>
                  <p className="text-sm text-gray-600">{new Date(result.created_at).toLocaleDateString()}</p>
                </div>
                <div className="text-right">
                  <Badge className={getGradeColor(result.overall_score)}>
                    {Math.round(result.overall_score)}%
                  </Badge>
                  <p className="text-sm text-gray-600 mt-1">
                    {result.total_points_earned}/{result.total_points_possible} points
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No test results yet</h3>
            <p className="text-gray-600">Test results will appear here once the student takes assessments.</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
