
export interface SubjectMisconceptionMapping {
  subject: string;
  misconceptionCategories: {
    [key: string]: {
      name: string;
      description: string;
      commonTriggers: string[];
      remediationStrategies: string[];
    };
  };
}

export class SubjectSpecificMisconceptionService {
  private static readonly SUBJECT_MISCONCEPTIONS: SubjectMisconceptionMapping[] = [
    {
      subject: 'Math',
      misconceptionCategories: {
        'algebraic_sign_error': {
          name: 'Algebraic Sign Error',
          description: 'Confusion with positive/negative signs in algebraic operations',
          commonTriggers: ['subtraction', 'distribution', 'equation solving'],
          remediationStrategies: ['Review sign rules', 'Practice with number lines', 'Use color coding for signs']
        },
        'fraction_operations_error': {
          name: 'Fraction Operations Error',
          description: 'Incorrect application of fraction arithmetic rules',
          commonTriggers: ['adding fractions', 'multiplying fractions', 'mixed numbers'],
          remediationStrategies: ['Review fraction basics', 'Use visual fraction models', 'Practice with common denominators']
        },
        'order_of_operations_error': {
          name: 'Order of Operations Error',
          description: 'Incorrect sequence in mathematical operations (PEMDAS/BODMAS)',
          commonTriggers: ['complex expressions', 'nested parentheses', 'exponents'],
          remediationStrategies: ['Review PEMDAS/BODMAS', 'Practice step-by-step evaluation', 'Use parentheses for clarity']
        },
        'proportional_reasoning_error': {
          name: 'Proportional Reasoning Error',
          description: 'Difficulty understanding ratios, rates, and proportional relationships',
          commonTriggers: ['ratio problems', 'percentage calculations', 'scaling'],
          remediationStrategies: ['Use visual ratio models', 'Practice with real-world examples', 'Cross-multiplication practice']
        },
        'geometric_property_confusion': {
          name: 'Geometric Property Confusion',
          description: 'Misunderstanding of geometric shapes, angles, and spatial relationships',
          commonTriggers: ['angle calculations', 'area vs perimeter', 'similar triangles'],
          remediationStrategies: ['Use manipulatives', 'Draw diagrams', 'Practice with real objects']
        },
        'function_concept_error': {
          name: 'Function Concept Error',
          description: 'Misunderstanding of function notation, domain, range, or transformations',
          commonTriggers: ['function notation', 'graphing', 'inverse functions'],
          remediationStrategies: ['Use function machines', 'Practice with tables and graphs', 'Real-world function examples']
        }
      }
    },
    {
      subject: 'Science',
      misconceptionCategories: {
        'physics_force_misconception': {
          name: 'Physics Force Misconception',
          description: 'Incorrect understanding of forces, motion, and Newton\'s laws',
          commonTriggers: ['friction', 'gravity', 'motion diagrams'],
          remediationStrategies: ['Hands-on experiments', 'Force diagrams', 'Real-world examples']
        },
        'chemistry_bonding_error': {
          name: 'Chemistry Bonding Error',
          description: 'Confusion about ionic, covalent, and metallic bonding',
          commonTriggers: ['electron sharing', 'ion formation', 'molecular structures'],
          remediationStrategies: ['Use molecular models', 'Electron dot diagrams', 'Bonding activities']
        },
        'biology_evolution_misconception': {
          name: 'Biology Evolution Misconception',
          description: 'Misunderstanding of natural selection and evolutionary processes',
          commonTriggers: ['adaptation', 'survival of fittest', 'species change'],
          remediationStrategies: ['Use analogies', 'Case studies', 'Timeline activities']
        },
        'scientific_method_error': {
          name: 'Scientific Method Error',
          description: 'Confusion about hypothesis formation, variables, and experimental design',
          commonTriggers: ['controlled experiments', 'variables identification', 'data interpretation'],
          remediationStrategies: ['Practice designing experiments', 'Identify variables exercises', 'Data analysis activities']
        },
        'energy_conservation_misconception': {
          name: 'Energy Conservation Misconception',
          description: 'Misunderstanding of energy transformations and conservation laws',
          commonTriggers: ['potential vs kinetic energy', 'energy transfers', 'heat vs temperature'],
          remediationStrategies: ['Energy transformation demos', 'Conservation experiments', 'Real-world energy examples']
        }
      }
    },
    {
      subject: 'English',
      misconceptionCategories: {
        'grammar_structure_error': {
          name: 'Grammar Structure Error',
          description: 'Incorrect understanding of sentence structure and grammar rules',
          commonTriggers: ['subject-verb agreement', 'pronoun usage', 'sentence fragments'],
          remediationStrategies: ['Grammar exercises', 'Sentence diagramming', 'Peer editing']
        },
        'reading_comprehension_error': {
          name: 'Reading Comprehension Error',
          description: 'Difficulty understanding text meaning, inference, or author\'s purpose',
          commonTriggers: ['inference questions', 'main idea identification', 'author\'s tone'],
          remediationStrategies: ['Close reading strategies', 'Text annotation', 'Discussion activities']
        },
        'writing_organization_error': {
          name: 'Writing Organization Error',
          description: 'Problems with essay structure, paragraph development, or logical flow',
          commonTriggers: ['thesis statements', 'paragraph transitions', 'conclusion writing'],
          remediationStrategies: ['Outline practice', 'Paragraph structure templates', 'Peer review sessions']
        },
        'literary_analysis_misconception': {
          name: 'Literary Analysis Misconception',
          description: 'Misunderstanding of literary devices, themes, or character analysis',
          commonTriggers: ['symbolism', 'character motivation', 'theme identification'],
          remediationStrategies: ['Text-to-text connections', 'Character mapping', 'Symbol hunting activities']
        }
      }
    },
    {
      subject: 'Social Studies',
      misconceptionCategories: {
        'historical_causation_error': {
          name: 'Historical Causation Error',
          description: 'Misunderstanding cause and effect relationships in historical events',
          commonTriggers: ['war causes', 'economic factors', 'social movements'],
          remediationStrategies: ['Timeline activities', 'Cause-effect diagrams', 'Primary source analysis']
        },
        'geographic_concept_confusion': {
          name: 'Geographic Concept Confusion',
          description: 'Difficulty with maps, spatial relationships, and geographic patterns',
          commonTriggers: ['map reading', 'climate patterns', 'cultural geography'],
          remediationStrategies: ['Map practice', 'Geographic information systems', 'Field observations']
        },
        'civic_process_misconception': {
          name: 'Civic Process Misconception',
          description: 'Misunderstanding of government structures and democratic processes',
          commonTriggers: ['branches of government', 'voting process', 'rights and responsibilities'],
          remediationStrategies: ['Mock elections', 'Government simulations', 'Current events analysis']
        },
        'economic_principle_error': {
          name: 'Economic Principle Error',
          description: 'Confusion about supply and demand, trade, and economic systems',
          commonTriggers: ['market economics', 'trade relationships', 'resource allocation'],
          remediationStrategies: ['Economic simulations', 'Real-world examples', 'Data analysis activities']
        }
      }
    }
  ];

  static analyzeMisconceptionBySubject(
    subject: string,
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): string {
    const subjectMapping = this.SUBJECT_MISCONCEPTIONS.find(
      mapping => mapping.subject.toLowerCase() === subject.toLowerCase()
    );

    if (!subjectMapping) {
      // Fall back to generic categorization
      return this.getGenericMisconception(questionType, studentAnswer, correctAnswer, questionContext, options);
    }

    // Subject-specific analysis
    const categories = subjectMapping.misconceptionCategories;
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();
    const contextLower = questionContext?.toLowerCase() || '';

    // Math-specific analysis
    if (subject.toLowerCase() === 'math') {
      return this.analyzeMathMisconception(categories, studentLower, correctLower, contextLower, questionType);
    }

    // Science-specific analysis
    if (subject.toLowerCase() === 'science') {
      return this.analyzeScienceMisconception(categories, studentLower, correctLower, contextLower, questionType);
    }

    // English-specific analysis
    if (subject.toLowerCase() === 'english') {
      return this.analyzeEnglishMisconception(categories, studentLower, correctLower, contextLower, questionType);
    }

    // Social Studies-specific analysis
    if (subject.toLowerCase() === 'social studies' || subject.toLowerCase() === 'history') {
      return this.analyzeSocialStudiesMisconception(categories, studentLower, correctLower, contextLower, questionType);
    }

    return this.getGenericMisconception(questionType, studentAnswer, correctAnswer, questionContext, options);
  }

  private static analyzeMathMisconception(
    categories: any,
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    questionType: string
  ): string {
    // Check for sign errors
    if (this.hasSignError(studentAnswer, correctAnswer)) {
      return 'algebraic_sign_error';
    }

    // Check for fraction operation errors
    if (context.includes('fraction') || studentAnswer.includes('/') || correctAnswer.includes('/')) {
      return 'fraction_operations_error';
    }

    // Check for order of operations errors
    if (context.includes('expression') || context.includes('evaluate') || /[+\-*/()^]/.test(correctAnswer)) {
      return 'order_of_operations_error';
    }

    // Check for proportion errors
    if (context.includes('ratio') || context.includes('percent') || context.includes('proportion')) {
      return 'proportional_reasoning_error';
    }

    // Check for geometry errors
    if (context.includes('angle') || context.includes('area') || context.includes('perimeter') || context.includes('triangle')) {
      return 'geometric_property_confusion';
    }

    // Check for function errors
    if (context.includes('function') || context.includes('f(x)') || context.includes('graph')) {
      return 'function_concept_error';
    }

    return 'mathematical_conceptual_error';
  }

  private static analyzeScienceMisconception(
    categories: any,
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    questionType: string
  ): string {
    // Check for physics force misconceptions
    if (context.includes('force') || context.includes('motion') || context.includes('newton')) {
      return 'physics_force_misconception';
    }

    // Check for chemistry bonding errors
    if (context.includes('bond') || context.includes('electron') || context.includes('ion')) {
      return 'chemistry_bonding_error';
    }

    // Check for biology evolution misconceptions
    if (context.includes('evolution') || context.includes('adaptation') || context.includes('natural selection')) {
      return 'biology_evolution_misconception';
    }

    // Check for scientific method errors
    if (context.includes('experiment') || context.includes('hypothesis') || context.includes('variable')) {
      return 'scientific_method_error';
    }

    // Check for energy conservation misconceptions
    if (context.includes('energy') || context.includes('conservation') || context.includes('kinetic') || context.includes('potential')) {
      return 'energy_conservation_misconception';
    }

    return 'scientific_conceptual_error';
  }

  private static analyzeEnglishMisconception(
    categories: any,
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    questionType: string
  ): string {
    // Check for grammar structure errors
    if (context.includes('grammar') || context.includes('sentence') || context.includes('verb')) {
      return 'grammar_structure_error';
    }

    // Check for reading comprehension errors
    if (context.includes('comprehension') || context.includes('inference') || context.includes('main idea')) {
      return 'reading_comprehension_error';
    }

    // Check for writing organization errors
    if (context.includes('essay') || context.includes('paragraph') || context.includes('thesis')) {
      return 'writing_organization_error';
    }

    // Check for literary analysis misconceptions
    if (context.includes('literary') || context.includes('theme') || context.includes('character') || context.includes('symbol')) {
      return 'literary_analysis_misconception';
    }

    return 'language_arts_conceptual_error';
  }

  private static analyzeSocialStudiesMisconception(
    categories: any,
    studentAnswer: string,
    correctAnswer: string,
    context: string,
    questionType: string
  ): string {
    // Check for historical causation errors
    if (context.includes('cause') || context.includes('effect') || context.includes('why') || context.includes('reason')) {
      return 'historical_causation_error';
    }

    // Check for geographic concept confusion
    if (context.includes('map') || context.includes('geography') || context.includes('location') || context.includes('climate')) {
      return 'geographic_concept_confusion';
    }

    // Check for civic process misconceptions
    if (context.includes('government') || context.includes('democracy') || context.includes('vote') || context.includes('constitution')) {
      return 'civic_process_misconception';
    }

    // Check for economic principle errors
    if (context.includes('economic') || context.includes('trade') || context.includes('supply') || context.includes('demand')) {
      return 'economic_principle_error';
    }

    return 'social_studies_conceptual_error';
  }

  private static hasSignError(studentAnswer: string, correctAnswer: string): boolean {
    // Check if the student answer is the opposite sign of the correct answer
    const studentNum = parseFloat(studentAnswer);
    const correctNum = parseFloat(correctAnswer);
    
    if (!isNaN(studentNum) && !isNaN(correctNum)) {
      return Math.abs(studentNum) === Math.abs(correctNum) && Math.sign(studentNum) !== Math.sign(correctNum);
    }
    
    return false;
  }

  private static getGenericMisconception(
    questionType: string,
    studentAnswer: string,
    correctAnswer: string,
    questionContext?: string,
    options?: string[]
  ): string {
    const studentLower = studentAnswer.toLowerCase().trim();
    const correctLower = correctAnswer.toLowerCase().trim();

    if (questionType === 'multiple-choice') {
      if (options && options.includes(studentAnswer)) {
        const correctIndex = options.indexOf(correctAnswer);
        const studentIndex = options.indexOf(studentAnswer);
        
        if (Math.abs(correctIndex - studentIndex) === 1) {
          return 'adjacent_confusion';
        } else {
          return 'conceptual_misunderstanding';
        }
      }
      return 'procedural_error';
    }

    if (questionType === 'short-answer' || questionType === 'essay') {
      if (studentLower.length < correctLower.length * 0.3) {
        return 'incomplete_understanding';
      } else if (studentLower.includes('not') || studentLower.includes('opposite')) {
        return 'inverse_reasoning';
      } else {
        return 'conceptual_gap';
      }
    }

    return 'unclassified';
  }

  static getMisconceptionDetails(subject: string, misconceptionCategory: string): {
    name: string;
    description: string;
    remediationStrategies: string[];
  } | null {
    const subjectMapping = this.SUBJECT_MISCONCEPTIONS.find(
      mapping => mapping.subject.toLowerCase() === subject.toLowerCase()
    );

    if (!subjectMapping || !subjectMapping.misconceptionCategories[misconceptionCategory]) {
      return null;
    }

    const category = subjectMapping.misconceptionCategories[misconceptionCategory];
    return {
      name: category.name,
      description: category.description,
      remediationStrategies: category.remediationStrategies
    };
  }

  static getAllSubjectMisconceptions(): SubjectMisconceptionMapping[] {
    return this.SUBJECT_MISCONCEPTIONS;
  }

  static getSubjectSpecificCategories(subject: string): string[] {
    const subjectMapping = this.SUBJECT_MISCONCEPTIONS.find(
      mapping => mapping.subject.toLowerCase() === subject.toLowerCase()
    );

    return subjectMapping ? Object.keys(subjectMapping.misconceptionCategories) : [];
  }
}
