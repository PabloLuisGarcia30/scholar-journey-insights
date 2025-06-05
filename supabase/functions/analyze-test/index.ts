
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

    // Get class information for context
    const classData = examData.classes

    // Format Content-Specific skills for AI analysis with proper ordering
    let contentSkillsText = '';
    if (contentSkills.length > 0) {
      const groupedSkills = contentSkills.reduce((acc: any, skill: any) => {
        if (!acc[skill.topic]) {
          acc[skill.topic] = [];
        }
        acc[skill.topic].push(skill);
        return acc;
      }, {});

      const isGrade10Math = classData?.subject === 'Math' && classData?.grade === 'Grade 10';
      
      let topics = Object.keys(groupedSkills);
      if (isGrade10Math) {
        const orderedTopics = [
          'ALGEBRA AND FUNCTIONS',
          'GEOMETRY', 
          'TRIGONOMETRY',
          'DATA ANALYSIS AND PROBABILITY',
          'PROBLEM SOLVING AND REASONING'
        ];
        
        topics = orderedTopics.filter(topic => groupedSkills[topic]);
        const remainingTopics = Object.keys(groupedSkills).filter(topic => !orderedTopics.includes(topic));
        topics = [...topics, ...remainingTopics];

        const skillOrders: Record<string, string[]> = {
          'ALGEBRA AND FUNCTIONS': [
            'Factoring Polynomials',
            'Solving Systems of Equations',
            'Understanding Function Notation',
            'Graphing Linear and Quadratic Functions',
            'Working with Exponential Functions'
          ],
          'GEOMETRY': [
            'Properties of Similar Triangles',
            'Area and Perimeter Calculations',
            'Volume and Surface Area of 3D Objects',
            'Coordinate Geometry',
            'Geometric Transformations'
          ],
          'TRIGONOMETRY': [
            'Basic Trigonometric Ratios',
            'Solving Right Triangle Problems',
            'Unit Circle and Angle Measures',
            'Trigonometric Identities',
            'Applications of Trigonometry'
          ],
          'DATA ANALYSIS AND PROBABILITY': [
            'Statistical Measures and Interpretation',
            'Probability Calculations',
            'Data Collection and Sampling',
            'Creating and Interpreting Graphs',
            'Making Predictions from Data'
          ],
          'PROBLEM SOLVING AND REASONING': [
            'Mathematical Modeling',
            'Critical Thinking in Mathematics',
            'Pattern Recognition',
            'Logical Reasoning',
            'Problem-Solving Strategies'
          ]
        };

        topics.forEach(topic => {
          if (skillOrders[topic]) {
            const order = skillOrders[topic];
            groupedSkills[topic].sort((a: any, b: any) => {
              const aIndex = order.indexOf(a.skill_name);
              const bIndex = order.indexOf(b.skill_name);
              if (aIndex === -1 && bIndex === -1) return 0;
              if (aIndex === -1) return 1;
              if (bIndex === -1) return -1;
              return aIndex - bIndex;
            });
          }
        });
      }

      contentSkillsText = topics.map(topic => {
        const topicSkills = groupedSkills[topic].map((skill: any) => 
          `  - ${skill.skill_name}: ${skill.skill_description}`
        ).join('\n');
        return `${topic}:\n${topicSkills}`;
      }).join('\n\n');
    }

    // Format Subject-Specific skills for AI analysis
    const subjectSkillsText = subjectSkills.map(skill => 
      `- ${skill.skill_name}: ${skill.skill_description}`
    ).join('\n');

    // Process structured OCR data for enhanced analysis
    let structuredDataText = ''
    const hasStructuredData = files.some((file: any) => file.structuredData)
    
    if (hasStructuredData) {
      console.log('Processing enhanced structured OCR data...')
      structuredDataText = files.map((file: any) => {
        if (file.structuredData) {
          const data = file.structuredData
          let fileAnalysis = `\n=== STRUCTURED ANALYSIS FOR ${file.fileName} ===\n`
          
          // Add metadata
          fileAnalysis += `Pages: ${data.metadata.totalPages}\n`
          if (data.metadata.processingNotes.length > 0) {
            fileAnalysis += `Processing Notes: ${data.metadata.processingNotes.join('; ')}\n`
          }
          
          // Add questions with better structure
          if (data.questions && data.questions.length > 0) {
            fileAnalysis += `\nDETECTED QUESTIONS (${data.questions.length}):\n`
            data.questions.forEach((q: any) => {
              fileAnalysis += `Q${q.questionNumber}: ${q.questionText}\n`
              fileAnalysis += `Type: ${q.type}, Confidence: ${q.confidence}\n`
              if (q.options && q.options.length > 0) {
                fileAnalysis += `Options:\n`
                q.options.forEach((opt: any) => {
                  fileAnalysis += `  ${opt.letter}. ${opt.text}\n`
                })
              }
              if (q.notes) {
                fileAnalysis += `Notes: ${q.notes}\n`
              }
              fileAnalysis += '\n'
            })
          }
          
          // Add detected answers
          if (data.answers && data.answers.length > 0) {
            fileAnalysis += `DETECTED STUDENT ANSWERS (${data.answers.length}):\n`
            data.answers.forEach((a: any) => {
              fileAnalysis += `Q${a.questionNumber}: ${a.studentAnswer} (confidence: ${a.confidence})\n`
            })
          }
          
          return fileAnalysis
        }
        return `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
      }).join('\n\n---\n\n')
    } else {
      // Fallback to original format
      structuredDataText = files.map((file: any) => 
        `File: ${file.fileName}\nExtracted Text:\n${file.extractedText}`
      ).join('\n\n---\n\n')
    }

    // Format answer key for AI analysis
    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    console.log('Step 4: Sending enhanced analysis request to OpenAI with structured OCR data...')
    
    // Enhanced AI payload with structured OCR data processing instructions
    const aiPayload = {
      model: "gpt-4.1-2025-04-14",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant with enhanced dual skill-based analysis capabilities and structured OCR data processing. You have been provided with:

1. The official answer key for exam "${examData.title}" (ID: ${examId})
2. A comprehensive list of Content-Specific skills linked to this class
3. Subject-Specific skills linked to this class for general mathematical thinking assessment
4. ${hasStructuredData ? 'ENHANCED STRUCTURED OCR DATA with parsed questions, answers, and metadata' : 'Standard OCR extracted text'}

ENHANCED STRUCTURED OCR PROCESSING:
${hasStructuredData ? `
- Use the structured question and answer data when available
- Pay attention to confidence levels and processing notes
- Cross-reference detected answers with parsed questions
- If OCR data appears incomplete or unclear, use your best judgment to infer the intended content
- Prioritize structured data over raw text when both are available
` : `
- Process the raw OCR text to identify questions and answers
- Look for patterns that indicate question numbers, multiple choice options, and student responses
`}

ENHANCED DUAL-SKILL GRADING WORKFLOW:

STEP 1: Grade each question individually
- For multiple choice and true/false: answers must match exactly
- For short answer: look for key concepts, allow reasonable variations
- For essay questions: evaluate based on key points and concepts
- Use structured OCR data to identify student responses more accurately

STEP 2: For EACH QUESTION, identify BOTH skill types it tests:

A) Content-Specific Skills: Match each question to the most relevant Content-Specific skills from the provided list
   - Use the skill descriptions to determine relevance
   - A single question can test multiple Content-Specific skills

B) Subject-Specific Skills: Identify which Subject-Specific skills each question requires:
   ${subjectSkillsText}

STEP 3: Calculate Content-Specific skill scores
- For each Content-Specific skill, calculate the percentage based on:
  - Points earned from questions testing that skill / Total points possible for questions testing that skill
- Only include skills that are actually tested in this exam

STEP 4: Calculate Subject-Specific skill scores
- For each Subject-Specific skill, calculate the percentage based on:
  - Points earned from questions testing that skill / Total points possible for questions testing that skill
- Only include skills that are actually tested in this exam

Content-Specific Skills Available:
${contentSkillsText}

Subject-Specific Skills Available:
${subjectSkillsText}

Return your response in this JSON format:
{
  "overall_score": 85.5,
  "total_points_earned": 17,
  "total_points_possible": 20,
  "grade": "85.5% (B+)",
  "feedback": "brief summary feedback for the student",
  "detailed_analysis": "detailed question-by-question breakdown with scores, explanations, and which BOTH Content-Specific AND Subject-Specific skills each question tested. Include notes about OCR clarity and any inferred content.",
  "question_skill_mapping": [
    {
      "question_number": 1,
      "points_earned": 2,
      "points_possible": 2,
      "content_skills": ["Factoring Polynomials"],
      "subject_skills": ["Problem Solving", "Mathematical Reasoning"]
    }
  ],
  "content_skill_scores": [
    {"skill_name": "Factoring Polynomials", "score": 90.0, "points_earned": 9, "points_possible": 10},
    {"skill_name": "Solving Systems of Equations", "score": 80.0, "points_earned": 8, "points_possible": 10}
  ],
  "subject_skill_scores": [
    {"skill_name": "Problem Solving", "score": 85.0, "points_earned": 17, "points_possible": 20},
    {"skill_name": "Mathematical Reasoning", "score": 90.0, "points_earned": 18, "points_possible": 20}
  ]
}

CRITICAL REQUIREMENTS:
- Every question MUST be mapped to at least one Content-Specific skill AND at least one Subject-Specific skill
- Include the question_skill_mapping array showing exactly which skills each question tests
- Calculate skill scores ONLY from questions that actually test those specific skills
- Be explicit in your detailed_analysis about which skills (both types) each question tests
- Ensure both Content-Specific and Subject-Specific skill scores accurately reflect performance on questions testing those specific skills
- When OCR data is unclear or incomplete, note this in your analysis and do your best to infer the intended content`
        },
        {
          role: "user",
          content: `Please analyze this student's test responses for "${examData.title}" (Exam ID: ${examId}) using the enhanced dual skill-based grading workflow with structured OCR data processing.

OFFICIAL ANSWER KEY:
${answerKeyText}

${hasStructuredData ? 'ENHANCED STRUCTURED OCR DATA:' : 'STUDENT\'S RESPONSES (OCR-extracted):'}
${structuredDataText}

CONTENT-SPECIFIC SKILLS TO EVALUATE:
${contentSkillsText}

SUBJECT-SPECIFIC SKILLS TO EVALUATE:
${subjectSkillsText}

Please provide a detailed grade report with accurate dual skill-based scoring that matches each question to the appropriate Content-Specific AND Subject-Specific skills. Include the question_skill_mapping array showing exactly which skills each question tests. ${hasStructuredData ? 'Use the structured OCR data to more accurately identify questions and student responses.' : 'Parse the OCR text to identify questions and answers as clearly as possible.'}`
        }
      ],
      max_tokens: 5000,
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
    console.log('OpenAI enhanced structured analysis completed')
    const analysisText = result.choices[0]?.message?.content || "No analysis received"
    
    // Try to parse as JSON, fallback to plain text
    let parsedAnalysis
    try {
      parsedAnalysis = JSON.parse(analysisText)
      console.log('Successfully parsed AI analysis with:')
      console.log('- Content-Specific skill scores:', parsedAnalysis.content_skill_scores?.length || 0)
      console.log('- Subject-Specific skill scores:', parsedAnalysis.subject_skill_scores?.length || 0)
      console.log('- Question skill mappings:', parsedAnalysis.question_skill_mapping?.length || 0)
    } catch {
      parsedAnalysis = {
        overall_score: 0,
        total_points_earned: 0,
        total_points_possible: examData.total_points || 0,
        grade: "Analysis failed",
        feedback: "Unable to parse analysis results",
        detailed_analysis: analysisText,
        question_skill_mapping: [],
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

    // Save content skill scores (based on actual question analysis)
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

    // Save subject skill scores (now based on actual question analysis from database)
    if (parsedAnalysis.subject_skill_scores && parsedAnalysis.subject_skill_scores.length > 0) {
      console.log('Saving', parsedAnalysis.subject_skill_scores.length, 'Subject-Specific skill scores')
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

    console.log('Enhanced structured test result and skill scores saved successfully')

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
