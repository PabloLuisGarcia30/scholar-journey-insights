
export interface ConceptTaxonomy {
  subject: string;
  grade: string;
  concepts: {
    [conceptId: string]: {
      name: string;
      description: string;
      relatedSkills: string[];
      prerequisiteConcepts: string[];
      curriculumUnit?: string;
      difficultyLevel: 'basic' | 'intermediate' | 'advanced';
    };
  };
}

export interface ConceptMappingResult {
  expectedConcept: string;
  masteryLevel: 'mastered' | 'partial' | 'not_demonstrated' | 'unknown';
  source: 'curriculum_mapping' | 'gpt_inference' | 'manual_tag' | 'skill_mapping';
  confidence: number;
}

export class ConceptualAnchorService {
  private static readonly CONCEPT_TAXONOMIES: ConceptTaxonomy[] = [
    {
      subject: 'Math',
      grade: 'Grade 8',
      concepts: {
        'algebraic_expressions': {
          name: 'Combining like terms in algebraic expressions',
          description: 'Understanding how to identify and combine terms with the same variables',
          relatedSkills: ['Algebraic Expressions', 'Simplifying Expressions'],
          prerequisiteConcepts: ['basic_arithmetic', 'variable_recognition'],
          curriculumUnit: 'Algebra Foundations',
          difficultyLevel: 'intermediate'
        },
        'linear_equations': {
          name: 'Solving linear equations in one variable',
          description: 'Using inverse operations to isolate variables',
          relatedSkills: ['Linear Equations', 'Equation Solving'],
          prerequisiteConcepts: ['algebraic_expressions', 'inverse_operations'],
          curriculumUnit: 'Linear Relationships',
          difficultyLevel: 'intermediate'
        },
        'proportional_reasoning': {
          name: 'Understanding proportional relationships',
          description: 'Recognizing and working with ratios and proportions',
          relatedSkills: ['Ratios and Proportions', 'Percentage Calculations'],
          prerequisiteConcepts: ['fraction_operations', 'multiplication_division'],
          curriculumUnit: 'Proportional Relationships',
          difficultyLevel: 'intermediate'
        }
      }
    },
    {
      subject: 'Science',
      grade: 'Grade 8',
      concepts: {
        'conservation_of_energy': {
          name: 'Energy conservation in physical systems',
          description: 'Understanding that energy cannot be created or destroyed, only transformed',
          relatedSkills: ['Energy Transformations', 'Physics Calculations'],
          prerequisiteConcepts: ['forms_of_energy', 'energy_measurement'],
          curriculumUnit: 'Energy and Matter',
          difficultyLevel: 'advanced'
        },
        'cellular_respiration': {
          name: 'Cellular respiration process',
          description: 'How cells convert glucose and oxygen into energy (ATP)',
          relatedSkills: ['Cell Biology', 'Biochemical Processes'],
          prerequisiteConcepts: ['cell_structure', 'chemical_reactions'],
          curriculumUnit: 'Life Processes',
          difficultyLevel: 'advanced'
        }
      }
    }
  ];

  /**
   * Main method to determine the conceptual anchor point for a question
   */
  static async determineConceptualAnchor(
    questionText: string,
    skillName: string,
    subject: string,
    grade: string,
    studentAnswer?: string,
    correctAnswer?: string,
    questionContext?: string
  ): Promise<ConceptMappingResult> {
    console.log(`🧠 Determining conceptual anchor for skill: ${skillName} in ${subject} ${grade}`);

    // First try skill mapping
    const skillMappingResult = this.mapSkillToConcept(skillName, subject, grade);
    if (skillMappingResult) {
      console.log(`✅ Found concept via skill mapping: ${skillMappingResult.expectedConcept}`);
      return skillMappingResult;
    }

    // Try curriculum mapping
    const curriculumResult = this.mapCurriculumToConcept(questionText, subject, grade);
    if (curriculumResult) {
      console.log(`✅ Found concept via curriculum mapping: ${curriculumResult.expectedConcept}`);
      return curriculumResult;
    }

    // Fall back to GPT inference
    console.log(`🤖 Using GPT inference for concept determination`);
    return await this.inferConceptWithGPT(
      questionText,
      skillName,
      subject,
      grade,
      studentAnswer,
      correctAnswer,
      questionContext
    );
  }

  /**
   * Map a skill name to a conceptual anchor point
   */
  private static mapSkillToConcept(
    skillName: string,
    subject: string,
    grade: string
  ): ConceptMappingResult | null {
    const taxonomy = this.CONCEPT_TAXONOMIES.find(
      t => t.subject.toLowerCase() === subject.toLowerCase() && 
           t.grade.toLowerCase() === grade.toLowerCase()
    );

    if (!taxonomy) return null;

    for (const [conceptId, concept] of Object.entries(taxonomy.concepts)) {
      if (concept.relatedSkills.some(skill => 
        skill.toLowerCase().includes(skillName.toLowerCase()) ||
        skillName.toLowerCase().includes(skill.toLowerCase())
      )) {
        return {
          expectedConcept: concept.name,
          masteryLevel: 'unknown',
          source: 'skill_mapping',
          confidence: 0.8
        };
      }
    }

    return null;
  }

  /**
   * Map curriculum context to concept
   */
  private static mapCurriculumToConcept(
    questionText: string,
    subject: string,
    grade: string
  ): ConceptMappingResult | null {
    const taxonomy = this.CONCEPT_TAXONOMIES.find(
      t => t.subject.toLowerCase() === subject.toLowerCase() && 
           t.grade.toLowerCase() === grade.toLowerCase()
    );

    if (!taxonomy) return null;

    const questionLower = questionText.toLowerCase();

    // Look for concept keywords in question text
    for (const [conceptId, concept] of Object.entries(taxonomy.concepts)) {
      const conceptKeywords = [
        ...concept.name.split(' '),
        ...concept.description.split(' '),
        concept.curriculumUnit || ''
      ].filter(word => word.length > 3);

      const keywordMatches = conceptKeywords.filter(keyword =>
        questionLower.includes(keyword.toLowerCase())
      );

      if (keywordMatches.length >= 2) {
        return {
          expectedConcept: concept.name,
          masteryLevel: 'unknown',
          source: 'curriculum_mapping',
          confidence: 0.7
        };
      }
    }

    return null;
  }

  /**
   * Use GPT to infer the conceptual anchor point
   */
  private static async inferConceptWithGPT(
    questionText: string,
    skillName: string,
    subject: string,
    grade: string,
    studentAnswer?: string,
    correctAnswer?: string,
    questionContext?: string
  ): Promise<ConceptMappingResult> {
    try {
      // For now, return a reasonable default based on subject patterns
      // In production, this would call GPT API
      const fallbackConcepts = {
        'math': this.generateMathConcept(skillName, questionText),
        'science': this.generateScienceConcept(skillName, questionText),
        'english': this.generateEnglishConcept(skillName, questionText),
        'social studies': this.generateSocialStudiesConcept(skillName, questionText)
      };

      const concept = fallbackConcepts[subject.toLowerCase() as keyof typeof fallbackConcepts] || 
                     `Understanding ${skillName.toLowerCase()} concepts`;

      return {
        expectedConcept: concept,
        masteryLevel: 'unknown',
        source: 'gpt_inference',
        confidence: 0.6
      };
    } catch (error) {
      console.error('❌ Error in GPT concept inference:', error);
      return {
        expectedConcept: `Core ${skillName} understanding`,
        masteryLevel: 'unknown',
        source: 'gpt_inference',
        confidence: 0.3
      };
    }
  }

  /**
   * Assess concept mastery level based on student performance
   */
  static assessConceptMastery(
    isCorrect: boolean,
    studentAnswer: string,
    correctAnswer: string,
    questionType: string,
    confidenceScore?: number
  ): 'mastered' | 'partial' | 'not_demonstrated' | 'unknown' {
    if (isCorrect) {
      // High confidence correct answer suggests mastery
      if (confidenceScore && confidenceScore > 0.8) {
        return 'mastered';
      }
      // Correct but lower confidence suggests partial mastery
      return confidenceScore && confidenceScore > 0.5 ? 'mastered' : 'partial';
    }

    // For incorrect answers, analyze the type of error
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    if (questionType === 'short-answer' || questionType === 'essay') {
      // Check if student demonstrated some understanding
      const correctWords = correctLower.split(/\s+/).filter(word => word.length > 3);
      const studentWords = studentLower.split(/\s+/);
      const matchingWords = correctWords.filter(word => studentWords.includes(word));
      
      if (matchingWords.length / correctWords.length > 0.3) {
        return 'partial';
      }
    }

    // Check if it's a minor computational error vs conceptual misunderstanding
    if (questionType === 'multiple-choice' || questionType === 'true-false') {
      // Just wrong selection, but might understand the concept
      return confidenceScore && confidenceScore > 0.5 ? 'partial' : 'not_demonstrated';
    }

    return 'not_demonstrated';
  }

  // Helper methods to generate domain-specific concepts
  private static generateMathConcept(skillName: string, questionText: string): string {
    if (questionText.includes('equation') || skillName.includes('equation')) {
      return 'Solving equations using algebraic principles';
    } else if (questionText.includes('graph') || skillName.includes('graph')) {
      return 'Interpreting graphical representations of data and functions';
    } else if (questionText.includes('fraction') || skillName.includes('fraction')) {
      return 'Operations with fractions and rational numbers';
    } else {
      return `Application of ${skillName} mathematical principles`;
    }
  }

  private static generateScienceConcept(skillName: string, questionText: string): string {
    if (questionText.includes('experiment') || skillName.includes('experiment')) {
      return 'Scientific investigation and experimental design';
    } else if (questionText.includes('cell') || skillName.includes('cell')) {
      return 'Cellular structure and function';
    } else if (questionText.includes('force') || skillName.includes('force')) {
      return 'Forces and motion in physical systems';
    } else {
      return `Understanding ${skillName} scientific principles`;
    }
  }

  private static generateEnglishConcept(skillName: string, questionText: string): string {
    if (questionText.includes('author') || questionText.includes('theme')) {
      return 'Analyzing author\'s purpose and thematic elements';
    } else if (questionText.includes('grammar') || skillName.includes('grammar')) {
      return 'Application of grammatical conventions in writing';
    } else if (questionText.includes('read') || skillName.includes('comprehension')) {
      return 'Reading comprehension and textual analysis';
    } else {
      return `Demonstrating ${skillName} literacy skills`;
    }
  }

  private static generateSocialStudiesConcept(skillName: string, questionText: string): string {
    if (questionText.includes('govern') || skillName.includes('government')) {
      return 'Understanding governmental structures and civic processes';
    } else if (questionText.includes('econom') || skillName.includes('econom')) {
      return 'Economic principles and decision-making';
    } else if (questionText.includes('geograph') || skillName.includes('geo')) {
      return 'Geographic reasoning and spatial relationships';
    } else {
      return `Understanding ${skillName} social studies concepts`;
    }
  }
}
