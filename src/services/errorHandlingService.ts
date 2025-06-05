import { supabase } from "@/integrations/supabase/client";

export type ErrorCode = 
  | 'FILE_TOO_LARGE'
  | 'INVALID_FILE_TYPE'
  | 'OCR_PROCESSING_FAILED'
  | 'AI_ANALYSIS_FAILED'
  | 'NETWORK_ERROR'
  | 'API_RATE_LIMIT'
  | 'AUTHENTICATION_ERROR'
  | 'INSUFFICIENT_PERMISSIONS'
  | 'CORRUPTION_DETECTED'
  | 'TIMEOUT_ERROR'
  | 'UNKNOWN_ERROR';

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  context: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId?: string;
  fileName?: string;
  stackTrace?: string;
  suggestions: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'user' | 'system' | 'external' | 'security';
}

export interface ErrorReport {
  id: string;
  errorDetails: ErrorDetails;
  deviceInfo: Record<string, any>;
  browserInfo: Record<string, any>;
  userActions: Array<{ action: string; timestamp: number }>;
  systemHealth: Record<string, any>;
}

export interface RecoveryAction {
  title: string;
  description: string;
  action: () => Promise<void> | void;
  automated: boolean;
  priority: number;
}

export class ErrorHandlingService {
  private static errorHistory: ErrorDetails[] = [];
  private static userActions: Array<{ action: string; timestamp: number }> = [];
  private static readonly MAX_HISTORY = 100;

  static categorizeError(error: any, context: Record<string, any>): ErrorDetails {
    let code: ErrorCode = 'UNKNOWN_ERROR';
    let severity: ErrorDetails['severity'] = 'medium';
    let category: ErrorDetails['category'] = 'system';
    let suggestions: string[] = [];

    const errorMessage = error instanceof Error ? error.message : String(error);
    const lowerMessage = errorMessage.toLowerCase();

    // File-related errors
    if (lowerMessage.includes('file too large') || lowerMessage.includes('size limit')) {
      code = 'FILE_TOO_LARGE';
      category = 'user';
      severity = 'low';
      suggestions = [
        'Try compressing your file before uploading',
        'Split large documents into smaller sections',
        'Use a different file format (e.g., PNG instead of TIFF)'
      ];
    }
    else if (lowerMessage.includes('invalid file') || lowerMessage.includes('unsupported format')) {
      code = 'INVALID_FILE_TYPE';
      category = 'user';
      severity = 'low';
      suggestions = [
        'Ensure your file is in a supported format (PDF, JPG, PNG)',
        'Convert your file to PDF format',
        'Check if the file is corrupted'
      ];
    }
    // Processing errors
    else if (lowerMessage.includes('ocr') || lowerMessage.includes('text extraction')) {
      code = 'OCR_PROCESSING_FAILED';
      category = 'external';
      severity = 'medium';
      suggestions = [
        'Try uploading a higher quality image',
        'Ensure the document text is clearly visible',
        'Check if the document is in a supported language',
        'Try processing the document again'
      ];
    }
    else if (lowerMessage.includes('ai analysis') || lowerMessage.includes('openai')) {
      code = 'AI_ANALYSIS_FAILED';
      category = 'external';
      severity = 'medium';
      suggestions = [
        'Wait a moment and try again',
        'Check if the extracted text is readable',
        'Try with a different document format'
      ];
    }
    // Network and API errors
    else if (lowerMessage.includes('network') || lowerMessage.includes('fetch')) {
      code = 'NETWORK_ERROR';
      category = 'system';
      severity = 'medium';
      suggestions = [
        'Check your internet connection',
        'Try refreshing the page',
        'Wait a moment and try again'
      ];
    }
    else if (lowerMessage.includes('rate limit') || lowerMessage.includes('too many requests')) {
      code = 'API_RATE_LIMIT';
      category = 'external';
      severity = 'high';
      suggestions = [
        'Wait a few minutes before trying again',
        'Contact support if this persists',
        'Try processing fewer files at once'
      ];
    }
    else if (lowerMessage.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
      category = 'system';
      severity = 'medium';
      suggestions = [
        'Try with a smaller file',
        'Check your internet connection',
        'The document may be too complex - try a simpler version'
      ];
    }
    // Security errors
    else if (lowerMessage.includes('authentication') || lowerMessage.includes('unauthorized')) {
      code = 'AUTHENTICATION_ERROR';
      category = 'security';
      severity = 'high';
      suggestions = [
        'Please log in again',
        'Clear your browser cache and cookies',
        'Contact support if the problem persists'
      ];
    }

    return {
      code,
      message: errorMessage,
      context,
      timestamp: Date.now(),
      suggestions,
      severity,
      category,
      stackTrace: error instanceof Error ? error.stack : undefined
    };
  }

  static async reportError(
    error: any,
    context: Record<string, any> = {},
    userId?: string,
    sessionId?: string
  ): Promise<string> {
    const errorDetails = this.categorizeError(error, context);
    errorDetails.userId = userId;
    errorDetails.sessionId = sessionId;

    // Add to history
    this.errorHistory.unshift(errorDetails);
    if (this.errorHistory.length > this.MAX_HISTORY) {
      this.errorHistory = this.errorHistory.slice(0, this.MAX_HISTORY);
    }

    const report: ErrorReport = {
      id: `error_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      errorDetails,
      deviceInfo: this.getDeviceInfo(),
      browserInfo: this.getBrowserInfo(),
      userActions: [...this.userActions],
      systemHealth: await this.getSystemHealth()
    };

    try {
      // Send to backend for analysis
      await supabase.functions.invoke('report-error', {
        body: report
      });

      console.log('Error reported:', report.id);
    } catch (reportingError) {
      console.error('Failed to report error:', reportingError);
    }

    return report.id;
  }

  static getRecoveryActions(errorCode: ErrorCode): RecoveryAction[] {
    const actions: Record<ErrorCode, RecoveryAction[]> = {
      FILE_TOO_LARGE: [
        {
          title: 'Compress File',
          description: 'Automatically compress your file to reduce size',
          action: async () => {
            // This would trigger file compression
            console.log('Compressing file...');
          },
          automated: true,
          priority: 1
        },
        {
          title: 'Split Document',
          description: 'Split your document into smaller pages',
          action: () => {
            // This would show a document splitting UI
            console.log('Opening document splitter...');
          },
          automated: false,
          priority: 2
        }
      ],
      INVALID_FILE_TYPE: [
        {
          title: 'Convert to PDF',
          description: 'Convert your file to a supported PDF format',
          action: async () => {
            console.log('Converting to PDF...');
          },
          automated: true,
          priority: 1
        }
      ],
      OCR_PROCESSING_FAILED: [
        {
          title: 'Enhance Image',
          description: 'Automatically enhance image quality for better OCR',
          action: async () => {
            console.log('Enhancing image...');
          },
          automated: true,
          priority: 1
        },
        {
          title: 'Try Alternative OCR',
          description: 'Use a different OCR engine',
          action: async () => {
            console.log('Switching OCR engine...');
          },
          automated: true,
          priority: 2
        }
      ],
      NETWORK_ERROR: [
        {
          title: 'Retry Connection',
          description: 'Attempt to reconnect and retry the operation',
          action: async () => {
            console.log('Retrying connection...');
          },
          automated: true,
          priority: 1
        }
      ],
      API_RATE_LIMIT: [
        {
          title: 'Queue for Later',
          description: 'Add your request to a queue for processing when limits reset',
          action: async () => {
            console.log('Adding to queue...');
          },
          automated: true,
          priority: 1
        }
      ],
      AI_ANALYSIS_FAILED: [],
      AUTHENTICATION_ERROR: [],
      INSUFFICIENT_PERMISSIONS: [],
      CORRUPTION_DETECTED: [],
      TIMEOUT_ERROR: [],
      UNKNOWN_ERROR: []
    };

    return actions[errorCode] || [];
  }

  static trackUserAction(action: string): void {
    this.userActions.unshift({
      action,
      timestamp: Date.now()
    });

    // Keep only last 50 actions
    if (this.userActions.length > 50) {
      this.userActions = this.userActions.slice(0, 50);
    }
  }

  static getErrorHistory(): ErrorDetails[] {
    return [...this.errorHistory];
  }

  static async getDiagnostics(): Promise<Record<string, any>> {
    return {
      errorCount: this.errorHistory.length,
      recentErrors: this.errorHistory.slice(0, 5),
      userActions: this.userActions.slice(0, 10),
      systemHealth: await this.getSystemHealth(),
      browserInfo: this.getBrowserInfo(),
      deviceInfo: this.getDeviceInfo()
    };
  }

  private static getDeviceInfo(): Record<string, any> {
    return {
      userAgent: navigator.userAgent,
      platform: navigator.platform,
      language: navigator.language,
      cookieEnabled: navigator.cookieEnabled,
      onLine: navigator.onLine,
      screenResolution: `${screen.width}x${screen.height}`,
      colorDepth: screen.colorDepth,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };
  }

  private static getBrowserInfo(): Record<string, any> {
    return {
      url: window.location.href,
      referrer: document.referrer,
      timestamp: Date.now(),
      localStorage: typeof Storage !== 'undefined',
      sessionStorage: typeof sessionStorage !== 'undefined',
      indexedDB: typeof indexedDB !== 'undefined'
    };
  }

  private static async getSystemHealth(): Promise<Record<string, any>> {
    const startTime = performance.now();
    
    // Test basic browser APIs
    const apiTests = {
      fetch: typeof fetch !== 'undefined',
      crypto: typeof crypto !== 'undefined',
      fileReader: typeof FileReader !== 'undefined',
      worker: typeof Worker !== 'undefined'
    };

    // Memory info if available
    const memory = (performance as any).memory ? {
      usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
      totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
      jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit
    } : null;

    return {
      responseTime: performance.now() - startTime,
      apiSupport: apiTests,
      memory,
      connectionType: (navigator as any).connection?.effectiveType || 'unknown',
      timestamp: Date.now()
    };
  }
}
