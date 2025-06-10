
import { useState } from "react";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentSearch } from "@/components/StudentSearch";
import { LearnerProfileDisplay } from "@/components/LearnerProfileDisplay";
import { ClassView } from "@/components/ClassView";
import { StudentPortals } from "@/components/StudentPortals";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardHeader } from "@/components/DashboardHeader";
import { SidebarProvider } from "@/components/ui/sidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useDevRole } from "@/contexts/DevRoleContext";
import { useAuth } from "@/contexts/AuthContext";
import { DEV_CONFIG } from "@/config/devConfig";
import { Navigate } from "react-router-dom";

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
        return (
          <div className="p-6">
            <DashboardHeader title="Student Search" subtitle="Find and view student profiles" />
            <StudentSearch onSelectStudent={handleSelectStudent} />
          </div>
        );
      case 'classes':
        return (
          <div className="p-6">
            <DashboardHeader title="Class Management" subtitle="Manage your classes and students" />
            <ClassView onSelectStudent={handleSelectStudent} />
          </div>
        );
      case 'analytics':
        return (
          <div className="p-6">
            <DashboardHeader title="Analytics Dashboard" subtitle="View performance insights and trends" />
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        );
      case 'portals':
        return (
          <div className="p-6">
            <DashboardHeader title="Student Portals" subtitle="Manage student access and assignments" />
            <StudentPortals />
          </div>
        );
      case 'student-lesson-tracker':
        return (
          <div className="p-6">
            <DashboardHeader title="Student Lesson Tracker" subtitle="Track lesson progress and completion" />
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        );
      case 'learner-profiles':
        return (
          <div className="p-6">
            <DashboardHeader title="Learner Profiles" subtitle="Detailed student learning analytics" />
            <p className="text-gray-600 mt-2">Coming soon...</p>
          </div>
        );
      default:
        return (
          <div className="p-6">
            <DashboardHeader title="Teacher Dashboard" subtitle="Overview of student performance and class management" />
            <StudentDashboard onSelectStudent={handleSelectStudent} />
          </div>
        );
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
