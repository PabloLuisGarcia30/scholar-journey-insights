
import { useState } from "react";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentSearch } from "@/components/StudentSearch";
import { StudentProfile } from "@/components/StudentProfile";
import { ClassView } from "@/components/ClassView";
import { StudentPortals } from "@/components/StudentPortals";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";

const Index = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker' | 'learner-profiles'>('dashboard');

  const handleSelectStudent = (studentId: string, classId?: string, className?: string) => {
    setSelectedStudent(studentId);
    if (classId && className) {
      setSelectedClass({ id: classId, name: className });
    } else {
      setSelectedClass(null);
    }
  };

  const handleBack = () => {
    setSelectedStudent(null);
    setSelectedClass(null);
  };

  const renderContent = () => {
    if (selectedStudent) {
      return (
        <StudentProfile 
          studentId={selectedStudent} 
          classId={selectedClass?.id}
          className={selectedClass?.name}
          onBack={handleBack} 
        />
      );
    }

    switch (activeView) {
      case 'search':
        return <StudentSearch onSelectStudent={handleSelectStudent} />;
      case 'classes':
        return <ClassView onSelectStudent={handleSelectStudent} />;
      case 'analytics':
        return <div className="p-6"><h2 className="text-2xl font-bold">Analytics Dashboard</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'portals':
        return <div className="p-6"><StudentPortals /></div>;
      case 'student-lesson-tracker':
        return <div className="p-6"><h2 className="text-2xl font-bold">Student Lesson Tracker</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      case 'learner-profiles':
        return <div className="p-6"><h2 className="text-2xl font-bold">Learner Profiles</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      default:
        return <StudentDashboard onSelectStudent={handleSelectStudent} />;
    }
  };

  return (
    <ProtectedRoute allowDevMode={true}>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-gray-50">
          <DashboardSidebar activeView={activeView} onViewChange={setActiveView} />
          <main className="flex-1 overflow-auto">
            {renderContent()}
          </main>
        </div>
      </SidebarProvider>
    </ProtectedRoute>
  );
};

export default Index;
