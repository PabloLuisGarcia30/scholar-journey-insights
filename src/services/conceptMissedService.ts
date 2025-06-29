
import { supabase } from '@/integrations/supabase/client';
import { MisconceptionSignatureService } from './misconceptionSignatureService';

export interface ConceptMissedAnalysis {
  conceptMissedId: string | null;
  conceptMissedDescription: string;
  matchingConfidence: number;
  conceptConfidence?: number; // NEW: GPT confidence score
  isNewConcept?: boolean;
}

export interface ConceptIndexEntry {
  id: string;
  concept_name: string;
  subject: string;
  grade: string;
  description: string | null;
  keywords: string[];
}

export class ConceptMissedService {
  
  /**
   * Analyze what concept the student missed using the new enhanced GPT prompt with confidence scoring
   */
  static async analyzeConceptMissed(
    questionContext: string,
    studentAnswer: string,
    correctAnswer: string,
    skillTargeted: string,
    subject?: string,
    grade?: string
  ): Promise<ConceptMissedAnalysis> {
    try {
      console.log('🧠 Analyzing missed concept for skill:', skillTargeted);
      
      // Call the enhanced edge function for concept detection with confidence
      const { data, error } = await supabase.functions.invoke('detect-missed-concept', {
        body: {
          questionContext,
          studentAnswer,
          correctAnswer,
          skillTargeted,
          subject: subject || 'Unknown',
          grade: grade || 'Unknown'
        }
      });

      if (error) {
        console.error('❌ Error calling detect-missed-concept function:', error);
        return {
          conceptMissedId: null,
          conceptMissedDescription: 'Error analyzing missed concept',
          matchingConfidence: 0,
          conceptConfidence: 0
        };
      }

      return {
        conceptMissedId: data.concept_missed_id,
        conceptMissedDescription: data.concept_missed_description,
        matchingConfidence: data.matching_confidence,
        conceptConfidence: data.concept_confidence, // NEW: Include GPT confidence
        isNewConcept: data.is_new_concept
      };
    } catch (error) {
      console.error('❌ Error analyzing missed concept:', error);
      return {
        conceptMissedId: null,
        conceptMissedDescription: 'Error analyzing missed concept',
        matchingConfidence: 0,
        conceptConfidence: 0
      };
    }
  }

  /**
   * NEW: Validate a concept detection by teacher
   */
  static async validateConceptDetection(
    mistakePatternId: string,
    isValid: boolean,
    overrideConceptId?: string,
    overrideReason?: string
  ): Promise<boolean> {
    try {
      console.log(`✅ Teacher validating concept detection for mistake pattern: ${mistakePatternId}`);
      
      const updateData: any = {
        teacher_validated: true,
        teacher_validation_timestamp: new Date().toISOString()
      };

      if (!isValid && overrideConceptId) {
        updateData.teacher_override_concept_id = overrideConceptId;
        updateData.teacher_override_reason = overrideReason;
      }

      const { error } = await supabase
        .from('mistake_patterns')
        .update(updateData)
        .eq('id', mistakePatternId);

      if (error) {
        console.error('❌ Error validating concept detection:', error);
        return false;
      }

      console.log(`✅ Concept validation recorded successfully`);
      return true;
    } catch (error) {
      console.error('❌ Exception in validateConceptDetection:', error);
      return false;
    }
  }

  /**
   * NEW: Get unvalidated concept detections for teacher review - Updated to use 85% threshold
   */
  static async getUnvalidatedConceptDetections(
    teacherId?: string,
    confidenceThreshold: number = 0.85 // Changed from 0.7 to 0.85
  ): Promise<{
    id: string;
    concept_missed_description: string;
    concept_confidence: number;
    student_answer: string;
    correct_answer: string;
    skill_targeted: string;
    created_at: string;
    student_name?: string;
  }[]> {
    try {
      console.log('📋 Fetching unvalidated concept detections for teacher review');
      
      let query = supabase
        .from('mistake_patterns')
        .select(`
          id,
          concept_missed_description,
          concept_confidence,
          student_answer,
          correct_answer,
          skill_targeted,
          created_at,
          student_exercises!inner(student_name)
        `)
        .eq('teacher_validated', false)
        .not('concept_missed_description', 'is', null)
        .not('concept_confidence', 'is', null)
        .lt('concept_confidence', confidenceThreshold) // Only show below 85% confidence
        .order('concept_confidence', { ascending: true });

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching unvalidated concepts:', error);
        return [];
      }

      const results = (data || []).map((record: any) => ({
        id: record.id,
        concept_missed_description: record.concept_missed_description,
        concept_confidence: record.concept_confidence,
        student_answer: record.student_answer,
        correct_answer: record.correct_answer,
        skill_targeted: record.skill_targeted,
        created_at: record.created_at,
        student_name: record.student_exercises?.student_name
      }));

      console.log(`✅ Retrieved ${results.length} unvalidated concept detections`);
      return results;
    } catch (error) {
      console.error('❌ Exception in getUnvalidatedConceptDetections:', error);
      return [];
    }
  }

  /**
   * NEW: Get validation analytics for dashboard
   */
  static async getValidationAnalytics(days: number = 30): Promise<{
    total_detections: number;
    validated_count: number;
    validation_rate: number;
    override_count: number;
    override_rate: number;
    avg_confidence_validated: number;
    avg_confidence_overridden: number;
    confidence_distribution: Record<string, number>;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('mistake_patterns')
        .select(`
          concept_confidence,
          teacher_validated,
          teacher_override_concept_id
        `)
        .not('concept_missed_description', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (error) {
        console.error('❌ Error fetching validation analytics:', error);
        return {
          total_detections: 0,
          validated_count: 0,
          validation_rate: 0,
          override_count: 0,
          override_rate: 0,
          avg_confidence_validated: 0,
          avg_confidence_overridden: 0,
          confidence_distribution: {}
        };
      }

      const totalDetections = data?.length || 0;
      const validatedRecords = data?.filter(r => r.teacher_validated) || [];
      const overriddenRecords = validatedRecords.filter(r => r.teacher_override_concept_id) || [];

      const confidenceDistribution: Record<string, number> = {
        'Low (0.0-0.5)': 0,
        'Medium (0.5-0.7)': 0,
        'High (0.7-0.9)': 0,
        'Very High (0.9-1.0)': 0
      };

      data?.forEach(record => {
        const confidence = record.concept_confidence || 0;
        if (confidence < 0.5) confidenceDistribution['Low (0.0-0.5)']++;
        else if (confidence < 0.7) confidenceDistribution['Medium (0.5-0.7)']++;
        else if (confidence < 0.9) confidenceDistribution['High (0.7-0.9)']++;
        else confidenceDistribution['Very High (0.9-1.0)']++;
      });

      const avgConfidenceValidated = validatedRecords.length > 0 
        ? validatedRecords.reduce((sum, r) => sum + (r.concept_confidence || 0), 0) / validatedRecords.length 
        : 0;

      const avgConfidenceOverridden = overriddenRecords.length > 0
        ? overriddenRecords.reduce((sum, r) => sum + (r.concept_confidence || 0), 0) / overriddenRecords.length
        : 0;

      return {
        total_detections: totalDetections,
        validated_count: validatedRecords.length,
        validation_rate: totalDetections > 0 ? (validatedRecords.length / totalDetections) * 100 : 0,
        override_count: overriddenRecords.length,
        override_rate: validatedRecords.length > 0 ? (overriddenRecords.length / validatedRecords.length) * 100 : 0,
        avg_confidence_validated: Math.round(avgConfidenceValidated * 100) / 100,
        avg_confidence_overridden: Math.round(avgConfidenceOverridden * 100) / 100,
        confidence_distribution: confidenceDistribution
      };
    } catch (error) {
      console.error('❌ Exception in getValidationAnalytics:', error);
      return {
        total_detections: 0,
        validated_count: 0,
        validation_rate: 0,
        override_count: 0,
        override_rate: 0,
        avg_confidence_validated: 0,
        avg_confidence_overridden: 0,
        confidence_distribution: {}
      };
    }
  }

  /**
   * NEW: Get concept growth analytics - tracks how the concept taxonomy is expanding
   */
  static async getConceptGrowthAnalytics(days: number = 30): Promise<{
    new_concepts_created: number;
    concepts_matched: number;
    total_concept_detections: number;
    growth_rate: number;
  }> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      // Get concept detections from the time period
      const { data: conceptData, error: conceptError } = await supabase
        .from('mistake_patterns')
        .select(`
          concept_missed_id,
          created_at
        `)
        .not('concept_missed_description', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (conceptError) {
        console.error('❌ Error fetching concept analytics:', conceptError);
        return {
          new_concepts_created: 0,
          concepts_matched: 0,
          total_concept_detections: 0,
          growth_rate: 0
        };
      }

      const totalDetections = conceptData?.length || 0;

      // Get concepts created in this time period
      const { data: newConcepts, error: newConceptsError } = await supabase
        .from('concept_index')
        .select('id')
        .gte('created_at', startDate.toISOString());

      if (newConceptsError) {
        console.error('❌ Error fetching new concepts:', newConceptsError);
      }

      const newConceptsCreated = newConcepts?.length || 0;
      const conceptsMatched = totalDetections - newConceptsCreated;
      const growthRate = totalDetections > 0 ? (newConceptsCreated / totalDetections) * 100 : 0;

      return {
        new_concepts_created: newConceptsCreated,
        concepts_matched: Math.max(0, conceptsMatched),
        total_concept_detections: totalDetections,
        growth_rate: Math.round(growthRate * 100) / 100
      };
    } catch (error) {
      console.error('❌ Exception in getConceptGrowthAnalytics:', error);
      return {
        new_concepts_created: 0,
        concepts_matched: 0,
        total_concept_detections: 0,
        growth_rate: 0
      };
    }
  }

  /**
   * NEW: Get most missed concepts globally
   */
  static async getMostMissedConcepts(
    teacherId?: string,
    subject?: string,
    limit: number = 10
  ): Promise<{
    concept_id: string;
    concept_name: string;
    miss_count: number;
    subject: string;
    grade: string;
  }[]> {
    try {
      let query = supabase
        .from('mistake_patterns')
        .select(`
          concept_missed_id,
          concept_missed_description,
          concept_index!inner(
            concept_name,
            subject,
            grade
          )
        `)
        .not('concept_missed_id', 'is', null);

      if (subject) {
        query = query.eq('concept_index.subject', subject);
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching most missed concepts:', error);
        return [];
      }

      // Count occurrences
      const conceptCounts = new Map<string, {
        concept_id: string;
        concept_name: string;
        subject: string;
        grade: string;
        count: number;
      }>();

      data?.forEach((record: any) => {
        const conceptId = record.concept_missed_id;
        const conceptName = record.concept_index?.concept_name || record.concept_missed_description;
        const conceptSubject = record.concept_index?.subject || 'Unknown';
        const conceptGrade = record.concept_index?.grade || 'Unknown';

        if (conceptCounts.has(conceptId)) {
          conceptCounts.get(conceptId)!.count++;
        } else {
          conceptCounts.set(conceptId, {
            concept_id: conceptId,
            concept_name: conceptName,
            subject: conceptSubject,
            grade: conceptGrade,
            count: 1
          });
        }
      });

      // Convert to array and sort by count
      const results = Array.from(conceptCounts.values())
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
        .map(item => ({
          concept_id: item.concept_id,
          concept_name: item.concept_name,
          miss_count: item.count,
          subject: item.subject,
          grade: item.grade
        }));

      return results;
    } catch (error) {
      console.error('❌ Exception in getMostMissedConcepts:', error);
      return [];
    }
  }

  /**
   * NEW: Get students sharing a specific misconception
   */
  static async getStudentsByMisconception(
    misconceptionSignature: string,
    timeframe: 'week' | 'month' | 'all' = 'month'
  ) {
    return await MisconceptionSignatureService.getStudentsByMisconceptionSignature(
      misconceptionSignature,
      timeframe
    );
  }
}
