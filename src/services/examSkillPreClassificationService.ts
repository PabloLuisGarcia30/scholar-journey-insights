import { supabase } from "@/integrations/supabase/client";

export interface SkillPreClassificationResult {
  examId: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  totalQuestions: number;
  mappedQuestions: number;
  contentSkillsFound: number;
  subjectSkillsFound: number;
  invalidSkillsRejected: number;
  classId: string;
  error?: string;
}

export interface SkillMappingCache {
  examId: string;
  questionMappings: Map<number, {
    contentSkills: Array<{ id: string; name: string; weight: number }>;
    subjectSkills: Array<{ id: string; name: string; weight: number }>;
  }>;
  lastUpdated: Date;
}

export class ExamSkillPreClassificationService {
  private static skillMappingCache = new Map<string, SkillMappingCache>();
  private static readonly CACHE_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  /**
   * Triggers skill pre-classification for an exam
   */
  static async triggerSkillPreClassification(examId: string): Promise<SkillPreClassificationResult> {
    console.log(`🎯 Triggering skill pre-classification for exam: ${examId}`);

    try {
      // Check if exam exists and has class association
      const { data: examData, error: examError } = await supabase
        .from('exams')
        .select('*, classes:active_classes(*)')
        .eq('exam_id', examId)
        .maybeSingle();

      if (examError || !examData) {
        throw new Error(`Exam not found: ${examError?.message}`);
      }

      if (!examData.class_id) {
        throw new Error('Exam must be associated with a class for skill pre-classification');
      }

      // Check if class has linked skills
      const hasSkills = await this.validateClassHasSkills(examData.class_id);
      if (!hasSkills) {
        throw new Error('Class must have linked content and subject skills before pre-classification');
      }

      // Call the enhanced analyze-exam-skills edge function
      const { data, error } = await supabase.functions.invoke('analyze-exam-skills', {
        body: { examId }
      });

      if (error) {
        throw new Error(`Skill pre-classification failed: ${error.message}`);
      }

      console.log(`✅ Skill pre-classification completed for exam: ${examId}`);
      
      // Invalidate cache for this exam
      this.skillMappingCache.delete(examId);

      return {
        examId,
        status: data.status === 'completed' ? 'completed' : data.status,
        totalQuestions: data.total_questions || 0,
        mappedQuestions: data.mapped_questions || 0,
        contentSkillsFound: data.content_skills_found || 0,
        subjectSkillsFound: data.subject_skills_found || 0,
        invalidSkillsRejected: data.invalid_skills_rejected || 0,
        classId: data.class_id
      };

    } catch (error) {
      console.error(`❌ Skill pre-classification failed for exam ${examId}:`, error);
      
      return {
        examId,
        status: 'failed',
        totalQuestions: 0,
        mappedQuestions: 0,
        contentSkillsFound: 0,
        subjectSkillsFound: 0,
        invalidSkillsRejected: 0,
        classId: '',
        error: error.message
      };
    }
  }

  /**
   * Gets pre-classified skill mappings for an exam with caching
   */
  static async getPreClassifiedSkills(examId: string): Promise<SkillMappingCache | null> {
    console.log(`📊 Fetching pre-classified skills for exam: ${examId}`);

    // Check cache first
    const cached = this.skillMappingCache.get(examId);
    if (cached && this.isCacheValid(cached)) {
      console.log(`✅ Using cached skill mappings for exam: ${examId}`);
      return cached;
    }

    try {
      // Fetch from database
      const { data: skillMappings, error } = await supabase
        .from('exam_skill_mappings')
        .select('*')
        .eq('exam_id', examId)
        .order('question_number');

      if (error) {
        console.error(`Failed to fetch skill mappings for exam ${examId}:`, error);
        return null;
      }

      if (!skillMappings || skillMappings.length === 0) {
        console.warn(`No pre-classified skills found for exam: ${examId}`);
        return null;
      }

      // Transform to cache format
      const questionMappings = new Map<number, {
        contentSkills: Array<{ id: string; name: string; weight: number }>;
        subjectSkills: Array<{ id: string; name: string; weight: number }>;
      }>();

      skillMappings.forEach(mapping => {
        if (!questionMappings.has(mapping.question_number)) {
          questionMappings.set(mapping.question_number, {
            contentSkills: [],
            subjectSkills: []
          });
        }

        const questionData = questionMappings.get(mapping.question_number)!;
        
        if (mapping.skill_type === 'content') {
          questionData.contentSkills.push({
            id: mapping.skill_id,
            name: mapping.skill_name,
            weight: mapping.skill_weight
          });
        } else if (mapping.skill_type === 'subject') {
          questionData.subjectSkills.push({
            id: mapping.skill_id,
            name: mapping.skill_name,
            weight: mapping.skill_weight
          });
        }
      });

      const cacheEntry: SkillMappingCache = {
        examId,
        questionMappings,
        lastUpdated: new Date()
      };

      // Cache the result
      this.skillMappingCache.set(examId, cacheEntry);
      
      console.log(`✅ Cached skill mappings for exam: ${examId} (${questionMappings.size} questions)`);
      
      return cacheEntry;

    } catch (error) {
      console.error(`Failed to fetch pre-classified skills for exam ${examId}:`, error);
      return null;
    }
  }

  /**
   * Checks if skill pre-classification exists and is complete for an exam
   */
  static async getPreClassificationStatus(examId: string): Promise<{
    exists: boolean;
    status: string;
    coverage: number;
    lastAnalyzed?: Date;
  }> {
    try {
      const { data: analysis, error } = await supabase
        .from('exam_skill_analysis')
        .select('*')
        .eq('exam_id', examId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (!analysis) {
        return { exists: false, status: 'not_started', coverage: 0 };
      }

      // Calculate coverage
      const coverage = analysis.total_questions > 0 
        ? (analysis.mapped_questions / analysis.total_questions) * 100
        : 0;

      return {
        exists: true,
        status: analysis.analysis_status,
        coverage,
        lastAnalyzed: analysis.analysis_completed_at ? new Date(analysis.analysis_completed_at) : undefined
      };

    } catch (error) {
      console.error(`Failed to get pre-classification status for exam ${examId}:`, error);
      return { exists: false, status: 'error', coverage: 0 };
    }
  }

  /**
   * Validates that a class has linked skills
   */
  private static async validateClassHasSkills(classId: string): Promise<boolean> {
    try {
      const [contentSkillsResult, subjectSkillsResult] = await Promise.all([
        supabase.from('class_content_skills').select('id').eq('class_id', classId).limit(1),
        supabase.from('class_subject_skills').select('id').eq('class_id', classId).limit(1)
      ]);

      const hasContentSkills = contentSkillsResult.data && contentSkillsResult.data.length > 0;
      const hasSubjectSkills = subjectSkillsResult.data && subjectSkillsResult.data.length > 0;

      return hasContentSkills || hasSubjectSkills;
    } catch (error) {
      console.error('Failed to validate class skills:', error);
      return false;
    }
  }

  /**
   * Checks if cached data is still valid
   */
  private static isCacheValid(cache: SkillMappingCache): boolean {
    const now = new Date();
    const age = now.getTime() - cache.lastUpdated.getTime();
    return age < this.CACHE_DURATION_MS;
  }

  /**
   * Clears skill mapping cache for an exam
   */
  static clearCache(examId?: string): void {
    if (examId) {
      this.skillMappingCache.delete(examId);
      console.log(`🗑️ Cleared skill mapping cache for exam: ${examId}`);
    } else {
      this.skillMappingCache.clear();
      console.log('🗑️ Cleared all skill mapping cache');
    }
  }

  /**
   * Gets cache statistics
   */
  static getCacheStats(): {
    totalCachedExams: number;
    cacheHitRate: number;
    oldestCacheEntry?: Date;
  } {
    const totalCached = this.skillMappingCache.size;
    let oldestEntry: Date | undefined;

    if (totalCached > 0) {
      oldestEntry = Array.from(this.skillMappingCache.values())
        .map(cache => cache.lastUpdated)
        .reduce((oldest, current) => current < oldest ? current : oldest);
    }

    return {
      totalCachedExams: totalCached,
      cacheHitRate: 0, // Would need hit/miss tracking to implement
      oldestCacheEntry: oldestEntry
    };
  }

  /**
   * Monitors pre-classification progress for an exam
   */
  static async monitorPreClassificationProgress(
    examId: string,
    onProgress?: (status: SkillPreClassificationResult) => void
  ): Promise<SkillPreClassificationResult> {
    const maxRetries = 30; // 5 minutes with 10-second intervals
    let retries = 0;

    while (retries < maxRetries) {
      const status = await this.getPreClassificationStatus(examId);
      
      const result: SkillPreClassificationResult = {
        examId,
        status: status.status as any,
        totalQuestions: 0,
        mappedQuestions: 0,
        contentSkillsFound: 0,
        subjectSkillsFound: 0,
        invalidSkillsRejected: 0,
        classId: ''
      };

      if (onProgress) {
        onProgress(result);
      }

      if (status.status === 'completed' || status.status === 'failed') {
        // Get detailed results
        const { data: analysis } = await supabase
          .from('exam_skill_analysis')
          .select('*')
          .eq('exam_id', examId)
          .maybeSingle();

        if (analysis) {
          // Safely access validation_stats with proper type checking
          const analysisData = analysis.ai_analysis_data as any;
          const validationStats = analysisData?.validation_stats || {};
          
          return {
            examId,
            status: analysis.analysis_status as any,
            totalQuestions: analysis.total_questions,
            mappedQuestions: analysis.mapped_questions,
            contentSkillsFound: analysis.content_skills_found,
            subjectSkillsFound: analysis.subject_skills_found,
            invalidSkillsRejected: validationStats.invalid_skills_rejected || 0,
            classId: validationStats.class_id || '',
            error: analysis.error_message
          };
        }

        return result;
      }

      await new Promise(resolve => setTimeout(resolve, 10000)); // Wait 10 seconds
      retries++;
    }

    throw new Error('Pre-classification monitoring timed out');
  }
}
