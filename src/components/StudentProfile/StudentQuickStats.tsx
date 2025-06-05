
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { BookOpen, Calendar, ChartBar } from "lucide-react";

interface StudentQuickStatsProps {
  isClassView: boolean;
  testCount: number;
  overallGrade: number;
  attendanceRate?: number;
  participationScore?: number;
  completedCredits?: number;
  progressPercentage?: number;
  totalCredits?: number;
}

export function StudentQuickStats({
  isClassView,
  testCount,
  overallGrade,
  attendanceRate = 95,
  participationScore = 8.5,
  completedCredits = 84,
  progressPercentage = 70,
  totalCredits = 120
}: StudentQuickStatsProps) {
  if (isClassView) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardContent className="p-4 text-center">
            <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{testCount}</div>
            <div className="text-sm text-gray-600">Tests Taken</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <ChartBar className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{overallGrade}%</div>
            <div className="text-sm text-gray-600">Overall Grade</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <div className="text-2xl font-bold">{attendanceRate}%</div>
            <div className="text-sm text-gray-600">Attendance</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{participationScore}/10</div>
            <div className="text-sm text-gray-600">Participation</div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
      <Card>
        <CardContent className="p-4 text-center">
          <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">5</div>
          <div className="text-sm text-gray-600">Active Courses</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <ChartBar className="h-8 w-8 text-green-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">{completedCredits}</div>
          <div className="text-sm text-gray-600">Credits Completed</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
          <div className="text-2xl font-bold">{Math.round(progressPercentage)}%</div>
          <div className="text-sm text-gray-600">Degree Progress</div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-4 text-center">
          <div className="text-2xl font-bold">{totalCredits - completedCredits}</div>
          <div className="text-sm text-gray-600">Credits Remaining</div>
          <Progress value={progressPercentage} className="mt-2" />
        </CardContent>
      </Card>
    </div>
  );
}
