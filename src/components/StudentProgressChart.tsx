
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChartBar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { gradeHistory } from "@/data/mockStudentData";
import { type TestResult } from "@/services/examService";

interface StudentProgressChartProps {
  testResults: TestResult[];
  isClassView: boolean;
  student: any;
}

export function StudentProgressChart({ testResults, isClassView, student }: StudentProgressChartProps) {
  const totalCredits = 120;
  const completedCredits = student?.gpa ? Math.floor(student.gpa * 20) : 84;
  const progressPercentage = (completedCredits / totalCredits) * 100;

  if (isClassView) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Progress Trend</CardTitle>
        </CardHeader>
        <CardContent>
          {testResults.length > 0 ? (
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={testResults.map((result, index) => ({
                  test: `Test ${index + 1}`,
                  score: result.overall_score,
                  date: new Date(result.created_at).toLocaleDateString()
                }))}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="test" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip 
                    labelFormatter={(label) => `Test: ${label}`}
                    formatter={(value: number) => [`${value.toFixed(1)}%`, 'Score']}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#3b82f6" 
                    strokeWidth={2}
                    dot={{ fill: '#3b82f6', strokeWidth: 2, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ) : (
            <div className="text-center py-8">
              <ChartBar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No progress data yet</h3>
              <p className="text-gray-600">Progress trends will appear here as the student completes more assessments.</p>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Academic Progress</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">Degree Progress</span>
              <span className="text-sm text-gray-600">{completedCredits}/{totalCredits} credits</span>
            </div>
            <Progress value={progressPercentage} className="h-3" />
          </div>
          
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={gradeHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="semester" />
                <YAxis domain={[0, 4]} />
                <Tooltip 
                  formatter={(value: number) => [value.toFixed(2), 'GPA']}
                />
                <Bar dataKey="gpa" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
