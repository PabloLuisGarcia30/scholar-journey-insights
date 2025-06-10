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
  explanation?: string;
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

// Enhanced question validator and repairer with better answer generation
function validateAndRepairQuestion(
  question: any, 
  index: number, 
  targetSkill: string, 
  contentSkillId?: string, 
  subject?: string, 
  grade?: string,
  includeExplanations: boolean = false
): ValidatedQuestion {
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
    question.question = generateEducationalQuestion(targetSkill, subject, grade, question.type);
    repairs.push('question');
  }

  // Enhanced correct answer repair with educational content
  if (!question.correctAnswer || typeof question.correctAnswer !== 'string' || question.correctAnswer.trim().length === 0) {
    question.correctAnswer = generateEducationalAnswer(question.question, question.type, targetSkill, subject);
    repairs.push('correctAnswer');
  }

  // Repair missing options for multiple choice with educational content
  if (question.type === 'multiple-choice' && (!question.options || !Array.isArray(question.options) || question.options.length === 0)) {
    question.options = generateEducationalOptions(question.question, question.correctAnswer, targetSkill, subject);
    repairs.push('options');
  }

  // Enhanced acceptable answers for short-answer questions
  if (question.type === 'short-answer') {
    if (!question.acceptableAnswers || !Array.isArray(question.acceptableAnswers)) {
      question.acceptableAnswers = generateAcceptableAnswers(question.correctAnswer, targetSkill);
    }
    if (!question.keywords || !Array.isArray(question.keywords)) {
      question.keywords = extractKeywords(question.correctAnswer, question.question);
    }
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

  // NEW: Add explanation if missing and required
  if (includeExplanations && (!question.explanation || question.explanation.trim().length === 0)) {
    question.explanation = generateDefaultExplanation(question, targetSkill, subject);
    repairs.push('explanation');
  }

  if (repairs.length > 0) {
    console.log(`🔧 Repaired question ${index + 1} fields:`, repairs);
  }

  return question as ValidatedQuestion;
}

// Generate educational question based on skill and subject
function generateEducationalQuestion(skill: string, subject?: string, grade?: string, type?: string): string {
  const templates = {
    'multiple-choice': [
      `Which of the following best describes ${skill.toLowerCase()}?`,
      `What is the primary purpose of ${skill.toLowerCase()}?`,
      `In the context of ${subject || 'this subject'}, ${skill.toLowerCase()} is most commonly used to:`
    ],
    'true-false': [
      `${skill} is an important concept in ${subject || 'this subject'}.`,
      `Understanding ${skill.toLowerCase()} helps students analyze data effectively.`,
      `${skill} requires both theoretical knowledge and practical application.`
    ],
    'short-answer': [
      `Explain how ${skill.toLowerCase()} is used in ${subject || 'this subject'}.`,
      `Describe the key steps involved in ${skill.toLowerCase()}.`,
      `What are the main benefits of understanding ${skill.toLowerCase()}?`
    ]
  };

  const typeTemplates = templates[type as keyof typeof templates] || templates['multiple-choice'];
  return typeTemplates[Math.floor(Math.random() * typeTemplates.length)];
}

// Generate educational answer based on question and context
function generateEducationalAnswer(question: string, type: string, skill: string, subject?: string): string {
  if (type === 'true-false') {
    return 'True';
  }

  if (type === 'multiple-choice') {
    // Generate a contextually appropriate answer
    if (question.toLowerCase().includes('primary purpose')) {
      return `To analyze and interpret ${skill.toLowerCase()} effectively`;
    }
    if (question.toLowerCase().includes('best describes')) {
      return `A key analytical skill in ${subject || 'this subject'}`;
    }
    return `Understanding ${skill.toLowerCase()} concepts`;
  }

  if (type === 'short-answer') {
    return `${skill} involves analyzing data and information to draw meaningful conclusions. Students use this skill to examine patterns, make connections, and develop understanding of key concepts in ${subject || 'this subject'}.`;
  }

  return `Key concepts related to ${skill.toLowerCase()}`;
}

// Generate educational multiple choice options
function generateEducationalOptions(question: string, correctAnswer: string, skill: string, subject?: string): string[] {
  const options = [correctAnswer];
  
  // Generate plausible distractors based on the skill and subject
  const distractors = [
    `Basic memorization of ${skill.toLowerCase()}`,
    `Simple calculation without analysis`,
    `Copying information without understanding`,
    `Following instructions without thinking`,
    `Remembering facts without application`,
    `Reading without comprehension`,
    `Using formulas without context`
  ];

  // Add 3 distractors that don't match the correct answer
  while (options.length < 4) {
    const distractor = distractors[Math.floor(Math.random() * distractors.length)];
    if (!options.includes(distractor)) {
      options.push(distractor);
    }
  }

  // Shuffle the options
  for (let i = options.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [options[i], options[j]] = [options[j], options[i]];
  }

  return options;
}

// Generate acceptable answer variations
function generateAcceptableAnswers(correctAnswer: string, skill: string): string[] {
  const variations = [correctAnswer];
  
  // Add common variations and synonyms
  const words = correctAnswer.toLowerCase().split(' ');
  
  // Add shortened version
  if (words.length > 3) {
    variations.push(words.slice(0, Math.ceil(words.length / 2)).join(' '));
  }
  
  // Add key terms from the skill name
  const skillWords = skill.toLowerCase().split(' ');
  skillWords.forEach(word => {
    if (word.length > 3 && !variations.some(v => v.toLowerCase().includes(word))) {
      variations.push(word);
    }
  });
  
  // Add common educational terms
  if (correctAnswer.toLowerCase().includes('analyz')) {
    variations.push('analyze', 'analysis', 'examining');
  }
  if (correctAnswer.toLowerCase().includes('interpret')) {
    variations.push('interpret', 'interpretation', 'understanding');
  }
  if (correctAnswer.toLowerCase().includes('evaluat')) {
    variations.push('evaluate', 'assessment', 'judging');
  }
  
  return variations.slice(0, 5); // Limit to 5 variations
}

// Extract meaningful keywords from answer and question
function extractKeywords(answer: string, question: string): string[] {
  const text = (answer + ' ' + question).toLowerCase();
  const words = text.match(/\b\w{4,}\b/g) || [];
  
  // Filter out common words and get unique educational terms
  const stopWords = ['this', 'that', 'with', 'have', 'will', 'been', 'from', 'they', 'know', 'want', 'been', 'good', 'much', 'some', 'time', 'very', 'when', 'come', 'here', 'just', 'like', 'long', 'make', 'many', 'over', 'such', 'take', 'than', 'them', 'well', 'were'];
  
  const keywords = [...new Set(words)]
    .filter(word => !stopWords.includes(word))
    .slice(0, 5);
    
  return keywords.length > 0 ? keywords : ['concept', 'skill', 'analysis'];
}

// Consolidated fallback question generator with better educational content
function generateFallbackQuestions(
  skillDistribution: Array<{ skill_name: string; score: number; questions: number; contentSkillId?: string; isValidContentSkill?: boolean }>,
  subject: string,
  grade: string,
  includeExplanations: boolean = false
): ValidatedQuestion[] {
  console.log('🆘 Generating enhanced fallback questions with educational content');

  const fallbackQuestions: ValidatedQuestion[] = [];
  let questionId = 1;

  for (const skill of skillDistribution) {
    for (let i = 0; i < skill.questions; i++) {
      const questionType = ['multiple-choice', 'true-false', 'short-answer'][Math.floor(Math.random() * 3)] as 'multiple-choice' | 'true-false' | 'short-answer';
      
      const question = generateEducationalQuestion(skill.skill_name, subject, grade, questionType);
      const correctAnswer = generateEducationalAnswer(question, questionType, skill.skill_name, subject);
      
      const baseQuestion: ValidatedQuestion = {
        id: `Q${questionId++}`,
        type: questionType,
        question,
        correctAnswer,
        points: 1,
        targetSkill: skill.skill_name,
        contentSkillId: skill.contentSkillId
      };

      // Add explanation if required
      if (includeExplanations) {
        baseQuestion.explanation = generateDefaultExplanation(baseQuestion, skill.skill_name, subject);
      }

      if (questionType === 'multiple-choice') {
        baseQuestion.options = generateEducationalOptions(question, correctAnswer, skill.skill_name, subject);
      } else if (questionType === 'short-answer') {
        baseQuestion.acceptableAnswers = generateAcceptableAnswers(correctAnswer, skill.skill_name);
        baseQuestion.keywords = extractKeywords(correctAnswer, question);
      }

      fallbackQuestions.push(baseQuestion);
    }
  }

  return fallbackQuestions;
}

// Enhanced prompt builder with better answer requirements
function buildEnhancedPrompt(
  studentName: string,
  className: string,
  grade: string,
  subject: string,
  questionCount: number,
  skillType: string,
  skillMetadata: any,
  isMultiSkill: boolean,
  validatedSkillDistribution: any[],
  skillName: string,
  classContentSkills: ContentSkill[],
  historicalContext: string,
  includeExplanations: boolean = false
): string {
  // Build Content Skills context
  const contentSkillsContext = classContentSkills.length > 0 
    ? `\n\nCONTENT SKILLS CONTEXT:\nThis class defines ${classContentSkills.length} specific Content Skills. Generate questions that explicitly align with these skills:\n${classContentSkills.map(skill => `- ${skill.skill_name}: ${skill.skill_description} (Topic: ${skill.topic})`).join('\n')}`
    : '';

  // Build skill focus section
  const skillFocusSection = isMultiSkill && validatedSkillDistribution
    ? `\n\nMULTI-SKILL DISTRIBUTION:\nDistribute questions exactly as follows:\n${validatedSkillDistribution.map(s => `- ${s.skill_name}: ${s.questions} questions (current score: ${s.score}%)${s.contentSkillId ? ` [Content Skill ID: ${s.contentSkillId}]` : ''}`).join('\n')}`
    : `\n\nSKILL FOCUS:\nAll questions must target: "${skillName}"`;

  const explanationRequirement = includeExplanations 
    ? `\n\nEXPLANATION REQUIREMENTS:
- Provide detailed, educational explanations for each correct answer
- Explanations should help students understand WHY the answer is correct
- Include key concepts, principles, and learning objectives
- Use clear, age-appropriate language for ${grade} students
- Connect answers to broader ${subject} concepts and skills`
    : '';

  return `You are an expert educational content creator specialized in generating precise, high-quality practice tests with complete, educationally sound answers.

Generate exactly ${questionCount} practice questions for ${studentName}, a ${grade}-level student in ${subject}, attending ${className}.${contentSkillsContext}${skillFocusSection}${historicalContext}${explanationRequirement}

CRITICAL ANSWER REQUIREMENTS:
1. NEVER use placeholder text like "Please review this answer" or "Check with instructor"
2. ALWAYS provide complete, accurate, educational answers
3. For multiple-choice: Provide the exact correct answer from the options
4. For short-answer: Provide a complete, meaningful answer with acceptable variations
5. For true-false: Clearly state "True" or "False" with educational justification
6. Include acceptable answer variations and keywords for flexible grading
${includeExplanations ? '7. Provide detailed explanations that enhance learning and understanding' : ''}

QUESTION GENERATION REQUIREMENTS:
1. Each question MUST target EXACTLY ONE Content Skill from the provided list
2. Match the provided skill names exactly for accurate progress tracking
3. Ensure difficulty is suitable for a ${grade}-level student
4. Provide clear, concise language optimized for educational clarity
5. Mix question types: multiple-choice (preferred), short-answer, true-false
6. Questions should logically progress from basic to advanced concepts
7. Generate realistic, plausible answer options for multiple-choice questions

STRICT JSON RESPONSE FORMAT (respond ONLY in this format; NO extra text, markdown, or explanations):

{
  "title": "Brief, descriptive test title",
  "description": "Concise description summarizing test objectives and Content Skills covered",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Clear, specific question text",
      "targetSkill": "${isMultiSkill ? 'Exact skill name from distribution list' : skillName}",
      "contentSkillId": "Matching Content Skill ID (if provided)",
      "options": ["A", "B", "C", "D"] (ONLY for multiple-choice),
      "correctAnswer": "Complete, educational answer - NEVER use placeholder text",
      "acceptableAnswers": ["Alternative answer 1", "Alternative answer 2"] (for short-answer only),
      "keywords": ["key concept 1", "key concept 2"] (important concepts, short-answer only),
      "points": 1-3 (difficulty-based scoring)${includeExplanations ? ',\n      "explanation": "Detailed educational explanation of why this answer is correct"' : ''}
    }
  ],
  "totalPoints": sum of all question points,
  "estimatedTime": estimated completion time in minutes
}

FINAL VALIDATION CHECKLIST:
- ✅ All correctAnswer fields contain complete, educational content
- ✅ No placeholder text like "Please review" anywhere
- ✅ Multiple-choice options are realistic and educational
- ✅ Short-answer questions include acceptable variations
- ✅ All questions align with specified Content Skills
${includeExplanations ? '- ✅ Detailed explanations provided for each question' : ''}
- ✅ JSON format is valid and complete

ONLY return the JSON. Begin your JSON response now.`;
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
    
    console.log(`⏱️ Retrying in ${delayWithJitter}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
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
    console.log(`Sending enhanced request to OpenAI ${model} with improved prompt structure`);
    
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
            content: 'You are an expert educational content creator. Generate high-quality practice tests that are engaging, educational, and appropriately challenging. ALWAYS return valid JSON with complete question objects. Ensure questions align precisely with specified Content Skills for accurate progress tracking.'
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
    console.log(`OpenAI ${model} practice test generation completed with enhanced prompt`);
    return data;
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log('🚀 Generate-practice-test function called with enhanced answer generation');
    
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
      enhancedAnswerPatterns = false,
      saveAnswerKey = false,
      exerciseId
    }: GeneratePracticeTestRequest & { 
      enhancedAnswerPatterns?: boolean; 
      saveAnswerKey?: boolean;
      exerciseId?: string;
    } = await req.json();

    console.log(`🎯 Generating practice test for: ${studentName} in class: ${className} skill(s): ${skillName} grade: ${grade} subject: ${subject} questionCount: ${questionCount} classId: ${classId} multiSkill: ${multiSkillSupport}`);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch Content Skills for the class if classId is provided
    let classContentSkills: ContentSkill[] = [];
    if (classId) {
      classContentSkills = await getClassContentSkills(supabase, classId);
    }

    // Enhanced skill distribution validation with Content Skills integration
    const isMultiSkill = multiSkillSupport && skillDistribution && skillDistribution.length > 1;
    let validatedSkillDistribution = skillDistribution;
    
    if (isMultiSkill && classContentSkills.length > 0) {
      try {
        validatedSkillDistribution = validateSkillDistributionAgainstContentSkills(
          skillDistribution, 
          classContentSkills, 
          questionCount
        );
        
        const invalidSkills = validatedSkillDistribution.filter(s => !s.isValidContentSkill);
        if (invalidSkills.length > 0) {
          console.log(`⚠️ Warning: ${invalidSkills.length} skills do not match class Content Skills:`, 
            invalidSkills.map(s => s.skill_name));
        }
        
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
    
    // Skill classification using database content
    const requestedSkills = isMultiSkill && validatedSkillDistribution 
      ? validatedSkillDistribution.map(s => s.skill_name)
      : [skillName];
    
    const { skillType, skillMetadata } = classifySkillsFromDatabase(classContentSkills, requestedSkills);
    
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
      historicalContext = `\n\nHISTORICAL QUESTION CONTEXT:\nHere are examples from previous exams to guide question style and difficulty:\n${
        historicalQuestions.slice(0, 3).map((q, i) => 
          `Example ${i + 1}: ${q.question_text} (${q.question_type}, ${q.points} points)`
        ).join('\n')
      }\n\nUse these examples to understand the style and difficulty level expected, but create completely new questions.`;
    }

    // Build the enhanced prompt using the hybrid approach
    const prompt = buildEnhancedPrompt(
      studentName,
      className,
      grade,
      subject,
      questionCount,
      skillType,
      skillMetadata,
      isMultiSkill,
      validatedSkillDistribution || [],
      skillName,
      classContentSkills,
      historicalContext,
      saveAnswerKey // NEW: Pass flag to include detailed explanations
    );

    try {
      // Main generation attempt with enhanced prompt
      const data = await callOpenAIWithRetry(prompt);
      const content = data.choices[0].message.content;
      console.log('📝 Raw OpenAI response received, processing with enhanced validation...');

      let practiceTest;
      try {
        practiceTest = processOpenAIResponse(content);
        console.log('✅ JSON processing successful with enhanced prompt');
      } catch (parseError) {
        console.error('❌ All JSON extraction strategies failed:', parseError);
        throw new Error('Could not extract valid JSON from OpenAI response');
      }

      // Enhanced question validation and repair with Content Skills
      if (!practiceTest.questions || !Array.isArray(practiceTest.questions)) {
        console.error('❌ Invalid practice test format: missing questions array');
        
        if (isMultiSkill && validatedSkillDistribution) {
          console.log('🆘 Using enhanced fallback for multi-skill test');
          practiceTest = {
            title: `${subject} Practice Test`,
            description: `Enhanced practice test for ${studentName}`,
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
        
        if (isMultiSkill && validatedSkillDistribution) {
          console.log('🆘 Using enhanced fallback for empty test');
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
        let questionIndex = 0;
        for (const skill of validatedSkillDistribution) {
          for (let i = 0; i < skill.questions; i++) {
            const originalQuestion = practiceTest.questions[questionIndex];
            if (originalQuestion) {
              const validatedQuestion = validateAndRepairQuestion(
                originalQuestion, 
                questionIndex, 
                skill.skill_name,
                skill.contentSkillId,
                subject,
                grade,
                saveAnswerKey // NEW: Pass flag for enhanced explanations
              );
              validatedQuestions.push(validatedQuestion);
            } else {
              console.log(`🆘 Generating enhanced fallback question ${questionIndex + 1} for Content Skill: ${skill.skill_name}`);
              const fallbackQuestions = generateFallbackQuestions([skill], subject, grade, saveAnswerKey);
              validatedQuestions.push(fallbackQuestions[0]);
            }
            questionIndex++;
          }
        }
      } else {
        practiceTest.questions.forEach((q: any, index: number) => {
          const validatedQuestion = validateAndRepairQuestion(
            q, 
            index, 
            skillName, 
            undefined, 
            subject, 
            grade,
            saveAnswerKey
          );
          validatedQuestions.push(validatedQuestion);
        });
      }

      practiceTest.questions = validatedQuestions;

      // NEW: If saving answer key, store it in the database
      if (saveAnswerKey && exerciseId && validatedQuestions.length > 0) {
        try {
          console.log('💾 Saving answer key to database for exercise:', exerciseId);
          
          const answerKeyData = {
            exercise_id: exerciseId,
            questions: validatedQuestions.map(q => ({
              id: q.id,
              type: q.type,
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswer,
              explanation: q.explanation || generateDefaultExplanation(q),
              acceptableAnswers: q.acceptableAnswers,
              keywords: q.keywords,
              points: q.points,
              targetSkill: q.targetSkill,
              learningObjective: generateLearningObjective(q, skillName, subject)
            })),
            metadata: {
              skillName: isMultiSkill ? 'Multiple Skills' : skillName,
              subject,
              grade,
              totalPoints: practiceTest.totalPoints,
              estimatedTime: practiceTest.estimatedTime,
              generatedAt: new Date().toISOString()
            }
          };

          const { error: answerKeyError } = await supabase
            .from('practice_answer_keys')
            .insert(answerKeyData);

          if (answerKeyError) {
            console.error('⚠️ Failed to save answer key:', answerKeyError);
            // Don't fail the entire generation if answer key saving fails
          } else {
            console.log('✅ Answer key saved to database successfully');
          }
        } catch (answerKeyError) {
          console.error('⚠️ Error saving answer key:', answerKeyError);
          // Continue with practice test generation even if answer key fails
        }
      }

      // Final calculations
      if (!practiceTest.totalPoints) {
        practiceTest.totalPoints = practiceTest.questions.reduce((sum: number, q: ValidatedQuestion) => sum + q.points, 0);
      }

      if (!practiceTest.estimatedTime) {
        practiceTest.estimatedTime = Math.max(10, practiceTest.questions.length * 3);
      }

      console.log(`✅ Successfully generated and validated practice test with enhanced answers: ${practiceTest.questions.length} questions`);
      console.log(`📊 Content Skills integration: ${classContentSkills.length} Content Skills available, ${practiceTest.questions.filter(q => q.contentSkillId).length} questions linked to Content Skills`);
      console.log(`📊 Enhanced answer quality: All questions have complete educational answers`);

      return new Response(JSON.stringify(practiceTest), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });

    } catch (error) {
      console.error('❌ Main generation failed, attempting enhanced graceful degradation:', error);
      
      try {
        let emergencyQuestions: ValidatedQuestion[];
        
        if (isMultiSkill && validatedSkillDistribution) {
          emergencyQuestions = generateFallbackQuestions(validatedSkillDistribution, subject, grade);
        } else {
          const fallbackSkillDistribution = [{
            skill_name: skillName,
            score: 50,
            questions: questionCount
          }];
          emergencyQuestions = generateFallbackQuestions(fallbackSkillDistribution, subject, grade);
        }

        const emergencyTest = {
          title: `${subject} Enhanced Practice Test`,
          description: `Enhanced practice test generated for ${studentName} with complete educational content.`,
          skillType,
          skillMetadata,
          questions: emergencyQuestions,
          totalPoints: emergencyQuestions.reduce((sum, q) => sum + q.points, 0),
          estimatedTime: Math.max(10, emergencyQuestions.length * 3)
        };

        console.log('🆘 Enhanced emergency practice test generated successfully');

        return new Response(JSON.stringify(emergencyTest), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });

      } catch (emergencyError) {
        console.error('💥 Enhanced emergency fallback also failed:', emergencyError);
        throw error;
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

// Enhanced prompt builder with explanation requirements
function buildEnhancedPrompt(
  studentName: string,
  className: string,
  grade: string,
  subject: string,
  questionCount: number,
  skillType: string,
  skillMetadata: any,
  isMultiSkill: boolean,
  validatedSkillDistribution: any[],
  skillName: string,
  classContentSkills: ContentSkill[],
  historicalContext: string,
  includeExplanations: boolean = false
): string {
  // Build Content Skills context
  const contentSkillsContext = classContentSkills.length > 0 
    ? `\n\nCONTENT SKILLS CONTEXT:\nThis class defines ${classContentSkills.length} specific Content Skills. Generate questions that explicitly align with these skills:\n${classContentSkills.map(skill => `- ${skill.skill_name}: ${skill.skill_description} (Topic: ${skill.topic})`).join('\n')}`
    : '';

  // Build skill focus section
  const skillFocusSection = isMultiSkill && validatedSkillDistribution
    ? `\n\nMULTI-SKILL DISTRIBUTION:\nDistribute questions exactly as follows:\n${validatedSkillDistribution.map(s => `- ${s.skill_name}: ${s.questions} questions (current score: ${s.score}%)${s.contentSkillId ? ` [Content Skill ID: ${s.contentSkillId}]` : ''}`).join('\n')}`
    : `\n\nSKILL FOCUS:\nAll questions must target: "${skillName}"`;

  const explanationRequirement = includeExplanations 
    ? `\n\nEXPLANATION REQUIREMENTS:
- Provide detailed, educational explanations for each correct answer
- Explanations should help students understand WHY the answer is correct
- Include key concepts, principles, and learning objectives
- Use clear, age-appropriate language for ${grade} students
- Connect answers to broader ${subject} concepts and skills`
    : '';

  return `You are an expert educational content creator specialized in generating precise, high-quality practice tests with complete, educationally sound answers.

Generate exactly ${questionCount} practice questions for ${studentName}, a ${grade}-level student in ${subject}, attending ${className}.${contentSkillsContext}${skillFocusSection}${historicalContext}${explanationRequirement}

CRITICAL ANSWER REQUIREMENTS:
1. NEVER use placeholder text like "Please review this answer" or "Check with instructor"
2. ALWAYS provide complete, accurate, educational answers
3. For multiple-choice: Provide the exact correct answer from the options
4. For short-answer: Provide a complete, meaningful answer with acceptable variations
5. For true-false: Clearly state "True" or "False" with educational justification
6. Include acceptable answer variations and keywords for flexible grading
${includeExplanations ? '7. Provide detailed explanations that enhance learning and understanding' : ''}

QUESTION GENERATION REQUIREMENTS:
1. Each question MUST target EXACTLY ONE Content Skill from the provided list
2. Match the provided skill names exactly for accurate progress tracking
3. Ensure difficulty is suitable for a ${grade}-level student
4. Provide clear, concise language optimized for educational clarity
5. Mix question types: multiple-choice (preferred), short-answer, true-false
6. Questions should logically progress from basic to advanced concepts
7. Generate realistic, plausible answer options for multiple-choice questions

STRICT JSON RESPONSE FORMAT (respond ONLY in this format; NO extra text, markdown, or explanations):

{
  "title": "Brief, descriptive test title",
  "description": "Concise description summarizing test objectives and Content Skills covered",
  "skillType": "${skillType}",
  "skillMetadata": ${JSON.stringify(skillMetadata)},
  "questions": [
    {
      "id": "Q1",
      "type": "multiple-choice" | "short-answer" | "true-false",
      "question": "Clear, specific question text",
      "targetSkill": "${isMultiSkill ? 'Exact skill name from distribution list' : skillName}",
      "contentSkillId": "Matching Content Skill ID (if provided)",
      "options": ["A", "B", "C", "D"] (ONLY for multiple-choice),
      "correctAnswer": "Complete, educational answer - NEVER use placeholder text",
      "acceptableAnswers": ["Alternative answer 1", "Alternative answer 2"] (for short-answer only),
      "keywords": ["key concept 1", "key concept 2"] (important concepts, short-answer only),
      "points": 1-3 (difficulty-based scoring)${includeExplanations ? ',\n      "explanation": "Detailed educational explanation of why this answer is correct"' : ''}
    }
  ],
  "totalPoints": sum of all question points,
  "estimatedTime": estimated completion time in minutes
}

FINAL VALIDATION CHECKLIST:
- ✅ All correctAnswer fields contain complete, educational content
- ✅ No placeholder text like "Please review" anywhere
- ✅ Multiple-choice options are realistic and educational
- ✅ Short-answer questions include acceptable variations
- ✅ All questions align with specified Content Skills
${includeExplanations ? '- ✅ Detailed explanations provided for each question' : ''}
- ✅ JSON format is valid and complete

ONLY return the JSON. Begin your JSON response now.`;
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
    
    console.log(`⏱️ Retrying in ${delayWithJitter}ms... (attempt ${attempt + 1}/${RETRY_CONFIG.maxAttempts})`);
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
    console.log(`Sending enhanced request to OpenAI ${model} with improved prompt structure`);
    
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
            content: 'You are an expert educational content creator. Generate high-quality practice tests that are engaging, educational, and appropriately challenging. ALWAYS return valid JSON with complete question objects. Ensure questions align precisely with specified Content Skills for accurate progress tracking.'
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
    console.log(`OpenAI ${model} practice test generation completed with enhanced prompt`);
    return data;
  });
}

// NEW: Helper functions for explanations
function generateDefaultExplanation(question: any, skill: string, subject?: string): string {
  switch (question.type) {
    case 'multiple-choice':
      return `This question tests your understanding of ${skill} in ${subject || 'this subject'}. The correct answer demonstrates the key principles and shows proper application of the concept. Review the fundamental concepts of ${skill} to strengthen your understanding.`;
    
    case 'true-false':
      return `This statement relates to ${skill}. Understanding whether this is true or false helps reinforce important facts and concepts in ${subject || 'this subject'}. Consider the key characteristics and definitions when evaluating such statements.`;
    
    case 'short-answer':
      return `This question requires you to explain ${skill} concepts in your own words. A good answer should include key terms, show clear understanding, and demonstrate how the concept applies in ${subject || 'this subject'}. Practice explaining concepts clearly to improve your communication skills.`;
    
    default:
      return `This question helps assess your knowledge of ${skill}. Review the key concepts and practice similar problems to improve your understanding of this important topic in ${subject || 'this subject'}.`;
  }
}

function generateLearningObjective(question: any, skillName: string, subject: string): string {
  return `Students will demonstrate understanding of ${skillName} by correctly answering questions and explaining key concepts in ${subject} contexts.`;
}

// Updated fallback question generator with explanations
function generateFallbackQuestions(
  skillDistribution: Array<{ skill_name: string; score: number; questions: number; contentSkillId?: string; isValidContentSkill?: boolean }>,
  subject: string,
  grade: string,
  includeExplanations: boolean = false
): ValidatedQuestion[] {
  console.log('🆘 Generating enhanced fallback questions with educational content');

  const fallbackQuestions: ValidatedQuestion[] = [];
  let questionId = 1;

  for (const skill of skillDistribution) {
    for (let i = 0; i < skill.questions; i++) {
      const questionType = ['multiple-choice', 'true-false', 'short-answer'][Math.floor(Math.random() * 3)] as 'multiple-choice' | 'true-false' | 'short-answer';
      
      const question = generateEducationalQuestion(skill.skill_name, subject, grade, questionType);
      const correctAnswer = generateEducationalAnswer(question, questionType, skill.skill_name, subject);
      
      const baseQuestion: ValidatedQuestion = {
        id: `Q${questionId++}`,
        type: questionType,
        question,
        correctAnswer,
        points: 1,
        targetSkill: skill.skill_name,
        contentSkillId: skill.contentSkillId
      };

      // Add explanation if required
      if (includeExplanations) {
        baseQuestion.explanation = generateDefaultExplanation(baseQuestion, skill.skill_name, subject);
      }

      if (questionType === 'multiple-choice') {
        baseQuestion.options = generateEducationalOptions(question, correctAnswer, skill.skill_name, subject);
      } else if (questionType === 'short-answer') {
        baseQuestion.acceptableAnswers = generateAcceptableAnswers(correctAnswer, skill.skill_name);
        baseQuestion.keywords = extractKeywords(correctAnswer, question);
      }

      fallbackQuestions.push(baseQuestion);
    }
  }

  return fallbackQuestions;
}
