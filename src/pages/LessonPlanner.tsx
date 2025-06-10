
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, BookOpen, Plus, ChevronUp, ChevronDown } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { WeeklyCalendar } from "@/components/WeeklyCalendar";
import { ClassStudentList } from "@/components/ClassStudentList";
import { useQuery } from "@tanstack/react-query";
import { getActiveClassByIdWithDuration, getAllActiveStudents } from "@/services/examService";
import { useState } from "react";
import { LockLessonPlanDialog } from "@/components/LockLessonPlanDialog";
import type { LessonPlanData } from "@/services/lessonPlanService";

export default function LessonPlanner() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const className = searchParams.get('class') || 'Unknown Class';
  const classId = searchParams.get('classId');
  
  // Automatically show student list when classId is present
  const [showStudentList, setShowStudentList] = useState(!!classId);
  const [showLessonPlanDialog, setShowLessonPlanDialog] = useState(false);
  const [selectedClassForPlanning, setSelectedClassForPlanning] = useState<any>(null);

  // Fetch class data if classId is available
  const { data: classData, isLoading: isLoadingClass } = useQuery({
    queryKey: ['activeClass', classId],
    queryFn: () => getActiveClassByIdWithDuration(classId!),
    enabled: !!classId,
  });

  // Fetch all active students to get their names
  const { data: allStudents = [] } = useQuery({
    queryKey: ['allActiveStudents'],
    queryFn: getAllActiveStudents,
    enabled: !!classId
  });

  const handleToggleStudentList = () => {
    setShowStudentList(!showStudentList);
  };

  const handleSelectStudent = (studentId: string, studentName: string) => {
    console.log('Selected student for lesson planning:', { studentId, studentName });
    // TODO: Navigate to individualized lesson planning for this student
    // navigate(`/lesson-planner/student/${studentId}?class=${className}&classId=${classId}`);
  };

  const handleCreateLessonPlan = () => {
    if (!classData || !classId) {
      console.error('No class data available for lesson planning');
      return;
    }

    console.log('Creating lesson plan for:', classData.name);
    
    // Prepare lesson plan data
    const lessonPlanData: LessonPlanData = {
      classId: classId,
      className: classData.name,
      teacherName: classData.teacher,
      subject: classData.subject,
      grade: classData.grade,
      scheduledDate: new Date().toISOString().split('T')[0], // Today's date
      scheduledTime: "10:30", // Default time
      students: classData.students?.map((studentId: string) => {
        const studentData = allStudents.find(s => s.id === studentId);
        return {
          studentId,
          studentName: studentData?.name || `Student ${studentId.slice(0, 8)}`, // Use real name from database
          targetSkillName: "To be determined",
          targetSkillScore: 0
        };
      }) || []
    };

    setSelectedClassForPlanning(lessonPlanData);
    setShowLessonPlanDialog(true);
  };

  const handleLessonPlanSuccess = () => {
    setShowLessonPlanDialog(false);
    setSelectedClassForPlanning(null);
    // Optionally refresh data or show success message
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30">
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-4 mb-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/class-runner')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to ClassRunner
            </Button>
          </div>
          <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 via-slate-700 to-blue-800 bg-clip-text text-transparent">
            Lesson Planner
          </h1>
          <p className="text-lg text-slate-600 mt-2">Plan lessons for {className}</p>
        </div>

        {/* Plan Next Class Button and Calendar */}
        <div className="mb-8">
          <div className="flex flex-col lg:flex-row gap-6 items-start lg:items-center">
            {/* Plan Next Class Button */}
            <div className="flex-shrink-0">
              <Button 
                onClick={handleToggleStudentList}
                className="flex flex-col items-center gap-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 h-auto min-h-[3rem] relative"
                size="lg"
              >
                <div className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  <span className="text-base">Individualized Lesson plan</span>
                  {showStudentList ? (
                    <ChevronUp className="h-4 w-4 ml-1" />
                  ) : (
                    <ChevronDown className="h-4 w-4 ml-1" />
                  )}
                </div>
                <span className="text-sm">for your next class</span>
              </Button>
            </div>
            
            {/* Weekly Calendar */}
            <div className="flex-1 min-w-0">
              <h3 className="text-sm font-medium text-slate-700 mb-3">Next 7 Days</h3>
              <WeeklyCalendar 
                classData={classData} 
                isLoading={isLoadingClass}
              />
            </div>
          </div>
        </div>

        {/* Student List and Lesson Planning - Shows by default when classId is present */}
        {showStudentList && classId && (
          <div className="mb-8">
            <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5" />
                    Create Lesson Plan for {className}
                  </CardTitle>
                  <Button 
                    onClick={handleCreateLessonPlan}
                    className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                    disabled={!classData || isLoadingClass}
                  >
                    <Plus className="h-4 w-4" />
                    Create Lesson Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <ClassStudentList 
                  classId={classId}
                  className={className}
                  onSelectStudent={handleSelectStudent}
                />
              </CardContent>
            </Card>
          </div>
        )}

        {/* Main Content - Only show if no classId (fallback) */}
        {!classId && (
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-sm">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Lesson Planning Tools
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-12">
                <BookOpen className="h-16 w-16 text-slate-300 mx-auto mb-6" />
                <h3 className="text-xl font-semibold text-slate-700 mb-2">
                  Select a Class to Plan Lessons
                </h3>
                <p className="text-slate-500 max-w-md mx-auto mb-6">
                  Navigate to ClassRunner and select a class to begin lesson planning with personalized exercises for each student.
                </p>
                <Button 
                  onClick={() => navigate('/class-runner')}
                  className="flex items-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Go to ClassRunner
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Lesson Plan Dialog */}
      <LockLessonPlanDialog
        open={showLessonPlanDialog}
        onOpenChange={setShowLessonPlanDialog}
        lessonPlanData={selectedClassForPlanning}
        onSuccess={handleLessonPlanSuccess}
      />
    </div>
  );
}
