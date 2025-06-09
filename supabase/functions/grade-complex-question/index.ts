
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Circuit breaker implementation
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';
  private readonly failureThreshold = 5;
  private readonly recoveryTimeoutMs = 60000; // 1 minute

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log('Circuit breaker moving to HALF_OPEN state');
      } else {
        throw new Error('Circuit breaker is OPEN - service temporarily unavailable');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log('Circuit breaker opened due to failures');
    }
  }
}

const circuitBreaker = new CircuitBreaker();

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openAIApiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestBody = await req.json();
    
    // Support enhanced batch processing, skill escalation, and single question processing
    if (requestBody.escalationMode) {
      return await processSkillEscalation(requestBody, openAIApiKey);
    } else if (requestBody.batchMode || Array.isArray(requestBody.questions)) {
      return await processEnhancedBatchQuestions(requestBody, openAIApiKey);
    } else {
      return await processSingleQuestion(requestBody, openAIApiKey);
    }

  } catch (error) {
    console.error('Error in grade-complex-question:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function processEnhancedBatchQuestions(requestBody: any, openAIApiKey: string) {
  const { questions, enhancedBatchPrompt, examId, rubric } = requestBody;
  
  if (!questions || !Array.isArray(questions)) {
    return new Response(
      JSON.stringify({ error: 'Invalid batch request: questions array required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  // Use enhanced prompt if provided, otherwise fall back to standard batch prompt
  const finalPrompt = enhancedBatchPrompt || createEnhancedBatchPrompt(questions, rubric);
  const questionDelimiter = '---END QUESTION---';

  console.log(`🎯 Processing enhanced batch: ${questions.length} questions with cross-question leakage prevention`);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational grading assistant. Process each question independently and avoid cross-question contamination. Always respond with valid JSON matching the requested format.'
            },
            {
              role: 'user',
              content: finalPrompt
            }
          ],
          temperature: 0.2, // Lower temperature for more consistent batch processing
          max_tokens: 3000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error(`OpenAI API request failed: ${response.status}`);
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response content from OpenAI');
    }

    let gradingResults;
    try {
      gradingResults = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      // Attempt delimiter-based parsing as fallback
      gradingResults = parseWithDelimiters(content, questionDelimiter, questions.length);
    }

    // Validate and sanitize enhanced batch results
    const sanitizedResults = validateAndSanitizeEnhancedBatchResults(gradingResults, questions);

    console.log(`✅ Enhanced batch grading completed: ${questions.length} questions processed with leakage prevention`);

    return new Response(
      JSON.stringify({
        success: true,
        results: sanitizedResults.results || sanitizedResults,
        usage: result.usage,
        batchSize: questions.length,
        processingTime: Date.now(),
        enhancedProcessing: true,
        crossQuestionLeakagePrevention: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Enhanced batch processing failed:', error);
    
    // Fallback: Create basic results for each question
    const fallbackResults = questions.map((q: any, index: number) => ({
      questionNumber: q.questionNumber || index + 1,
      isCorrect: false,
      pointsEarned: 0,
      confidence: 0.3,
      reasoning: `Enhanced batch processing failed: ${error.message}. Manual review required.`,
      complexityScore: 0.5,
      reasoningDepth: 'medium',
      matchedSkills: [],
      skillConfidence: 0.3
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results: fallbackResults,
        fallbackUsed: true,
        enhancedProcessing: false
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processSkillEscalation(requestBody: any, openAIApiKey: string) {
  const {
    questionNumber,
    questionText,
    studentAnswer,
    availableSkills,
    escalationPrompt,
    model = 'gpt-4.1-2025-04-14'
  } = requestBody;

  console.log(`🎯 Processing skill escalation for Q${questionNumber} using ${model}`);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational assessment specialist. Resolve skill matching ambiguity with precision and confidence.'
            },
            {
              role: 'user',
              content: escalationPrompt
            }
          ],
          temperature: 0.1, // Very low temperature for consistent skill resolution
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Skill escalation API error:', errorText);
        throw new Error(`Skill escalation failed: ${response.status}`);
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from skill escalation');
    }

    let skillResult;
    try {
      skillResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse skill escalation response:', content);
      throw new Error('Invalid skill escalation response format');
    }

    // Validate escalated skills
    const validatedResult = {
      matchedSkills: Array.isArray(skillResult.matchedSkills) 
        ? skillResult.matchedSkills.filter((skill: string) => availableSkills.includes(skill)).slice(0, 2)
        : [availableSkills[0] || 'General'],
      confidence: Math.max(0, Math.min(1, Number(skillResult.confidence) || 0.8)),
      reasoning: String(skillResult.reasoning || 'Skill escalation completed'),
      primarySkill: skillResult.primarySkill || skillResult.matchedSkills?.[0] || 'General'
    };

    console.log(`✅ Skill escalation completed for Q${questionNumber}: ${validatedResult.matchedSkills.join(', ')}`);

    return new Response(
      JSON.stringify({
        success: true,
        skillEscalation: validatedResult,
        usage: result.usage,
        model,
        escalated: true
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Skill escalation processing failed:', error);
    
    // Fallback skill assignment
    const fallbackResult = {
      matchedSkills: [availableSkills[0] || 'General'],
      confidence: 0.6,
      reasoning: `Skill escalation failed: ${error.message}. Using fallback assignment.`,
      primarySkill: availableSkills[0] || 'General'
    };

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        skillEscalation: fallbackResult,
        fallbackUsed: true
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

async function processSingleQuestion(requestBody: any, openAIApiKey: string) {
  const {
    questionText,
    studentAnswer,
    correctAnswer,
    pointsPossible,
    questionNumber,
    studentName,
    skillContext
  } = requestBody;

  if (!questionText || !studentAnswer || !correctAnswer) {
    return new Response(
      JSON.stringify({ error: 'Missing required fields: questionText, studentAnswer, correctAnswer' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const prompt = createSingleQuestionPrompt(requestBody);

  try {
    const result = await circuitBreaker.execute(async () => {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: 'You are an expert educational grading assistant. Always respond with valid JSON matching the requested format.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.3,
          max_tokens: 1000,
          response_format: { type: "json_object" }
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('OpenAI API error:', errorText);
        throw new Error('OpenAI API request failed');
      }

      return await response.json();
    });

    const content = result.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('No response from OpenAI');
    }

    let gradingResult;
    try {
      gradingResult = JSON.parse(content);
    } catch (parseError) {
      console.error('Failed to parse OpenAI response:', content);
      throw new Error('Invalid response format from OpenAI');
    }

    // Validate and sanitize the response
    const sanitizedResult = {
      isCorrect: Boolean(gradingResult.isCorrect),
      pointsEarned: Math.max(0, Math.min(pointsPossible, Number(gradingResult.pointsEarned) || 0)),
      confidence: Math.max(0, Math.min(1, Number(gradingResult.confidence) || 0.5)),
      reasoning: String(gradingResult.reasoning || 'OpenAI grading completed'),
      complexityScore: Math.max(0, Math.min(1, Number(gradingResult.complexityScore) || 0.5)),
      reasoningDepth: ['shallow', 'medium', 'deep'].includes(gradingResult.reasoningDepth) 
        ? gradingResult.reasoningDepth 
        : 'medium',
      usage: {
        promptTokens: result.usage?.prompt_tokens || 0,
        completionTokens: result.usage?.completion_tokens || 0,
        totalTokens: result.usage?.total_tokens || 0
      }
    };

    console.log(`✅ OpenAI graded Q${questionNumber}: ${sanitizedResult.pointsEarned}/${pointsPossible} points`);

    return new Response(
      JSON.stringify(sanitizedResult),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Single question processing failed:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
}

function createEnhancedBatchPrompt(questions: any[], rubric?: string): string {
  const questionCount = questions.length;
  const delimiter = '---END QUESTION---';
  
  return `Grade ${questionCount} test questions with enhanced cross-question isolation. Process each question INDEPENDENTLY.

CRITICAL PROCESSING RULES:
1. Each question is separated by "${delimiter}"
2. Do NOT let answers from one question influence another
3. Process questions as completely separate tasks
4. Match skills ONLY from the provided list for each question
5. Maintain strict question boundaries

${rubric ? `GRADING RUBRIC:\n${rubric}\n` : ''}

QUESTIONS TO GRADE (PROCESS INDEPENDENTLY):
${questions.map((q, index) => {
  const skillContext = q.skillContext ? `\nAvailable Skills: ${q.skillContext}` : '';
  return `Question ${index + 1} (Q${q.questionNumber || index + 1}):
Question Text: ${q.questionText || 'Question text not available'}
Student Answer: "${q.studentAnswer || 'No answer detected'}"
Correct Answer: "${q.correctAnswer || 'Not specified'}"
Points Possible: ${q.pointsPossible || 1}${skillContext}
Instructions: Match answer strictly to provided skills. Do not infer additional skills.`;
}).join(`\n${delimiter}\n`)}

REQUIRED OUTPUT FORMAT (JSON object with results array):
{
  "results": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 2,
      "confidence": 0.95,
      "reasoning": "Detailed explanation focusing on this question only",
      "complexityScore": 0.6,
      "reasoningDepth": "medium",
      "matchedSkills": ["skill1"],
      "skillConfidence": 0.9
    }
  ]
}

CRITICAL: Return exactly ${questionCount} results. Process each question independently without cross-contamination.`;
}

function parseWithDelimiters(content: string, delimiter: string, expectedCount: number): any {
  const blocks = content.split(delimiter);
  const results = [];

  for (let i = 0; i < Math.min(blocks.length, expectedCount); i++) {
    const block = blocks[i].trim();
    const result = {
      questionNumber: i + 1,
      isCorrect: block.toLowerCase().includes('correct'),
      pointsEarned: block.match(/points?[:\s]*(\d+)/i)?.[1] ? parseInt(block.match(/points?[:\s]*(\d+)/i)[1]) : 0,
      confidence: 0.7,
      reasoning: `Delimiter-based parsing: ${block.substring(0, 100)}...`,
      complexityScore: 0.5,
      reasoningDepth: 'medium',
      matchedSkills: [],
      skillConfidence: 0.5
    };
    results.push(result);
  }

  return { results };
}

function validateAndSanitizeEnhancedBatchResults(results: any, questions: any[]): any {
  if (!results || !results.results) {
    if (Array.isArray(results)) {
      results = { results };
    } else {
      throw new Error('Invalid enhanced results format from OpenAI');
    }
  }

  const sanitizedResults = results.results.map((result: any, index: number) => {
    const question = questions[index];
    const pointsPossible = question?.pointsPossible || 1;
    
    return {
      questionNumber: result.questionNumber || question?.questionNumber || index + 1,
      isCorrect: Boolean(result.isCorrect),
      pointsEarned: Math.max(0, Math.min(pointsPossible, Number(result.pointsEarned) || 0)),
      confidence: Math.max(0, Math.min(1, Number(result.confidence) || 0.5)),
      reasoning: String(result.reasoning || 'Enhanced batch processing result'),
      complexityScore: Math.max(0, Math.min(1, Number(result.complexityScore) || 0.5)),
      reasoningDepth: ['shallow', 'medium', 'deep'].includes(result.reasoningDepth) 
        ? result.reasoningDepth 
        : 'medium',
      matchedSkills: Array.isArray(result.matchedSkills) ? result.matchedSkills : [],
      skillConfidence: Math.max(0, Math.min(1, Number(result.skillConfidence) || 0.7))
    };
  });

  return { results: sanitizedResults };
}

