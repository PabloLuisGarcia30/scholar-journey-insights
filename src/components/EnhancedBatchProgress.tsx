import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Clock, Zap, DollarSign, Target, AlertCircle } from 'lucide-react';
import { EnhancedBatchGradingService, EnhancedBatchJob } from '@/services/enhancedBatchGradingService';

interface EnhancedBatchProgressProps {
  jobId: string;
  onComplete?: (results: any[]) => void;
}

export const EnhancedBatchProgress: React.FC<EnhancedBatchProgressProps> = ({
  jobId,
  onComplete
}) => {
  const [job, setJob] = useState<EnhancedBatchJob | null>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!jobId) return;

    // Subscribe to job updates
    EnhancedBatchGradingService.subscribeToJob(jobId, (updatedJob) => {
      setJob(updatedJob);
      
      if (updatedJob.status === 'completed' && onComplete) {
        onComplete(updatedJob.results);
      }
    });

    // Get initial job state
    const initialJob = EnhancedBatchGradingService.getJob(jobId);
    if (initialJob) {
      setJob(initialJob);
    }

    return () => {
      EnhancedBatchGradingService.unsubscribeFromJob(jobId);
    };
  }, [jobId, onComplete]);

  if (!job || !isVisible) {
    return null;
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'processing': return 'bg-blue-500';
      case 'pending': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const formatTime = (ms: number) => {
    if (ms < 1000) return `${ms}ms`;
    const seconds = Math.floor(ms / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  };

  const totalQuestions = job.questions.length;
  const processedQuestions = Math.floor((job.progress / 100) * totalQuestions);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">Enhanced Batch Grading</CardTitle>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className={`${getStatusColor(job.status)} text-white`}>
            {job.status.toUpperCase()}
          </Badge>
          {job.priority !== 'normal' && (
            <Badge variant="secondary">
              {job.priority.toUpperCase()}
            </Badge>
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress: {processedQuestions}/{totalQuestions} questions</span>
            <span>{job.progress.toFixed(1)}%</span>
          </div>
          <Progress value={job.progress} className="w-full" />
        </div>

        {/* Complexity Distribution */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-lg font-semibold text-green-600">
              {job.processingMetrics.complexityDistribution?.simple || 0}
            </div>
            <div className="text-xs text-gray-500">Simple (Local AI)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-blue-600">
              {job.processingMetrics.complexityDistribution?.medium || 0}
            </div>
            <div className="text-xs text-gray-500">Medium (Batched)</div>
          </div>
          <div className="text-center">
            <div className="text-lg font-semibold text-purple-600">
              {job.processingMetrics.complexityDistribution?.complex || 0}
            </div>
            <div className="text-xs text-gray-500">Complex (AI)</div>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">
                {job.estimatedTimeRemaining ? `${job.estimatedTimeRemaining}s remaining` : 'Calculating...'}
              </div>
              <div className="text-xs text-gray-500">Time Remaining</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Target className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{job.processingMetrics.batchesCreated || 0}</div>
              <div className="text-xs text-gray-500">Smart Batches</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">{job.processingMetrics.totalApiCalls || 0}</div>
              <div className="text-xs text-gray-500">API Calls</div>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-gray-500" />
            <div>
              <div className="text-sm font-medium">${job.processingMetrics.costEstimate.toFixed(4)}</div>
              <div className="text-xs text-gray-500">Est. Cost</div>
            </div>
          </div>
        </div>

        {/* Processing Time */}
        {job.startedAt && (
          <div className="text-sm text-gray-600">
            {job.status === 'completed' && job.completedAt ? (
              <span>✅ Completed in {formatTime(job.completedAt - job.startedAt)}</span>
            ) : (
              <span>⏱️ Running for {formatTime(Date.now() - job.startedAt)}</span>
            )}
          </div>
        )}

        {/* Errors */}
        {job.errors.length > 0 && (
          <div className="bg-red-50 border border-red-200 rounded-md p-3">
            <div className="flex items-center gap-2 text-red-800 text-sm font-medium mb-1">
              <AlertCircle className="h-4 w-4" />
              {job.errors.length} Error{job.errors.length > 1 ? 's' : ''}
            </div>
            <div className="text-red-700 text-xs">
              {job.errors.slice(0, 2).map((error, index) => (
                <div key={index}>• {error.errorMessage || 'Unknown error'}</div>
              ))}
              {job.errors.length > 2 && (
                <div>• ... and {job.errors.length - 2} more</div>
              )}
            </div>
          </div>
        )}

        {/* Success Summary */}
        {job.status === 'completed' && (
          <div className="bg-green-50 border border-green-200 rounded-md p-3">
            <div className="text-green-800 text-sm font-medium">
              🎉 Batch grading completed successfully!
            </div>
            <div className="text-green-700 text-xs mt-1">
              {job.results.length} questions graded with enhanced AI processing
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
