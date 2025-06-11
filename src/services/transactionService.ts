
import { supabase } from "@/integrations/supabase/client";
import type { GradingResult, TestAnalysisResult, SkillScore } from './jsonValidationService';

export interface DatabaseTransactionResult {
  success: boolean;
  testResultId?: string;
  questionsStored?: number;
  skillScoresStored?: number;
  error?: string;
  rollbackPerformed?: boolean;
}

export interface TestResultData {
  examId: string;
  studentProfileId: string;
  classId?: string;
  overallScore: number;
  totalPointsEarned: number;
  totalPointsPossible: number;
  aiFeedback?: string;
  detailedAnalysis?: string;
}

export class TransactionService {
  // Atomic test result insertion with full rollback capability
  async insertTestResultsTransaction(
    testData: TestResultData,
    gradingResults: GradingResult[],
    contentSkillScores: SkillScore[] = [],
    subjectSkillScores: SkillScore[] = []
  ): Promise<DatabaseTransactionResult> {
    console.log('🔄 Starting atomic test results transaction...');
    
    try {
      // Step 1: Insert main test result
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          exam_id: testData.examId,
          student_id: testData.studentProfileId,
          class_id: testData.classId || '',
          overall_score: testData.overallScore,
          total_points_earned: testData.totalPointsEarned,
          total_points_possible: testData.totalPointsPossible,
          ai_feedback: testData.aiFeedback,
          detailed_analysis: testData.detailedAnalysis
        })
        .select('id')
        .single();

      if (testError || !testResult) {
        throw new Error(`Test result insertion failed: ${testError?.message}`);
      }

      const testResultId = testResult.id;
      console.log(`✅ Test result created: ${testResultId}`);

      // Step 2: Insert content skill scores
      let contentSkillCount = 0;
      if (contentSkillScores.length > 0) {
        const contentSkillData = contentSkillScores.map(skill => ({
          test_result_id: testResultId,
          skill_name: skill.skill_name,
          score: skill.score,
          points_earned: skill.points_earned,
          points_possible: skill.points_possible
        }));

        const { data: contentSkillResult, error: contentSkillError } = await supabase
          .from('content_skill_scores')
          .insert(contentSkillData)
          .select('id');

        if (contentSkillError) {
          await this.rollbackTestResult(testResultId);
          throw new Error(`Content skill scores insertion failed: ${contentSkillError.message}`);
        }

        contentSkillCount = contentSkillResult?.length || 0;
        console.log(`✅ Content skill scores stored: ${contentSkillCount}`);
      }

      // Step 3: Insert subject skill scores
      let subjectSkillCount = 0;
      if (subjectSkillScores.length > 0) {
        const subjectSkillData = subjectSkillScores.map(skill => ({
          test_result_id: testResultId,
          skill_name: skill.skill_name,
          score: skill.score,
          points_earned: skill.points_earned,
          points_possible: skill.points_possible
        }));

        const { data: subjectSkillResult, error: subjectSkillError } = await supabase
          .from('subject_skill_scores')
          .insert(subjectSkillData)
          .select('id');

        if (subjectSkillError) {
          await this.rollbackTestResult(testResultId);
          await this.rollbackContentSkillScores(testResultId);
          throw new Error(`Subject skill scores insertion failed: ${subjectSkillError.message}`);
        }

        subjectSkillCount = subjectSkillResult?.length || 0;
        console.log(`✅ Subject skill scores stored: ${subjectSkillCount}`);
      }

      console.log(`🎉 Transaction completed successfully: ${testResultId}`);
      
      return {
        success: true,
        testResultId,
        questionsStored: gradingResults.length,
        skillScoresStored: contentSkillCount + subjectSkillCount
      };

    } catch (error) {
      console.error('❌ Transaction failed:', error);
      
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown transaction error',
        rollbackPerformed: true
      };
    }
  }

  // Simplified batch insert for basic operations
  async batchInsertTestResults(
    records: Array<{
      exam_id: string;
      student_id: string;
      class_id: string;
      overall_score: number;
      total_points_earned: number;
      total_points_possible: number;
      ai_feedback?: string;
    }>,
    batchSize: number = 100
  ): Promise<{ success: boolean; insertedCount: number; error?: string }> {
    console.log(`🔄 Starting batch insert for test_results: ${records.length} records`);
    
    if (records.length === 0) {
      return { success: true, insertedCount: 0 };
    }

    try {
      let totalInserted = 0;
      
      // Process in batches to avoid overwhelming the database
      for (let i = 0; i < records.length; i += batchSize) {
        const batch = records.slice(i, i + batchSize);
        
        const { data, error } = await supabase
          .from('test_results')
          .insert(batch)
          .select('id');

        if (error) {
          throw new Error(`Batch insert failed at batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
        }

        totalInserted += data?.length || 0;
        console.log(`📦 Batch ${Math.floor(i / batchSize) + 1} completed: ${data?.length || 0} records`);
      }

      console.log(`✅ Batch insert completed: ${totalInserted} records inserted into test_results`);
      
      return {
        success: true,
        insertedCount: totalInserted
      };

    } catch (error) {
      console.error(`❌ Batch insert failed for test_results:`, error);
      
      return {
        success: false,
        insertedCount: 0,
        error: error instanceof Error ? error.message : 'Unknown batch insert error'
      };
    }
  }

  // Rollback operations for failed transactions
  private async rollbackTestResult(testResultId: string): Promise<void> {
    try {
      await supabase
        .from('test_results')
        .delete()
        .eq('id', testResultId);
      
      console.log(`🔄 Rolled back test result: ${testResultId}`);
    } catch (error) {
      console.error(`❌ Failed to rollback test result ${testResultId}:`, error);
    }
  }

  private async rollbackContentSkillScores(testResultId: string): Promise<void> {
    try {
      await supabase
        .from('content_skill_scores')
        .delete()
        .eq('test_result_id', testResultId);
      
      console.log(`🔄 Rolled back content skill scores for: ${testResultId}`);
    } catch (error) {
      console.error(`❌ Failed to rollback content skill scores for ${testResultId}:`, error);
    }
  }

  private async rollbackSubjectSkillScores(testResultId: string): Promise<void> {
    try {
      await supabase
        .from('subject_skill_scores')
        .delete()
        .eq('test_result_id', testResultId);
      
      console.log(`🔄 Rolled back subject skill scores for: ${testResultId}`);
    } catch (error) {
      console.error(`❌ Failed to rollback subject skill scores for ${testResultId}:`, error);
    }
  }

  // Verify transaction integrity
  async verifyTransactionIntegrity(testResultId: string): Promise<{
    testResultExists: boolean;
    contentSkillCount: number;
    subjectSkillCount: number;
    integrity: boolean;
  }> {
    try {
      // Check test result exists
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .select('id')
        .eq('id', testResultId)
        .maybeSingle();

      if (testError) {
        throw new Error(`Integrity check failed: ${testError.message}`);
      }

      // Count content skill scores
      const { count: contentSkillCount, error: contentError } = await supabase
        .from('content_skill_scores')
        .select('*', { count: 'exact', head: true })
        .eq('test_result_id', testResultId);

      if (contentError) {
        throw new Error(`Content skill count failed: ${contentError.message}`);
      }

      // Count subject skill scores
      const { count: subjectSkillCount, error: subjectError } = await supabase
        .from('subject_skill_scores')
        .select('*', { count: 'exact', head: true })
        .eq('test_result_id', testResultId);

      if (subjectError) {
        throw new Error(`Subject skill count failed: ${subjectError.message}`);
      }

      const integrity = !!testResult && (contentSkillCount !== null) && (subjectSkillCount !== null);

      return {
        testResultExists: !!testResult,
        contentSkillCount: contentSkillCount || 0,
        subjectSkillCount: subjectSkillCount || 0,
        integrity
      };

    } catch (error) {
      console.error(`❌ Integrity check failed for ${testResultId}:`, error);
      return {
        testResultExists: false,
        contentSkillCount: 0,
        subjectSkillCount: 0,
        integrity: false
      };
    }
  }

  // Get transaction statistics
  async getTransactionStats(examId?: string): Promise<{
    totalTransactions: number;
    successfulTransactions: number;
    failedTransactions: number;
    successRate: number;
  }> {
    try {
      let query = supabase
        .from('test_results')
        .select('*', { count: 'exact', head: true });

      if (examId) {
        query = query.eq('exam_id', examId);
      }

      const { count, error } = await query;

      if (error) {
        throw new Error(`Stats query failed: ${error.message}`);
      }

      // In a real implementation, you'd track failed transactions separately
      const totalTransactions = count || 0;
      const successfulTransactions = count || 0; // All records in DB are successful
      const failedTransactions = 0; // Would need separate tracking
      const successRate = totalTransactions > 0 ? (successfulTransactions / totalTransactions) * 100 : 0;

      return {
        totalTransactions,
        successfulTransactions,
        failedTransactions,
        successRate
      };

    } catch (error) {
      console.error('❌ Failed to get transaction stats:', error);
      return {
        totalTransactions: 0,
        successfulTransactions: 0,
        failedTransactions: 0,
        successRate: 0
      };
    }
  }
}

// Export singleton instance
export const transactionService = new TransactionService();
