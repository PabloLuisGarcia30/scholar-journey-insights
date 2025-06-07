
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
    console.log('Streamlined analyze-test function called with optimized AI grading')
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

    const supabase = createClient(supabaseUrl, supabaseKey)

    // Fetch exam and related data
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

    // Fetch skills data with streamlined formatting
    console.log('Step 2: Fetching Content-Specific skills for class:', examData.class_id)
    const { data: linkedContentSkills, error: contentSkillsError } = await supabase
      .from('class_content_skills')
      .select(`
        content_skills (
          id,
          skill_name
        )
      `)
      .eq('class_id', examData.class_id)

    if (contentSkillsError) {
      console.error('Error fetching linked content skills:', contentSkillsError)
      throw new Error(`Failed to fetch linked content skills: ${contentSkillsError.message}`)
    }

    const contentSkills = linkedContentSkills?.map((item: any) => item.content_skills).filter(Boolean) || []
    console.log('Found', contentSkills.length, 'linked Content-Specific skills')

    console.log('Step 3: Fetching Subject-Specific skills for class:', examData.class_id)
    const { data: linkedSubjectSkills, error: subjectSkillsError } = await supabase
      .from('class_subject_skills')
      .select(`
        subject_skills (
          id,
          skill_name
        )
      `)
      .eq('class_id', examData.class_id)

    if (subjectSkillsError) {
      console.error('Error fetching linked subject skills:', subjectSkillsError)
      throw new Error(`Failed to fetch linked subject skills: ${subjectSkillsError.message}`)
    }

    const subjectSkills = linkedSubjectSkills?.map((item: any) => item.subject_skills).filter(Boolean) || []
    console.log('Found', subjectSkills.length, 'linked Subject-Specific skills')

    const classData = examData.classes

    // Streamlined skill formatting for optimal token usage
    const contentSkillsList = contentSkills
      .map(skill => `${skill.id}: ${skill.skill_name}`)
      .join(', ')

    const subjectSkillsList = subjectSkills
      .map(skill => `${skill.id}: ${skill.skill_name}`)
      .join(', ')

    // Create optimized file summaries
    let fileSummaries = ''
    const hasEnhancedData = files.some((file: any) => file.structuredData?.documentMetadata?.processingMethods?.includes('roboflow_bubbles'))
    
    if (hasEnhancedData) {
      console.log('Processing enhanced dual OCR data with streamlined analysis...')
      fileSummaries = files.map((file: any) => {
        if (file.structuredData) {
          const data = file.structuredData
          let summary = `File: ${file.fileName}\n`
          summary += `Processing: ${data.documentMetadata.processingMethods.join(' + ')}\n`
          summary += `Reliability: ${(data.validationResults.overallReliability * 100).toFixed(1)}%\n`
          
          if (data.questions && data.questions.length > 0) {
            summary += `Answers:\n`
            data.questions.forEach((q: any) => {
              if (q.detectedAnswer) {
                const ans = q.detectedAnswer
                summary += `Q${q.questionNumber}: ${ans.selectedOption} (${(ans.confidence * 100).toFixed(0)}%)\n`
              }
            })
          }
          
          return summary
        }
        return `File: ${file.fileName}\nText: ${file.extractedText.substring(0, 300)}...`
      }).join('\n---\n')
    } else {
      fileSummaries = files.map((file: any) => 
        `File: ${file.fileName}\nText: ${file.extractedText.substring(0, 500)}...`
      ).join('\n\n')
    }

    const answerKeyText = answerKeys.map((ak: any) => 
      `Q${ak.question_number}: ${ak.correct_answer} (${ak.points}pts)`
    ).join('\n')

    console.log('Step 4: Sending streamlined analysis request to OpenAI...')
    
    const aiPayload = {
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content: `Grade test accurately and map questions to skill IDs.

CONTENT SKILLS: [${contentSkillsList}]
SUBJECT SKILLS: [${subjectSkillsList}]

Return JSON:
{
  "overall_score": number,
  "total_points_earned": number,
  "total_points_possible": number,
  "grade": "XX% (letter)",
  "feedback": "brief summary",
  "detailed_analysis": "question breakdown",
  "content_skill_scores": [{"skill_name": "name", "score": number, "points_earned": number, "points_possible": number}],
  "subject_skill_scores": [{"skill_name": "name", "score": number, "points_earned": number, "points_possible": number}],
  "dual_ocr_summary": {
    "processing_methods_used": ["methods"],
    "overall_reliability": number,
    "cross_validated_answers": number,
    "high_confidence_detections": number,
    "fallback_detections": number
  }
}`
        },
        {
          role: "user",
          content: `Grade: "${examData.title}" for ${classData?.subject} ${classData?.grade}

ANSWER KEY:
${answerKeyText}

STUDENT RESPONSES:
${fileSummaries}

Grade accurately and map to skill IDs.`
        }
      ],
      max_tokens: 2000,
      temperature: 0.05
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
    console.log('Streamlined OpenAI analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
      console.log('Successfully parsed streamlined AI analysis:')
      console.log('- Content skill scores:', parsedAnalysis.content_skill_scores?.length || 0)
      console.log('- Subject skill scores:', parsedAnalysis.subject_skill_scores?.length || 0)
      if (parsedAnalysis.dual_ocr_summary) {
        console.log('- Dual OCR reliability:', parsedAnalysis.dual_ocr_summary.overall_reliability)
        console.log('- Cross-validated answers:', parsedAnalysis.dual_ocr_summary.cross_validated_answers)
      }
    } catch {
      console.error('Failed to parse AI analysis, using fallback structure')
      parsedAnalysis = {
        overall_score: 0,
        total_points_earned: 0,
        total_points_possible: examData.total_points || 0,
        grade: "Analysis parsing failed",
        feedback: "Unable to parse streamlined analysis results",
        detailed_analysis: analysisText,
        content_skill_scores: [],
        subject_skill_scores: [],
        dual_ocr_summary: {
          processing_methods_used: hasEnhancedData ? ["google_ocr", "roboflow_bubbles"] : ["google_ocr"],
          overall_reliability: 0,
          cross_validated_answers: 0,
          high_confidence_detections: 0,
          fallback_detections: 0
        }
      }
    }

    // Create or find student profile
    console.log('Creating or finding student profile for:', studentName)
    let studentProfile
    
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
    console.log('Saving streamlined test result to database')
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
      console.log('Saving', parsedAnalysis.content_skill_scores.length, 'streamlined Content-Specific skill scores')
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
      console.log('Saving', parsedAnalysis.subject_skill_scores.length, 'streamlined Subject-Specific skill scores')
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

    console.log('Streamlined dual OCR test analysis completed successfully')

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
    console.error('Error in streamlined analyze-test function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
