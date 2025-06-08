
// Barrel export for advanced services
export { PerformanceMonitoringService } from './performanceMonitoringService';
export { SmartOcrService } from './smartOcrService';
export { BatchProcessingService } from './batchProcessingService';
export { DistilBertLocalGradingService } from './distilBertLocalGrading';
export { EnhancedQuestionClassifier } from './enhancedQuestionClassifier';
export { OpenAIComplexGradingService } from './openAIComplexGradingService';
export { HybridGradingResultsMerger } from './hybridGradingResultsMerger';
export { QuestionCacheService } from './questionCacheService';

export type { DocumentClassification, OcrMethod, AdaptiveOcrConfig, ProcessingMetrics } from './smartOcrService';
export type { BatchJob, ProcessingQueue } from './batchProcessingService';
export type { PerformanceMetric, SystemHealthMetrics, PerformanceReport } from './performanceMonitoringService';
export type { DistilBertConfig, DistilBertGradingResult } from './distilBertLocalGrading';
export type { QuestionClassification, SimpleAnswerValidation } from './enhancedQuestionClassifier';
export type { OpenAIGradingResult, ComplexQuestionBatch } from './openAIComplexGradingService';
export type { HybridGradingResults } from './hybridGradingResultsMerger';
export type { QuestionCacheKey, QuestionCacheResult, QuestionCacheStats } from './questionCacheService';
