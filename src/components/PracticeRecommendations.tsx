
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Clock, Target, TrendingUp, AlertCircle, Zap, BookOpen } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface PracticeRecommendation {
  skillName: string;
  currentScore: number;
  difficulty: 'Review' | 'Standard' | 'Challenge';
  estimatedTime: string;
  expectedImprovement: string;
  category: 'PRIORITY' | 'REVIEW' | 'CHALLENGE';
}

interface PracticeRecommendationsProps {
  recommendations: PracticeRecommendation[];
  classId?: string;
}

export function PracticeRecommendations({ recommendations, classId }: PracticeRecommendationsProps) {
  const navigate = useNavigate();

  const handlePracticeClick = (skillName: string, difficulty: string) => {
    if (!classId) {
      console.warn('No class ID available for practice navigation');
      return;
    }

    const encodedSkillName = encodeURIComponent(skillName);
    const questionCount = difficulty === 'Challenge' ? 6 : difficulty === 'Standard' ? 5 : 4;
    
    navigate(`/student-dashboard/class/${classId}/practice/${encodedSkillName}?questions=${questionCount}`);
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'PRIORITY': return <AlertCircle className="h-4 w-4" />;
      case 'REVIEW': return <BookOpen className="h-4 w-4" />;
      case 'CHALLENGE': return <Zap className="h-4 w-4" />;
      default: return <Target className="h-4 w-4" />;
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'PRIORITY': return 'destructive';
      case 'REVIEW': return 'secondary';
      case 'CHALLENGE': return 'default';
      default: return 'outline';
    }
  };

  const getCategoryTitle = (category: string) => {
    switch (category) {
      case 'PRIORITY': return 'Priority Practice (Needs Immediate Attention)';
      case 'REVIEW': return 'Review Practice (Strengthen Understanding)';
      case 'CHALLENGE': return 'Challenge Practice (Advanced Skills)';
      default: return 'Practice Recommendations';
    }
  };

  if (recommendations.length === 0) {
    return null;
  }

  // Group recommendations by category
  const groupedRecommendations = recommendations.reduce((acc, rec) => {
    if (!acc[rec.category]) {
      acc[rec.category] = [];
    }
    acc[rec.category].push(rec);
    return acc;
  }, {} as Record<string, PracticeRecommendation[]>);

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm font-medium text-blue-700">
        <Target className="h-4 w-4" />
        <span>AI-Generated Practice Recommendations</span>
      </div>
      
      {Object.entries(groupedRecommendations).map(([category, recs]) => (
        <Card key={category} className="border-l-4 border-l-blue-500">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-sm">
              {getCategoryIcon(category)}
              {getCategoryTitle(category)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {recs.map((rec, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900">{rec.skillName}</span>
                    <Badge variant={getCategoryColor(category)} className="text-xs">
                      {rec.currentScore}%
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-gray-600">
                    <div className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      <span>{rec.estimatedTime}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      <span>{rec.expectedImprovement}</span>
                    </div>
                    <Badge variant="outline" className="text-xs">
                      {rec.difficulty}
                    </Badge>
                  </div>
                </div>
                <Button
                  size="sm"
                  onClick={() => handlePracticeClick(rec.skillName, rec.difficulty)}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={!classId}
                >
                  Practice Now
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
