
import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown, Target, AlertCircle } from 'lucide-react';
import { useConceptValidation } from '@/hooks/useConceptValidation';

interface ValidationAnalyticsDashboardProps {
  teacherId?: string;
}

export function ValidationAnalyticsDashboard({ teacherId }: ValidationAnalyticsDashboardProps) {
  const { validationAnalytics, loading, error } = useConceptValidation(teacherId);

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}>
            <CardHeader className="animate-pulse">
              <div className="h-4 bg-gray-200 rounded w-3/4"></div>
              <div className="h-6 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <div className="text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-600">Error loading validation analytics</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const confidenceData = Object.entries(validationAnalytics.confidence_distribution).map(
    ([range, count]) => ({
      range,
      count
    })
  );

  return (
    <div className="space-y-6">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Detections</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{validationAnalytics.total_detections}</div>
            <p className="text-xs text-muted-foreground">Last 30 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Validation Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {validationAnalytics.validation_rate.toFixed(1)}%
            </div>
            <Progress value={validationAnalytics.validation_rate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {validationAnalytics.validated_count} of {validationAnalytics.total_detections} validated
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Override Rate</CardTitle>
            <TrendingDown className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {validationAnalytics.override_rate.toFixed(1)}%
            </div>
            <Progress value={validationAnalytics.override_rate} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {validationAnalytics.override_count} corrections made
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">AI Accuracy</CardTitle>
            <AlertCircle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {(100 - validationAnalytics.override_rate).toFixed(1)}%
            </div>
            <div className="flex gap-2 mt-2">
              <Badge variant="outline">
                Avg Confidence: {(validationAnalytics.avg_confidence_validated * 100).toFixed(0)}%
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Confidence Distribution Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Confidence Score Distribution</CardTitle>
          <CardDescription>
            How confident the AI is in its concept detections
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={confidenceData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="range" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Insights */}
      <Card>
        <CardHeader>
          <CardTitle>AI Learning Insights</CardTitle>
          <CardDescription>
            Understanding how validation feedback improves AI performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-medium">Confidence Patterns</h4>
              <div className="text-sm text-gray-600 space-y-1">
                <p>• Average confidence of validated concepts: {(validationAnalytics.avg_confidence_validated * 100).toFixed(0)}%</p>
                <p>• Average confidence of overridden concepts: {(validationAnalytics.avg_confidence_overridden * 100).toFixed(0)}%</p>
                <p>• AI learns to be more careful with lower confidence scores</p>
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Improvement Areas</h4>
              <div className="text-sm text-gray-600 space-y-1">
                {validationAnalytics.override_rate > 20 && (
                  <p>• Consider adjusting confidence thresholds</p>
                )}
                {validationAnalytics.validation_rate < 50 && (
                  <p>• More teacher validation needed for AI learning</p>
                )}
                <p>• Teacher feedback helps refine future detections</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
