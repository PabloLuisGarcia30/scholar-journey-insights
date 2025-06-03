import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ArrowLeft, BookOpen, Calendar, ChartBar, TrendingUp, TrendingDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';

interface StudentProfileProps {
  studentId: string;
  classId?: string;
  className?: string;
  onBack: () => void;
}

// Mock student data
const mockStudent = {
  id: '1',
  name: 'Sarah Johnson',
  email: 'sarah.johnson@university.edu',
  major: 'Computer Science',
  year: 'Junior',
  gpa: 3.85,
  status: 'Excellent',
  enrolledCourses: 5,
  completedCredits: 84,
  totalCredits: 120,
};

// Mock class-specific data
const mockClassData = {
  'Math Grade 6': {
    subject: 'Mathematics',
    totalGrade: 88,
    assignments: [
      { name: 'Quiz 1: Basic Operations', grade: 92, maxGrade: 100, date: '2024-01-15' },
      { name: 'Homework Set 1', grade: 85, maxGrade: 100, date: '2024-01-20' },
      { name: 'Midterm Exam', grade: 88, maxGrade: 100, date: '2024-02-15' },
      { name: 'Project: Real World Math', grade: 90, maxGrade: 100, date: '2024-02-28' },
      { name: 'Quiz 2: Fractions', grade: 82, maxGrade: 100, date: '2024-03-05' },
    ],
    subjectStrengths: [
      { topic: 'Algebra', strength: 92, trend: 'up' },
      { topic: 'Geometry', strength: 85, trend: 'stable' },
      { topic: 'Fractions', strength: 78, trend: 'down' },
      { topic: 'Word Problems', strength: 88, trend: 'up' },
    ],
    attendanceRate: 95,
    participationScore: 8.5,
  }
};

const gradeHistory = [
  { semester: 'Fall 2023', gpa: 3.7, credits: 15 },
  { semester: 'Spring 2024', gpa: 3.9, credits: 16 },
  { semester: 'Summer 2024', gpa: 4.0, credits: 6 },
  { semester: 'Fall 2024', gpa: 3.8, credits: 15 },
];

const courseGrades = [
  { course: 'Data Structures', grade: 'A', credits: 3, progress: 95 },
  { course: 'Algorithms', grade: 'A-', credits: 3, progress: 87 },
  { course: 'Database Systems', grade: 'B+', credits: 4, progress: 82 },
  { course: 'Web Development', grade: 'A', credits: 3, progress: 93 },
  { course: 'Software Engineering', grade: 'A-', credits: 4, progress: 89 },
];

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const progressPercentage = (mockStudent.completedCredits / mockStudent.totalCredits) * 100;
  const isClassView = classId && className;
  const classData = isClassView ? mockClassData[className as keyof typeof mockClassData] : null;

  const getGradeColor = (grade: string | number) => {
    const numGrade = typeof grade === 'string' ? 
      (grade.startsWith('A') ? 90 : grade.startsWith('B') ? 80 : grade.startsWith('C') ? 70 : 60) : 
      grade;
    
    if (numGrade >= 90) return 'bg-green-100 text-green-700';
    if (numGrade >= 80) return 'bg-blue-100 text-blue-700';
    if (numGrade >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4" />; // placeholder for stable
  };

  return (
    <div className="p-6">
      <div className="mb-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {isClassView ? 'Class' : 'Dashboard'}
        </Button>
        
        <div className="flex items-start gap-6">
          <Avatar className="h-20 w-20">
            <AvatarFallback className="text-2xl">
              {mockStudent.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{mockStudent.name}</h1>
            {isClassView ? (
              <p className="text-gray-600 mt-1">Performance in {className}</p>
            ) : (
              <p className="text-gray-600 mt-1">{mockStudent.email}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {!isClassView && (
                <>
                  <Badge variant="outline">{mockStudent.year}</Badge>
                  <Badge variant="outline">{mockStudent.major}</Badge>
                  <Badge className="bg-green-100 text-green-700">{mockStudent.status}</Badge>
                </>
              )}
              {isClassView && classData && (
                <>
                  <Badge variant="outline">{classData.subject}</Badge>
                  <Badge className={getGradeColor(classData.totalGrade)}>
                    {classData.totalGrade}%
                  </Badge>
                </>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {isClassView && classData ? (
              <>
                <div className="text-2xl font-bold text-gray-900">{classData.totalGrade}%</div>
                <div className="text-sm text-gray-600">Class Grade</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{mockStudent.gpa}</div>
                <div className="text-sm text-gray-600">Current GPA</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {isClassView && classData ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.assignments.length}</div>
              <div className="text-sm text-gray-600">Assignments</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <ChartBar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.totalGrade}%</div>
              <div className="text-sm text-gray-600">Overall Grade</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <Calendar className="h-8 w-8 text-purple-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{classData.attendanceRate}%</div>
              <div className="text-sm text-gray-600">Attendance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{classData.participationScore}/10</div>
              <div className="text-sm text-gray-600">Participation</div>
            </CardContent>
          </Card>
        </div>
      ) : (
        // ... keep existing code (original quick stats for general profile)
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{mockStudent.enrolledCourses}</div>
              <div className="text-sm text-gray-600">Active Courses</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <ChartBar className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{mockStudent.completedCredits}</div>
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
              <div className="text-2xl font-bold">{mockStudent.totalCredits - mockStudent.completedCredits}</div>
              <div className="text-sm text-gray-600">Credits Remaining</div>
              <Progress value={progressPercentage} className="mt-2" />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Information */}
      <Tabs defaultValue={isClassView ? "assignments" : "grades"} className="space-y-4">
        <TabsList>
          {isClassView ? (
            <>
              <TabsTrigger value="assignments">Assignments</TabsTrigger>
              <TabsTrigger value="strengths">Subject Strengths</TabsTrigger>
              <TabsTrigger value="progress">Progress Trend</TabsTrigger>
            </>
          ) : (
            <>
              <TabsTrigger value="grades">Grade History</TabsTrigger>
              <TabsTrigger value="courses">Current Courses</TabsTrigger>
              <TabsTrigger value="progress">Academic Progress</TabsTrigger>
            </>
          )}
        </TabsList>

        {isClassView && classData ? (
          <>
            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Grades</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classData.assignments.map((assignment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{assignment.name}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">Due: {assignment.date}</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{assignment.grade}/{assignment.maxGrade} points</span>
                          </div>
                          <Progress value={(assignment.grade / assignment.maxGrade) * 100} className="mt-2 w-48" />
                        </div>
                        <Badge className={getGradeColor(assignment.grade)}>
                          {assignment.grade}%
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="strengths">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Matter Strengths</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classData.subjectStrengths.map((strength, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-gray-900">{strength.topic}</h3>
                            {getTrendIcon(strength.trend)}
                          </div>
                          <Progress value={strength.strength} className="mt-2 w-64" />
                        </div>
                        <div className="text-right">
                          <div className="text-2xl font-bold text-gray-900">{strength.strength}%</div>
                          <div className="text-sm text-gray-600 capitalize">{strength.trend}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <Card>
                <CardHeader>
                  <CardTitle>Assignment Progress Over Time</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={classData.assignments}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis domain={[0, 100]} />
                        <Tooltip formatter={(value) => [`${value}%`, 'Grade']} />
                        <Line 
                          type="monotone" 
                          dataKey="grade" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </>
        ) : (
          // ... keep existing code (original tabs for general profile)
          <>
            <TabsContent value="grades">
              <Card>
                <CardHeader>
                  <CardTitle>Semester GPA Trends</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={gradeHistory}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="semester" />
                        <YAxis domain={[0, 4]} />
                        <Tooltip formatter={(value) => [`${value} GPA`, 'GPA']} />
                        <Line 
                          type="monotone" 
                          dataKey="gpa" 
                          stroke="#3b82f6" 
                          strokeWidth={3}
                          dot={{ fill: '#3b82f6', strokeWidth: 2, r: 6 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Current Course Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseGrades.map((course, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900">{course.course}</h3>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-sm text-gray-600">{course.credits} credits</span>
                            <span className="text-sm text-gray-400">•</span>
                            <span className="text-sm text-gray-600">{course.progress}% complete</span>
                          </div>
                          <Progress value={course.progress} className="mt-2 w-48" />
                        </div>
                        <Badge className={getGradeColor(course.grade)}>
                          {course.grade}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Credit Distribution</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">Completed Credits</span>
                        <span className="font-semibold">{mockStudent.completedCredits} / {mockStudent.totalCredits}</span>
                      </div>
                      <Progress value={progressPercentage} className="h-3" />
                      <div className="text-sm text-gray-600">
                        {mockStudent.totalCredits - mockStudent.completedCredits} credits remaining to graduate
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle>Academic Milestones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Freshman Year Completed</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-green-500"></div>
                        <span className="text-sm">Sophomore Year Completed</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                        <span className="text-sm">Junior Year In Progress</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                        <span className="text-sm text-gray-500">Senior Year Pending</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
