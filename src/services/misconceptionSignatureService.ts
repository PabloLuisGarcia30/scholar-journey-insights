
export class MisconceptionSignatureService {
  
  /**
   * Generate a normalized misconception signature hash from concept description
   */
  static generateSignature(conceptMissedDescription: string): string {
    if (!conceptMissedDescription || conceptMissedDescription.trim() === '') {
      return 'unknown-misconception';
    }

    // Normalize the concept description to create a consistent hash
    const normalized = conceptMissedDescription
      .toLowerCase()
      .trim()
      // Remove common articles and prepositions
      .replace(/\b(the|a|an|of|in|on|at|to|for|with|by|from)\b/g, '')
      // Replace spaces and special characters with hyphens
      .replace(/[^a-z0-9]+/g, '-')
      // Remove multiple consecutive hyphens
      .replace(/-+/g, '-')
      // Remove leading/trailing hyphens
      .replace(/^-|-$/g, '')
      // Limit length to prevent extremely long signatures
      .substring(0, 50);

    return normalized || 'unknown-misconception';
  }

  /**
   * Get students grouped by misconception signature
   */
  static async getStudentsByMisconceptionSignature(
    misconceptionSignature: string,
    timeframe: 'week' | 'month' | 'all' = 'month'
  ): Promise<{
    signature: string;
    concept_description: string;
    student_count: number;
    students: Array<{
      student_id: string;
      student_name: string;
      occurrence_count: number;
      last_occurred: string;
    }>;
    total_occurrences: number;
  } | null> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('mistake_patterns')
        .select(`
          student_exercise_id,
          concept_missed_description,
          created_at,
          student_exercises!inner(student_id, student_name)
        `)
        .eq('misconception_signature', misconceptionSignature)
        .not('concept_missed_description', 'is', null);

      // Apply timeframe filter
      if (timeframe !== 'all') {
        const daysBack = timeframe === 'week' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching students by misconception signature:', error);
        return null;
      }

      if (!data || data.length === 0) {
        return null;
      }

      // Group by student
      const studentMap = new Map<string, {
        student_id: string;
        student_name: string;
        occurrence_count: number;
        last_occurred: string;
      }>();

      data.forEach((record: any) => {
        const studentId = record.student_exercises.student_id;
        const studentName = record.student_exercises.student_name;
        
        if (studentMap.has(studentId)) {
          const existing = studentMap.get(studentId)!;
          existing.occurrence_count++;
          if (new Date(record.created_at) > new Date(existing.last_occurred)) {
            existing.last_occurred = record.created_at;
          }
        } else {
          studentMap.set(studentId, {
            student_id: studentId,
            student_name: studentName,
            occurrence_count: 1,
            last_occurred: record.created_at
          });
        }
      });

      return {
        signature: misconceptionSignature,
        concept_description: data[0].concept_missed_description,
        student_count: studentMap.size,
        students: Array.from(studentMap.values()).sort((a, b) => b.occurrence_count - a.occurrence_count),
        total_occurrences: data.length
      };
    } catch (error) {
      console.error('❌ Exception in getStudentsByMisconceptionSignature:', error);
      return null;
    }
  }

  /**
   * Get top misconceptions across all students
   */
  static async getTopMisconceptions(
    limit: number = 10,
    timeframe: 'week' | 'month' | 'all' = 'month'
  ): Promise<Array<{
    signature: string;
    concept_description: string;
    student_count: number;
    total_occurrences: number;
    severity_distribution: Record<string, number>;
  }>> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      let query = supabase
        .from('mistake_patterns')
        .select(`
          misconception_signature,
          concept_missed_description,
          error_severity,
          student_exercise_id,
          student_exercises!inner(student_id)
        `)
        .not('misconception_signature', 'is', null)
        .not('concept_missed_description', 'is', null);

      // Apply timeframe filter
      if (timeframe !== 'all') {
        const daysBack = timeframe === 'week' ? 7 : 30;
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - daysBack);
        query = query.gte('created_at', startDate.toISOString());
      }

      const { data, error } = await query;

      if (error) {
        console.error('❌ Error fetching top misconceptions:', error);
        return [];
      }

      // Group by misconception signature
      const misconceptionMap = new Map<string, {
        signature: string;
        concept_description: string;
        student_ids: Set<string>;
        total_occurrences: number;
        severity_distribution: Record<string, number>;
      }>();

      data?.forEach((record: any) => {
        const signature = record.misconception_signature;
        
        if (misconceptionMap.has(signature)) {
          const existing = misconceptionMap.get(signature)!;
          existing.student_ids.add(record.student_exercises.student_id);
          existing.total_occurrences++;
          
          const severity = record.error_severity || 'unknown';
          existing.severity_distribution[severity] = (existing.severity_distribution[severity] || 0) + 1;
        } else {
          misconceptionMap.set(signature, {
            signature,
            concept_description: record.concept_missed_description,
            student_ids: new Set([record.student_exercises.student_id]),
            total_occurrences: 1,
            severity_distribution: { [record.error_severity || 'unknown']: 1 }
          });
        }
      });

      // Convert to array and sort by student count
      return Array.from(misconceptionMap.values())
        .map(item => ({
          signature: item.signature,
          concept_description: item.concept_description,
          student_count: item.student_ids.size,
          total_occurrences: item.total_occurrences,
          severity_distribution: item.severity_distribution
        }))
        .sort((a, b) => b.student_count - a.student_count)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Exception in getTopMisconceptions:', error);
      return [];
    }
  }

  /**
   * Check if a misconception signature has multiple students (for alerts)
   */
  static async checkSharedMisconception(
    misconceptionSignature: string,
    minimumStudents: number = 2
  ): Promise<{
    isShared: boolean;
    studentCount: number;
    recentOccurrences: number;
  }> {
    try {
      const { supabase } = await import('@/integrations/supabase/client');
      
      // Check occurrences in the last 7 days
      const weekAgo = new Date();
      weekAgo.setDate(weekAgo.getDate() - 7);
      
      const { data, error } = await supabase
        .from('mistake_patterns')
        .select(`
          student_exercise_id,
          student_exercises!inner(student_id)
        `)
        .eq('misconception_signature', misconceptionSignature)
        .gte('created_at', weekAgo.toISOString());

      if (error) {
        console.error('❌ Error checking shared misconception:', error);
        return { isShared: false, studentCount: 0, recentOccurrences: 0 };
      }

      const uniqueStudents = new Set(data?.map((record: any) => record.student_exercises.student_id) || []);
      const studentCount = uniqueStudents.size;
      const recentOccurrences = data?.length || 0;

      return {
        isShared: studentCount >= minimumStudents,
        studentCount,
        recentOccurrences
      };
    } catch (error) {
      console.error('❌ Exception in checkSharedMisconception:', error);
      return { isShared: false, studentCount: 0, recentOccurrences: 0 };
    }
  }
}
