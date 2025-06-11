
import { supabase } from '@/integrations/supabase/client';

export interface ConceptMissedAnalysis {
  conceptMissedId: string | null;
  conceptMissedDescription: string;
  matchingConfidence: number;
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
   * Analyze what concept the student missed using GPT and match to concept_index
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
      
      // Get GPT analysis of the missed concept
      const gptDescription = await this.getGPTConceptAnalysis(
        questionContext,
        studentAnswer,
        correctAnswer,
        skillTargeted
      );
      
      if (!gptDescription) {
        return {
          conceptMissedId: null,
          conceptMissedDescription: 'Unable to determine missed concept',
          matchingConfidence: 0
        };
      }
      
      // Match the GPT description to a concept in concept_index
      const matchedConcept = await this.matchToConceptIndex(
        gptDescription,
        subject,
        grade,
        skillTargeted
      );
      
      return {
        conceptMissedId: matchedConcept?.id || null,
        conceptMissedDescription: gptDescription,
        matchingConfidence: matchedConcept?.confidence || 0
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
   * Get GPT analysis of what concept the student missed
   */
  private static async getGPTConceptAnalysis(
    questionContext: string,
    studentAnswer: string,
    correctAnswer: string,
    skillTargeted: string
  ): Promise<string | null> {
    try {
      const prompt = `Based on the student's incorrect answer and the mistake pattern, what is the specific concept the student appears to misunderstand or misapply?

Question Context: ${questionContext}
Skill Being Tested: ${skillTargeted}
Student Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"

Return the concept in 1 clear, specific sentence. Focus on the underlying mathematical/academic concept, not just the procedural error.

Example format: "The student does not understand that only like terms can be combined in polynomials."`;

      const response = await fetch('/functions/v1/ai-chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${supabase.supabaseKey}`
        },
        body: JSON.stringify({
          message: prompt,
          context: 'concept_analysis',
          temperature: 0.3 // Lower temperature for more consistent analysis
        })
      });

      if (!response.ok) {
        console.error('GPT API call failed:', response.status);
        return null;
      }

      const data = await response.json();
      const conceptDescription = data.reply?.trim();
      
      if (conceptDescription && conceptDescription.length > 10) {
        console.log('✅ GPT concept analysis:', conceptDescription);
        return conceptDescription;
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error in GPT concept analysis:', error);
      return null;
    }
  }
  
  /**
   * Match GPT description to a concept in the concept_index table
   */
  private static async matchToConceptIndex(
    gptDescription: string,
    subject?: string,
    grade?: string,
    skillTargeted?: string
  ): Promise<{ id: string; confidence: number } | null> {
    try {
      // Get relevant concepts from concept_index
      const concepts = await this.getRelevantConcepts(subject, grade);
      
      if (concepts.length === 0) {
        console.log('⚠️ No concepts found in concept_index for matching');
        return null;
      }
      
      // Find the best match using similarity scoring
      let bestMatch: { id: string; confidence: number } | null = null;
      let highestScore = 0;
      
      for (const concept of concepts) {
        const score = this.calculateConceptSimilarity(
          gptDescription,
          concept,
          skillTargeted
        );
        
        if (score > highestScore && score > 0.3) { // Minimum confidence threshold
          highestScore = score;
          bestMatch = {
            id: concept.id,
            confidence: score
          };
        }
      }
      
      if (bestMatch) {
        console.log(`✅ Matched concept with confidence ${bestMatch.confidence.toFixed(2)}`);
      } else {
        console.log('⚠️ No suitable concept match found');
      }
      
      return bestMatch;
    } catch (error) {
      console.error('❌ Error matching to concept_index:', error);
      return null;
    }
  }
  
  /**
   * Get relevant concepts from concept_index based on subject and grade
   */
  private static async getRelevantConcepts(
    subject?: string,
    grade?: string
  ): Promise<ConceptIndexEntry[]> {
    try {
      let query = supabase
        .from('concept_index')
        .select('id, concept_name, subject, grade, description, keywords');
      
      // Filter by subject if provided
      if (subject) {
        query = query.ilike('subject', `%${subject}%`);
      }
      
      // Filter by grade if provided
      if (grade) {
        query = query.ilike('grade', `%${grade}%`);
      }
      
      const { data, error } = await query.limit(50); // Limit for performance
      
      if (error) {
        console.error('❌ Error fetching concepts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Exception in getRelevantConcepts:', error);
      return [];
    }
  }
  
  /**
   * Calculate similarity between GPT description and concept_index entry
   */
  private static calculateConceptSimilarity(
    gptDescription: string,
    concept: ConceptIndexEntry,
    skillTargeted?: string
  ): number {
    const gptLower = gptDescription.toLowerCase();
    const conceptName = concept.concept_name.toLowerCase();
    const conceptDesc = (concept.description || '').toLowerCase();
    const keywords = concept.keywords.map(k => k.toLowerCase());
    
    let score = 0;
    
    // 1. Direct concept name match (highest weight)
    if (gptLower.includes(conceptName)) {
      score += 0.4;
    }
    
    // 2. Keyword matches
    const keywordMatches = keywords.filter(keyword => 
      gptLower.includes(keyword) && keyword.length > 2
    ).length;
    
    if (keywordMatches > 0) {
      score += Math.min(keywordMatches * 0.15, 0.3);
    }
    
    // 3. Description similarity (if available)
    if (conceptDesc && conceptDesc.length > 10) {
      const commonWords = this.getCommonWords(gptLower, conceptDesc);
      if (commonWords > 2) {
        score += Math.min(commonWords * 0.05, 0.2);
      }
    }
    
    // 4. Skill name relevance
    if (skillTargeted && conceptName.includes(skillTargeted.toLowerCase().split(' ')[0])) {
      score += 0.1;
    }
    
    return Math.min(score, 1.0); // Cap at 1.0
  }
  
  /**
   * Helper method to count common meaningful words
   */
  private static getCommonWords(text1: string, text2: string): number {
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'is', 'are', 'was', 'were', 'be', 'been', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'should', 'could', 'can', 'may', 'might', 'must', 'that', 'this', 'these', 'those']);
    
    const words1 = text1.split(/\s+/).filter(word => 
      word.length > 3 && !stopWords.has(word)
    );
    const words2 = text2.split(/\s+/).filter(word => 
      word.length > 3 && !stopWords.has(word)
    );
    
    return words1.filter(word => words2.includes(word)).length;
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
   * Get most commonly missed concepts for analytics
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
  }[]> {
    try {
      let query = supabase
        .from('mistake_patterns')
        .select(`
          concept_missed_id,
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
            count: 1
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
          grade: data.grade
        }))
        .sort((a, b) => b.miss_count - a.miss_count)
        .slice(0, limit);
    } catch (error) {
      console.error('❌ Exception in getMostMissedConcepts:', error);
      return [];
    }
  }
}
