
import React from "react";
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
import { mockPabloContentSkillScores } from "@/data/mockStudentData";

// Mock data for score trends
const scoresTrendData = [
  { month: "Jan", averageScore: 78 },
  { month: "Feb", averageScore: 82 },
  { month: "Mar", averageScore: 79 },
  { month: "Apr", averageScore: 85 },
  { month: "May", averageScore: 88 },
  { month: "Jun", averageScore: 91 }
];

// Process Pablo's mock data to create skill mastery matrix
const createSkillMasteryMatrix = () => {
  const skillCategories = {
    'ALGEBRA AND FUNCTIONS': [],
    'GEOMETRY': [],
    'TRIGONOMETRY': [],
    'DATA ANALYSIS AND PROBABILITY': [],
    'PROBLEM SOLVING AND REASONING': []
  };

  // Categorize skills based on skill names
  mockPabloContentSkillScores.forEach(skillScore => {
    const skillName = skillScore.skill_name;
    let category = 'PROBLEM SOLVING AND REASONING'; // default
    
    if (skillName.includes('Factoring') || skillName.includes('Systems of Equations') || 
        skillName.includes('Function') || skillName.includes('Linear') || 
        skillName.includes('Quadratic') || skillName.includes('Exponential')) {
      category = 'ALGEBRA AND FUNCTIONS';
    } else if (skillName.includes('Triangle') || skillName.includes('Area') || 
               skillName.includes('Perimeter') || skillName.includes('Volume') || 
               skillName.includes('Surface Area') || skillName.includes('Coordinate') || 
               skillName.includes('Geometric')) {
      category = 'GEOMETRY';
    } else if (skillName.includes('Trigonometric') || skillName.includes('Triangle') || 
               skillName.includes('Unit Circle') || skillName.includes('Angle')) {
      category = 'TRIGONOMETRY';
    } else if (skillName.includes('Statistical') || skillName.includes('Probability') || 
               skillName.includes('Data') || skillName.includes('Graph') || 
               skillName.includes('Predictions')) {
      category = 'DATA ANALYSIS AND PROBABILITY';
    }
    
    skillCategories[category].push(skillScore);
  });

  // Calculate average score for each category
  return Object.entries(skillCategories).map(([category, skills]) => {
    if (skills.length === 0) return { category, averageScore: 0, skillCount: 0 };
    
    const averageScore = skills.reduce((sum, skill) => sum + skill.score, 0) / skills.length;
    return {
      category: category.replace('AND', '&'), // Shorter labels for display
      averageScore: Math.round(averageScore),
      skillCount: skills.length
    };
  }).filter(item => item.skillCount > 0); // Only show categories with skills
};

const skillMasteryData = createSkillMasteryMatrix();

const scoreChartConfig = {
  averageScore: {
    label: "Average Score (%)",
    color: "hsl(217, 91%, 60%)"
  }
};

const masteryChartConfig = {
  averageScore: {
    label: "Mastery Level (%)",
    color: "hsl(142, 71%, 45%)"
  }
};

const getMasteryColor = (score: number) => {
  if (score >= 90) return "hsl(142, 71%, 45%)"; // Green - Mastered
  if (score >= 80) return "hsl(217, 91%, 60%)"; // Blue - Proficient
  if (score >= 70) return "hsl(45, 93%, 47%)"; // Yellow - Developing
  return "hsl(0, 84%, 60%)"; // Red - Needs Support
};

const getMasteryLabel = (score: number) => {
  if (score >= 90) return "Mastered";
  if (score >= 80) return "Proficient";
  if (score >= 70) return "Developing";
  return "Needs Support";
};

export function DashboardAnalytics() {
  return (
    <div className="space-y-6">
      {/* Score Trends Chart */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Score Trends Over Time
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
              <strong>Insight:</strong> Steady improvement trend with 13% increase since January
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Skill Mastery Matrix */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            Skill Mastery Matrix - Pablo Luis Garcia (Grade 10 Math)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={masteryChartConfig} className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={skillMasteryData} margin={{ top: 20, right: 30, left: 20, bottom: 60 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="category" 
                  tick={{ fontSize: 10, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis 
                  domain={[0, 100]}
                  tick={{ fontSize: 12, fill: "#64748b" }}
                  axisLine={{ stroke: '#e2e8f0' }}
                  label={{ value: 'Mastery Level (%)', angle: -90, position: 'insideLeft' }}
                />
                <ChartTooltip 
                  content={
                    <ChartTooltipContent 
                      formatter={(value, name, props) => {
                        const skillCount = (props?.payload as any)?.skillCount || 0;
                        return [
                          `${value}% - ${getMasteryLabel(value as number)} (${skillCount} skills)`, 
                          'Mastery Level'
                        ];
                      }}
                    />
                  }
                />
                <Bar 
                  dataKey="averageScore" 
                  fill="var(--color-averageScore)"
                  radius={[4, 4, 0, 0]}
                  stroke="#fff"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartContainer>
          
          {/* Mastery Legend */}
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getMasteryColor(95) }}></div>
              <span className="text-sm text-gray-600">Mastered (90%+)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getMasteryColor(85) }}></div>
              <span className="text-sm text-gray-600">Proficient (80-89%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getMasteryColor(75) }}></div>
              <span className="text-sm text-gray-600">Developing (70-79%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 rounded" style={{ backgroundColor: getMasteryColor(65) }}></div>
              <span className="text-sm text-gray-600">Needs Support (<70%)</span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-green-50 rounded-lg">
            <p className="text-sm text-green-700">
              <strong>Strength:</strong> Pablo shows excellent mastery in Trigonometry (87%) and strong performance in Algebra & Functions (85%). Focus area: Unit Circle concepts could use additional practice.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
