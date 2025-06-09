
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

interface LearningStyleProgressBarProps {
  type: string;
  strength: number;
  color: string;
}

export function LearningStyleProgressBar({ type, strength, color }: LearningStyleProgressBarProps) {
  const [isHovered, setIsHovered] = useState(false);
  
  const getDescription = (type: string) => {
    const descriptions = {
      "Visual Learner": "Learns best through images, diagrams, and visual aids",
      "Auditory Learner": "Learns best through listening and verbal instruction",
      "Reading/Writing": "Learns best through reading and written materials",
      "Kinaesthetic": "Learns best through hands-on activities and movement",
      "Logical Learner": "Learns best through reasoning and systematic approaches",
      "Social Learner": "Learns best in group settings and through collaboration",
      "Solitary Learner": "Learns best through individual study and reflection"
    };
    return descriptions[type as keyof typeof descriptions] || "Individual learning preference";
  };

  const getIntensity = (strength: number) => {
    if (strength >= 80) return "Very Strong";
    if (strength >= 70) return "Strong";
    if (strength >= 60) return "Moderate";
    if (strength >= 50) return "Developing";
    return "Emerging";
  };

  const getIntensityColor = (strength: number) => {
    if (strength >= 80) return "text-foreground font-semibold";
    if (strength >= 70) return "text-foreground";
    if (strength >= 60) return "text-muted-foreground";
    if (strength >= 50) return "text-muted-foreground";
    return "text-muted-foreground";
  };

  const getProgressColor = (strength: number) => {
    if (strength >= 80) return "hsl(142, 76%, 36%)"; // green
    if (strength >= 70) return "hsl(221, 83%, 53%)"; // blue
    if (strength >= 60) return "hsl(45, 84%, 55%)"; // yellow
    if (strength >= 50) return "hsl(25, 95%, 53%)"; // orange
    return "hsl(0, 84%, 60%)"; // red
  };

  return (
    <Card 
      className="transition-all duration-300 hover:shadow-lg cursor-pointer border border-border hover:border-primary/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4">
        {/* Header with type and percentage */}
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-semibold text-foreground text-sm leading-tight">
            {type}
          </h3>
          <span className="text-lg font-bold text-foreground">
            {strength}%
          </span>
        </div>

        {/* Progress bar */}
        <div className="mb-3">
          <Progress 
            value={strength} 
            className="h-3 bg-secondary"
            style={{
              '--progress-foreground': getProgressColor(strength)
            } as React.CSSProperties}
          />
        </div>

        {/* Intensity level */}
        <div className={`text-xs font-medium mb-2 ${getIntensityColor(strength)}`}>
          {getIntensity(strength)}
        </div>

        {/* Description on hover */}
        <div className={`transition-all duration-300 overflow-hidden ${
          isHovered ? 'max-h-16 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <p className="text-xs text-muted-foreground leading-tight">
            {getDescription(type)}
          </p>
        </div>

        {/* Colored indicator dot */}
        <div 
          className={`w-2 h-2 rounded-full mx-auto mt-2 transition-transform duration-200 ${
            isHovered ? 'scale-125' : 'scale-100'
          }`}
          style={{ backgroundColor: color }}
        />
      </CardContent>
    </Card>
  );
}
