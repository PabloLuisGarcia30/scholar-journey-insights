
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LearningStyleCircle } from "@/components/LearningStyleCircle";
import { LearningStyleBySubject } from "@/components/LearningStyleBySubject";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";

interface LearnerProfileDisplayProps {
  studentId: string;
  onBack: () => void;
}

// Mock learning style data - in a real app, this would come from the database
const getLearningStyles = (studentName: string) => {
  const profiles = {
    "Pablo Luis Garcia": [
      { type: "Visual Learner", strength: 85, color: "hsl(221, 83%, 53%)" },
      { type: "Logical Learner", strength: 78, color: "hsl(262, 83%, 58%)" },
      { type: "Reading/Writing", strength: 72, color: "hsl(142, 76%, 36%)" },
      { type: "Kinaesthetic", strength: 45, color: "hsl(25, 95%, 53%)" },
      { type: "Auditory Learner", strength: 38, color: "hsl(0, 84%, 60%)" },
      { type: "Social Learner", strength: 65, color: "hsl(280, 81%, 60%)" },
      { type: "Solitary Learner", strength: 82, color: "hsl(45, 84%, 55%)" },
    ],
    default: [
      { type: "Visual Learner", strength: 70, color: "hsl(221, 83%, 53%)" },
      { type: "Auditory Learner", strength: 60, color: "hsl(0, 84%, 60%)" },
      { type: "Reading/Writing", strength: 75, color: "hsl(142, 76%, 36%)" },
      { type: "Kinaesthetic", strength: 55, color: "hsl(25, 95%, 53%)" },
      { type: "Logical Learner", strength: 65, color: "hsl(262, 83%, 58%)" },
      { type: "Social Learner", strength: 80, color: "hsl(280, 81%, 60%)" },
      { type: "Solitary Learner", strength: 45, color: "hsl(45, 84%, 55%)" },
    ]
  };
  
  return profiles[studentName as keyof typeof profiles] || profiles.default;
};

export function LearnerProfileDisplay({ studentId, onBack }: LearnerProfileDisplayProps) {
  const { student, studentLoading, enrolledClasses } = useStudentProfileData({ studentId });

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Loading student profile...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-muted-foreground">Student not found</div>
      </div>
    );
  }

  const learningStyles = getLearningStyles(student.name);
  const dominantStyle = learningStyles.reduce((prev, current) => 
    (prev.strength > current.strength) ? prev : current
  );

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-6"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Directory
          </Button>
          
          <Card>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg font-semibold bg-primary text-primary-foreground">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl">{student.name}</CardTitle>
                  <p className="text-muted-foreground">{student.email || 'No email available'}</p>
                  <div className="flex gap-2 mt-2">
                    {student.year && (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        {student.year}
                      </span>
                    )}
                    {student.major && (
                      <span className="px-2 py-1 bg-secondary text-secondary-foreground rounded-full text-sm">
                        {student.major}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </CardHeader>
          </Card>
        </div>

        {/* Dominant Learning Style */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Dominant Learning Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-secondary rounded-lg">
              <div 
                className="w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-lg"
                style={{ backgroundColor: dominantStyle.color }}
              >
                {dominantStyle.strength}%
              </div>
              <div>
                <h3 className="text-lg font-semibold">{dominantStyle.type}</h3>
                <p className="text-muted-foreground">Primary learning preference</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Overall Learning Styles Grid */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Overall Learning Style Profile</CardTitle>
            <p className="text-muted-foreground">General learning preferences across all subjects</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {learningStyles.map((style, index) => (
                <LearningStyleCircle
                  key={index}
                  type={style.type}
                  strength={style.strength}
                  color={style.color}
                />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* NEW: Learning Style Profile per Subject */}
        <LearningStyleBySubject 
          studentName={student.name}
          enrolledClasses={enrolledClasses}
        />
      </div>
    </div>
  );
}
