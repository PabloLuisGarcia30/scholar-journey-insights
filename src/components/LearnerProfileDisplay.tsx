
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { LearningStyleCircle } from "@/components/LearningStyleCircle";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";

interface LearnerProfileDisplayProps {
  studentId: string;
  onBack: () => void;
}

// Mock learning style data - in a real app, this would come from the database
const getLearningStyles = (studentName: string) => {
  // For demo purposes, return different profiles for different students
  const profiles = {
    "Pablo Luis Garcia": [
      { type: "Visual Learner", strength: 85, color: "bg-blue-500" },
      { type: "Logical Learner", strength: 78, color: "bg-purple-500" },
      { type: "Reading/Writing Learner", strength: 72, color: "bg-green-500" },
      { type: "Kinaesthetic Learner", strength: 45, color: "bg-orange-500" },
      { type: "Auditory Learner", strength: 38, color: "bg-red-500" },
      { type: "Social Learner", strength: 65, color: "bg-pink-500" },
      { type: "Solitary Learner", strength: 82, color: "bg-indigo-500" },
    ],
    default: [
      { type: "Visual Learner", strength: 70, color: "bg-blue-500" },
      { type: "Auditory Learner", strength: 60, color: "bg-red-500" },
      { type: "Reading/Writing Learner", strength: 75, color: "bg-green-500" },
      { type: "Kinaesthetic Learner", strength: 55, color: "bg-orange-500" },
      { type: "Logical Learner", strength: 65, color: "bg-purple-500" },
      { type: "Social Learner", strength: 80, color: "bg-pink-500" },
      { type: "Solitary Learner", strength: 45, color: "bg-indigo-500" },
    ]
  };
  
  return profiles[studentName as keyof typeof profiles] || profiles.default;
};

export function LearnerProfileDisplay({ studentId, onBack }: LearnerProfileDisplayProps) {
  const { student, studentLoading } = useStudentProfileData({ studentId });

  if (studentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Loading student profile...</div>
      </div>
    );
  }

  if (!student) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-600">Student not found</div>
      </div>
    );
  }

  const learningStyles = getLearningStyles(student.name);
  const dominantStyle = learningStyles.reduce((prev, current) => 
    (prev.strength > current.strength) ? prev : current
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <Button 
            variant="ghost" 
            onClick={onBack}
            className="mb-4 hover:bg-white/50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Student Directory
          </Button>
          
          <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarFallback className="text-lg font-semibold bg-gradient-to-br from-blue-500 to-purple-600 text-white">
                    {student.name.split(' ').map(n => n[0]).join('')}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <CardTitle className="text-2xl text-gray-900">{student.name}</CardTitle>
                  <p className="text-gray-600">{student.email || 'No email available'}</p>
                  <div className="flex gap-2 mt-2">
                    {student.year && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                        {student.year}
                      </span>
                    )}
                    {student.major && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
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
        <Card className="mb-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Dominant Learning Style</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg">
              <div className={`w-12 h-12 ${dominantStyle.color} rounded-full flex items-center justify-center`}>
                <span className="text-white font-bold text-lg">{dominantStyle.strength}%</span>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">{dominantStyle.type}</h3>
                <p className="text-gray-600">Primary learning preference</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Learning Styles Grid */}
        <Card className="bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Complete Learning Style Profile</CardTitle>
            <p className="text-gray-600">Understanding how this student learns best</p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
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

        {/* Learning Recommendations */}
        <Card className="mt-8 bg-white/80 backdrop-blur-sm border-0 shadow-lg">
          <CardHeader>
            <CardTitle className="text-xl text-gray-900">Learning Recommendations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-800 mb-2">Strengths</h4>
                <ul className="text-green-700 space-y-1">
                  {learningStyles
                    .filter(style => style.strength >= 70)
                    .map((style, index) => (
                      <li key={index}>• {style.type}</li>
                    ))}
                </ul>
              </div>
              <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
                <h4 className="font-semibold text-orange-800 mb-2">Growth Areas</h4>
                <ul className="text-orange-700 space-y-1">
                  {learningStyles
                    .filter(style => style.strength < 60)
                    .map((style, index) => (
                      <li key={index}>• {style.type}</li>
                    ))}
                </ul>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
