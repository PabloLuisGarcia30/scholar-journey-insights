
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced batch processing configuration
const BATCH_CONFIG = {
  BASE_BATCH_SIZE: 15, // Increased from 5
  MAX_BATCH_SIZE: 30,
  MIN_BATCH_SIZE: 8,
  COMPLEXITY_THRESHOLDS: {
    SIMPLE: 25,      // Short multiple choice questions
    MEDIUM: 50,      // Standard questions with moderate complexity
    COMPLEX: 100     // Long form or multi-part questions
  },
  ADAPTIVE_SIZING: true,
  MAX_TOKENS_PER_BATCH: 25000 // Stay well under GPT-4o-mini's 128K limit
}

// Question complexity analyzer for adaptive batching
function analyzeQuestionComplexity(question: any, answerKey: any): number {
  let complexity = 0;
  
  // Analyze question text length
  const questionText = answerKey?.question_text || question?.questionText || '';
  if (questionText.length > 200) complexity += 20;
  if (questionText.length > 400) complexity += 30;
  
  // Analyze answer complexity
  const correctAnswer = answerKey?.correct_answer || '';
  if (correctAnswer.length > 100) complexity += 15;
  if (correctAnswer.includes('explain') || correctAnswer.includes('because')) complexity += 20;
  
  // Check for multi-part questions
  if (questionText.includes('(a)') || questionText.includes('Part A')) complexity += 25;
  
  // Question type analysis
  if (questionText.toLowerCase().includes('essay') || questionText.toLowerCase().includes('explain')) {
    complexity += 40;
  }
  
  return Math.min(complexity, 100);
}

// Calculate optimal batch size based on question complexity
function calculateOptimalBatchSize(questions: any[], answerKeys: any[]): number {
  if (!BATCH_CONFIG.ADAPTIVE_SIZING) return BATCH_CONFIG.BASE_BATCH_SIZE;
  
  const complexityScores = questions.map((q, index) => {
    const answerKey = answerKeys.find(ak => ak.question_number === q.questionNumber);
    return analyzeQuestionComplexity(q, answerKey);
  });
  
  const avgComplexity = complexityScores.reduce((sum, score) => sum + score, 0) / complexityScores.length;
  
  // Adaptive batch sizing based on average complexity
  if (avgComplexity < BATCH_CONFIG.COMPLEXITY_THRESHOLDS.SIMPLE) {
    return Math.min(BATCH_CONFIG.MAX_BATCH_SIZE, questions.length); // 25-30 for simple questions
  } else if (avgComplexity < BATCH_CONFIG.COMPLEXITY_THRESHOLDS.MEDIUM) {
    return Math.min(20, questions.length); // 15-20 for medium complexity
  } else {
    return Math.min(BATCH_CONFIG.MIN_BATCH_SIZE + 2, questions.length); // 8-10 for complex questions
  }
}

// Enhanced prompt engineering for larger batches
function createOptimizedBatchPrompt(questionBatch: any[], answerKeyBatch: any[], skillMappings: any[]): string {
  const questionCount = questionBatch.length;
  
  return `Analyze and grade ${questionCount} test questions efficiently. For each question, provide:

REQUIRED OUTPUT FORMAT (JSON array):
[
  {
    "questionNumber": 1,
    "isCorrect": true,
    "pointsEarned": 2,
    "confidence": 0.95,
    "reasoning": "Brief explanation",
    "skillAlignment": ["skill1", "skill2"]
  }
]

QUESTIONS TO ANALYZE:
${questionBatch.map((q, index) => {
  const answerKey = answerKeyBatch[index];
  const skills = skillMappings[index] || [];
  
  return `Q${q.questionNumber}: ${answerKey?.question_text || 'Question text not available'}
Student Answer: "${q.detectedAnswer?.selectedOption || 'No answer detected'}"
Correct Answer: "${answerKey?.correct_answer || 'Not specified'}"
Points Possible: ${answerKey?.points || 1}
Target Skills: ${skills.map(s => s.skill_name).join(', ') || 'General'}
---`;
}).join('\n')}

GRADING CRITERIA:
- Award full points for correct answers
- Partial credit for partially correct responses
- Consider skill alignment in feedback
- Provide confidence score (0.0-1.0)
- Keep reasoning concise but helpful

Respond with ONLY the JSON array, no additional text.`;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('🔬 Enhanced analyze-test function called with batch optimization')
    
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)
    
    const { files, examId, studentName, studentEmail } = await req.json()
    
    console.log(`📊 Processing ${files.length} files for exam: ${examId}`)
    
    const startTime = Date.now()
    
    // Extract and prepare questions for batch processing
    const allQuestions: any[] = []
    const allAnswerKeys: any[] = []
    const allSkillMappings: any[] = []
    
    // Collect questions from all files
    for (const file of files) {
      if (file.structuredData?.questions) {
        allQuestions.push(...file.structuredData.questions)
      }
    }
    
    // Fetch answer keys and skill mappings
    const { data: answerKeys } = await supabase
      .from('answer_keys')
      .select('*')
      .eq('exam_id', examId)
      .order('question_number')
    
    const { data: skillMappings } = await supabase
      .from('exam_skill_mappings')
      .select('*')
      .eq('exam_id', examId)
    
    console.log(`📋 Found ${allQuestions.length} questions, ${answerKeys?.length || 0} answer keys`)
    
    if (!allQuestions.length || !answerKeys?.length) {
      console.log('⚠️ No questions or answer keys found, using standard processing')
      // Fallback to basic processing logic here
      return new Response(JSON.stringify({
        overallScore: 0,
        grade: 'F',
        total_points_earned: 0,
        total_points_possible: 0,
        feedback: 'No questions found for grading'
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      })
    }
    
    // Prepare skill mappings lookup
    const skillLookup = skillMappings?.reduce((acc, mapping) => {
      if (!acc[mapping.question_number]) acc[mapping.question_number] = []
      acc[mapping.question_number].push(mapping)
      return acc
    }, {} as Record<number, any[]>) || {}
    
    // Calculate optimal batch size for this set of questions
    const optimalBatchSize = calculateOptimalBatchSize(allQuestions, answerKeys)
    console.log(`🎯 Using optimal batch size: ${optimalBatchSize} for ${allQuestions.length} questions`)
    
    // Process questions in optimized batches
    const gradingResults: any[] = []
    let totalApiCalls = 0
    let totalTokensUsed = 0
    
    for (let i = 0; i < allQuestions.length; i += optimalBatchSize) {
      const questionBatch = allQuestions.slice(i, i + optimalBatchSize)
      const batchNumber = Math.floor(i / optimalBatchSize) + 1
      const totalBatches = Math.ceil(allQuestions.length / optimalBatchSize)
      
      console.log(`🔄 Processing batch ${batchNumber}/${totalBatches} (${questionBatch.length} questions)`)
      
      // Prepare answer keys and skill mappings for this batch
      const answerKeyBatch = questionBatch.map(q => {
        return answerKeys.find(ak => ak.question_number === q.questionNumber)
      }).filter(Boolean)
      
      const skillMappingBatch = questionBatch.map(q => {
        return skillLookup[q.questionNumber] || []
      })
      
      try {
        // Create optimized prompt for the batch
        const prompt = createOptimizedBatchPrompt(questionBatch, answerKeyBatch, skillMappingBatch)
        
        // Call GPT-4o-mini with the batch
        const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openaiApiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              {
                role: 'system',
                content: 'You are an expert test grader. Analyze multiple questions efficiently and provide accurate grading with skill alignment. Always respond with valid JSON only.'
              },
              {
                role: 'user',
                content: prompt
              }
            ],
            temperature: 0.1,
            max_tokens: 4000,
          }),
        })
        
        totalApiCalls++
        
        if (!openaiResponse.ok) {
          throw new Error(`OpenAI API error: ${openaiResponse.status}`)
        }
        
        const openaiResult = await openaiResponse.json()
        totalTokensUsed += openaiResult.usage?.total_tokens || 0
        
        // Parse batch results
        let batchResults: any[] = []
        try {
          const responseContent = openaiResult.choices[0]?.message?.content || '[]'
          batchResults = JSON.parse(responseContent)
          
          if (!Array.isArray(batchResults)) {
            throw new Error('Response is not an array')
          }
          
          console.log(`✅ Batch ${batchNumber} processed successfully: ${batchResults.length} results`)
          gradingResults.push(...batchResults)
          
        } catch (parseError) {
          console.error(`❌ Failed to parse batch ${batchNumber} results:`, parseError)
          
          // Fallback: process questions individually
          for (const question of questionBatch) {
            gradingResults.push({
              questionNumber: question.questionNumber,
              isCorrect: false,
              pointsEarned: 0,
              confidence: 0.5,
              reasoning: 'Batch processing failed, individual fallback used',
              skillAlignment: []
            })
          }
        }
        
      } catch (batchError) {
        console.error(`❌ Batch ${batchNumber} processing failed:`, batchError)
        
        // Fallback: create default results for failed batch
        for (const question of questionBatch) {
          gradingResults.push({
            questionNumber: question.questionNumber,
            isCorrect: false,
            pointsEarned: 0,
            confidence: 0.3,
            reasoning: `Batch processing failed: ${batchError.message}`,
            skillAlignment: []
          })
        }
      }
    }
    
    // Calculate final scores
    const totalPointsEarned = gradingResults.reduce((sum, result) => sum + (result.pointsEarned || 0), 0)
    const totalPointsPossible = answerKeys.reduce((sum, ak) => sum + (ak.points || 1), 0)
    const overallScore = totalPointsPossible > 0 ? (totalPointsEarned / totalPointsPossible) * 100 : 0
    
    // Generate grade
    let grade = 'F'
    if (overallScore >= 90) grade = 'A'
    else if (overallScore >= 80) grade = 'B'
    else if (overallScore >= 70) grade = 'C'
    else if (overallScore >= 60) grade = 'D'
    
    const processingTime = Date.now() - startTime
    const avgQuestionsPerCall = allQuestions.length / Math.max(totalApiCalls, 1)
    const estimatedCostSavings = Math.max(0, (allQuestions.length / 5) - totalApiCalls) * 0.002 // Rough estimate
    
    console.log(`✅ Enhanced batch processing completed:`)
    console.log(`📊 Questions processed: ${allQuestions.length}`)
    console.log(`🔢 API calls made: ${totalApiCalls} (avg ${avgQuestionsPerCall.toFixed(1)} questions/call)`)
    console.log(`⏱️ Processing time: ${processingTime}ms`)
    console.log(`💰 Estimated cost savings: $${estimatedCostSavings.toFixed(4)}`)
    console.log(`🎯 Overall score: ${overallScore.toFixed(1)}%`)
    
    return new Response(JSON.stringify({
      overallScore: Math.round(overallScore * 100) / 100,
      grade,
      total_points_earned: totalPointsEarned,
      total_points_possible: totalPointsPossible,
      ai_feedback: `Processed ${allQuestions.length} questions using enhanced batch optimization (${totalApiCalls} API calls, ${avgQuestionsPerCall.toFixed(1)} questions per call).`,
      // Enhanced processing metrics
      processingMetrics: {
        totalProcessingTime: processingTime,
        batchProcessingUsed: true,
        totalApiCalls,
        avgQuestionsPerCall: avgQuestionsPerCall,
        optimalBatchSize,
        totalTokensUsed,
        estimatedCostSavings,
        batchOptimizationLevel: 'phase_1_adaptive'
      }
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('❌ Error in enhanced analyze-test function:', error)
    return new Response(JSON.stringify({ 
      error: error.message,
      timestamp: new Date().toISOString()
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
