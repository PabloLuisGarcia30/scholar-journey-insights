import { useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PracticeTestGenerator } from "./PracticeTestGenerator";
import { MultiPracticeTestResults } from "./MultiPracticeTestResults";
import { MultiSkillActionBar } from "./MultiSkillActionBar";
import { StudentProfileHeader } from "./StudentProfileHeader";
import { StudentQuickStats } from "./StudentQuickStats";
import { StudentTestResults } from "./StudentTestResults";
import { StudentContentSkills } from "./StudentContentSkills";
import { StudentSubjectSkills } from "./StudentSubjectSkills";
import { StudentProgressChart } from "./StudentProgressChart";
import { LearningStyleBySubject } from "./LearningStyleBySubject";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useSkillData } from "@/hooks/useSkillData";
import { calculateOverallGrade } from "@/utils/studentProfileUtils";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";
import { generateMultiplePracticeTests, MultiPracticeTestResult } from "@/services/practiceTestService";
import { toast } from "sonner";

interface StudentProfileProps {
  studentId: string;
  classId?: string;
  className?: string;
  onBack: () => void;
}

export function StudentProfile({ studentId, classId, className, onBack }: StudentProfileProps) {
  const [showPracticeTest, setShowPracticeTest] = useState(false);
  const [showMultiPracticeTests, setShowMultiPracticeTests] = useState(false);
  const [selectedSkill, setSelectedSkill] = useState<string | null>(null);
  const [multiTestResults, setMultiTestResults] = useState<MultiPracticeTestResult[]>([]);
  const [isGeneratingMultiTests, setIsGeneratingMultiTests] = useState(false);
  
  const { selectedSkills, clearSelection, toggleSelectionMode } = useMultiSkillSelection();
  
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
    enrolledClasses,
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

  const handleGenerateMultiPracticeTests = async () => {
    if (selectedSkills.length === 0) {
      toast.error("Please select at least one skill");
      return;
    }

    setIsGeneratingMultiTests(true);
    
    try {
      const results = await generateMultiplePracticeTests(
        selectedSkills.map(skill => ({ name: skill.name, score: skill.score })),
        {
          studentName: student?.name || '',
          className: className || classData?.name || `${classData?.subject} ${classData?.grade}` || 'Unknown Class',
          grade: classData?.grade || 'Grade 10',
          subject: classData?.subject || 'Math',
          classId: classData?.id || classId
        }
      );

      setMultiTestResults(results);
      setShowMultiPracticeTests(true);
      clearSelection();
      toggleSelectionMode();
      toast.success(`Generated ${results.filter(r => r.status === 'completed').length} practice tests successfully!`);
    } catch (error) {
      console.error('Error generating multiple practice tests:', error);
      toast.error("Failed to generate practice tests. Please try again.");
    } finally {
      setIsGeneratingMultiTests(false);
    }
  };

  const handleRegenerateSkill = async (skillName: string) => {
    try {
      const skillToRegenerate = selectedSkills.find(s => s.name === skillName) || 
        { name: skillName, score: 0 };
      
      const results = await generateMultiplePracticeTests(
        [{ name: skillToRegenerate.name, score: skillToRegenerate.score }],
        {
          studentName: student?.name || '',
          className: className || classData?.name || `${classData?.subject} ${classData?.grade}` || 'Unknown Class',
          grade: classData?.grade || 'Grade 10',
          subject: classData?.subject || 'Math',
          classId: classData?.id || classId
        }
      );

      setMultiTestResults(prev => 
        prev.map(result => 
          result.skillName === skillName ? results[0] : result
        )
      );

      toast.success("Practice test regenerated successfully!");
    } catch (error) {
      toast.error("Failed to regenerate practice test");
    }
  };

  const handleBackFromPracticeTest = () => {
    setShowPracticeTest(false);
    setSelectedSkill(null);
  };

  const handleBackFromMultiTests = () => {
    setShowMultiPracticeTests(false);
    setMultiTestResults([]);
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

  if (showMultiPracticeTests) {
    return (
      <MultiPracticeTestResults
        results={multiTestResults}
        studentName={student?.name || ''}
        className={className || classData?.name || `${classData?.subject} ${classData?.grade}` || 'Unknown Class'}
        onBack={handleBackFromMultiTests}
        onRegenerateSkill={handleRegenerateSkill}
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
              <TabsTrigger value="learning-profile">Subject Learning Profile</TabsTrigger>
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

            <TabsContent value="learning-profile">
              <LearningStyleBySubject
                studentName={student?.name || ''}
                enrolledClasses={enrolledClasses}
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

      <MultiSkillActionBar 
        onGenerateTests={handleGenerateMultiPracticeTests}
      />
    </div>
  );
}
