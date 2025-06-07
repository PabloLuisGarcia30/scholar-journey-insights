
import React, { useState, useEffect } from 'react';
import { Upload, Play, Pause, Square, Clock, AlertCircle, CheckCircle, Settings, Zap } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { enhancedBatchService, EnhancedBatchJob } from '@/services/enhancedBatchProcessingService';
import { SystemDashboard } from './SystemDashboard';

interface EnhancedBatchProcessingManagerProps {
  onJobComplete?: (job: EnhancedBatchJob) => void;
}

export const EnhancedBatchProcessingManager: React.FC<EnhancedBatchProcessingManagerProps> = ({
  onJobComplete
}) => {
  const [queueStatus, setQueueStatus] = useState(enhancedBatchService.getQueueStatus());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high' | 'urgent'>('normal');
  const [autoScalingEnabled, setAutoScalingEnabled] = useState(true);

  useEffect(() => {
    const interval = setInterval(() => {
      setQueueStatus(enhancedBatchService.getQueueStatus());
    }, 2000); // Update every 2 seconds for more responsive UI

    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setSelectedFiles(files);
      
      // Validate file sizes and types
      const oversizedFiles = files.filter(file => file.size > 10 * 1024 * 1024); // 10MB limit
      if (oversizedFiles.length > 0) {
        toast.error(`${oversizedFiles.length} files are too large (max 10MB each)`);
        return;
      }
    }
  };

  const handleCreateBatchJob = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files first');
      return;
    }

    if (selectedFiles.length > 50) {
      toast.error('Maximum 50 files per batch');
      return;
    }

    try {
      const jobId = await enhancedBatchService.createBatchJob(selectedFiles, priority);
      toast.success(`Batch job created with ${selectedFiles.length} files`);
      
      // Subscribe to job updates
      enhancedBatchService.subscribeToJob(jobId, (job) => {
        if (job.status === 'completed') {
          toast.success(`Batch job completed: ${job.results.length} files processed successfully`);
          onJobComplete?.(job);
        } else if (job.status === 'failed') {
          toast.error(`Batch job failed: ${job.errors.length} errors occurred`);
        }
      });

      setSelectedFiles([]);
    } catch (error) {
      toast.error(`Failed to create batch job: ${error.message}`);
    }
  };

  const handlePauseJob = (jobId: string) => {
    if (enhancedBatchService.pauseJob(jobId)) {
      toast.info('Job paused');
    } else {
      toast.error('Failed to pause job');
    }
  };

  const handleResumeJob = (jobId: string) => {
    if (enhancedBatchService.resumeJob(jobId)) {
      toast.info('Job resumed');
    } else {
      toast.error('Failed to resume job');
    }
  };

  const toggleAutoScaling = () => {
    const newState = !autoScalingEnabled;
    setAutoScalingEnabled(newState);
    enhancedBatchService.updateAutoScalingConfig({ enabled: newState });
    toast.info(`Auto-scaling ${newState ? 'enabled' : 'disabled'}`);
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: EnhancedBatchJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing': return <Play className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: EnhancedBatchJob['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'failed': return 'bg-red-100 border-red-300';
      case 'processing': return 'bg-blue-100 border-blue-300';
      case 'paused': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'destructive';
      case 'high': return 'destructive';
      case 'normal': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="batch-jobs" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="batch-jobs">Batch Processing</TabsTrigger>
          <TabsTrigger value="system-dashboard">System Dashboard</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="batch-jobs" className="space-y-6">
          {/* Enhanced Batch Job Creator */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Create Enhanced Batch Job
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileSelect}
                  className="mb-3"
                />
                {selectedFiles.length > 0 && (
                  <div className="text-sm text-gray-600">
                    Selected: {selectedFiles.length} files 
                    ({(selectedFiles.reduce((sum, file) => sum + file.size, 0) / 1024 / 1024).toFixed(1)} MB total)
                  </div>
                )}
              </div>
              
              <div className="flex items-center gap-4">
                <div>
                  <label className="text-sm font-medium">Priority:</label>
                  <select 
                    value={priority} 
                    onChange={(e) => setPriority(e.target.value as any)}
                    className="ml-2 p-1 border rounded"
                  >
                    <option value="low">Low</option>
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>
                
                <Button 
                  onClick={handleCreateBatchJob}
                  disabled={selectedFiles.length === 0}
                >
                  Create Enhanced Batch Job
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Queue Status */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Enhanced Processing Queue</span>
                <Badge className={autoScalingEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                  <Zap className="h-3 w-3 mr-1" />
                  Auto-scaling {autoScalingEnabled ? 'ON' : 'OFF'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">
                    {queueStatus.stats.activeWorkers}
                  </div>
                  <div className="text-sm text-gray-600">Active Workers</div>
                  <div className="text-xs text-gray-500">
                    of {queueStatus.stats.maxWorkers} max
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-yellow-600">
                    {queueStatus.stats.queueDepth}
                  </div>
                  <div className="text-sm text-gray-600">Pending Jobs</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">
                    {queueStatus.stats.totalJobsProcessed}
                  </div>
                  <div className="text-sm text-gray-600">Total Processed</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">
                    {queueStatus.stats.currentThroughput}
                  </div>
                  <div className="text-sm text-gray-600">Jobs/Minute</div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>System Utilization:</span>
                  <span>{Math.round((queueStatus.stats.activeWorkers / queueStatus.stats.maxWorkers) * 100)}%</span>
                </div>
                <Progress 
                  value={(queueStatus.stats.activeWorkers / queueStatus.stats.maxWorkers) * 100} 
                  className="h-2" 
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Success Rate: {Math.round(queueStatus.stats.successRate * 100)}%</span>
                  <span>Avg Time: {Math.round(queueStatus.stats.averageProcessingTime / 1000)}s</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Active Jobs */}
          {queueStatus.activeJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Active Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {queueStatus.activeJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className={`p-4 rounded-lg border-2 ${getStatusColor(job.status)}`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">
                          {job.files.length} files
                        </span>
                        <Badge variant={getPriorityColor(job.priority) as any}>
                          {job.priority}
                        </Badge>
                        {job.processingMetrics && (
                          <span className="text-xs text-gray-500">
                            {job.processingMetrics.filesPerSecond.toFixed(1)} files/s
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {job.status === 'processing' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handlePauseJob(job.id)}
                          >
                            <Pause className="h-3 w-3" />
                          </Button>
                        )}
                        {job.status === 'paused' && (
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => handleResumeJob(job.id)}
                          >
                            <Play className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </div>
                    
                    <Progress value={job.progress} className="mb-2" />
                    
                    <div className="flex justify-between text-sm text-gray-600">
                      <span>{Math.round(job.progress)}% complete</span>
                      {job.estimatedTimeRemaining && (
                        <span>~{formatTime(job.estimatedTimeRemaining)} remaining</span>
                      )}
                    </div>
                    
                    {job.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        {job.errors.length} error(s): {job.errors[0]}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Recent Completed Jobs */}
          {queueStatus.completedJobs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Completed Jobs</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {queueStatus.completedJobs.map((job) => (
                  <div 
                    key={job.id} 
                    className={`p-3 rounded-lg border ${getStatusColor(job.status)}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(job.status)}
                        <span className="font-medium">
                          {job.files.length} files
                        </span>
                        <Badge variant="outline">
                          {job.status}
                        </Badge>
                      </div>
                      
                      <div className="text-sm text-gray-600">
                        {job.completedAt && new Date(job.completedAt).toLocaleTimeString()}
                      </div>
                    </div>
                    
                    {job.results.length > 0 && (
                      <div className="mt-2 text-sm text-green-600">
                        {job.results.length} files processed successfully
                      </div>
                    )}
                    
                    {job.errors.length > 0 && (
                      <div className="mt-2 text-sm text-red-600">
                        {job.errors.length} error(s): {job.errors[0]}
                      </div>
                    )}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="system-dashboard">
          <SystemDashboard />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                System Configuration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium">Auto-scaling</h4>
                  <p className="text-sm text-gray-600">
                    Automatically adjust worker capacity based on queue depth
                  </p>
                </div>
                <Button
                  variant={autoScalingEnabled ? "default" : "outline"}
                  onClick={toggleAutoScaling}
                >
                  {autoScalingEnabled ? "Enabled" : "Disabled"}
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium">Min Workers</label>
                  <input 
                    type="number" 
                    value={queueStatus.autoScaling.minConcurrency}
                    className="w-full p-2 border rounded mt-1"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Current Workers</label>
                  <input 
                    type="number" 
                    value={queueStatus.autoScaling.currentConcurrency}
                    className="w-full p-2 border rounded mt-1 bg-blue-50"
                    readOnly
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Max Workers</label>
                  <input 
                    type="number" 
                    value={queueStatus.autoScaling.maxConcurrency}
                    className="w-full p-2 border rounded mt-1"
                    readOnly
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
