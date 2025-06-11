
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import StudentLanding from "./pages/StudentLanding";
import HomeLearner from "./pages/HomeLearner";
import StudentClassScores from "./pages/StudentClassScores";
import StudentPracticeExercise from "./pages/StudentPracticeExercise";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { DevRoleProvider, useDevRole } from "./contexts/DevRoleContext";
import { MultiSkillSelectionProvider } from "./contexts/MultiSkillSelectionContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import TestCreator from "./pages/TestCreator";
import UploadTest from "./pages/UploadTest";
import StudentUpload from "./pages/StudentUpload";
import CreateQuizLink from "./pages/CreateQuizLink";
import StudentLessonTracker from "./pages/StudentLessonTracker";
import StudentLearnerProfile from "./pages/StudentLearnerProfile";
import StudentQuiz from "./pages/StudentQuiz";
import ClassRunner from "./pages/ClassRunner";
import LessonPlanner from "./pages/LessonPlanner";
import { DEV_CONFIG } from "./config/devConfig";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();
  
  // Get dev role for routing decisions
  let currentRole: 'teacher' | 'student' = 'teacher';
  try {
    const { currentRole: devRole, isDevMode } = useDevRole();
    if (isDevMode) {
      currentRole = devRole;
    } else if (profile?.role) {
      currentRole = profile.role;
    }
  } catch {
    // DevRoleContext not available, use profile role or default
    currentRole = profile?.role || 'teacher';
  }

  if (loading && !DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-lg text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/auth" element={<Auth />} />
      <Route path="/quiz/:token" element={<StudentQuiz />} />
      
      {/* Protected Routes */}
      <Route 
        path="/" 
        element={
          <ProtectedRoute>
            {currentRole === 'student' ? <Navigate to="/student-dashboard" replace /> : <Index />}
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
            <StudentLanding />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/main" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/home-learner" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
            <HomeLearner />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/class/:classId" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
            <StudentClassScores />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard/practice/:classId/:skillName" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "student"}>
            <StudentPracticeExercise />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/test-creator" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
            <TestCreator />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/upload-test" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
            <UploadTest />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-upload" 
        element={
          <ProtectedRoute>
            <StudentUpload />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/create-quiz-link" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
            <CreateQuizLink />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-lesson-tracker" 
        element={
          <ProtectedRoute>
            <StudentLessonTracker />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-learner-profile" 
        element={
          <ProtectedRoute>
            <StudentLearnerProfile />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/class-runner" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
            <ClassRunner />
          </ProtectedRoute>
        } 
      />

      <Route 
        path="/lesson-planner" 
        element={
          <ProtectedRoute requiredRole={DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? undefined : "teacher"}>
            <LessonPlanner />
          </ProtectedRoute>
        } 
      />
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <DevRoleProvider>
          <AuthProvider>
            <MultiSkillSelectionProvider>
              <TooltipProvider>
                <Toaster />
                <AppRoutes />
              </TooltipProvider>
            </MultiSkillSelectionProvider>
          </AuthProvider>
        </DevRoleProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
