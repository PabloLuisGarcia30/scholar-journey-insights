import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
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
import { 
  getActiveStudentById, 
  getStudentTestResults, 
  getStudentContentSkillScores, 
  getStudentSubjectSkillScores,
  getActiveClassById,
  getContentSkillsBySubjectAndGrade,
  getLinkedContentSkillsForClass,
  linkClassToContentSkills,
  getSubjectSkillsBySubjectAndGrade,
  getLinkedSubjectSkillsForClass,
  linkClassToSubjectSkills,
  type ActiveStudent,
  type TestResult,
  type SkillScore,
  type ActiveClass,
  type ContentSkill,
  type SubjectSkill
} from "@/services/examService";

interface StudentProfileProps {
  studentId: string;
  classId?: string;
  className?: string;
  onBack: () => void;
}

// Mock data for non-database fields (assignments, grade history, etc.)
const mockClassData = {
  assignments: [
    { name: 'Quiz 1: Basic Operations', grade: 92, maxGrade: 100, date: '2024-01-15' },
    { name: 'Homework Set 1', grade: 85, maxGrade: 100, date: '2024-01-20' },
    { name: 'Midterm Exam', grade: 88, maxGrade: 100, date: '2024-02-15' },
    { name: 'Project: Real World Math', grade: 90, maxGrade: 100, date: '2024-02-28' },
    { name: 'Quiz 2: Fractions', grade: 82, maxGrade: 100, date: '2024-03-05' },
  ],
  attendanceRate: 95,
  participationScore: 8.5,
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
  
  // Define isClassView early so it can be used in queries
  const isClassView = classId && className;
  
  // Fetch student data
  const { data: student, isLoading: studentLoading } = useQuery({
    queryKey: ['activeStudent', studentId],
    queryFn: () => getActiveStudentById(studentId),
  });

  // Fetch class data if in class view
  const { data: classData, isLoading: classLoading } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => classId ? getActiveClassById(classId) : Promise.resolve(null),
    enabled: !!classId,
  });

  // Helper function to check if this is a Grade 10 Math class
  const isGrade10MathClass = () => {
    return classData && classData.subject === 'Math' && classData.grade === 'Grade 10';
  };

  // Auto-link Grade 10 Math classes to their skills when class data loads
  useEffect(() => {
    const autoLinkSkills = async () => {
      if (isGrade10MathClass() && classId) {
        try {
          console.log('Auto-linking Grade 10 Math class to Grade 10 Math skills');
          
          // Link Content-Specific Skills
          const allContentSkills = await getContentSkillsBySubjectAndGrade('Math', 'Grade 10');
          const contentSkillIds = allContentSkills.map(skill => skill.id);
          await linkClassToContentSkills(classId, contentSkillIds);
          console.log(`Successfully linked class to ${contentSkillIds.length} Grade 10 Math content skills`);
          
          // Link Subject-Specific Skills
          const allSubjectSkills = await getSubjectSkillsBySubjectAndGrade('Math', 'Grade 10');
          const subjectSkillIds = allSubjectSkills.map(skill => skill.id);
          await linkClassToSubjectSkills(classId, subjectSkillIds);
          console.log(`Successfully linked class to ${subjectSkillIds.length} Grade 10 Math subject skills`);
          
          // Trigger refetch of both skill types
          if (classContentSkillsRefetch) {
            classContentSkillsRefetch();
          }
          if (classSubjectSkillsRefetch) {
            classSubjectSkillsRefetch();
          }
        } catch (error) {
          console.error('Failed to auto-link Grade 10 Math skills:', error);
        }
      }
    };

    if (classData) {
      autoLinkSkills();
    }
  }, [classData, classId]);

  // Fetch test results
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['studentTestResults', studentId],
    queryFn: () => getStudentTestResults(studentId),
  });

  // Fetch content skill scores
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['studentContentSkills', studentId],
    queryFn: () => getStudentContentSkillScores(studentId),
  });

  // Fetch subject skill scores
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['studentSubjectSkills', studentId],
    queryFn: () => getStudentSubjectSkillScores(studentId),
  });

  // Fetch content skills for the class to show complete skill set
  const { data: classContentSkills = [], isLoading: classContentSkillsLoading, refetch: classContentSkillsRefetch } = useQuery({
    queryKey: ['classLinkedContentSkills', classId],
    queryFn: () => classId ? getLinkedContentSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && !!isClassView,
  });

  // Fetch subject skills for the class to show complete skill set
  const { data: classSubjectSkills = [], isLoading: classSubjectSkillsLoading, refetch: classSubjectSkillsRefetch } = useQuery({
    queryKey: ['classLinkedSubjectSkills', classId],
    queryFn: () => classId ? getLinkedSubjectSkillsForClass(classId) : Promise.resolve([]),
    enabled: !!classId && !!isClassView,
  });

  const totalCredits = 120;
  const completedCredits = student?.gpa ? Math.floor(student.gpa * 20) : 84; // Mock calculation
  const progressPercentage = (completedCredits / totalCredits) * 100;

  // Calculate overall grade from test results
  const calculateOverallGrade = () => {
    if (testResults.length === 0) return 0;
    const average = testResults.reduce((sum, result) => sum + result.overall_score, 0) / testResults.length;
    return Math.round(average);
  };

  // Create comprehensive skill data combining test scores with class skills
  const getComprehensiveSkillData = () => {
    console.log('Getting comprehensive skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      classContentSkillsLength: classContentSkills.length, 
      contentSkillScoresLength: contentSkillScores.length,
      'Class Content Skills:': classContentSkills.map(s => ({ topic: s.topic, skill: s.skill_name })),
      'Content skill scores:': contentSkillScores.map(s => s.skill_name)
    });

    // If we're in class view and have class content skills, show all skills for the class
    if (isClassView && classContentSkills.length > 0) {
      console.log('Using linked class content skills');
      // Create a map of skill scores by skill name
      const scoreMap = new Map(contentSkillScores.map(score => [score.skill_name, score]));

      // Combine class skills with actual scores, showing 0 for untested skills
      return classContentSkills.map(skill => {
        const existingScore = scoreMap.get(skill.skill_name);
        return existingScore || {
          id: `placeholder-${skill.id}`,
          test_result_id: '',
          skill_name: skill.skill_name,
          score: 0, // Show 0% for skills not yet tested
          points_earned: 0,
          points_possible: 0,
          created_at: ''
        };
      });
    }

    // Otherwise, just return the content skill scores from tests
    console.log('Using test result content skill scores only');
    return contentSkillScores;
  };

  const comprehensiveSkillData = getComprehensiveSkillData();

  // Create comprehensive subject skill data combining test scores with class skills
  const getComprehensiveSubjectSkillData = () => {
    console.log('Getting comprehensive subject skill data:', { 
      isClassView, 
      isGrade10Math: isGrade10MathClass(),
      classSubjectSkillsLength: classSubjectSkills.length, 
      subjectSkillScoresLength: subjectSkillScores.length,
      'Class Subject Skills:': classSubjectSkills.map(s => s.skill_name),
      'Subject skill scores:': subjectSkillScores.map(s => s.skill_name)
    });

    // If we're in class view and have class subject skills, show all skills for the class
    if (isClassView && classSubjectSkills.length > 0) {
      console.log('Using linked class subject skills');
      // Create a map of skill scores by skill name
      const scoreMap = new Map(subjectSkillScores.map(score => [score.skill_name, score]));

      // Combine class skills with actual scores, showing 0 for untested skills
      return classSubjectSkills.map(skill => {
        const existingScore = scoreMap.get(skill.skill_name);
        return existingScore || {
          id: `placeholder-${skill.id}`,
          test_result_id: '',
          skill_name: skill.skill_name,
          score: 0, // Show 0% for skills not yet tested
          points_earned: 0,
          points_possible: 0,
          created_at: ''
        };
      });
    }

    // Otherwise, just return the subject skill scores from tests
    console.log('Using test result subject skill scores only');
    return subjectSkillScores;
  };

  const comprehensiveSubjectSkillData = getComprehensiveSubjectSkillData();

  // Group skills by topic for better organization
  const groupSkillsByTopic = (skills: typeof comprehensiveSkillData) => {
    if (!isClassView) return { 'General Skills': skills };

    const skillsForGrouping = classContentSkills;

    if (!skillsForGrouping.length) return { 'General Skills': skills };

    const grouped: Record<string, typeof skills> = {};
    
    skills.forEach(skillScore => {
      const contentSkill = skillsForGrouping.find(cs => cs.skill_name === skillScore.skill_name);
      const topic = contentSkill?.topic || 'General Skills';
      
      if (!grouped[topic]) {
        grouped[topic] = [];
      }
      grouped[topic].push(skillScore);
    });

    // Sort topics in the exact order specified for Grade 10 Math
    if (isGrade10MathClass()) {
      const orderedTopics = [
        'ALGEBRA AND FUNCTIONS',
        'GEOMETRY', 
        'TRIGONOMETRY',
        'DATA ANALYSIS AND PROBABILITY',
        'PROBLEM SOLVING AND REASONING'
      ];

      const orderedGrouped: Record<string, typeof skills> = {};
      orderedTopics.forEach(topic => {
        if (grouped[topic]) {
          // Sort skills within each topic
          const skillOrders: Record<string, string[]> = {
            'ALGEBRA AND FUNCTIONS': [
              'Factoring Polynomials',
              'Solving Systems of Equations',
              'Understanding Function Notation',
              'Graphing Linear and Quadratic Functions',
              'Working with Exponential Functions'
            ],
            'GEOMETRY': [
              'Properties of Similar Triangles',
              'Area and Perimeter Calculations',
              'Volume and Surface Area of 3D Objects',
              'Coordinate Geometry',
              'Geometric Transformations'
            ],
            'TRIGONOMETRY': [
              'Basic Trigonometric Ratios',
              'Solving Right Triangle Problems',
              'Unit Circle and Angle Measures',
              'Trigonometric Identities',
              'Applications of Trigonometry'
            ],
            'DATA ANALYSIS AND PROBABILITY': [
              'Statistical Measures and Interpretation',
              'Probability Calculations',
              'Data Collection and Sampling',
              'Creating and Interpreting Graphs',
              'Making Predictions from Data'
            ],
            'PROBLEM SOLVING AND REASONING': [
              'Mathematical Modeling',
              'Critical Thinking in Mathematics',
              'Pattern Recognition',
              'Logical Reasoning',
              'Problem-Solving Strategies'
            ]
          };

          if (skillOrders[topic]) {
            const order = skillOrders[topic];
            grouped[topic].sort((a, b) => {
              const aIndex = order.indexOf(a.skill_name);
              const bIndex = order.indexOf(b.skill_name);
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
          }
          
          orderedGrouped[topic] = grouped[topic];
        }
      });

      // Add any remaining topics that weren't in our ordered list
      Object.keys(grouped).forEach(topic => {
        if (!orderedTopics.includes(topic)) {
          orderedGrouped[topic] = grouped[topic];
        }
      });

      return orderedGrouped;
    }

    return grouped;
  };

  const groupedSkills = groupSkillsByTopic(comprehensiveSkillData);

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
    if (mastery === 0) return 'bg-gray-100 text-gray-600'; // For untested skills
    return 'bg-red-100 text-red-700';
  };

  const getTrendIcon = (trend: string) => {
    if (trend === 'up') return <TrendingUp className="h-4 w-4 text-green-600" />;
    if (trend === 'down') return <TrendingDown className="h-4 w-4 text-red-600" />;
    return <Minus className="h-4 w-4 text-blue-600" />;
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
        studentName={student?.name || ''}
        className={className}
        skillName={selectedSkill}
        grade={classData?.grade}
        subject={classData?.subject}
        onBack={handleBackFromPracticeTest}
      />
    );
  }

  if (studentLoading || (isClassView && classLoading)) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
          <div className="grid grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to {isClassView ? 'Class' : 'Dashboard'}
        </Button>
        <div className="text-center py-8">
          <p className="text-gray-600">Student not found.</p>
        </div>
      </div>
    );
  }

  const overallGrade = calculateOverallGrade();

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
              {student.name.split(' ').map(n => n[0]).join('')}
            </AvatarFallback>
          </Avatar>
          
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{student.name}</h1>
            {isClassView ? (
              <p className="text-gray-600 mt-1">Performance in {className}</p>
            ) : (
              <p className="text-gray-600 mt-1">{student.email}</p>
            )}
            <div className="flex items-center gap-4 mt-3">
              {!isClassView && (
                <>
                  {student.year && <Badge variant="outline">{student.year}</Badge>}
                  {student.major && <Badge variant="outline">{student.major}</Badge>}
                  <Badge className="bg-green-100 text-green-700">Active</Badge>
                </>
              )}
              {isClassView && classData && (
                <>
                  <Badge variant="outline">{classData.subject}</Badge>
                  {overallGrade > 0 && (
                    <Badge className={getGradeColor(overallGrade)}>
                      {overallGrade}%
                    </Badge>
                  )}
                </>
              )}
            </div>
          </div>
          
          <div className="text-right">
            {isClassView ? (
              <>
                <div className="text-2xl font-bold text-gray-900">{overallGrade}%</div>
                <div className="text-sm text-gray-600">Class Grade</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-gray-900">{student.gpa || 'N/A'}</div>
                <div className="text-sm text-gray-600">Current GPA</div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      {isClassView ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardContent className="p-4 text-center">
              <BookOpen className="h-8 w-8 text-blue-600 mx-auto mb-2" />
              <div className="text-2xl font-bold">{testResults.length}</div>
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
              <div className="text-2xl font-bold">{mockClassData.attendanceRate}%</div>
              <div className="text-sm text-gray-600">Attendance</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold">{mockClassData.participationScore}/10</div>
              <div className="text-sm text-gray-600">Participation</div>
            </CardContent>
          </Card>
        </div>
      ) : (
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
      )}

      {/* Detailed Information */}
      <Tabs defaultValue={isClassView ? "assignments" : "grades"} className="space-y-4">
        <TabsList>
          {isClassView ? (
            <>
              <TabsTrigger value="assignments">Test Results</TabsTrigger>
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

        {isClassView ? (
          <>
            <TabsContent value="assignments">
              <Card>
                <CardHeader>
                  <CardTitle>Test Results</CardTitle>
                </CardHeader>
                <CardContent>
                  {testResultsLoading ? (
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
            </TabsContent>

            <TabsContent value="strengths">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>
                      {isClassView && classData 
                        ? `${classData.subject} ${classData.grade} Content-Specific Skills`
                        : 'Content-Specific Skills'
                      }
                    </CardTitle>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          Generate practice exercises
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-64 bg-white">
                        <DropdownMenuItem onClick={() => handleGeneratePracticeTest()}>
                          All Skills Combined
                        </DropdownMenuItem>
                        {comprehensiveSkillData.map((skill, index) => (
                          <DropdownMenuItem 
                            key={index} 
                            onClick={() => handleGeneratePracticeTest(skill.skill_name)}
                            className="flex items-center justify-between"
                          >
                            <span>{skill.skill_name}</span>
                            <Badge variant="outline" className="ml-2">
                              {Math.round(skill.score)}%
                            </Badge>
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </CardHeader>
                <CardContent>
                  {(contentSkillsLoading || classContentSkillsLoading) ? (
                    <div className="animate-pulse space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : comprehensiveSkillData.length > 0 ? (
                    <div className="space-y-6">
                      {Object.entries(groupedSkills).map(([topic, skills]) => (
                        <div key={topic}>
                          <h3 className="text-lg font-semibold text-gray-900 mb-4">{topic}</h3>
                          <div className="space-y-3">
                            {skills.map((skill, index) => (
                              <div key={`${topic}-${index}`} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-semibold text-gray-900">{skill.skill_name}</h4>
                                    {skill.score === 0 && (
                                      <Badge variant="outline" className="text-xs">Not tested</Badge>
                                    )}
                                  </div>
                                  <Progress value={skill.score} className="mt-2 w-64" />
                                </div>
                                <div className="text-right">
                                  <Badge className={getMasteryColor(skill.score)}>
                                    {Math.round(skill.score)}%
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-600">
                        {isClassView && classContentSkillsLoading
                          ? 'Loading content skills...' 
                          : (classContentSkills.length === 0 && isClassView)
                          ? 'No content skills found for this class.'
                          : 'No content skill data available.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="specific-strengths">
              <Card>
                <CardHeader>
                  <CardTitle>Subject Specific Skill Mastery</CardTitle>
                </CardHeader>
                <CardContent>
                  {(subjectSkillsLoading || classSubjectSkillsLoading) ? (
                    <div className="animate-pulse space-y-4">
                      {[...Array(5)].map((_, i) => (
                        <div key={i} className="h-16 bg-gray-200 rounded"></div>
                      ))}
                    </div>
                  ) : comprehensiveSubjectSkillData.length > 0 ? (
                    <div className="space-y-3">
                      {comprehensiveSubjectSkillData.map((skill, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-semibold text-gray-900">{skill.skill_name}</h4>
                              {skill.score === 0 && (
                                <Badge variant="outline" className="text-xs">Not tested</Badge>
                              )}
                            </div>
                            <Progress value={skill.score} className="mt-2 w-64" />
                          </div>
                          <div className="text-right">
                            <Badge className={getMasteryColor(skill.score)}>
                              {Math.round(skill.score)}%
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No subject skill data available</h3>
                      <p className="text-gray-600">
                        {isClassView && classSubjectSkillsLoading
                          ? 'Loading subject skills...' 
                          : (classSubjectSkills.length === 0 && isClassView)
                          ? 'No subject skills found for this class.'
                          : 'Subject-specific skill analysis will appear here after test results are processed.'
                        }
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="progress">
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
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="grades">
              <Card>
                <CardHeader>
                  <CardTitle>Grade History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {gradeHistory.map((semester, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div>
                          <h4 className="font-semibold text-gray-900">{semester.semester}</h4>
                          <p className="text-sm text-gray-600">{semester.credits} credits</p>
                        </div>
                        <div className="text-right">
                          <Badge className={getGradeColor(semester.gpa * 25)}>
                            {semester.gpa} GPA
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="courses">
              <Card>
                <CardHeader>
                  <CardTitle>Current Courses</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {courseGrades.map((course, index) => (
                      <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-gray-100">
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-semibold text-gray-900">{course.course}</h4>
                            <Badge className={getGradeColor(course.grade)}>
                              {course.grade}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-4">
                            <span className="text-sm text-gray-600">{course.credits} credits</span>
                            <Progress value={course.progress} className="flex-1 max-w-32" />
                            <span className="text-sm text-gray-600">{course.progress}%</span>
                          </div>
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
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
