
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Extract-text function called')
    const { fileContent, fileName } = await req.json()
    console.log('Processing file:', fileName)
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    if (!googleApiKey) {
      console.error('Google Cloud Vision API key not configured')
      throw new Error('Google Cloud Vision API key not configured')
    }

    // Call Google Cloud Vision OCR
    const ocrPayload = {
      requests: [
        {
          image: {
            content: fileContent
          },
          features: [
            {
              type: "TEXT_DETECTION"
            }
          ]
        }
      ]
    }

    console.log('Calling Google Cloud Vision API...')
    const ocrResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(ocrPayload)
    })

    if (!ocrResponse.ok) {
      console.error('Google OCR error:', ocrResponse.statusText)
      throw new Error(`Google OCR error: ${ocrResponse.statusText}`)
    }

    const ocrResult = await ocrResponse.json()
    console.log('OCR result received')
    const extractedText = ocrResult.responses[0]?.textAnnotations?.[0]?.description || ""
    
    // Extract Exam ID from the text
    const examIdPatterns = [
      /EXAM\s*ID[\s:]*([A-Z0-9\-_]+)/i,
      /TEST\s*ID[\s:]*([A-Z0-9\-_]+)/i,
      /ID[\s:]*([A-Z0-9\-_]{3,})/i,
      /EXAM[\s:]*([A-Z0-9\-_]{3,})/i
    ]

    let examId = null
    for (const pattern of examIdPatterns) {
      const match = extractedText.match(pattern)
      if (match && match[1]) {
        examId = match[1].trim()
        break
      }
    }

    console.log('Extracted exam ID:', examId)

    return new Response(
      JSON.stringify({
        extractedText,
        examId,
        fileName
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in extract-text function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})
