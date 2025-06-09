
import React, { useState, useEffect } from 'react';
import { Upload, Play, Pause, Square, Clock, AlertCircle, CheckCircle, FileText } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { BatchProcessingService, BatchJob } from '@/services/batchProcessingService';
import { toast } from 'sonner';

interface BatchProcessingManagerProps {
  onJobComplete?: (job: BatchJob) => void;
}

export const BatchProcessingManager: React.FC<BatchProcessingManagerProps> = ({
  onJobComplete
}) => {
  const [queueStatus, setQueueStatus] = useState(BatchProcessingService.getQueueStatus());
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [priority, setPriority] = useState<'low' | 'normal' | 'high'>('normal');

  useEffect(() => {
    BatchProcessingService.loadQueueState();
    
    const interval = setInterval(() => {
      setQueueStatus(BatchProcessingService.getQueueStatus());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleCreateBatchJob = () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files first');
      return;
    }

    const jobId = BatchProcessingService.createBatchJob(selectedFiles, priority);
    toast.success(`Batch job created with ${selectedFiles.length} files`);
    
    // Subscribe to job updates
    BatchProcessingService.subscribeToJob(jobId, (job) => {
      if (job.status === 'completed' || job.status === 'failed') {
        onJobComplete?.(job);
        if (job.status === 'completed') {
          toast.success(`Batch job completed: ${job.results.length} files processed`);
        } else {
          toast.error(`Batch job failed: ${job.errors.length} errors`);
        }
      }
    });

    setSelectedFiles([]);
  };

  const handlePauseJob = (jobId: string) => {
    if (BatchProcessingService.pauseJob(jobId)) {
      toast.info('Job paused');
    }
  };

  const handleResumeJob = (jobId: string) => {
    if (BatchProcessingService.resumeJob(jobId)) {
      toast.info('Job resumed');
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusIcon = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'failed': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing': return <Play className="h-4 w-4 text-blue-600" />;
      case 'paused': return <Pause className="h-4 w-4 text-yellow-600" />;
      default: return <Clock className="h-4 w-4 text-gray-600" />;
    }
  };

  const getStatusColor = (status: BatchJob['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'failed': return 'bg-red-100 border-red-300';
      case 'processing': return 'bg-blue-100 border-blue-300';
      case 'paused': return 'bg-yellow-100 border-yellow-300';
      default: return 'bg-gray-100 border-gray-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Batch Job Creator */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Create Batch Job
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
              </select>
            </div>
            
            <Button 
              onClick={handleCreateBatchJob}
              disabled={selectedFiles.length === 0}
            >
              Create Batch Job
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Queue Status */}
      <Card>
        <CardHeader>
          <CardTitle>Processing Queue</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {queueStatus.activeJobs.length}
              </div>
              <div className="text-sm text-gray-600">Active</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {queueStatus.pendingJobs.length}
              </div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {queueStatus.completedJobs.length}
              </div>
              <div className="text-sm text-gray-600">Completed</div>
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
                      Batch Job ({job.files.length} files)
                    </span>
                    <Badge variant={job.priority === 'high' ? 'destructive' : 
                                 job.priority === 'normal' ? 'default' : 'secondary'}>
                      {job.priority}
                    </Badge>
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
                    {job.errors.length} error(s) encountered
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
            {queueStatus.completedJobs.slice(0, 5).map((job) => (
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
    </div>
  );
};
