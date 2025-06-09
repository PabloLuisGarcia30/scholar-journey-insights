
import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";

interface LearningStyleCircleProps {
  type: string;
  strength: number;
  color: string;
}

export function LearningStyleCircle({ type, strength, color }: LearningStyleCircleProps) {
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
    if (strength >= 80) return "text-green-600";
    if (strength >= 70) return "text-blue-600";
    if (strength >= 60) return "text-yellow-600";
    if (strength >= 50) return "text-orange-600";
    return "text-red-600";
  };

  const radius = 32;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (strength / 100) * circumference;

  return (
    <Card 
      className="transition-all duration-300 hover:shadow-lg cursor-pointer border border-border hover:border-primary/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 text-center">
        {/* Circular Progress */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          <svg className="w-20 h-20 transform -rotate-90" viewBox="0 0 80 80">
            {/* Background circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-muted"
            />
            {/* Progress circle */}
            <circle
              cx="40"
              cy="40"
              r={radius}
              stroke={color}
              strokeWidth="6"
              fill="transparent"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              className="transition-all duration-500 ease-in-out"
            />
          </svg>
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-foreground">{strength}%</span>
          </div>
        </div>

        {/* Learning Style Info */}
        <h3 className="font-semibold text-foreground mb-1 text-sm leading-tight">
          {type}
        </h3>
        
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
