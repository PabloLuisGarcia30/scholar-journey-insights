
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartBar } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import type { TestResult } from "@/services/examService";

interface ProgressTrendTabProps {
  testResults: TestResult[];
}

export function ProgressTrendTab({ testResults }: ProgressTrendTabProps) {
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
