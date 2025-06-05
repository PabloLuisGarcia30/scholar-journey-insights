
import React from 'react';
import { CheckCircle, Clock, AlertCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

export interface ProcessingStep {
  id: string;
  name: string;
  description: string;
  status: 'pending' | 'active' | 'completed' | 'error';
  progress?: number;
  estimatedTime?: number;
  startTime?: number;
  endTime?: number;
  metadata?: {
    confidence?: number;
    detections?: number;
    reliability?: number;
    method?: string;
  };
  error?: string;
}

interface EnhancedProgressIndicatorProps {
  steps: ProcessingStep[];
  currentStep?: string;
  overallProgress: number;
  estimatedTimeRemaining?: number;
  className?: string;
}

export const EnhancedProgressIndicator: React.FC<EnhancedProgressIndicatorProps> = ({
  steps,
  currentStep,
  overallProgress,
  estimatedTimeRemaining,
  className = ''
}) => {
  const getStepIcon = (step: ProcessingStep) => {
    switch (step.status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-600" />;
      case 'active':
        return <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />;
      case 'error':
        return <AlertCircle className="h-5 w-5 text-red-600" />;
      default:
        return <Clock className="h-5 w-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ProcessingStep['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-100 border-green-300';
      case 'active': return 'bg-blue-100 border-blue-300';
      case 'error': return 'bg-red-100 border-red-300';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds < 60) return `${Math.round(seconds)}s`;
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.round(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getElapsedTime = (step: ProcessingStep) => {
    if (!step.startTime) return null;
    const endTime = step.endTime || Date.now();
    const elapsed = (endTime - step.startTime) / 1000;
    return formatTime(elapsed);
  };

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            Processing Progress
            <Badge variant="outline">{Math.round(overallProgress)}%</Badge>
          </CardTitle>
          {estimatedTimeRemaining && (
            <div className="text-sm text-gray-600">
              ~{formatTime(estimatedTimeRemaining)} remaining
            </div>
          )}
        </div>
        <Progress value={overallProgress} className="w-full" />
      </CardHeader>
      <CardContent className="space-y-4">
        {steps.map((step, index) => (
          <div
            key={step.id}
            className={`p-4 rounded-lg border-2 transition-all ${getStatusColor(step.status)}`}
          >
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 mt-1">
                {getStepIcon(step)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{step.name}</h4>
                  <div className="flex items-center gap-2">
                    {step.status === 'active' && step.progress !== undefined && (
                      <Badge variant="secondary">{Math.round(step.progress)}%</Badge>
                    )}
                    {step.status === 'completed' && (
                      <Badge variant="outline" className="text-green-700">
                        ✓ Complete
                      </Badge>
                    )}
                    {step.status === 'error' && (
                      <Badge variant="destructive">Error</Badge>
                    )}
                  </div>
                </div>
                
                <p className="text-sm text-gray-600 mt-1">{step.description}</p>
                
                {/* Progress bar for active step */}
                {step.status === 'active' && step.progress !== undefined && (
                  <Progress value={step.progress} className="mt-2 h-2" />
                )}
                
                {/* Metadata display */}
                {step.metadata && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {step.metadata.confidence !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Confidence: {(step.metadata.confidence * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {step.metadata.detections !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Detections: {step.metadata.detections}
                      </Badge>
                    )}
                    {step.metadata.reliability !== undefined && (
                      <Badge variant="outline" className="text-xs">
                        Reliability: {(step.metadata.reliability * 100).toFixed(1)}%
                      </Badge>
                    )}
                    {step.metadata.method && (
                      <Badge variant="outline" className="text-xs">
                        Method: {step.metadata.method}
                      </Badge>
                    )}
                  </div>
                )}
                
                {/* Timing information */}
                <div className="mt-2 flex items-center gap-4 text-xs text-gray-500">
                  {getElapsedTime(step) && (
                    <span>Duration: {getElapsedTime(step)}</span>
                  )}
                  {step.estimatedTime && step.status === 'active' && (
                    <span>Est. {formatTime(step.estimatedTime)} remaining</span>
                  )}
                </div>
                
                {/* Error message */}
                {step.error && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {step.error}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
