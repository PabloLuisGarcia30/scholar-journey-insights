
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Enhanced circuit breaker implementation for edge function
class EdgeCircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  constructor(private failureThreshold = 3, private recoveryTimeoutMs = 30000) {}

  async execute<T>(operation: () => Promise<T>, serviceName: string): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeoutMs) {
        this.state = 'HALF_OPEN';
        console.log(`${serviceName} circuit breaker moving to HALF_OPEN state`);
      } else {
        throw new Error(`${serviceName} circuit breaker is OPEN - service temporarily unavailable`);
      }
    }

    try {
      const result = await operation();
      this.onSuccess(serviceName);
      return result;
    } catch (error) {
      this.onFailure(serviceName);
      throw error;
    }
  }

  private onSuccess(serviceName: string) {
    this.failures = 0;
    this.state = 'CLOSED';
    console.log(`${serviceName} circuit breaker reset to CLOSED state`);
  }

  private onFailure(serviceName: string) {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'OPEN';
      console.log(`${serviceName} circuit breaker opened due to failures`);
    }
  }
}

// Enhanced bubble quality assessment
interface BubbleQuality {
  fillLevel: 'empty' | 'light' | 'medium' | 'heavy' | 'overfilled';
  confidence: number;
  detectionMethod: string;
  spatialConsistency: number;
}

interface EnhancedBubbleDetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
  quality: BubbleQuality;
  questionContext?: {
    questionNumber: number;
    spatialGroup: number;
    optionLetter?: string;
  };
}

interface QuestionGroup {
  questionNumber: number;
  bubbles: EnhancedBubbleDetection[];
  selectedAnswer: {
    optionLetter: string;
    bubble: EnhancedBubbleDetection;
    confidence: number;
  } | null;
  hasMultipleMarks: boolean;
  reviewRequired: boolean;
  processingNotes: string[];
}

// Create circuit breakers for each service
const googleVisionBreaker = new EdgeCircuitBreaker(3, 30000);
const roboflowBreaker = new EdgeCircuitBreaker(3, 30000);
const openaiBreaker = new EdgeCircuitBreaker(3, 30000);

// Retry function with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxAttempts = 3,
  baseDelay = 1000
): Promise<T> {
  let lastError: Error;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error as Error;
      console.warn(`Attempt ${attempt} failed:`, lastError.message);

      if (attempt === maxAttempts) break;

      const delay = baseDelay * Math.pow(2, attempt - 1);
      console.log(`Retrying in ${delay}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Enhanced question-based bubble detection function called')
    const { fileContent, fileName } = await req.json()
    console.log('Processing file:', fileName)
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!googleApiKey || !roboflowApiKey || !openaiApiKey) {
      console.error('Required API keys not found')
      throw new Error('Required API keys not configured')
    }

    // Step 1: Google Cloud Vision OCR with circuit breaker and retry
    console.log('Step 1: Processing with Google Cloud Vision OCR...')
    const visionData = await googleVisionBreaker.execute(async () => {
      return await retryWithBackoff(async () => {
        const visionResponse = await fetch(
          `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              requests: [{
                image: { content: fileContent },
                features: [
                  { type: 'TEXT_DETECTION', maxResults: 50 },
                  { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
                ]
              }]
            })
          }
        )

        if (!visionResponse.ok) {
          const errorText = await visionResponse.text()
          console.error('Google Vision API error:', errorText)
          throw new Error(`Google Vision API error: ${errorText}`)
        }

        return await visionResponse.json()
      }, 2, 2000)
    }, 'Google Vision');

    console.log('Google Vision API response received')

    // Step 2: Enhanced Roboflow bubble detection
    console.log('Step 2: Enhanced Roboflow bubble detection...')
    let roboflowData = null
    let enhancedBubbles: EnhancedBubbleDetection[] = []
    
    try {
      roboflowData = await roboflowBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          const roboflowResponse = await fetch(
            'https://detect.roboflow.com/bubble-sheet-detector/1',
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
              },
              body: `api_key=${roboflowApiKey}&image=${encodeURIComponent(fileContent)}`
            }
          )

          if (!roboflowResponse.ok) {
            throw new Error(`Roboflow API error: ${roboflowResponse.status}`)
          }

          return await roboflowResponse.json()
        }, 2, 1500)
      }, 'Roboflow');

      console.log('Roboflow bubble detection completed with', roboflowData?.predictions?.length || 0, 'detections')
      
      if (roboflowData?.predictions) {
        enhancedBubbles = roboflowData.predictions.map((bubble) => {
          const quality = assessBubbleQuality(bubble, roboflowData.predictions)
          
          return {
            ...bubble,
            quality,
            questionContext: undefined // Will be set during grouping
          }
        })
        
        console.log('Enhanced bubble analysis completed:', {
          total: enhancedBubbles.length,
          empty: enhancedBubbles.filter(b => b.quality.fillLevel === 'empty').length,
          light: enhancedBubbles.filter(b => b.quality.fillLevel === 'light').length,
          medium: enhancedBubbles.filter(b => b.quality.fillLevel === 'medium').length,
          heavy: enhancedBubbles.filter(b => b.quality.fillLevel === 'heavy').length,
          overfilled: enhancedBubbles.filter(b => b.quality.fillLevel === 'overfilled').length
        })
      }
    } catch (error) {
      console.warn('Roboflow detection failed:', error)
      roboflowData = null
    }

    // Step 3: Enhanced spatial bubble grouping by question
    console.log('Step 3: Enhanced spatial bubble grouping by question...')
    const questionGroups = groupBubblesByQuestion(enhancedBubbles)
    
    console.log('Question grouping completed:', {
      totalQuestions: questionGroups.length,
      questionsWithAnswers: questionGroups.filter(q => q.selectedAnswer).length,
      questionsNeedingReview: questionGroups.filter(q => q.reviewRequired).length,
      questionsWithMultipleMarks: questionGroups.filter(q => q.hasMultipleMarks).length
    })

    // Step 4: Text extraction and processing
    console.log('Step 4: Text extraction and processing...')
    
    const fullTextAnnotation = visionData.responses?.[0]?.fullTextAnnotation
    const textAnnotations = visionData.responses?.[0]?.textAnnotations || []
    
    let extractedText = ''
    let pages = []
    let overallConfidence = 0
    let blockCount = 0

    if (fullTextAnnotation) {
      extractedText = fullTextAnnotation.text || ''
      
      if (fullTextAnnotation.pages) {
        pages = fullTextAnnotation.pages.map((page, pageIndex) => {
          const blocks = page.blocks || []
          let pageText = ''
          let pageConfidence = 0
          let validBlocks = 0

          const processedBlocks = blocks.map((block, blockIndex) => {
            const blockText = block.paragraphs?.map(para => 
              para.words?.map(word => 
                word.symbols?.map(symbol => symbol.text).join('') || ''
              ).join(' ') || ''
            ).join('\n') || ''
            
            const blockConfidence = block.confidence || 0
            
            if (blockText.trim()) {
              pageText += blockText + '\n'
              pageConfidence += blockConfidence
              validBlocks++
            }
            
            return {
              blockIndex,
              text: blockText,
              confidence: blockConfidence,
              boundingBox: block.boundingBox,
              type: 'text_block'
            }
          })

          const avgPageConfidence = validBlocks > 0 ? pageConfidence / validBlocks : 0
          overallConfidence += avgPageConfidence
          blockCount += validBlocks

          return {
            pageNumber: pageIndex + 1,
            blocks: processedBlocks,
            text: pageText.trim(),
            confidence: avgPageConfidence
          }
        })
      }
    }

    const finalConfidence = blockCount > 0 ? overallConfidence / blockCount : 0

    // Step 5: Enhanced OpenAI parsing with question-based context
    console.log('Step 5: Enhanced OpenAI parsing with question-based bubble context...')
    
    const questionGroupContext = questionGroups.map(group => ({
      questionNumber: group.questionNumber,
      selectedAnswer: group.selectedAnswer?.optionLetter || 'no_answer',
      confidence: group.selectedAnswer?.confidence || 0,
      hasMultipleMarks: group.hasMultipleMarks,
      reviewRequired: group.reviewRequired,
      processingNotes: group.processingNotes
    }))

    const enhancedParsingPrompt = `Analyze this test document with enhanced question-based bubble detection. 

CRITICAL INSTRUCTION: Each question has multiple choice options (A, B, C, D, E). Students fill ONE bubble per question. Empty bubbles are NORMAL for non-selected options and should NOT be considered wrong answers.

QUESTION-BASED BUBBLE ANALYSIS:
${questionGroupContext.map(q => 
  `Question ${q.questionNumber}: Selected ${q.selectedAnswer} (confidence: ${q.confidence.toFixed(2)})${q.hasMultipleMarks ? ' [MULTIPLE MARKS]' : ''}${q.reviewRequired ? ' [REVIEW NEEDED]' : ''}`
).join('\n')}

KEY PROCESSING RULES:
1. Only count the selected answer for each question (ignore empty bubbles)
2. If no bubble is clearly selected, mark as "no_answer"
3. Flag questions with multiple significant marks for review
4. Cross-validate bubble selections with OCR text patterns
5. Focus on answer confidence based on relative fill levels within each question

Extract structured information:
1. Exam/Test identification
2. Student information (name, ID, email, etc.)  
3. Questions with SINGLE answer per question based on bubble analysis
4. Answer confidence based on question-level bubble quality

OCR Text:
${extractedText}

Return JSON with question-based answer detection:
{
  "examId": "string or null",
  "studentName": "string or null",
  "questions": [
    {
      "questionNumber": number,
      "questionText": "string",
      "type": "multiple-choice",
      "options": [{"letter": "A", "text": "option text"}],
      "detectedAnswer": {
        "selectedOption": "A|B|C|D|E|no_answer",
        "confidence": number (0-1),
        "bubbleQuality": "empty|light|medium|heavy|overfilled",
        "detectionMethod": "question_based_selection",
        "reviewFlag": boolean,
        "multipleMarksDetected": boolean,
        "reasoning": "explanation of answer selection within question context"
      }
    }
  ],
  "answerPatternAnalysis": {
    "consistencyScore": number,
    "potentialIssues": ["list of issues"],
    "reviewRecommendations": ["recommendations"]
  },
  "processingNotes": ["question-based processing observations"]
}`

    let parsedData = {
      examId: null,
      studentName: null,
      questions: [],
      answerPatternAnalysis: {
        consistencyScore: 0.8,
        potentialIssues: [],
        reviewRecommendations: []
      },
      processingNotes: []
    }

    try {
      const aiResult = await openaiBreaker.execute(async () => {
        return await retryWithBackoff(async () => {
          const parseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
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
                  content: 'You are an expert at parsing educational documents with question-based bubble detection. Understand that each question has ONE answer and empty bubbles are normal for non-selected options. Focus on question-level answer selection, not individual bubble analysis. Return only valid JSON.'
                },
                {
                  role: 'user', 
                  content: enhancedParsingPrompt
                }
              ],
              temperature: 0.1,
              max_tokens: 3000
            }),
          })

          if (!parseResponse.ok) {
            throw new Error(`OpenAI API error: ${parseResponse.status}`)
          }

          return await parseResponse.json()
        }, 2, 3000)
      }, 'OpenAI');

      const aiContent = aiResult.choices?.[0]?.message?.content || '{}'
      
      try {
        const enhancedParsedData = JSON.parse(aiContent)
        parsedData = { ...parsedData, ...enhancedParsedData }
        console.log('Enhanced question-based parsing successful, found', parsedData.questions?.length || 0, 'questions')
      } catch (e) {
        console.warn('Failed to parse enhanced OpenAI response as JSON:', e)
        parsedData.processingNotes.push('AI parsing failed, using fallback')
      }
    } catch (error) {
      console.warn('Enhanced OpenAI parsing request failed:', error)
      parsedData.processingNotes.push('AI parsing unavailable - using fallback')
    }

    // Step 6: Cross-validate AI results with question groups
    console.log('Step 6: Cross-validating AI results with question groups...')
    
    const enhancedAnswers = []
    let crossValidatedCount = 0
    let qualityFlaggedCount = 0

    for (const question of parsedData.questions) {
      const questionNum = question.questionNumber
      const questionGroup = questionGroups.find(g => g.questionNumber === questionNum)
      
      let finalAnswer = {
        questionNumber: questionNum,
        selectedOption: 'no_answer',
        detectionMethod: 'fallback',
        confidence: 0.1,
        bubbleQuality: 'unknown',
        crossValidated: false,
        reviewFlag: false,
        multipleMarksDetected: false,
        qualityAssessment: {
          bubbleCount: 0,
          maxBubbleConfidence: 0,
          fillLevelConsistency: 0,
          spatialAlignment: 0
        },
        processingNotes: []
      }

      if (questionGroup) {
        // Use question group analysis as primary source
        if (questionGroup.selectedAnswer) {
          finalAnswer.selectedOption = questionGroup.selectedAnswer.optionLetter
          finalAnswer.confidence = questionGroup.selectedAnswer.confidence
          finalAnswer.bubbleQuality = questionGroup.selectedAnswer.bubble.quality.fillLevel
          finalAnswer.detectionMethod = 'question_based_selection'
          finalAnswer.crossValidated = true
          finalAnswer.multipleMarksDetected = questionGroup.hasMultipleMarks
          finalAnswer.reviewFlag = questionGroup.reviewRequired
          finalAnswer.qualityAssessment = assessQuestionQuality(questionGroup)
          finalAnswer.processingNotes = questionGroup.processingNotes
          
          crossValidatedCount++
        } else {
          // No clear answer in question group
          finalAnswer.selectedOption = 'no_answer'
          finalAnswer.confidence = 0.1
          finalAnswer.detectionMethod = 'no_clear_selection'
          finalAnswer.reviewFlag = true
          finalAnswer.processingNotes.push('No clearly selected bubble in question group')
        }
        
        // Cross-validate with AI if available
        const aiAnswer = question.detectedAnswer
        if (aiAnswer && aiAnswer.selectedOption !== finalAnswer.selectedOption) {
          finalAnswer.processingNotes.push(`AI detected ${aiAnswer.selectedOption}, bubble analysis shows ${finalAnswer.selectedOption}`)
          if (finalAnswer.confidence < 0.5) {
            finalAnswer.reviewFlag = true
          }
        }
      } else {
        // Fallback to AI detection if no question group found
        const aiAnswer = question.detectedAnswer
        if (aiAnswer) {
          finalAnswer.selectedOption = aiAnswer.selectedOption || 'no_answer'
          finalAnswer.confidence = typeof aiAnswer.confidence === 'number' ? aiAnswer.confidence : 0.3
          finalAnswer.detectionMethod = 'ai_fallback'
          finalAnswer.reviewFlag = true
          finalAnswer.processingNotes.push('No bubble group found, using AI detection')
        }
      }

      if (finalAnswer.reviewFlag) {
        qualityFlaggedCount++
      }

      enhancedAnswers.push(finalAnswer)
    }

    // Step 7: Calculate enhanced validation metrics
    const questionAnswerAlignment = parsedData.questions.length > 0 ? 
      (enhancedAnswers.length / parsedData.questions.length) : 0
    
    const bubbleDetectionAccuracy = questionGroups.length > 0 ? 
      (crossValidatedCount / questionGroups.length) : 0
    
    const qualityAssuranceScore = enhancedAnswers.length > 0 ?
      (enhancedAnswers.filter(a => a.confidence > 0.7).length / enhancedAnswers.length) : 0
    
    const overallReliability = (questionAnswerAlignment + bubbleDetectionAccuracy + finalConfidence + qualityAssuranceScore) / 4

    // Step 8: Build enhanced structured response
    console.log('Step 8: Building enhanced structured response...')
    
    const structuredData = {
      documentMetadata: {
        totalPages: pages.length || 1,
        processingMethods: ['google_ocr', 'question_based_bubble_analysis'],
        overallConfidence: finalConfidence,
        roboflowDetections: enhancedBubbles.length,
        googleOcrBlocks: blockCount,
        enhancedFeatures: {
          questionBasedGrouping: true,
          singleAnswerPerQuestion: true,
          multipleMarkDetection: true,
          reviewFlags: true
        }
      },
      pages,
      questions: parsedData.questions.map(q => ({
        ...q,
        detectedAnswer: enhancedAnswers.find(a => a.questionNumber === q.questionNumber)
      })),
      answers: enhancedAnswers,
      questionGroups: questionGroups.map(group => ({
        questionNumber: group.questionNumber,
        bubbleCount: group.bubbles.length,
        selectedAnswer: group.selectedAnswer,
        hasMultipleMarks: group.hasMultipleMarks,
        reviewRequired: group.reviewRequired,
        processingNotes: group.processingNotes
      })),
      validationResults: {
        questionAnswerAlignment,
        bubbleDetectionAccuracy,
        textOcrAccuracy: finalConfidence,
        qualityAssuranceScore,
        overallReliability,
        crossValidationCount: crossValidatedCount,
        qualityFlaggedCount,
        enhancedMetrics: {
          questionsWithClearAnswers: questionGroups.filter(q => q.selectedAnswer && !q.reviewRequired).length,
          questionsWithMultipleMarks: questionGroups.filter(q => q.hasMultipleMarks).length,
          questionsNeedingReview: questionGroups.filter(q => q.reviewRequired).length,
          highConfidenceAnswers: enhancedAnswers.filter(a => a.confidence > 0.8).length,
          reviewFlaggedAnswers: enhancedAnswers.filter(a => a.reviewFlag).length
        }
      },
      answerPatternAnalysis: parsedData.answerPatternAnalysis,
      metadata: {
        totalPages: pages.length || 1,
        processingNotes: parsedData.processingNotes
      }
    }

    console.log('Enhanced question-based processing completed successfully')
    console.log('Enhanced metrics:', {
      overallReliability: (overallReliability * 100).toFixed(1) + '%',
      totalQuestions: questionGroups.length,
      questionsWithAnswers: questionGroups.filter(q => q.selectedAnswer).length,
      crossValidatedAnswers: crossValidatedCount,
      qualityFlaggedAnswers: qualityFlaggedCount,
      questionsNeedingReview: questionGroups.filter(q => q.reviewRequired).length
    })

    return new Response(
      JSON.stringify({
        extractedText,
        examId: parsedData.examId,
        studentName: parsedData.studentName,
        fileName,
        structuredData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in enhanced question-based bubble detection function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check your internet connection',
          'Verify the document is clear and readable',
          'Try uploading a smaller file size',
          'Wait a moment and try again',
          'Ensure bubbles are filled clearly and questions are well-spaced'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Enhanced spatial bubble grouping by question
function groupBubblesByQuestion(bubbles: EnhancedBubbleDetection[]): QuestionGroup[] {
  if (bubbles.length === 0) return []
  
  console.log('Starting enhanced spatial bubble grouping for', bubbles.length, 'bubbles')
  
  // Sort bubbles by vertical position first, then horizontal
  const sortedBubbles = bubbles.sort((a, b) => {
    const verticalDiff = a.y - b.y
    if (Math.abs(verticalDiff) < 30) { // Same row tolerance
      return a.x - b.x // Sort horizontally within same row
    }
    return verticalDiff
  })
  
  const questionGroups: QuestionGroup[] = []
  const verticalTolerance = 40 // Pixels tolerance for same question row
  const optionLetters = ['A', 'B', 'C', 'D', 'E']
  
  let currentQuestionNumber = 1
  let currentRowY = sortedBubbles[0]?.y || 0
  let currentRowBubbles: EnhancedBubbleDetection[] = []
  
  for (const bubble of sortedBubbles) {
    const isNewRow = Math.abs(bubble.y - currentRowY) > verticalTolerance
    
    if (isNewRow && currentRowBubbles.length > 0) {
      // Process current row as a question
      const questionGroup = processQuestionRow(currentRowBubbles, currentQuestionNumber, optionLetters)
      questionGroups.push(questionGroup)
      
      // Start new row
      currentQuestionNumber++
      currentRowY = bubble.y
      currentRowBubbles = [bubble]
    } else {
      currentRowBubbles.push(bubble)
      if (!isNewRow) {
        currentRowY = (currentRowY + bubble.y) / 2 // Average Y position
      }
    }
  }
  
  // Process final row
  if (currentRowBubbles.length > 0) {
    const questionGroup = processQuestionRow(currentRowBubbles, currentQuestionNumber, optionLetters)
    questionGroups.push(questionGroup)
  }
  
  console.log(`Grouped ${bubbles.length} bubbles into ${questionGroups.length} questions`)
  
  return questionGroups
}

// Process a row of bubbles as a single question
function processQuestionRow(bubbles: EnhancedBubbleDetection[], questionNumber: number, optionLetters: string[]): QuestionGroup {
  console.log(`Processing question ${questionNumber} with ${bubbles.length} bubbles`)
  
  // Sort bubbles horizontally within the row
  const sortedBubbles = bubbles.sort((a, b) => a.x - b.x)
  
  // Assign option letters based on horizontal position
  sortedBubbles.forEach((bubble, index) => {
    bubble.questionContext = {
      questionNumber,
      spatialGroup: questionNumber,
      optionLetter: optionLetters[index] || `Option${index + 1}`
    }
  })
  
  // Find the best filled bubble (highest confidence among non-empty bubbles)
  const filledBubbles = sortedBubbles.filter(b => 
    b.quality.fillLevel !== 'empty' && b.confidence > 0.2
  )
  
  let selectedAnswer = null
  let hasMultipleMarks = false
  let reviewRequired = false
  const processingNotes: string[] = []
  
  if (filledBubbles.length === 0) {
    processingNotes.push('No filled bubbles detected - marking as no answer')
  } else if (filledBubbles.length === 1) {
    // Single clear answer
    const bestBubble = filledBubbles[0]
    selectedAnswer = {
      optionLetter: bestBubble.questionContext?.optionLetter || 'Unknown',
      bubble: bestBubble,
      confidence: calculateQuestionConfidence(bestBubble, sortedBubbles)
    }
    processingNotes.push(`Single clear answer: ${selectedAnswer.optionLetter}`)
  } else {
    // Multiple filled bubbles - find the best one
    const bestBubble = filledBubbles.reduce((best, current) => {
      // Prefer higher confidence and heavier fill
      const bestScore = best.confidence * getFillLevelScore(best.quality.fillLevel)
      const currentScore = current.confidence * getFillLevelScore(current.quality.fillLevel)
      return currentScore > bestScore ? current : best
    })
    
    // Check if multiple bubbles are significantly filled
    const significantlyFilled = filledBubbles.filter(b => 
      b.confidence > 0.4 && (b.quality.fillLevel === 'medium' || b.quality.fillLevel === 'heavy')
    )
    
    if (significantlyFilled.length > 1) {
      hasMultipleMarks = true
      reviewRequired = true
      processingNotes.push(`Multiple marks detected: ${significantlyFilled.map(b => b.questionContext?.optionLetter).join(', ')}`)
    }
    
    selectedAnswer = {
      optionLetter: bestBubble.questionContext?.optionLetter || 'Unknown',
      bubble: bestBubble,
      confidence: hasMultipleMarks ? 
        Math.min(0.6, calculateQuestionConfidence(bestBubble, sortedBubbles)) :
        calculateQuestionConfidence(bestBubble, sortedBubbles)
    }
    
    processingNotes.push(`Selected best answer: ${selectedAnswer.optionLetter} (from ${filledBubbles.length} filled bubbles)`)
  }
  
  // Additional quality checks
  if (selectedAnswer && selectedAnswer.bubble.quality.fillLevel === 'light') {
    reviewRequired = true
    processingNotes.push('Light bubble fill detected - review recommended')
  }
  
  if (selectedAnswer && selectedAnswer.bubble.quality.fillLevel === 'overfilled') {
    reviewRequired = true
    processingNotes.push('Overfilled bubble detected - possible erasure')
  }
  
  return {
    questionNumber,
    bubbles: sortedBubbles,
    selectedAnswer,
    hasMultipleMarks,
    reviewRequired,
    processingNotes
  }
}

// Calculate confidence based on bubble quality within question context
function calculateQuestionConfidence(selectedBubble: EnhancedBubbleDetection, allBubbles: EnhancedBubbleDetection[]): number {
  let confidence = selectedBubble.confidence
  
  // Boost confidence based on fill level
  switch (selectedBubble.quality.fillLevel) {
    case 'heavy': confidence = Math.min(0.95, confidence + 0.2); break
    case 'medium': confidence = Math.min(0.85, confidence + 0.1); break
    case 'light': confidence = Math.max(0.3, confidence - 0.1); break
    case 'overfilled': confidence = Math.max(0.4, confidence - 0.05); break
  }
  
  // Reduce confidence if other bubbles also show some fill
  const otherFilledBubbles = allBubbles.filter(b => 
    b !== selectedBubble && b.quality.fillLevel !== 'empty' && b.confidence > 0.2
  )
  
  if (otherFilledBubbles.length > 0) {
    confidence = Math.max(0.3, confidence - (otherFilledBubbles.length * 0.1))
  }
  
  return Math.min(0.99, Math.max(0.01, confidence))
}

// Get numeric score for fill level (for comparison)
function getFillLevelScore(fillLevel: string): number {
  switch (fillLevel) {
    case 'heavy': return 1.0
    case 'medium': return 0.8
    case 'light': return 0.5
    case 'overfilled': return 0.7
    case 'empty': return 0.1
    default: return 0.1
  }
}

// Assess overall quality of question group
function assessQuestionQuality(questionGroup: QuestionGroup) {
  return {
    bubbleCount: questionGroup.bubbles.length,
    maxBubbleConfidence: questionGroup.selectedAnswer?.confidence || 0,
    fillLevelConsistency: calculateFillConsistency(questionGroup.bubbles),
    spatialAlignment: calculateSpatialAlignment(questionGroup.bubbles)
  }
}

// Enhanced bubble quality assessment
function assessBubbleQuality(bubble: any, allBubbles: any[]): BubbleQuality {
  const confidence = bubble.confidence || 0
  
  let fillLevel: BubbleQuality['fillLevel'] = 'empty'
  
  if (confidence < 0.3) {
    fillLevel = 'empty'
  } else if (confidence < 0.5) {
    fillLevel = 'light'
  } else if (confidence < 0.8) {
    fillLevel = 'medium'
  } else if (confidence < 0.95) {
    fillLevel = 'heavy'
  } else {
    fillLevel = 'overfilled'
  }
  
  const spatialConsistency = calculateSpatialConsistency(bubble, allBubbles)
  
  return {
    fillLevel,
    confidence,
    detectionMethod: confidence > 0.5 ? 'roboflow_confident' : 'roboflow_weak',
    spatialConsistency
  }
}

// Determine bubble context within question groups
function determineBubbleContext(bubble: any, allBubbles: any[], index: number) {
  // Simple spatial grouping - group bubbles that are vertically aligned
  const verticalThreshold = 50 // pixels
  const questionNumber = Math.floor(index / 5) + 1 // Assume 5 options per question
  
  const spatialGroup = allBubbles.filter(b => 
    Math.abs(b.y - bubble.y) < verticalThreshold
  ).length
  
  return {
    questionNumber,
    spatialGroup
  }
}

// Enhanced confidence calculation
function calculateEnhancedConfidence(aiAnswer: any, bubbles: any[]): number {
  if (!aiAnswer) return 0.1
  
  let baseConfidence = 0.5
  
  // Base confidence from AI detection
  switch (aiAnswer.confidence) {
    case 'high': baseConfidence = 0.9; break
    case 'medium': baseConfidence = 0.6; break
    case 'low': baseConfidence = 0.3; break
    default: baseConfidence = 0.2
  }
  
  // Adjust based on bubble quality
  if (bubbles.length > 0) {
    const bestBubble = bubbles.reduce((best, current) => 
      current.quality.confidence > best.quality.confidence ? current : best
    )
    
    switch (bestBubble.quality.fillLevel) {
      case 'heavy':
      case 'medium':
        baseConfidence = Math.min(0.95, baseConfidence + 0.2)
        break
      case 'light':
        baseConfidence = Math.max(0.3, baseConfidence - 0.2)
        break
      case 'empty':
        baseConfidence = Math.max(0.1, baseConfidence - 0.4)
        break
      case 'overfilled':
        baseConfidence = Math.max(0.4, baseConfidence - 0.1)
        break
    }
  }
  
  return Math.min(0.99, Math.max(0.01, baseConfidence))
}

// Assess overall answer quality
function assessAnswerQuality(aiAnswer: any, bubbles: any[]) {
  return {
    bubbleCount: bubbles.length,
    maxBubbleConfidence: bubbles.length > 0 ? Math.max(...bubbles.map(b => b.quality.confidence)) : 0,
    fillLevelConsistency: bubbles.length > 0 ? calculateFillConsistency(bubbles) : 0,
    spatialAlignment: bubbles.length > 0 ? calculateSpatialAlignment(bubbles) : 0
  }
}

function calculateSpatialConsistency(bubble: any, allBubbles: any[]): number {
  return 0.8
}

function calculateFillConsistency(bubbles: any[]): number {
  if (bubbles.length === 0) return 0
  
  const fillLevels = bubbles.map(b => b.quality.fillLevel)
  const uniqueLevels = new Set(fillLevels)
  
  return uniqueLevels.size === 1 ? 1.0 : 0.5
}

function calculateSpatialAlignment(bubbles: any[]): number {
  if (bubbles.length < 2) return 1.0
  
  const xPositions = bubbles.map(b => b.x)
  const yPositions = bubbles.map(b => b.y)
  
  const xVariance = calculateVariance(xPositions)
  const yVariance = calculateVariance(yPositions)
  
  return Math.max(0, 1 - (xVariance + yVariance) / 10000)
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length
  return variance
}
