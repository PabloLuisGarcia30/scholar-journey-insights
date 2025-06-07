
import { supabase } from "@/integrations/supabase/client";

export interface AnswerKeyValidationResult {
  examId: string;
  expectedQuestions: number;
  actualQuestions: number;
  completionPercentage: number;
  isComplete: boolean;
  status: 'complete' | 'incomplete' | 'partial' | 'no_answer_key';
  missingQuestions?: number[];
  studentId?: string;
}

export interface BatchValidationSummary {
  totalStudents: number;
  completeStudents: number;
  incompleteStudents: number;
  partialStudents: number;
  overallSuccessRate: number;
  validationResults: Record<string, AnswerKeyValidationResult>;
  recommendations: string[];
  studentIdDetectionRate: number;
}

export class AnswerKeyValidationService {
  private static answerKeyCache = new Map<string, number>();

  static async getExpectedQuestionCount(examId: string): Promise<number> {
    console.log(`🔍 Getting expected question count for exam: ${examId}`);
    
    // Check cache first
    if (this.answerKeyCache.has(examId)) {
      const cachedCount = this.answerKeyCache.get(examId)!;
      console.log(`📋 Using cached question count: ${cachedCount}`);
      return cachedCount;
    }

    try {
      const { data, error } = await supabase
        .from('answer_keys')
        .select('question_number')
        .eq('exam_id', examId);

      if (error) {
        console.error('❌ Error fetching answer key:', error);
        return 0;
      }

      const questionCount = data?.length || 0;
      
      // Cache the result
      this.answerKeyCache.set(examId, questionCount);
      
      console.log(`✅ Found ${questionCount} questions in answer key for exam ${examId}`);
      return questionCount;
    } catch (error) {
      console.error('❌ Failed to get expected question count:', error);
      return 0;
    }
  }

  static async validateStudentResults(
    examId: string, 
    studentResults: any[],
    studentId?: string
  ): Promise<AnswerKeyValidationResult> {
    console.log(`🔬 Validating student results for exam: ${examId}, student: ${studentId || 'Unknown'}`);
    
    const expectedQuestions = await this.getExpectedQuestionCount(examId);
    const actualQuestions = studentResults.length;
    
    if (expectedQuestions === 0) {
      console.log('⚠️ No answer key found for validation');
      return {
        examId,
        expectedQuestions: 0,
        actualQuestions,
        completionPercentage: 0,
        isComplete: false,
        status: 'no_answer_key',
        studentId
      };
    }

    const completionPercentage = Math.round((actualQuestions / expectedQuestions) * 100);
    const isComplete = actualQuestions === expectedQuestions;
    
    let status: 'complete' | 'incomplete' | 'partial' = 'incomplete';
    if (isComplete) {
      status = 'complete';
    } else if (actualQuestions > 0 && completionPercentage >= 80) {
      status = 'partial';
    }

    // Find missing questions if incomplete
    let missingQuestions: number[] | undefined;
    if (!isComplete && expectedQuestions > 0) {
      const processedQuestions = new Set(
        studentResults.map(r => r.question_number).filter(q => q != null)
      );
      missingQuestions = [];
      for (let i = 1; i <= expectedQuestions; i++) {
        if (!processedQuestions.has(i)) {
          missingQuestions.push(i);
        }
      }
    }

    const result: AnswerKeyValidationResult = {
      examId,
      expectedQuestions,
      actualQuestions,
      completionPercentage,
      isComplete,
      status,
      studentId,
      ...(missingQuestions && { missingQuestions })
    };

    console.log(`📊 Validation result for ${studentId}: ${status} (${actualQuestions}/${expectedQuestions} questions)`);
    return result;
  }

  static async validateBatchResults(
    batchResults: { results: any[], studentId?: string, examId?: string }[]
  ): Promise<BatchValidationSummary> {
    console.log(`🎯 Validating batch results for ${batchResults.length} students`);
    
    const validationResults: Record<string, AnswerKeyValidationResult> = {};
    let completeStudents = 0;
    let incompleteStudents = 0;
    let partialStudents = 0;
    let studentsWithDetectedIds = 0;

    for (const batch of batchResults) {
      const studentKey = batch.studentId || 'Unknown_Student';
      const examId = batch.examId || 'Unknown_Exam';
      
      if (batch.studentId) {
        studentsWithDetectedIds++;
      }
      
      const validation = await this.validateStudentResults(examId, batch.results, batch.studentId);
      validationResults[studentKey] = validation;
      
      switch (validation.status) {
        case 'complete':
          completeStudents++;
          break;
        case 'partial':
          partialStudents++;
          break;
        case 'incomplete':
        case 'no_answer_key':
          incompleteStudents++;
          break;
      }
    }

    const totalStudents = batchResults.length;
    const overallSuccessRate = totalStudents > 0 ? 
      Math.round(((completeStudents + partialStudents) / totalStudents) * 100) : 0;
    
    const studentIdDetectionRate = totalStudents > 0 ? 
      Math.round((studentsWithDetectedIds / totalStudents) * 100) : 0;

    // Generate recommendations based on Student ID detection
    const recommendations: string[] = [];
    
    if (studentIdDetectionRate < 95) {
      recommendations.push(`Student ID detection rate is ${studentIdDetectionRate}%. Consider standardizing ID formats in documents.`);
    }
    
    if (incompleteStudents > 0) {
      recommendations.push(`${incompleteStudents} student(s) have incomplete results. Review file quality and processing.`);
    }
    
    if (partialStudents > 0) {
      recommendations.push(`${partialStudents} student(s) have partial results. Check for missing pages or unclear answers.`);
    }
    
    if (overallSuccessRate < 90) {
      recommendations.push('Overall success rate is below 90%. Consider improving file quality or processing parameters.');
    }
    
    // Check for students without answer keys
    const noAnswerKeyCount = Object.values(validationResults)
      .filter(r => r.status === 'no_answer_key').length;
    
    if (noAnswerKeyCount > 0) {
      recommendations.push(`${noAnswerKeyCount} exam(s) missing answer keys. Upload answer keys for proper validation.`);
    }

    const summary: BatchValidationSummary = {
      totalStudents,
      completeStudents,
      incompleteStudents,
      partialStudents,
      overallSuccessRate,
      validationResults,
      recommendations,
      studentIdDetectionRate
    };

    console.log(`📈 Batch validation summary: ${overallSuccessRate}% success rate, ${studentIdDetectionRate}% ID detection rate`);
    console.log(`   Complete: ${completeStudents}, Partial: ${partialStudents}, Incomplete: ${incompleteStudents}`);
    
    return summary;
  }

  static generateValidationReport(summary: BatchValidationSummary): string {
    const { totalStudents, completeStudents, partialStudents, incompleteStudents, overallSuccessRate, studentIdDetectionRate } = summary;
    
    let report = `Answer Key Validation Report\n`;
    report += `================================\n\n`;
    report += `Total Students: ${totalStudents}\n`;
    report += `Student ID Detection Rate: ${studentIdDetectionRate}%\n`;
    report += `Complete Results: ${completeStudents} (${Math.round((completeStudents/totalStudents)*100)}%)\n`;
    report += `Partial Results: ${partialStudents} (${Math.round((partialStudents/totalStudents)*100)}%)\n`;
    report += `Incomplete Results: ${incompleteStudents} (${Math.round((incompleteStudents/totalStudents)*100)}%)\n`;
    report += `Overall Success Rate: ${overallSuccessRate}%\n\n`;
    
    if (summary.recommendations.length > 0) {
      report += `Recommendations:\n`;
      summary.recommendations.forEach((rec, index) => {
        report += `${index + 1}. ${rec}\n`;
      });
      report += `\n`;
    }
    
    // Add detailed breakdown by Student ID
    report += `Detailed Results by Student ID:\n`;
    report += `--------------------------------\n`;
    Object.entries(summary.validationResults).forEach(([studentId, result]) => {
      const status = result.status.toUpperCase();
      report += `${studentId}: ${status} (${result.actualQuestions}/${result.expectedQuestions} questions)\n`;
      
      if (result.missingQuestions && result.missingQuestions.length > 0) {
        report += `  Missing: Questions ${result.missingQuestions.join(', ')}\n`;
      }
    });
    
    return report;
  }

  static clearCache(): void {
    this.answerKeyCache.clear();
    console.log('🧹 Answer key cache cleared');
  }

  static getCacheStats(): { size: number; entries: string[] } {
    return {
      size: this.answerKeyCache.size,
      entries: Array.from(this.answerKeyCache.keys())
    };
  }
}
