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
    console.log('One-time exam skill analysis function called with score validation');
    
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

    console.log('Step 2: Fetching exam data and available skills');
    
    // Fetch exam data and answer keys
    const [examRes, answerKeysRes, contentSkillsRes, subjectSkillsRes] = await Promise.all([
      supabase.from('exams').select('*, classes:active_classes(*)').eq('exam_id', examId).maybeSingle(),
      supabase.from('answer_keys').select('*').eq('exam_id', examId).order('question_number'),
      supabase.from('content_skills').select('*'),
      supabase.from('subject_skills').select('*')
    ]);

    if (examRes.error || !examRes.data) {
      throw new Error(`Exam fetch failed: ${examRes.error?.message || 'Exam not found'}`);
    }

    const examData = examRes.data;
    const answerKeys = answerKeysRes.data || [];
    const contentSkills = contentSkillsRes.data || [];
    const subjectSkills = subjectSkillsRes.data || [];

    console.log('Found exam:', examData.title, 'with', answerKeys.length, 'questions');
    console.log('Available skills:', contentSkills.length, 'content,', subjectSkills.length, 'subject');

    // Create or update analysis record
    const { data: analysisRecord } = await supabase
      .from('exam_skill_analysis')
      .upsert({
        exam_id: examId,
        analysis_status: 'in_progress',
        total_questions: answerKeys.length,
        analysis_started_at: new Date().toISOString()
      }, { onConflict: 'exam_id' })
      .select()
      .single();

    console.log('Step 3: Performing AI skill mapping analysis');

    // Prepare skills data for AI
    const contentSkillsText = contentSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.topic} | ${skill.skill_description}`
    ).join('\n');
    
    const subjectSkillsText = subjectSkills.map(skill => 
      `ID:${skill.id} | ${skill.skill_name} | ${skill.skill_description}`
    ).join('\n');

    // Prepare questions for analysis
    const questionsText = answerKeys.map(ak => 
      `Q${ak.question_number}: ${ak.question_text} (Type: ${ak.question_type})`
    ).join('\n');

    const systemPrompt = `You are an educational skill mapping expert. Analyze each question and map it to relevant content and subject skills.

AVAILABLE CONTENT SKILLS:
${contentSkillsText}

AVAILABLE SUBJECT SKILLS:
${subjectSkillsText}

For each question, identify:
1. Which content skills it tests (1-3 most relevant)
2. Which subject skills it tests (1-2 most relevant)
3. Weight for each skill (0.1-1.0 based on how central the skill is to the question)
4. Confidence in the mapping (0.1-1.0)

Return JSON format:
{
  "mappings": [
    {
      "question_number": 1,
      "content_skills": [
        {"skill_id": "uuid", "skill_name": "name", "weight": 0.8, "confidence": 0.9}
      ],
      "subject_skills": [
        {"skill_id": "uuid", "skill_name": "name", "weight": 1.0, "confidence": 0.95}
      ]
    }
  ],
  "summary": {
    "total_questions_mapped": 10,
    "content_skills_used": 5,
    "subject_skills_used": 3
  }
}`;

    const userPrompt = `Map these questions to skills for exam: ${examData.title}

QUESTIONS:
${questionsText}

Provide complete skill mapping for all questions.`;

    const aiPayload = {
      model: "gpt-4.1-2025-04-14",
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt }
      ],
      max_tokens: 3000,
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

    console.log('Step 4: Storing skill mappings with validation in database');

    // Store skill mappings with validation
    const mappingInserts = [];
    let contentSkillsFound = 0;
    let subjectSkillsFound = 0;
    
    for (const mapping of skillMappings.mappings || []) {
      // Insert content skill mappings with weight validation
      for (const contentSkill of mapping.content_skills || []) {
        // Validate skill weight (cap at 2.0)
        const validatedWeight = Math.min(Math.max(contentSkill.weight || 1.0, 0), 2.0);
        const validatedConfidence = Math.min(Math.max(contentSkill.confidence || 1.0, 0), 1.0);
        
        if (validatedWeight !== (contentSkill.weight || 1.0)) {
          console.warn(`Content skill weight adjusted from ${contentSkill.weight} to ${validatedWeight} for Q${mapping.question_number}`);
        }
        
        mappingInserts.push({
          exam_id: examId,
          question_number: mapping.question_number,
          skill_type: 'content',
          skill_id: contentSkill.skill_id,
          skill_name: contentSkill.skill_name,
          skill_weight: validatedWeight,
          confidence: validatedConfidence
        });
        contentSkillsFound++;
      }
      
      // Insert subject skill mappings with weight validation
      for (const subjectSkill of mapping.subject_skills || []) {
        // Validate skill weight (cap at 2.0)
        const validatedWeight = Math.min(Math.max(subjectSkill.weight || 1.0, 0), 2.0);
        const validatedConfidence = Math.min(Math.max(subjectSkill.confidence || 1.0, 0), 1.0);
        
        if (validatedWeight !== (subjectSkill.weight || 1.0)) {
          console.warn(`Subject skill weight adjusted from ${subjectSkill.weight} to ${validatedWeight} for Q${mapping.question_number}`);
        }
        
        mappingInserts.push({
          exam_id: examId,
          question_number: mapping.question_number,
          skill_type: 'subject',
          skill_id: subjectSkill.skill_id,
          skill_name: subjectSkill.skill_name,
          skill_weight: validatedWeight,
          confidence: validatedConfidence
        });
        subjectSkillsFound++;
      }
    }

    // Insert all mappings
    if (mappingInserts.length > 0) {
      const { error: mappingsError } = await supabase
        .from('exam_skill_mappings')
        .insert(mappingInserts);
        
      if (mappingsError) {
        console.error('Error inserting skill mappings:', mappingsError);
        throw new Error('Failed to store skill mappings');
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
        ai_analysis_data: skillMappings
      })
      .eq('id', analysisRecord.id);

    console.log('Skill analysis with validation completed successfully');
    console.log(`Mapped ${skillMappings.mappings?.length || 0} questions with ${contentSkillsFound} content skills and ${subjectSkillsFound} subject skills`);

    return new Response(
      JSON.stringify({
        status: 'completed',
        exam_id: examId,
        total_questions: answerKeys.length,
        mapped_questions: skillMappings.mappings?.length || 0,
        content_skills_found: contentSkillsFound,
        subject_skills_found: subjectSkillsFound,
        validation_applied: true,
        skill_mappings: skillMappings
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Error in analyze-exam-skills function:', error);
    
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
