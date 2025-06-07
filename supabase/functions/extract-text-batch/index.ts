import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { DOMParser } from 'https://deno.land/x/deno_dom/deno-dom-wasm.ts'
import { extract as extractTables } from "https://esm.sh/@extractus/article-tables@1.0.1"
import { extract as extractArticle } from "@extractus/article-extractor"
import { CircuitBreaker, withRetry } from "../utils/circuitBreaker.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const googleVisionBreaker = new CircuitBreaker(3, 30000)
const openaiBreaker = new CircuitBreaker(3, 30000)

async function processBatch(files, googleApiKey, roboflowApiKey, openaiApiKey) {
  const results = []
  for (const file of files) {
    try {
      const result = await processIndividualFile(file, googleApiKey, roboflowApiKey, openaiApiKey)
      results.push(result)
    } catch (error) {
      console.error('Error processing file:', file.fileName, error)
      results.push({
        fileName: file.fileName,
        error: error.message || 'Processing failed',
      })
    }
  }
  return results
}

async function processIndividualFile(file, googleApiKey, roboflowApiKey, openaiApiKey) {
  const { fileContent, fileName } = file
  console.log('Processing individual file:', fileName)

  // Step 1: Google Vision OCR
  let extractedText = ''
  try {
    const visionResult = await googleVisionBreaker.execute(async () => {
      const visionResponse = await fetch(
        `https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            requests: [
              {
                image: {
                  content: fileContent,
                },
                features: [{ type: 'TEXT_DETECTION' }],
              },
            ],
          }),
        }
      )

      if (!visionResponse.ok) {
        throw new Error(`Google Vision API error: ${visionResponse.status}`)
      }

      return await visionResponse.json()
    }, 'GoogleVision')

    extractedText = visionResult.responses?.[0]?.fullTextAnnotation?.text || ''
    console.log('Google Vision OCR completed for', fileName, 'length:', extractedText.length)
  } catch (error) {
    console.warn('Google Vision OCR failed for', fileName, ':', error)
  }

  // Step 2: Roboflow Bubble Detection (example - adapt to your actual Roboflow usage)
  let roboflowDetections = []
  try {
    if (roboflowApiKey) {
      // Placeholder - replace with your actual Roboflow API call
      // This is just an example, adapt it to your specific Roboflow API endpoint and expected response structure
      const roboflowResponse = await fetch(
        `https://detect.roboflow.com/test-form-bubbles/1?api_key=${roboflowApiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            image: fileContent, // Base64 encoded image
            confidence: 0.7,
            overlap: 0.5,
          }),
        }
      )

      if (!roboflowResponse.ok) {
        throw new Error(`Roboflow API error: ${roboflowResponse.status}`)
      }

      const roboflowData = await roboflowResponse.json()
      roboflowDetections = roboflowData.predictions || []
      console.log('Roboflow bubble detection completed for', fileName, 'found', roboflowDetections.length, 'bubbles')
    } else {
      console.warn('Roboflow API key not configured, skipping bubble detection')
    }
  } catch (error) {
    console.warn('Roboflow bubble detection failed for', fileName, ':', error)
  }

  // Step 3: Enhanced parsing (example using deno-dom and extractus)
  let structuredData = null
  try {
    const dom = new DOMParser().parseFromString(extractedText, 'text/html')
    if (dom) {
      const article = extractArticle(extractedText)
      const tables = extractTables(extractedText)

      structuredData = {
        title: article?.title,
        content: article?.content,
        tables: tables,
      }
      console.log('Enhanced parsing completed for', fileName, 'found title:', structuredData.title)
    }
  } catch (error) {
    console.warn('Enhanced parsing failed for', fileName, ':', error)
  }

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
  return {
    fileName: fileName,
    extractedText: extractedText,
    roboflowDetections: roboflowDetections,
    structuredData: structuredData,
    examId: parsedData.examId,
    studentName: parsedData.studentName,
    questions: parsedData.questions,
    documentType: parsedData.documentType,
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { files } = await req.json()
    console.log('Received batch of', files.length, 'files for processing')

    const googleApiKey = Deno.env.get('GOOGLE_VISION_API_KEY')
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY')
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY')

    if (!googleApiKey) {
      throw new Error('Google Vision API key not configured')
    }
    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    const results = await processBatch(files, googleApiKey, roboflowApiKey, openaiApiKey)

    return new Response(
      JSON.stringify({ results }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )
  } catch (error) {
    console.error('Batch processing error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})
