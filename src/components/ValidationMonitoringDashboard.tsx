
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { ValidationMonitoringService, type ValidationMetrics } from '@/services/validationMonitoringService';
import { PerformanceOptimizationService, type OptimizationMetrics } from '@/services/performanceOptimizationService';
import { RefreshCw, AlertTriangle, CheckCircle, Clock, TrendingUp } from 'lucide-react';

interface SystemHealth {
  validationSuccessRate: number;
  averageResponseTime: number;
  errorRecoveryRate: number;
  systemLoad: 'low' | 'medium' | 'high' | 'critical';
  alerts: string[];
}

export const ValidationMonitoringDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ValidationMetrics | null>(null);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [optimizationMetrics, setOptimizationMetrics] = useState<OptimizationMetrics | null>(null);
  const [timeRange, setTimeRange] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  const loadData = async () => {
    setLoading(true);
    try {
      const [metricsData, healthData, optimizationData] = await Promise.all([
        ValidationMonitoringService.getValidationMetrics(timeRange),
        ValidationMonitoringService.getSystemHealth(),
        PerformanceOptimizationService.getOptimizationRecommendations()
      ]);

      setMetrics(metricsData);
      setSystemHealth(healthData);
      setOptimizationMetrics(optimizationData);
      setLastUpdated(new Date());
    } catch (error) {
      console.error('Failed to load monitoring data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, [timeRange]);

  const getSystemLoadColor = (load: string) => {
    switch (load) {
      case 'low': return 'bg-green-500';
      case 'medium': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getSystemLoadBadgeVariant = (load: string) => {
    switch (load) {
      case 'low': return 'default';
      case 'medium': return 'secondary';
      case 'high': return 'destructive';
      case 'critical': return 'destructive';
      default: return 'outline';
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center h-64">
          <RefreshCw className="h-8 w-8 animate-spin" />
          <span className="ml-2">Loading monitoring data...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Validation Monitoring Dashboard</h1>
          <p className="text-muted-foreground">
            Real-time monitoring of JSON validation and error recovery systems
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-muted-foreground">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </span>
          <Button onClick={loadData} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Success Rate</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.validationSuccessRate.toFixed(1)}%</div>
              <Progress value={systemHealth.validationSuccessRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
              <Clock className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.averageResponseTime.toFixed(0)}ms</div>
              <p className="text-xs text-muted-foreground mt-1">
                Last hour average
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Error Recovery Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-purple-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{systemHealth.errorRecoveryRate.toFixed(1)}%</div>
              <Progress value={systemHealth.errorRecoveryRate} className="mt-2" />
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">System Load</CardTitle>
              <div className={`h-3 w-3 rounded-full ${getSystemLoadColor(systemHealth.systemLoad)}`} />
            </CardHeader>
            <CardContent>
              <Badge variant={getSystemLoadBadgeVariant(systemHealth.systemLoad)} className="capitalize">
                {systemHealth.systemLoad}
              </Badge>
              <p className="text-xs text-muted-foreground mt-1">
                Current status
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Alerts */}
      {systemHealth?.alerts && systemHealth.alerts.length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <div className="space-y-1">
              {systemHealth.alerts.map((alert, index) => (
                <div key={index}>{alert}</div>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={timeRange} onValueChange={(value) => setTimeRange(value as any)}>
        <TabsList>
          <TabsTrigger value="1h">Last Hour</TabsTrigger>
          <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
          <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
          <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
        </TabsList>

        <TabsContent value={timeRange} className="space-y-6">
          {/* Performance Trends */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={metrics.performanceTrends}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="timestamp" 
                      tickFormatter={(value) => new Date(value).toLocaleTimeString()}
                    />
                    <YAxis yAxisId="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip 
                      labelFormatter={(value) => new Date(value).toLocaleString()}
                      formatter={(value: any, name: string) => [
                        name === 'successRate' ? `${value.toFixed(1)}%` : `${value.toFixed(0)}ms`,
                        name === 'successRate' ? 'Success Rate' : 'Avg Time'
                      ]}
                    />
                    <Line 
                      yAxisId="left" 
                      type="monotone" 
                      dataKey="successRate" 
                      stroke="#8884d8" 
                      name="successRate"
                    />
                    <Line 
                      yAxisId="right" 
                      type="monotone" 
                      dataKey="avgTime" 
                      stroke="#82ca9d" 
                      name="avgTime"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Error Analysis */}
          {metrics && metrics.topErrors.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Top Errors ({timeRange})</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.topErrors}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis 
                      dataKey="error" 
                      angle={-45}
                      textAnchor="end"
                      height={100}
                      interval={0}
                    />
                    <YAxis />
                    <Tooltip 
                      formatter={(value: any) => [`${value} occurrences`, 'Count']}
                    />
                    <Bar dataKey="count" fill="#ff7c7c" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          )}

          {/* Performance Optimization */}
          {optimizationMetrics && (
            <Card>
              <CardHeader>
                <CardTitle>Performance Optimization</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Current Metrics</h4>
                      <div className="space-y-2 mt-2">
                        <div className="flex justify-between">
                          <span className="text-sm">Avg Validation Time:</span>
                          <span className="text-sm font-medium">{optimizationMetrics.averageValidationTime.toFixed(1)}ms</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Validation Overhead:</span>
                          <span className="text-sm font-medium">{optimizationMetrics.validationOverhead.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Cache Hit Rate:</span>
                          <span className="text-sm font-medium">{optimizationMetrics.cacheHitRate.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-sm">Optimal Batch Size:</span>
                          <span className="text-sm font-medium">{optimizationMetrics.optimalBatchSize}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-medium">Recommendations</h4>
                      <div className="space-y-2 mt-2">
                        {optimizationMetrics.recommendedOptimizations.map((recommendation, index) => (
                          <div key={index} className="text-sm p-2 bg-blue-50 rounded border-l-4 border-blue-200">
                            {recommendation}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Summary Statistics */}
          {metrics && (
            <Card>
              <CardHeader>
                <CardTitle>Summary Statistics ({timeRange})</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{metrics.totalValidations}</div>
                    <div className="text-sm text-muted-foreground">Total Validations</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{metrics.successRate.toFixed(1)}%</div>
                    <div className="text-sm text-muted-foreground">Overall Success Rate</div>
                  </div>
                  <div className="text-center p-4 bg-gray-50 rounded">
                    <div className="text-2xl font-bold">{metrics.averageProcessingTime.toFixed(0)}ms</div>
                    <div className="text-sm text-muted-foreground">Avg Processing Time</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};
