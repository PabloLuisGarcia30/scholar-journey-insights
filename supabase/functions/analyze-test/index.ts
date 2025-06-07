import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-detail-level'
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { files, examId, studentName, studentEmail } = await req.json();
    console.log(`🔬 Analyzing test with enhanced skill matching for exam: ${examId}`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client for database operations
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

    // 🆕 GET CLASS AND SKILL INFORMATION
    const classInfo = await getClassInfoForExam(supabase, examId);
    const classSkills = await getClassSkills(supabase, classInfo?.classId);

    console.log(`📚 Found class: ${classInfo?.className || 'Unknown'} (${classInfo?.subject || 'Unknown Subject'})`);
    console.log(`🎯 Available skills: ${classSkills.contentSkills.length} content + ${classSkills.subjectSkills.length} subject skills`);

    // Group files by Student ID and Exam ID for batch processing
    const studentGroups = groupFilesByStudentIdAndExam(files);
    console.log(`📊 Created ${studentGroups.size} Student ID-Exam groups`);

    const allResults = [];
    const batchMetrics = {
      totalBatches: 0,
      studentsProcessed: 0,
      questionsProcessed: 0,
      studentIdsDetected: 0,
      batchProcessingUsed: studentGroups.size > 1,
      processingStartTime: Date.now()
    };

    // Process each Student ID-Exam group
    for (const [groupKey, groupFiles] of studentGroups) {
      const [detectedStudentId, detectedExam] = groupKey.split('|');
      console.log(`🎯 Processing group: Student ID ${detectedStudentId} - Exam ${detectedExam}`);
      
      if (detectedStudentId !== 'Unknown_Student') {
        batchMetrics.studentIdsDetected++;
      }
      
      const groupQuestions = extractQuestionsFromFiles(groupFiles);
      
      if (groupQuestions.length === 0) {
        console.log(`⚠️ No questions found in group: ${groupKey}`);
        continue;
      }

      // 🆕 Enhanced batch processing with skill matching
      const batchResults = await processBatchWithSkillMatching(
        groupQuestions,
        detectedStudentId,
        detectedExam,
        classSkills,
        openaiApiKey
      );

      allResults.push(...batchResults);
      
      batchMetrics.totalBatches++;
      batchMetrics.studentsProcessed++;
      batchMetrics.questionsProcessed += groupQuestions.length;
    }

    // Perform Answer Key Validation with Student ID
    console.log('🔍 Starting answer key validation with Student ID grouping...');
    const primaryStudentId = extractStudentIdFromResults(allResults);
    const answerKeyValidation = await validateWithAnswerKey(supabase, allResults, examId, primaryStudentId);

    // Calculate scores and generate analysis
    const overallScore = calculateOverallScore(allResults);
    const detailedAnalysis = generateDetailedAnalysis(allResults, primaryStudentId);
    
    // 🆕 CREATE OR FIND STUDENT PROFILE
    const studentProfile = await createOrFindStudentProfile(supabase, primaryStudentId, studentName, studentEmail);
    console.log(`👤 Student profile resolved: ${studentProfile.id} (${studentProfile.student_name})`);

    // 🆕 SAVE TEST RESULTS TO DATABASE WITH SKILL SCORES
    const testResultId = await saveTestResultsToDatabase(
      supabase,
      studentProfile.id,
      examId,
      classInfo?.classId,
      allResults,
      overallScore,
      detailedAnalysis,
      classSkills
    );

    const processingTime = Date.now() - batchMetrics.processingStartTime;
    const studentIdDetectionRate = batchMetrics.studentsProcessed > 0 ? 
      Math.round((batchMetrics.studentIdsDetected / batchMetrics.studentsProcessed) * 100) : 0;
    
    const response = {
      success: true,
      results: allResults,
      overallScore,
      totalQuestions: batchMetrics.questionsProcessed,
      correctAnswers: allResults.filter(r => r.score >= 80).length,
      detailedAnalysis,
      studentName: studentName || primaryStudentId,
      studentId: primaryStudentId,
      examId: examId || extractExamIdFromResults(allResults),
      answerKeyValidation,
      // 🆕 DATABASE PERSISTENCE INFO
      databaseStorage: {
        testResultId,
        studentProfileId: studentProfile.id,
        classId: classInfo?.classId,
        savedToDatabase: true,
        questionsStored: allResults.length,
        timestamp: new Date().toISOString()
      },
      // 🆕 ENHANCED CLASS AND SKILL INFO
      classInfo: {
        className: classInfo?.className,
        subject: classInfo?.subject,
        grade: classInfo?.grade,
        skillsMatched: {
          contentSkills: classSkills.contentSkills.length,
          subjectSkills: classSkills.subjectSkills.length
        }
      },
      batchProcessingSummary: batchMetrics.batchProcessingUsed ? {
        enabled: true,
        totalBatches: batchMetrics.totalBatches,
        studentsProcessed: batchMetrics.studentsProcessed,
        questionsProcessed: batchMetrics.questionsProcessed,
        studentIdsDetected: batchMetrics.studentIdsDetected,
        studentIdDetectionRate,
        processingTimeMs: processingTime,
        avgQuestionsPerBatch: Math.round(batchMetrics.questionsProcessed / batchMetrics.totalBatches)
      } : null,
      processingMetrics: {
        totalProcessingTime: processingTime,
        studentIdDetectionEnabled: true,
        studentIdDetectionRate,
        aiOptimizationEnabled: true,
        batchProcessingUsed: batchMetrics.batchProcessingUsed,
        studentIdGroupingUsed: studentGroups.size > 1,
        answerKeyValidationEnabled: true,
        databasePersistenceEnabled: true,
        skillMatchingEnabled: true
      }
    };

    console.log(`✅ Analysis complete with skill matching: ${allResults.length} questions, ${overallScore}% overall score`);
    console.log(`💾 Results saved to database with test result ID: ${testResultId}`);
    console.log(`🆔 Student ID detection rate: ${studentIdDetectionRate}%`);
    console.log(`📋 Answer key validation: ${answerKeyValidation.status.toUpperCase()}`);
    console.log(`🎯 Skills matched: ${classSkills.contentSkills.length + classSkills.subjectSkills.length} total`);
    
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200
    });

  } catch (error) {
    console.error('❌ Test analysis failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results: [],
        overallScore: 0,
        databaseStorage: {
          savedToDatabase: false,
          error: error.message
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

// 🆕 NEW FUNCTION: Get class information for exam
async function getClassInfoForExam(supabase: any, examId: string) {
  console.log(`🔍 Looking for class info for exam: ${examId}`);
  
  const { data: exam, error } = await supabase
    .from('exams')
    .select(`
      class_id,
      class_name,
      active_classes (
        name,
        subject,
        grade
      )
    `)
    .eq('exam_id', examId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error finding exam class:', error);
    return null;
  }

  if (exam && exam.class_id) {
    console.log(`✅ Found class info: ${exam.active_classes?.name || exam.class_name}`);
    return {
      classId: exam.class_id,
      className: exam.active_classes?.name || exam.class_name,
      subject: exam.active_classes?.subject || 'Unknown',
      grade: exam.active_classes?.grade || 'Unknown'
    };
  }

  console.log(`⚠️ No class info found for exam: ${examId}`);
  return null;
}

// 🆕 NEW FUNCTION: Get class skills
async function getClassSkills(supabase: any, classId: string | null) {
  if (!classId) {
    console.log('⚠️ No class ID provided, returning empty skills');
    return { contentSkills: [], subjectSkills: [] };
  }

  console.log(`🎯 Fetching skills for class: ${classId}`);

  // Get content skills linked to this class
  const { data: contentSkillsData, error: contentError } = await supabase
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
    .eq('class_id', classId);

  if (contentError) {
    console.error('Error fetching content skills:', contentError);
  }

  // Get subject skills linked to this class
  const { data: subjectSkillsData, error: subjectError } = await supabase
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
    .eq('class_id', classId);

  if (subjectError) {
    console.error('Error fetching subject skills:', subjectError);
  }

  const contentSkills = contentSkillsData?.map(item => item.content_skills).filter(Boolean) || [];
  const subjectSkills = subjectSkillsData?.map(item => item.subject_skills).filter(Boolean) || [];

  console.log(`📊 Found ${contentSkills.length} content skills and ${subjectSkills.length} subject skills`);
  
  return { contentSkills, subjectSkills };
}

// 🆕 ENHANCED FUNCTION: Process batch with skill matching
async function processBatchWithSkillMatching(
  questions: any[],
  studentId: string,
  examId: string,
  classSkills: any,
  apiKey: string
): Promise<any[]> {
  console.log(`🔄 Processing batch with skill matching: ${questions.length} questions for Student ID: ${studentId}`);
  
  const BATCH_SIZE = 5;
  const batches = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }
  
  const results = [];
  
  for (const batch of batches) {
    try {
      // Create skill-aware prompt
      const prompt = createSkillMatchingPrompt(batch, studentId, examId, classSkills);
      
      // Try GPT-4o-mini first for cost efficiency
      let batchResults = await callOpenAI('gpt-4o-mini', prompt, apiKey);
      
      // Validate and process results
      for (let i = 0; i < batch.length; i++) {
        const result = batchResults[i];
        const question = batch[i];
        
        if (!result || result.error || result.score === undefined) {
          console.log(`🔄 Retrying question ${question.questionNumber} with GPT-4.1`);
          
          // Fallback to GPT-4.1 for individual question
          const retryPrompt = createIndividualSkillMatchingPrompt(question, studentId, examId, classSkills);
          const fallbackResults = await callOpenAI('gpt-4.1-2025-04-14', retryPrompt, apiKey);
          
          results.push(fallbackResults[0] || {
            question_number: question.questionNumber,
            score: 0,
            feedback: 'Unable to grade this question',
            error: true,
            fallback_used: true,
            student_id: studentId,
            exam_id: examId,
            matched_skills: { content: [], subject: [] }
          });
        } else {
          results.push({
            ...result,
            student_id: studentId,
            exam_id: examId,
            source_file: question.sourceFile,
            batch_processed: true
          });
        }
      }
    } catch (error) {
      console.error(`❌ Batch processing failed:`, error);
      
      // Process individually as emergency fallback
      for (const question of batch) {
        results.push({
          question_number: question.questionNumber,
          score: 0,
          feedback: `Processing error: ${error.message}`,
          error: true,
          emergency_fallback: true,
          student_id: studentId,
          exam_id: examId,
          matched_skills: { content: [], subject: [] }
        });
      }
    }
  }
  
  return results;
}

// 🆕 NEW FUNCTION: Create skill matching prompt
function createSkillMatchingPrompt(questions: any[], studentId: string, examId: string, classSkills: any): string {
  const contentSkillsList = classSkills.contentSkills.map(skill => 
    `• ${skill.skill_name}: ${skill.skill_description} (Topic: ${skill.topic})`
  ).join('\n');
  
  const subjectSkillsList = classSkills.subjectSkills.map(skill => 
    `• ${skill.skill_name}: ${skill.skill_description}`
  ).join('\n');

  const context = `
Grading test for Student ID: ${studentId}
Exam ID: ${examId}
Number of questions: ${questions.length}

AVAILABLE CLASS CONTENT SKILLS:
${contentSkillsList || 'No content skills available'}

AVAILABLE CLASS SUBJECT SKILLS:
${subjectSkillsList || 'No subject skills available'}

Please grade the following questions and match them to the available skills above.
Return a JSON array with exactly ${questions.length} objects.
Each object should have: 
- question_number (number)
- score (0-100)
- feedback (string)
- matched_skills (object with content and subject arrays containing skill names that apply)

Questions:
${questions.map(q => `
Question ${q.questionNumber}: ${q.questionText || 'Question text not available'}
Student Answer: ${q.detectedAnswer?.selectedOption || 'No answer detected'}
Answer Confidence: ${q.detectedAnswer?.confidence || 0}
`).join('\n')}

Return ONLY a valid JSON array, no additional text.`;

  return context;
}

// 🆕 NEW FUNCTION: Create individual skill matching prompt
function createIndividualSkillMatchingPrompt(question: any, studentId: string, examId: string, classSkills: any): string {
  const contentSkillsList = classSkills.contentSkills.map(skill => 
    `• ${skill.skill_name}: ${skill.skill_description} (Topic: ${skill.topic})`
  ).join('\n');
  
  const subjectSkillsList = classSkills.subjectSkills.map(skill => 
    `• ${skill.skill_name}: ${skill.skill_description}`
  ).join('\n');

  return `
Grading individual question for Student ID: ${studentId}
Exam ID: ${examId}

AVAILABLE CLASS CONTENT SKILLS:
${contentSkillsList || 'No content skills available'}

AVAILABLE CLASS SUBJECT SKILLS:
${subjectSkillsList || 'No subject skills available'}

Question ${question.questionNumber}: ${question.questionText || 'Question text not available'}
Student Answer: ${question.detectedAnswer?.selectedOption || 'No answer detected'}
Answer Confidence: ${question.detectedAnswer?.confidence || 0}

Please provide a grade (0-100), feedback, and match to available skills. 
Return as JSON array with one object containing: question_number, score, feedback, matched_skills (object with content and subject arrays).
`;
}

// 🆕 ENHANCED FUNCTION: Save test results with skill scores
async function saveTestResultsToDatabase(
  supabase: any,
  studentProfileId: string,
  examId: string,
  classId: string | null,
  results: any[],
  overallScore: number,
  detailedAnalysis: string,
  classSkills: any
) {
  console.log(`💾 Saving test results with skill matching to database for student: ${studentProfileId}`);

  // Calculate totals
  const totalPointsEarned = results.reduce((sum, result) => sum + (result.score || 0), 0);
  const totalPointsPossible = results.length * 100; // Assuming 100 points per question

  // Insert test result
  const { data: testResult, error: resultError } = await supabase
    .from('test_results')
    .insert({
      student_id: studentProfileId,
      exam_id: examId,
      class_id: classId,
      overall_score: overallScore,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      ai_feedback: generateAiFeedback(results, overallScore),
      detailed_analysis: detailedAnalysis
    })
    .select()
    .single();

  if (resultError) {
    console.error('Error saving test result:', resultError);
    throw new Error(`Failed to save test result: ${resultError.message}`);
  }

  console.log(`✅ Test result saved with ID: ${testResult.id}`);

  // 🆕 SAVE SKILL SCORES BASED ON MATCHED SKILLS
  await saveMatchedSkillScores(supabase, testResult.id, results, classSkills);

  return testResult.id;
}

// 🆕 NEW FUNCTION: Save matched skill scores
async function saveMatchedSkillScores(supabase: any, testResultId: string, results: any[], classSkills: any) {
  console.log(`🎯 Saving matched skill scores for test result: ${testResultId}`);

  // Aggregate scores by skill
  const contentSkillScores = new Map();
  const subjectSkillScores = new Map();

  results.forEach(result => {
    if (result.matched_skills) {
      // Process content skills
      if (result.matched_skills.content) {
        result.matched_skills.content.forEach((skillName: string) => {
          if (!contentSkillScores.has(skillName)) {
            contentSkillScores.set(skillName, { total: 0, count: 0, points: 0 });
          }
          const skill = contentSkillScores.get(skillName);
          skill.total += result.score || 0;
          skill.count += 1;
          skill.points += 100; // Each question worth 100 points
        });
      }

      // Process subject skills
      if (result.matched_skills.subject) {
        result.matched_skills.subject.forEach((skillName: string) => {
          if (!subjectSkillScores.has(skillName)) {
            subjectSkillScores.set(skillName, { total: 0, count: 0, points: 0 });
          }
          const skill = subjectSkillScores.get(skillName);
          skill.total += result.score || 0;
          skill.count += 1;
          skill.points += 100; // Each question worth 100 points
        });
      }
    }
  });

  // Save content skill scores
  const contentScoresToSave = [];
  contentSkillScores.forEach((data, skillName) => {
    const avgScore = data.count > 0 ? data.total / data.count : 0;
    contentScoresToSave.push({
      test_result_id: testResultId,
      skill_name: skillName,
      score: Math.round(avgScore),
      points_earned: data.total,
      points_possible: data.points
    });
  });

  if (contentScoresToSave.length > 0) {
    const { error } = await supabase
      .from('content_skill_scores')
      .insert(contentScoresToSave);

    if (error) {
      console.error('Error saving content skill scores:', error);
    } else {
      console.log(`✅ Saved ${contentScoresToSave.length} content skill scores`);
    }
  }

  // Save subject skill scores
  const subjectScoresToSave = [];
  subjectSkillScores.forEach((data, skillName) => {
    const avgScore = data.count > 0 ? data.total / data.count : 0;
    subjectScoresToSave.push({
      test_result_id: testResultId,
      skill_name: skillName,
      score: Math.round(avgScore),
      points_earned: data.total,
      points_possible: data.points
    });
  });

  if (subjectScoresToSave.length > 0) {
    const { error } = await supabase
      .from('subject_skill_scores')
      .insert(subjectScoresToSave);

    if (error) {
      console.error('Error saving subject skill scores:', error);
    } else {
      console.log(`✅ Saved ${subjectScoresToSave.length} subject skill scores`);
    }
  }
}

async function createOrFindStudentProfile(supabase: any, studentId: string, studentName?: string, studentEmail?: string) {
  console.log(`🔍 Looking for student profile: ${studentId}`);
  
  // First try to find by student_id
  let { data: existingProfile, error } = await supabase
    .from('student_profiles')
    .select('*')
    .eq('student_id', studentId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') {
    console.error('Error searching for student profile:', error);
    throw new Error(`Failed to search for student profile: ${error.message}`);
  }

  if (existingProfile) {
    console.log(`✅ Found existing student profile: ${existingProfile.id}`);
    return existingProfile;
  }

  // If not found by student_id, try by name if provided
  if (studentName) {
    const { data: nameProfile, error: nameError } = await supabase
      .from('student_profiles')
      .select('*')
      .eq('student_name', studentName)
      .maybeSingle();

    if (!nameError && nameProfile) {
      // Update with student_id if found by name
      console.log(`🔄 Updating existing profile with Student ID: ${studentId}`);
      const { data: updatedProfile, error: updateError } = await supabase
        .from('student_profiles')
        .update({ student_id: studentId })
        .eq('id', nameProfile.id)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating student profile:', updateError);
        throw new Error(`Failed to update student profile: ${updateError.message}`);
      }

      return updatedProfile;
    }
  }

  // Create new student profile
  console.log(`➕ Creating new student profile for: ${studentId}`);
  const { data: newProfile, error: createError } = await supabase
    .from('student_profiles')
    .insert({
      student_id: studentId,
      student_name: studentName || `Student ${studentId}`,
      email: studentEmail
    })
    .select()
    .single();

  if (createError) {
    console.error('Error creating student profile:', createError);
    throw new Error(`Failed to create student profile: ${createError.message}`);
  }

  console.log(`✅ Created new student profile: ${newProfile.id}`);
  return newProfile;
}

async function validateWithAnswerKey(supabase: any, results: any[], examId: string, studentId?: string) {
  console.log(`🔬 Validating results against answer key for exam: ${examId}, student: ${studentId || 'Unknown'}`);
  
  try {
    // Get expected question count from answer key
    const { data: answerKeyData, error } = await supabase
      .from('answer_keys')
      .select('question_number')
      .eq('exam_id', examId);

    if (error) {
      console.error('❌ Error fetching answer key:', error);
      return {
        status: 'no_answer_key',
        expectedQuestions: 0,
        actualQuestions: results.length,
        completionPercentage: 0,
        isComplete: false,
        error: error.message
      };
    }

    const expectedQuestions = answerKeyData?.length || 0;
    const actualQuestions = results.length;
    
    if (expectedQuestions === 0) {
      console.log('⚠️ No answer key found for validation');
      return {
        status: 'no_answer_key',
        expectedQuestions: 0,
        actualQuestions,
        completionPercentage: 0,
        isComplete: false,
        message: 'No answer key found for this exam'
      };
    }

    const completionPercentage = Math.round((actualQuestions / expectedQuestions) * 100);
    const isComplete = actualQuestions === expectedQuestions;
    
    let status = 'incomplete';
    if (isComplete) {
      status = 'complete';
    } else if (actualQuestions > 0 && completionPercentage >= 80) {
      status = 'partial';
    }

    // Find missing questions if incomplete
    let missingQuestions = [];
    if (!isComplete && expectedQuestions > 0) {
      const processedQuestions = new Set(
        results.map(r => r.question_number).filter(q => q != null)
      );
      for (let i = 1; i <= expectedQuestions; i++) {
        if (!processedQuestions.has(i)) {
          missingQuestions.push(i);
        }
      }
    }

    const validation = {
      status,
      expectedQuestions,
      actualQuestions,
      completionPercentage,
      isComplete,
      studentId,
      missingQuestions: missingQuestions.length > 0 ? missingQuestions : undefined,
      message: generateValidationMessage(status, actualQuestions, expectedQuestions, missingQuestions, studentId)
    };

    console.log(`📊 Answer key validation for ${studentId}: ${status} (${actualQuestions}/${expectedQuestions} questions)`);
    if (missingQuestions.length > 0) {
      console.log(`❓ Missing questions: ${missingQuestions.join(', ')}`);
    }

    return validation;
  } catch (error) {
    console.error('❌ Answer key validation failed:', error);
    return {
      status: 'validation_error',
      expectedQuestions: 0,
      actualQuestions: results.length,
      completionPercentage: 0,
      isComplete: false,
      studentId,
      error: error.message
    };
  }
}

function generateValidationMessage(status: string, actual: number, expected: number, missing: number[], studentId?: string): string {
  const studentInfo = studentId ? ` for Student ID: ${studentId}` : '';
  
  switch (status) {
    case 'complete':
      return `✅ Complete${studentInfo}: All ${expected} questions processed successfully`;
    case 'partial':
      return `⚠️ Partial${studentInfo}: ${actual}/${expected} questions processed (${Math.round((actual/expected)*100)}%)`;
    case 'incomplete':
      const missingText = missing.length > 0 ? ` Missing: ${missing.join(', ')}` : '';
      return `❌ Incomplete${studentInfo}: ${actual}/${expected} questions processed.${missingText}`;
    default:
      return `Status${studentInfo}: ${status}`;
  }
}

function groupFilesByStudentIdAndExam(files: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const file of files) {
    // Use Student ID as primary grouping key instead of student name
    const detectedStudentId = file.structuredData?.detectedStudentId || 
                              file.structuredData?.studentId || 
                              'Unknown_Student';
    const detectedExam = file.structuredData?.examId || 'Unknown_Exam';
    const groupKey = `${detectedStudentId}|${detectedExam}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    
    groups.get(groupKey)!.push(file);
  }
  
  console.log(`📋 Student ID-Exam groups created:`, Array.from(groups.keys()));
  return groups;
}

function extractQuestionsFromFiles(files: any[]): any[] {
  const allQuestions: any[] = [];
  
  for (const file of files) {
    if (file.structuredData?.questions) {
      for (const question of file.structuredData.questions) {
        allQuestions.push({
          ...question,
          sourceFile: file.fileName,
          detectedStudentId: file.structuredData.detectedStudentId,
          examId: file.structuredData.examId
        });
      }
    }
    
    if (file.structuredData?.questionGroups) {
      for (const group of file.structuredData.questionGroups) {
        if (group.selectedAnswer) {
          allQuestions.push({
            questionNumber: group.questionNumber,
            questionText: `Question ${group.questionNumber}`,
            detectedAnswer: {
              selectedOption: group.selectedAnswer.optionLetter,
              confidence: group.selectedAnswer.confidence
            },
            sourceFile: file.fileName,
            detectedStudentId: file.structuredData.detectedStudentId,
            examId: file.structuredData.examId
          });
        }
      }
    }
  }

  return allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
}

async function callOpenAI(model: string, prompt: string, apiKey: string): Promise<any[]> {
  const payload = {
    model,
    messages: [
      {
        role: "system",
        content: "You are an expert test grader with skill matching capabilities. Always return valid JSON arrays with the exact number of objects requested. Each object must have question_number, score (0-100), feedback, and matched_skills (object with content and subject arrays)."
      },
      {
        role: "user",
        content: prompt
      }
    ],
    temperature: 0.2,
    max_tokens: model === 'gpt-4.1-2025-04-14' ? 2000 : 1000
  };

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error('No response content from OpenAI');
  }

  try {
    const results = JSON.parse(content);
    return Array.isArray(results) ? results : [results];
  } catch (parseError) {
    console.error('JSON parse error:', parseError);
    console.error('Raw content:', content);
    throw new Error('Invalid JSON response from OpenAI');
  }
}

function calculateOverallScore(results: any[]): number {
  if (results.length === 0) return 0;
  
  const totalScore = results.reduce((sum, result) => sum + (result.score || 0), 0);
  return Math.round(totalScore / results.length);
}

function generateDetailedAnalysis(results: any[], studentId: string): string {
  const totalQuestions = results.length;
  const correctAnswers = results.filter(r => r.score >= 80).length;
  const overallScore = calculateOverallScore(results);
  
  const strengths = results
    .filter(r => r.score >= 80)
    .map(r => `Question ${r.question_number}`)
    .slice(0, 3);
    
  const improvements = results
    .filter(r => r.score < 60)
    .map(r => `Question ${r.question_number}: ${r.feedback}`)
    .slice(0, 3);

  let analysis = `Test Analysis for Student ID: ${studentId}\n\n`;
  analysis += `Overall Performance: ${overallScore}% (${correctAnswers}/${totalQuestions} questions correct)\n\n`;
  
  if (strengths.length > 0) {
    analysis += `Strong Performance: ${strengths.join(', ')}\n\n`;
  }
  
  if (improvements.length > 0) {
    analysis += `Areas for Improvement:\n${improvements.map(imp => `• ${imp}`).join('\n')}\n\n`;
  }
  
  // Add batch processing insights
  const batchProcessed = results.filter(r => r.batch_processed).length;
  if (batchProcessed > 0) {
    analysis += `Processing Notes: ${batchProcessed} questions processed using efficient batch analysis.\n`;
  }
  
  return analysis;
}

function extractStudentIdFromResults(results: any[]): string {
  for (const result of results) {
    if (result.student_id && result.student_id !== 'Unknown_Student') {
      return result.student_id;
    }
  }
  return 'Unknown Student';
}

function extractExamIdFromResults(results: any[]): string {
  for (const result of results) {
    if (result.exam_id && result.exam_id !== 'Unknown_Exam') {
      return result.exam_id;
    }
  }
  return 'Unknown Exam';
}

function generateAiFeedback(results: any[], overallScore: number): string {
  const correctAnswers = results.filter(r => r.score >= 80).length;
  const totalQuestions = results.length;
  
  let feedback = `Performance Summary: ${correctAnswers}/${totalQuestions} questions correct (${overallScore}%).\n\n`;
  
  if (overallScore >= 90) {
    feedback += "Excellent work! You demonstrated strong understanding across all areas.";
  } else if (overallScore >= 80) {
    feedback += "Good performance overall. Review the questions you missed to strengthen your understanding.";
  } else if (overallScore >= 70) {
    feedback += "Adequate performance. Focus on practicing similar problems to improve your skills.";
  } else {
    feedback += "Additional practice recommended. Consider reviewing the fundamental concepts covered in this test.";
  }

  // Add specific question feedback
  const incorrectQuestions = results.filter(r => r.score < 80).slice(0, 3);
  if (incorrectQuestions.length > 0) {
    feedback += "\n\nAreas for improvement:\n";
    incorrectQuestions.forEach(q => {
      feedback += `• Question ${q.question_number}: ${q.feedback || 'Review this concept'}\n`;
    });
  }

  return feedback;
}
