
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StudentSearch } from "@/components/StudentSearch";
import { LearnerProfileDisplay } from "@/components/LearnerProfileDisplay";
import { useAuth } from "@/contexts/AuthContext";

const StudentLearnerProfile = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);
  const { user, profile } = useAuth();

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudent(studentId);
  };

  const handleBack = () => {
    setSelectedStudent(null);
  };

  // If user is not authenticated, show login prompt
  if (!user) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-2xl mx-auto text-center py-12">
          <h1 className="text-3xl font-bold text-foreground mb-4">Authentication Required</h1>
          <p className="text-muted-foreground mb-6">
            Please log in to view learner profiles.
          </p>
          <Button asChild>
            <Link to="/auth">Log In</Link>
          </Button>
        </div>
      </div>
    );
  }

  // If user is a student, show their own profile directly
  if (profile?.role === 'student') {
    return (
      <div className="min-h-screen bg-background">
        <LearnerProfileDisplay 
          studentId={user.id} 
          onBack={() => window.history.back()} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {selectedStudent ? (
        <LearnerProfileDisplay 
          studentId={selectedStudent} 
          onBack={handleBack} 
        />
      ) : (
        <div className="p-6">
          <div className="mb-8">
            <Button 
              variant="ghost" 
              asChild
              className="mb-6"
            >
              <Link to="/">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Homepage
              </Link>
            </Button>
            
            <h1 className="text-3xl font-bold text-foreground mb-2">Student Learner Profiles</h1>
            <p className="text-muted-foreground">
              {profile?.role === 'teacher' 
                ? 'Select a student to view their learning style profile'
                : 'View authenticated student learning profiles'
              }
            </p>
          </div>
          
          {profile?.role === 'teacher' ? (
            <StudentSearch onSelectStudent={handleSelectStudent} />
          ) : (
            <div className="text-center py-12">
              <p className="text-muted-foreground">
                You can only view your own profile as a student.
              </p>
              <Button 
                onClick={() => setSelectedStudent(user.id)} 
                className="mt-4"
              >
                View My Profile
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default StudentLearnerProfile;
