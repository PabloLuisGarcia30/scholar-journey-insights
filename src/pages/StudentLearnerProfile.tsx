
import { useState } from "react";
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
