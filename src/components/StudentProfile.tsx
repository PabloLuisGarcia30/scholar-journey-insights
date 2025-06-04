import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ArrowLeft, BookOpen, Calendar, ChartBar, TrendingUp, TrendingDown, Target, Minus, FileText, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { PracticeTestGenerator } from "./PracticeTestGenerator";

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
      { topic: 'Algebraic Manipulation', strength: 92, trend: 'up' },
      { topic: 'Quadratic Equations', strength: 85, trend: 'stable' },
      { topic: 'Functions and Graphs', strength: 78, trend: 'up' },
      { topic: 'Trigonometry Basics', strength: 88, trend: 'up' },
      { topic: 'Data Analysis & Statistics', strength: 84, trend: 'stable' },
      { topic: 'Real World Problem Solving', strength: 90, trend: 'up' },
      { topic: 'Accuracy of Computation', strength: 86, trend: 'stable' },
    ],
    subjectSpecificStrengths: [
      { skill: 'Clarity of Explanation', mastery: 88 },
      { skill: 'Use of Mathematical Language', mastery: 85 },
      { skill: 'Presentation', mastery: 78 },
      { skill: 'Logical Reasoning', mastery: 89 },
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
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  
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

  const getMasteryColor = (mastery: number) => {
    if (mastery >= 90) return 'bg-green-100 text-green-700';
    if (mastery >= 80) return 'bg-blue-100 text-blue-700';
    if (mastery >= 70) return 'bg-yellow-100 text-yellow-700';
    return 'bg-red-100 text-red-700';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-blue-600" />; // Blue horizontal line for stable
  };

  const handleGeneratePracticeTest = (skillName?: string) => {
    setSelectedSkill(skillName || null);
    setShowPracticeTest(true);
  };

  const handleBackFromPracticeTest = () => {
    setShowPracticeTest(false);
    setSelectedSkill(null);
  };

  if (showPracticeTest && className) {
    return (
      <PracticeTestGenerator
        studentName={mockStudent.name}
        className={className}
        skillName={selectedSkill}
        onBack={handleBackFromPracticeTest}
      />
    );
  }

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
              <TabsTrigger value="strengths">Content-Specific Skills</TabsTrigger>
              <TabsTrigger value="specific-strengths">Subject Specific Skill Mastery</TabsTrigger>
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
                  <div className="flex items-center justify-between">
                    <CardTitle>Content-Specific Skills</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generate practice test
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 bg-white">
                        <DropdownMenuItem onClick={() => handleGeneratePracticeTest()}>
                          All Skills Combined
                        </DropdownMenuItem>
                        {classData.subjectStrengths.map((strength, index) => (
                          <DropdownMenuItem 
                            key={index} 
                            onClick={() => handleGeneratePracticeTest(strength.topic)}
                            className="flex items-center justify-between"
                          >
                            <span>{strength.topic}</span>
                            <Badge variant="outline" className="ml-2">
                              {strength.strength}%
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
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
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specific-strengths">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Subject Specific Skill Mastery</CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generate practice test
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 bg-white">
                        <DropdownMenuItem onClick={() => handleGeneratePracticeTest()}>
                          All Skills Combined
                        </DropdownMenuItem>
                        {classData.subjectSpecificStrengths.map((strength, index) => (
                          <DropdownMenuItem 
                            key={index} 
                            onClick={() => handleGeneratePracticeTest(strength.skill)}
                            className="flex items-center justify-between"
                          >
                            <span>{strength.skill}</span>
                            <Badge variant="outline" className="ml-2">
                              {strength.mastery}%
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {classData.subjectSpecificStrengths.map((strength, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <Target className="h-5 w-5 text-blue-600" />
                            <h3 className="font-semibold text-gray-900">{strength.skill}</h3>
                          </div>
                          <Progress value={strength.mastery} className="mt-2 w-64" />
                        </div>
                        <div className="text-right">
                          <Badge className={getMasteryColor(strength.mastery)}>
                            {strength.mastery}%
                          </Badge>
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
