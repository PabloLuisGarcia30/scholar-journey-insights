
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
    
    // Support both single question and batch processing
    const isBatchMode = requestBody.batchMode || Array.isArray(requestBody.questions);
    
    if (isBatchMode) {
      return await processBatchQuestions(requestBody, openAIApiKey);
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

async function processBatchQuestions(requestBody: any, openAIApiKey: string) {
  const { questions, batchPrompt, examId, rubric } = requestBody;
  
  if (!questions || !Array.isArray(questions)) {
    return new Response(
      JSON.stringify({ error: 'Invalid batch request: questions array required' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  const enhancedPrompt = batchPrompt || createEnhancedBatchPrompt(questions, rubric);

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
              content: enhancedPrompt
            }
          ],
          temperature: 0.3,
          max_tokens: 2000,
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
      throw new Error('Invalid JSON response from OpenAI');
    }

    // Validate and sanitize batch results
    const sanitizedResults = validateAndSanitizeBatchResults(gradingResults, questions);

    console.log(`✅ Batch grading completed: ${questions.length} questions processed`);

    return new Response(
      JSON.stringify({
        success: true,
        results: sanitizedResults.results || sanitizedResults,
        usage: result.usage,
        batchSize: questions.length,
        processingTime: Date.now()
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Batch processing failed:', error);
    
    // Fallback: Create basic results for each question
    const fallbackResults = questions.map((q: any, index: number) => ({
      questionNumber: q.questionNumber || index + 1,
      isCorrect: false,
      pointsEarned: 0,
      confidence: 0.3,
      reasoning: `Batch processing failed: ${error.message}. Manual review required.`,
      complexityScore: 0.5,
      reasoningDepth: 'medium'
    }));

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        results: fallbackResults,
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
  
  return `Grade ${questionCount} test questions with detailed analysis. Provide accurate scoring and reasoning for each.

REQUIRED OUTPUT FORMAT (JSON object):
{
  "results": [
    {
      "questionNumber": 1,
      "isCorrect": true,
      "pointsEarned": 2,
      "confidence": 0.95,
      "reasoning": "Detailed explanation of grading decision",
      "complexityScore": 0.6,
      "reasoningDepth": "medium"
    }
  ]
}

${rubric ? `GRADING RUBRIC:\n${rubric}\n` : ''}

QUESTIONS TO GRADE:
${questions.map((q, index) => {
  return `Q${q.questionNumber || index + 1}: ${q.questionText || 'Question text not available'}
Student Answer: "${q.studentAnswer || 'No answer detected'}"
Correct Answer: "${q.correctAnswer || 'Not specified'}"
Points Possible: ${q.pointsPossible || 1}
${q.skillContext ? `Skills: ${q.skillContext}` : ''}
---`;
}).join('\n')}

GRADING INSTRUCTIONS:
- Provide accurate and fair grading for each question
- Award full points for completely correct answers
- Consider partial credit for partially correct responses
- Analyze the complexity and reasoning depth of each question
- Provide confidence scores based on answer clarity
- Give detailed but concise reasoning for each grading decision

Respond with ONLY the JSON object containing results for all ${questionCount} questions.`;
}

function createSingleQuestionPrompt(requestBody: any): string {
  const { questionText, studentAnswer, correctAnswer, pointsPossible, questionNumber, studentName, skillContext } = requestBody;
  
  return `You are an expert grading assistant for complex questions. Analyze the student's answer and provide detailed feedback.

Question: ${questionText}
Correct Answer: ${correctAnswer}
Student Answer: ${studentAnswer}
Points Possible: ${pointsPossible}
Student: ${studentName}
Skills Context: ${skillContext}

Please evaluate this answer and respond with a JSON object containing:
{
  "isCorrect": boolean,
  "pointsEarned": number (0 to ${pointsPossible}),
  "confidence": number (0.0 to 1.0),
  "reasoning": string (detailed explanation of grading decision),
  "complexityScore": number (0.0 to 1.0, how complex this question is),
  "reasoningDepth": string ("shallow", "medium", or "deep")
}

Consider partial credit for partially correct answers. Be thorough in your reasoning.`;
}

function validateAndSanitizeBatchResults(results: any, questions: any[]): any {
  if (!results || !results.results) {
    // If results is an array directly, wrap it
    if (Array.isArray(results)) {
      results = { results };
    } else {
      throw new Error('Invalid results format from OpenAI');
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
      reasoning: String(result.reasoning || 'Batch processing result'),
      complexityScore: Math.max(0, Math.min(1, Number(result.complexityScore) || 0.5)),
      reasoningDepth: ['shallow', 'medium', 'deep'].includes(result.reasoningDepth) 
        ? result.reasoningDepth 
        : 'medium'
    };
  });

  return { results: sanitizedResults };
}
