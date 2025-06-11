
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { MistakePatternService } from '@/services/mistakePatternService';

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

const masteryLevelColors = {
  mastered: 'bg-green-500',
  partial: 'bg-yellow-500',
  not_demonstrated: 'bg-red-500',
  unknown: 'bg-gray-300'
};

export function ConceptualMasteryDisplay({ studentId, subject }: ConceptualMasteryDisplayProps) {
  const [concepts, setConcepts] = useState<ConceptMastery[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadConceptualMastery() {
      try {
        setLoading(true);
        const data = await MistakePatternService.getStudentConceptualMastery(studentId, subject);
        setConcepts(data);
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

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conceptual Understanding</CardTitle>
          <CardDescription>Loading conceptual mastery data...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conceptual Understanding</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (concepts.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conceptual Understanding</CardTitle>
          <CardDescription>No conceptual data available yet. Complete more exercises to generate insights.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Conceptual Understanding</CardTitle>
        <CardDescription>Analysis of conceptual anchor points and mastery levels</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {concepts.map((concept, idx) => (
            <div key={idx} className="border rounded-md p-4">
              <div className="flex justify-between items-start mb-2">
                <h3 className="font-medium text-lg">{concept.concept}</h3>
                <Badge variant={concept.mastery_level === 'mastered' ? 'default' : 'outline'}>
                  {concept.mastery_level.replace('_', ' ')}
                </Badge>
              </div>
              
              <Progress
                value={getMasteryPercentage(concept.mastery_level)}
                className="h-2 mb-2"
              />
              
              <div className="text-sm text-muted-foreground">
                Demonstrated {concept.demonstration_count} time{concept.demonstration_count !== 1 ? 's' : ''}
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
        </div>
      </CardContent>
    </Card>
  );
}
