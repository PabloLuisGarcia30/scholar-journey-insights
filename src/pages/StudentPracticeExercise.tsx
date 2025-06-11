import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Target, BookOpen, Loader2, Zap } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useEnhancedPracticeTestGeneration } from "@/hooks/useEnhancedPracticeTestGeneration";
import { PracticeExerciseRunner } from "@/components/PracticeExerciseRunner";
import { toast } from "sonner";

const StudentPracticeExercise = () => {
  const navigate = useNavigate();
  const { classId, skillName } = useParams();
  const { profile } = useAuth();
  const [exerciseData, setExerciseData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const decodedSkillName = decodeURIComponent(skillName || '');
  
  // Get student and class data
  const { 
    classData,
    classLoading,
    enrolledClasses,
    student
  } = useStudentProfileData({ 
    studentId: profile?.id || '', 
    classId: classId || '',
    className: ''
  });

  // Find the class info
  const currentClass = enrolledClasses.find(cls => cls.id === classId) || classData;

  // Practice test generation hook
  const { generateSingleTest, isLoading: isGenerationLoading, error } = useEnhancedPracticeTestGeneration({
    enableAutoRecovery: true,
    showDetailedErrors: false,
    maxRetryAttempts: 2
  });

  useEffect(() => {
    if (currentClass && decodedSkillName && !exerciseData) {
      generatePracticeExercise();
    }
  }, [currentClass, decodedSkillName]);

  const generatePracticeExercise = async () => {
    if (!currentClass || !decodedSkillName) return;
    
    setIsGenerating(true);
    
    try {
      const practiceTest = await generateSingleTest({
        studentName: profile?.full_name || student?.name || 'Student',
        skillName: decodedSkillName,
        className: currentClass.name,
        subject: currentClass.subject,
        grade: currentClass.grade,
        questionCount: 5
      });

      if (practiceTest) {
        // Convert practice test to exercise format
        const exerciseFormatted = {
          title: `${decodedSkillName} Practice Exercise`,
          description: `Targeted practice for ${decodedSkillName} in ${currentClass.name}`,
          questions: practiceTest.questions.map((q, index) => ({
            id: q.id || `q_${index}`,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            acceptableAnswers: q.acceptableAnswers,
            keywords: q.keywords,
            points: q.points || 1,
            targetSkill: decodedSkillName
          })),
          totalPoints: practiceTest.questions.reduce((sum, q) => sum + (q.points || 1), 0),
          estimatedTime: Math.max(5, practiceTest.questions.length * 2),
          exerciseId: `exercise_${Date.now()}_${decodedSkillName.replace(/\s+/g, '_')}`
        };
        
        setExerciseData(exerciseFormatted);
      } else {
        toast.error('Failed to generate practice exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error generating practice exercise:', error);
      toast.error('Failed to generate practice exercise. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExerciseComplete = (results) => {
    console.log('Exercise completed:', results);
    toast.success(`Exercise completed! You scored ${Math.round(results.percentageScore)}%`);
    
    // Navigate back to class scores after a brief delay
    setTimeout(() => {
      navigate(`/student-dashboard/class/${classId}`);
    }, 2000);
  };

  const handleExitExercise = () => {
    navigate(`/student-dashboard/class/${classId}`);
  };

  if (classLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-lg text-slate-600 ml-4">Loading class data...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!currentClass) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Class Not Found</h2>
            <p className="text-gray-600 mb-6">The requested class could not be found.</p>
            <Button onClick={() => navigate('/student-dashboard/home-learner')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show exercise runner if exercise is ready
  if (exerciseData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <PracticeExerciseRunner
          exerciseData={exerciseData}
          onComplete={handleExerciseComplete}
          onExit={handleExitExercise}
          showTimer={false}
        />
      </div>
    );
  }

  // Show loading/generation state
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Button 
            variant="outline" 
            onClick={() => navigate(`/student-dashboard/class/${classId}`)}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Class
          </Button>
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Practice Exercise</h1>
            <p className="text-gray-600">{currentClass.name} - {decodedSkillName}</p>
          </div>
          <div></div>
        </div>

        {/* Generation Status Card */}
        <Card className="max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-center">
              {isGenerating || isGenerationLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                  Generating Your Practice Exercise
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Getting Ready
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {isGenerating || isGenerationLoading ? (
              <>
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                  </div>
                  <p className="text-gray-600">
                    Creating personalized questions for <strong>{decodedSkillName}</strong>...
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>5 Questions</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>Mixed Difficulty</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <Zap className="h-4 w-4" />
                      <span>10-15 min</span>
                    </div>
                  </div>
                </div>
              </>
            ) : error ? (
              <>
                <p className="text-red-600 mb-4">
                  Failed to generate practice exercise: {error}
                </p>
                <Button onClick={generatePracticeExercise} className="bg-blue-600 hover:bg-blue-700">
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Preparing your practice exercise for <strong>{decodedSkillName}</strong>
                </p>
                <Button onClick={generatePracticeExercise} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Practice Exercise
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        {/* Skill Context Info */}
        <Card className="max-w-2xl mx-auto mt-6">
          <CardHeader>
            <CardTitle className="text-lg">About This Practice Session</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Skill Focus:</span>
                <span className="font-medium">{decodedSkillName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Class:</span>
                <span className="font-medium">{currentClass.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Subject:</span>
                <span className="font-medium">{currentClass.subject}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grade Level:</span>
                <span className="font-medium">{currentClass.grade}</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentPracticeExercise;
