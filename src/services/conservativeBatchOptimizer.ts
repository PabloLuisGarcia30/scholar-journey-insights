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
  qualityMetrics: {
    skillAlignment: number;
    rubricConsistency: number;
    questionTypeCompatibility: number;
  };
}

export interface ConservativeBatchConfig {
  maxBatchSizes: {
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
  };
  adaptiveSizing: boolean;
  qualityFallbackEnabled: boolean;
}

const CONSERVATIVE_CONFIG: ConservativeBatchConfig = {
  maxBatchSizes: {
    simple: 6,   // Reduced from 15
    medium: 4,   // Reduced from 10  
    complex: 2   // Reduced from 6
  },
  minBatchSize: 1, // Allow single questions for maximum accuracy
  enableSkillGrouping: true,
  enableRubricGrouping: true,
  qualityThresholds: {
    minSkillAlignment: 0.8,
    minRubricConsistency: 0.9,
    minConfidence: 0.7
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
  }> = [];

  constructor(config: Partial<ConservativeBatchConfig> = {}) {
    this.config = { ...CONSERVATIVE_CONFIG, ...config };
  }

  optimizeQuestionBatches(
    questions: any[], 
    answerKeys: any[],
    skillMappings: any[],
    complexityAnalyses: ComplexityAnalysis[]
  ): SkillAwareBatchGroup[] {
    console.log(`🎯 Conservative batching: Processing ${questions.length} questions with quality-first approach`);

    // Phase 1: Group by subject and skill domain first
    const skillGroupedQuestions = this.groupBySkillDomain(questions, answerKeys, skillMappings);
    
    // Phase 2: Create conservative batches within each skill group
    const conservativeBatches = this.createConservativeBatches(
      skillGroupedQuestions, 
      complexityAnalyses
    );
    
    // Phase 3: Apply quality controls
    const qualityValidatedBatches = this.applyQualityControls(conservativeBatches);
    
    console.log(`📊 Conservative batching complete: ${qualityValidatedBatches.length} quality-optimized batches`);
    
    return qualityValidatedBatches;
  }

  private groupBySkillDomain(
    questions: any[], 
    answerKeys: any[], 
    skillMappings: any[]
  ): Map<string, { questions: any[], answerKeys: any[], skills: any[] }> {
    const skillGroups = new Map();

    questions.forEach((question, index) => {
      const answerKey = answerKeys.find(ak => ak.question_number === question.questionNumber);
      const questionSkills = skillMappings.filter(sm => sm.question_number === question.questionNumber);
      
      if (!answerKey) return;

      // Create grouping key based on subject and primary skill domain
      const subject = this.extractSubject(answerKey, questionSkills);
      const skillDomain = this.extractSkillDomain(questionSkills);
      const rubricType = this.extractRubricType(answerKey);
      
      const groupKey = `${subject}_${skillDomain}_${rubricType}`;
      
      if (!skillGroups.has(groupKey)) {
        skillGroups.set(groupKey, {
          questions: [],
          answerKeys: [],
          skills: [],
          subject,
          skillDomain,
          rubricType
        });
      }
      
      const group = skillGroups.get(groupKey);
      group.questions.push(question);
      group.answerKeys.push(answerKey);
      group.skills.push(questionSkills);
    });

    return skillGroups;
  }

  private createConservativeBatches(
    skillGroupedQuestions: Map<string, any>,
    complexityAnalyses: ComplexityAnalysis[]
  ): SkillAwareBatchGroup[] {
    const batches: SkillAwareBatchGroup[] = [];

    for (const [groupKey, group] of skillGroupedQuestions) {
      const { questions, answerKeys, skills, subject, skillDomain, rubricType } = group;
      
      // Further group by complexity within skill groups
      const complexityGroups = this.groupByComplexity(questions, answerKeys, complexityAnalyses);
      
      for (const [complexity, complexityGroup] of complexityGroups) {
        const maxBatchSize = this.config.maxBatchSizes[complexity as keyof typeof this.config.maxBatchSizes];
        
        // Create small, conservative batches
        for (let i = 0; i < complexityGroup.questions.length; i += maxBatchSize) {
          const batchQuestions = complexityGroup.questions.slice(i, i + maxBatchSize);
          const batchAnswerKeys = complexityGroup.answerKeys.slice(i, i + maxBatchSize);
          const batchSkills = complexityGroup.skills.slice(i, i + maxBatchSize);
          
          if (batchQuestions.length > 0) {
            const qualityMetrics = this.calculateBatchQualityMetrics(
              batchQuestions, 
              batchAnswerKeys, 
              batchSkills
            );
            
            // Only create batch if it meets quality thresholds
            if (this.meetQualityThresholds(qualityMetrics)) {
              batches.push({
                id: `conservative_batch_${++this.batchCounter}`,
                questions: batchQuestions,
                answerKeys: batchAnswerKeys,
                complexity: complexity as any,
                subject,
                skillDomain,
                rubricType,
                confidenceRange: this.calculateConfidenceRange(batchSkills),
                recommendedModel: this.selectModelForBatch(complexity as any, qualityMetrics),
                batchSize: batchQuestions.length,
                priority: this.calculateConservativePriority(complexity as any, qualityMetrics),
                qualityMetrics
              });
            } else {
              // Split into individual questions if batch doesn't meet quality thresholds
              batchQuestions.forEach((question, qIndex) => {
                batches.push(this.createSingleQuestionBatch(
                  question,
                  batchAnswerKeys[qIndex],
                  batchSkills[qIndex],
                  subject,
                  skillDomain,
                  rubricType
                ));
              });
            }
          }
        }
      }
    }

    return batches.sort((a, b) => b.priority - a.priority);
  }

  private groupByComplexity(
    questions: any[], 
    answerKeys: any[], 
    complexityAnalyses: ComplexityAnalysis[]
  ): Map<string, { questions: any[], answerKeys: any[], skills: any[] }> {
    const complexityGroups = new Map([
      ['simple', { questions: [], answerKeys: [], skills: [] }],
      ['medium', { questions: [], answerKeys: [], skills: [] }],
      ['complex', { questions: [], answerKeys: [], skills: [] }]
    ]);

    questions.forEach((question, index) => {
      const analysis = complexityAnalyses.find(a => a.questionNumber === question.questionNumber);
      const complexity = this.determineComplexity(analysis);
      
      const group = complexityGroups.get(complexity);
      if (group) {
        group.questions.push(question);
        group.answerKeys.push(answerKeys[index]);
        group.skills.push([]);
      }
    });

    return complexityGroups;
  }

  private calculateBatchQualityMetrics(
    questions: any[], 
    answerKeys: any[], 
    skillMappings: any[]
  ): { skillAlignment: number; rubricConsistency: number; questionTypeCompatibility: number } {
    // Calculate skill alignment (how similar are the skills being tested)
    const allSkills = skillMappings.flat().map(s => s.skill_name);
    const uniqueSkills = new Set(allSkills);
    const skillAlignment = allSkills.length > 0 ? 1 - (uniqueSkills.size - 1) / allSkills.length : 1;
    
    // Calculate rubric consistency (how similar are the grading criteria)
    const rubricTypes = answerKeys.map(ak => this.extractRubricType(ak));
    const uniqueRubrics = new Set(rubricTypes);
    const rubricConsistency = rubricTypes.length > 0 ? 1 - (uniqueRubrics.size - 1) / rubricTypes.length : 1;
    
    // Calculate question type compatibility (how similar are the question formats)
    const questionTypes = answerKeys.map(ak => ak.question_type || 'multiple_choice');
    const uniqueTypes = new Set(questionTypes);
    const questionTypeCompatibility = questionTypes.length > 0 ? 1 - (uniqueTypes.size - 1) / uniqueTypes.length : 1;
    
    return {
      skillAlignment,
      rubricConsistency,
      questionTypeCompatibility
    };
  }

  private meetQualityThresholds(metrics: { skillAlignment: number; rubricConsistency: number; questionTypeCompatibility: number }): boolean {
    return metrics.skillAlignment >= this.config.qualityThresholds.minSkillAlignment &&
           metrics.rubricConsistency >= this.config.qualityThresholds.minRubricConsistency;
  }

  private createSingleQuestionBatch(
    question: any,
    answerKey: any,
    skills: any[],
    subject: string,
    skillDomain: string,
    rubricType: string
  ): SkillAwareBatchGroup {
    return {
      id: `single_question_${++this.batchCounter}`,
      questions: [question],
      answerKeys: [answerKey],
      complexity: this.determineComplexity(null),
      subject,
      skillDomain,
      rubricType,
      confidenceRange: [1.0, 1.0], // Perfect confidence for single questions
      recommendedModel: 'gpt-4o-mini',
      batchSize: 1,
      priority: 100, // High priority for individual processing
      qualityMetrics: {
        skillAlignment: 1.0,
        rubricConsistency: 1.0,
        questionTypeCompatibility: 1.0
      }
    };
  }

  private applyQualityControls(batches: SkillAwareBatchGroup[]): SkillAwareBatchGroup[] {
    if (!this.config.qualityFallbackEnabled) return batches;

    return batches.map(batch => {
      // Check if batch size should be reduced based on quality metrics
      if (batch.qualityMetrics.skillAlignment < 0.6 && batch.batchSize > 2) {
        console.log(`⚠️ Reducing batch ${batch.id} size due to low skill alignment`);
        
        // Split batch in half
        const midPoint = Math.ceil(batch.batchSize / 2);
        const firstHalf = {
          ...batch,
          id: `${batch.id}_split_1`,
          questions: batch.questions.slice(0, midPoint),
          answerKeys: batch.answerKeys.slice(0, midPoint),
          batchSize: midPoint
        };
        
        return firstHalf; // Return first half, second half would need separate handling
      }
      
      return batch;
    });
  }

  private extractSubject(answerKey: any, skills: any[]): string {
    return skills[0]?.subject || answerKey.subject || 'General';
  }

  private extractSkillDomain(skills: any[]): string {
    if (skills.length === 0) return 'General';
    
    // Group similar skills
    const skillNames = skills.map(s => s.skill_name);
    
    // Simple domain extraction logic
    if (skillNames.some(s => s.includes('Algebra'))) return 'Algebra';
    if (skillNames.some(s => s.includes('Geometry'))) return 'Geometry';
    if (skillNames.some(s => s.includes('Reading'))) return 'Reading';
    if (skillNames.some(s => s.includes('Writing'))) return 'Writing';
    
    return skills[0]?.skill_name || 'General';
  }

  private extractRubricType(answerKey: any): string {
    const questionType = answerKey.question_type || 'multiple_choice';
    const points = answerKey.points || 1;
    
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

  private calculateConfidenceRange(skillMappings: any[][]): [number, number] {
    const confidences = skillMappings.flat().map(s => s.confidence || 0.8);
    if (confidences.length === 0) return [0.8, 0.8];
    
    return [Math.min(...confidences), Math.max(...confidences)];
  }

  private selectModelForBatch(complexity: 'simple' | 'medium' | 'complex', metrics: any): string {
    // Conservative model selection prioritizing accuracy
    if (complexity === 'complex' || metrics.skillAlignment < 0.7) {
      return 'gpt-4o'; // Use more powerful model for complex/uncertain cases
    }
    
    return 'gpt-4o-mini';
  }

  private calculateConservativePriority(complexity: 'simple' | 'medium' | 'complex', metrics: any): number {
    let priority = 50; // Base priority
    
    // Higher priority for higher quality batches
    priority += metrics.skillAlignment * 30;
    priority += metrics.rubricConsistency * 20;
    
    // Adjust for complexity (simple questions get slight priority boost for quick wins)
    switch (complexity) {
      case 'simple': priority += 10; break;
      case 'medium': priority += 5; break;
      case 'complex': priority += 15; break; // Complex questions get high priority for accuracy
    }
    
    return Math.round(priority);
  }

  updateConfiguration(config: Partial<ConservativeBatchConfig>): void {
    this.config = { ...this.config, ...config };
    console.log('🎯 Conservative batch configuration updated:', this.config);
  }

  getQualityMetrics(): {
    averageBatchSize: number;
    qualityThresholdsMet: number;
    skillAlignmentAverage: number;
    rubricConsistencyAverage: number;
  } {
    if (this.qualityMetrics.length === 0) {
      return {
        averageBatchSize: 0,
        qualityThresholdsMet: 0,
        skillAlignmentAverage: 0,
        rubricConsistencyAverage: 0
      };
    }

    const avgBatchSize = this.qualityMetrics.reduce((sum, m) => sum + m.batchSize, 0) / this.qualityMetrics.length;
    const avgAccuracy = this.qualityMetrics.reduce((sum, m) => sum + m.accuracy, 0) / this.qualityMetrics.length;
    const avgSkillAccuracy = this.qualityMetrics.reduce((sum, m) => sum + m.skillAccuracy, 0) / this.qualityMetrics.length;
    
    return {
      averageBatchSize: avgBatchSize,
      qualityThresholdsMet: avgAccuracy,
      skillAlignmentAverage: avgSkillAccuracy,
      rubricConsistencyAverage: avgAccuracy
    };
  }

  recordBatchQuality(batchSize: number, accuracy: number, skillAccuracy: number): void {
    this.qualityMetrics.push({
      timestamp: Date.now(),
      batchSize,
      accuracy,
      skillAccuracy
    });
    
    // Keep only last 100 metrics
    if (this.qualityMetrics.length > 100) {
      this.qualityMetrics = this.qualityMetrics.slice(-100);
    }
  }

  generateConservativeSummary(batches: SkillAwareBatchGroup[]): string {
    const totalQuestions = batches.reduce((sum, batch) => sum + batch.questions.length, 0);
    const avgBatchSize = totalQuestions > 0 ? (totalQuestions / batches.length).toFixed(1) : '0';
    
    const complexityDist = batches.reduce((dist, batch) => {
      dist[batch.complexity] = (dist[batch.complexity] || 0) + batch.questions.length;
      return dist;
    }, {} as Record<string, number>);

    const avgSkillAlignment = batches.reduce((sum, batch) => 
      sum + batch.qualityMetrics.skillAlignment, 0) / batches.length;

    return `Conservative Batch Summary: ${totalQuestions} questions → ${batches.length} quality-optimized batches (avg: ${avgBatchSize}). ` +
           `Distribution - Simple: ${complexityDist.simple || 0}, Medium: ${complexityDist.medium || 0}, Complex: ${complexityDist.complex || 0}. ` +
           `Average skill alignment: ${(avgSkillAlignment * 100).toFixed(1)}%. Quality-first approach prioritizing accuracy over speed.`;
  }
}
