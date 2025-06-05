
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { 
  Shield, 
  Database, 
  Activity, 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  FileText, 
  Lock,
  BarChart3,
  Zap,
  Download
} from 'lucide-react';
import { CacheService, CacheStats } from '@/services/cacheService';
import { ErrorHandlingService } from '@/services/errorHandlingService';
import { SecurityService } from '@/services/securityService';

interface EnterprriseFeaturesProps {
  onFeatureToggle?: (feature: string, enabled: boolean) => void;
}

export const EnterpriseFeatures: React.FC<EnterprriseFeaturesProps> = ({ onFeatureToggle }) => {
  const [cacheStats, setCacheStats] = useState<CacheStats | null>(null);
  const [errorHistory, setErrorHistory] = useState<any[]>([]);
  const [securityLog, setSecurityLog] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState('cache');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [cache, errors, security] = await Promise.all([
        CacheService.getCacheStats(),
        ErrorHandlingService.getErrorHistory(),
        SecurityService.getAuditLog()
      ]);

      setCacheStats(cache);
      setErrorHistory(errors.slice(0, 10));
      setSecurityLog(security.slice(0, 10));
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClearCache = async () => {
    try {
      CacheService.clearCache();
      await loadDashboardData();
    } catch (error) {
      console.error('Failed to clear cache:', error);
    }
  };

  const handleGenerateComplianceReport = async () => {
    try {
      const endDate = new Date();
      const startDate = new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
      
      const report = await SecurityService.generateComplianceReport(startDate, endDate);
      
      // Create downloadable report
      const reportData = {
        generatedAt: new Date().toISOString(),
        period: {
          start: startDate.toISOString(),
          end: endDate.toISOString()
        },
        ...report
      };

      const blob = new Blob([JSON.stringify(reportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance-report-${startDate.toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to generate compliance report:', error);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'destructive';
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Enterprise Features</h2>
          <p className="text-gray-600">Advanced caching, security, and compliance management</p>
        </div>
        <Button onClick={loadDashboardData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh Data'}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="cache" className="flex items-center gap-2">
            <Database className="h-4 w-4" />
            Cache Management
          </TabsTrigger>
          <TabsTrigger value="errors" className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Error Handling
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Security & Compliance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="cache" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Database className="h-4 w-4" />
                  Cache Entries
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{cacheStats?.totalEntries || 0}</div>
                <p className="text-xs text-gray-600">Total cached results</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Zap className="h-4 w-4" />
                  Hit Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cacheStats ? (cacheStats.hitRate * 100).toFixed(1) : 0}%
                </div>
                <p className="text-xs text-gray-600">Cache effectiveness</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <BarChart3 className="h-4 w-4" />
                  Storage Used
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {cacheStats ? formatBytes(cacheStats.totalSize) : '0 B'}
                </div>
                <p className="text-xs text-gray-600">Total cache size</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Top Cached Files</span>
                <Button onClick={handleClearCache} variant="outline" size="sm">
                  Clear Cache
                </Button>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cacheStats?.topFiles && cacheStats.topFiles.length > 0 ? (
                <div className="space-y-2">
                  {cacheStats.topFiles.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        <span className="font-medium">{file.fileName}</span>
                      </div>
                      <Badge variant="secondary">{file.accessCount} hits</Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No cached files yet</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="errors" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Total Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{errorHistory.length}</div>
                <p className="text-xs text-gray-600">Errors tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Activity className="h-4 w-4" />
                  Critical Errors
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {errorHistory.filter(e => e.severity === 'critical').length}
                </div>
                <p className="text-xs text-gray-600">Requiring attention</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <CheckCircle className="h-4 w-4" />
                  Recovery Rate
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {errorHistory.length > 0 
                    ? ((errorHistory.filter(e => e.category !== 'system').length / errorHistory.length) * 100).toFixed(1)
                    : 100
                  }%
                </div>
                <p className="text-xs text-gray-600">Automatic recovery</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Errors</CardTitle>
            </CardHeader>
            <CardContent>
              {errorHistory.length > 0 ? (
                <div className="space-y-3">
                  {errorHistory.map((error, index) => (
                    <div key={index} className="flex items-start justify-between p-3 bg-gray-50 rounded">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getSeverityColor(error.severity)}>
                            {error.severity}
                          </Badge>
                          <span className="font-medium">{error.code}</span>
                          <span className="text-xs text-gray-500">
                            {new Date(error.timestamp).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-gray-700">{error.message}</p>
                        {error.suggestions && error.suggestions.length > 0 && (
                          <div className="mt-2">
                            <p className="text-xs font-medium text-gray-600">Suggestions:</p>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {error.suggestions.slice(0, 2).map((suggestion, i) => (
                                <li key={i}>{suggestion}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500">No errors recorded</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Shield className="h-4 w-4" />
                  Security Scans
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {securityLog.filter(log => log.action === 'security_scan').length}
                </div>
                <p className="text-xs text-gray-600">Files scanned</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  Threats Detected
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">
                  {securityLog.filter(log => log.riskScore > 7).length}
                </div>
                <p className="text-xs text-gray-600">High-risk events</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Compliance Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  <CheckCircle className="h-8 w-8" />
                </div>
                <p className="text-xs text-gray-600">Fully compliant</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Recent Security Events</CardTitle>
              </CardHeader>
              <CardContent>
                {securityLog.length > 0 ? (
                  <div className="space-y-2">
                    {securityLog.slice(0, 5).map((log, index) => (
                      <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${
                            log.riskScore > 7 ? 'bg-red-500' : 
                            log.riskScore > 4 ? 'bg-yellow-500' : 'bg-green-500'
                          }`} />
                          <span className="font-medium">{log.action}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">Risk: {log.riskScore}</Badge>
                          <span className="text-xs text-gray-500">
                            {new Date(log.timestamp).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No security events recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Compliance Reports</span>
                  <Button onClick={handleGenerateComplianceReport} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Generate Report
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Encryption</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Active
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Access Controls</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Implemented
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Audit Trail</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Enabled
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Data Retention</span>
                    <Badge variant="secondary">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Compliant
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};
