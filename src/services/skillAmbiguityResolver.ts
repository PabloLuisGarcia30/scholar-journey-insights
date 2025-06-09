
import { supabase } from "@/integrations/supabase/client";

export interface SkillAmbiguityResult {
  questionNumber: number;
  matchedSkills: string[];
  confidence: number;
  isAmbiguous: boolean;
  escalated: boolean;
  reasoning: string;
  originalSkills: string[];
}

export interface SkillAmbiguityConfig {
  maxSkillsPerQuestion: number;
  minSkillsRequired: number;
  ambiguityThreshold: number;
  escalationModel: 'gpt-4.1-2025-04-14' | 'gpt-4o-mini';
}

const DEFAULT_SKILL_CONFIG: SkillAmbiguityConfig = {
  maxSkillsPerQuestion: 2, // Maximum skills allowed before escalation
  minSkillsRequired: 1,    // Minimum skills required
  ambiguityThreshold: 0.7, // Confidence threshold for skill matching
  escalationModel: 'gpt-4.1-2025-04-14'
};

export class SkillAmbiguityResolver {
  private config: SkillAmbiguityConfig;

  constructor(config: Partial<SkillAmbiguityConfig> = {}) {
    this.config = { ...DEFAULT_SKILL_CONFIG, ...config };
  }

  analyzeSkillAmbiguity(
    questionNumber: number,
    questionText: string,
    studentAnswer: string,
    availableSkills: string[],
    detectedSkills: string[],
    confidence: number
  ): { isAmbiguous: boolean; reason: string } {
    // Check if too many skills detected
    if (detectedSkills.length > this.config.maxSkillsPerQuestion) {
      return {
        isAmbiguous: true,
        reason: `Too many skills detected (${detectedSkills.length} > ${this.config.maxSkillsPerQuestion})`
      };
    }

    // Check if no skills detected
    if (detectedSkills.length < this.config.minSkillsRequired) {
      return {
        isAmbiguous: true,
        reason: `Too few skills detected (${detectedSkills.length} < ${this.config.minSkillsRequired})`
      };
    }

    // Check confidence threshold
    if (confidence < this.config.ambiguityThreshold) {
      return {
        isAmbiguous: true,
        reason: `Low confidence in skill matching (${confidence} < ${this.config.ambiguityThreshold})`
      };
    }

    // Check if detected skills are not in available skills
    const invalidSkills = detectedSkills.filter(skill => !availableSkills.includes(skill));
    if (invalidSkills.length > 0) {
      return {
        isAmbiguous: true,
        reason: `Invalid skills detected: ${invalidSkills.join(', ')}`
      };
    }

    return { isAmbiguous: false, reason: 'Skills clearly matched' };
  }

  async escalateAmbiguousSkillMatch(
    questionNumber: number,
    questionText: string,
    studentAnswer: string,
    availableSkills: string[],
    originalDetection: string[]
  ): Promise<SkillAmbiguityResult> {
    try {
      const escalationPrompt = this.createEscalationPrompt(
        questionText,
        studentAnswer,
        availableSkills,
        originalDetection
      );

      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          escalationMode: true,
          questionNumber,
          questionText,
          studentAnswer,
          availableSkills,
          escalationPrompt,
          model: this.config.escalationModel
        }
      });

      if (error) {
        console.error('Skill escalation failed:', error);
        return this.createFallbackResult(questionNumber, originalDetection, availableSkills);
      }

      const result = data.skillEscalation || {};
      
      return {
        questionNumber,
        matchedSkills: result.matchedSkills || originalDetection,
        confidence: result.confidence || 0.5,
        isAmbiguous: false, // Resolved through escalation
        escalated: true,
        reasoning: result.reasoning || 'Escalated skill matching completed',
        originalSkills: originalDetection
      };

    } catch (error) {
      console.error('Skill escalation error:', error);
      return this.createFallbackResult(questionNumber, originalDetection, availableSkills);
    }
  }

  private createEscalationPrompt(
    questionText: string,
    studentAnswer: string,
    availableSkills: string[],
    originalDetection: string[]
  ): string {
    return `SKILL MATCHING ESCALATION - Resolve Ambiguous Skill Assignment

Question: ${questionText}
Student Answer: ${studentAnswer}
Available Skills: ${availableSkills.join(', ')}
Initial Detection: ${originalDetection.join(', ')}

INSTRUCTIONS:
1. Analyze the question and student answer carefully
2. Match ONLY to skills from the Available Skills list
3. Select the MOST RELEVANT skills (maximum ${this.config.maxSkillsPerQuestion})
4. Provide high confidence reasoning for your selection
5. If multiple skills apply equally, choose the PRIMARY skill being assessed

REQUIRED OUTPUT FORMAT (JSON):
{
  "matchedSkills": ["skill1", "skill2"],
  "confidence": 0.95,
  "reasoning": "Detailed explanation of skill selection",
  "primarySkill": "most_relevant_skill"
}

Focus on ACCURACY over quantity. Select skills that are DIRECTLY assessed by this specific question.`;
  }

  private createFallbackResult(
    questionNumber: number,
    originalSkills: string[],
    availableSkills: string[]
  ): SkillAmbiguityResult {
    // Conservative fallback: select first available skill or most common skill
    const fallbackSkill = availableSkills.length > 0 ? [availableSkills[0]] : ['General'];
    
    return {
      questionNumber,
      matchedSkills: fallbackSkill,
      confidence: 0.6,
      isAmbiguous: false,
      escalated: true,
      reasoning: 'Fallback skill assignment due to escalation failure',
      originalSkills
    };
  }

  async processQuestionSkills(questions: Array<{
    questionNumber: number;
    questionText: string;
    studentAnswer: string;
    availableSkills: string[];
    detectedSkills: string[];
    confidence: number;
  }>): Promise<SkillAmbiguityResult[]> {
    const results: SkillAmbiguityResult[] = [];

    for (const question of questions) {
      const ambiguityCheck = this.analyzeSkillAmbiguity(
        question.questionNumber,
        question.questionText,
        question.studentAnswer,
        question.availableSkills,
        question.detectedSkills,
        question.confidence
      );

      if (ambiguityCheck.isAmbiguous) {
        console.log(`🎯 Escalating ambiguous skill match for Q${question.questionNumber}: ${ambiguityCheck.reason}`);
        
        const escalatedResult = await this.escalateAmbiguousSkillMatch(
          question.questionNumber,
          question.questionText,
          question.studentAnswer,
          question.availableSkills,
          question.detectedSkills
        );
        
        results.push(escalatedResult);
      } else {
        results.push({
          questionNumber: question.questionNumber,
          matchedSkills: question.detectedSkills,
          confidence: question.confidence,
          isAmbiguous: false,
          escalated: false,
          reasoning: ambiguityCheck.reason,
          originalSkills: question.detectedSkills
        });
      }
    }

    return results;
  }

  updateConfiguration(config: Partial<SkillAmbiguityConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🎯 Skill ambiguity resolver configuration updated:', this.config);
  }

  getConfiguration(): SkillAmbiguityConfig {
    return { ...this.config };
  }
}

