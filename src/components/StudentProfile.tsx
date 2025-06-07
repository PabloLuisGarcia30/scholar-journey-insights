
import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PracticeTestGenerator } from "./PracticeTestGenerator";
import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentQuickStats } from "./StudentQuickStats";
import { StudentTestResults } from "./StudentTestResults";
import { StudentContentSkills } from "./StudentContentSkills";
import { StudentSubjectSkills } from "./StudentSubjectSkills";
import { StudentProgressChart } from "./StudentProgressChart";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useSkillData } from "@/hooks/useSkillData";
import { calculateOverallGrade } from "@/utils/studentProfileUtils";

interface StudentProfileProps {
  studentId: string;
  classId?: string;
  className?: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  
  // Fetch all data using custom hook
  const {
    student,
    studentLoading,
    classData,
    classLoading,
    testResults,
    testResultsLoading,
    contentSkillScores,
    contentSkillsLoading,
    subjectSkillScores,
    subjectSkillsLoading,
    classContentSkills,
    classContentSkillsLoading,
    classSubjectSkills,
    classSubjectSkillsLoading,
    isClassView,
    isGrade10MathClass,
    isGrade10ScienceClass
  } = useStudentProfileData({ studentId, classId, className });

  // Process skill data using custom hook
  const {
    comprehensiveSkillData,
    comprehensiveSubjectSkillData,
    groupedSkills
  } = useSkillData({
    contentSkillScores,
    subjectSkillScores,
    classContentSkills,
    classSubjectSkills,
    isClassView,
    isGrade10MathClass,
    isGrade10ScienceClass
  });

  const overallGrade = calculateOverallGrade(testResults);

  const handleGeneratePracticeTest = (skillName?: string) => {
    setSelectedSkill(skillName || null);
    setShowPracticeTest(true);
  };

  const handleBackFromPracticeTest = () => {
    setShowPracticeTest(false);
    setSelectedSkill(null);
  };

  if (showPracticeTest) {
    return (
      <PracticeTestGenerator
        studentName={student?.name || ''}
        className={className || classData?.name || `${classData?.subject} ${classData?.grade}` || 'Unknown Class'}
        skillName={selectedSkill}
        grade={classData?.grade || 'Grade 10'}
        subject={classData?.subject || 'Math'}
        classId={classData?.id || classId}
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
          student={{ name: 'Unknown', email: '' } as any}
          isClassView={isClassView}
          className={className}
          classData={classData}
          overallGrade={0}
          onBack={onBack}
        />
        <div className="text-center py-8">
          <p className="text-gray-600">Student not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <StudentProfileHeader
        student={student}
        isClassView={isClassView}
        className={className}
        classData={classData}
        overallGrade={overallGrade}
        onBack={onBack}
      />

      <StudentQuickStats
        isClassView={isClassView}
        testResults={testResults}
        overallGrade={overallGrade}
        student={student}
      />

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
              <StudentTestResults
                testResults={testResults}
                testResultsLoading={testResultsLoading}
              />
            </TabsContent>

            <TabsContent value="strengths">
              <StudentContentSkills
                groupedSkills={groupedSkills}
                comprehensiveSkillData={comprehensiveSkillData}
                contentSkillsLoading={contentSkillsLoading}
                classContentSkillsLoading={classContentSkillsLoading}
                isClassView={isClassView}
                classData={classData}
                classContentSkills={classContentSkills}
                onGeneratePracticeTest={handleGeneratePracticeTest}
              />
            </TabsContent>

            <TabsContent value="specific-strengths">
              <StudentSubjectSkills
                comprehensiveSubjectSkillData={comprehensiveSubjectSkillData}
                subjectSkillsLoading={subjectSkillsLoading}
                classSubjectSkillsLoading={classSubjectSkillsLoading}
                isClassView={isClassView}
                classSubjectSkills={classSubjectSkills}
                onGeneratePracticeTest={handleGeneratePracticeTest}
              />
            </TabsContent>

            <TabsContent value="progress">
              <StudentProgressChart
                testResults={testResults}
                isClassView={isClassView}
                student={student}
              />
            </TabsContent>
          </>
        ) : (
          <>
            <TabsContent value="grades">
              
            </TabsContent>

            <TabsContent value="courses">
              
            </TabsContent>

            <TabsContent value="progress">
              <StudentProgressChart
                testResults={testResults}
                isClassView={isClassView}
                student={student}
              />
            </TabsContent>
          </>
        )}
      </Tabs>
    </div>
  );
}
