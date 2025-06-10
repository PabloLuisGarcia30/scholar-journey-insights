
import { supabase } from "@/integrations/supabase/client";

export interface PracticeAnswerKey {
  id: string;
  questionNumber: number;
  questionText: string;
  questionType: string;
  correctAnswer: string;
  options?: any;
  points: number;
  explanation: string;
  acceptableAnswers: string[];
}

export interface StudentAnswerComparison {
  questionNumber: number;
  questionText: string;
  questionType: string;
  studentAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  points: number;
  earnedPoints: number;
  explanation: string;
  acceptableAnswers: string[];
  options?: any;
}

export class PracticeAnswerKeyService {
  static async getAnswerKeysForExercise(exerciseId: string): Promise<PracticeAnswerKey[]> {
    console.log(`🔍 Fetching answer keys for exercise: ${exerciseId}`);
    
    try {
      const { data: answerKeys, error } = await supabase
        .from('answer_keys')
        .select('*')
        .eq('exercise_type', 'practice')
        .eq('practice_exercise_id', exerciseId)
        .order('question_number', { ascending: true });

      if (error) {
        console.error('❌ Error fetching answer keys:', error);
        throw new Error(`Failed to fetch answer keys: ${error.message}`);
      }

      if (!answerKeys || answerKeys.length === 0) {
        console.warn(`⚠️ No answer keys found for exercise: ${exerciseId}`);
        return [];
      }

      const formattedKeys: PracticeAnswerKey[] = answerKeys.map(key => ({
        id: key.id,
        questionNumber: key.question_number,
        questionText: key.question_text,
        questionType: key.question_type,
        correctAnswer: key.correct_answer,
        options: key.options,
        points: key.points,
        explanation: key.explanation || 'No explanation available.',
        acceptableAnswers: Array.isArray(key.acceptable_answers) ? key.acceptable_answers : []
      }));

      console.log(`✅ Retrieved ${formattedKeys.length} answer keys for exercise: ${exerciseId}`);
      return formattedKeys;

    } catch (error) {
      console.error('❌ Error in getAnswerKeysForExercise:', error);
      throw error;
    }
  }

  static async compareStudentAnswers(
    exerciseId: string,
    studentAnswers: Record<string, any>
  ): Promise<StudentAnswerComparison[]> {
    console.log(`📊 Comparing student answers for exercise: ${exerciseId}`);
    
    try {
      const answerKeys = await this.getAnswerKeysForExercise(exerciseId);
      
      if (answerKeys.length === 0) {
        console.warn(`⚠️ No answer keys available for comparison`);
        return [];
      }

      const comparisons: StudentAnswerComparison[] = answerKeys.map(answerKey => {
        const studentAnswer = studentAnswers[`question_${answerKey.questionNumber}`] || '';
        const isCorrect = this.isAnswerCorrect(
          studentAnswer,
          answerKey.correctAnswer,
          answerKey.acceptableAnswers,
          answerKey.questionType
        );
        
        const earnedPoints = isCorrect ? answerKey.points : 0;

        return {
          questionNumber: answerKey.questionNumber,
          questionText: answerKey.questionText,
          questionType: answerKey.questionType,
          studentAnswer: studentAnswer.toString(),
          correctAnswer: answerKey.correctAnswer,
          isCorrect,
          points: answerKey.points,
          earnedPoints,
          explanation: answerKey.explanation,
          acceptableAnswers: answerKey.acceptableAnswers,
          options: answerKey.options
        };
      });

      console.log(`✅ Generated ${comparisons.length} answer comparisons`);
      return comparisons;

    } catch (error) {
      console.error('❌ Error in compareStudentAnswers:', error);
      throw error;
    }
  }

  private static isAnswerCorrect(
    studentAnswer: string,
    correctAnswer: string,
    acceptableAnswers: string[],
    questionType: string
  ): boolean {
    const normalizedStudentAnswer = studentAnswer.trim().toLowerCase();
    const normalizedCorrectAnswer = correctAnswer.trim().toLowerCase();
    
    // Check exact match with correct answer
    if (normalizedStudentAnswer === normalizedCorrectAnswer) {
      return true;
    }
    
    // Check against acceptable answer variations
    const normalizedAcceptableAnswers = acceptableAnswers.map(answer => 
      answer.trim().toLowerCase()
    );
    
    if (normalizedAcceptableAnswers.includes(normalizedStudentAnswer)) {
      return true;
    }
    
    // For multiple choice, also check if it's just the letter (A, B, C, D)
    if (questionType === 'multiple-choice') {
      const studentLetter = normalizedStudentAnswer.replace(/[^a-d]/g, '');
      const correctLetter = normalizedCorrectAnswer.replace(/[^a-d]/g, '');
      
      if (studentLetter && correctLetter && studentLetter === correctLetter) {
        return true;
      }
    }
    
    return false;
  }
}
