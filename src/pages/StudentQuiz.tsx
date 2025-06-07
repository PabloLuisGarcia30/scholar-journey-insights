
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Clock, User, FileText } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getStudentLinkByToken, createQuizSession, incrementLinkAttempts } from '@/services/studentLinkService';
import type { StudentLink } from '@/services/studentLinkService';

export default function StudentQuiz() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [quizData, setQuizData] = useState<StudentLink | null>(null);
  const [studentName, setStudentName] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (token) {
      loadQuizData(token);
    } else {
      setError('Invalid quiz link');
      setIsLoading(false);
    }
  }, [token]);

  const loadQuizData = async (quizToken: string) => {
    try {
      console.log('Loading quiz data for token:', quizToken);
      
      const data = await getStudentLinkByToken(quizToken);
      
      if (!data) {
        setError('Quiz not found or has expired');
        return;
      }

      if (data.link_type !== 'quiz') {
        setError('This link is not for a quiz');
        return;
      }

      setQuizData(data);
    } catch (error) {
      console.error('Error loading quiz data:', error);
      setError('Quiz not found or has expired');
    } finally {
      setIsLoading(false);
    }
  };

  const handleStartQuiz = async () => {
    if (!studentName.trim()) {
      toast({
        title: "Name required",
        description: "Please enter your name before starting the quiz.",
        variant: "destructive",
      });
      return;
    }

    if (!quizData) return;

    try {
      // Increment the attempt count
      await incrementLinkAttempts(quizData.id);
      
      // Create a quiz session
      await createQuizSession({
        student_link_id: quizData.id,
        student_name: studentName.trim(),
      });

      setHasStarted(true);
      toast({
        title: "Quiz started",
        description: "Good luck with your quiz!",
      });
    } catch (error) {
      console.error('Error starting quiz:', error);
      toast({
        title: "Error starting quiz",
        description: "There was an error starting your quiz. Please try again.",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading quiz...</p>
        </div>
      </div>
    );
  }

  if (error || !quizData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <AlertCircle className="h-16 w-16 text-red-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-red-700 mb-2">
              Quiz Not Available
            </h2>
            <p className="text-gray-600 mb-4">
              {error || 'This quiz link is invalid or has expired.'}
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isExpired = new Date(quizData.expires_at) < new Date();
  const attemptsRemaining = quizData.max_attempts - quizData.current_attempts;

  if (isExpired) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <Clock className="h-16 w-16 text-orange-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-orange-700 mb-2">
              Quiz Expired
            </h2>
            <p className="text-gray-600 mb-4">
              This quiz expired on {new Date(quizData.expires_at).toLocaleDateString()}.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (attemptsRemaining <= 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <FileText className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-700 mb-2">
              No Attempts Remaining
            </h2>
            <p className="text-gray-600 mb-4">
              You have used all {quizData.max_attempts} allowed attempts for this quiz.
            </p>
            <Button onClick={() => navigate('/')} variant="outline">
              Go Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!hasStarted) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-2xl">
          <Card>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl">{quizData.title}</CardTitle>
              {quizData.description && (
                <p className="text-gray-600 mt-2">{quizData.description}</p>
              )}
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 bg-blue-50 rounded">
                  <User className="h-5 w-5 text-blue-600" />
                  <div>
                    <div className="font-medium">Teacher</div>
                    <div className="text-sm text-gray-600">{quizData.teacher_name}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-green-50 rounded">
                  <Clock className="h-5 w-5 text-green-600" />
                  <div>
                    <div className="font-medium">Expires</div>
                    <div className="text-sm text-gray-600">
                      {new Date(quizData.expires_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-yellow-50 border border-yellow-200 rounded">
                <h4 className="font-medium text-yellow-800 mb-2">Important Notes:</h4>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• You have {attemptsRemaining} attempt(s) remaining</li>
                  <li>• Make sure you have a stable internet connection</li>
                  <li>• Answer all questions before submitting</li>
                  <li>• You cannot go back once submitted</li>
                </ul>
              </div>

              <div className="space-y-2">
                <Label htmlFor="studentName">Your Name</Label>
                <Input
                  id="studentName"
                  value={studentName}
                  onChange={(e) => setStudentName(e.target.value)}
                  placeholder="Enter your full name"
                />
              </div>

              <Button
                onClick={handleStartQuiz}
                disabled={!studentName.trim()}
                className="w-full"
                size="lg"
              >
                Start Quiz
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // Quiz interface (placeholder for now)
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-4xl">
        <Card>
          <CardHeader>
            <CardTitle>Quiz in Progress</CardTitle>
            <p className="text-gray-600">Student: {studentName}</p>
          </CardHeader>
          <CardContent className="text-center py-12">
            <FileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold mb-2">Quiz Interface Coming Soon</h3>
            <p className="text-gray-600 mb-6">
              The interactive quiz interface will be implemented in the next phase.
            </p>
            <Button onClick={() => setHasStarted(false)} variant="outline">
              Back to Quiz Info
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
