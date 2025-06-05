import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Analyze-test function called')
    const { files, examId, studentName, studentEmail } = await req.json()
    console.log('Processing exam ID:', examId, 'for student:', studentName, 'with', files.length, 'files')
    
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openaiApiKey) {
      console.error('OpenAI API key not configured')
      throw new Error('OpenAI API key not configured')
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseKey = Deno.env.get('SUPABASE_ANON_KEY')
    
    if (!supabaseUrl || !supabaseKey) {
      console.error('Supabase configuration missing')
      throw new Error('Supabase configuration missing')
    }

    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseKey)

    // Step 1: Fetch exam and identify class
    console.log('Step 1: Fetching exam data for:', examId)
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*, classes:active_classes(*)')
      .eq('exam_id', examId)
      .maybeSingle()

    if (examError) {
      console.error('Error fetching exam:', examError)
      throw new Error(`Failed to fetch exam: ${examError.message}`)
    }

    if (!examData) {
      console.error('No exam found with ID:', examId)
      throw new Error(`No exam found with ID: ${examId}. Please ensure the exam has been created and saved.`)
    }

    // Fetch answer keys
    const { data: answerKeys, error: answerError } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number')

    if (answerError) {
      console.error('Error fetching answer keys:', answerError)
      throw new Error(`Failed to fetch answer keys: ${answerError.message}`)
    }

    if (!answerKeys || answerKeys.length === 0) {
      console.error('No answer keys found for exam:', examId)
      throw new Error(`No answer keys found for exam: ${examId}`)
    }

    console.log('Found exam:', examData.title, 'with', answerKeys.length, 'answer keys')

    // Step 2: Get Content-Specific skills linked to this class
    console.log('Step 2: Fetching Content-Specific skills for class:', examData.class_id)
    const { data: linkedSkills, error: skillsError } = await supabase
      .from('class_content_skills')
      .select(`
        content_skills (
          id,
          skill_name,
          skill_description,
          topic,
          subject,
          grade
        )
      `)
      .eq('class_id', examData.class_id)

    if (skillsError) {
      console.error('Error fetching linked skills:', skillsError)
      throw new Error(`Failed to fetch linked skills: ${skillsError.message}`)
    }

    const contentSkills = linkedSkills?.map((item: any) => item.content_skills).filter(Boolean) || []
    console.log('Found', contentSkills.length, 'linked Content-Specific skills')

    // Get class information for subject-specific skills (keep existing logic)
    const classData = examData.classes
    const subjectSkills = ['Problem Solving', 'Mathematical Reasoning', 'Communication', 'Critical Thinking']

    // Combine all extracted text
    const combinedText = files.map((file: any) => 
      `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
    ).join('\n\n---\n\n')

    // Format answer key for AI analysis
    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    // Format Content-Specific skills for AI analysis
    const contentSkillsText = contentSkills.map((skill: any) => 
      `- ${skill.skill_name}: ${skill.skill_description} (Topic: ${skill.topic})`
    ).join('\n')

    console.log('Step 3: Sending enhanced analysis request to OpenAI...')
    // Enhanced AI payload with detailed skill matching instructions
    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant with enhanced skill-based analysis capabilities. You have been provided with:

1. The official answer key for exam "${examData.title}" (ID: ${examId})
2. A comprehensive list of Content-Specific skills linked to this class
3. Subject-Specific skills for general assessment

ENHANCED GRADING WORKFLOW:

STEP 1: Grade each question individually
- For multiple choice and true/false: answers must match exactly
- For short answer: look for key concepts, allow reasonable variations
- For essay questions: evaluate based on key points and concepts

STEP 2: For EACH QUESTION, identify which Content-Specific skills it tests
- Match each question to the most relevant Content-Specific skills from the provided list
- A single question can test multiple skills
- Use the skill descriptions to determine relevance

STEP 3: Calculate Content-Specific skill scores
- For each Content-Specific skill, calculate the percentage based on:
  - Points earned from questions testing that skill / Total points possible for questions testing that skill
- Only include skills that are actually tested in this exam
- If a skill is not tested by any question, do not include it in the results

STEP 4: Calculate Subject-Specific skill scores based on overall performance patterns

Content-Specific Skills Available:
${contentSkillsText}

Subject-Specific Skills: ${subjectSkills.join(', ')}

Return your response in this JSON format:
{
  "overall_score": 85.5,
  "total_points_earned": 17,
  "total_points_possible": 20,
  "grade": "85.5% (B+)",
  "feedback": "brief summary feedback for the student",
  "detailed_analysis": "detailed question-by-question breakdown with scores, explanations, and which Content-Specific skills each question tested",
  "content_skill_scores": [
    {"skill_name": "Factoring Polynomials", "score": 90.0, "points_earned": 9, "points_possible": 10},
    {"skill_name": "Solving Systems of Equations", "score": 80.0, "points_earned": 8, "points_possible": 10}
  ],
  "subject_skill_scores": [
    {"skill_name": "Problem Solving", "score": 85.0, "points_earned": 17, "points_possible": 20},
    {"skill_name": "Mathematical Reasoning", "score": 90.0, "points_earned": 18, "points_possible": 20}
  ]
}

IMPORTANT: 
- Only include Content-Specific skills that are actually tested by questions in this exam
- Be explicit in your detailed_analysis about which Content-Specific skills each question tests
- Ensure the Content-Specific skill scores accurately reflect performance on questions testing those specific skills`
        },
        {
          role: "user",
          content: `Please analyze this student's test responses for "${examData.title}" (Exam ID: ${examId}) using the enhanced skill-based grading workflow.

OFFICIAL ANSWER KEY:
${answerKeyText}

STUDENT'S RESPONSES (OCR-extracted):
${combinedText}

CONTENT-SPECIFIC SKILLS TO EVALUATE:
${contentSkillsText}

SUBJECT-SPECIFIC SKILLS: ${subjectSkills.join(', ')}

Please provide a detailed grade report with accurate skill-based scoring that matches each question to the appropriate Content-Specific skills.`
        }
      ],
      max_tokens: 4000,
      temperature: 0.1
    }

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openaiApiKey}`
      },
      body: JSON.stringify(aiPayload)
    })

    if (!aiResponse.ok) {
      const errorData = await aiResponse.json()
      console.error('OpenAI API error:', errorData)
      throw new Error(`OpenAI API error: ${errorData.error?.message || aiResponse.statusText}`)
    }

    const result = await aiResponse.json()
    console.log('OpenAI enhanced analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    // Try to parse as JSON, fallback to plain text
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
      console.log('Successfully parsed AI analysis with', parsedAnalysis.content_skill_scores?.length || 0, 'Content-Specific skill scores')
    } catch {
      parsedAnalysis = {
        overall_score: 0,
        total_points_earned: 0,
        total_points_possible: examData.total_points || 0,
        grade: "Analysis failed",
        feedback: "Unable to parse analysis results",
        detailed_analysis: analysisText,
        content_skill_scores: [],
        subject_skill_scores: []
      }
    }

    // Create or find student profile
    console.log('Creating or finding student profile for:', studentName)
    let studentProfile
    
    // Try to find existing student
    const { data: existingStudent, error: findError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_name', studentName)
      .maybeSingle()

    if (findError && findError.code !== 'PGRST116') {
      throw new Error(`Failed to search for student: ${findError.message}`)
    }

    if (existingStudent) {
      studentProfile = existingStudent
    } else {
      // Create new student profile
      const { data: newStudent, error: createError } = await supabase
        .from('student_profiles')
        .insert({
          student_name: studentName,
          email: studentEmail
        })
        .select()
        .single()

      if (createError) {
        console.error('Error creating student:', createError)
        throw new Error(`Failed to create student: ${createError.message}`)
      }
      studentProfile = newStudent
    }

    // Save test result to database
    console.log('Saving test result to database')
    const { data: testResult, error: resultError } = await supabase
      .from('test_results')
      .insert({
        student_id: studentProfile.id,
        exam_id: examId,
        class_id: examData.class_id,
        overall_score: parsedAnalysis.overall_score || 0,
        total_points_earned: parsedAnalysis.total_points_earned || 0,
        total_points_possible: parsedAnalysis.total_points_possible || examData.total_points || 0,
        ai_feedback: parsedAnalysis.feedback,
        detailed_analysis: parsedAnalysis.detailed_analysis
      })
      .select()
      .single()

    if (resultError) {
      console.error('Error saving test result:', resultError)
      throw new Error(`Failed to save test result: ${resultError.message}`)
    }

    // Save content skill scores (now based on actual question analysis)
    if (parsedAnalysis.content_skill_scores && parsedAnalysis.content_skill_scores.length > 0) {
      console.log('Saving', parsedAnalysis.content_skill_scores.length, 'Content-Specific skill scores')
      const contentScores = parsedAnalysis.content_skill_scores.map((skill: any) => ({
        test_result_id: testResult.id,
        skill_name: skill.skill_name,
        score: skill.score || 0,
        points_earned: skill.points_earned || 0,
        points_possible: skill.points_possible || 0
      }))

      const { error: contentError } = await supabase
        .from('content_skill_scores')
        .insert(contentScores)

      if (contentError) {
        console.error('Error saving content skill scores:', contentError)
      }
    }

    // Save subject skill scores
    if (parsedAnalysis.subject_skill_scores && parsedAnalysis.subject_skill_scores.length > 0) {
      const subjectScores = parsedAnalysis.subject_skill_scores.map((skill: any) => ({
        test_result_id: testResult.id,
        skill_name: skill.skill_name,
        score: skill.score || 0,
        points_earned: skill.points_earned || 0,
        points_possible: skill.points_possible || 0
      }))

      const { error: subjectError } = await supabase
        .from('subject_skill_scores')
        .insert(subjectScores)

      if (subjectError) {
        console.error('Error saving subject skill scores:', subjectError)
      }
    }

    console.log('Enhanced test result and skill scores saved successfully')

    return new Response(
      JSON.stringify({
        ...parsedAnalysis,
        student_id: studentProfile.id,
        test_result_id: testResult.id
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in analyze-test function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
