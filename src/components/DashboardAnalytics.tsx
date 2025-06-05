
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  ChartContainer, 
  ChartTooltip, 
  ChartTooltipContent
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
  { month: "Jan", averageScore: 78 },
  { month: "Feb", averageScore: 82 },
  { month: "Mar", averageScore: 79 },
  { month: "Apr", averageScore: 85 },
  { month: "May", averageScore: 88 },
  { month: "Jun", averageScore: 91 }
];

// Mock data for weak content skills
const weakSkillsData = [
  { skill: "Algebra", weaknessLevel: 45 },
  { skill: "Geometry", weaknessLevel: 38 },
  { skill: "Statistics", weaknessLevel: 52 },
  { skill: "Calculus", weaknessLevel: 41 },
  { skill: "Trigonometry", weaknessLevel: 35 }
];

const scoreChartConfig = {
  averageScore: {
    label: "Average Score (%)",
    color: "hsl(217, 91%, 60%)"
  }
};

const skillsChartConfig = {
  weaknessLevel: {
    label: "Weakness Level (%)",
    color: "hsl(0, 84%, 60%)"
  }
};

export function DashboardAnalytics() {
  return (
    <div className="space-y-6">
      {/* Score Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            📈 Score Trends Over Time
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={scoreChartConfig} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={scoresTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  domain={[70, 95]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value) => [`${value}%`, 'Average Score']}
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
            </ResponsiveContainer>
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
          <ChartContainer config={skillsChartConfig} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weakSkillsData} margin={{ top: 20, right: 30, left: 80, bottom: 20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  type="number" 
                  domain={[0, 60]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                />
                <YAxis 
                  type="category" 
                  dataKey="skill" 
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  width={70}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value) => [`${value}%`, 'Weakness Level']}
                    />
                  }
                />
                <Bar 
                  dataKey="weaknessLevel" 
                  fill="var(--color-weaknessLevel)"
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
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
