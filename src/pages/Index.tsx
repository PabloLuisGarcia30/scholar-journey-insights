
import { useState } from "react";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentSearch } from "@/components/StudentSearch";
import { LearnerProfileDisplay } from "@/components/LearnerProfileDisplay";
import { ClassView } from "@/components/ClassView";
import { StudentPortals } from "@/components/StudentPortals";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDevRole } from "@/contexts/DevRoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { DEV_CONFIG } from "@/config/devConfig";
import { Navigate } from "react-router-dom";
import StudentDashboardPage from "./StudentDashboard";

const Index = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [selectedClass, setSelectedClass] = useState<{ id: string; name: string } | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker' | 'learner-profiles'>('dashboard');
  
  const { profile } = useAuth();
  
  // Get current role (dev or actual)
  let currentRole: 'teacher' | 'student' = 'teacher';
  try {
    const { currentRole: devRole, isDevMode } = useDevRole();
    if (isDevMode) {
      currentRole = devRole;
    } else if (profile?.role) {
      currentRole = profile.role;
    }
  } catch {
    currentRole = profile?.role || 'teacher';
  }

  // If in student view, redirect to student dashboard
  if (currentRole === 'student') {
    return <Navigate to="/student-dashboard" replace />;
  }

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
        <LearnerProfileDisplay 
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
    <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
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
