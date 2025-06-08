
import { supabase } from "@/integrations/supabase/client";
import { EnhancedLocalGradingResult, LocalSkillScore } from "./enhancedLocalGradingService";

export interface HybridGradingResults {
  localResults: EnhancedLocalGradingResult[];
  openAIResults: EnhancedLocalGradingResult[];
  mergedResults: EnhancedLocalGradingResult[];
  totalScore: {
    pointsEarned: number;
    pointsPossible: number;
    percentage: number;
  };
  skillScores: LocalSkillScore[];
  costAnalysis: {
    localQuestionsGraded: number;
    openAIQuestionsGraded: number;
    estimatedCostSavings: number;
    processingBreakdown: string;
  };
  summary: {
    totalQuestions: number;
    localGradingAccuracy: number;
    hybridProcessingComplete: boolean;
    combinedConfidence: number;
  };
}

export class HybridGradingResultsMerger {
  static mergeResults(
    localResults: EnhancedLocalGradingResult[],
    openAIResults: EnhancedLocalGradingResult[]
  ): HybridGradingResults {
    console.log(`🔄 Merging hybrid results: ${localResults.length} local + ${openAIResults.length} OpenAI`);
    
    // Combine all results
    const mergedResults = [...localResults, ...openAIResults].sort(
      (a, b) => a.questionNumber - b.questionNumber
    );

    // Calculate total scores
    const totalPointsEarned = mergedResults.reduce((sum, r) => sum + r.pointsEarned, 0);
    const totalPointsPossible = mergedResults.reduce((sum, r) => sum + r.pointsPossible, 0);
    const percentage = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0;

    // Calculate skill scores from merged results
    const skillScores = this.calculateCombinedSkillScores(mergedResults);

    // Generate cost analysis
    const costAnalysis = this.generateCostAnalysis(localResults.length, openAIResults.length);

    // Calculate combined confidence
    const combinedConfidence = mergedResults.length > 0 
      ? mergedResults.reduce((sum, r) => sum + r.confidence, 0) / mergedResults.length 
      : 0;

    const hybridResults: HybridGradingResults = {
      localResults,
      openAIResults,
      mergedResults,
      totalScore: {
        pointsEarned: Math.round(totalPointsEarned * 100) / 100,
        pointsPossible: totalPointsPossible,
        percentage: Math.round(percentage * 100) / 100
      },
      skillScores,
      costAnalysis,
      summary: {
        totalQuestions: mergedResults.length,
        localGradingAccuracy: localResults.length / mergedResults.length,
        hybridProcessingComplete: true,
        combinedConfidence: Math.round(combinedConfidence * 100) / 100
      }
    };

    console.log(`✅ Hybrid results merged: ${hybridResults.totalScore.pointsEarned}/${hybridResults.totalScore.pointsPossible} (${hybridResults.totalScore.percentage}%)`);
    return hybridResults;
  }

  private static calculateCombinedSkillScores(results: EnhancedLocalGradingResult[]): LocalSkillScore[] {
    const skillScores: { [skillName: string]: LocalSkillScore } = {};

    for (const result of results) {
      if (!result.skillMappings) continue;

      for (const skillMapping of result.skillMappings) {
        const skillKey = `${skillMapping.skill_type}:${skillMapping.skill_name}`;
        
        if (!skillScores[skillKey]) {
          skillScores[skillKey] = {
            skill_name: skillMapping.skill_name,
            skill_type: skillMapping.skill_type,
            points_earned: 0,
            points_possible: 0,
            score: 0,
            questions_attempted: 0,
            questions_correct: 0
          };
        }

        const validatedWeight = Math.min(Math.max(skillMapping.skill_weight, 0), 2.0);
        const weightedPoints = result.pointsPossible * validatedWeight;
        const weightedEarned = result.pointsEarned * validatedWeight;

        skillScores[skillKey].points_possible += weightedPoints;
        skillScores[skillKey].points_earned += weightedEarned;
        skillScores[skillKey].questions_attempted += 1;
        
        if (result.isCorrect) {
          skillScores[skillKey].questions_correct += 1;
        }
      }
    }

    return Object.values(skillScores).map(skill => ({
      ...skill,
      points_earned: Math.round(skill.points_earned * 100) / 100,
      points_possible: Math.round(skill.points_possible * 100) / 100,
      score: skill.points_possible > 0 ? (skill.points_earned / skill.points_possible) * 100 : 0
    }));
  }

  private static generateCostAnalysis(localCount: number, openAICount: number): {
    localQuestionsGraded: number;
    openAIQuestionsGraded: number;
    estimatedCostSavings: number;
    processingBreakdown: string;
  } {
    const totalQuestions = localCount + openAICount;
    const estimatedOpenAICostPerQuestion = 0.01; // Rough estimate
    const potentialCost = totalQuestions * estimatedOpenAICostPerQuestion;
    const actualCost = openAICount * estimatedOpenAICostPerQuestion;
    const costSavings = potentialCost - actualCost;
    const savingsPercentage = totalQuestions > 0 ? (localCount / totalQuestions) * 100 : 0;

    return {
      localQuestionsGraded: localCount,
      openAIQuestionsGraded: openAICount,
      estimatedCostSavings: Math.round(costSavings * 100) / 100,
      processingBreakdown: `${localCount} local (free) + ${openAICount} OpenAI ($${actualCost.toFixed(3)}) | ${savingsPercentage.toFixed(1)}% cost savings`
    };
  }

  static async saveHybridResultsToDatabase(
    hybridResults: HybridGradingResults,
    examId: string,
    studentName: string,
    classId?: string
  ): Promise<void> {
    console.log('💾 Saving hybrid grading results to database...');
    
    try {
      // Save test result with hybrid grading metadata
      const { data: testResult, error: testError } = await supabase
        .from('test_results')
        .insert({
          exam_id: examId,
          student_id: studentName, // Using student name as ID for now
          class_id: classId,
          overall_score: hybridResults.totalScore.percentage,
          total_points_earned: hybridResults.totalScore.pointsEarned,
          total_points_possible: hybridResults.totalScore.pointsPossible,
          detailed_analysis: JSON.stringify({
            hybridGrading: true,
            localResults: hybridResults.localResults.length,
            openAIResults: hybridResults.openAIResults.length,
            costAnalysis: hybridResults.costAnalysis,
            combinedConfidence: hybridResults.summary.combinedConfidence
          }),
          ai_feedback: this.generateHybridFeedback(hybridResults)
        })
        .select()
        .single();

      if (testError) {
        console.error('Error saving test result:', testError);
        throw testError;
      }

      // Save skill scores
      if (hybridResults.skillScores.length > 0) {
        const contentSkillScores = hybridResults.skillScores
          .filter(skill => skill.skill_type === 'content')
          .map(skill => ({
            test_result_id: testResult.id,
            skill_name: skill.skill_name,
            points_earned: skill.points_earned,
            points_possible: skill.points_possible,
            score: skill.score
          }));

        const subjectSkillScores = hybridResults.skillScores
          .filter(skill => skill.skill_type === 'subject')
          .map(skill => ({
            test_result_id: testResult.id,
            skill_name: skill.skill_name,
            points_earned: skill.points_earned,
            points_possible: skill.points_possible,
            score: skill.score
          }));

        if (contentSkillScores.length > 0) {
          const { error: contentError } = await supabase
            .from('content_skill_scores')
            .insert(contentSkillScores);
          
          if (contentError) {
            console.error('Error saving content skill scores:', contentError);
          }
        }

        if (subjectSkillScores.length > 0) {
          const { error: subjectError } = await supabase
            .from('subject_skill_scores')
            .insert(subjectSkillScores);
          
          if (subjectError) {
            console.error('Error saving subject skill scores:', subjectError);
          }
        }
      }

      console.log('✅ Hybrid results saved to database successfully');
    } catch (error) {
      console.error('Failed to save hybrid results to database:', error);
      throw error;
    }
  }

  private static generateHybridFeedback(hybridResults: HybridGradingResults): string {
    const { totalScore, costAnalysis, summary } = hybridResults;
    
    let feedback = `🤖 Hybrid AI Grading Complete: ${totalScore.pointsEarned}/${totalScore.pointsPossible} (${totalScore.percentage}%)`;
    
    feedback += `\n\n📊 Processing Breakdown:`;
    feedback += `\n• ${costAnalysis.localQuestionsGraded} questions graded locally (DistilBERT) - FREE`;
    feedback += `\n• ${costAnalysis.openAIQuestionsGraded} complex questions graded with OpenAI`;
    feedback += `\n• ${costAnalysis.processingBreakdown}`;
    
    feedback += `\n\n🎯 System Performance:`;
    feedback += `\n• Combined confidence: ${summary.combinedConfidence}%`;
    feedback += `\n• Local processing rate: ${(summary.localGradingAccuracy * 100).toFixed(1)}%`;
    feedback += `\n• Estimated cost savings: $${costAnalysis.estimatedCostSavings}`;
    
    if (hybridResults.skillScores.length > 0) {
      feedback += `\n\n📈 Skills Analysis: ${hybridResults.skillScores.length} skills assessed with hybrid AI`;
    }
    
    return feedback;
  }
}
