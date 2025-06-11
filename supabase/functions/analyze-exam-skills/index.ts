import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log('Enhanced class-specific exam skill analysis function called');
    
    const { examId } = await req.json();
    
    // Validate environment
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY');
    
    if (!openaiApiKey || !supabaseUrl || !supabaseKey) {
      throw new Error('Missing required API keys');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log('Step 1: Checking if skill analysis already exists for exam:', examId);
    
    // Check if analysis already exists
    const { data: existingAnalysis } = await supabase
      .from('exam_skill_analysis')
      .select('*')
      .eq('exam_id', examId)
      .maybeSingle();

    if (existingAnalysis && existingAnalysis.analysis_status === 'completed') {
      console.log('Skill analysis already completed for exam:', examId);
      return new Response(
        JSON.stringify({
          status: 'already_completed',
          message: 'Skill analysis already exists for this exam',
          analysis: existingAnalysis
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Step 2: Fetching exam data and ensuring class association');
    
    // Fetch exam data with class information - CRITICAL for class-specific skills
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*, classes:active_classes(*)')
      .eq('exam_id', examId)
      .maybeSingle();

    if (examError || !examData) {
      throw new Error(`Exam fetch failed: ${examError?.message || 'Exam not found'}`);
    }

    if (!examData.class_id) {
      throw new Error('Exam must be associated with a class for class-specific skill pre-classification');
    }

    console.log('Step 3: Prioritizing class-specific skills over standard curriculum');

    // STEP 3a: Fetch class-specific content skills FIRST (highest priority)
    const { data: classContentSkills, error: contentSkillsError } = await supabase
      .from('class_content_skills')
      .select(`
        content_skill_id,
        content_skills:content_skill_id (
          id,
          skill_name,
          topic,
          skill_description,
          subject,
          grade
        )
      `)
      .eq('class_id', examData.class_id);

    if (contentSkillsError) {
      throw new Error(`Class content skills fetch failed: ${contentSkillsError.message}`);
    }

    // STEP 3b: Fetch class-specific subject skills FIRST (highest priority)
    const { data: classSubjectSkills, error: subjectSkillsError } = await supabase
      .from('class_subject_skills')
      .select(`
        subject_skill_id,
        subject_skills:subject_skill_id (
          id,
          skill_name,
          skill_description,
          subject,
          grade
        )
      `)
      .eq('class_id', examData.class_id);

    if (subjectSkillsError) {
      throw new Error(`Class subject skills fetch failed: ${subjectSkillsError.message}`);
    }

    // Extract the actual skill objects
    const classSpecificContentSkills = classContentSkills?.map(cs => cs.content_skills).filter(Boolean) || [];
    const classSpecificSubjectSkills = classSubjectSkills?.map(ss => ss.subject_skills).filter(Boolean) || [];

    console.log('Found class-specific skills:', {
      contentSkills: classSpecificContentSkills.length,
      subjectSkills: classSpecificSubjectSkills.length,
      classId: examData.class_id,
      className: examData.classes?.name || 'Unknown'
    });

    // STEP 3c: Fallback to standard curriculum skills if class has no custom skills
    let availableContentSkills = classSpecificContentSkills;
    let availableSubjectSkills = classSpecificSubjectSkills;
    let usingFallbackSkills = false;

    if (classSpecificContentSkills.length === 0 && classSpecificSubjectSkills.length === 0) {
      console.log('No class-specific skills found, falling back to standard curriculum skills');
      usingFallbackSkills = true;

      // Fetch standard curriculum skills as fallback
      const { data: standardContentSkills } = await supabase
        .from('content_skills')
        .select('*')
        .eq('subject', examData.classes?.subject || 'Math')
        .eq('grade', examData.classes?.grade || 'Grade 10');

      const { data: standardSubjectSkills } = await supabase
        .from('subject_skills')
        .select('*')
        .eq('subject', examData.classes?.subject || 'Math')
        .eq('grade', examData.classes?.grade || 'Grade 10');

      availableContentSkills = standardContentSkills || [];
      availableSubjectSkills = standardSubjectSkills || [];

      console.log('Using standard curriculum skills as fallback:', {
        contentSkills: availableContentSkills.length,
        subjectSkills: availableSubjectSkills.length
      });
    }

    if (availableContentSkills.length === 0 && availableSubjectSkills.length === 0) {
      throw new Error('No skills found for this class or standard curriculum. Please ensure skills are properly configured.');
    }

    // Fetch answer keys
    const { data: answerKeys, error: answerKeysError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number');

    if (answerKeysError) {
      throw new Error(`Answer keys fetch failed: ${answerKeysError.message}`);
    }

    // Create or update analysis record
    const { data: analysisRecord } = await supabase
      .from('exam_skill_analysis')
      .upsert({
        exam_id: examId,
        analysis_status: 'in_progress',
        total_questions: answerKeys?.length || 0,
        analysis_started_at: new Date().toISOString()
      }, { onConflict: 'exam_id' })
      .select()
      .single();

    console.log('Step 4: Performing enhanced AI skill mapping analysis with detailed rationales');

    // Prepare class-specific skills data for AI with IDs for validation
    const contentSkillsText = availableContentSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.topic || 'General'} | ${skill.skill_description}`
    ).join('\n');
    
    const subjectSkillsText = availableSubjectSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.skill_description}`
    ).join('\n');

    // Create skill ID validation sets
    const validContentSkillIds = new Set(availableContentSkills.map(s => s.id));
    const validSubjectSkillIds = new Set(availableSubjectSkills.map(s => s.id));

    // Prepare questions for analysis
    const questionsText = answerKeys?.map(ak => 
      `Q${ak.question_number}: ${ak.question_text} (Type: ${ak.question_type})`
    ).join('\n') || '';

    const systemPrompt = `You are an educational skill mapping expert. Analyze each question and map it ONLY to relevant content and subject skills from the provided ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} skill lists.

CRITICAL CONSTRAINTS:
- You MUST ONLY use skills from the provided lists below
- You CANNOT create new skills or suggest skills not in these lists
- Each skill mapping MUST use the exact skill ID provided
- If no suitable skill exists in the lists, mark as "no_suitable_skill"
- This analysis is for ${examData.classes?.name || 'Unknown Class'} (${examData.classes?.subject} ${examData.classes?.grade})

NEW ENHANCEMENT - DETAILED RATIONALES:
- For each skill mapping, provide comprehensive natural language rationale
- Include pedagogical reasoning for why this skill applies to this question
- Analyze the cognitive demands and difficulty level
- Identify potential prerequisite gaps if students struggle
- Use consistent concept naming for grouping analytics
- Focus on actionable insights for IntelliCoach nudges

NEW ENHANCEMENT - CONCEPT GROUPING:
- For each skill mapping, provide a "concept_missed_short" - a brief 2-4 word identifier for the core concept being tested
- This should be a simple, groupable concept name (e.g., "Linear Equations", "Photosynthesis", "Essay Structure")
- Use consistent naming across questions that test the same underlying concept
- This enables analytics to group missed concepts across multiple questions

${usingFallbackSkills ? 'STANDARD CURRICULUM' : 'CLASS-SPECIFIC'} CONTENT SKILLS (ONLY use these IDs):
${contentSkillsText}

${usingFallbackSkills ? 'STANDARD CURRICULUM' : 'CLASS-SPECIFIC'} SUBJECT SKILLS (ONLY use these IDs):
${subjectSkillsText}

For each question, provide:
1. Skill mappings with weights and confidence
2. Detailed natural language rationales explaining your reasoning
3. Pedagogical analysis of why these skills apply
4. Difficulty and prerequisite gap analysis
5. Concept grouping identifiers

Return JSON format:
{
  "mappings": [
    {
      "question_number": 1,
      "content_skills": [
        {
          "skill_id": "exact-uuid-from-list", 
          "skill_name": "exact-name-from-list", 
          "weight": 0.8, 
          "confidence": 0.9,
          "concept_missed_short": "Linear Equations",
          "rationale": "This question directly tests the ability to solve linear equations in one variable by requiring students to isolate the variable through algebraic manipulation.",
          "pedagogical_reasoning": "Linear equation solving is fundamental to algebraic thinking and requires understanding of inverse operations, equation balance principles, and systematic problem-solving approaches.",
          "difficulty_analysis": "Medium difficulty - requires multi-step thinking and careful attention to order of operations, but uses standard algebraic procedures.",
          "prerequisite_gaps": ["basic arithmetic operations", "understanding of variables", "inverse operations"]
        }
      ],
      "subject_skills": [
        {
          "skill_id": "exact-uuid-from-list", 
          "skill_name": "exact-name-from-list", 
          "weight": 1.0, 
          "confidence": 0.95,
          "concept_missed_short": "Algebraic Reasoning",
          "rationale": "This question assesses core algebraic reasoning skills including symbolic manipulation and logical problem-solving sequences.",
          "pedagogical_reasoning": "Algebraic reasoning forms the foundation for advanced mathematical thinking and problem-solving across multiple domains.",
          "difficulty_analysis": "Appropriate for grade level - combines concrete and abstract thinking in accessible way.",
          "prerequisite_gaps": ["number sense", "pattern recognition"]
        }
      ],
      "no_suitable_skills": false
    }
  ],
  "summary": {
    "total_questions_mapped": 10,
    "content_skills_used": 5,
    "subject_skills_used": 3,
    "questions_without_suitable_skills": 0,
    "unique_concepts_identified": 8,
    "rationales_generated": 15
  }
}`;

    const userPrompt = `Map these questions to ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} skills for exam: ${examData.title}
Class: ${examData.classes?.name || 'Unknown'} (${examData.classes?.subject} ${examData.classes?.grade})

QUESTIONS:
${questionsText}

IMPORTANT: Only use skill IDs and names from the provided ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} lists. Include detailed rationales and concept_missed_short for each skill mapping to enable comprehensive analysis and IntelliCoach insights.`;

    const aiPayload = {
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 4000,
      temperature: 0.1
    };

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(aiPayload)
    });

    if (!aiResponse.ok) {
      throw new Error(`OpenAI API error: ${aiResponse.statusText}`);
    }

    const result = await aiResponse.json();
    const analysisText = result.choices[0]?.message?.content || "{}";
    
    let skillMappings;
    try {
      skillMappings = JSON.parse(analysisText);
    } catch (parseError) {
      console.error('Failed to parse AI skill mapping:', parseError);
      throw new Error('AI returned invalid skill mapping format');
    }

    console.log('Step 5: Validating and storing enhanced skill mappings with rationales');

    // Validate skill mappings and prepare inserts
    const mappingInserts = [];
    const rationaleInserts = [];
    let contentSkillsFound = 0;
    let subjectSkillsFound = 0;
    let invalidSkillsRejected = 0;
    let rationalesGenerated = 0;
    
    for (const mapping of skillMappings.mappings || []) {
      // Validate and insert content skill mappings with rationales
      for (const contentSkill of mapping.content_skills || []) {
        if (!validContentSkillIds.has(contentSkill.skill_id)) {
          console.warn(`Rejected invalid content skill ID: ${contentSkill.skill_id} for Q${mapping.question_number}`);
          invalidSkillsRejected++;
          continue;
        }
        
        const validatedWeight = Math.min(Math.max(contentSkill.weight || 1.0, 0), 2.0);
        const validatedConfidence = Math.min(Math.max(contentSkill.confidence || 1.0, 0), 1.0);
        
        // Insert skill mapping
        mappingInserts.push({
          exam_id: examId,
          question_number: mapping.question_number,
          skill_type: 'content',
          skill_id: contentSkill.skill_id,
          skill_name: contentSkill.skill_name,
          skill_weight: validatedWeight,
          confidence: validatedConfidence,
          concept_missed_short: contentSkill.concept_missed_short || 'Unknown Concept'
        });
        
        // Insert rationale
        if (contentSkill.rationale) {
          rationaleInserts.push({
            exam_id: examId,
            question_number: mapping.question_number,
            skill_id: contentSkill.skill_id,
            skill_type: 'content',
            skill_name: contentSkill.skill_name,
            rationale: contentSkill.rationale,
            pedagogical_reasoning: contentSkill.pedagogical_reasoning || null,
            difficulty_analysis: contentSkill.difficulty_analysis || null,
            prerequisite_gaps: contentSkill.prerequisite_gaps || []
          });
          rationalesGenerated++;
        }
        
        contentSkillsFound++;
      }
      
      // Validate and insert subject skill mappings with rationales
      for (const subjectSkill of mapping.subject_skills || []) {
        if (!validSubjectSkillIds.has(subjectSkill.skill_id)) {
          console.warn(`Rejected invalid subject skill ID: ${subjectSkill.skill_id} for Q${mapping.question_number}`);
          invalidSkillsRejected++;
          continue;
        }
        
        const validatedWeight = Math.min(Math.max(subjectSkill.weight || 1.0, 0), 2.0);
        const validatedConfidence = Math.min(Math.max(subjectSkill.confidence || 1.0, 0), 1.0);
        
        // Insert skill mapping
        mappingInserts.push({
          exam_id: examId,
          question_number: mapping.question_number,
          skill_type: 'subject',
          skill_id: subjectSkill.skill_id,
          skill_name: subjectSkill.skill_name,
          skill_weight: validatedWeight,
          confidence: validatedConfidence,
          concept_missed_short: subjectSkill.concept_missed_short || 'Unknown Concept'
        });
        
        // Insert rationale
        if (subjectSkill.rationale) {
          rationaleInserts.push({
            exam_id: examId,
            question_number: mapping.question_number,
            skill_id: subjectSkill.skill_id,
            skill_type: 'subject',
            skill_name: subjectSkill.skill_name,
            rationale: subjectSkill.rationale,
            pedagogical_reasoning: subjectSkill.pedagogical_reasoning || null,
            difficulty_analysis: subjectSkill.difficulty_analysis || null,
            prerequisite_gaps: subjectSkill.prerequisite_gaps || []
          });
          rationalesGenerated++;
        }
        
        subjectSkillsFound++;
      }
    }

    // Insert validated mappings
    if (mappingInserts.length > 0) {
      const { error: mappingsError } = await supabase
        .from('exam_skill_mappings')
        .insert(mappingInserts);
        
      if (mappingsError) {
        console.error('Error inserting skill mappings:', mappingsError);
        throw new Error('Failed to store skill mappings');
      }
    }

    // Insert rationales
    if (rationaleInserts.length > 0) {
      const { error: rationalesError } = await supabase
        .from('exam_skill_rationales')
        .insert(rationaleInserts);
        
      if (rationalesError) {
        console.error('Error inserting rationales:', rationalesError);
        throw new Error('Failed to store rationales');
      }
    }

    // Update analysis record with completion
    await supabase
      .from('exam_skill_analysis')
      .update({
        analysis_status: 'completed',
        mapped_questions: skillMappings.mappings?.length || 0,
        content_skills_found: contentSkillsFound,
        subject_skills_found: subjectSkillsFound,
        analysis_completed_at: new Date().toISOString(),
        ai_analysis_data: {
          ...skillMappings,
          validation_stats: {
            invalid_skills_rejected: invalidSkillsRejected,
            class_id: examData.class_id,
            class_name: examData.classes?.name || 'Unknown',
            used_class_specific_skills: !usingFallbackSkills,
            used_fallback_skills: usingFallbackSkills,
            available_content_skills: availableContentSkills.length,
            available_subject_skills: availableSubjectSkills.length,
            concept_grouping_enabled: true,
            rationales_generated: rationalesGenerated,
            unique_concepts_identified: skillMappings.summary?.unique_concepts_identified || 0
          }
        }
      })
      .eq('id', analysisRecord.id);

    console.log('Enhanced skill analysis with rationales completed successfully');
    console.log(`Generated ${rationalesGenerated} detailed rationales for ${skillMappings.mappings?.length || 0} questions`);
    console.log(`Mapped ${contentSkillsFound} content skills and ${subjectSkillsFound} subject skills`);
    console.log(`Using ${usingFallbackSkills ? 'standard curriculum' : 'class-specific'} skills for ${examData.classes?.name || 'Unknown Class'}`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        exam_id: examId,
        class_id: examData.class_id,
        class_name: examData.classes?.name || 'Unknown',
        used_class_specific_skills: !usingFallbackSkills,
        used_fallback_skills: usingFallbackSkills,
        total_questions: answerKeys?.length || 0,
        mapped_questions: skillMappings.mappings?.length || 0,
        content_skills_found: contentSkillsFound,
        subject_skills_found: subjectSkillsFound,
        invalid_skills_rejected: invalidSkillsRejected,
        concept_grouping_enabled: true,
        rationales_generated: rationalesGenerated,
        unique_concepts_identified: skillMappings.summary?.unique_concepts_identified || 0,
        class_scoped_validation: true,
        skill_mappings: skillMappings
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in enhanced analyze-exam-skills function:', error);
    
    // Update analysis record with error
    try {
      const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!);
      const { examId } = await req.json();
      
      await supabase
        .from('exam_skill_analysis')
        .update({
          analysis_status: 'failed',
          error_message: error.message
        })
        .eq('exam_id', examId);
    } catch (updateError) {
      console.error('Failed to update error status:', updateError);
    }
    
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
})
