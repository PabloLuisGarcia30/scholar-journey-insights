
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, BookOpen, Calendar, ChartBar } from "lucide-react";
import { GradeChart } from "@/components/GradeChart";
import { RecentActivity } from "@/components/RecentActivity";
import { TopPerformers } from "@/components/TopPerformers";

interface StudentDashboardProps {
  onSelectStudent: (studentId: string) => void;
}

export function StudentDashboard({ onSelectStudent }: StudentDashboardProps) {
  // Mock class data - in a real app this would come from a database
  const mockClasses = [
    {
      id: '1',
      name: 'Math Grade 6',
      subject: 'Mathematics',
      grade: '6',
      teacher: 'Ms. Johnson',
      studentCount: 5, // Updated to match actual students array length
      avgGpa: 3.4,
      students: ['1', '2', '3', '4', '5']
    },
    {
      id: '2',
      name: 'Science Grade 7',
      subject: 'Science',
      grade: '7',
      teacher: 'Mr. Chen',
      studentCount: 5, // Updated to match actual students array length
      avgGpa: 3.6,
      students: ['6', '7', '8', '9', '10']
    },
    {
      id: '3',
      name: 'English Grade 8',
      subject: 'English',
      grade: '8',
      teacher: 'Mrs. Williams',
      studentCount: 5, // Updated to match actual students array length
      avgGpa: 3.5,
      students: ['11', '12', '13', '14', '15']
    },
    {
      id: '4',
      name: 'History Grade 9',
      subject: 'History',
      grade: '9',
      teacher: 'Dr. Brown',
      studentCount: 5, // Updated to match actual students array length
      avgGpa: 3.3,
      students: ['16', '17', '18', '19', '20']
    }
  ];

  // Calculate total students from actual students arrays
  const totalStudents = mockClasses.reduce((total, classItem) => total + classItem.students.length, 0);
  
  // Calculate average GPA across all classes using actual student counts
  const totalGpaSum = mockClasses.reduce((sum, classItem) => sum + (classItem.avgGpa * classItem.students.length), 0);
  const averageGpa = totalStudents > 0 ? (totalGpaSum / totalStudents).toFixed(2) : "0.00";

  const overviewStats = [
    { title: "Total Students", value: totalStudents.toString(), icon: GraduationCap, change: "+12%" },
    { title: "Average GPA", value: averageGpa, icon: BookOpen, change: "+0.15" },
    { title: "Courses Active", value: mockClasses.length.toString(), icon: Calendar, change: "+3" },
    { title: "Completion Rate", value: "87%", icon: ChartBar, change: "+5%" },
  ];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-1">Overview of student performance and progress</p>
        </div>
        <Button onClick={() => onSelectStudent('1')} variant="outline">
          View Sample Student
        </Button>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {overviewStats.map((stat) => (
          <Card key={stat.title} className="hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{stat.title}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                  <p className="text-sm text-green-600 mt-1">{stat.change} from last month</p>
                </div>
                <stat.icon className="h-8 w-8 text-blue-600" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Grade Trends Chart */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Grade Trends Overview</CardTitle>
          </CardHeader>
          <CardContent>
            <GradeChart />
          </CardContent>
        </Card>

        {/* Top Performers */}
        <Card>
          <CardHeader>
            <CardTitle>Top Performers</CardTitle>
          </CardHeader>
          <CardContent>
            <TopPerformers onSelectStudent={onSelectStudent} />
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <RecentActivity />
        </CardContent>
      </Card>
    </div>
  );
}
