
// Consolidated export for core services only
export { PerformanceMonitoringService } from './performanceMonitoringService';
export { SmartOcrService } from './smartOcrService';
export { BatchProcessingService } from './batchProcessingService';
export { ConsolidatedGradingService } from './consolidatedGradingService';
export { QuestionComplexityAnalyzer } from './questionComplexityAnalyzer';

// Export core types
export type { DocumentClassification, OcrMethod, AdaptiveOcrConfig, ProcessingMetrics } from './smartOcrService';
export type { BatchJob, ProcessingQueue } from './batchProcessingService';
export type { PerformanceMetric, SystemHealthMetrics, PerformanceReport } from './performanceMonitoringService';
export type { GradingResult, QuestionClassification, ConsolidatedGradingConfig } from './consolidatedGradingService';
export type { ComplexityAnalysis } from './questionComplexityAnalyzer';
