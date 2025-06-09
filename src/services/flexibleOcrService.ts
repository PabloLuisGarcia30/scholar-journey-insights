
import { supabase } from '@/integrations/supabase/client';
import { SmartOcrService, DocumentClassification, OcrMethod } from './smartOcrService';

export interface DatabaseDrivenProcessingResult {
  success: boolean;
  confidence: number;
  method: string;
  processingTime: number;
  data?: any;
  error?: string;
}

export interface FlexibleOcrConfig {
  enableSmartRouting: boolean;
  fallbackMethods: OcrMethod[];
  confidenceThreshold: number;
  maxRetries: number;
}

export class FlexibleOcrService {
  private static config: FlexibleOcrConfig = {
    enableSmartRouting: true,
    fallbackMethods: ['google_vision', 'tesseract'],
    confidenceThreshold: 0.8,
    maxRetries: 3
  };

  static async processDocument(
    fileContent: string,
    fileName: string,
    classification?: DocumentClassification
  ): Promise<DatabaseDrivenProcessingResult> {
    const startTime = Date.now();
    
    try {
      console.log(`🔄 Processing document: ${fileName}`);
      
      // If no classification provided, classify the document first
      if (!classification) {
        classification = await SmartOcrService.classifyDocument(fileContent, fileName);
      }

      // Route to appropriate OCR method based on classification
      const method = this.selectOptimalMethod(classification);
      console.log(`📋 Selected OCR method: ${method} for ${fileName}`);

      // Process with selected method
      const result = await this.processWithMethod(fileContent, fileName, method);
      
      const processingTime = Date.now() - startTime;
      
      return {
        success: true,
        confidence: result.confidence || 0.8,
        method,
        processingTime,
        data: result.data
      };

    } catch (error) {
      console.error(`❌ Flexible OCR processing failed for ${fileName}:`, error);
      
      return {
        success: false,
        confidence: 0,
        method: 'error',
        processingTime: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private static selectOptimalMethod(classification: DocumentClassification): OcrMethod {
    // Simple routing based on document type
    switch (classification.documentType) {
      case 'test_paper':
        return classification.hasHandwriting ? 'google_vision' : 'tesseract';
      case 'answer_sheet':
        return 'google_vision'; // Better for bubble detection
      case 'mixed_content':
        return 'google_vision'; // Most flexible
      default:
        return 'tesseract'; // Default fallback
    }
  }

  private static async processWithMethod(
    fileContent: string,
    fileName: string,
    method: OcrMethod
  ): Promise<{ confidence: number; data: any }> {
    try {
      // Use SmartOcrService to process with the selected method
      const result = await SmartOcrService.processWithMethod(fileContent, fileName, method);
      
      return {
        confidence: result.confidence || 0.8,
        data: {
          text: result.text,
          structuredData: result.structuredData,
          method
        }
      };
    } catch (error) {
      console.error(`Method ${method} failed, trying fallback:`, error);
      throw error;
    }
  }

  static updateConfiguration(newConfig: Partial<FlexibleOcrConfig>): void {
    this.config = { ...this.config, ...newConfig };
    console.log('🔧 Updated flexible OCR configuration:', this.config);
  }

  static getConfiguration(): FlexibleOcrConfig {
    return { ...this.config };
  }

  static async batchProcess(
    files: Array<{ content: string; name: string }>,
    options?: { concurrency?: number }
  ): Promise<DatabaseDrivenProcessingResult[]> {
    console.log(`🔄 Batch processing ${files.length} files with flexible OCR`);
    
    const concurrency = options?.concurrency || 3;
    const results: DatabaseDrivenProcessingResult[] = [];
    
    // Process files in batches to avoid overwhelming the system
    for (let i = 0; i < files.length; i += concurrency) {
      const batch = files.slice(i, i + concurrency);
      const batchPromises = batch.map(file => 
        this.processDocument(file.content, file.name)
      );
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
    }
    
    return results;
  }
}
