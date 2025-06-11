import { supabase } from '@/integrations/supabase/client';
import { MisconceptionSignatureService } from './misconceptionSignatureService';

export interface ConceptMissedAnalysis {
  conceptMissedId: string | null;
  conceptMissedDescription: string;
  matchingConfidence: number;
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
   * Analyze what concept the student missed using the new enhanced GPT prompt
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
      
      // Call the new edge function for concept detection
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
          matchingConfidence: 0
        };
      }

      return {
        conceptMissedId: data.concept_missed_id,
        conceptMissedDescription: data.concept_missed_description,
        matchingConfidence: data.matching_confidence,
        isNewConcept: data.is_new_concept
      };
    } catch (error) {
      console.error('❌ Error analyzing missed concept:', error);
      return {
        conceptMissedId: null,
        conceptMissedDescription: 'Error analyzing missed concept',
        matchingConfidence: 0
      };
    }
  }
  
  /**
   * Get concept details by ID
   */
  static async getConceptById(conceptId: string): Promise<ConceptIndexEntry | null> {
    try {
      const { data, error } = await supabase
        .from('concept_index')
        .select('id, concept_name, subject, grade, description, keywords')
        .eq('id', conceptId)
        .single();
      
      if (error) {
        console.error('❌ Error fetching concept by ID:', error);
        return null;
      }
      
      return data;
    } catch (error) {
      console.error('❌ Exception in getConceptById:', error);
      return null;
    }
  }
  
  /**
   * Get most commonly missed concepts for analytics with misconception signature support
   */
  static async getMostMissedConcepts(
    studentId?: string,
    subject?: string,
    limit: number = 10
  ): Promise<{
    concept_id: string;
    concept_name: string;
    miss_count: number;
    subject: string;
    grade: string;
    misconception_signature?: string;
  }[]> {
    try {
      let query = supabase
        .from('mistake_patterns')
        .select(`
          concept_missed_id,
          misconception_signature,
          concept_index!inner(concept_name, subject, grade)
        `)
        .not('concept_missed_id', 'is', null);
      
      if (studentId) {
        query = query.eq('student_exercise_id', studentId);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching missed concepts:', error);
        return [];
      }
      
      // Group by concept and count occurrences
      const conceptCounts = new Map<string, {
        concept_name: string;
        subject: string;
        grade: string;
        count: number;
        misconception_signature?: string;
      }>();
      
      data.forEach((record: any) => {
        const conceptId = record.concept_missed_id;
        const concept = record.concept_index;
        
        if (conceptCounts.has(conceptId)) {
          conceptCounts.get(conceptId)!.count++;
        } else {
          conceptCounts.set(conceptId, {
            concept_name: concept.concept_name,
            subject: concept.subject,
            grade: concept.grade,
            count: 1,
            misconception_signature: record.misconception_signature
          });
        }
      });
      
      // Convert to array and sort by count
      return Array.from(conceptCounts.entries())
        .map(([concept_id, data]) => ({
          concept_id,
          concept_name: data.concept_name,
          miss_count: data.count,
          subject: data.subject,
          grade: data.grade,
          misconception_signature: data.misconception_signature
        }))
        .sort((a, b) => b.miss_count - a.miss_count)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Exception in getMostMissedConcepts:', error);
      return [];
    }
  }

  /**
   * Get concept growth analytics
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

      // Get concepts created in the timeframe
      const { data: newConcepts, error: newError } = await supabase
        .from('concept_index')
        .select('id')
        .gte('created_at', startDate.toISOString())
        .like('description', '%Auto-generated concept%');

      if (newError) {
        console.error('❌ Error fetching new concepts:', newError);
        return { new_concepts_created: 0, concepts_matched: 0, total_concept_detections: 0, growth_rate: 0 };
      }

      // Get total concept detections in timeframe
      const { data: totalDetections, error: totalError } = await supabase
        .from('mistake_patterns')
        .select('id')
        .not('concept_missed_id', 'is', null)
        .gte('created_at', startDate.toISOString());

      if (totalError) {
        console.error('❌ Error fetching total detections:', totalError);
        return { new_concepts_created: 0, concepts_matched: 0, total_concept_detections: 0, growth_rate: 0 };
      }

      const newConceptsCount = newConcepts?.length || 0;
      const totalDetectionsCount = totalDetections?.length || 0;
      const conceptsMatched = totalDetectionsCount - newConceptsCount;
      const growthRate = totalDetectionsCount > 0 ? (newConceptsCount / totalDetectionsCount) * 100 : 0;

      return {
        new_concepts_created: newConceptsCount,
        concepts_matched: conceptsMatched,
        total_concept_detections: totalDetectionsCount,
        growth_rate: Math.round(growthRate * 100) / 100
      };
    } catch (error) {
      console.error('❌ Exception in getConceptGrowthAnalytics:', error);
      return { new_concepts_created: 0, concepts_matched: 0, total_concept_detections: 0, growth_rate: 0 };
    }
  }

  /**
   * NEW: Get misconception signature analytics
   */
  static async getMisconceptionSignatureAnalytics(
    timeframe: 'week' | 'month' | 'all' = 'month'
  ): Promise<{
    total_signatures: number;
    shared_misconceptions: number;
    top_misconceptions: Array<{
      signature: string;
      concept_description: string;
      student_count: number;
      total_occurrences: number;
    }>;
  }> {
    try {
      const topMisconceptions = await MisconceptionSignatureService.getTopMisconceptions(10, timeframe);
      
      const sharedMisconceptions = topMisconceptions.filter(m => m.student_count >= 2).length;
      
      return {
        total_signatures: topMisconceptions.length,
        shared_misconceptions: sharedMisconceptions,
        top_misconceptions: topMisconceptions.slice(0, 5) // Return top 5 for summary
      };
    } catch (error) {
      console.error('❌ Exception in getMisconceptionSignatureAnalytics:', error);
      return {
        total_signatures: 0,
        shared_misconceptions: 0,
        top_misconceptions: []
      };
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
