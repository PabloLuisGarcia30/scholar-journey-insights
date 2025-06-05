
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent
} from "@/components/ui/chart";
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  ResponsiveContainer,
  BarChart,
  Bar
} from "recharts";

// Mock data for score trends
const scoresTrendData = [
  { month: "Jan", averageScore: 78, testCount: 12 },
  { month: "Feb", averageScore: 82, testCount: 15 },
  { month: "Mar", averageScore: 79, testCount: 18 },
  { month: "Apr", averageScore: 85, testCount: 14 },
  { month: "May", averageScore: 88, testCount: 16 },
  { month: "Jun", averageScore: 91, testCount: 13 }
];

// Mock data for weak content skills
const weakSkillsData = [
  { skill: "Algebra", weakness: 45, studentsAffected: 23 },
  { skill: "Geometry", weakness: 38, studentsAffected: 19 },
  { skill: "Statistics", weakness: 52, studentsAffected: 27 },
  { skill: "Calculus", weakness: 41, studentsAffected: 21 },
  { skill: "Trigonometry", weakness: 35, studentsAffected: 18 },
  { skill: "Probability", weakness: 48, studentsAffected: 25 }
];

const chartConfig = {
  averageScore: {
    label: "Average Score",
    color: "hsl(217, 91%, 60%)"
  },
  weakness: {
    label: "Weakness Level (%)",
    color: "hsl(0, 84%, 60%)"
  }
};

export function DashboardAnalytics() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Score Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Score Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <LineChart data={scoresTrendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                dataKey="month" 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                domain={[70, 95]}
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value}${name === 'averageScore' ? '%' : ' tests'}`,
                      name === 'averageScore' ? 'Average Score' : 'Tests Taken'
                    ]}
                  />
                }
              />
              <Line 
                type="monotone" 
                dataKey="averageScore" 
                stroke="var(--color-averageScore)"
                strokeWidth={3}
                dot={{ fill: "var(--color-averageScore)", strokeWidth: 2, r: 6 }}
                activeDot={{ r: 8, stroke: "var(--color-averageScore)", strokeWidth: 2 }}
              />
            </LineChart>
          </ChartContainer>
          <div className="mt-4 p-3 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              📊 <strong>Insight:</strong> Steady improvement trend with 13% increase since January
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Weak Skills Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            🎯 Weak Content Skills Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={chartConfig} className="h-80">
            <BarChart data={weakSkillsData} layout="horizontal">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis 
                type="number" 
                domain={[0, 60]}
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
              />
              <YAxis 
                type="category" 
                dataKey="skill" 
                tick={{ fontSize: 12 }}
                axisLine={{ stroke: '#e2e8f0' }}
                width={80}
              />
              <ChartTooltip 
                content={
                  <ChartTooltipContent 
                    formatter={(value, name) => [
                      `${value}${name === 'weakness' ? '%' : ' students'}`,
                      name === 'weakness' ? 'Weakness Level' : 'Students Affected'
                    ]}
                  />
                }
              />
              <Bar 
                dataKey="weakness" 
                fill="var(--color-weakness)"
                radius={[0, 4, 4, 0]}
              />
            </BarChart>
          </ChartContainer>
          <div className="mt-4 p-3 bg-red-50 rounded-lg">
            <p className="text-sm text-red-700">
              ⚠️ <strong>Focus Area:</strong> Statistics shows highest weakness level (52%) - consider additional practice materials
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
