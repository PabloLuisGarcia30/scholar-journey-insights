
import { useState, useEffect } from 'react';
import { ConceptMissedService } from '@/services/conceptMissedService';

export function useConceptValidation(teacherId?: string) {
  const [validationAnalytics, setValidationAnalytics] = useState({
    total_detections: 0,
    validated_count: 0,
    validation_rate: 0,
    override_count: 0,
    override_rate: 0,
    avg_confidence_validated: 0,
    avg_confidence_overridden: 0,
    confidence_distribution: {} as Record<string, number>
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const analytics = await ConceptMissedService.getValidationAnalytics(30);
        setValidationAnalytics(analytics);
      } catch (err) {
        console.error('Error fetching validation analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    fetchAnalytics();
  }, [teacherId]);

  const refreshAnalytics = async () => {
    try {
      const analytics = await ConceptMissedService.getValidationAnalytics(30);
      setValidationAnalytics(analytics);
    } catch (err) {
      console.error('Error refreshing validation analytics:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  return {
    validationAnalytics,
    loading,
    error,
    refreshAnalytics
  };
}
