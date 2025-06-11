import { supabase } from '@/integrations/supabase/client';

export interface ConceptIndexEntry {
  id: string;
  concept_name: string;
  subject: string;
  grade: string;
  description?: string;
  related_skills?: string[];
  keywords?: string[];
  usage_count: number;
}

export interface ConceptMissedAnalysis {
  concept_missed: string;
  confidence: number;
  matched_concept_id?: string;
  is_new_concept: boolean;
}

export interface GPTConceptResponse {
  concept_missed: string;
}

export class ConceptMissedService {
  
  /**
   * Main method to detect missed concept using GPT and match to concept index
   */
  static async detectMissedConcept(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    subject: string,
    grade: string,
    questionContext?: string,
    skillTargeted?: string
  ): Promise<ConceptMissedAnalysis> {
    try {
      console.log(`🧠 Detecting missed concept for subject: ${subject}, grade: ${grade}`);
      
      // Step 1: Call GPT to identify the missed concept
      const gptResponse = await this.callGPTForConceptDetection(
        questionText,
        studentAnswer,
        correctAnswer,
        subject,
        grade,
        questionContext,
        skillTargeted
      );
      
      // Step 2: Match GPT response to existing concepts in our index
      const matchResult = await this.matchConceptToIndex(
        gptResponse.concept_missed,
        subject,
        grade
      );
      
      // Step 3: Return analysis result
      return {
        concept_missed: gptResponse.concept_missed,
        confidence: matchResult.confidence,
        matched_concept_id: matchResult.matched_concept_id,
        is_new_concept: matchResult.is_new_concept
      };
      
    } catch (error) {
      console.error('❌ Error in detectMissedConcept:', error);
      
      // Fallback to basic concept based on subject
      return {
        concept_missed: this.generateFallbackConcept(subject, skillTargeted || 'general understanding'),
        confidence: 0.3,
        is_new_concept: false
      };
    }
  }
  
  /**
   * Call GPT with specialized prompt to identify missed concept
   */
  private static async callGPTForConceptDetection(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    subject: string,
    grade: string,
    questionContext?: string,
    skillTargeted?: string
  ): Promise<GPTConceptResponse> {
    try {
      const prompt = this.buildGPTPrompt(
        questionText,
        studentAnswer,
        correctAnswer,
        subject,
        grade,
        questionContext,
        skillTargeted
      );
      
      const { data, error } = await supabase.functions.invoke('grade-complex-question', {
        body: {
          prompt,
          operation_type: 'concept_detection',
          temperature: 0.3,
          max_tokens: 100
        }
      });
      
      if (error) {
        throw new Error(`GPT API error: ${error.message}`);
      }
      
      // Parse GPT response to extract concept
      const response = this.parseGPTResponse(data.response);
      return response;
      
    } catch (error) {
      console.error('❌ Error calling GPT for concept detection:', error);
      throw error;
    }
  }
  
  /**
   * Build specialized GPT prompt for concept detection
   */
  private static buildGPTPrompt(
    questionText: string,
    studentAnswer: string,
    correctAnswer: string,
    subject: string,
    grade: string,
    questionContext?: string,
    skillTargeted?: string
  ): string {
    return `You are an expert educational diagnostician. Based on the student's incorrect answer and mistake pattern, identify the core concept the student is misunderstanding.

Return the concept using **no more than 5 words** that describe the exact skill or knowledge gap.

Examples:
- "Combining like terms"
- "Topic sentence identification"
- "Order of operations confusion"
- "Textual evidence selection"
- "Historical cause and effect"

Avoid full sentences, vague summaries, or generic terms like "math" or "writing."

Subject: ${subject}
Grade: ${grade}
${skillTargeted ? `Skill Being Tested: ${skillTargeted}` : ''}
${questionContext ? `Question Context: ${questionContext}` : ''}

Question: ${questionText}
Student Answer: "${studentAnswer}"
Correct Answer: "${correctAnswer}"

Output format (JSON only):
{
  "concept_missed": "..."
}`;
  }
  
  /**
   * Parse GPT response to extract concept
   */
  private static parseGPTResponse(response: string): GPTConceptResponse {
    try {
      // Try to parse JSON response
      const parsed = JSON.parse(response);
      if (parsed.concept_missed) {
        return { concept_missed: parsed.concept_missed.trim() };
      }
    } catch (error) {
      console.warn('Failed to parse GPT JSON response, attempting text extraction');
    }
    
    // Fallback: extract concept from text response
    const conceptMatch = response.match(/"concept_missed":\s*"([^"]+)"/);
    if (conceptMatch) {
      return { concept_missed: conceptMatch[1].trim() };
    }
    
    // Last resort: use first 5 words of response
    const words = response.trim().split(/\s+/).slice(0, 5);
    return { concept_missed: words.join(' ') };
  }
  
  /**
   * Match GPT-identified concept to existing concepts in our index
   */
  private static async matchConceptToIndex(
    gptConcept: string,
    subject: string,
    grade: string
  ): Promise<{
    confidence: number;
    matched_concept_id?: string;
    is_new_concept: boolean;
  }> {
    try {
      // Get relevant concepts from index
      const { data: concepts, error } = await supabase
        .from('concept_index')
        .select('*')
        .eq('subject', subject)
        .eq('grade', grade);
      
      if (error) {
        console.error('❌ Error fetching concepts from index:', error);
        return { confidence: 0.5, is_new_concept: true };
      }
      
      if (!concepts || concepts.length === 0) {
        console.log('📝 No concepts found in index, treating as new concept');
        await this.addNewConceptToIndex(gptConcept, subject, grade);
        return { confidence: 0.7, is_new_concept: true };
      }
      
      // Find best match using fuzzy matching
      const bestMatch = this.findBestConceptMatch(gptConcept, concepts);
      
      if (bestMatch.confidence > 0.8) {
        // High confidence match - use existing concept
        await this.incrementConceptUsage(bestMatch.concept.id);
        return {
          confidence: bestMatch.confidence,
          matched_concept_id: bestMatch.concept.id,
          is_new_concept: false
        };
      } else if (bestMatch.confidence > 0.5) {
        // Medium confidence - might be existing concept
        return {
          confidence: bestMatch.confidence,
          matched_concept_id: bestMatch.concept.id,
          is_new_concept: false
        };
      } else {
        // Low confidence - treat as new concept
        await this.addNewConceptToIndex(gptConcept, subject, grade);
        return { confidence: 0.6, is_new_concept: true };
      }
      
    } catch (error) {
      console.error('❌ Error matching concept to index:', error);
      return { confidence: 0.4, is_new_concept: true };
    }
  }
  
  /**
   * Find best matching concept using fuzzy string matching
   */
  private static findBestConceptMatch(
    gptConcept: string,
    concepts: ConceptIndexEntry[]
  ): { concept: ConceptIndexEntry; confidence: number } {
    let bestMatch = { concept: concepts[0], confidence: 0 };
    
    const gptWords = gptConcept.toLowerCase().split(/\s+/);
    
    for (const concept of concepts) {
      let score = 0;
      
      // Check exact match
      if (concept.concept_name.toLowerCase() === gptConcept.toLowerCase()) {
        score = 1.0;
      } else {
        // Check word overlap
        const conceptWords = concept.concept_name.toLowerCase().split(/\s+/);
        const commonWords = gptWords.filter(word => conceptWords.includes(word));
        const wordScore = commonWords.length / Math.max(gptWords.length, conceptWords.length);
        
        // Check keyword matches
        const keywordScore = concept.keywords 
          ? concept.keywords.filter(keyword => 
              gptWords.some(word => keyword.toLowerCase().includes(word.toLowerCase()))
            ).length / (concept.keywords.length || 1)
          : 0;
        
        // Combined score
        score = (wordScore * 0.7) + (keywordScore * 0.3);
      }
      
      if (score > bestMatch.confidence) {
        bestMatch = { concept, confidence: score };
      }
    }
    
    return bestMatch;
  }
  
  /**
   * Add new concept to the index
   */
  private static async addNewConceptToIndex(
    conceptName: string,
    subject: string,
    grade: string
  ): Promise<string | null> {
    try {
      const keywords = conceptName.toLowerCase().split(/\s+/).filter(word => word.length > 2);
      
      const { data, error } = await supabase
        .from('concept_index')
        .insert({
          concept_name: conceptName,
          subject,
          grade,
          description: `Auto-generated concept from GPT analysis`,
          keywords,
          usage_count: 1
        })
        .select('id')
        .single();
      
      if (error) {
        console.error('❌ Error adding new concept to index:', error);
        return null;
      }
      
      console.log(`✅ Added new concept to index: "${conceptName}"`);
      return data.id;
      
    } catch (error) {
      console.error('❌ Exception adding concept to index:', error);
      return null;
    }
  }
  
  /**
   * Increment usage count for a concept using direct update
   */
  private static async incrementConceptUsage(conceptId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('concept_index')
        .update({ 
          usage_count: supabase.sql`usage_count + 1`,
          updated_at: new Date().toISOString()
        })
        .eq('id', conceptId);
      
      if (error) {
        console.error('❌ Error incrementing concept usage:', error);
      }
    } catch (error) {
      console.error('❌ Exception incrementing concept usage:', error);
    }
  }
  
  /**
   * Generate fallback concept when GPT fails
   */
  private static generateFallbackConcept(subject: string, skillTargeted: string): string {
    const subjectMap: Record<string, string> = {
      'Math': 'mathematical reasoning',
      'English': 'reading comprehension',
      'Science': 'scientific understanding',
      'Social Studies': 'historical analysis'
    };
    
    const baseSubject = subjectMap[subject] || 'academic understanding';
    return `${skillTargeted.toLowerCase()} ${baseSubject}`.slice(0, 25); // Keep under 5 words
  }
  
  /**
   * Get popular concepts for analytics
   */
  static async getPopularConcepts(
    subject?: string,
    grade?: string,
    limit: number = 10
  ): Promise<ConceptIndexEntry[]> {
    try {
      let query = supabase
        .from('concept_index')
        .select('*')
        .order('usage_count', { ascending: false })
        .limit(limit);
      
      if (subject) {
        query = query.eq('subject', subject);
      }
      
      if (grade) {
        query = query.eq('grade', grade);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('❌ Error fetching popular concepts:', error);
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('❌ Exception fetching popular concepts:', error);
      return [];
    }
  }
}
