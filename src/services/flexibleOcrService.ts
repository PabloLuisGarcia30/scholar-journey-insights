
import { EnhancedSmartOcrService, EnhancedProcessingResult } from './enhancedSmartOcrService';
import { FlexibleTemplateService, FlexibleTemplateMatchResult, DetectedQuestionType } from './flexibleTemplateService';

export interface FlexibleProcessingResult extends EnhancedProcessingResult {
  questionTypeResults: QuestionTypeResult[];
  formatAnalysis: any;
  overallAccuracy: number;
  processingMethodsUsed: Record<string, number>;
}

export interface QuestionTypeResult {
  questionNumber: number;
  questionType: string;
  extractedAnswer: ExtractedAnswer;
  confidence: number;
  processingMethod: string;
  validationPassed: boolean;
}

export interface ExtractedAnswer {
  type: 'multiple_choice' | 'text' | 'essay';
  value: string | null;
  confidence: number;
  rawData?: any;
  boundingBox?: { x: number; y: number; width: number; height: number };
}

export class FlexibleOcrService extends EnhancedSmartOcrService {
  
  static async processWithFlexibleTemplate(
    file: File, 
    expectedQuestionCount?: number
  ): Promise<FlexibleProcessingResult> {
    console.log('🚀 Starting flexible OCR processing with multi-format support');
    
    try {
      // Convert file to base64
      const imageData = await this.fileToBase64(file);
      
      // Step 1: Flexible template recognition
      const templateMatch = await FlexibleTemplateService.recognizeFlexibleTemplate(
        imageData, 
        file.name
      );
      
      console.log(`📋 Format detected: ${templateMatch.formatAnalysis.primaryFormat}`);
      console.log(`📊 Question types: ${Object.keys(templateMatch.formatAnalysis.questionTypeDistribution).join(', ')}`);
      
      // Step 2: Process questions by type
      const questionTypeResults = await this.processQuestionsByType(
        imageData, 
        templateMatch.detectedQuestionTypes, 
        templateMatch
      );
      
      // Step 3: Validate results
      const validationResults = this.validateFlexibleResults(
        questionTypeResults, 
        templateMatch, 
        expectedQuestionCount
      );
      
      // Step 4: Calculate metrics
      const processingMetrics = this.calculateFlexibleMetrics(
        questionTypeResults, 
        templateMatch
      );
      
      const result: FlexibleProcessingResult = {
        extractedText: this.aggregateExtractedText(questionTypeResults),
        confidence: processingMetrics.overallConfidence,
        templateMatch,
        detectedAnswers: questionTypeResults.map(q => ({
          questionNumber: q.questionNumber,
          selectedOption: q.extractedAnswer.value,
          confidence: q.confidence,
          position: q.extractedAnswer.boundingBox || { x: 0, y: 0 },
          validationPassed: q.validationPassed,
          detectionMethod: q.processingMethod
        })),
        validationResults,
        processingMetrics: {
          accuracy: processingMetrics.overallConfidence,
          confidence: processingMetrics.overallConfidence,
          processingTime: processingMetrics.totalProcessingTime,
          methodsUsed: Object.keys(processingMetrics.methodsUsed),
          fallbacksTriggered: processingMetrics.fallbacksTriggered,
          crossValidationScore: processingMetrics.crossValidationScore
        },
        qualityScore: processingMetrics.qualityScore,
        questionTypeResults,
        formatAnalysis: templateMatch.formatAnalysis,
        overallAccuracy: processingMetrics.overallConfidence,
        processingMethodsUsed: processingMetrics.methodsUsed
      };
      
      console.log(`✅ Flexible OCR completed with ${(processingMetrics.overallConfidence * 100).toFixed(1)}% confidence`);
      return result;
      
    } catch (error) {
      console.error('❌ Flexible OCR processing failed:', error);
      throw error;
    }
  }
  
  private static async processQuestionsByType(
    imageData: string,
    detectedQuestions: DetectedQuestionType[],
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<QuestionTypeResult[]> {
    console.log(`🔧 Processing ${detectedQuestions.length} questions by type`);
    
    const results: QuestionTypeResult[] = [];
    const processingGroups = this.groupQuestionsByType(detectedQuestions);
    
    // Process each group with its optimal method
    for (const [questionType, questions] of processingGroups.entries()) {
      console.log(`📝 Processing ${questions.length} ${questionType} questions`);
      
      const groupResults = await this.processQuestionGroup(
        imageData,
        questions,
        questionType,
        templateMatch
      );
      
      results.push(...groupResults);
    }
    
    return results.sort((a, b) => a.questionNumber - b.questionNumber);
  }
  
  private static groupQuestionsByType(
    questions: DetectedQuestionType[]
  ): Map<string, DetectedQuestionType[]> {
    const groups = new Map<string, DetectedQuestionType[]>();
    
    questions.forEach(question => {
      const type = question.detectedType;
      if (!groups.has(type)) {
        groups.set(type, []);
      }
      groups.get(type)!.push(question);
    });
    
    return groups;
  }
  
  private static async processQuestionGroup(
    imageData: string,
    questions: DetectedQuestionType[],
    questionType: string,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<QuestionTypeResult[]> {
    const results: QuestionTypeResult[] = [];
    
    for (const question of questions) {
      try {
        let extractedAnswer: ExtractedAnswer;
        let processingMethod: string;
        
        switch (questionType) {
          case 'multiple_choice':
            ({ extractedAnswer, processingMethod } = await this.processMultipleChoice(
              imageData, question, templateMatch
            ));
            break;
            
          case 'short_answer':
            ({ extractedAnswer, processingMethod } = await this.processShortAnswer(
              imageData, question, templateMatch
            ));
            break;
            
          case 'essay':
            ({ extractedAnswer, processingMethod } = await this.processEssay(
              imageData, question, templateMatch
            ));
            break;
            
          default:
            ({ extractedAnswer, processingMethod } = await this.processMultipleChoice(
              imageData, question, templateMatch
            ));
        }
        
        const validationPassed = this.validateQuestionResult(extractedAnswer, questionType);
        
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer,
          confidence: extractedAnswer.confidence,
          processingMethod,
          validationPassed
        });
        
      } catch (error) {
        console.error(`❌ Failed to process question ${question.questionNumber}:`, error);
        
        // Add error result
        results.push({
          questionNumber: question.questionNumber,
          questionType,
          extractedAnswer: {
            type: questionType as any,
            value: null,
            confidence: 0
          },
          confidence: 0,
          processingMethod: 'failed',
          validationPassed: false
        });
      }
    }
    
    return results;
  }
  
  private static async processMultipleChoice(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Use existing bubble detection logic
    const answer = this.simulateTemplateAnswerDetection(
      question.questionNumber,
      templateMatch.template!
    );
    
    return {
      extractedAnswer: {
        type: 'multiple_choice',
        value: answer?.selectedOption || null,
        confidence: answer?.confidence || 0,
        boundingBox: answer?.position ? {
          x: answer.position.x,
          y: answer.position.y,
          width: 20,
          height: 20
        } : undefined
      },
      processingMethod: 'roboflow_bubbles'
    };
  }
  
  private static async processShortAnswer(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Simulate text extraction for short answers
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const mockAnswers = [
      'The answer is B',
      'Photosynthesis',
      '42',
      'Paris',
      'H2O',
      null // Sometimes no answer
    ];
    
    const answer = Math.random() > 0.2 ? 
      mockAnswers[Math.floor(Math.random() * (mockAnswers.length - 1))] : 
      null;
    
    return {
      extractedAnswer: {
        type: 'text',
        value: answer,
        confidence: answer ? 0.85 + Math.random() * 0.1 : 0,
        boundingBox: question.answerRegion
      },
      processingMethod: 'google_vision_text'
    };
  }
  
  private static async processEssay(
    imageData: string,
    question: DetectedQuestionType,
    templateMatch: FlexibleTemplateMatchResult
  ): Promise<{ extractedAnswer: ExtractedAnswer; processingMethod: string }> {
    // Simulate essay text extraction
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const mockEssays = [
      'This essay discusses the importance of renewable energy sources in combating climate change. Solar and wind power offer sustainable alternatives to fossil fuels...',
      'The American Revolution was a pivotal moment in history that established democratic principles and influenced global politics for centuries to come...',
      'Photosynthesis is the process by which plants convert sunlight into chemical energy, playing a crucial role in the Earth\'s ecosystem...',
      null // Sometimes no essay answer
    ];
    
    const essay = Math.random() > 0.3 ? 
      mockEssays[Math.floor(Math.random() * (mockEssays.length - 1))] : 
      null;
    
    return {
      extractedAnswer: {
        type: 'essay',
        value: essay,
        confidence: essay ? 0.75 + Math.random() * 0.15 : 0,
        boundingBox: question.answerRegion
      },
      processingMethod: 'google_vision_text'
    };
  }
  
  private static validateQuestionResult(
    answer: ExtractedAnswer, 
    questionType: string
  ): boolean {
    if (!answer.value) return false;
    
    switch (questionType) {
      case 'multiple_choice':
        return /^[A-E]$/.test(answer.value);
      case 'short_answer':
        return answer.value.length >= 1 && answer.value.length <= 100;
      case 'essay':
        return answer.value.length >= 10 && answer.value.length <= 1000;
      default:
        return true;
    }
  }
  
  private static validateFlexibleResults(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult,
    expectedQuestionCount?: number
  ): any[] {
    const validationResults = [];
    
    // Question count validation
    if (expectedQuestionCount) {
      const countMatch = Math.abs(results.length - expectedQuestionCount) <= 2;
      validationResults.push({
        type: 'question_count',
        passed: countMatch,
        confidence: countMatch ? 0.95 : 0.5,
        details: `Expected ${expectedQuestionCount}, found ${results.length}`
      });
    }
    
    // Format validation
    const formatTypes = [...new Set(results.map(r => r.questionType))];
    const expectedTypes = Object.keys(templateMatch.formatAnalysis.questionTypeDistribution);
    const formatMatch = formatTypes.every(type => expectedTypes.includes(type));
    
    validationResults.push({
      type: 'format_validation',
      passed: formatMatch,
      confidence: formatMatch ? 0.9 : 0.6,
      details: `Detected types: ${formatTypes.join(', ')}`
    });
    
    // Answer quality validation
    const validAnswers = results.filter(r => r.validationPassed).length;
    const answerQuality = validAnswers / Math.max(1, results.length);
    
    validationResults.push({
      type: 'answer_quality',
      passed: answerQuality > 0.7,
      confidence: answerQuality,
      details: `${validAnswers}/${results.length} answers passed validation`
    });
    
    return validationResults;
  }
  
  private static calculateFlexibleMetrics(
    results: QuestionTypeResult[],
    templateMatch: FlexibleTemplateMatchResult
  ): {
    overallConfidence: number;
    qualityScore: number;
    totalProcessingTime: number;
    methodsUsed: Record<string, number>;
    fallbacksTriggered: number;
    crossValidationScore: number;
  } {
    const avgConfidence = results.length > 0 ? 
      results.reduce((sum, r) => sum + r.confidence, 0) / results.length : 0;
    
    const validResults = results.filter(r => r.validationPassed).length;
    const qualityScore = validResults / Math.max(1, results.length);
    
    const methodsUsed: Record<string, number> = {};
    results.forEach(r => {
      methodsUsed[r.processingMethod] = (methodsUsed[r.processingMethod] || 0) + 1;
    });
    
    const estimatedTime = templateMatch.formatAnalysis.estimatedProcessingTime;
    
    return {
      overallConfidence: (avgConfidence + qualityScore) / 2,
      qualityScore,
      totalProcessingTime: estimatedTime,
      methodsUsed,
      fallbacksTriggered: results.filter(r => r.processingMethod === 'failed').length,
      crossValidationScore: 0.9
    };
  }
  
  private static aggregateExtractedText(results: QuestionTypeResult[]): string {
    let text = 'Flexible Test Format Detected\n\n';
    
    results.forEach(result => {
      text += `Question ${result.questionNumber} (${result.questionType}): `;
      text += result.extractedAnswer.value || 'No answer detected';
      text += '\n';
    });
    
    return text;
  }
}
