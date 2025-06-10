
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import StudentDashboard from "./pages/StudentDashboard";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import { ProtectedRoute } from "./components/ProtectedRoute";
import NotFound from "./pages/NotFound";
import TestCreator from "./pages/TestCreator";
import UploadTest from "./pages/UploadTest";
import StudentUpload from "./pages/StudentUpload";
import CreateQuizLink from "./pages/CreateQuizLink";
import StudentLessonTracker from "./pages/StudentLessonTracker";
import StudentLearnerProfile from "./pages/StudentLearnerProfile";
import StudentQuiz from "./pages/StudentQuiz";

const queryClient = new QueryClient();

function AppRoutes() {
  const { user, profile, loading } = useAuth();

  if (loading) {
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
            {profile?.role === 'student' ? <Navigate to="/student-dashboard" replace /> : <Index />}
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/student-dashboard" 
        element={
          <ProtectedRoute requiredRole="student">
            <StudentDashboard />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/test-creator" 
        element={
          <ProtectedRoute requiredRole="teacher">
            <TestCreator />
          </ProtectedRoute>
        } 
      />
      
      <Route 
        path="/upload-test" 
        element={
          <ProtectedRoute requiredRole="teacher">
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
          <ProtectedRoute requiredRole="teacher">
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
      
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <TooltipProvider>
            <Toaster />
            <AppRoutes />
          </TooltipProvider>
        </AuthProvider>
      </QueryClientProvider>
    </BrowserRouter>
  );
}

export default App;
