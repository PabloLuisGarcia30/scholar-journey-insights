
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { PracticeTestGenerator } from "./PracticeTestGenerator";
import { StudentProfileHeader } from "./StudentProfile/StudentProfileHeader";
import { StudentQuickStats } from "./StudentProfile/StudentQuickStats";
import { TestResultsTab } from "./StudentProfile/TestResultsTab";
import { SkillScoresTab } from "./StudentProfile/SkillScoresTab";
import { ProgressTrendTab } from "./StudentProfile/ProgressTrendTab";
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar } from 'recharts';
import { supabase } from "@/integrations/supabase/client";
import { 
  getActiveStudentById, 
  getActiveClassById,
  getLinkedContentSkillsForClass,
  linkClassToContentSkills,
  getLinkedSubjectSkillsForClass,
  linkClassToSubjectSkills,
  getContentSkillsBySubjectAndGrade,
  getSubjectSkillsBySubjectAndGrade,
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

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  
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

  // Fetch test results - use the active student ID
  const { data: testResults = [], isLoading: testResultsLoading } = useQuery({
    queryKey: ['studentTestResults', studentId],
    queryFn: async () => {
      console.log('Fetching test results for active student ID:', studentId);
      
      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('active_student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching test results:', error);
        throw new Error(`Failed to fetch test results: ${error.message}`);
      }

      return data || [];
    },
  });

  // Fetch content skill scores - use the active student ID
  const { data: contentSkillScores = [], isLoading: contentSkillsLoading } = useQuery({
    queryKey: ['studentContentSkills', studentId],
    queryFn: async () => {
      console.log('Fetching content skill scores for active student ID:', studentId);
      
      const { data, error } = await supabase
        .from('content_skill_scores')
        .select(`
          *,
          test_results!inner(active_student_id)
        `)
        .eq('test_results.active_student_id', studentId);

      if (error) {
        console.error('Error fetching content skill scores:', error);
        throw new Error(`Failed to fetch content skill scores: ${error.message}`);
      }

      return data || [];
    },
  });

  // Fetch subject skill scores - use the active student ID
  const { data: subjectSkillScores = [], isLoading: subjectSkillsLoading } = useQuery({
    queryKey: ['studentSubjectSkills', studentId],
    queryFn: async () => {
      console.log('Fetching subject skill scores for active student ID:', studentId);
      
      const { data, error } = await supabase
        .from('subject_skill_scores')
        .select(`
          *,
          test_results!inner(active_student_id)
        `)
        .eq('test_results.active_student_id', studentId);

      if (error) {
        console.error('Error fetching subject skill scores:', error);
        throw new Error(`Failed to fetch subject skill scores: ${error.message}`);
      }

      return data || [];
    },
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

  // Calculate overall grade from test results
  const calculateOverallGrade = () => {
    if (testResults.length === 0) return 0;
    const average = testResults.reduce((sum, result) => sum + result.overall_score, 0) / testResults.length;
    return Math.round(average);
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
        <StudentProfileHeader
          student={{ name: 'Unknown Student', email: '', id: '', created_at: '', updated_at: '' }}
          isClassView={!!isClassView}
          className={className}
          classData={classData || undefined}
          overallGrade={0}
          onBack={onBack}
        />
        <div className="text-center py-8">
          <p className="text-gray-600">Student not found.</p>
        </div>
      </div>
    );
  }

  const overallGrade = calculateOverallGrade();
  const totalCredits = 120;
  const completedCredits = student?.gpa ? Math.floor(student.gpa * 20) : 84;
  const progressPercentage = (completedCredits / totalCredits) * 100;

  return (
    <div className="p-6">
      <StudentProfileHeader
        student={student}
        isClassView={!!isClassView}
        className={className}
        classData={classData || undefined}
        overallGrade={overallGrade}
        onBack={onBack}
      />

      <StudentQuickStats
        isClassView={!!isClassView}
        testCount={testResults.length}
        overallGrade={overallGrade}
        completedCredits={completedCredits}
        progressPercentage={progressPercentage}
        totalCredits={totalCredits}
      />

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
              <TestResultsTab testResults={testResults} isLoading={testResultsLoading} />
            </TabsContent>

            <TabsContent value="strengths">
              <SkillScoresTab
                isContentSkills={true}
                skillData={contentSkillScores}
                classSkills={classContentSkills}
                isClassView={!!isClassView}
                classData={classData || undefined}
                isLoading={contentSkillsLoading || classContentSkillsLoading}
                onGeneratePracticeTest={handleGeneratePracticeTest}
              />
            </TabsContent>

            <TabsContent value="specific-strengths">
              <SkillScoresTab
                isContentSkills={false}
                skillData={subjectSkillScores}
                classSkills={classSubjectSkills}
                isClassView={!!isClassView}
                classData={classData || undefined}
                isLoading={subjectSkillsLoading || classSubjectSkillsLoading}
                onGeneratePracticeTest={handleGeneratePracticeTest}
              />
            </TabsContent>

            <TabsContent value="progress">
              <ProgressTrendTab testResults={testResults} />
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

const getGradeColor = (grade: string | number) => {
  const numGrade = typeof grade === 'string' ? 
    (grade.startsWith('A') ? 90 : grade.startsWith('B') ? 80 : grade.startsWith('C') ? 70 : 60) : 
    grade;
  
  if (numGrade >= 90) return 'bg-green-100 text-green-700';
  if (numGrade >= 80) return 'bg-blue-100 text-blue-700';
  if (numGrade >= 70) return 'bg-yellow-100 text-yellow-700';
  return 'bg-red-100 text-red-700';
};
