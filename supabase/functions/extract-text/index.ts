
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
  };
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
    console.log('Enhanced bubble detection OCR function called with improved reliability')
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
    console.log('Step 1: Processing with Google Cloud Vision OCR (with retry logic)...')
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

    // Step 2: Enhanced Roboflow bubble detection with multiple thresholds
    console.log('Step 2: Enhanced Roboflow bubble detection with quality assessment...')
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
      
      // Enhanced bubble quality assessment
      if (roboflowData?.predictions) {
        enhancedBubbles = roboflowData.predictions.map((bubble, index) => {
          const quality = assessBubbleQuality(bubble, roboflowData.predictions)
          const questionContext = determineBubbleContext(bubble, roboflowData.predictions, index)
          
          return {
            ...bubble,
            quality,
            questionContext
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
      console.warn('Roboflow detection failed (using enhanced fallback):', error)
      roboflowData = null
    }

    // Step 3: Enhanced text extraction and processing
    console.log('Step 3: Enhanced text extraction with bubble context analysis...')
    
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

    // Step 4: Enhanced OpenAI-powered intelligent parsing with bubble quality analysis
    console.log('Step 4: Enhanced OpenAI parsing with bubble quality context...')
    
    const bubbleQualityContext = enhancedBubbles.length > 0 ? 
      `\nBubble Quality Analysis Results:
      - Total bubbles detected: ${enhancedBubbles.length}
      - Empty bubbles: ${enhancedBubbles.filter(b => b.quality.fillLevel === 'empty').length}
      - Lightly filled: ${enhancedBubbles.filter(b => b.quality.fillLevel === 'light').length}
      - Medium filled: ${enhancedBubbles.filter(b => b.quality.fillLevel === 'medium').length}
      - Heavily filled: ${enhancedBubbles.filter(b => b.quality.fillLevel === 'heavy').length}
      - Overfilled: ${enhancedBubbles.filter(b => b.quality.fillLevel === 'overfilled').length}` 
      : ''

    const enhancedParsingPrompt = `Analyze this test document OCR text with enhanced bubble detection context. Pay special attention to answer detection confidence based on bubble quality.

BUBBLE QUALITY CONTEXT:${bubbleQualityContext}

KEY INSTRUCTIONS FOR BUBBLE ANALYSIS:
1. For empty bubbles: Mark as "no_answer" with low confidence
2. For lightly filled bubbles: Use medium confidence, flag for review  
3. For medium/heavy filled: Use high confidence
4. For overfilled bubbles: Flag as potential erasure or mistake
5. Cross-validate bubble positions with OCR text patterns
6. Look for answer patterns that suggest student behavior (e.g., always choosing A)

Extract structured information including:
1. Exam/Test identification with multiple pattern matching
2. Student information (name, ID, email, etc.)  
3. Questions with enhanced answer confidence based on bubble quality
4. Answer detection with quality-based confidence scoring
5. Pattern analysis for inconsistent or questionable answers

OCR Text:
${extractedText}

Return a JSON response with enhanced bubble analysis:
{
  "examId": "string or null",
  "examIdConfidence": "high|medium|low",
  "studentName": "string or null", 
  "studentNameConfidence": "high|medium|low",
  "questions": [
    {
      "questionNumber": number,
      "questionText": "string",
      "type": "multiple-choice|true-false|short-answer",
      "options": [{"letter": "A", "text": "option text"}],
      "detectedAnswer": {
        "selectedOption": "A|B|C|D|E|no_answer",
        "confidence": "high|medium|low|questionable",
        "bubbleQuality": "empty|light|medium|heavy|overfilled",
        "detectionMethod": "bubble_clear|bubble_weak|ocr_pattern|fallback",
        "reviewFlag": boolean,
        "reasoning": "string explaining detection confidence"
      },
      "rawText": "original OCR text",
      "confidence": "high|medium|low"
    }
  ],
  "answerPatternAnalysis": {
    "consistencyScore": number,
    "potentialIssues": ["array of detected issues"],
    "reviewRecommendations": ["array of recommendations"]
  },
  "documentType": "test|exam|bubble_sheet|homework",
  "processingNotes": ["enhanced observations about bubble detection"]
}`

    let parsedData = {
      examId: null,
      examIdConfidence: 'low',
      studentName: null,
      studentNameConfidence: 'low',
      questions: [],
      answerPatternAnalysis: {
        consistencyScore: 0.8,
        potentialIssues: [],
        reviewRecommendations: []
      },
      documentType: 'test',
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
                  content: 'You are an expert at parsing educational documents with enhanced bubble detection. Analyze bubble quality and provide detailed confidence assessments. Handle poorly shaded, empty, and overfilled bubbles appropriately. Return only valid JSON.'
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
        console.log('Enhanced OpenAI parsing successful, found', parsedData.questions?.length || 0, 'questions')
        console.log('Answer pattern analysis:', parsedData.answerPatternAnalysis)
      } catch (e) {
        console.warn('Failed to parse enhanced OpenAI response as JSON:', e)
        parsedData.processingNotes.push('Enhanced AI parsing failed, using enhanced fallback')
      }
    } catch (error) {
      console.warn('Enhanced OpenAI parsing request failed (using enhanced fallback):', error)
      parsedData.processingNotes.push('Enhanced AI parsing unavailable - using enhanced fallback')
    }

    // Step 5: Enhanced cross-validation with quality-based confidence scoring
    console.log('Step 5: Enhanced cross-validation with quality-based scoring...')
    
    const enhancedAnswers = []
    const processingMethods = ['google_ocr', 'enhanced_bubble_analysis']
    let crossValidatedCount = 0
    let qualityFlaggedCount = 0

    for (const question of parsedData.questions) {
      const questionNum = question.questionNumber
      const aiDetectedAnswer = question.detectedAnswer
      
      // Find corresponding enhanced bubble data
      const questionBubbles = enhancedBubbles.filter(bubble => 
        bubble.questionContext?.questionNumber === questionNum
      )

      let finalAnswer = {
        questionNumber: questionNum,
        selectedOption: aiDetectedAnswer?.selectedOption || 'no_answer',
        detectionMethod: aiDetectedAnswer?.detectionMethod || 'fallback',
        confidence: calculateEnhancedConfidence(aiDetectedAnswer, questionBubbles),
        bubbleQuality: aiDetectedAnswer?.bubbleQuality || 'unknown',
        crossValidated: questionBubbles.length > 0,
        reviewFlag: aiDetectedAnswer?.reviewFlag || false,
        qualityAssessment: assessAnswerQuality(aiDetectedAnswer, questionBubbles),
        processingNotes: []
      }

      // Enhanced validation logic
      if (questionBubbles.length > 0) {
        const bestBubble = questionBubbles.reduce((best, current) => 
          current.quality.confidence > best.quality.confidence ? current : best
        )

        // Cross-validate AI detection with bubble analysis
        if (bestBubble.quality.fillLevel === 'empty' && finalAnswer.selectedOption !== 'no_answer') {
          finalAnswer.reviewFlag = true
          finalAnswer.processingNotes.push('AI detected answer but bubble appears empty')
          finalAnswer.confidence = Math.min(finalAnswer.confidence, 0.3)
        } else if (bestBubble.quality.fillLevel === 'light' && finalAnswer.confidence > 0.7) {
          finalAnswer.confidence = 0.6 // Reduce confidence for lightly filled bubbles
          finalAnswer.processingNotes.push('Light bubble fill detected - reduced confidence')
        } else if (bestBubble.quality.fillLevel === 'overfilled') {
          finalAnswer.reviewFlag = true
          finalAnswer.processingNotes.push('Overfilled bubble detected - possible erasure')
        }

        crossValidatedCount++
      }

      if (finalAnswer.reviewFlag) {
        qualityFlaggedCount++
      }

      enhancedAnswers.push(finalAnswer)
    }

    // Step 6: Calculate enhanced validation metrics
    const questionAnswerAlignment = parsedData.questions.length > 0 ? 
      (enhancedAnswers.length / parsedData.questions.length) : 0
    
    const bubbleDetectionAccuracy = enhancedBubbles.length > 0 ? 
      (crossValidatedCount / enhancedBubbles.length) : 0
    
    const qualityAssuranceScore = enhancedAnswers.length > 0 ?
      (enhancedAnswers.filter(a => a.confidence > 0.7).length / enhancedAnswers.length) : 0
    
    const overallReliability = (questionAnswerAlignment + bubbleDetectionAccuracy + finalConfidence + qualityAssuranceScore) / 4

    // Step 7: Build enhanced structured response
    console.log('Step 7: Building enhanced structured response...')
    
    const structuredData = {
      documentMetadata: {
        totalPages: pages.length || 1,
        processingMethods,
        overallConfidence: finalConfidence,
        roboflowDetections: enhancedBubbles.length,
        googleOcrBlocks: blockCount,
        enhancedFeatures: {
          bubbleQualityAnalysis: true,
          crossValidation: true,
          confidenceScoring: true,
          reviewFlags: true
        }
      },
      pages,
      questions: parsedData.questions.map(q => ({
        ...q,
        detectedAnswer: enhancedAnswers.find(a => a.questionNumber === q.questionNumber)
      })),
      answers: enhancedAnswers,
      enhancedBubbleData: enhancedBubbles,
      validationResults: {
        questionAnswerAlignment,
        bubbleDetectionAccuracy,
        textOcrAccuracy: finalConfidence,
        qualityAssuranceScore,
        overallReliability,
        crossValidationCount: crossValidatedCount,
        qualityFlaggedCount,
        enhancedMetrics: {
          emptyBubbles: enhancedBubbles.filter(b => b.quality.fillLevel === 'empty').length,
          lightBubbles: enhancedBubbles.filter(b => b.quality.fillLevel === 'light').length,
          questionableBubbles: enhancedBubbles.filter(b => b.quality.fillLevel === 'overfilled').length,
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

    console.log('Enhanced bubble detection processing completed successfully')
    console.log('Enhanced metrics:', {
      overallReliability: (overallReliability * 100).toFixed(1) + '%',
      crossValidatedAnswers: crossValidatedCount,
      qualityFlaggedAnswers: qualityFlaggedCount,
      bubbleQualityDistribution: {
        empty: enhancedBubbles.filter(b => b.quality.fillLevel === 'empty').length,
        light: enhancedBubbles.filter(b => b.quality.fillLevel === 'light').length,
        medium: enhancedBubbles.filter(b => b.quality.fillLevel === 'medium').length,
        heavy: enhancedBubbles.filter(b => b.quality.fillLevel === 'heavy').length,
        overfilled: enhancedBubbles.filter(b => b.quality.fillLevel === 'overfilled').length
      }
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
    console.error('Error in enhanced bubble detection function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check your internet connection',
          'Verify the document is clear and readable',
          'Try uploading a smaller file size',
          'Wait a moment and try again',
          'Check if bubbles are clearly marked and not too light'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

// Enhanced bubble quality assessment function
function assessBubbleQuality(bubble: any, allBubbles: any[]): BubbleQuality {
  const confidence = bubble.confidence || 0
  
  // Determine fill level based on confidence and class
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
  
  // Calculate spatial consistency (how well positioned relative to other bubbles)
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
  // Simple implementation - can be enhanced
  return 0.8
}

function calculateFillConsistency(bubbles: any[]): number {
  if (bubbles.length === 0) return 0
  
  const fillLevels = bubbles.map(b => b.quality.fillLevel)
  const uniqueLevels = new Set(fillLevels)
  
  // Higher consistency when bubbles have similar fill levels
  return uniqueLevels.size === 1 ? 1.0 : 0.5
}

function calculateSpatialAlignment(bubbles: any[]): number {
  if (bubbles.length < 2) return 1.0
  
  // Calculate variance in x,y positions - lower variance = better alignment
  const xPositions = bubbles.map(b => b.x)
  const yPositions = bubbles.map(b => b.y)
  
  const xVariance = calculateVariance(xPositions)
  const yVariance = calculateVariance(yPositions)
  
  // Convert variance to alignment score (0-1)
  return Math.max(0, 1 - (xVariance + yVariance) / 10000)
}

function calculateVariance(numbers: number[]): number {
  const mean = numbers.reduce((a, b) => a + b, 0) / numbers.length
  const variance = numbers.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / numbers.length
  return variance
}
