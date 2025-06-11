
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ConceptMissedService } from '@/services/conceptMissedService';
import { TrendingUp, Brain, Target, Zap } from 'lucide-react';

interface ConceptGrowthAnalyticsProps {
  days?: number;
}

export function ConceptGrowthAnalytics({ days = 30 }: ConceptGrowthAnalyticsProps) {
  const [analytics, setAnalytics] = useState({
    new_concepts_created: 0,
    concepts_matched: 0,
    total_concept_detections: 0,
    growth_rate: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadAnalytics() {
      try {
        setLoading(true);
        const data = await ConceptMissedService.getConceptGrowthAnalytics(days);
        setAnalytics(data);
      } catch (err) {
        console.error('Error loading concept growth analytics:', err);
        setError('Failed to load analytics');
      } finally {
        setLoading(false);
      }
    }

    loadAnalytics();
  }, [days]);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Concept Growth Analytics
          </CardTitle>
          <CardDescription>Loading analytics...</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Concept Growth Analytics</CardTitle>
          <CardDescription className="text-red-500">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          Concept Growth Analytics
        </CardTitle>
        <CardDescription>
          System learning and concept taxonomy expansion over the last {days} days
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center space-x-3 p-4 border rounded-lg bg-green-50">
            <Zap className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-2xl font-bold text-green-700">{analytics.new_concepts_created}</p>
              <p className="text-sm text-green-600">New Concepts Created</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg bg-blue-50">
            <Target className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-2xl font-bold text-blue-700">{analytics.concepts_matched}</p>
              <p className="text-sm text-blue-600">Concepts Matched</p>
            </div>
          </div>

          <div className="flex items-center space-x-3 p-4 border rounded-lg bg-purple-50">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-2xl font-bold text-purple-700">{analytics.total_concept_detections}</p>
              <p className="text-sm text-purple-600">Total Detections</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Growth Rate</span>
            <Badge variant={analytics.growth_rate > 20 ? 'default' : 'secondary'}>
              {analytics.growth_rate}% new concepts
            </Badge>
          </div>
          <Progress value={Math.min(analytics.growth_rate, 100)} className="h-2" />
          <p className="text-xs text-muted-foreground">
            {analytics.growth_rate > 20 
              ? 'High growth rate indicates the system is learning new concepts frequently'
              : 'Balanced growth rate indicates good concept matching with selective expansion'
            }
          </p>
        </div>

        {analytics.total_concept_detections > 0 && (
          <div className="border-t pt-4">
            <h4 className="font-medium mb-2">Detection Breakdown</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Matched existing concepts:</span>
                <span>{Math.round((analytics.concepts_matched / analytics.total_concept_detections) * 100)}%</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>Created new concepts:</span>
                <span>{Math.round((analytics.new_concepts_created / analytics.total_concept_detections) * 100)}%</span>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
