
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLocalGradingResult, SkillMapping } from "./enhancedLocalGradingService";

export interface OpenAIGradingResult {
  questionNumber: number;
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  confidence: number;
  gradingMethod: string;
  reasoning: string;
  skillMappings?: SkillMapping[];
  aiAnalysis?: any;
}

export interface ComplexQuestionBatch {
  questions: any[];
  answerKeys: any[];
  examId: string;
  studentName: string;
}

export class OpenAIComplexGradingService {
  static async gradeComplexQuestions(
    complexQuestions: any[],
    answerKeys: any[],
    examId: string,
    studentName: string,
    skillMappings: { [questionNumber: number]: SkillMapping[] }
  ): Promise<EnhancedLocalGradingResult[]> {
    if (complexQuestions.length === 0) {
      console.log('No complex questions to grade with OpenAI');
      return [];
    }

    console.log(`🧠 Sending ${complexQuestions.length} complex questions to OpenAI for grading...`);
    
    try {
      // Prepare the batch for OpenAI analysis
      const batch: ComplexQuestionBatch = {
        questions: complexQuestions,
        answerKeys: answerKeys.filter(ak => 
          complexQuestions.some(q => q.questionNumber === ak.question_number)
        ),
        examId,
        studentName
      };

      // Call the analyze-test edge function for complex grading
      const { data: aiResult, error } = await supabase.functions.invoke('analyze-test', {
        body: {
          files: [{
            fileName: `complex_questions_batch_${Date.now()}.json`,
            extractedText: JSON.stringify(batch.questions),
            structuredData: batch.questions
          }],
          examId: batch.examId,
          studentName: batch.studentName,
          complexQuestionsOnly: true,
          questionNumbers: complexQuestions.map(q => q.questionNumber)
        }
      });

      if (error) {
        console.error('Error calling OpenAI for complex grading:', error);
        throw new Error(`OpenAI grading failed: ${error.message}`);
      }

      // Convert OpenAI results to EnhancedLocalGradingResult format
      const enhancedResults = this.convertOpenAIResultsToEnhancedFormat(
        aiResult,
        complexQuestions,
        answerKeys,
        skillMappings
      );

      console.log(`✅ OpenAI successfully graded ${enhancedResults.length} complex questions`);
      return enhancedResults;

    } catch (error) {
      console.error('Failed to grade complex questions with OpenAI:', error);
      
      // Return failed results for complex questions
      return complexQuestions.map(question => {
        const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
        const questionSkillMappings = skillMappings[question.questionNumber] || [];
        
        return {
          questionNumber: question.questionNumber,
          isCorrect: false,
          pointsEarned: 0,
          pointsPossible: answerKey?.points || 1,
          confidence: 0,
          gradingMethod: 'openai_failed',
          reasoning: `OpenAI grading failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
          skillMappings: questionSkillMappings,
          qualityFlags: {
            hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
            reviewRequired: true,
            bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
            confidenceAdjusted: true,
            aiProcessingFailed: true
          }
        };
      });
    }
  }

  private static convertOpenAIResultsToEnhancedFormat(
    aiResult: any,
    complexQuestions: any[],
    answerKeys: any[],
    skillMappings: { [questionNumber: number]: SkillMapping[] }
  ): EnhancedLocalGradingResult[] {
    const results: EnhancedLocalGradingResult[] = [];
    
    // Extract grading results from AI response
    const gradingResults = aiResult.gradingResults || aiResult.analysis?.gradingResults || [];
    
    for (const question of complexQuestions) {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      const questionSkillMappings = skillMappings[question.questionNumber] || [];
      
      // Find corresponding AI result
      const aiGrading = gradingResults.find((result: any) => 
        result.questionNumber === question.questionNumber ||
        result.question_number === question.questionNumber
      );

      const pointsPossible = answerKey?.points || 1;
      let isCorrect = false;
      let pointsEarned = 0;
      let confidence = 0.8; // Default confidence for OpenAI
      let reasoning = 'OpenAI complex question analysis';

      if (aiGrading) {
        isCorrect = aiGrading.isCorrect || aiGrading.is_correct || false;
        pointsEarned = isCorrect ? pointsPossible : 0;
        confidence = aiGrading.confidence || 0.8;
        reasoning = aiGrading.reasoning || aiGrading.explanation || 'OpenAI grading completed';
      }

      results.push({
        questionNumber: question.questionNumber,
        isCorrect,
        pointsEarned,
        pointsPossible,
        confidence,
        gradingMethod: 'openai_complex',
        reasoning,
        skillMappings: questionSkillMappings,
        qualityFlags: {
          hasMultipleMarks: question.detectedAnswer?.multipleMarksDetected || false,
          reviewRequired: question.detectedAnswer?.reviewFlag || false,
          bubbleQuality: question.detectedAnswer?.bubbleQuality || 'unknown',
          confidenceAdjusted: confidence < 0.7,
          aiProcessingUsed: true,
          openAIProcessed: true
        }
      });
    }

    return results;
  }

  static generateOpenAIFeedback(results: EnhancedLocalGradingResult[]): string {
    const correct = results.filter(r => r.isCorrect).length;
    const total = results.length;
    const percentage = total > 0 ? Math.round((correct / total) * 100) : 0;
    
    let feedback = `🧠 OpenAI complex grading completed for ${total} questions. Score: ${correct}/${total} (${percentage}%)`;
    
    const avgConfidence = total > 0 ? results.reduce((sum, r) => sum + r.confidence, 0) / total : 0;
    feedback += `. Average confidence: ${(avgConfidence * 100).toFixed(1)}%`;
    
    const reviewRequired = results.filter(r => r.qualityFlags?.reviewRequired).length;
    if (reviewRequired > 0) {
      feedback += `. ${reviewRequired} questions flagged for review`;
    }
    
    return feedback;
  }
}
