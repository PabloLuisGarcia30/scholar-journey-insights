

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, Target, BookOpen, Loader2, Zap, TrendingUp } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthenticatedStudentData } from "@/hooks/useAuthenticatedStudentData";
import { useStudentPracticeGeneration } from "@/hooks/useStudentPracticeGeneration";
import { usePracticeExerciseCompletion } from "@/hooks/usePracticeExerciseCompletion";
import { PracticeExerciseRunner } from "@/components/PracticeExerciseRunner";
import { ExerciseCompletionSummary } from "@/components/ExerciseCompletionSummary";
import { PracticeExerciseReview } from "@/components/PracticeExerciseReview";
import { StudentPracticeService } from "@/services/studentPracticeService";
import { PracticeExerciseGenerationService } from "@/services/practiceExerciseGenerationService";
import { PracticeAnswerKeyService } from "@/services/practiceAnswerKeyService";
import { toast } from "sonner";

const StudentPracticeExercise = () => {
  const navigate = useNavigate();
  const { classId, skillName } = useParams();
  const [searchParams] = useSearchParams();
  const { profile, user } = useAuth();
  const [exerciseData, setExerciseData] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentSkillScore, setCurrentSkillScore] = useState(0);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [skillImprovements, setSkillImprovements] = useState([]);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [exerciseResults, setExerciseResults] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [hasAnswerKey, setHasAnswerKey] = useState(false);
  const [studentAnswers, setStudentAnswers] = useState({});
  
  const decodedSkillName = decodeURIComponent(skillName || '');
  
  // Get question count from URL parameters, default to 4
  const questionCount = parseInt(searchParams.get('questions') || '4');
  
  // Use the new authenticated student data hook
  const { 
    classData,
    classLoading,
    enrolledClasses,
    contentSkillScores,
    subjectSkillScores,
    isAuthenticated,
    authenticatedUserId
  } = useAuthenticatedStudentData({ classId: classId || '' });

  // Find the class info
  const currentClass = enrolledClasses.find(cls => cls.id === classId) || classData;

  // Student practice generation hook
  const { generatePracticeExercise, isLoading: isGenerationLoading, error } = useStudentPracticeGeneration({
    enableAutoRecovery: true,
    showDetailedErrors: false,
    maxRetryAttempts: 2
  });

  // Practice exercise completion hook for skill score updates (removed studentId parameter)
  const { completeExercise, isCompleting, isUpdatingSkills } = usePracticeExerciseCompletion({
    onSkillUpdated: (skillUpdates) => {
      setSkillImprovements(skillUpdates);
    }
  });

  // Find current skill score from authenticated user data
  useEffect(() => {
    if ((contentSkillScores.length > 0 || subjectSkillScores.length > 0) && decodedSkillName) {
      const contentSkill = contentSkillScores.find(skill => skill.skill_name === decodedSkillName);
      const subjectSkill = subjectSkillScores.find(skill => skill.skill_name === decodedSkillName);
      
      const skillScore = contentSkill?.score || subjectSkill?.score || 50; // Default to 50 if no score found
      setCurrentSkillScore(skillScore);
      console.log('🎯 Current skill score for', decodedSkillName, ':', skillScore);
    }
  }, [contentSkillScores, subjectSkillScores, decodedSkillName]);

  useEffect(() => {
    if (currentClass && decodedSkillName && currentSkillScore > 0 && !exerciseData && isAuthenticated) {
      generateStudentPracticeExercise();
    }
  }, [currentClass, decodedSkillName, currentSkillScore, isAuthenticated]);

  const generateStudentPracticeExercise = async () => {
    if (!currentClass || !decodedSkillName || !authenticatedUserId) {
      console.error('Missing required data for practice exercise generation');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      console.log('🔐 Generating practice exercise for authenticated user:', authenticatedUserId);
      
      // Generate a proper UUID for the exercise
      const exerciseId = PracticeExerciseGenerationService.generateExerciseId();
      
      const practiceExercise = await generatePracticeExercise({
        studentId: authenticatedUserId, // Use authenticated user ID
        studentName: profile?.full_name || user?.email || 'Student',
        skillName: decodedSkillName,
        currentSkillScore: currentSkillScore,
        classId: currentClass.id,
        className: currentClass.name,
        subject: currentClass.subject,
        grade: currentClass.grade,
        questionCount: questionCount
      });

      if (practiceExercise) {
        // Store session ID for later use
        setSessionId(practiceExercise.metadata.sessionId);
        
        // Determine skill type from current scores
        const isContentSkill = contentSkillScores.some(skill => skill.skill_name === decodedSkillName);
        const skillType = isContentSkill ? 'content' : 'subject';
        
        // Convert to exercise runner format with proper UUID
        const exerciseFormatted = {
          title: practiceExercise.title,
          description: practiceExercise.description,
          studentGuidance: practiceExercise.studentGuidance,
          questions: practiceExercise.questions.map((q, index) => ({
            id: q.id || `q_${index}`,
            type: q.type,
            question: q.question,
            options: q.options,
            correctAnswer: q.correctAnswer,
            acceptableAnswers: q.acceptableAnswers,
            keywords: q.keywords,
            points: q.points || 1,
            targetSkill: q.targetSkill,
            explanation: q.explanation,
            hint: q.hint,
            difficultyLevel: q.difficultyLevel
          })),
          totalPoints: practiceExercise.totalPoints,
          estimatedTime: practiceExercise.estimatedTime,
          adaptiveDifficulty: practiceExercise.adaptiveDifficulty,
          metadata: practiceExercise.metadata,
          skillType: skillType,
          skillMetadata: {
            skillType: skillType,
            currentScore: currentSkillScore,
            targetImprovement: practiceExercise.metadata.targetImprovement
          },
          exerciseId: exerciseId // Use proper UUID
        };
        
        // Process and save answer key
        const processedExerciseData = PracticeExerciseGenerationService.processGeneratedExercise(
          exerciseFormatted, 
          exerciseId
        );
        
        await PracticeExerciseGenerationService.saveAnswerKeyForExercise(processedExerciseData);
        
        setExerciseData(exerciseFormatted);
        setHasAnswerKey(true);
        console.log('✅ Practice exercise generated successfully for authenticated user');
      } else {
        toast.error('Failed to generate practice exercise. Please try again.');
      }
    } catch (error) {
      console.error('Error generating student practice exercise:', error);
      toast.error('Failed to generate practice exercise. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleExerciseComplete = async (results) => {
    console.log('🔐 Student practice exercise completed for authenticated user:', authenticatedUserId, results);
    
    // Store answers and results for review
    setStudentAnswers(results.answers || {});
    setExerciseResults(results);
    setExerciseCompleted(true);
    
    const improvementShown = results.percentageScore > currentSkillScore 
      ? results.percentageScore - currentSkillScore 
      : 0;
    
    // Update session score first
    if (sessionId && authenticatedUserId) {
      try {
        await StudentPracticeService.updatePracticeSessionScore(
          sessionId, 
          results.percentageScore, 
          improvementShown
        );
        
        // Update practice analytics for authenticated user
        await StudentPracticeService.updatePracticeAnalyticsAfterCompletion(
          authenticatedUserId,
          decodedSkillName,
          results.percentageScore
        );
      } catch (error) {
        console.error('Error updating practice session:', error);
      }
    }

    // Process skill score updates using the completion hook
    if (exerciseData && authenticatedUserId) {
      try {
        await completeExercise({
          exerciseId: exerciseData.exerciseId,
          score: results.percentageScore,
          skillName: decodedSkillName,
          exerciseData: exerciseData
        });
        
        // Show improvement message with skill score updates
        const improvementMsg = improvementShown > 0 
          ? ` (${Math.round(improvementShown)}% improvement!)` 
          : '';
        
        toast.success(`Exercise completed! You scored ${Math.round(results.percentageScore)}%${improvementMsg}`);
        
      } catch (error) {
        console.error('Error processing skill updates:', error);
        toast.success(`Exercise completed! You scored ${Math.round(results.percentageScore)}%${improvementShown > 0 ? ` (${Math.round(improvementShown)}% improvement!)` : ''}`);
      }
    }
  };

  const handleShowReview = () => {
    setShowReview(true);
  };

  const handleBackFromReview = () => {
    setShowReview(false);
  };

  const handleContinue = () => {
    navigate(`/student-dashboard/class/${classId}`);
  };

  const handleExitExercise = () => {
    navigate(`/student-dashboard/class/${classId}`);
  };

  // Check authentication first
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Authentication Required</h2>
            <p className="text-gray-600 mb-6">Please log in to access practice exercises.</p>
            <Button onClick={() => navigate('/auth')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Go to Login
            </Button>
          </div>
        </div>
      </div>
    );
  }

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
            <p className="text-gray-600 mb-6">The requested class could not be found or you are not enrolled.</p>
            <Button onClick={() => navigate('/student-dashboard/home-learner')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Show review component if requested
  if (showReview && exerciseData?.exerciseId && exerciseResults) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50/30">
        <PracticeExerciseReview
          exerciseId={exerciseData.exerciseId}
          studentAnswers={studentAnswers}
          exerciseScore={exerciseResults.percentageScore}
          onBack={handleBackFromReview}
        />
      </div>
    );
  }

  // Show completion summary if exercise is completed
  if (exerciseCompleted && exerciseResults) {
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
              <h1 className="text-3xl font-bold text-gray-900">Practice Complete</h1>
              <p className="text-gray-600">{currentClass.name} - {decodedSkillName}</p>
            </div>
            <div></div>
          </div>

          <ExerciseCompletionSummary
            exerciseScore={exerciseResults.percentageScore}
            totalQuestions={exerciseData?.questions?.length || 0}
            correctAnswers={exerciseResults.questionResults?.filter(q => q.isCorrect).length || 0}
            skillName={decodedSkillName}
            hasAnswerKey={hasAnswerKey}
            onShowReview={handleShowReview}
            onContinue={handleContinue}
          />
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
            <h1 className="text-3xl font-bold text-gray-900">Personalized Practice</h1>
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
                  Creating Your Personalized Practice
                </>
              ) : (
                <>
                  <Zap className="h-5 w-5 text-yellow-600" />
                  Ready to Practice
                </>
              )}
            </CardTitle>
            {(isGenerating || isGenerationLoading) && (
              <p className="text-sm text-gray-500 text-center mt-2">
                This will only take a few moments
              </p>
            )}
          </CardHeader>
          <CardContent className="text-center space-y-6">
            {isGenerating || isGenerationLoading ? (
              <>
                <div className="space-y-4">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div className="bg-blue-600 h-2 rounded-full animate-pulse" style={{ width: '75%' }}></div>
                  </div>
                  <p className="text-gray-600">
                    Creating <strong>{questionCount} adaptive questions</strong> for <strong>{decodedSkillName}</strong> based on your current skill level ({currentSkillScore}%)...
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-500">
                    <div className="flex items-center justify-center gap-2">
                      <Target className="h-4 w-4" />
                      <span>{questionCount} Questions</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      <span>Adaptive Difficulty</span>
                    </div>
                    <div className="flex items-center justify-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      <span>{Math.round(questionCount * 2.5)}-{Math.round(questionCount * 3)} min</span>
                    </div>
                  </div>
                </div>
              </>
            ) : error ? (
              <>
                <p className="text-red-600 mb-4">
                  Failed to generate practice exercise: {error}
                </p>
                <Button onClick={generateStudentPracticeExercise} className="bg-blue-600 hover:bg-blue-700">
                  Try Again
                </Button>
              </>
            ) : (
              <>
                <p className="text-gray-600 mb-4">
                  Ready to practice <strong>{decodedSkillName}</strong> with <strong>{questionCount} questions</strong>
                </p>
                <Button onClick={generateStudentPracticeExercise} className="bg-blue-600 hover:bg-blue-700">
                  <Zap className="h-4 w-4 mr-2" />
                  Start Personalized Practice
                </Button>
              </>
            )}

            {/* Show processing status for skill updates */}
            {(isCompleting || isUpdatingSkills) && (
              <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-center gap-2 text-blue-700">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm">
                    {isUpdatingSkills ? 'Updating your skill scores...' : 'Processing results...'}
                  </span>
                </div>
              </div>
            )}

            {/* Show skill improvements if available */}
            {skillImprovements.length > 0 && (
              <div className="mt-4 p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-800 mb-2">Skill Score Updates:</h4>
                <div className="space-y-1">
                  {skillImprovements.map((improvement, index) => (
                    <div key={index} className="text-sm text-green-700">
                      <span className="font-medium">{improvement.skillName}</span>
                      {improvement.updatedScore > improvement.currentScore ? (
                        <span className="text-green-600 ml-2">
                          {improvement.currentScore}% → {improvement.updatedScore}% 
                          (+{Math.round(improvement.updatedScore - improvement.currentScore)}%)
                        </span>
                      ) : (
                        <span className="text-gray-600 ml-2">
                          Score maintained at {improvement.updatedScore}%
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
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
                <span className="text-gray-600">User:</span>
                <span className="font-medium">{profile?.full_name || user?.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Skill Focus:</span>
                <span className="font-medium">{decodedSkillName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Questions:</span>
                <span className="font-medium">{questionCount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Estimated Time:</span>
                <span className="font-medium">{Math.round(questionCount * 2.5)}-{Math.round(questionCount * 3)} minutes</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Current Score:</span>
                <span className="font-medium">{currentSkillScore}%</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Target Improvement:</span>
                <span className="font-medium text-green-600">+10-15%</span>
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
