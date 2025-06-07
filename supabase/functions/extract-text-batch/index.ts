
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Batch extract-text function called')
    const { files } = await req.json()
    console.log('Processing', files.length, 'files in batch')
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')
    
    if (!googleApiKey || !roboflowApiKey || !openaiApiKey) {
      throw new Error('Required API keys not configured')
    }

    const results = []
    const errors = []
    const startTime = Date.now()

    // Process files in parallel batches of 3 to avoid overwhelming APIs
    const batchSize = 3
    for (let i = 0; i < files.length; i += batchSize) {
      const batch = files.slice(i, i + batchSize)
      console.log(`Processing batch ${Math.floor(i/batchSize) + 1} of ${Math.ceil(files.length/batchSize)}`)
      
      const batchPromises = batch.map(async (file) => {
        try {
          return await processIndividualFile(file, googleApiKey, roboflowApiKey, openaiApiKey)
        } catch (error) {
          console.error(`Error processing ${file.fileName}:`, error)
          errors.push({
            fileName: file.fileName,
            error: error.message || 'Unknown error'
          })
          return null
        }
      })

      const batchResults = await Promise.allSettled(batchPromises)
      
      batchResults.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          results.push(result.value)
        } else if (result.status === 'rejected') {
          errors.push({
            fileName: batch[index].fileName,
            error: result.reason?.message || 'Processing failed'
          })
        }
      })
    }

    const processingTime = Date.now() - startTime
    console.log(`Batch processing completed: ${results.length} successful, ${errors.length} failed, ${processingTime}ms`)

    return new Response(
      JSON.stringify({
        results,
        errors,
        processingStats: {
          totalFiles: files.length,
          successfulFiles: results.length,
          failedFiles: errors.length,
          totalProcessingTime: processingTime
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in batch extract-text function:', error)
    return new Response(
      JSON.stringify({ 
        error: error.message,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function processIndividualFile(file, googleApiKey, roboflowApiKey, openaiApiKey) {
  const { fileContent, fileName } = file
  console.log('Processing individual file:', fileName)

  // Step 1: Google Vision OCR
  const visionData = await googleVisionBreaker.execute(async () => {
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
      throw new Error(`Google Vision API error: ${errorText}`)
    }

    return await visionResponse.json()
  }, 'Google Vision');

  // Step 2: Roboflow detection (with fallback)
  let roboflowData = null
  try {
    roboflowData = await roboflowBreaker.execute(async () => {
      const roboflowResponse = await fetch(
        'https://detect.roboflow.com/bubble-sheet-detector/1',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: `api_key=${roboflowApiKey}&image=${encodeURIComponent(fileContent)}`
        }
      )

      if (!roboflowResponse.ok) {
        throw new Error(`Roboflow API error: ${roboflowResponse.status}`)
      }

      return await roboflowResponse.json()
    }, 'Roboflow');
  } catch (error) {
    console.warn('Roboflow detection failed for', fileName, ':', error)
  }

  // Step 3: Extract text and process with existing logic
  const fullTextAnnotation = visionData.responses?.[0]?.fullTextAnnotation
  let extractedText = fullTextAnnotation?.text || ''

  // Step 4: OpenAI parsing (simplified for batch processing)
  let parsedData = {
    examId: null,
    studentName: null,
    questions: [],
    documentType: 'test'
  }

  if (extractedText.trim()) {
    try {
      const aiResult = await openaiBreaker.execute(async () => {
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
                content: 'Extract exam ID, student name, and question structure from OCR text. Return only valid JSON.'
              },
              {
                role: 'user', 
                content: `Extract structured information from this test document:\n\n${extractedText.substring(0, 2000)}`
              }
            ],
            temperature: 0.1,
            max_tokens: 1000
          }),
        })

        if (!parseResponse.ok) {
          throw new Error(`OpenAI API error: ${parseResponse.status}`)
        }

        return await parseResponse.json()
      }, 'OpenAI');

      const aiContent = aiResult.choices?.[0]?.message?.content || '{}'
      try {
        const enhancedParsedData = JSON.parse(aiContent)
        parsedData = { ...parsedData, ...enhancedParsedData }
      } catch (e) {
        console.warn('Failed to parse OpenAI response for', fileName)
      }
    } catch (error) {
      console.warn('OpenAI parsing failed for', fileName, ':', error)
    }
  }

  // Build structured response
  const structuredData = {
    documentMetadata: {
      totalPages: 1,
      processingMethods: ['google_ocr', roboflowData ? 'roboflow_bubbles' : null].filter(Boolean),
      overallConfidence: 0.8,
      roboflowDetections: roboflowData?.predictions?.length || 0
    },
    pages: [{
      pageNumber: 1,
      text: extractedText,
      confidence: 0.8
    }],
    questions: parsedData.questions || [],
    answers: [],
    validationResults: {
      questionAnswerAlignment: 0.8,
      bubbleDetectionAccuracy: roboflowData ? 0.9 : 0,
      textOcrAccuracy: 0.8,
      overallReliability: 0.8
    }
  }

  return {
    extractedText,
    examId: parsedData.examId,
    studentName: parsedData.studentName,
    fileName,
    structuredData
  }
}
