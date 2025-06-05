
export interface ProcessingProgress {
  sessionId: string;
  fileName: string;
  currentStep: 'upload' | 'extracting' | 'analyzing' | 'complete';
  extractedText?: string;
  examId?: string;
  studentName?: string;
  structuredData?: any;
  analysisResult?: any;
  timestamp: number;
  estimatedTimeRemaining?: number;
  processingStartTime?: number;
}

export class ProgressService {
  private static readonly STORAGE_KEY = 'uploadTest_progress';
  private static readonly SESSION_TIMEOUT = 24 * 60 * 60 * 1000; // 24 hours

  static saveProgress(progress: ProcessingProgress): void {
    try {
      const existingProgress = this.getAllProgress();
      existingProgress[progress.sessionId] = {
        ...progress,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(existingProgress));
      console.log('Progress saved for session:', progress.sessionId);
    } catch (error) {
      console.error('Failed to save progress:', error);
    }
  }

  static getProgress(sessionId: string): ProcessingProgress | null {
    try {
      const allProgress = this.getAllProgress();
      const progress = allProgress[sessionId];
      
      if (!progress) return null;
      
      // Check if progress has expired
      if (Date.now() - progress.timestamp > this.SESSION_TIMEOUT) {
        this.clearProgress(sessionId);
        return null;
      }
      
      return progress;
    } catch (error) {
      console.error('Failed to get progress:', error);
      return null;
    }
  }

  static clearProgress(sessionId: string): void {
    try {
      const allProgress = this.getAllProgress();
      delete allProgress[sessionId];
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allProgress));
      console.log('Progress cleared for session:', sessionId);
    } catch (error) {
      console.error('Failed to clear progress:', error);
    }
  }

  static getAllProgress(): Record<string, ProcessingProgress> {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error('Failed to get all progress:', error);
      return {};
    }
  }

  static generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  static cleanupExpiredSessions(): void {
    try {
      const allProgress = this.getAllProgress();
      const now = Date.now();
      let hasChanges = false;

      Object.keys(allProgress).forEach(sessionId => {
        if (now - allProgress[sessionId].timestamp > this.SESSION_TIMEOUT) {
          delete allProgress[sessionId];
          hasChanges = true;
        }
      });

      if (hasChanges) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(allProgress));
        console.log('Expired sessions cleaned up');
      }
    } catch (error) {
      console.error('Failed to cleanup expired sessions:', error);
    }
  }

  static estimateTimeRemaining(
    currentStep: ProcessingProgress['currentStep'],
    processingStartTime: number
  ): number {
    const elapsed = Date.now() - processingStartTime;
    
    // Rough estimates based on typical processing times
    const stepDurations = {
      upload: 2000,      // 2 seconds
      extracting: 15000, // 15 seconds
      analyzing: 10000,  // 10 seconds
      complete: 0
    };

    const stepOrder = ['upload', 'extracting', 'analyzing', 'complete'];
    const currentIndex = stepOrder.indexOf(currentStep);
    
    let remaining = 0;
    for (let i = currentIndex + 1; i < stepOrder.length - 1; i++) {
      remaining += stepDurations[stepOrder[i] as keyof typeof stepDurations];
    }

    // Adjust based on current step progress
    if (currentStep === 'extracting') {
      remaining += Math.max(0, stepDurations.extracting - elapsed);
    } else if (currentStep === 'analyzing') {
      remaining += Math.max(0, stepDurations.analyzing - elapsed);
    }

    return Math.max(0, remaining);
  }
}
