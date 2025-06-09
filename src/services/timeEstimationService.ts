
export interface TimeEstimate {
  totalTimeMs: number;
  ocrTimeMs: number;
  analysisTimeMs: number;
  batchOptimization: boolean;
  estimatedCompletion: Date;
  breakdown: {
    fileProcessing: number;
    textExtraction: number;
    testAnalysis: number;
    batchSavings?: number;
  };
}

export interface ProcessingStage {
  name: string;
  label: string;
  estimatedDuration: number;
  color: string;
}

export class TimeEstimationService {
  private static readonly BASE_OCR_TIME = 800; // ms base time
  private static readonly VARIABLE_OCR_TIME = 1200; // ms per file
  private static readonly BASE_ANALYSIS_TIME = 2000; // ms base analysis
  private static readonly ANALYSIS_PER_FILE = 3000; // ms per file analysis
  private static readonly BATCH_OPTIMIZATION_FACTOR = 0.6;
  private static readonly PDF_FACTOR = 1.3; // PDFs take 30% longer
  private static readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  private static readonly LARGE_FILE_FACTOR = 1.5;

  static estimateProcessingTime(files: File[]): TimeEstimate {
    const fileCount = files.length;
    const hasBatchProcessing = fileCount > 1;
    
    // Calculate OCR time based on files
    let ocrTime = this.BASE_OCR_TIME;
    files.forEach(file => {
      let fileOcrTime = this.VARIABLE_OCR_TIME;
      
      // PDF files take longer
      if (file.type === 'application/pdf') {
        fileOcrTime *= this.PDF_FACTOR;
      }
      
      // Large files take longer
      if (file.size > this.LARGE_FILE_THRESHOLD) {
        fileOcrTime *= this.LARGE_FILE_FACTOR;
      }
      
      ocrTime += fileOcrTime;
    });

    // Calculate analysis time
    let analysisTime = this.BASE_ANALYSIS_TIME + (fileCount * this.ANALYSIS_PER_FILE);
    
    // Apply batch optimization
    let batchSavings = 0;
    if (hasBatchProcessing) {
      const originalTotal = ocrTime + analysisTime;
      ocrTime *= this.BATCH_OPTIMIZATION_FACTOR;
      analysisTime *= this.BATCH_OPTIMIZATION_FACTOR;
      batchSavings = originalTotal - (ocrTime + analysisTime);
    }

    const totalTime = ocrTime + analysisTime;
    const estimatedCompletion = new Date(Date.now() + totalTime);

    return {
      totalTimeMs: totalTime,
      ocrTimeMs: ocrTime,
      analysisTimeMs: analysisTime,
      batchOptimization: hasBatchProcessing,
      estimatedCompletion,
      breakdown: {
        fileProcessing: ocrTime * 0.3,
        textExtraction: ocrTime * 0.7,
        testAnalysis: analysisTime,
        batchSavings: batchSavings > 0 ? batchSavings : undefined
      }
    };
  }

  static getProcessingStages(estimate: TimeEstimate): ProcessingStage[] {
    const ocrDuration = estimate.ocrTimeMs;
    const analysisDuration = estimate.analysisTimeMs;
    
    return [
      {
        name: 'upload',
        label: 'Preparing files...',
        estimatedDuration: Math.min(2000, ocrDuration * 0.1),
        color: 'bg-blue-500'
      },
      {
        name: 'extracting',
        label: 'Extracting text with Smart OCR...',
        estimatedDuration: ocrDuration,
        color: 'bg-orange-500'
      },
      {
        name: 'analyzing',
        label: 'Analyzing answers and generating scores...',
        estimatedDuration: analysisDuration,
        color: 'bg-green-500'
      },
      {
        name: 'complete',
        label: 'Processing complete!',
        estimatedDuration: 0,
        color: 'bg-emerald-500'
      }
    ];
  }

  static formatTime(ms: number): string {
    if (ms < 60000) {
      return `${Math.ceil(ms / 1000)}s`;
    }
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.ceil((ms % 60000) / 1000);
    return seconds > 0 ? `${minutes}m ${seconds}s` : `${minutes}m`;
  }

  static updateEstimateBasedOnProgress(
    originalEstimate: TimeEstimate,
    currentStage: string,
    elapsedTime: number,
    completedFiles: number,
    totalFiles: number
  ): TimeEstimate {
    const progressRatio = completedFiles / totalFiles;
    const remainingFiles = totalFiles - completedFiles;
    
    // Adjust remaining time based on actual performance
    let adjustedTotalTime = originalEstimate.totalTimeMs;
    
    if (progressRatio > 0) {
      const actualTimePerFile = elapsedTime / completedFiles;
      const estimatedTimePerFile = originalEstimate.totalTimeMs / totalFiles;
      const performanceRatio = actualTimePerFile / estimatedTimePerFile;
      
      // Adjust remaining time based on performance
      const remainingTime = remainingFiles * actualTimePerFile;
      adjustedTotalTime = elapsedTime + remainingTime;
    }

    return {
      ...originalEstimate,
      totalTimeMs: adjustedTotalTime,
      estimatedCompletion: new Date(Date.now() + (adjustedTotalTime - elapsedTime))
    };
  }
}
