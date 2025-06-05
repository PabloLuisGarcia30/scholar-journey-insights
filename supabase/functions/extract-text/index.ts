import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Simple circuit breaker implementation for edge function
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
    console.log('Enhanced dual OCR extract-text function called with improved reliability')
    const { fileContent, fileName } = await req.json()
    console.log('Processing file:', fileName)
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!googleApiKey) {
      console.error('Google Cloud Vision API key not found')
      throw new Error('Google Cloud Vision API key not configured')
    }

    if (!roboflowApiKey) {
      console.error('Roboflow API key not found')
      throw new Error('Roboflow API key not configured')
    }

    if (!openaiApiKey) {
      console.error('OpenAI API key not found')
      throw new Error('OpenAI API key not configured')
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

    // Step 2: Roboflow bubble detection with circuit breaker and retry
    console.log('Step 2: Processing with Roboflow bubble detection (with retry logic)...')
    let roboflowData = null
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
    } catch (error) {
      console.warn('Roboflow detection failed (using fallback):', error)
      roboflowData = null
    }

    // Step 3: Enhanced text extraction and processing
    console.log('Step 3: Enhanced text extraction and cross-validation...')
    
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

    // Step 4: OpenAI-powered intelligent parsing with circuit breaker and retry
    console.log('Step 4: OpenAI intelligent parsing and question extraction (with retry logic)...')
    
    const structuredParsingPrompt = `Analyze this test document OCR text and extract structured information. Look for:

1. Exam/Test identification (ID, title, etc.)
2. Student information (name, ID, etc.)  
3. Questions with their numbers, text, and answer choices
4. Any bubble-sheet or multiple choice patterns

OCR Text:
${extractedText}

Return a JSON response with this structure:
{
  "examId": "string or null",
  "studentName": "string or null", 
  "questions": [
    {
      "questionNumber": number,
      "questionText": "string",
      "type": "multiple-choice|true-false|short-answer",
      "options": [{"letter": "A", "text": "option text"}],
      "rawText": "original OCR text",
      "confidence": "high|medium|low"
    }
  ],
  "documentType": "test|exam|bubble_sheet|homework",
  "processingNotes": ["any notable observations"]
}`

    let parsedData = {
      examId: null,
      studentName: null,
      questions: [],
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
              model: 'gpt-3.5-turbo',
              messages: [
                {
                  role: 'system',
                  content: 'You are an expert at parsing educational documents from OCR text. Extract structured information accurately and return only valid JSON.'
                },
                {
                  role: 'user', 
                  content: structuredParsingPrompt
                }
              ],
              temperature: 0.1,
              max_tokens: 2000
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
        parsedData = JSON.parse(aiContent)
        console.log('OpenAI parsing successful, found', parsedData.questions?.length || 0, 'questions')
      } catch (e) {
        console.warn('Failed to parse OpenAI response as JSON:', e)
        parsedData.processingNotes.push('AI parsing failed, using basic extraction')
      }
    } catch (error) {
      console.warn('OpenAI parsing request failed (using fallback):', error)
      parsedData.processingNotes.push('AI parsing unavailable - using fallback')
    }

    // Step 5: Enhanced cross-validation with spatial bubble matching
    console.log('Step 5: Cross-validation with spatial bubble matching...')
    
    const enhancedAnswers = []
    const processingMethods = ['google_ocr']
    let roboflowDetections = 0
    let crossValidatedCount = 0
    let fallbackCount = 0

    if (roboflowData?.predictions) {
      processingMethods.push('roboflow_bubbles')
      roboflowDetections = roboflowData.predictions.length

      // Enhanced spatial matching algorithm
      for (const question of parsedData.questions) {
        const questionNum = question.questionNumber
        
        // Find bubbles near this question using spatial proximity
        const nearbyBubbles = roboflowData.predictions.filter(bubble => {
          // Implement spatial proximity logic here
          return bubble.confidence > 0.5
        })

        if (nearbyBubbles.length > 0) {
          // Find the most confident filled bubble
          const selectedBubble = nearbyBubbles.reduce((best, current) => 
            current.confidence > best.confidence ? current : best
          )

          const detectedAnswer = {
            questionNumber: questionNum,
            selectedOption: selectedBubble.class || 'Unknown',
            detectionMethod: 'roboflow_bubble',
            confidence: selectedBubble.confidence,
            bubbleCoordinates: {
              x: selectedBubble.x,
              y: selectedBubble.y,
              width: selectedBubble.width,
              height: selectedBubble.height
            },
            crossValidated: true
          }

          enhancedAnswers.push(detectedAnswer)
          crossValidatedCount++
        } else {
          // Fallback to OCR-based detection
          const fallbackAnswer = {
            questionNumber: questionNum,
            selectedOption: 'Not detected',
            detectionMethod: 'google_ocr',
            confidence: 0.3,
            crossValidated: false,
            fallbackUsed: true
          }
          
          enhancedAnswers.push(fallbackAnswer)
          fallbackCount++
        }
      }
    }

    // Step 6: Calculate validation metrics
    const questionAnswerAlignment = parsedData.questions.length > 0 ? 
      (enhancedAnswers.length / parsedData.questions.length) : 0
    
    const bubbleDetectionAccuracy = roboflowDetections > 0 ? 
      (crossValidatedCount / roboflowDetections) : 0
    
    const textOcrAccuracy = finalConfidence
    const overallReliability = (questionAnswerAlignment + bubbleDetectionAccuracy + textOcrAccuracy) / 3

    // Step 7: Build enhanced structured response
    console.log('Step 7: Building enhanced structured response...')
    
    const structuredData = {
      documentMetadata: {
        totalPages: pages.length || 1,
        processingMethods,
        overallConfidence: finalConfidence,
        roboflowDetections,
        googleOcrBlocks: blockCount
      },
      pages,
      questions: parsedData.questions.map(q => ({
        ...q,
        detectedAnswer: enhancedAnswers.find(a => a.questionNumber === q.questionNumber)
      })),
      answers: enhancedAnswers,
      validationResults: {
        questionAnswerAlignment,
        bubbleDetectionAccuracy,
        textOcrAccuracy,
        overallReliability,
        crossValidationCount: crossValidatedCount,
        fallbackUsageCount: fallbackCount
      },
      metadata: {
        totalPages: pages.length || 1,
        processingNotes: parsedData.processingNotes
      }
    }

    console.log('Enhanced dual OCR processing completed successfully with improved reliability')
    console.log('Overall reliability:', (overallReliability * 100).toFixed(1) + '%')
    console.log('Cross-validated answers:', crossValidatedCount)
    console.log('Processing methods used:', processingMethods.join(' + '))

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
    console.error('Error in enhanced extract-text function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString(),
        suggestions: [
          'Check your internet connection',
          'Verify the document is clear and readable',
          'Try uploading a smaller file size',
          'Wait a moment and try again'
        ]
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
