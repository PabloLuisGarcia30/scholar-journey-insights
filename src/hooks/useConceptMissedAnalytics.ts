
import { useState, useEffect } from 'react';
import { MistakePatternService } from '@/services/mistakePatternService';
import { ConceptMissedService } from '@/services/conceptMissedService';

export interface MissedConceptData {
  concept_id: string;
  concept_name: string;
  concept_description: string;
  miss_count: number;
  recent_description: string;
  last_missed: string;
  subject: string;
  grade: string;
}

export interface GlobalMissedConceptData {
  concept_id: string;
  concept_name: string;
  miss_count: number;
  subject: string;
  grade: string;
}

export function useConceptMissedAnalytics(studentId: string, subject?: string) {
  const [missedConcepts, setMissedConcepts] = useState<MissedConceptData[]>([]);
  const [globalMissedConcepts, setGlobalMissedConcepts] = useState<GlobalMissedConceptData[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchConceptMissedData() {
      if (!studentId) {
        setMissedConcepts([]);
        setGlobalMissedConcepts([]);
        setIsLoading(false);
        return;
      }

      try {
        setIsLoading(true);
        setError(null);

        const [studentData, globalData] = await Promise.all([
          MistakePatternService.getStudentMissedConcepts(studentId, subject),
          ConceptMissedService.getMostMissedConcepts(undefined, subject, 10)
        ]);

        setMissedConcepts(studentData);
        setGlobalMissedConcepts(globalData);
      } catch (err) {
        console.error('Error fetching concept missed data:', err);
        setError('Failed to load concept missed data');
      } finally {
        setIsLoading(false);
      }
    }

    fetchConceptMissedData();
  }, [studentId, subject]);

  const getTopMissedConcepts = (limit = 5) => {
    return missedConcepts
      .sort((a, b) => b.miss_count - a.miss_count)
      .slice(0, limit);
  };

  const getRecentMissedConcepts = (limit = 5) => {
    return missedConcepts
      .sort((a, b) => new Date(b.last_missed).getTime() - new Date(a.last_missed).getTime())
      .slice(0, limit);
  };

  const getMissedConceptsBySubject = (targetSubject: string) => {
    return missedConcepts.filter(concept => 
      concept.subject.toLowerCase().includes(targetSubject.toLowerCase())
    );
  };

  return {
    missedConcepts,
    globalMissedConcepts,
    isLoading,
    error,
    getTopMissedConcepts,
    getRecentMissedConcepts,
    getMissedConceptsBySubject
  };
}
