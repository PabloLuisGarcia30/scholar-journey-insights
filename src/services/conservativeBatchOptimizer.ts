
import { ComplexityAnalysis } from './shared/aiOptimizationShared';

export interface SkillAwareBatchGroup {
  id: string;
  questions: any[];
  answerKeys: any[];
  complexity: 'simple' | 'medium' | 'complex';
  subject: string;
  skillDomain: string;
  rubricType: string;
  confidenceRange: [number, number];
  recommendedModel: string;
  batchSize: number;
  priority: number;
  processingMethod: 'local' | 'openai_batch' | 'openai_single';
  qualityMetrics: {
    skillAlignment: number;
    rubricConsistency: number;
    questionTypeCompatibility: number;
    crossQuestionIsolation?: number;
    skillAmbiguityScore?: number;
  };
}

export interface ConservativeBatchConfig {
  // Aggressive batching for local processing
  localBatchSizes: {
    simple: number;
    medium: number;
    complex: number;
  };
  // Conservative batching for OpenAI processing
  openAIBatchSizes: {
    simple: number;
    medium: number;
    complex: number;
  };
  minBatchSize: number;
  enableSkillGrouping: boolean;
  enableRubricGrouping: boolean;
  qualityThresholds: {
    minSkillAlignment: number;
    minRubricConsistency: number;
    minConfidence: number;
    localAggressiveThreshold: number; // Confidence threshold for aggressive local batching
  };
  adaptiveSizing: boolean;
  qualityFallbackEnabled: boolean;
}

const HYBRID_CONSERVATIVE_CONFIG: ConservativeBatchConfig = {
  // Aggressive batching for simple questions processed locally
  localBatchSizes: {
    simple: 20,   // Increased from 6 - aggressive for MCQs
    medium: 8,    // Increased from 4 - moderate for local processing
    complex: 3    // Slightly increased from 2
  },
  // Conservative batching for OpenAI processing (maintain quality)
  openAIBatchSizes: {
    simple: 4,    // Conservative even for simple OpenAI processing
    medium: 3,    // Very conservative for medium complexity
    complex: 2    // Ultra conservative for complex reasoning
  },
  minBatchSize: 1,
  enableSkillGrouping: true,
  enableRubricGrouping: true,
  qualityThresholds: {
    minSkillAlignment: 0.8,
    minRubricConsistency: 0.9,
    minConfidence: 0.7,
    localAggressiveThreshold: 0.85 // High confidence required for aggressive local batching
  },
  adaptiveSizing: true,
  qualityFallbackEnabled: true
};

export class ConservativeBatchOptimizer {
  private config: ConservativeBatchConfig;
  private batchCounter = 0;
  private qualityMetrics: Array<{ 
    timestamp: number; 
    batchSize: number; 
    accuracy: number; 
    skillAccuracy: number;
    processingMethod: string;
  }> = [];

  constructor(config: Partial<ConservativeBatchConfig> = {}) {
    this.config = { ...HYBRID_CONSERVATIVE_CONFIG, ...config };
  }

  optimizeQuestionBatches(
    questions: any[], 
    answerKeys: any[],
    skillMappings: any[],
    complexityAnalyses: ComplexityAnalysis[]
  ): SkillAwareBatchGroup[] {
    console.log(`🎯 Hybrid Conservative Batching: Processing ${questions.length} questions with method-aware strategy`);

    // Phase 1: Classify questions by processing method first
    const { localQuestions, openAIQuestions } = this.separateByProcessingMethod(
      questions, 
      answerKeys, 
      skillMappings, 
      complexityAnalyses
    );

    console.log(`📊 Method separation: ${localQuestions.length} local, ${openAIQuestions.length} OpenAI`);

    // Phase 2: Create aggressive batches for local processing
    const localBatches = this.createAggressiveLocalBatches(localQuestions);
    
    // Phase 3: Create conservative batches for OpenAI processing
    const openAIBatches = this.createConservativeOpenAIBatches(openAIQuestions);
    
    // Phase 4: Combine and prioritize batches
    const allBatches = [...localBatches, ...openAIBatches];
    const prioritizedBatches = this.prioritizeBatches(allBatches);
    
    console.log(`✅ Hybrid batching complete: ${localBatches.length} aggressive local + ${openAIBatches.length} conservative OpenAI batches`);
    
    return prioritizedBatches;
  }

  private separateByProcessingMethod(
    questions: any[], 
    answerKeys: any[], 
    skillMappings: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): {
    localQuestions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>;
    openAIQuestions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>;
  } {
    const localQuestions: any[] = [];
    const openAIQuestions: any[] = [];

    questions.forEach((question, index) => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      const questionSkills = skillMappings.filter(sm => sm.question_number === question.questionNumber);
      const analysis = complexityAnalyses[index];

      if (!answerKey || !analysis) {
        // Missing data -> OpenAI for safety
        openAIQuestions.push({ question, answerKey, skills: questionSkills, analysis, index });
        return;
      }

      const processingMethod = this.determineProcessingMethod(question, answerKey, analysis);
      
      if (processingMethod === 'local') {
        localQuestions.push({ question, answerKey, skills: questionSkills, analysis, index });
      } else {
        openAIQuestions.push({ question, answerKey, skills: questionSkills, analysis, index });
      }
    });

    return { localQuestions, openAIQuestions };
  }

  private determineProcessingMethod(
    question: any,
    answerKey: any,
    analysis: ComplexityAnalysis
  ): 'local' | 'openai' {
    // Enhanced routing logic for aggressive local batching
    
    // High confidence simple questions -> aggressive local processing
    if (analysis.complexityScore <= 30 && 
        analysis.confidenceInDecision >= this.config.qualityThresholds.localAggressiveThreshold) {
      
      // Additional checks for truly simple questions
      const questionType = answerKey.question_type?.toLowerCase() || '';
      const hasReviewFlags = question.detectedAnswer?.reviewFlag || 
                           question.detectedAnswer?.multipleMarksDetected ||
                           (question.detectedAnswer?.confidence || 0) < 0.7;

      // Simple MCQs, T/F, basic numeric without review flags
      if ((questionType.includes('multiple') || 
           questionType.includes('true') || 
           questionType.includes('false') ||
           this.isSimpleNumeric(answerKey)) && 
          !hasReviewFlags) {
        return 'local';
      }
    }

    // Medium confidence medium complexity -> conservative local
    if (analysis.complexityScore <= 50 && 
        analysis.confidenceInDecision >= 0.80 &&
        answerKey.question_type?.toLowerCase().includes('multiple')) {
      return 'local';
    }

    // Everything else -> OpenAI for quality
    return 'openai';
  }

  private isSimpleNumeric(answerKey: any): boolean {
    const correctAnswer = answerKey.correct_answer?.toString() || '';
    const questionText = answerKey.question_text?.toLowerCase() || '';
    
    // Simple numeric: single number, basic calculation
    const isNumeric = /^\d+(\.\d+)?$/.test(correctAnswer.trim());
    const isBasicMath = questionText.includes('calculate') || 
                       questionText.includes('solve') ||
                       questionText.includes('find');
    
    return isNumeric && isBasicMath && correctAnswer.length <= 10;
  }

  private createAggressiveLocalBatches(
    localQuestions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>
  ): SkillAwareBatchGroup[] {
    console.log(`🚀 Creating aggressive batches for ${localQuestions.length} local questions`);
    
    const batches: SkillAwareBatchGroup[] = [];

    // Group by complexity for aggressive batching
    const complexityGroups = this.groupLocalQuestionsByComplexity(localQuestions);
    
    for (const [complexity, group] of complexityGroups) {
      const maxBatchSize = this.config.localBatchSizes[complexity as keyof typeof this.config.localBatchSizes];
      
      // Create large, aggressive batches for local processing
      for (let i = 0; i < group.length; i += maxBatchSize) {
        const batchQuestions = group.slice(i, i + maxBatchSize);
        
        if (batchQuestions.length > 0) {
          const questions = batchQuestions.map(q => q.question);
          const answerKeys = batchQuestions.map(q => q.answerKey);
          const skills = batchQuestions.map(q => q.skills);
          const analyses = batchQuestions.map(q => q.analysis);
          
          const qualityMetrics = this.calculateBatchQualityMetrics(questions, answerKeys, skills);
          
          batches.push({
            id: `aggressive_local_${++this.batchCounter}`,
            questions,
            answerKeys,
            complexity: complexity as any,
            subject: this.extractSubject(answerKeys[0], skills[0]),
            skillDomain: this.extractSkillDomain(skills.flat()),
            rubricType: this.extractRubricType(answerKeys[0]),
            confidenceRange: this.calculateConfidenceRange(analyses),
            recommendedModel: 'local_distilbert',
            batchSize: questions.length,
            priority: this.calculateAggressivePriority(complexity as any, analyses),
            processingMethod: 'local',
            qualityMetrics
          });
        }
      }
    }

    return batches;
  }

  private createConservativeOpenAIBatches(
    openAIQuestions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>
  ): SkillAwareBatchGroup[] {
    console.log(`🎯 Creating conservative batches with enhanced cross-question isolation for ${openAIQuestions.length} OpenAI questions`);
    
    const batches: SkillAwareBatchGroup[] = [];

    // Group by skill domain and complexity for conservative batching
    const skillGroups = this.groupOpenAIQuestionsBySkill(openAIQuestions);
    
    for (const [groupKey, group] of skillGroups) {
      const complexityGroups = this.groupByComplexityConservative(group);
      
      for (const [complexity, complexityGroup] of complexityGroups) {
        // Reduced batch sizes for enhanced cross-question isolation
        const maxBatchSize = Math.min(
          this.config.openAIBatchSizes[complexity as keyof typeof this.config.openAIBatchSizes],
          4 // Maximum 4 questions per batch for enhanced isolation
        );
        
        // Create small, conservative batches for OpenAI processing with enhanced isolation
        for (let i = 0; i < complexityGroup.length; i += maxBatchSize) {
          const batchQuestions = complexityGroup.slice(i, i + maxBatchSize);
          
          if (batchQuestions.length > 0) {
            const questions = batchQuestions.map(q => q.question);
            const answerKeys = batchQuestions.map(q => q.answerKey);
            const skills = batchQuestions.map(q => q.skills);
            const analyses = batchQuestions.map(q => q.analysis);
            
            const qualityMetrics = this.calculateBatchQualityMetrics(questions, answerKeys, skills);
            
            // Enhanced quality threshold for cross-question isolation
            const enhancedQualityCheck = this.meetEnhancedQualityThresholds(qualityMetrics, batchQuestions.length);
            
            if (enhancedQualityCheck.meetsThreshold) {
              batches.push({
                id: `enhanced_conservative_openai_${++this.batchCounter}`,
                questions,
                answerKeys,
                complexity: complexity as any,
                subject: this.extractSubject(answerKeys[0], skills[0]),
                skillDomain: this.extractSkillDomain(skills.flat()),
                rubricType: this.extractRubricType(answerKeys[0]),
                confidenceRange: this.calculateConfidenceRange(analyses),
                recommendedModel: this.selectConservativeModel(complexity as any, qualityMetrics),
                batchSize: questions.length,
                priority: this.calculateConservativePriority(complexity as any, analyses),
                processingMethod: batchQuestions.length === 1 ? 'openai_single' : 'openai_batch',
                qualityMetrics: {
                  ...qualityMetrics,
                  crossQuestionIsolation: enhancedQualityCheck.isolationScore,
                  skillAmbiguityScore: enhancedQualityCheck.skillAmbiguityScore
                }
              });
            } else {
              // Split into individual questions for maximum isolation and quality
              console.log(`🎯 Splitting batch due to enhanced quality requirements: ${enhancedQualityCheck.reason}`);
              
              batchQuestions.forEach((questionData) => {
                batches.push(this.createEnhancedSingleQuestionBatch(
                  questionData.question,
                  questionData.answerKey,
                  questionData.skills,
                  this.extractSubject(questionData.answerKey, questionData.skills),
                  this.extractSkillDomain(questionData.skills),
                  this.extractRubricType(questionData.answerKey)
                ));
              });
            }
          }
        }
      }
    }

    return batches;
  }

  private groupLocalQuestionsByComplexity(
    questions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>
  ): Map<string, typeof questions> {
    const groups = new Map([
      ['simple', []],
      ['medium', []],
      ['complex', []]
    ]);

    questions.forEach((questionData) => {
      const complexity = this.determineComplexity(questionData.analysis);
      const group = groups.get(complexity);
      if (group) {
        group.push(questionData);
      }
    });

    return groups;
  }

  private groupOpenAIQuestionsBySkill(
    questions: Array<{
      question: any;
      answerKey: any;
      skills: any[];
      analysis: ComplexityAnalysis;
      index: number;
    }>
  ): Map<string, typeof questions> {
    const groups = new Map();

    questions.forEach((questionData) => {
      const subject = this.extractSubject(questionData.answerKey, questionData.skills);
      const skillDomain = this.extractSkillDomain(questionData.skills);
      const rubricType = this.extractRubricType(questionData.answerKey);
      
      const groupKey = `${subject}_${skillDomain}_${rubricType}`;
      
      if (!groups.has(groupKey)) {
        groups.set(groupKey, []);
      }
      
      groups.get(groupKey).push(questionData);
    });

    return groups;
  }

  private groupByComplexityConservative(questions: any[]): Map<string, any[]> {
    const groups = new Map([
      ['simple', []],
      ['medium', []],
      ['complex', []]
    ]);

    questions.forEach((questionData) => {
      const complexity = this.determineComplexity(questionData.analysis);
      const group = groups.get(complexity);
      if (group) {
        group.push(questionData);
      }
    });

    return groups;
  }

  private prioritizeBatches(batches: SkillAwareBatchGroup[]): SkillAwareBatchGroup[] {
    return batches.sort((a, b) => {
      // Prioritize local processing for speed
      if (a.processingMethod === 'local' && b.processingMethod !== 'local') return -1;
      if (b.processingMethod === 'local' && a.processingMethod !== 'local') return 1;
      
      // Then by priority score
      return b.priority - a.priority;
    });
  }

  private calculateAggressivePriority(
    complexity: 'simple' | 'medium' | 'complex',
    analyses: ComplexityAnalysis[]
  ): number {
    let priority = 70; // Higher base priority for local processing

    // Bonus for high confidence (reliable fast processing)
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidenceInDecision, 0) / analyses.length;
    priority += (avgConfidence / 100) * 20;

    // Simple questions get highest priority for quick wins
    switch (complexity) {
      case 'simple': priority += 30; break;
      case 'medium': priority += 20; break;
      case 'complex': priority += 10; break;
    }

    // Bonus for larger batches (efficiency)
    if (analyses.length >= 10) {
      priority += 15;
    } else if (analyses.length >= 5) {
      priority += 10;
    }

    return Math.round(priority);
  }

  private calculateBatchQualityMetrics(
    questions: any[], 
    answerKeys: any[], 
    skillMappings: any[]
  ): { 
    skillAlignment: number; 
    rubricConsistency: number; 
    questionTypeCompatibility: number;
    crossQuestionIsolation?: number;
    skillAmbiguityScore?: number;
  } {
    const allSkills = skillMappings.flat().map(s => s.skill_name);
    const uniqueSkills = new Set(allSkills);
    const skillAlignment = allSkills.length > 0 ? 1 - (uniqueSkills.size - 1) / allSkills.length : 1;
    
    const rubricTypes = answerKeys.map(ak => this.extractRubricType(ak));
    const uniqueRubrics = new Set(rubricTypes);
    const rubricConsistency = rubricTypes.length > 0 ? 1 - (uniqueRubrics.size - 1) / rubricTypes.length : 1;
    
    const questionTypes = answerKeys.map(ak => ak.question_type || 'multiple_choice');
    const uniqueTypes = new Set(questionTypes);
    const questionTypeCompatibility = questionTypes.length > 0 ? 1 - (uniqueTypes.size - 1) / questionTypes.length : 1;
    
    return {
      skillAlignment,
      rubricConsistency,
      questionTypeCompatibility
    };
  }

  private meetEnhancedQualityThresholds(
    metrics: { skillAlignment: number; rubricConsistency: number; questionTypeCompatibility: number },
    batchSize: number
  ): {
    meetsThreshold: boolean;
    reason: string;
    isolationScore: number;
    skillAmbiguityScore: number;
  } {
    // Enhanced thresholds for cross-question isolation
    const enhancedSkillAlignment = this.config.qualityThresholds.minSkillAlignment + 0.1; // Higher threshold
    const enhancedRubricConsistency = this.config.qualityThresholds.minRubricConsistency + 0.05;
    
    // Cross-question isolation score (higher for smaller batches)
    const isolationScore = Math.max(0.5, 1.0 - (batchSize - 1) * 0.2);
    
    // Skill ambiguity score (better when skills are more aligned)
    const skillAmbiguityScore = metrics.skillAlignment;
    
    // Basic quality checks
    if (metrics.skillAlignment < enhancedSkillAlignment) {
      return {
        meetsThreshold: false,
        reason: `Enhanced skill alignment too low (${metrics.skillAlignment} < ${enhancedSkillAlignment})`,
        isolationScore,
        skillAmbiguityScore
      };
    }
    
    if (metrics.rubricConsistency < enhancedRubricConsistency) {
      return {
        meetsThreshold: false,
        reason: `Enhanced rubric consistency too low (${metrics.rubricConsistency} < ${enhancedRubricConsistency})`,
        isolationScore,
        skillAmbiguityScore
      };
    }
    
    // Enhanced isolation check - prefer smaller batches for better isolation
    if (batchSize > 3 && isolationScore < 0.8) {
      return {
        meetsThreshold: false,
        reason: `Batch too large for optimal cross-question isolation (${batchSize} questions)`,
        isolationScore,
        skillAmbiguityScore
      };
    }
    
    return {
      meetsThreshold: true,
      reason: 'Enhanced quality thresholds met for cross-question isolation',
      isolationScore,
      skillAmbiguityScore
    };
  }

  private createEnhancedSingleQuestionBatch(
    question: any,
    answerKey: any,
    skills: any[],
    subject: string,
    skillDomain: string,
    rubricType: string
  ): SkillAwareBatchGroup {
    return {
      id: `enhanced_single_question_${++this.batchCounter}`,
      questions: [question],
      answerKeys: [answerKey],
      complexity: this.determineComplexity(null),
      subject,
      skillDomain,
      rubricType,
      confidenceRange: [1.0, 1.0],
      recommendedModel: 'gpt-4.1-2025-04-14', // Use highest quality model for single questions
      batchSize: 1,
      priority: 100,
      processingMethod: 'openai_single',
      qualityMetrics: {
        skillAlignment: 1.0,
        rubricConsistency: 1.0,
        questionTypeCompatibility: 1.0,
        crossQuestionIsolation: 1.0, // Perfect isolation for single questions
        skillAmbiguityScore: 1.0
      }
    };
  }

  private extractSubject(answerKey: any, skills: any[]): string {
    return skills[0]?.subject || answerKey?.subject || 'General';
  }

  private extractSkillDomain(skills: any[]): string {
    if (skills.length === 0) return 'General';
    
    const skillNames = skills.map(s => s.skill_name);
    
    if (skillNames.some(s => s.includes('Algebra'))) return 'Algebra';
    if (skillNames.some(s => s.includes('Geometry'))) return 'Geometry';
    if (skillNames.some(s => s.includes('Reading'))) return 'Reading';
    if (skillNames.some(s => s.includes('Writing'))) return 'Writing';
    
    return skills[0]?.skill_name || 'General';
  }

  private extractRubricType(answerKey: any): string {
    const questionType = answerKey?.question_type || 'multiple_choice';
    const points = answerKey?.points || 1;
    
    if (points > 1) return 'multi_point';
    if (questionType.includes('essay')) return 'essay';
    if (questionType.includes('short')) return 'short_answer';
    
    return 'standard';
  }

  private determineComplexity(analysis: ComplexityAnalysis | null): 'simple' | 'medium' | 'complex' {
    if (!analysis) return 'medium';
    
    if (analysis.complexityScore <= 30) return 'simple';
    if (analysis.complexityScore <= 60) return 'medium';
    return 'complex';
  }

  private calculateConfidenceRange(analyses: ComplexityAnalysis[]): [number, number] {
    const confidences = analyses.map(a => a.confidenceInDecision);
    if (confidences.length === 0) return [0.8, 0.8];
    
    return [Math.min(...confidences), Math.max(...confidences)];
  }

  private selectConservativeModel(complexity: 'simple' | 'medium' | 'complex', metrics: any): string {
    if (complexity === 'complex' || metrics.skillAlignment < 0.7) {
      return 'gpt-4o';
    }
    
    return 'gpt-4o-mini';
  }

  private calculateConservativePriority(
    complexity: 'simple' | 'medium' | 'complex',
    analyses: ComplexityAnalysis[]
  ): number {
    let priority = 50;
    
    const avgConfidence = analyses.reduce((sum, a) => sum + a.confidenceInDecision, 0) / analyses.length;
    priority += (avgConfidence / 100) * 30;

    switch (complexity) {
      case 'simple': priority += 10; break;
      case 'medium': priority += 5; break;
      case 'complex': priority += 15; break;
    }
    
    if (analyses.length <= 2) {
      priority += 10;
    }

    return Math.round(priority);
  }

  updateConfiguration(config: Partial<ConservativeBatchConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🎯 Hybrid Conservative batch configuration updated:', this.config);
  }

  getQualityMetrics(): {
    averageBatchSize: number;
    qualityThresholdsMet: number;
    skillAlignmentAverage: number;
    rubricConsistencyAverage: number;
    localVsOpenAIRatio: number;
  } {
    if (this.qualityMetrics.length === 0) {
      return {
        averageBatchSize: 0,
        qualityThresholdsMet: 0,
        skillAlignmentAverage: 0,
        rubricConsistencyAverage: 0,
        localVsOpenAIRatio: 0
      };
    }

    const localMetrics = this.qualityMetrics.filter(m => m.processingMethod === 'local');
    const openAIMetrics = this.qualityMetrics.filter(m => m.processingMethod !== 'local');
    
    const avgBatchSize = this.qualityMetrics.reduce((sum, m) => sum + m.batchSize, 0) / this.qualityMetrics.length;
    const avgAccuracy = this.qualityMetrics.reduce((sum, m) => sum + m.accuracy, 0) / this.qualityMetrics.length;
    const avgSkillAccuracy = this.qualityMetrics.reduce((sum, m) => sum + m.skillAccuracy, 0) / this.qualityMetrics.length;
    const localVsOpenAIRatio = localMetrics.length / Math.max(openAIMetrics.length, 1);
    
    return {
      averageBatchSize: avgBatchSize,
      qualityThresholdsMet: avgAccuracy,
      skillAlignmentAverage: avgSkillAccuracy,
      rubricConsistencyAverage: avgAccuracy,
      localVsOpenAIRatio
    };
  }

  recordBatchQuality(batchSize: number, accuracy: number, skillAccuracy: number, processingMethod: string): void {
    this.qualityMetrics.push({
      timestamp: Date.now(),
      batchSize,
      accuracy,
      skillAccuracy,
      processingMethod
    });
    
    if (this.qualityMetrics.length > 100) {
      this.qualityMetrics = this.qualityMetrics.slice(-100);
    }
  }

  generateConservativeSummary(batches: SkillAwareBatchGroup[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const localBatches = batches.filter(b => b.processingMethod === 'local');
    const openAIBatches = batches.filter(b => b.processingMethod !== 'local');
    
    const localQuestions = localBatches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const openAIQuestions = openAIBatches.reduce((sum, batch) => sum + batch.questions.length, 0);
    
    const avgLocalBatchSize = localBatches.length > 0 ? 
      (localQuestions / localBatches.length).toFixed(1) : '0';
    const avgOpenAIBatchSize = openAIBatches.length > 0 ? 
      (openAIQuestions / openAIBatches.length).toFixed(1) : '0';

    // Enhanced metrics
    const singleQuestionBatches = batches.filter(b => b.batchSize === 1).length;
    const enhancedBatches = batches.filter(b => b.qualityMetrics.crossQuestionIsolation).length;

    return `Enhanced Conservative Batching: ${totalQuestions} questions → ${localBatches.length} aggressive local (avg: ${avgLocalBatchSize}) + ${openAIBatches.length} conservative OpenAI (avg: ${avgOpenAIBatchSize}) batches. ` +
           `Cross-question isolation: ${enhancedBatches}/${batches.length} batches enhanced, ${singleQuestionBatches} single-question batches for maximum quality. ` +
           `Efficiency: ${localQuestions} local (${((localQuestions/totalQuestions)*100).toFixed(1)}%) for speed, ${openAIQuestions} OpenAI for quality with enhanced isolation.`;
  }
}
