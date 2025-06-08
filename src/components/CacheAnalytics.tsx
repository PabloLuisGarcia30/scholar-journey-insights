
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  TrendingUp, 
  DollarSign, 
  Zap, 
  Clock,
  BarChart3,
  RefreshCw,
  Database,
  CheckCircle
} from 'lucide-react';
import { QuestionCacheService, QuestionCacheStats } from '@/services/questionCacheService';

interface CacheMetrics {
  hitRate: number;
  totalQueries: number;
  cacheHits: number;
  cacheMisses: number;
  costSavings: number;
  avgResponseTime: number;
  topExams: Array<{
    examId: string;
    hitRate: number;
    queries: number;
    savings: number;
  }>;
}

export const CacheAnalytics: React.FC = () => {
  const [stats, setStats] = useState<QuestionCacheStats | null>(null);
  const [healthMetrics, setHealthMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      const [cacheStats, health] = await Promise.all([
        QuestionCacheService.getQuestionCacheStats(),
        QuestionCacheService.getCacheHealthMetrics()
      ]);
      
      setStats(cacheStats);
      setHealthMetrics(health);
      setLastRefresh(new Date());
    } catch (error) {
      console.error('Failed to load cache analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAnalytics();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(loadAnalytics, 30000);
    return () => clearInterval(interval);
  }, []);

  const getHitRateColor = (hitRate: number) => {
    if (hitRate >= 80) return 'text-green-600';
    if (hitRate >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getEfficiencyBadge = (hitRate: number) => {
    if (hitRate >= 90) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (hitRate >= 70) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (hitRate >= 50) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading cache analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Cache Analytics</h2>
          <p className="text-gray-600">Performance insights and cost optimization</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">
            Last updated: {lastRefresh.toLocaleTimeString()}
          </span>
          <Button onClick={loadAnalytics} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cache Hit Rate</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${getHitRateColor(stats.hitRate * 100)}`}>
              {Math.round(stats.hitRate * 100)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {stats.totalCachedQuestions} cached questions
            </p>
            <div className="mt-2">
              {getEfficiencyBadge(stats.hitRate * 100)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Cost Savings</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              ${stats.costSavings.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Today's savings
            </p>
            <p className="text-xs text-green-600 mt-1">
              ↓ {Math.round((stats.costSavings / Math.max(stats.totalCachedQuestions * 0.01, 0.01)) * 100)}% cost reduction
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Memory Usage</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {healthMetrics?.memorySize || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              of {healthMetrics?.maxSize || 1000} max entries
            </p>
            <Progress 
              value={healthMetrics?.utilizationPercent || 0} 
              className="mt-2" 
            />
            <p className="text-xs mt-1">
              {Math.round(healthMetrics?.utilizationPercent || 0)}% utilized
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Grading Methods</CardTitle>
            <Zap className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>DistilBERT:</span>
                <span className="font-medium">{stats.distilBertCached}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span>OpenAI:</span>
                <span className="font-medium">{stats.openAICached}</span>
              </div>
            </div>
            <div className="mt-2">
              <Badge variant="outline">
                {Math.round((stats.distilBertCached / Math.max(stats.totalCachedQuestions, 1)) * 100)}% Local
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Analytics */}
      <Tabs defaultValue="performance" className="space-y-4">
        <TabsList>
          <TabsTrigger value="performance">Performance</TabsTrigger>
          <TabsTrigger value="exams">Top Exams</TabsTrigger>
          <TabsTrigger value="health">System Health</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Cache Efficiency</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span>Hit Rate:</span>
                    <div className="flex items-center gap-2">
                      <Progress value={stats.hitRate * 100} className="w-24" />
                      <span className="font-medium">{Math.round(stats.hitRate * 100)}%</span>
                    </div>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Cached:</span>
                    <span className="font-medium">{stats.totalCachedQuestions}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Cost Savings:</span>
                    <span className="font-medium text-green-600">${stats.costSavings.toFixed(2)}</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Grading Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>DistilBERT (Local)</span>
                      <span>{stats.distilBertCached}</span>
                    </div>
                    <Progress 
                      value={(stats.distilBertCached / Math.max(stats.totalCachedQuestions, 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>OpenAI (Cloud)</span>
                      <span>{stats.openAICached}</span>
                    </div>
                    <Progress 
                      value={(stats.openAICached / Math.max(stats.totalCachedQuestions, 1)) * 100} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="exams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Top Cached Exams</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.topCachedExams.length === 0 ? (
                  <p className="text-gray-500 text-center py-4">No cached exams yet</p>
                ) : (
                  stats.topCachedExams.map((exam, index) => (
                    <div key={exam.examId} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{index + 1}</Badge>
                        <div>
                          <span className="font-medium">{exam.examId}</span>
                          <p className="text-xs text-gray-600">{exam.questionCount} questions cached</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{Math.round(exam.hitRate * 100)}%</div>
                        <p className="text-xs text-gray-600">hit rate</p>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="health" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Health Metrics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Memory Utilization</label>
                    <div className="flex items-center gap-2 mt-1">
                      <Progress value={healthMetrics?.utilizationPercent || 0} className="flex-1" />
                      <span className="text-sm">{Math.round(healthMetrics?.utilizationPercent || 0)}%</span>
                    </div>
                    <p className="text-xs text-gray-600 mt-1">
                      {healthMetrics?.memorySize || 0} / {healthMetrics?.maxSize || 1000} entries
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <CheckCircle className="h-4 w-4 text-green-500" />
                    <span className="text-sm">Auto-cleanup enabled</span>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm">Last Cleanup:</span>
                    <span className="text-sm font-medium">
                      {healthMetrics?.lastCleanup ? new Date(healthMetrics.lastCleanup).toLocaleString() : 'Never'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">Next Cleanup:</span>
                    <span className="text-sm font-medium">
                      {healthMetrics?.nextCleanup ? new Date(healthMetrics.nextCleanup).toLocaleString() : 'Scheduled'}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
