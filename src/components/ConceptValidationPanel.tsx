
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertTriangle, CheckCircle, XCircle, Search } from 'lucide-react';
import { ConceptMissedService } from '@/services/conceptMissedService';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';

interface UnvalidatedConcept {
  id: string;
  concept_missed_description: string;
  concept_confidence: number;
  student_answer: string;
  correct_answer: string;
  skill_targeted: string;
  created_at: string;
  student_name?: string;
}

interface ConceptValidationPanelProps {
  teacherId?: string;
  confidenceThreshold?: number;
}

export function ConceptValidationPanel({ 
  teacherId, 
  confidenceThreshold = 0.7 
}: ConceptValidationPanelProps) {
  const [unvalidatedConcepts, setUnvalidatedConcepts] = useState<UnvalidatedConcept[]>([]);
  const [loading, setLoading] = useState(true);
  const [validatingId, setValidatingId] = useState<string | null>(null);
  const [overrideReason, setOverrideReason] = useState('');
  const [searchingConcept, setSearchingConcept] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    fetchUnvalidatedConcepts();
  }, [confidenceThreshold]);

  const fetchUnvalidatedConcepts = async () => {
    try {
      setLoading(true);
      const concepts = await ConceptMissedService.getUnvalidatedConceptDetections(
        teacherId,
        confidenceThreshold
      );
      setUnvalidatedConcepts(concepts);
    } catch (error) {
      console.error('Error fetching unvalidated concepts:', error);
      toast({
        title: "Error",
        description: "Failed to load concept validations",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleValidation = async (conceptId: string, isValid: boolean) => {
    try {
      setValidatingId(conceptId);
      
      const success = await ConceptMissedService.validateConceptDetection(
        conceptId,
        isValid,
        undefined, // No override concept for simple validation
        isValid ? undefined : overrideReason
      );

      if (success) {
        toast({
          title: "Validation Recorded",
          description: `Concept detection ${isValid ? 'confirmed' : 'rejected'}`,
        });
        
        // Remove from unvalidated list
        setUnvalidatedConcepts(prev => prev.filter(c => c.id !== conceptId));
        setOverrideReason('');
      } else {
        throw new Error('Validation failed');
      }
    } catch (error) {
      console.error('Error validating concept:', error);
      toast({
        title: "Validation Failed",
        description: "Could not record validation",
        variant: "destructive"
      });
    } finally {
      setValidatingId(null);
    }
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 0.8) return 'bg-green-500';
    if (confidence >= 0.6) return 'bg-yellow-500';
    if (confidence >= 0.4) return 'bg-orange-500';
    return 'bg-red-500';
  };

  const getConfidenceLabel = (confidence: number) => {
    if (confidence >= 0.8) return 'High';
    if (confidence >= 0.6) return 'Medium';
    if (confidence >= 0.4) return 'Low';
    return 'Very Low';
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Concept Validations
          </CardTitle>
          <CardDescription>Loading concept detections for review...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="h-5 w-5 text-yellow-500" />
          Concept Validations
          <Badge variant="secondary">{unvalidatedConcepts.length} pending</Badge>
        </CardTitle>
        <CardDescription>
          Review AI concept detections with confidence below {(confidenceThreshold * 100).toFixed(0)}%
        </CardDescription>
      </CardHeader>
      <CardContent>
        {unvalidatedConcepts.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <CheckCircle className="h-12 w-12 mx-auto mb-4 text-green-500" />
            <p className="text-lg font-medium">All caught up!</p>
            <p>No concept detections need validation at this time.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {unvalidatedConcepts.map((concept) => (
              <div key={concept.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{concept.concept_missed_description}</h4>
                      <Badge 
                        variant="outline" 
                        className={`${getConfidenceColor(concept.concept_confidence)} text-white`}
                      >
                        {getConfidenceLabel(concept.concept_confidence)} ({(concept.concept_confidence * 100).toFixed(0)}%)
                      </Badge>
                    </div>
                    <Progress 
                      value={concept.concept_confidence * 100} 
                      className="w-full h-2 mb-3"
                    />
                    <div className="text-sm text-gray-600 space-y-1">
                      <p><strong>Student:</strong> {concept.student_name || 'Unknown'}</p>
                      <p><strong>Skill:</strong> {concept.skill_targeted}</p>
                      <p><strong>Student Answer:</strong> "{concept.student_answer}"</p>
                      <p><strong>Correct Answer:</strong> "{concept.correct_answer}"</p>
                      <p><strong>Date:</strong> {new Date(concept.created_at).toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Textarea
                    placeholder="Optional: Reason for rejection or override (if rejecting)"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                    className="text-sm"
                    rows={2}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() => handleValidation(concept.id, true)}
                    disabled={validatingId === concept.id}
                    variant="default"
                    size="sm"
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle className="h-4 w-4 mr-1" />
                    Confirm Correct
                  </Button>
                  <Button
                    onClick={() => handleValidation(concept.id, false)}
                    disabled={validatingId === concept.id}
                    variant="destructive"
                    size="sm"
                  >
                    <XCircle className="h-4 w-4 mr-1" />
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
