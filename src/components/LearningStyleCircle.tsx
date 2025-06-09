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
    if (strength >= 80) return "text-primary font-semibold";
    if (strength >= 70) return "text-primary font-medium";
    if (strength >= 60) return "text-secondary-foreground font-medium";
    if (strength >= 50) return "text-muted-foreground font-medium";
    return "text-muted-foreground";
  };

  const getGradientColors = (strength: number) => {
    if (strength >= 80) {
      // Very Strong: Vibrant green to emerald gradient
      return {
        color1: "#10b981", // emerald-500
        color2: "#059669", // emerald-600
        color3: "#047857"  // emerald-700
      };
    }
    if (strength >= 70) {
      // Strong: Blue to cyan gradient
      return {
        color1: "#3b82f6", // blue-500
        color2: "#2563eb", // blue-600
        color3: "#1d4ed8"  // blue-700
      };
    }
    if (strength >= 60) {
      // Moderate: Yellow to orange gradient
      return {
        color1: "#eab308", // yellow-500
        color2: "#f59e0b", // amber-500
        color3: "#d97706"  // amber-600
      };
    }
    if (strength >= 50) {
      // Developing: Orange to amber gradient
      return {
        color1: "#f97316", // orange-500
        color2: "#ea580c", // orange-600
        color3: "#dc2626"  // red-600
      };
    }
    // Emerging: Red to pink gradient
    return {
      color1: "#ef4444", // red-500
      color2: "#dc2626", // red-600
      color3: "#b91c1c"  // red-700
    };
  };

  // Create gradient ID unique to this component instance and intensity
  const intensity = getIntensity(strength);
  const gradientId = `gradient-${type.replace(/\s+/g, '-').toLowerCase()}-${intensity.toLowerCase()}-${Math.random().toString(36).substr(2, 9)}`;
  const gradientColors = getGradientColors(strength);

  return (
    <Card 
      className="transition-all duration-300 hover:shadow-lg cursor-pointer border border-border hover:border-primary/20"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <CardContent className="p-4 text-center">
        {/* Gradient Circle */}
        <div className="relative w-20 h-20 mx-auto mb-3">
          <svg className="w-20 h-20" viewBox="0 0 80 80">
            <defs>
              <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={gradientColors.color1} />
                <stop offset="50%" stopColor={gradientColors.color2} />
                <stop offset="100%" stopColor={gradientColors.color3} />
              </linearGradient>
            </defs>
            {/* Gradient-filled circle with fallback color */}
            <circle
              cx="40"
              cy="40"
              r="32"
              fill={`url(#${gradientId})`}
              style={{ 
                filter: isHovered ? 'brightness(1.1)' : 'brightness(1)',
                transform: isHovered ? 'scale(1.05)' : 'scale(1)',
                transformOrigin: 'center',
                // Fallback color in case gradient fails
                fillOpacity: 1
              }}
              className="transition-all duration-500 ease-in-out"
            />
            {/* Fallback circle in case SVG gradient fails */}
            <circle
              cx="40"
              cy="40"
              r="32"
              fill={gradientColors.color1}
              style={{ 
                display: 'none'
              }}
              className="fallback-circle"
            />
          </svg>
          {/* Percentage in center */}
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-sm font-bold text-white drop-shadow-sm">
              {strength}%
            </span>
          </div>
        </div>

        {/* Learning Style Info */}
        <h3 className="font-semibold text-card-foreground mb-1 text-sm leading-tight">
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
