
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
    console.log(`🔬 Analyzing test for student: ${studentName}, exam: ${examId}`);

    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    // Group files by student name and exam ID for batch processing
    const studentGroups = groupFilesByStudentAndExam(files);
    console.log(`📊 Created ${studentGroups.size} student-exam groups`);

    const allResults = [];
    const batchMetrics = {
      totalBatches: 0,
      studentsProcessed: 0,
      questionsProcessed: 0,
      batchProcessingUsed: studentGroups.size > 1,
      processingStartTime: Date.now()
    };

    // Process each student-exam group
    for (const [groupKey, groupFiles] of studentGroups) {
      const [detectedStudent, detectedExam] = groupKey.split('|');
      console.log(`🎯 Processing group: ${detectedStudent} - ${detectedExam}`);
      
      const groupQuestions = extractQuestionsFromFiles(groupFiles);
      
      if (groupQuestions.length === 0) {
        console.log(`⚠️ No questions found in group: ${groupKey}`);
        continue;
      }

      // Enhanced batch processing with student context
      const batchResults = await processBatchWithStudentContext(
        groupQuestions,
        detectedStudent,
        detectedExam,
        openaiApiKey
      );

      allResults.push(...batchResults);
      
      batchMetrics.totalBatches++;
      batchMetrics.studentsProcessed++;
      batchMetrics.questionsProcessed += groupQuestions.length;
    }

    // Calculate scores and generate analysis
    const overallScore = calculateOverallScore(allResults);
    const detailedAnalysis = generateDetailedAnalysis(allResults, studentName || 'Unknown Student');
    
    const processingTime = Date.now() - batchMetrics.processingStartTime;
    
    const response = {
      success: true,
      results: allResults,
      overallScore,
      totalQuestions: batchMetrics.questionsProcessed,
      correctAnswers: allResults.filter(r => r.score >= 80).length,
      detailedAnalysis,
      studentName: studentName || extractStudentNameFromResults(allResults),
      examId: examId || extractExamIdFromResults(allResults),
      batchProcessingSummary: batchMetrics.batchProcessingUsed ? {
        enabled: true,
        totalBatches: batchMetrics.totalBatches,
        studentsProcessed: batchMetrics.studentsProcessed,
        questionsProcessed: batchMetrics.questionsProcessed,
        processingTimeMs: processingTime,
        avgQuestionsPerBatch: Math.round(batchMetrics.questionsProcessed / batchMetrics.totalBatches)
      } : null,
      processingMetrics: {
        totalProcessingTime: processingTime,
        aiOptimizationEnabled: true,
        batchProcessingUsed: batchMetrics.batchProcessingUsed,
        studentGroupingUsed: studentGroups.size > 1
      }
    };

    console.log(`✅ Analysis complete: ${allResults.length} questions, ${overallScore}% overall score`);
    
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

function groupFilesByStudentAndExam(files: any[]): Map<string, any[]> {
  const groups = new Map<string, any[]>();
  
  for (const file of files) {
    const detectedStudent = file.structuredData?.detectedStudentName || 'Unknown_Student';
    const detectedExam = file.structuredData?.examId || 'Unknown_Exam';
    const groupKey = `${detectedStudent}|${detectedExam}`;
    
    if (!groups.has(groupKey)) {
      groups.set(groupKey, []);
    }
    
    groups.get(groupKey)!.push(file);
  }
  
  console.log(`📋 Student-Exam groups created:`, Array.from(groups.keys()));
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
          detectedStudentName: file.structuredData.detectedStudentName,
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
            detectedStudentName: file.structuredData.detectedStudentName,
            examId: file.structuredData.examId
          });
        }
      }
    }
  }

  return allQuestions.sort((a, b) => a.questionNumber - b.questionNumber);
}

async function processBatchWithStudentContext(
  questions: any[],
  studentName: string,
  examId: string,
  apiKey: string
): Promise<any[]> {
  console.log(`🔄 Processing batch: ${questions.length} questions for ${studentName}`);
  
  const BATCH_SIZE = 5; // Optimal batch size for OpenAI
  const batches = [];
  
  for (let i = 0; i < questions.length; i += BATCH_SIZE) {
    batches.push(questions.slice(i, i + BATCH_SIZE));
  }
  
  const results = [];
  
  for (const batch of batches) {
    try {
      // Create context-aware prompt with student and exam information
      const prompt = createBatchPromptWithContext(batch, studentName, examId);
      
      // Try GPT-4o-mini first for cost efficiency
      let batchResults = await callOpenAI('gpt-4o-mini', prompt, apiKey);
      
      // Validate and process results
      for (let i = 0; i < batch.length; i++) {
        const result = batchResults[i];
        const question = batch[i];
        
        if (!result || result.error || result.score === undefined) {
          console.log(`🔄 Retrying question ${question.questionNumber} with GPT-4.1`);
          
          // Fallback to GPT-4.1 for individual question
          const retryPrompt = createIndividualPromptWithContext(question, studentName, examId);
          const fallbackResults = await callOpenAI('gpt-4.1-2025-04-14', retryPrompt, apiKey);
          
          results.push(fallbackResults[0] || {
            question_number: question.questionNumber,
            score: 0,
            feedback: 'Unable to grade this question',
            error: true,
            fallback_used: true,
            student_name: studentName,
            exam_id: examId
          });
        } else {
          results.push({
            ...result,
            student_name: studentName,
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
          student_name: studentName,
          exam_id: examId
        });
      }
    }
  }
  
  return results;
}

function createBatchPromptWithContext(questions: any[], studentName: string, examId: string): string {
  const context = `
Grading test for: ${studentName}
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

function createIndividualPromptWithContext(question: any, studentName: string, examId: string): string {
  return `
Grading individual question for: ${studentName}
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

function generateDetailedAnalysis(results: any[], studentName: string): string {
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

  let analysis = `Test Analysis for ${studentName}\n\n`;
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

function extractStudentNameFromResults(results: any[]): string {
  for (const result of results) {
    if (result.student_name && result.student_name !== 'Unknown_Student') {
      return result.student_name;
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
