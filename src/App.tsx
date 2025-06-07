
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Index from './pages/Index';
import TestCreator from './pages/TestCreator';
import UploadTest from './pages/UploadTest';
import StudentUpload from './pages/StudentUpload';
import CreateQuizLink from './pages/CreateQuizLink';
import StudentQuiz from './pages/StudentQuiz';
import StudentLessonTracker from './pages/StudentLessonTracker';
import NotFound from './pages/NotFound';
import { Toaster } from '@/components/ui/toaster';
import './App.css';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gray-50">
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/test-creator" element={<TestCreator />} />
            <Route path="/upload-test" element={<UploadTest />} />
            <Route path="/student-upload" element={<StudentUpload />} />
            <Route path="/create-quiz-link" element={<CreateQuizLink />} />
            <Route path="/student-quiz/:token" element={<StudentQuiz />} />
            <Route path="/student-lesson-tracker" element={<StudentLessonTracker />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
          <Toaster />
        </div>
      </Router>
    </QueryClientProvider>
  );
}

export default App;
