
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
      "Reading/Writing Learner": "Learns best through reading and written materials",
      "Kinaesthetic Learner": "Learns best through hands-on activities and movement",
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

  return (
    <Card 
      className="transition-all duration-300 hover:shadow-lg cursor-pointer border-0 bg-white/70 backdrop-blur-sm"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-6 text-center">
        {/* Circular Progress */}
        <div className="relative w-24 h-24 mx-auto mb-4">
          <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 100 100">
            {/* Background circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              className="text-gray-200"
            />
            {/* Progress circle */}
            <circle
              cx="50"
              cy="50"
              r="40"
              stroke="currentColor"
              strokeWidth="8"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 40}`}
              strokeDashoffset={`${2 * Math.PI * 40 * (1 - strength / 100)}`}
              className={color.replace('bg-', 'text-')}
              strokeLinecap="round"
              style={{
                transition: 'stroke-dashoffset 0.5s ease-in-out',
              }}
            />
          </svg>
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-gray-800">{strength}%</span>
          </div>
        </div>

        {/* Learning Style Info */}
        <h3 className="font-semibold text-gray-900 mb-2 text-sm leading-tight">
          {type}
        </h3>
        
        <div className={`text-xs font-medium mb-2 ${getIntensityColor(strength)}`}>
          {getIntensity(strength)}
        </div>

        {/* Description on hover */}
        <div className={`transition-all duration-300 overflow-hidden ${
          isHovered ? 'max-h-20 opacity-100' : 'max-h-0 opacity-0'
        }`}>
          <p className="text-xs text-gray-600 leading-tight">
            {getDescription(type)}
          </p>
        </div>

        {/* Colored indicator dot */}
        <div className={`w-3 h-3 ${color} rounded-full mx-auto mt-2 ${
          isHovered ? 'scale-125' : 'scale-100'
        } transition-transform duration-200`} />
      </CardContent>
    </Card>
  );
}
