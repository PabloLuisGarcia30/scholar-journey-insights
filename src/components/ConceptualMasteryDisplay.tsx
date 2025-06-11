
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { MistakePatternService } from '@/services/mistakePatternService';
import { ConceptMissedService } from '@/services/conceptMissedService';
import { Brain, TrendingUp, AlertCircle } from 'lucide-react';

interface ConceptualMasteryDisplayProps {
  studentId: string;
  subject?: string;
}

interface ConceptMastery {
  concept: string;
  mastery_level: string;
  demonstration_count: number;
  latest_demonstration: string;
  related_skills: string[];
}

interface PopularConcept {
  id: string;
  concept_name: string;
  subject: string;
  grade: string;
  usage_count: number;
}

const masteryLevelColors = {
  mastered: 'bg-green-500',
  partial: 'bg-yellow-500',
  not_demonstrated: 'bg-red-500',
  unknown: 'bg-gray-300'
};

const masteryLevelLabels = {
  mastered: 'Mastered',
  partial: 'Partial Understanding',
  not_demonstrated: 'Needs Work',
  unknown: 'Unknown'
};

export function ConceptualMasteryDisplay({ studentId, subject }: ConceptualMasteryDisplayProps) {
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [popularConcepts, setPopularConcepts] = useState<PopularConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showPopular, setShowPopular] = useState(false);

  useEffect(() => {
    async function loadConceptualMastery() {
      try {
        setLoading(true);
        
        // Load student-specific concept mastery
        const data = await MistakePatternService.getStudentConceptualMastery(studentId, subject);
        setConcepts(data);
        
        // Load popular concepts for comparison
        const popular = await ConceptMissedService.getPopularConcepts(subject, undefined, 5);
        setPopularConcepts(popular);
        
      } catch (err) {
        console.error('Error loading conceptual mastery:', err);
        setError('Failed to load conceptual mastery data');
      } finally {
        setLoading(false);
      }
    }

    loadConceptualMastery();
  }, [studentId, subject]);

  const getMasteryPercentage = (level: string): number => {
    switch (level) {
      case 'mastered': return 100;
      case 'partial': return 50;
      case 'not_demonstrated': return 15;
      default: return 0;
    }
  };

  const getMasteryColor = (level: string): string => {
    return masteryLevelColors[level as keyof typeof masteryLevelColors] || 'bg-gray-300';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conceptual Understanding
          </CardTitle>
          <CardDescription>Loading conceptual mastery data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conceptual Understanding
          </CardTitle>
          <CardDescription className="text-red-500 flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            {error}
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (concepts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Conceptual Understanding
          </CardTitle>
          <CardDescription>
            No conceptual data available yet. Complete more exercises to generate insights.
          </CardDescription>
        </CardHeader>
        {popularConcepts.length > 0 && (
          <CardContent>
            <div className="mt-4">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                Common Concepts in {subject || 'this subject'}:
              </h4>
              <div className="flex flex-wrap gap-1">
                {popularConcepts.map((concept, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {concept.concept_name}
                  </Badge>
                ))}
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Conceptual Understanding
        </CardTitle>
        <CardDescription className="flex items-center justify-between">
          <span>Analysis of conceptual anchor points and mastery levels</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPopular(!showPopular)}
              className="text-xs"
            >
              <TrendingUp className="h-3 w-3 mr-1" />
              {showPopular ? 'Hide' : 'Show'} Trends
            </Button>
          </div>
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {concepts.map((concept, idx) => (
            <div key={idx} className="border rounded-md p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{concept.concept}</h3>
                <Badge 
                  variant={concept.mastery_level === 'mastered' ? 'default' : 'outline'}
                  className={`${getMasteryColor(concept.mastery_level)} text-white`}
                >
                  {masteryLevelLabels[concept.mastery_level as keyof typeof masteryLevelLabels] || concept.mastery_level}
                </Badge>
              </div>
              
              <Progress
                value={getMasteryPercentage(concept.mastery_level)}
                className="h-2 mb-2"
              />
              
              <div className="text-sm text-muted-foreground">
                Demonstrated {concept.demonstration_count} time{concept.demonstration_count !== 1 ? 's' : ''}
                {concept.latest_demonstration && (
                  <span className="ml-2">
                    (Latest: {new Date(concept.latest_demonstration).toLocaleDateString()})
                  </span>
                )}
              </div>
              
              <div className="mt-2">
                <span className="text-sm font-medium">Related Skills:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {concept.related_skills.map((skill, skillIdx) => (
                    <Badge key={skillIdx} variant="secondary" className="text-xs">
                      {skill}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          ))}
          
          {showPopular && popularConcepts.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Trending Concepts in {subject || 'Education'}
              </h4>
              <div className="grid grid-cols-1 gap-2">
                {popularConcepts.map((concept, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 bg-muted rounded">
                    <span className="text-sm font-medium">{concept.concept_name}</span>
                    <Badge variant="outline" className="text-xs">
                      {concept.usage_count} uses
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
