
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

    // Fetch exam and answer key from database
    console.log('Fetching exam data for:', examId)
    const { data: examData, error: examError } = await supabase
      .from('exams')
      .select('*, classes(*)')
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

    // Get class information for skill-based grading
    const classData = examData.classes
    const contentSkills = classData?.content_skills || []
    const subjectSkills = classData?.subject_skills || []

    // Combine all extracted text
    const combinedText = files.map((file: any) => 
      `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
    ).join('\n\n---\n\n')

    // Format answer key for AI analysis
    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    console.log('Sending to OpenAI for analysis...')
    // Send to OpenAI for analysis with skill-based grading
    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant. You have been provided with the official answer key for exam "${examData.title}" (ID: ${examId}). Grade the student's responses by comparing them to the correct answers and provide skill-based scoring.

For multiple choice and true/false questions, answers must match exactly.
For short answer questions, look for key concepts and allow reasonable variations in wording.
For essay questions, evaluate based on the key points and concepts mentioned in the answer key.

IMPORTANT: You must also analyze performance in these specific skill categories:

Content-Specific Skills: ${contentSkills.join(', ')}
Subject-Specific Skills: ${subjectSkills.join(', ')}

For each skill, determine what percentage of the questions testing that skill were answered correctly.

Return your response in this JSON format:
{
  "overall_score": 85.5,
  "total_points_earned": 17,
  "total_points_possible": 20,
  "grade": "85.5% (B+)",
  "feedback": "brief summary feedback for the student",
  "detailed_analysis": "detailed question-by-question breakdown with scores and explanations",
  "content_skill_scores": [
    {"skill_name": "Algebra", "score": 90.0, "points_earned": 9, "points_possible": 10},
    {"skill_name": "Geometry", "score": 80.0, "points_earned": 8, "points_possible": 10}
  ],
  "subject_skill_scores": [
    {"skill_name": "Problem Solving", "score": 85.0, "points_earned": 17, "points_possible": 20},
    {"skill_name": "Mathematical Reasoning", "score": 90.0, "points_earned": 18, "points_possible": 20}
  ]
}`
        },
        {
          role: "user",
          content: `Please grade this student's test responses for "${examData.title}" (Exam ID: ${examId}).

OFFICIAL ANSWER KEY:
${answerKeyText}

STUDENT'S RESPONSES (OCR-extracted):
${combinedText}

CLASS SKILLS TO EVALUATE:
Content Skills: ${contentSkills.join(', ')}
Subject Skills: ${subjectSkills.join(', ')}

Please provide a detailed grade report with skill-based scoring.`
        }
      ],
      max_tokens: 3000,
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
    console.log('OpenAI analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    // Try to parse as JSON, fallback to plain text
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
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

    // Save content skill scores
    if (parsedAnalysis.content_skill_scores && parsedAnalysis.content_skill_scores.length > 0) {
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

    console.log('Test result and skill scores saved successfully')

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
