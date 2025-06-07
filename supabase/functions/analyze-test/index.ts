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
    console.log(`🔬 Analyzing test with Student ID grouping for exam: ${examId}`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Initialize Supabase client for answer key validation
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const supabase = createClient(supabaseUrl!, supabaseKey!);

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

      // Enhanced batch processing with Student ID context
      const batchResults = await processBatchWithStudentIdContext(
        groupQuestions,
        detectedStudentId,
        detectedExam,
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
      studentName: studentName || primaryStudentId, // Fallback for compatibility
      studentId: primaryStudentId,
      examId: examId || extractExamIdFromResults(allResults),
      answerKeyValidation,
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
        answerKeyValidationEnabled: true
      }
    };

    console.log(`✅ Analysis complete with Student ID grouping: ${allResults.length} questions, ${overallScore}% overall score`);
    console.log(`🆔 Student ID detection rate: ${studentIdDetectionRate}%`);
    console.log(`📋 Answer key validation: ${answerKeyValidation.status.toUpperCase()}`);
    
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
        overallScore: 0
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

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

async function processBatchWithStudentIdContext(
  questions: any[],
  studentId: string,
  examId: string,
  apiKey: string
): Promise<any[]> {
  console.log(`🔄 Processing batch: ${questions.length} questions for Student ID: ${studentId}`);
  
  const BATCH_SIZE = 5;
  const batches = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }
  
  const results = [];
  
  for (const batch of batches) {
    try {
      // Create context-aware prompt with Student ID and exam information
      const prompt = createBatchPromptWithStudentIdContext(batch, studentId, examId);
      
      // Try GPT-4o-mini first for cost efficiency
      let batchResults = await callOpenAI('gpt-4o-mini', prompt, apiKey);
      
      // Validate and process results
      for (let i = 0; i < batch.length; i++) {
        const result = batchResults[i];
        const question = batch[i];
        
        if (!result || result.error || result.score === undefined) {
          console.log(`🔄 Retrying question ${question.questionNumber} with GPT-4.1`);
          
          // Fallback to GPT-4.1 for individual question
          const retryPrompt = createIndividualPromptWithStudentIdContext(question, studentId, examId);
          const fallbackResults = await callOpenAI('gpt-4.1-2025-04-14', retryPrompt, apiKey);
          
          results.push(fallbackResults[0] || {
            question_number: question.questionNumber,
            score: 0,
            feedback: 'Unable to grade this question',
            error: true,
            fallback_used: true,
            student_id: studentId,
            exam_id: examId
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
          exam_id: examId
        });
      }
    }
  }
  
  return results;
}

function createBatchPromptWithStudentIdContext(questions: any[], studentId: string, examId: string): string {
  const context = `
Grading test for Student ID: ${studentId}
Exam ID: ${examId}
Number of questions: ${questions.length}

Please grade the following questions and return a JSON array with exactly ${questions.length} objects.
Each object should have: question_number, score (0-100), and feedback.

Questions:
${questions.map(q => `
Question ${q.questionNumber}: ${q.questionText || 'Question text not available'}
Student Answer: ${q.detectedAnswer?.selectedOption || 'No answer detected'}
Answer Confidence: ${q.detectedAnswer?.confidence || 0}
`).join('\n')}

Return ONLY a valid JSON array, no additional text.`;

  return context;
}

function createIndividualPromptWithStudentIdContext(question: any, studentId: string, examId: string): string {
  return `
Grading individual question for Student ID: ${studentId}
Exam ID: ${examId}

Question ${question.questionNumber}: ${question.questionText || 'Question text not available'}
Student Answer: ${question.detectedAnswer?.selectedOption || 'No answer detected'}
Answer Confidence: ${question.detectedAnswer?.confidence || 0}

Please provide a grade (0-100) and feedback. Return as JSON array with one object containing: question_number, score, feedback.
`;
}

async function callOpenAI(model: string, prompt: string, apiKey: string): Promise<any[]> {
  const payload = {
    model,
    messages: [
      {
        role: "system",
        content: "You are an expert test grader. Always return valid JSON arrays with the exact number of objects requested. Each object must have question_number, score (0-100), and feedback."
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
