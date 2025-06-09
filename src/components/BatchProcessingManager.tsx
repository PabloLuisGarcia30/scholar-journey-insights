
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  Play, 
  Pause, 
  Square, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { BatchProcessingService } from '@/services/batchProcessingService';

export const BatchProcessingManager: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [queueStatus, setQueueStatus] = useState<any>(null);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    const loadStatus = async () => {
      try {
        const status = await BatchProcessingService.getQueueStatus();
        setQueueStatus(status);
        setStats(status.stats);
      } catch (error) {
        console.error('Failed to load batch processing status:', error);
      }
    };

    loadStatus();
    const interval = setInterval(loadStatus, 5000); // Update every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const handleStart = async () => {
    try {
      await BatchProcessingService.startProcessing();
      setIsRunning(true);
    } catch (error) {
      console.error('Failed to start batch processing:', error);
    }
  };

  const handlePause = async () => {
    try {
      await BatchProcessingService.pauseProcessing();
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to pause batch processing:', error);
    }
  };

  const handleStop = async () => {
    try {
      await BatchProcessingService.stopProcessing();
      setIsRunning(false);
    } catch (error) {
      console.error('Failed to stop batch processing:', error);
    }
  };

  if (!queueStatus) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">Loading batch processing status...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Batch Processing Manager</span>
            <div className="flex gap-2">
              <Button
                onClick={handleStart}
                disabled={isRunning}
                size="sm"
                variant="default"
              >
                <Play className="h-4 w-4 mr-2" />
                Start
              </Button>
              <Button
                onClick={handlePause}
                disabled={!isRunning}
                size="sm"
                variant="outline"
              >
                <Pause className="h-4 w-4 mr-2" />
                Pause
              </Button>
              <Button
                onClick={handleStop}
                disabled={!isRunning}
                size="sm"
                variant="destructive"
              >
                <Square className="h-4 w-4 mr-2" />
                Stop
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{queueStatus.stats.queueDepth}</div>
              <p className="text-sm text-muted-foreground">Jobs in Queue</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{queueStatus.stats.activeWorkers}</div>
              <p className="text-sm text-muted-foreground">Active Workers</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">{queueStatus.stats.currentThroughput}</div>
              <p className="text-sm text-muted-foreground">Jobs/Minute</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {queueStatus.activeJobs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Jobs</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {queueStatus.activeJobs.map((job: any) => (
                <div key={job.id} className="flex items-center justify-between p-3 bg-accent rounded">
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{job.priority}</Badge>
                    <span className="text-sm">
                      {job.files?.length || 0} files
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={job.progress} className="w-20" />
                    <span className="text-sm">{Math.round(job.progress)}%</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
