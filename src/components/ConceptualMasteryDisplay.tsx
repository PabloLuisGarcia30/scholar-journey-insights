
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { MistakePatternService } from '@/services/mistakePatternService';
import { useConceptMissedAnalytics } from '@/hooks/useConceptMissedAnalytics';

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
  
  const { 
    missedConcepts, 
    isLoading: missedConceptsLoading, 
    error: missedConceptsError,
    getTopMissedConcepts 
  } = useConceptMissedAnalytics(studentId, subject);

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

  const isLoadingAny = loading || missedConceptsLoading;
  const hasError = error || missedConceptsError;

  if (isLoadingAny) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conceptual Understanding</CardTitle>
          <CardDescription>Loading conceptual analysis...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (hasError) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Conceptual Understanding</CardTitle>
          <CardDescription className="text-red-500">{error || missedConceptsError}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (concepts.length === 0 && missedConcepts.length === 0) {
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
        <CardDescription>Analysis of conceptual mastery and missed concepts</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="mastery" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="mastery">Mastery Progress</TabsTrigger>
            <TabsTrigger value="missed">Missed Concepts</TabsTrigger>
          </TabsList>
          
          <TabsContent value="mastery" className="space-y-4">
            {concepts.length > 0 ? (
              concepts.map((concept, idx) => (
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
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No mastery data available yet. Complete more exercises to track progress.
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="missed" className="space-y-4">
            {missedConcepts.length > 0 ? (
              getTopMissedConcepts(8).map((concept, idx) => (
                <div key={idx} className="border rounded-md p-4 border-red-200 bg-red-50">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-medium text-lg text-red-800">{concept.concept_name}</h3>
                    <Badge variant="destructive">
                      Missed {concept.miss_count} time{concept.miss_count !== 1 ? 's' : ''}
                    </Badge>
                  </div>
                  
                  <div className="text-sm text-red-700 mb-2">
                    {concept.recent_description}
                  </div>
                  
                  {concept.concept_description && (
                    <div className="text-sm text-muted-foreground mb-2">
                      <span className="font-medium">Description:</span> {concept.concept_description}
                    </div>
                  )}
                  
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>{concept.subject} - {concept.grade}</span>
                    <span>Last missed: {new Date(concept.last_missed).toLocaleDateString()}</span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No missed concepts detected yet. This is good progress!
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
