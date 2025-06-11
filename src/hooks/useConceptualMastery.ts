
import { useState, useEffect } from 'react';
import { MistakePatternService } from '@/services/mistakePatternService';

export interface ConceptMasteryData {
  concept: string;
  mastery_level: string;
  demonstration_count: number;
  latest_demonstration: string;
  related_skills: string[];
}

export interface SkillConceptAnalysis {
  expected_concept: string;
  mastery_distribution: {
    mastered: number;
    partial: number;
    not_demonstrated: number;
    unknown: number;
  };
  total_demonstrations: number;
  mastery_rate: number;
}

export function useConceptualMastery(studentId: string, subject?: string) {
  const [concepts, setConcepts] = useState<ConceptMasteryData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConceptualMastery() {
      if (!studentId) {
        setConcepts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await MistakePatternService.getStudentConceptualMastery(studentId, subject);
        setConcepts(result);
      } catch (err) {
        console.error('Error fetching conceptual mastery data:', err);
        setError('Failed to load conceptual mastery data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConceptualMastery();
  }, [studentId, subject]);

  return { concepts, isLoading, error };
}

export function useSkillConceptAnalysis(skillName: string) {
  const [conceptAnalysis, setConceptAnalysis] = useState<SkillConceptAnalysis[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSkillConceptAnalysis() {
      if (!skillName) {
        setConceptAnalysis([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        const result = await MistakePatternService.getSkillConceptualAnchorAnalysis(skillName);
        setConceptAnalysis(result);
      } catch (err) {
        console.error('Error fetching skill concept analysis:', err);
        setError('Failed to load skill concept analysis');
      } finally {
        setIsLoading(false);
      }
    }

    fetchSkillConceptAnalysis();
  }, [skillName]);

  return { conceptAnalysis, isLoading, error };
}
