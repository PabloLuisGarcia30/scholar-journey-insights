
import { useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { StudentSearch } from "@/components/StudentSearch";
import { LearnerProfileDisplay } from "@/components/LearnerProfileDisplay";

const StudentLearnerProfile = () => {
  const [selectedStudent, setSelectedStudent] = useState<string | null>(null);

  const handleSelectStudent = (studentId: string) => {
    setSelectedStudent(studentId);
  };

  const handleBack = () => {
    setSelectedStudent(null);
  };

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
            <p className="text-muted-foreground">Select a student to view their learning style profile</p>
          </div>
          <StudentSearch onSelectStudent={handleSelectStudent} />
        </div>
      )}
    </div>
  );
};

export default StudentLearnerProfile;
