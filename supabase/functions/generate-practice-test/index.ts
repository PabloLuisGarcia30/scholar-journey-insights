import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface GeneratePracticeTestRequest {
  studentName: string;
  className: string;
  skillName: string;
  grade: string;
  subject: string;
  questionCount?: number;
  classId?: string;
  skillDistribution?: Array<{
    skill_name: string;
    score: number;
    questions: number;
  }>;
  multiSkillSupport?: boolean;
}

interface HistoricalQuestion {
  question_text: string;
  question_type: string;
  options?: any;
  points: number;
  exam_title?: string;
}

// Enhanced skill type detection based on skill name patterns
function detectSkillType(skillName: string, subject: string): 'content' | 'subject' {
  const contentSkillPatterns = [
    // Math content skills
    'algebra', 'geometry', 'calculus', 'trigonometry', 'statistics', 'probability',
    'fractions', 'decimals', 'integers', 'equations', 'functions', 'graphing',
    'polynomials', 'logarithms', 'matrices', 'sequences', 'series',
    
    // Science content skills
    'chemistry', 'physics', 'biology', 'atomic structure', 'periodic table',
    'chemical bonds', 'reactions', 'thermodynamics', 'mechanics', 'waves',
    'electricity', 'magnetism', 'genetics', 'evolution', 'ecology',
    
    // English content skills
    'grammar', 'vocabulary', 'syntax', 'phonics', 'spelling', 'punctuation',
    'literature', 'poetry', 'prose', 'rhetoric', 'composition',
    
    // History content skills
    'ancient history', 'medieval', 'renaissance', 'industrial revolution',
    'world wars', 'cold war', 'civilizations', 'empires'
  ];

  const subjectSkillPatterns = [
    // Cross-subject cognitive skills
    'critical thinking', 'problem solving', 'analytical reasoning', 'logical reasoning',
    'reading comprehension', 'written communication', 'oral communication',
    'research skills', 'data analysis', 'interpretation', 'synthesis',
    'evaluation', 'application', 'comprehension', 'knowledge recall',
    'creative thinking', 'decision making', 'time management', 'organization',
    'collaboration', 'leadership', 'presentation skills', 'study skills'
  ];

  const skillLower = skillName.toLowerCase();
  
  // Check for content skill patterns
  for (const pattern of contentSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'content';
    }
  }
  
  // Check for subject skill patterns
  for (const pattern of subjectSkillPatterns) {
    if (skillLower.includes(pattern)) {
      return 'subject';
    }
  }
  
  // Default classification based on skill name characteristics
  if (skillLower.includes('understanding') || skillLower.includes('knowledge') || 
      skillLower.includes('concepts') || skillLower.includes('principles')) {
    return 'content';
  }
  
  if (skillLower.includes('skills') || skillLower.includes('ability') || 
      skillLower.includes('thinking') || skillLower.includes('reasoning')) {
    return 'subject';
  }
  
  // Final fallback: content skills for specific subjects, subject skills for general
  const specificSubjects = ['math', 'science', 'english', 'history', 'physics', 'chemistry', 'biology'];
  if (specificSubjects.some(subj => subject.toLowerCase().includes(subj))) {
    return 'content';
  }
  
  return 'subject'; // Default to subject skill
}

// Generate skill metadata
function generateSkillMetadata(skillName: string, skillType: 'content' | 'subject', subject: string, grade: string) {
  return {
    skillType,
    skillCategory: skillType === 'content' ? 'domain_specific' : 'cross_curricular',
    subject: subject,
    grade: grade,
    detectedPatterns: skillType === 'content' ? ['subject_specific_content'] : ['cognitive_skill'],
    confidence: 0.8, // High confidence in our classification
    classificationMethod: 'pattern_matching_enhanced'
  };
}

// Retry configuration
const RETRY_CONFIG = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 8000,
  backoffMultiplier: 2
};

function addJitter(delay: number): number {
  return delay + Math.random() * 1000;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function withRetry<T>(
  operation: () => Promise<T>,
  attempt: number = 1
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    console.log(`Attempt ${attempt} failed:`, error.message);
    
    if (attempt >= RETRY_CONFIG.maxAttempts) {
      throw error;
    }

    const isRetryable = error.message.includes('server had an error') || 
                       error.message.includes('rate limit') ||
                       error.message.includes('timeout') ||
                       error.status >= 500;
    
    if (!isRetryable) {
      throw error;
    }

    const baseDelay = Math.min(
      RETRY_CONFIG.baseDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
      RETRY_CONFIG.maxDelay
    );
    const delayWithJitter = addJitter(baseDelay);
    
    console.log(`Retrying in ${delayWithJitter}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
    await sleep(delayWithJitter);
    
    return withRetry(operation, attempt + 1);
  }
}

async function getHistoricalQuestionsForSkill(supabase: any, classId: string, skillName: string): Promise<HistoricalQuestion[]> {
  console.log('Fetching historical questions for class:', classId, 'skill:', skillName);
  
  try {
    const { data: exams, error: examError } = await supabase
      .from('exams')
      .select('exam_id, title')
      .eq('class_id', classId);

    if (examError) {
      console.error('Error fetching class exams:', examError);
      return [];
    }

    if (!exams || exams.length === 0) {
      console.log('No exams found for class:', classId);
      return [];
    }

    const examIds = exams.map((exam: any) => exam.exam_id);
    console.log('Found exams:', examIds);

    const { data: questions, error: questionsError } = await supabase
      .from('answer_keys')
      .select('question_text, question_type, options, points, exam_id')
      .in('exam_id', examIds)
      .limit(10);

    if (questionsError) {
      console.error('Error fetching historical questions:', questionsError);
      return [];
    }

    if (!questions || questions.length === 0) {
      console.log('No historical questions found for exams:', examIds);
      return [];
    }

    const enhancedQuestions = questions.map((q: any) => {
      const exam = exams.find((e: any) => e.exam_id === q.exam_id);
      return {
        ...q,
        exam_title: exam?.title || 'Unknown Exam'
      };
    });

    console.log(`Found ${enhancedQuestions.length} historical questions`);
    return enhancedQuestions;

  } catch (error) {
    console.error('Unexpected error fetching historical questions:', error);
    return [];
  }
}

async function callOpenAIWithRetry(prompt: string, model: string = 'gpt-4o-mini'): Promise<any> {
  const openAIApiKey = Deno.env.get('OPENAI_API_KEY');
  
  if (!openAIApiKey) {
    throw new Error('OpenAI API key not configured');
  }

  return withRetry(async () => {
    console.log(`Sending request to OpenAI ${model} with enhanced prompt including skill metadata`);
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: model,
        messages: [
          {
            role: 'system',
            content: 'You are an expert educational content creator. Generate high-quality practice tests that are engaging, educational, and appropriately challenging for the student\'s level.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    console.log(`OpenAI ${model} response status:`, response.status);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('OpenAI API error response:', JSON.stringify(errorData, null, 2));
      
      const errorMessage = errorData.error?.message || 'Unknown OpenAI API error';
      throw new Error(`OpenAI API error: ${errorMessage}`);
    }

    const data = await response.json();
    console.log(`OpenAI ${model} practice test generation completed successfully`);
    return data;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('Generate-practice-test function called with multi-skill support');
    
    const {
      studentName,
      className,
      skillName,
      grade,
      subject,
      questionCount = 5,
      classId,
      skillDistribution,
      multiSkillSupport = false,
      enhancedAnswerPatterns = false
    }: GeneratePracticeTestRequest & { enhancedAnswerPatterns?: boolean } = await req.json();

    console.log(`Generating practice test for: ${studentName} in class: ${className} skill(s): ${skillName} grade: ${grade} subject: ${subject} questionCount: ${questionCount} classId: ${classId} multiSkill: ${multiSkillSupport}`);

    // Detect if this is a multi-skill request
    const isMultiSkill = multiSkillSupport && skillDistribution && skillDistribution.length > 1;
    
    let skillType: 'content' | 'subject';
    let skillMetadata: any;
    
    if (isMultiSkill) {
      // For multi-skill, detect based on the first skill but note it's multi-skill
      skillType = detectSkillType(skillDistribution[0].skill_name, subject);
      skillMetadata = generateSkillMetadata(`Multi-skill: ${skillDistribution.map(s => s.skill_name).join(', ')}`, skillType, subject, grade);
      skillMetadata.isMultiSkill = true;
      skillMetadata.skillDistribution = skillDistribution;
    } else {
      // Single skill logic (existing)
      skillType = detectSkillType(skillName, subject);
      skillMetadata = generateSkillMetadata(skillName, skillType, subject, grade);
    }
    
    console.log(`Detected skill type: ${skillType} for skill(s): ${isMultiSkill ? 'multi-skill' : skillName}`);
    console.log('Skill metadata:', skillMetadata);

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    let historicalQuestions: HistoricalQuestion[] = [];
    if (classId) {
      historicalQuestions = await getHistoricalQuestionsForSkill(supabase, classId, isMultiSkill ? skillDistribution[0].skill_name : skillName);
    }

    let historicalContext = '';
    if (historicalQuestions.length > 0) {
      historicalContext = `\n\nHere are some example questions from previous exams in this class for context:\n${
        historicalQuestions.slice(0, 3).map((q, i) => 
          `Example ${i + 1}: ${q.question_text} (${q.question_type}, ${q.points} points)`
        ).join('\n')
      }\n\nUse these examples to understand the style and difficulty level expected, but create completely new questions.`;
    }

    // Build the prompt based on whether it's multi-skill or single skill
    let skillFocusSection: string;
    let skillInstructions: string;
    
    if (isMultiSkill && skillDistribution) {
      skillFocusSection = `MULTI-SKILL FOCUS: Generate questions distributed across these skills:
${skillDistribution.map(s => `- ${s.skill_name}: ${s.questions} questions (current score: ${s.score}%)`).join('\n')}`;
      
      skillInstructions = `
MULTI-SKILL REQUIREMENTS:
1. Generate exactly ${questionCount} questions total, distributed as specified above
2. Each question should clearly target one of the specified skills
3. Ensure balanced difficulty across all skills
4. Tag each question with its target skill in the response
5. Maintain coherent flow between different skill areas`;
    } else {
      skillFocusSection = `SKILL FOCUS: ${skillName}`;
      skillInstructions = `
SINGLE-SKILL REQUIREMENTS:
1. All questions must directly test the skill: "${skillName}"
2. Questions should build upon each other logically`;
    }

    const answerPatternInstructions = enhancedAnswerPatterns ? `

ENHANCED SHORT ANSWER REQUIREMENTS:
- For short-answer questions, provide multiple acceptable answer variations
- Include key concepts/keywords that should be present in correct answers
- Consider different ways students might phrase correct responses
- Account for synonyms and alternative terminology

RESPONSE FORMAT - Return valid JSON only with enhanced answer patterns:
{
  "title": "Practice Test Title",
  "description": "Brief description focusing on ${isMultiSkill ? 'multiple skills' : skillName}",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Question text here",
      "targetSkill": "${isMultiSkill ? 'skill name from distribution' : skillName}",
      "options": ["A", "B", "C", "D"] (only for multiple-choice),
      "correctAnswer": "Primary correct answer",
      "acceptableAnswers": ["Alternative answer 1", "Alternative answer 2"] (for short-answer),
      "keywords": ["key1", "key2", "key3"] (important concepts for short-answer),
      "points": 1-3
    }
  ],
  "totalPoints": sum of all question points,
  "estimatedTime": estimated completion time in minutes
}` : `

RESPONSE FORMAT - Return valid JSON only:
{
  "title": "Practice Test Title",
  "description": "Brief description focusing on ${isMultiSkill ? 'multiple skills' : skillName}",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Question text here",
      "targetSkill": "${isMultiSkill ? 'skill name from distribution' : skillName}",
      "options": ["A", "B", "C", "D"] (only for multiple-choice),
      "correctAnswer": "Correct answer",
      "points": 1-3
    }
  ],
  "totalPoints": sum of all question points,
  "estimatedTime": estimated completion time in minutes
}`;

    const prompt = `Create a targeted practice test for a ${grade} ${subject} student named ${studentName}.

${skillFocusSection}
SKILL TYPE: ${skillType} (${skillType === 'content' ? 'subject-specific content knowledge' : 'cross-curricular cognitive skill'})
CLASS: ${className}
NUMBER OF QUESTIONS: ${questionCount}
${historicalContext}

REQUIREMENTS:
${skillInstructions}
3. Questions should be appropriate for ${grade} level
4. Include a mix of question types (multiple-choice, short-answer, true-false)
5. Each question should have clear, educational value
6. Provide detailed but concise correct answers
7. Points should reflect question difficulty (1-3 points each)
8. Include the skill type (${skillType}) and metadata in the response
${answerPatternInstructions}

Generate exactly ${questionCount} questions${isMultiSkill ? ' distributed across the specified skills' : ` focused on "${skillName}"`}.`;

    const data = await callOpenAIWithRetry(prompt);
    
    const content = data.choices[0].message.content;
    console.log('Raw OpenAI response content:', content);

    let practiceTest;
    try {
      console.log('Successfully extracted JSON from GPT-4o-mini response');
      practiceTest = JSON.parse(content);
    } catch (parseError) {
      console.log('Direct JSON parse failed, attempting to extract JSON from response');
      
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*\})\s*```/) || content.match(/(\{[\s\S]*\})/);
      if (jsonMatch) {
        practiceTest = JSON.parse(jsonMatch[1]);
      } else {
        throw new Error('Could not extract valid JSON from OpenAI response');
      }
    }

    if (!practiceTest.questions || !Array.isArray(practiceTest.questions)) {
      throw new Error('Invalid practice test format: missing questions array');
    }

    if (practiceTest.questions.length === 0) {
      throw new Error('No questions generated in practice test');
    }

    // Ensure skill metadata is included
    if (!practiceTest.skillType) {
      practiceTest.skillType = skillType;
    }
    
    if (!practiceTest.skillMetadata) {
      practiceTest.skillMetadata = skillMetadata;
    }

    // Validate and enhance questions
    practiceTest.questions.forEach((q: any, index: number) => {
      if (!q.question || !q.correctAnswer || !q.type) {
        throw new Error(`Question ${index + 1} is missing required fields`);
      }
      if (!q.points) q.points = 1;
      if (!q.id) q.id = `Q${index + 1}`;
      
      // Ensure targetSkill is set for multi-skill questions
      if (isMultiSkill && !q.targetSkill) {
        // Assign to first skill if not specified
        q.targetSkill = skillDistribution[0].skill_name;
      } else if (!isMultiSkill && !q.targetSkill) {
        q.targetSkill = skillName;
      }
      
      if (q.type === 'short-answer' && enhancedAnswerPatterns) {
        if (!q.acceptableAnswers) {
          q.acceptableAnswers = [q.correctAnswer];
        }
        if (!q.keywords) {
          q.keywords = q.correctAnswer.toLowerCase()
            .split(/\s+/)
            .filter((word: string) => word.length > 3)
            .slice(0, 3);
        }
      }
    });

    if (!practiceTest.totalPoints) {
      practiceTest.totalPoints = practiceTest.questions.reduce((sum: number, q: any) => sum + (q.points || 1), 0);
    }

    if (!practiceTest.estimatedTime) {
      practiceTest.estimatedTime = Math.max(10, practiceTest.questions.length * 3);
    }

    console.log(`Successfully parsed and validated practice test with ${practiceTest.questions.length} questions`);
    console.log(`Skill metadata included: type=${practiceTest.skillType}, category=${practiceTest.skillMetadata?.skillCategory}, isMultiSkill=${practiceTest.skillMetadata?.isMultiSkill}`);

    return new Response(JSON.stringify(practiceTest), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error) {
    console.error('Error in generate-practice-test function:', error);
    
    let userFriendlyMessage = 'Failed to generate practice test. Please try again.';
    
    if (error.message.includes('OpenAI API')) {
      userFriendlyMessage = 'OpenAI service is temporarily unavailable. Please try again in a moment.';
    } else if (error.message.includes('JSON')) {
      userFriendlyMessage = 'Generated content format error. Please try again.';
    } else if (error.message.includes('API key')) {
      userFriendlyMessage = 'API configuration error. Please contact support.';
    }

    return new Response(
      JSON.stringify({ 
        error: userFriendlyMessage,
        details: error.message,
        retryable: error.message.includes('server had an error') || error.message.includes('temporarily unavailable')
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
