
import React, { useState, useEffect } from 'react';
import { Activity, TrendingUp, AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { PerformanceMonitoringService, SystemHealthMetrics, PerformanceReport } from '@/services/performanceMonitoringService';

export const PerformanceDashboard: React.FC = () => {
  const [healthMetrics, setHealthMetrics] = useState<SystemHealthMetrics | null>(null);
  const [currentReport, setCurrentReport] = useState<PerformanceReport | null>(null);
  const [selectedPeriod, setSelectedPeriod] = useState<'1h' | '24h' | '7d' | '30d'>('24h');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    PerformanceMonitoringService.startMonitoring();
    refreshData();

    const interval = setInterval(refreshData, 30000); // Refresh every 30 seconds
    return () => {
      clearInterval(interval);
      PerformanceMonitoringService.stopMonitoring();
    };
  }, []);

  useEffect(() => {
    refreshReport();
  }, [selectedPeriod]);

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      const health = PerformanceMonitoringService.getSystemHealth();
      setHealthMetrics(health);
    } finally {
      setIsRefreshing(false);
    }
  };

  const refreshReport = () => {
    const report = PerformanceMonitoringService.generatePerformanceReport(selectedPeriod);
    setCurrentReport(report);
  };

  const handleExportMetrics = () => {
    const exportData = PerformanceMonitoringService.exportMetrics();
    const blob = new Blob([exportData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-metrics-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getHealthBadgeVariant = (status: string) => {
    switch (status) {
      case 'healthy': return 'default';
      case 'degraded': return 'secondary';
      case 'down': return 'destructive';
      default: return 'outline';
    }
  };

  const getLoadColor = (load: SystemHealthMetrics['systemLoad']) => {
    switch (load) {
      case 'low': return 'text-green-600';
      case 'medium': return 'text-yellow-600';
      case 'high': return 'text-orange-600';
      case 'critical': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  if (!healthMetrics || !currentReport) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Activity className="h-6 w-6" />
          Performance Dashboard
        </h2>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={refreshData}
            disabled={isRefreshing}
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleExportMetrics}
          >
            <Download className="h-4 w-4" />
            Export
          </Button>
        </div>
      </div>

      {/* System Health Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Success Rate</p>
                <p className="text-2xl font-bold text-green-600">
                  {(healthMetrics.successRate * 100).toFixed(1)}%
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Processing Time</p>
                <p className="text-2xl font-bold">
                  {(healthMetrics.averageProcessingTime / 1000).toFixed(1)}s
                </p>
              </div>
              <Activity className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">System Load</p>
                <p className={`text-2xl font-bold capitalize ${getLoadColor(healthMetrics.systemLoad)}`}>
                  {healthMetrics.systemLoad}
                </p>
              </div>
              <AlertTriangle className={`h-8 w-8 ${getLoadColor(healthMetrics.systemLoad)}`} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Throughput</p>
                <p className="text-2xl font-bold">
                  {healthMetrics.throughput}/hr
                </p>
              </div>
              <TrendingUp className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* API Health Status */}
      <Card>
        <CardHeader>
          <CardTitle>API Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Google Vision</span>
              <Badge variant={getHealthBadgeVariant(healthMetrics.apiHealthStatus.googleVision)}>
                {healthMetrics.apiHealthStatus.googleVision}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">Roboflow</span>
              <Badge variant={getHealthBadgeVariant(healthMetrics.apiHealthStatus.roboflow)}>
                {healthMetrics.apiHealthStatus.roboflow}
              </Badge>
            </div>
            <div className="flex items-center justify-between p-3 border rounded-lg">
              <span className="font-medium">OpenAI</span>
              <Badge variant={getHealthBadgeVariant(healthMetrics.apiHealthStatus.openai)}>
                {healthMetrics.apiHealthStatus.openai}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Reports */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Reports</CardTitle>
          <Tabs value={selectedPeriod} onValueChange={(value: any) => setSelectedPeriod(value)}>
            <TabsList>
              <TabsTrigger value="1h">Last Hour</TabsTrigger>
              <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
              <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
              <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {/* Statistics Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {currentReport.totalOperations}
                </div>
                <div className="text-sm text-gray-600">Total Operations</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {(currentReport.successRate * 100).toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Success Rate</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(currentReport.averageProcessingTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-gray-600">Avg Time</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {currentReport.topErrors.length}
                </div>
                <div className="text-sm text-gray-600">Error Types</div>
              </div>
            </div>

            {/* Top Errors */}
            {currentReport.topErrors.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Top Errors</h4>
                <div className="space-y-2">
                  {currentReport.topErrors.slice(0, 5).map((error, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-red-50 rounded">
                      <span className="text-sm text-red-800">{error.error}</span>
                      <Badge variant="destructive">{error.count}</Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {currentReport.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium mb-3">Recommendations</h4>
                <div className="space-y-2">
                  {currentReport.recommendations.map((rec, index) => (
                    <div key={index} className="p-3 bg-blue-50 border-l-4 border-blue-400 rounded">
                      <p className="text-sm text-blue-800">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
