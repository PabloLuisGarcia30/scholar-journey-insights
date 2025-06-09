
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LearningStyleCircle } from "@/components/LearningStyleCircle";
import { ActiveClass } from "@/services/examService";

interface LearningStyleBySubjectProps {
  studentName: string;
  enrolledClasses: ActiveClass[];
  currentSubject?: string;
}

// Mock subject-specific learning style data
const getSubjectSpecificLearningStyles = (studentName: string, subject: string) => {
  const profiles = {
    "Pablo Luis Garcia": {
      "Math": [
        { type: "Logical Learner", strength: 88, color: "hsl(262, 83%, 58%)" },
        { type: "Visual Learner", strength: 80, color: "hsl(221, 83%, 53%)" },
        { type: "Solitary Learner", strength: 85, color: "hsl(45, 84%, 55%)" },
        { type: "Reading/Writing", strength: 70, color: "hsl(142, 76%, 36%)" },
        { type: "Kinaesthetic", strength: 40, color: "hsl(25, 95%, 53%)" },
        { type: "Auditory Learner", strength: 35, color: "hsl(0, 84%, 60%)" },
        { type: "Social Learner", strength: 55, color: "hsl(280, 81%, 60%)" },
      ],
      "Science": [
        { type: "Kinaesthetic", strength: 85, color: "hsl(25, 95%, 53%)" },
        { type: "Visual Learner", strength: 82, color: "hsl(221, 83%, 53%)" },
        { type: "Social Learner", strength: 75, color: "hsl(280, 81%, 60%)" },
        { type: "Logical Learner", strength: 68, color: "hsl(262, 83%, 58%)" },
        { type: "Reading/Writing", strength: 65, color: "hsl(142, 76%, 36%)" },
        { type: "Auditory Learner", strength: 60, color: "hsl(0, 84%, 60%)" },
        { type: "Solitary Learner", strength: 45, color: "hsl(45, 84%, 55%)" },
      ]
    },
    default: {
      "Math": [
        { type: "Logical Learner", strength: 75, color: "hsl(262, 83%, 58%)" },
        { type: "Visual Learner", strength: 70, color: "hsl(221, 83%, 53%)" },
        { type: "Reading/Writing", strength: 65, color: "hsl(142, 76%, 36%)" },
        { type: "Solitary Learner", strength: 60, color: "hsl(45, 84%, 55%)" },
        { type: "Auditory Learner", strength: 50, color: "hsl(0, 84%, 60%)" },
        { type: "Kinaesthetic", strength: 45, color: "hsl(25, 95%, 53%)" },
        { type: "Social Learner", strength: 40, color: "hsl(280, 81%, 60%)" },
      ],
      "Science": [
        { type: "Kinaesthetic", strength: 80, color: "hsl(25, 95%, 53%)" },
        { type: "Visual Learner", strength: 75, color: "hsl(221, 83%, 53%)" },
        { type: "Social Learner", strength: 70, color: "hsl(280, 81%, 60%)" },
        { type: "Auditory Learner", strength: 65, color: "hsl(0, 84%, 60%)" },
        { type: "Reading/Writing", strength: 60, color: "hsl(142, 76%, 36%)" },
        { type: "Logical Learner", strength: 55, color: "hsl(262, 83%, 58%)" },
        { type: "Solitary Learner", strength: 50, color: "hsl(45, 84%, 55%)" },
      ]
    }
  };
  
  const studentProfiles = profiles[studentName as keyof typeof profiles] || profiles.default;
  return studentProfiles[subject as keyof typeof studentProfiles] || profiles.default.Math;
};

export function LearningStyleBySubject({ studentName, enrolledClasses, currentSubject }: LearningStyleBySubjectProps) {
  if (!enrolledClasses || enrolledClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>
            {currentSubject ? `Learning Style Profile for ${currentSubject}` : "Learning Style Profile per Subject"}
          </CardTitle>
          <p className="text-muted-foreground">No enrolled classes found for this student</p>
        </CardHeader>
      </Card>
    );
  }

  // Filter classes by current subject if provided
  const filteredClasses = currentSubject 
    ? enrolledClasses.filter(classItem => classItem.subject === currentSubject)
    : enrolledClasses;

  if (currentSubject && filteredClasses.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Style Profile for {currentSubject}</CardTitle>
          <p className="text-muted-foreground">No {currentSubject} classes found for this student</p>
        </CardHeader>
      </Card>
    );
  }

  // Group classes by subject
  const subjectGroups = filteredClasses.reduce((acc, classItem) => {
    const subject = classItem.subject;
    if (!acc[subject]) {
      acc[subject] = [];
    }
    acc[subject].push(classItem);
    return acc;
  }, {} as Record<string, ActiveClass[]>);

  // For single subject view (when currentSubject is provided), show simplified layout
  if (currentSubject && Object.keys(subjectGroups).length === 1) {
    const subject = currentSubject;
    const classes = subjectGroups[subject];
    const learningStyles = getSubjectSpecificLearningStyles(studentName, subject);
    const dominantStyle = learningStyles.reduce((prev, current) => 
      (prev.strength > current.strength) ? prev : current
    );

    return (
      <Card>
        <CardHeader>
          <CardTitle>Learning Style Profile for {subject}</CardTitle>
          <div className="flex items-center justify-between">
            <p className="text-muted-foreground">
              {classes.map(c => `${c.name} (${c.grade})`).join(', ')}
            </p>
            <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
              <div 
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: dominantStyle.color }}
              />
              <span className="text-sm font-medium text-secondary-foreground">
                Strongest: {dominantStyle.type} ({dominantStyle.strength}%)
              </span>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {learningStyles.map((style, index) => (
              <LearningStyleCircle
                key={`${subject}-${index}`}
                type={style.type}
                strength={style.strength}
                color={style.color}
              />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Default multi-subject view (for backward compatibility)
  return (
    <Card>
      <CardHeader>
        <CardTitle>Learning Style Profile per Subject</CardTitle>
        <p className="text-muted-foreground">
          Learning preferences tailored to specific subject areas
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {Object.entries(subjectGroups).map(([subject, classes]) => {
            const learningStyles = getSubjectSpecificLearningStyles(studentName, subject);
            const dominantStyle = learningStyles.reduce((prev, current) => 
              (prev.strength > current.strength) ? prev : current
            );

            return (
              <div key={subject} className="space-y-4">
                {/* Subject Header */}
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-semibold text-card-foreground">{subject}</h3>
                    <p className="text-sm text-muted-foreground">
                      {classes.map(c => `${c.name} (${c.grade})`).join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 px-3 py-1 bg-secondary rounded-full">
                    <div 
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: dominantStyle.color }}
                    />
                    <span className="text-sm font-medium text-secondary-foreground">
                      {dominantStyle.type} ({dominantStyle.strength}%)
                    </span>
                  </div>
                </div>

                {/* Learning Styles Grid */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {learningStyles.map((style, index) => (
                    <LearningStyleCircle
                      key={`${subject}-${index}`}
                      type={style.type}
                      strength={style.strength}
                      color={style.color}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
