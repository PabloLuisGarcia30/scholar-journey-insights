
import { useState, useEffect } from 'react';
import { EnhancedMistakePatternService, type EnhancedMistakeAnalysis, type CommonErrorPattern } from '@/services/enhancedMistakePatternService';

export function useEnhancedMistakeAnalytics(studentId: string, skillFilter?: string) {
  const [mistakeAnalysis, setMistakeAnalysis] = useState<EnhancedMistakeAnalysis[]>([]);
  const [commonPatterns, setCommonPatterns] = useState<CommonErrorPattern[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAnalytics = async () => {
      try {
        setLoading(true);
        setError(null);

        const [analysisData, patternsData] = await Promise.all([
          EnhancedMistakePatternService.getEnhancedMistakeAnalysis(studentId, skillFilter),
          EnhancedMistakePatternService.identifyCommonErrorPatterns(skillFilter)
        ]);

        setMistakeAnalysis(analysisData);
        setCommonPatterns(patternsData);
      } catch (err) {
        console.error('Error fetching enhanced mistake analytics:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    if (studentId) {
      fetchAnalytics();
    }
  }, [studentId, skillFilter]);

  const getTopMisconceptions = (limit = 5) => {
    return mistakeAnalysis
      .sort((a, b) => b.errorCount - a.errorCount)
      .slice(0, limit);
  };

  const getCriticalSkills = () => {
    return mistakeAnalysis.filter(analysis => 
      analysis.errorSeverity === 'major' || analysis.errorSeverity === 'fundamental'
    );
  };

  const getRemediationRecommendations = () => {
    const recommendations = new Set<string>();
    mistakeAnalysis.forEach(analysis => {
      analysis.remediationThemes.forEach(theme => {
        if (theme) recommendations.add(theme);
      });
    });
    return Array.from(recommendations);
  };

  return {
    mistakeAnalysis,
    commonPatterns,
    loading,
    error,
    getTopMisconceptions,
    getCriticalSkills,
    getRemediationRecommendations
  };
}
