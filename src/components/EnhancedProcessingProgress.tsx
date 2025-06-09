
import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Clock, FileText, CheckCircle, Loader } from 'lucide-react';
import { TimeEstimate, ProcessingStage, TimeEstimationService } from '@/services/timeEstimationService';

interface EnhancedProcessingProgressProps {
  isProcessing: boolean;
  progress: number;
  currentStage: 'upload' | 'extracting' | 'analyzing' | 'complete';
  timeEstimate: TimeEstimate | null;
  processedFiles: number;
  totalFiles: number;
  processingStartTime?: number;
}

const EnhancedProcessingProgress: React.FC<EnhancedProcessingProgressProps> = ({
  isProcessing,
  progress,
  currentStage,
  timeEstimate,
  processedFiles,
  totalFiles,
  processingStartTime
}) => {
  const [currentTime, setCurrentTime] = React.useState(Date.now());
  const [adjustedEstimate, setAdjustedEstimate] = React.useState<TimeEstimate | null>(timeEstimate);

  React.useEffect(() => {
    if (!isProcessing) return;

    const interval = setInterval(() => {
      setCurrentTime(Date.now());
      
      // Update estimate based on actual progress
      if (timeEstimate && processingStartTime && processedFiles > 0) {
        const elapsedTime = Date.now() - processingStartTime;
        const updated = TimeEstimationService.updateEstimateBasedOnProgress(
          timeEstimate,
          currentStage,
          elapsedTime,
          processedFiles,
          totalFiles
        );
        setAdjustedEstimate(updated);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isProcessing, timeEstimate, processingStartTime, processedFiles, totalFiles, currentStage]);

  if (!isProcessing && !timeEstimate) return null;

  const estimate = adjustedEstimate || timeEstimate;
  const stages = estimate ? TimeEstimationService.getProcessingStages(estimate) : [];
  const currentStageIndex = stages.findIndex(stage => stage.name === currentStage);
  
  const elapsedTime = processingStartTime ? currentTime - processingStartTime : 0;
  const remainingTime = estimate ? Math.max(0, estimate.totalTimeMs - elapsedTime) : 0;

  const getStageIcon = (stageName: string, isActive: boolean, isComplete: boolean) => {
    if (isComplete) return <CheckCircle className="h-4 w-4 text-green-600" />;
    if (isActive) return <Loader className="h-4 w-4 animate-spin text-blue-600" />;
    return <FileText className="h-4 w-4 text-gray-400" />;
  };

  return (
    <div className="space-y-6">
      {/* Time Estimation Header */}
      {estimate && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-blue-600" />
              <span className="font-medium text-blue-900">
                {isProcessing ? 'Processing Time' : 'Estimated Processing Time'}
              </span>
            </div>
            {estimate.batchOptimization && (
              <Badge variant="secondary" className="bg-green-100 text-green-800">
                Batch Optimization Active
              </Badge>
            )}
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-lg font-bold text-blue-600">
                {TimeEstimationService.formatTime(estimate.totalTimeMs)}
              </div>
              <div className="text-sm text-blue-700">Total Time</div>
            </div>
            
            {isProcessing && remainingTime > 0 && (
              <div className="text-center">
                <div className="text-lg font-bold text-orange-600">
                  {TimeEstimationService.formatTime(remainingTime)}
                </div>
                <div className="text-sm text-orange-700">Remaining</div>
              </div>
            )}
            
            <div className="text-center">
              <div className="text-lg font-bold text-green-600">
                {processedFiles}/{totalFiles}
              </div>
              <div className="text-sm text-green-700">Files Processed</div>
            </div>
            
            {estimate.breakdown.batchSavings && (
              <div className="text-center">
                <div className="text-lg font-bold text-purple-600">
                  {TimeEstimationService.formatTime(estimate.breakdown.batchSavings)}
                </div>
                <div className="text-sm text-purple-700">Time Saved</div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Multi-Stage Progress */}
      {isProcessing && (
        <div className="space-y-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">Processing Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          
          {/* Main Progress Bar */}
          <Progress value={progress} className="h-3" />
          
          {/* Stage Indicators */}
          <div className="space-y-3">
            {stages.map((stage, index) => {
              const isActive = index === currentStageIndex;
              const isComplete = index < currentStageIndex;
              const stageProgress = isComplete ? 100 : isActive ? progress : 0;
              
              return (
                <div key={stage.name} className="space-y-2">
                  <div className="flex items-center gap-3">
                    {getStageIcon(stage.name, isActive, isComplete)}
                    <span className={`text-sm font-medium ${
                      isActive ? 'text-blue-900' : 
                      isComplete ? 'text-green-700' : 'text-gray-500'
                    }`}>
                      {stage.label}
                    </span>
                    {isActive && (
                      <Badge variant="outline" className="ml-auto">
                        {TimeEstimationService.formatTime(stage.estimatedDuration)}
                      </Badge>
                    )}
                  </div>
                  
                  {(isActive || isComplete) && (
                    <div className="ml-7">
                      <Progress 
                        value={stageProgress} 
                        className="h-1" 
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          {/* Processing Speed */}
          {elapsedTime > 0 && processedFiles > 0 && (
            <div className="text-center text-sm text-muted-foreground">
              Processing speed: {((processedFiles / elapsedTime) * 60000).toFixed(1)} files/minute
            </div>
          )}
        </div>
      )}

      {/* Time Breakdown (shown before processing starts) */}
      {!isProcessing && estimate && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h4 className="font-medium mb-3">Processing Breakdown:</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span>Text Extraction (OCR):</span>
              <span>{TimeEstimationService.formatTime(estimate.ocrTimeMs)}</span>
            </div>
            <div className="flex justify-between">
              <span>Test Analysis:</span>
              <span>{TimeEstimationService.formatTime(estimate.analysisTimeMs)}</span>
            </div>
            {estimate.breakdown.batchSavings && (
              <div className="flex justify-between text-green-600 font-medium">
                <span>Batch Processing Savings:</span>
                <span>-{TimeEstimationService.formatTime(estimate.breakdown.batchSavings)}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-medium">
              <span>Total Estimated Time:</span>
              <span>{TimeEstimationService.formatTime(estimate.totalTimeMs)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedProcessingProgress;
