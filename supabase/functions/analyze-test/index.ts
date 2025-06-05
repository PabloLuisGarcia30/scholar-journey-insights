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
    console.log('Enhanced analyze-test function called with dual OCR data')
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

    // Fetch skills data with IDs
    console.log('Step 2: Fetching Content-Specific skills for class:', examData.class_id)
    const { data: linkedContentSkills, error: contentSkillsError } = await supabase
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
          skill_name,
          skill_description,
          subject,
          grade
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

    // Format skills with ID (Skill Name) format for enhanced precision
    let contentSkillsText = '';
    if (contentSkills.length > 0) {
      const groupedSkills = contentSkills.reduce((acc: any, skill: any) => {
        if (!acc[skill.topic]) {
          acc[skill.topic] = [];
        }
        acc[skill.topic].push(skill);
        return acc;
      }, {});

      const topics = Object.keys(groupedSkills).sort();

      contentSkillsText = topics.map(topic => {
        const topicSkills = groupedSkills[topic]
          .sort((a: any, b: any) => a.skill_name.localeCompare(b.skill_name))
          .map((skill: any) => `  - ${skill.id} (${skill.skill_name}): ${skill.skill_description}`)
          .join('\n');
        return `${topic}:\n${topicSkills}`;
      }).join('\n\n');
    }

    const subjectSkillsText = subjectSkills
      .sort((a: any, b: any) => a.skill_name.localeCompare(b.skill_name))
      .map(skill => `- ${skill.id} (${skill.skill_name}): ${skill.skill_description}`)
      .join('\n');

    // Create compressed file summaries instead of full verbose text
    let fileSummaries = ''
    const hasEnhancedData = files.some((file: any) => file.structuredData?.documentMetadata?.processingMethods?.includes('roboflow_bubbles'))
    
    if (hasEnhancedData) {
      console.log('Creating compressed summaries from ENHANCED DUAL OCR data...')
      fileSummaries = files.map((file: any) => {
        if (file.structuredData) {
          const data = file.structuredData
          let summary = `\nFile: ${file.fileName}\n`
          
          // Key metrics only
          summary += `Processing: ${data.documentMetadata.processingMethods.join(' + ')}\n`
          summary += `Overall Confidence: ${(data.documentMetadata.overallConfidence * 100).toFixed(1)}%\n`
          summary += `Reliability: ${(data.validationResults.overallReliability * 100).toFixed(1)}%\n`
          summary += `Cross-Validated: ${data.validationResults.crossValidationCount} answers\n`
          
          // Detected answers summary
          if (data.questions && data.questions.length > 0) {
            summary += `Questions Detected: ${data.questions.length}\n`
            summary += `Answers Detected:\n`
            data.questions.forEach((q: any) => {
              if (q.detectedAnswer) {
                const ans = q.detectedAnswer
                summary += `Q${q.questionNumber}: ${ans.selectedOption} (${ans.detectionMethod}, ${(ans.confidence * 100).toFixed(0)}%${ans.crossValidated ? ', validated' : ''})\n`
              } else {
                summary += `Q${q.questionNumber}: No answer detected\n`
              }
            })
          }
          
          return summary
        }
        return `File: ${file.fileName}\nBasic OCR Text Length: ${file.extractedText.length} chars`
      }).join('\n---\n')
    } else {
      fileSummaries = files.map((file: any) => 
        `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
      ).join('\n\n---\n\n')
    }

    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    console.log('Step 4: Sending ENHANCED analysis request to OpenAI with compressed data...')
    
    const aiPayload = {
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant. Grade the test and map each question to skills using the exact IDs provided.

WORKFLOW:
1. Grade each question against the answer key
2. Map each question to relevant skill IDs from the lists below
3. Calculate skill scores based on questions that test each skill

Use EXACT skill IDs from these lists:

CONTENT-SPECIFIC SKILLS:
${contentSkillsText}

SUBJECT-SPECIFIC SKILLS:
${subjectSkillsText}

Return JSON with this structure:
{
  "overall_score": 85.5,
  "total_points_earned": 17,
  "total_points_possible": 20,
  "grade": "85.5% (B+)",
  "feedback": "brief feedback",
  "detailed_analysis": "question-by-question breakdown",
  "question_skill_mapping": [
    {
      "question_number": 1,
      "points_earned": 2,
      "points_possible": 2,
      "content_skill_ids": ["skill-id-1", "skill-id-2"],
      "subject_skill_ids": ["skill-id-3"]
    }
  ],
  "content_skill_scores": [
    {"skill_name": "Skill Name", "score": 90.0, "points_earned": 9, "points_possible": 10}
  ],
  "subject_skill_scores": [
    {"skill_name": "Skill Name", "score": 85.0, "points_earned": 17, "points_possible": 20}
  ],
  "dual_ocr_summary": {
    "processing_methods_used": ["google_ocr", "roboflow_bubbles"],
    "overall_reliability": 0.95,
    "cross_validated_answers": 8,
    "high_confidence_detections": 9,
    "fallback_detections": 1
  }
}

Map each question to skills and calculate scores accurately.`
        },
        {
          role: "user",
          content: `Grade this test for "${examData.title}" (Exam ID: ${examId})

Class: ${classData?.subject} ${classData?.grade}

ANSWER KEY:
${answerKeyText}

STUDENT RESPONSES:
${fileSummaries}

Map each question to the appropriate skill IDs and calculate accurate skill scores.`
        }
      ],
      max_tokens: 4000,
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
    console.log('Enhanced OCR OpenAI analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
      console.log('Successfully parsed enhanced AI analysis with:')
      console.log('- Content-Specific skill scores:', parsedAnalysis.content_skill_scores?.length || 0)
      console.log('- Subject-Specific skill scores:', parsedAnalysis.subject_skill_scores?.length || 0)
      console.log('- Question skill mappings:', parsedAnalysis.question_skill_mapping?.length || 0)
      if (parsedAnalysis.dual_ocr_summary) {
        console.log('- Dual OCR reliability:', parsedAnalysis.dual_ocr_summary.overall_reliability)
        console.log('- Cross-validated answers:', parsedAnalysis.dual_ocr_summary.cross_validated_answers)
      }
    } catch {
      parsedAnalysis = {
        overall_score: 0,
        total_points_earned: 0,
        total_points_possible: examData.total_points || 0,
        grade: "Analysis failed",
        feedback: "Unable to parse enhanced analysis results",
        detailed_analysis: analysisText,
        question_skill_mapping: [],
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
    console.log('Saving enhanced test result to database')
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
      console.log('Saving', parsedAnalysis.content_skill_scores.length, 'enhanced Content-Specific skill scores')
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
      console.log('Saving', parsedAnalysis.subject_skill_scores.length, 'enhanced Subject-Specific skill scores')
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

    console.log('Enhanced dual OCR test result and skill scores saved successfully')

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
    console.error('Error in enhanced analyze-test function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
