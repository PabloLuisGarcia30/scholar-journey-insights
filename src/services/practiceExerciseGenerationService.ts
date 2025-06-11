
import { supabase } from "@/integrations/supabase/client";
import { PracticeAnswerKeyService, type PracticeAnswerKeyQuestion } from "./practiceAnswerKeyService";

export interface GeneratedExerciseData {
  exerciseId: string;
  title: string;
  description: string;
  questions: Array<{
    id: string;
    type: string;
    question: string;
    options?: string[];
    correctAnswer: string;
    acceptableAnswers?: string[];
    keywords?: string[];
    points: number;
    explanation?: string;
    targetSkill: string;
    difficultyLevel?: string;
    hint?: string;
  }>;
  totalPoints: number;
  estimatedTime: number;
  metadata: any;
}

export class PracticeExerciseGenerationService {
  /**
   * Generate a proper UUID for practice exercises
   */
  static generateExerciseId(): string {
    return crypto.randomUUID();
  }

  /**
   * Save answer key after exercise generation
   */
  static async saveAnswerKeyForExercise(exerciseData: GeneratedExerciseData): Promise<void> {
    try {
      console.log('💾 Saving answer key for exercise:', exerciseData.exerciseId);
      
      const answerKeyQuestions: PracticeAnswerKeyQuestion[] = exerciseData.questions.map(q => ({
        id: q.id,
        type: q.type as 'multiple-choice' | 'true-false' | 'short-answer' | 'essay',
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        explanation: q.explanation || 'No explanation provided.',
        acceptableAnswers: q.acceptableAnswers || [],
        keywords: q.keywords || [],
        points: q.points,
        targetSkill: q.targetSkill,
        learningObjective: q.hint
      }));

      const metadata = {
        skillName: exerciseData.metadata.skillName,
        subject: exerciseData.metadata.className?.split(' ')[0] || 'Unknown',
        grade: exerciseData.metadata.grade || 'Unknown',
        totalPoints: exerciseData.totalPoints,
        estimatedTime: exerciseData.estimatedTime,
        generatedAt: new Date().toISOString()
      };

      await PracticeAnswerKeyService.saveAnswerKey(
        exerciseData.exerciseId,
        answerKeyQuestions,
        metadata
      );

      console.log('✅ Answer key saved successfully for exercise:', exerciseData.exerciseId);
    } catch (error) {
      console.error('❌ Error saving answer key:', error);
      // Don't throw - answer key saving failure shouldn't block exercise generation
    }
  }

  /**
   * Process generated exercise data and ensure proper format
   */
  static processGeneratedExercise(rawExerciseData: any, exerciseId: string): GeneratedExerciseData {
    const processedData: GeneratedExerciseData = {
      exerciseId,
      title: rawExerciseData.title,
      description: rawExerciseData.description,
      questions: rawExerciseData.questions.map((q: any, index: number) => ({
        id: q.id || `q_${index + 1}`,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer,
        acceptableAnswers: q.acceptableAnswers || [],
        keywords: q.keywords || [],
        points: q.points || 1,
        explanation: q.explanation || 'No explanation provided.',
        targetSkill: q.targetSkill,
        difficultyLevel: q.difficultyLevel || 'mixed',
        hint: q.hint
      })),
      totalPoints: rawExerciseData.totalPoints,
      estimatedTime: rawExerciseData.estimatedTime,
      metadata: rawExerciseData.metadata || {}
    };

    return processedData;
  }
}
