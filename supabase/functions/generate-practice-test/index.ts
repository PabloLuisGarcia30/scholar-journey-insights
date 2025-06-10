
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

interface ValidatedQuestion {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer: string;
  acceptableAnswers?: string[];
  keywords?: string[];
  points: number;
  targetSkill: string;
  contentSkillId?: string;
}

interface ContentSkill {
  id: string;
  skill_name: string;
  skill_description: string;
  subject: string;
  grade: string;
  topic: string;
}

// Simplified skill classification based on database content
function classifySkillsFromDatabase(
  contentSkills: ContentSkill[],
  requestedSkills: string[]
): { skillType: 'content' | 'subject'; skillMetadata: any } {
  // If we have Content Skills from database and any requested skills match them, it's content-based
  const hasMatchingContentSkills = contentSkills.some(cs => 
    requestedSkills.some(skill => 
      cs.skill_name.toLowerCase().includes(skill.toLowerCase()) ||
      skill.toLowerCase().includes(cs.skill_name.toLowerCase())
    )
  );

  const skillType = hasMatchingContentSkills ? 'content' : 'subject';
  
  const skillMetadata = {
    skillType,
    skillCategory: skillType === 'content' ? 'domain_specific' : 'cross_curricular',
    databaseDriven: true,
    contentSkillsAvailable: contentSkills.length,
    classificationMethod: 'database_matching',
    confidence: hasMatchingContentSkills ? 0.95 : 0.7
  };

  return { skillType, skillMetadata };
}

// NEW: Fetch Content Skills for the class
async function getClassContentSkills(supabase: any, classId: string): Promise<ContentSkill[]> {
  console.log('🔍 Fetching Content Skills for class:', classId);
  
  try {
    const { data: classContentSkills, error } = await supabase
      .from('class_content_skills')
      .select(`
        content_skill_id,
        content_skills (
          id,
          skill_name,
          skill_description,
          subject,
          grade,
          topic
        )
      `)
      .eq('class_id', classId);

    if (error) {
      console.error('❌ Error fetching class content skills:', error);
      return [];
    }

    if (!classContentSkills || classContentSkills.length === 0) {
      console.log('⚠️ No Content Skills found for class:', classId);
      return [];
    }

    const contentSkills = classContentSkills
      .map(item => item.content_skills)
      .filter(skill => skill !== null) as ContentSkill[];

    console.log(`✅ Found ${contentSkills.length} Content Skills for class:`, 
      contentSkills.map(s => s.skill_name));
    
    return contentSkills;

  } catch (error) {
    console.error('💥 Unexpected error fetching Content Skills:', error);
    return [];
  }
}

// NEW: Validate and map skill distribution against actual Content Skills
function validateSkillDistributionAgainstContentSkills(
  skillDistribution: Array<{ skill_name: string; score: number; questions: number }>,
  contentSkills: ContentSkill[],
  totalQuestions: number
): Array<{ skill_name: string; score: number; questions: number; contentSkillId?: string; isValidContentSkill: boolean }> {
  console.log('🔧 Validating skill distribution against Content Skills');
  
  const validatedDistribution = skillDistribution.map(skill => {
    // Find matching Content Skill (case-insensitive)
    const matchingContentSkill = contentSkills.find(cs => 
      cs.skill_name.toLowerCase().trim() === skill.skill_name.toLowerCase().trim()
    );

    if (matchingContentSkill) {
      console.log(`✅ Skill "${skill.skill_name}" matches Content Skill: ${matchingContentSkill.skill_name}`);
      return {
        ...skill,
        skill_name: matchingContentSkill.skill_name, // Use exact Content Skill name
        contentSkillId: matchingContentSkill.id,
        isValidContentSkill: true
      };
    } else {
      console.log(`⚠️ Skill "${skill.skill_name}" does NOT match any Content Skills`);
      return {
        ...skill,
        isValidContentSkill: false
      };
    }
  });

  // Calculate actual total from distribution
  const distributionTotal = validatedDistribution.reduce((sum, skill) => sum + skill.questions, 0);
  
  // Adjust distribution if needed
  if (distributionTotal !== totalQuestions) {
    console.log(`⚠️ Distribution mismatch: ${distributionTotal} vs ${totalQuestions}, adjusting...`);
    
    const difference = totalQuestions - distributionTotal;
    
    if (difference > 0) {
      // Add extra questions to skill with lowest score (needs most practice)
      const lowestScoreSkill = validatedDistribution.reduce((min, skill) => 
        skill.score < min.score ? skill : min
      );
      lowestScoreSkill.questions += difference;
    } else {
      // Remove questions from skill with highest score (needs least practice)
      let remaining = Math.abs(difference);
      const sortedByScore = [...validatedDistribution].sort((a, b) => b.score - a.score);
      
      for (const skill of sortedByScore) {
        if (remaining <= 0) break;
        const canRemove = Math.min(remaining, skill.questions - 1); // Keep at least 1 question
        skill.questions -= canRemove;
        remaining -= canRemove;
      }
    }
  }

  console.log('✅ Validated skill distribution:', validatedDistribution);
  return validatedDistribution;
}

// Enhanced question validator and repairer with Content Skills integration
function validateAndRepairQuestion(question: any, index: number, targetSkill: string, contentSkillId?: string): ValidatedQuestion {
  console.log(`🔧 Validating question ${index + 1}:`, question);

  const repairs = [];

  // Repair missing or invalid ID
  if (!question.id || typeof question.id !== 'string') {
    question.id = `Q${index + 1}`;
    repairs.push('id');
  }

  // Repair missing or invalid type
  const validTypes = ['multiple-choice', 'true-false', 'short-answer', 'essay'];
  if (!question.type || !validTypes.includes(question.type)) {
    question.type = 'multiple-choice'; // Default to multiple choice
    repairs.push('type');
  }

  // Repair missing question text
  if (!question.question || typeof question.question !== 'string' || question.question.trim().length === 0) {
    question.question = `Practice question ${index + 1} for ${targetSkill}`;
    repairs.push('question');
  }

  // Repair missing correct answer
  if (!question.correctAnswer || typeof question.correctAnswer !== 'string' || question.correctAnswer.trim().length === 0) {
    if (question.type === 'true-false') {
      question.correctAnswer = 'True';
    } else if (question.type === 'multiple-choice' && question.options && question.options.length > 0) {
      question.correctAnswer = question.options[0];
    } else {
      question.correctAnswer = 'Please review this answer';
    }
    repairs.push('correctAnswer');
  }

  // Repair missing options for multiple choice
  if (question.type === 'multiple-choice' && (!question.options || !Array.isArray(question.options) || question.options.length === 0)) {
    question.options = [
      question.correctAnswer,
      'Option B',
      'Option C',
      'Option D'
    ];
    repairs.push('options');
  }

  // Repair missing points
  if (!question.points || typeof question.points !== 'number' || question.points <= 0) {
    question.points = 1;
    repairs.push('points');
  }

  // Repair missing target skill
  if (!question.targetSkill) {
    question.targetSkill = targetSkill;
    repairs.push('targetSkill');
  }

  // Add Content Skill ID if available
  if (contentSkillId) {
    question.contentSkillId = contentSkillId;
  }

  // Set default acceptable answers and keywords for short-answer questions
  if (question.type === 'short-answer') {
    if (!question.acceptableAnswers || !Array.isArray(question.acceptableAnswers)) {
      question.acceptableAnswers = [question.correctAnswer];
    }
    if (!question.keywords || !Array.isArray(question.keywords)) {
      question.keywords = question.correctAnswer.toLowerCase()
        .split(/\s+/)
        .filter((word: string) => word.length > 3)
        .slice(0, 3);
    }
  }

  if (repairs.length > 0) {
    console.log(`🔧 Repaired question ${index + 1} fields:`, repairs);
  }

  return question as ValidatedQuestion;
}

// Enhanced JSON response processor with multiple extraction strategies
function processOpenAIResponse(content: string): any {
  console.log('🔄 Processing OpenAI response with multiple extraction strategies');

  const extractionStrategies = [
    // Strategy 1: Direct JSON parse
    () => {
      console.log('📝 Trying direct JSON parse...');
      return JSON.parse(content);
    },

    // Strategy 2: Extract from markdown code blocks
    () => {
      console.log('📝 Trying markdown code block extraction...');
      const jsonMatch = content.match(/```(?:json)?\s*(\{[\s\S]*?\})\s*```/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[1]);
      }
      throw new Error('No JSON found in markdown blocks');
    },

    // Strategy 3: Extract first complete JSON object
    () => {
      console.log('📝 Trying first JSON object extraction...');
      const jsonMatch = content.match(/\{[\s\S]*?\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      throw new Error('No JSON object found');
    },

    // Strategy 4: Clean and parse
    () => {
      console.log('📝 Trying cleaned JSON parse...');
      const cleaned = content
        .trim()
        .replace(/^```json\s*/, '')
        .replace(/\s*```$/, '')
        .replace(/[\r\n\t]/g, ' ')
        .replace(/,(\s*[}\]])/g, '$1');
      return JSON.parse(cleaned);
    }
  ];

  for (let i = 0; i < extractionStrategies.length; i++) {
    try {
      const result = extractionStrategies[i]();
      console.log(`✅ JSON extraction successful using strategy ${i + 1}`);
      return result;
    } catch (error) {
      console.log(`❌ Strategy ${i + 1} failed:`, error.message);
    }
  }

  throw new Error('All JSON extraction strategies failed');
}

// Fallback question generator for critical failures with Content Skills support
function generateFallbackQuestions(
  skillDistribution: Array<{ skill_name: string; score: number; questions: number; contentSkillId?: string; isValidContentSkill?: boolean }>,
  subject: string,
  grade: string
): ValidatedQuestion[] {
  console.log('🆘 Generating fallback questions for emergency recovery');

  const fallbackQuestions: ValidatedQuestion[] = [];
  let questionId = 1;

  for (const skill of skillDistribution) {
    for (let i = 0; i < skill.questions; i++) {
      fallbackQuestions.push({
        id: `Q${questionId++}`,
        type: 'short-answer',
        question: `Practice question for ${skill.skill_name}. Please describe a key concept or skill related to this topic.`,
        correctAnswer: 'Please review with instructor',
        acceptableAnswers: ['Please review with instructor'],
        keywords: ['practice', 'review', 'concept'],
        points: 1,
        targetSkill: skill.skill_name,
        contentSkillId: skill.contentSkillId
      });
    }
  }

  return fallbackQuestions;
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
    console.log(`Sending request to OpenAI ${model} with Content Skills integration`);
    
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
            content: 'You are an expert educational content creator. Generate high-quality practice tests that are engaging, educational, and appropriately challenging for the student\'s level. ALWAYS return valid JSON with complete question objects including all required fields: id, type, question, correctAnswer, points, and targetSkill. Ensure questions align with the specified Content Skills.'
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
    console.log('🚀 Generate-practice-test function called with Content Skills integration');
    
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

    console.log(`🎯 Generating practice test for: ${studentName} in class: ${className} skill(s): ${skillName} grade: ${grade} subject: ${subject} questionCount: ${questionCount} classId: ${classId} multiSkill: ${multiSkillSupport}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // NEW: Fetch Content Skills for the class if classId is provided
    let classContentSkills: ContentSkill[] = [];
    if (classId) {
      classContentSkills = await getClassContentSkills(supabase, classId);
    }

    // Enhanced skill distribution validation with Content Skills integration
    const isMultiSkill = multiSkillSupport && skillDistribution && skillDistribution.length > 1;
    let validatedSkillDistribution = skillDistribution;
    
    if (isMultiSkill && classContentSkills.length > 0) {
      try {
        // NEW: Validate skills against actual Content Skills
        validatedSkillDistribution = validateSkillDistributionAgainstContentSkills(
          skillDistribution, 
          classContentSkills, 
          questionCount
        );
        
        // Check if any skills are invalid Content Skills
        const invalidSkills = validatedSkillDistribution.filter(s => !s.isValidContentSkill);
        if (invalidSkills.length > 0) {
          console.log(`⚠️ Warning: ${invalidSkills.length} skills do not match class Content Skills:`, 
            invalidSkills.map(s => s.skill_name));
        }
        
        // Filter to only valid Content Skills for enhanced accuracy
        const validContentSkills = validatedSkillDistribution.filter(s => s.isValidContentSkill);
        if (validContentSkills.length === 0) {
          throw new Error('No provided skills match the class Content Skills. Please select skills from the class curriculum.');
        }
        
        validatedSkillDistribution = validContentSkills;
        
      } catch (error) {
        console.error('❌ Content Skills validation failed:', error);
        return new Response(
          JSON.stringify({ 
            error: `Content Skills validation failed: ${error.message}`,
            retryable: false
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    } else if (isMultiSkill) {
      // Fallback to original validation if no Content Skills available
      try {
        validatedSkillDistribution = validateSkillDistributionAgainstContentSkills(
          skillDistribution, 
          [], 
          questionCount
        );
      } catch (error) {
        console.error('❌ Skill distribution validation failed:', error);
        return new Response(
          JSON.stringify({ 
            error: `Invalid skill distribution: ${error.message}`,
            retryable: false
          }),
          {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
          }
        );
      }
    }
    
    // Simplified skill classification using database content
    const requestedSkills = isMultiSkill && validatedSkillDistribution 
      ? validatedSkillDistribution.map(s => s.skill_name)
      : [skillName];
    
    const { skillType, skillMetadata } = classifySkillsFromDatabase(classContentSkills, requestedSkills);
    
    // Add multi-skill specific metadata
    if (isMultiSkill && validatedSkillDistribution) {
      skillMetadata.isMultiSkill = true;
      skillMetadata.skillDistribution = validatedSkillDistribution;
    }
    
    skillMetadata.contentSkillsCount = classContentSkills.length;
    
    console.log(`✅ Classified skill type: ${skillType} for skill(s): ${isMultiSkill ? 'multi-skill' : skillName}`);
    console.log('📊 Skill metadata:', skillMetadata);

    let historicalQuestions: HistoricalQuestion[] = [];
    if (classId) {
      historicalQuestions = await getHistoricalQuestionsForSkill(supabase, classId, isMultiSkill ? validatedSkillDistribution[0].skill_name : skillName);
    }

    let historicalContext = '';
    if (historicalQuestions.length > 0) {
      historicalContext = `\n\nHere are some example questions from previous exams in this class for context:\n${
        historicalQuestions.slice(0, 3).map((q, i) => 
          `Example ${i + 1}: ${q.question_text} (${q.question_type}, ${q.points} points)`
        ).join('\n')
      }\n\nUse these examples to understand the style and difficulty level expected, but create completely new questions.`;
    }

    // NEW: Build Content Skills context for OpenAI prompt
    let contentSkillsContext = '';
    if (classContentSkills.length > 0) {
      contentSkillsContext = `\n\nCLASS CONTENT SKILLS CONTEXT:
This class has ${classContentSkills.length} defined Content Skills in the curriculum. When generating questions, ensure they align with these specific skills:
${classContentSkills.map(skill => `- ${skill.skill_name}: ${skill.skill_description} (${skill.topic})`).join('\n')}

IMPORTANT: Generate questions that directly test these Content Skills to enable proper progress tracking.`;
    }

    // Build the enhanced prompt with Content Skills integration
    let skillFocusSection: string;
    let skillInstructions: string;
    
    if (isMultiSkill && validatedSkillDistribution) {
      skillFocusSection = `MULTI-SKILL FOCUS: Generate questions distributed across these Content Skills:
${validatedSkillDistribution.map(s => `- ${s.skill_name}: ${s.questions} questions (current score: ${s.score}%)${s.contentSkillId ? ` [Content Skill ID: ${s.contentSkillId}]` : ''}`).join('\n')}`;
      
      skillInstructions = `
MULTI-SKILL REQUIREMENTS:
1. Generate exactly ${questionCount} questions total, distributed as specified above
2. Each question should clearly target one of the specified Content Skills
3. Use the EXACT skill names provided to ensure proper progress tracking
4. Ensure balanced difficulty across all skills
5. Tag each question with its target skill in the response
6. Maintain coherent flow between different skill areas
7. ENSURE ALL QUESTIONS HAVE COMPLETE REQUIRED FIELDS: id, type, question, correctAnswer, points, targetSkill`;
    } else {
      skillFocusSection = `SKILL FOCUS: ${skillName}`;
      skillInstructions = `
SINGLE-SKILL REQUIREMENTS:
1. All questions must directly test the skill: "${skillName}"
2. Use the EXACT skill name "${skillName}" for proper progress tracking
3. Questions should build upon each other logically
4. ENSURE ALL QUESTIONS HAVE COMPLETE REQUIRED FIELDS: id, type, question, correctAnswer, points, targetSkill`;
    }

    const answerPatternInstructions = enhancedAnswerPatterns ? `

ENHANCED SHORT ANSWER REQUIREMENTS:
- For short-answer questions, provide multiple acceptable answer variations
- Include key concepts/keywords that should be present in correct answers
- Consider different ways students might phrase correct responses
- Account for synonyms and alternative terminology

CRITICAL: Return ONLY valid JSON with this exact structure:
{
  "title": "Practice Test Title",
  "description": "Brief description focusing on ${isMultiSkill ? 'multiple Content Skills' : skillName}",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Question text here",
      "targetSkill": "${isMultiSkill ? 'EXACT skill name from distribution' : skillName}",
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

CRITICAL: Return ONLY valid JSON with this exact structure:
{
  "title": "Practice Test Title",
  "description": "Brief description focusing on ${isMultiSkill ? 'multiple Content Skills' : skillName}",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Question text here",
      "targetSkill": "${isMultiSkill ? 'EXACT skill name from distribution' : skillName}",
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
${contentSkillsContext}
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

Generate exactly ${questionCount} questions${isMultiSkill ? ' distributed across the specified Content Skills' : ` focused on "${skillName}"`}.`;

    try {
      // Main generation attempt with enhanced error handling
      const data = await callOpenAIWithRetry(prompt);
      const content = data.choices[0].message.content;
      console.log('📝 Raw OpenAI response received, processing...');

      let practiceTest;
      try {
        practiceTest = processOpenAIResponse(content);
        console.log('✅ JSON processing successful');
      } catch (parseError) {
        console.error('❌ All JSON extraction strategies failed:', parseError);
        throw new Error('Could not extract valid JSON from OpenAI response');
      }

      // Enhanced question validation and repair with Content Skills
      if (!practiceTest.questions || !Array.isArray(practiceTest.questions)) {
        console.error('❌ Invalid practice test format: missing questions array');
        
        // Emergency fallback: generate basic questions
        if (isMultiSkill && validatedSkillDistribution) {
          console.log('🆘 Using emergency fallback for multi-skill test');
          practiceTest = {
            title: `${subject} Practice Test`,
            description: `Emergency practice test for ${studentName}`,
            skillType,
            skillMetadata,
            questions: generateFallbackQuestions(validatedSkillDistribution, subject, grade),
            totalPoints: questionCount,
            estimatedTime: Math.max(10, questionCount * 3)
          };
        } else {
          throw new Error('Invalid practice test format and cannot generate fallback');
        }
      }

      if (practiceTest.questions.length === 0) {
        console.error('❌ No questions generated in practice test');
        
        // Emergency fallback
        if (isMultiSkill && validatedSkillDistribution) {
          console.log('🆘 Using emergency fallback for empty test');
          practiceTest.questions = generateFallbackQuestions(validatedSkillDistribution, subject, grade);
        } else {
          throw new Error('No questions generated in practice test');
        }
      }

      // Ensure skill metadata is included
      if (!practiceTest.skillType) {
        practiceTest.skillType = skillType;
      }
      
      if (!practiceTest.skillMetadata) {
        practiceTest.skillMetadata = skillMetadata;
      }

      // Enhanced question validation and repair with Content Skills integration
      const validatedQuestions: ValidatedQuestion[] = [];
      
      if (isMultiSkill && validatedSkillDistribution) {
        // For multi-skill, ensure questions are distributed correctly with Content Skills
        let questionIndex = 0;
        for (const skill of validatedSkillDistribution) {
          for (let i = 0; i < skill.questions; i++) {
            const originalQuestion = practiceTest.questions[questionIndex];
            if (originalQuestion) {
              const validatedQuestion = validateAndRepairQuestion(
                originalQuestion, 
                questionIndex, 
                skill.skill_name,
                skill.contentSkillId
              );
              validatedQuestions.push(validatedQuestion);
            } else {
              // Generate fallback question for missing question with Content Skills support
              console.log(`🆘 Generating fallback question ${questionIndex + 1} for Content Skill: ${skill.skill_name}`);
              validatedQuestions.push({
                id: `Q${questionIndex + 1}`,
                type: 'short-answer',
                question: `Practice question for ${skill.skill_name}. Describe a key concept related to this Content Skill.`,
                correctAnswer: 'Please review with instructor',
                acceptableAnswers: ['Please review with instructor'],
                keywords: ['practice', 'review'],
                points: 1,
                targetSkill: skill.skill_name,
                contentSkillId: skill.contentSkillId
              });
            }
            questionIndex++;
          }
        }
      } else {
        // For single skill, validate all questions
        practiceTest.questions.forEach((q: any, index: number) => {
          const validatedQuestion = validateAndRepairQuestion(q, index, skillName);
          validatedQuestions.push(validatedQuestion);
        });
      }

      practiceTest.questions = validatedQuestions;

      // Final calculations
      if (!practiceTest.totalPoints) {
        practiceTest.totalPoints = practiceTest.questions.reduce((sum: number, q: ValidatedQuestion) => sum + q.points, 0);
      }

      if (!practiceTest.estimatedTime) {
        practiceTest.estimatedTime = Math.max(10, practiceTest.questions.length * 3);
      }

      console.log(`✅ Successfully generated and validated practice test with ${practiceTest.questions.length} questions`);
      console.log(`📊 Content Skills integration: ${classContentSkills.length} Content Skills available, ${practiceTest.questions.filter(q => q.contentSkillId).length} questions linked to Content Skills`);
      console.log(`📊 Skill metadata: type=${practiceTest.skillType}, category=${practiceTest.skillMetadata?.skillCategory}, isMultiSkill=${practiceTest.skillMetadata?.isMultiSkill}`);

      return new Response(JSON.stringify(practiceTest), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      console.error('❌ Main generation failed, attempting graceful degradation:', error);
      
      // Graceful degradation: Generate emergency fallback with Content Skills support
      try {
        let emergencyQuestions: ValidatedQuestion[];
        
        if (isMultiSkill && validatedSkillDistribution) {
          emergencyQuestions = generateFallbackQuestions(validatedSkillDistribution, subject, grade);
        } else {
          emergencyQuestions = [{
            id: 'Q1',
            type: 'short-answer',
            question: `Practice question for ${skillName}. Please describe a key concept or skill related to this topic.`,
            correctAnswer: 'Please review with instructor',
            acceptableAnswers: ['Please review with instructor'],
            keywords: ['practice', 'review'],
            points: 1,
            targetSkill: skillName
          }];
        }

        const emergencyTest = {
          title: `${subject} Emergency Practice Test`,
          description: `Emergency practice test generated for ${studentName}. Please review with instructor.`,
          skillType,
          skillMetadata,
          questions: emergencyQuestions,
          totalPoints: emergencyQuestions.reduce((sum, q) => sum + q.points, 0),
          estimatedTime: Math.max(10, emergencyQuestions.length * 3)
        };

        console.log('🆘 Emergency practice test generated successfully with Content Skills support');

        return new Response(JSON.stringify(emergencyTest), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      } catch (emergencyError) {
        console.error('💥 Emergency fallback also failed:', emergencyError);
        throw error; // Fall through to main error handler
      }
    }

  } catch (error) {
    console.error('💥 Complete failure in generate-practice-test function:', error);
    
    let userFriendlyMessage = 'Failed to generate practice test. Please try again.';
    
    if (error.message.includes('OpenAI API')) {
      userFriendlyMessage = 'OpenAI service is temporarily unavailable. Please try again in a moment.';
    } else if (error.message.includes('JSON')) {
      userFriendlyMessage = 'Generated content format error. Please try again.';
    } else if (error.message.includes('API key')) {
      userFriendlyMessage = 'API configuration error. Please contact support.';
    } else if (error.message.includes('Content Skills')) {
      userFriendlyMessage = error.message;
    } else if (error.message.includes('Invalid skill distribution')) {
      userFriendlyMessage = error.message;
    }

    return new Response(
      JSON.stringify({ 
        error: userFriendlyMessage,
        details: error.message,
        retryable: !error.message.includes('Invalid skill distribution') && 
                  !error.message.includes('Content Skills') &&
                  (error.message.includes('server had an error') || 
                   error.message.includes('temporarily unavailable') ||
                   error.message.includes('rate limit'))
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: error.message.includes('Invalid skill distribution') || error.message.includes('Content Skills') ? 400 : 500,
      }
    );
  }
});
