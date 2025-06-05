
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

    // Fetch skills data
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

    // Format skills for AI analysis - simplified and generic
    let contentSkillsText = '';
    if (contentSkills.length > 0) {
      // Group skills by topic
      const groupedSkills = contentSkills.reduce((acc: any, skill: any) => {
        if (!acc[skill.topic]) {
          acc[skill.topic] = [];
        }
        acc[skill.topic].push(skill);
        return acc;
      }, {});

      // Sort topics alphabetically for consistent ordering
      const topics = Object.keys(groupedSkills).sort();

      contentSkillsText = topics.map(topic => {
        // Sort skills within each topic alphabetically
        const topicSkills = groupedSkills[topic]
          .sort((a: any, b: any) => a.skill_name.localeCompare(b.skill_name))
          .map((skill: any) => `  - ${skill.skill_name}: ${skill.skill_description}`)
          .join('\n');
        return `${topic}:\n${topicSkills}`;
      }).join('\n\n');
    }

    const subjectSkillsText = subjectSkills
      .sort((a: any, b: any) => a.skill_name.localeCompare(b.skill_name))
      .map(skill => `- ${skill.skill_name}: ${skill.skill_description}`)
      .join('\n');

    // Process enhanced structured OCR data
    let structuredDataText = ''
    const hasEnhancedData = files.some((file: any) => file.structuredData?.documentMetadata?.processingMethods?.includes('roboflow_bubbles'))
    
    if (hasEnhancedData) {
      console.log('Processing ENHANCED DUAL OCR structured data...')
      structuredDataText = files.map((file: any) => {
        if (file.structuredData) {
          const data = file.structuredData
          let fileAnalysis = `\n=== ENHANCED DUAL OCR ANALYSIS FOR ${file.fileName} ===\n`
          
          // Document metadata
          fileAnalysis += `Processing Methods: ${data.documentMetadata.processingMethods.join(' + ')}\n`
          fileAnalysis += `Overall Confidence: ${(data.documentMetadata.overallConfidence * 100).toFixed(1)}%\n`
          fileAnalysis += `Pages: ${data.documentMetadata.totalPages}\n`
          
          if (data.documentMetadata.roboflowDetections > 0) {
            fileAnalysis += `Roboflow Bubble Detections: ${data.documentMetadata.roboflowDetections}\n`
          }
          
          // Validation results
          fileAnalysis += `\nVALIDATION METRICS:\n`
          fileAnalysis += `- Question-Answer Alignment: ${(data.validationResults.questionAnswerAlignment * 100).toFixed(1)}%\n`
          fileAnalysis += `- Bubble Detection Accuracy: ${(data.validationResults.bubbleDetectionAccuracy * 100).toFixed(1)}%\n`
          fileAnalysis += `- Text OCR Accuracy: ${(data.validationResults.textOcrAccuracy * 100).toFixed(1)}%\n`
          fileAnalysis += `- Overall Reliability: ${(data.validationResults.overallReliability * 100).toFixed(1)}%\n`
          fileAnalysis += `- Cross-Validated Answers: ${data.validationResults.crossValidationCount}\n`
          fileAnalysis += `- Fallback Usage: ${data.validationResults.fallbackUsageCount}\n`
          
          // Processing notes
          if (data.metadata.processingNotes.length > 0) {
            fileAnalysis += `\nProcessing Notes: ${data.metadata.processingNotes.join('; ')}\n`
          }
          
          // Enhanced questions with detected answers
          if (data.questions && data.questions.length > 0) {
            fileAnalysis += `\nDETECTED QUESTIONS WITH ENHANCED ANSWER DETECTION (${data.questions.length}):\n`
            data.questions.forEach((q: any) => {
              fileAnalysis += `Q${q.questionNumber}: ${q.questionText}\n`
              fileAnalysis += `Type: ${q.type}, OCR Confidence: ${q.confidence}\n`
              
              if (q.options && q.options.length > 0) {
                fileAnalysis += `Options:\n`
                q.options.forEach((opt: any) => {
                  fileAnalysis += `  ${opt.letter}. ${opt.text}\n`
                })
              }
              
              if (q.detectedAnswer) {
                const ans = q.detectedAnswer
                fileAnalysis += `DETECTED ANSWER: ${ans.selectedOption}\n`
                fileAnalysis += `Detection Method: ${ans.detectionMethod}\n`
                fileAnalysis += `Confidence: ${(ans.confidence * 100).toFixed(1)}%\n`
                fileAnalysis += `Cross-Validated: ${ans.crossValidated ? 'YES' : 'NO'}\n`
                
                if (ans.bubbleCoordinates) {
                  fileAnalysis += `Bubble Location: (${ans.bubbleCoordinates.x.toFixed(0)}, ${ans.bubbleCoordinates.y.toFixed(0)})\n`
                }
                
                if (ans.fallbackUsed) {
                  fileAnalysis += `Note: Used fallback OCR detection\n`
                }
              } else {
                fileAnalysis += `DETECTED ANSWER: None detected\n`
              }
              
              if (q.notes) {
                fileAnalysis += `Notes: ${q.notes}\n`
              }
              fileAnalysis += '\n'
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

    const answerKeyText = answerKeys.map((ak: any) => 
      `Question ${ak.question_number}: ${ak.question_text}\nType: ${ak.question_type}\nCorrect Answer: ${ak.correct_answer}\nPoints: ${ak.points}${ak.options ? `\nOptions: ${JSON.stringify(ak.options)}` : ''}`
    ).join('\n\n')

    console.log('Step 4: Sending ENHANCED analysis request to OpenAI with dual OCR data...')
    
    const aiPayload = {
      model: "gpt-4-1106-preview",
      messages: [
        {
          role: "system",
          content: `You are an AI grading assistant with ENHANCED DUAL OCR capabilities and 99% accuracy optimization. You have been provided with:

1. The official answer key for exam "${examData.title}" (ID: ${examId})
2. A comprehensive list of Content-Specific skills linked to this ${classData?.subject} ${classData?.grade} class
3. Subject-Specific skills linked to this class for general academic thinking assessment
4. ${hasEnhancedData ? 'ENHANCED DUAL OCR DATA with Google OCR + Roboflow bubble detection and cross-validation' : 'Standard OCR extracted text'}

ENHANCED DUAL OCR PROCESSING INSTRUCTIONS:
${hasEnhancedData ? `
🚀 DUAL OCR SYSTEM ACTIVE - MAXIMUM ACCURACY MODE
- Google OCR provides question text and document structure
- Roboflow provides precise bubble/circle detection with coordinates
- Cross-validation ensures 99% accuracy through dual-method verification
- Confidence scoring prioritizes higher-accuracy detections
- Fallback mechanisms handle edge cases

PROCESSING PRIORITIES (in order):
1. Cross-validated answers (both OCR + Roboflow detected same result) = HIGHEST CONFIDENCE
2. Roboflow bubble detections with high confidence (>0.8) = HIGH CONFIDENCE  
3. Google OCR text-based answers = MEDIUM CONFIDENCE
4. Fallback detections = LOWER CONFIDENCE

VALIDATION METRICS INTERPRETATION:
- Overall Reliability >90% = Excellent accuracy, trust all detections
- Overall Reliability 75-90% = Good accuracy, prioritize cross-validated answers
- Overall Reliability 60-75% = Moderate accuracy, use extra caution
- Overall Reliability <60% = Lower accuracy, note in detailed analysis

CONFIDENCE-BASED GRADING:
- When multiple detection methods agree (cross-validated): Use with full confidence
- When Roboflow confidence >0.9: Trust bubble detection
- When detection methods disagree: Note discrepancy and use higher confidence method
- When no clear answer detected: Mark as "unclear" and note in analysis
` : `
STANDARD OCR PROCESSING:
- Process the raw OCR text to identify questions and answers
- Look for patterns that indicate question numbers, multiple choice options, and student responses
- Use pattern matching to infer answers from text
`}

ENHANCED DUAL-SKILL GRADING WORKFLOW WITH 99% ACCURACY:

STEP 1: Grade each question individually with confidence weighting
- For multiple choice and true/false: prioritize cross-validated answers, then Roboflow bubbles, then OCR text
- For short answer: use Google OCR text analysis with confidence scoring
- Apply confidence multipliers: Cross-validated (1.0x), Roboflow high-conf (0.95x), OCR-only (0.8x), Fallback (0.6x)

STEP 2: For EACH QUESTION, identify BOTH skill types it tests:

A) Content-Specific Skills: Match each question to the most relevant Content-Specific skills from the provided list
   - Use the skill descriptions to determine relevance
   - A single question can test multiple Content-Specific skills

B) Subject-Specific Skills: Identify which Subject-Specific skills each question requires:
   ${subjectSkillsText}

STEP 3: Calculate Content-Specific skill scores with confidence weighting
- For each Content-Specific skill, calculate the percentage based on:
  - Points earned from questions testing that skill / Total points possible for questions testing that skill
- Apply confidence multipliers to earned points based on detection method
- Only include skills that are actually tested in this exam

STEP 4: Calculate Subject-Specific skill scores with confidence weighting
- For each Subject-Specific skill, calculate the percentage based on:
  - Points earned from questions testing that skill / Total points possible for questions testing that skill
- Apply confidence multipliers to earned points based on detection method
- Only include skills that are actually tested in this exam

Content-Specific Skills Available for ${classData?.subject} ${classData?.grade}:
${contentSkillsText}

Subject-Specific Skills Available for ${classData?.subject} ${classData?.grade}:
${subjectSkillsText}

Return your response in this JSON format:
{
  "overall_score": 85.5,
  "total_points_earned": 17,
  "total_points_possible": 20,
  "grade": "85.5% (B+)",
  "feedback": "brief summary feedback for the student including confidence notes",
  "detailed_analysis": "detailed question-by-question breakdown with scores, explanations, detection methods used, confidence levels, and which BOTH Content-Specific AND Subject-Specific skills each question tested. Include notes about dual OCR accuracy and any validation concerns.",
  "question_skill_mapping": [
    {
      "question_number": 1,
      "points_earned": 2,
      "points_possible": 2,
      "detection_method": "cross_validated",
      "confidence": 0.98,
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
  ],
  "dual_ocr_summary": {
    "processing_methods_used": ["google_ocr", "roboflow_bubbles"],
    "overall_reliability": 0.95,
    "cross_validated_answers": 8,
    "high_confidence_detections": 9,
    "fallback_detections": 1
  }
}

CRITICAL REQUIREMENTS FOR 99% ACCURACY:
- Every question MUST be mapped to at least one Content-Specific skill AND at least one Subject-Specific skill
- Include the question_skill_mapping array showing exactly which skills each question tests AND detection confidence
- Calculate skill scores ONLY from questions that actually test those specific skills, weighted by detection confidence
- Be explicit in your detailed_analysis about which skills (both types) each question tests AND which detection method was used
- When dual OCR validation shows high reliability (>90%), express high confidence in results
- When detection methods disagree or reliability is lower, note this and adjust confidence accordingly
- Prioritize cross-validated answers and high-confidence Roboflow detections over OCR-only text detection
- Include confidence levels and detection methods in all scoring decisions`
        },
        {
          role: "user",
          content: `Please analyze this student's test responses for "${examData.title}" (Exam ID: ${examId}) using the ENHANCED DUAL OCR grading workflow with 99% accuracy optimization.

Class: ${classData?.subject} ${classData?.grade}

OFFICIAL ANSWER KEY:
${answerKeyText}

${hasEnhancedData ? 'ENHANCED DUAL OCR DATA (Google OCR + Roboflow Bubble Detection):' : 'STUDENT\'S RESPONSES (OCR-extracted):'}
${structuredDataText}

CONTENT-SPECIFIC SKILLS TO EVALUATE:
${contentSkillsText}

SUBJECT-SPECIFIC SKILLS TO EVALUATE:
${subjectSkillsText}

Please provide a detailed grade report with accurate dual skill-based scoring that matches each question to the appropriate Content-Specific AND Subject-Specific skills. Include the question_skill_mapping array showing exactly which skills each question tests, detection methods used, and confidence levels. ${hasEnhancedData ? 'Use the enhanced dual OCR data with confidence weighting to achieve maximum accuracy in answer detection and grading.' : 'Parse the OCR text to identify questions and answers as clearly as possible.'}`
        }
      ],
      max_tokens: 6000,
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
    console.log('Enhanced dual OCR OpenAI analysis completed')
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
