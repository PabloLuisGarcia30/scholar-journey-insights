
import { useState } from "react";
import { StudentDashboard } from "@/components/StudentDashboard";
import { StudentSearch } from "@/components/StudentSearch";
import { StudentProfile } from "@/components/StudentProfile";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { SidebarProvider } from "@/components/ui/sidebar";

const Index = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<'dashboard' | 'search' | 'analytics'>('dashboard');

  const renderContent = () => {
    if (selectedStudent) {
      return <StudentProfile studentId={selectedStudent} onBack={() => setSelectedStudent(null)} />;
    }

    switch (activeView) {
      case 'search':
        return <StudentSearch onSelectStudent={setSelectedStudent} />;
      case 'analytics':
        return <div className="p-6"><h2 className="text-2xl font-bold">Analytics Dashboard</h2><p className="text-gray-600 mt-2">Coming soon...</p></div>;
      default:
        return <StudentDashboard onSelectStudent={setSelectedStudent} />;
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gray-50">
        <DashboardSidebar activeView={activeView} onViewChange={setActiveView} />
        <main className="flex-1 overflow-auto">
          {renderContent()}
        </main>
      </div>
    </SidebarProvider>
  );
};

export default Index;
