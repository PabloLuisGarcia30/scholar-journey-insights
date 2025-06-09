
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Activity, 
  Users, 
  Clock, 
  TrendingUp, 
  AlertTriangle, 
  CheckCircle,
  Settings,
  BarChart3,
  Zap,
  Database
} from 'lucide-react';
import { scalabilityMonitor, ScalabilityStats } from '@/services/scalabilityMonitoringService';
import { BatchProcessingService } from '@/services/batchProcessingService';
import { CacheAnalytics } from './CacheAnalytics';

export const SystemDashboard: React.FC = () => {
  const [stats, setStats] = useState<ScalabilityStats | null>(null);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [refreshInterval, setRefreshInterval] = useState(30000); // 30 seconds

  useEffect(() => {
    const loadData = async () => {
      try {
        const [scalabilityStats, queueStats, activeAlerts] = await Promise.all([
          scalabilityMonitor.getScalabilityStats(),
          BatchProcessingService.getQueueStatus(),
          scalabilityMonitor.getActiveAlerts()
        ]);

        setStats(scalabilityStats);
        setQueueStatus(queueStats);
        setAlerts(activeAlerts);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      }
    };

    loadData();

    if (autoRefresh) {
      const interval = setInterval(loadData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval]);

  const getStatusColor = (utilizationPercent: number) => {
    if (utilizationPercent < 50) return 'text-green-600';
    if (utilizationPercent < 80) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPerformanceBadge = (successRate: number) => {
    if (successRate >= 0.98) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>;
    if (successRate >= 0.95) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>;
    if (successRate >= 0.90) return <Badge className="bg-orange-100 text-orange-800">Fair</Badge>;
    return <Badge className="bg-red-100 text-red-800">Poor</Badge>;
  };

  if (!stats || !queueStatus) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="h-8 w-8 animate-spin mx-auto mb-2" />
          <p>Loading system dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">System Performance Dashboard</h2>
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAutoRefresh(!autoRefresh)}
          >
            {autoRefresh ? 'Pause' : 'Resume'} Auto-refresh
          </Button>
          <select 
            value={refreshInterval} 
            onChange={(e) => setRefreshInterval(Number(e.target.value))}
            className="px-3 py-1 border rounded text-sm"
          >
            <option value={10000}>10s</option>
            <option value={30000}>30s</option>
            <option value={60000}>1m</option>
            <option value={300000}>5m</option>
          </select>
        </div>
      </div>

      {/* Alert Cards */}
      {alerts.length > 0 && (
        <div className="grid gap-4">
          {alerts.slice(0, 3).map((alert) => (
            <Alert key={alert.id} className={alert.type === 'critical' ? 'border-red-500' : 'border-yellow-500'}>
              <AlertTriangle className={`h-4 w-4 ${alert.type === 'critical' ? 'text-red-500' : 'text-yellow-500'}`} />
              <AlertDescription className="flex justify-between items-center">
                <span>{alert.message}</span>
                <span className="text-sm text-gray-500">
                  {new Date(alert.timestamp).toLocaleTimeString()}
                </span>
              </AlertDescription>
            </Alert>
          ))}
        </div>
      )}

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Users</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.currentCapacity.currentActiveUsers}</div>
            <p className="text-xs text-muted-foreground">
              of {stats.currentCapacity.maxConcurrentUsers} max capacity
            </p>
            <Progress 
              value={stats.currentCapacity.utilizationPercent} 
              className="mt-2" 
            />
            <p className={`text-xs mt-1 ${getStatusColor(stats.currentCapacity.utilizationPercent)}`}>
              {stats.currentCapacity.utilizationPercent}% utilization
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Queue Status</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{queueStatus.stats.queueDepth}</div>
            <p className="text-xs text-muted-foreground">
              jobs pending ({queueStatus.stats.activeWorkers} active)
            </p>
            <div className="flex justify-between text-xs mt-2">
              <span>Wait time: {stats.performance.queueWaitTime}s</span>
              <span>Workers: {queueStatus.stats.activeWorkers}/{queueStatus.stats.maxWorkers}</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.performance.averageProcessingTime}s</div>
            <p className="text-xs text-muted-foreground">average processing time</p>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs">Success rate:</span>
              {getPerformanceBadge(stats.performance.successRate)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Daily Costs</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${stats.costs.dailyCost}</div>
            <p className="text-xs text-muted-foreground">
              ${stats.costs.costPerStudent} per student
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Projected monthly: ${stats.costs.projectedMonthlyCost}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tabs */}
      <Tabs defaultValue="queue" className="space-y-4">
        <TabsList>
          <TabsTrigger value="queue">Queue Management</TabsTrigger>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="scaling">Auto-scaling</TabsTrigger>
          <TabsTrigger value="cache">Cache Analytics</TabsTrigger>
          <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {queueStatus.activeJobs.length === 0 ? (
                    <p className="text-gray-500 text-center py-4">No active jobs</p>
                  ) : (
                    queueStatus.activeJobs.slice(0, 5).map((job: any) => (
                      <div key={job.id} className="flex justify-between items-center p-3 bg-blue-50 rounded">
                        <div>
                          <span className="font-medium">{job.files?.length || 0} files</span>
                          <Badge className="ml-2">{job.priority}</Badge>
                        </div>
                        <div className="text-right">
                          <div>{Math.round(job.progress)}%</div>
                          <Progress value={job.progress} className="w-16 h-2" />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Queue Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span>Total Jobs Processed:</span>
                    <span className="font-medium">{queueStatus.stats.totalJobsProcessed}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Current Throughput:</span>
                    <span className="font-medium">{queueStatus.stats.currentThroughput} jobs/min</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Success Rate:</span>
                    <span className="font-medium">{Math.round(queueStatus.stats.successRate * 100)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Average Processing:</span>
                    <span className="font-medium">{Math.round(queueStatus.stats.averageProcessingTime / 1000)}s</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="performance" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">
                    {Math.round(stats.performance.successRate * 100)}%
                  </div>
                  <p className="text-sm text-gray-600">Success Rate</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">
                    {stats.performance.averageProcessingTime}s
                  </div>
                  <p className="text-sm text-gray-600">Avg Processing Time</p>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">
                    {queueStatus.stats.currentThroughput}
                  </div>
                  <p className="text-sm text-gray-600">Jobs/Minute</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="scaling" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                Auto-scaling Configuration
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span>Auto-scaling Status:</span>
                  <Badge className={queueStatus.autoScaling.enabled ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                    {queueStatus.autoScaling.enabled ? 'Enabled' : 'Disabled'}
                  </Badge>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-lg font-bold">{queueStatus.autoScaling.minConcurrency}</div>
                    <p className="text-xs text-gray-600">Min Workers</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold text-blue-600">{queueStatus.autoScaling.currentConcurrency}</div>
                    <p className="text-xs text-gray-600">Current Workers</p>
                  </div>
                  <div>
                    <div className="text-lg font-bold">{queueStatus.autoScaling.maxConcurrency}</div>
                    <p className="text-xs text-gray-600">Max Workers</p>
                  </div>
                </div>
                <Progress 
                  value={(queueStatus.autoScaling.currentConcurrency / queueStatus.autoScaling.maxConcurrency) * 100} 
                  className="mt-4" 
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cache" className="space-y-4">
          <CacheAnalytics />
        </TabsContent>

        <TabsContent value="recommendations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>System Recommendations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {stats.recommendations.map((recommendation, index) => (
                  <div key={index} className="flex items-start gap-3 p-3 bg-gray-50 rounded">
                    <CheckCircle className="h-5 w-5 text-blue-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm">{recommendation}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
