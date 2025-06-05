
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

    // Call Google Cloud Vision OCR with enhanced features
    const ocrPayload = {
      requests: [
        {
          image: {
            content: fileContent
          },
          features: [
            {
              type: "TEXT_DETECTION"
            },
            {
              type: "DOCUMENT_TEXT_DETECTION"
            }
          ]
        }
      ]
    }

    console.log('Calling Google Cloud Vision API with enhanced detection...')
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
    console.log('Enhanced OCR result received')
    
    const response = ocrResult.responses[0]
    const extractedText = response?.textAnnotations?.[0]?.description || ""
    const fullTextAnnotation = response?.fullTextAnnotation

    // Parse structured content from OCR
    const structuredData = parseStructuredContent(extractedText, fullTextAnnotation)
    
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

    // Extract Student Name from the text with improved patterns
    const studentNamePatterns = [
      /(?:STUDENT\s*NAME|NAME|STUDENT)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
      /(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\n|$)/,
      /(?:BY|SUBMITTED BY|FOR)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
    ]

    let studentName = null
    for (const pattern of studentNamePatterns) {
      const match = extractedText.match(pattern)
      if (match && match[1]) {
        const candidate = match[1].trim()
        // Validate the candidate name (2-4 words, reasonable length)
        const words = candidate.split(/\s+/)
        if (words.length >= 2 && words.length <= 4 && candidate.length >= 5 && candidate.length <= 50) {
          // Check if it's not just random OCR noise
          const validNamePattern = /^[A-Za-z\s\-'\.]+$/
          if (validNamePattern.test(candidate)) {
            studentName = candidate
            break
          }
        }
      }
    }

    console.log('Extracted student name:', studentName)

    return new Response(
      JSON.stringify({
        extractedText,
        examId,
        studentName,
        fileName,
        structuredData
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

function parseStructuredContent(extractedText: string, fullTextAnnotation: any) {
  console.log('Parsing structured content from OCR data...')
  
  const lines = extractedText.split('\n').filter(line => line.trim().length > 0)
  const pages = fullTextAnnotation?.pages || []
  
  const structuredData = {
    pages: [] as any[],
    questions: [] as any[],
    answers: [] as any[],
    metadata: {
      totalPages: pages.length,
      processingNotes: [] as string[]
    }
  }

  // Process each page if available
  pages.forEach((page: any, pageIndex: number) => {
    const pageData = {
      pageNumber: pageIndex + 1,
      blocks: [] as any[],
      text: '',
      confidence: page.confidence || 0
    }

    if (page.blocks) {
      page.blocks.forEach((block: any, blockIndex: number) => {
        const blockText = extractBlockText(block)
        const blockData = {
          blockIndex,
          text: blockText,
          confidence: block.confidence || 0,
          boundingBox: block.boundingBox,
          type: classifyBlockType(blockText)
        }
        
        pageData.blocks.push(blockData)
        pageData.text += blockText + '\n'
      })
    }
    
    structuredData.pages.push(pageData)
  })

  // Extract questions and answers from the text
  const questionAnswerPairs = extractQuestionsAndAnswers(lines)
  structuredData.questions = questionAnswerPairs.questions
  structuredData.answers = questionAnswerPairs.answers

  // Add processing notes for unclear content
  if (extractedText.includes('?') && extractedText.split('?').length < 3) {
    structuredData.metadata.processingNotes.push('Limited question marks detected - some questions may be incomplete')
  }
  
  if (extractedText.length < 100) {
    structuredData.metadata.processingNotes.push('Short text detected - document may be incomplete or low quality')
  }

  console.log(`Structured data parsed: ${structuredData.questions.length} questions, ${structuredData.answers.length} answers across ${structuredData.pages.length} pages`)
  
  return structuredData
}

function extractBlockText(block: any): string {
  let blockText = ''
  if (block.paragraphs) {
    block.paragraphs.forEach((paragraph: any) => {
      if (paragraph.words) {
        paragraph.words.forEach((word: any) => {
          if (word.symbols) {
            word.symbols.forEach((symbol: any) => {
              blockText += symbol.text || ''
            })
          }
        })
        blockText += ' '
      }
    })
  }
  return blockText.trim()
}

function classifyBlockType(text: string): string {
  const trimmedText = text.trim()
  
  // Check for question patterns
  if (/^\d+[\.\)]/.test(trimmedText) || trimmedText.includes('?')) {
    return 'question'
  }
  
  // Check for answer patterns
  if (/^[A-D][\.\)]/.test(trimmedText) || /^(A|B|C|D)\s*[:\-]/.test(trimmedText)) {
    return 'multiple_choice_option'
  }
  
  // Check for headers/titles
  if (trimmedText.length < 50 && /^[A-Z\s]+$/.test(trimmedText)) {
    return 'header'
  }
  
  // Check for instructions
  if (trimmedText.toLowerCase().includes('instruction') || trimmedText.toLowerCase().includes('direction')) {
    return 'instruction'
  }
  
  return 'content'
}

function extractQuestionsAndAnswers(lines: string[]) {
  const questions: any[] = []
  const answers: any[] = []
  let currentQuestion: any = null
  let questionCounter = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    // Check if this line starts a new question
    const questionMatch = line.match(/^(\d+)[\.\)](.+)/)
    if (questionMatch) {
      // Save previous question if exists
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      
      questionCounter++
      currentQuestion = {
        questionNumber: parseInt(questionMatch[1]),
        questionText: questionMatch[2].trim(),
        type: line.includes('?') ? 'multiple_choice' : 'short_answer',
        options: [] as string[],
        rawText: line,
        confidence: line.length > 10 ? 'high' : 'medium'
      }
      
      // If the question seems incomplete, mark it
      if (questionMatch[2].trim().length < 10) {
        currentQuestion.confidence = 'low'
        currentQuestion.notes = 'Question text appears incomplete'
      }
    }
    // Check for multiple choice options
    else if (currentQuestion && /^[A-D][\.\)]/.test(line)) {
      const optionMatch = line.match(/^([A-D])[\.\)]\s*(.+)/)
      if (optionMatch) {
        currentQuestion.options.push({
          letter: optionMatch[1],
          text: optionMatch[2].trim() || 'unclear',
          rawText: line
        })
        currentQuestion.type = 'multiple_choice'
      }
    }
    // Check for student answers (circled letters, checkmarks, etc.)
    else if (/^[A-D]$/.test(line) || line.includes('✓') || line.includes('×')) {
      answers.push({
        questionNumber: questionCounter,
        studentAnswer: line.trim(),
        type: 'selected_option',
        rawText: line,
        confidence: line.length === 1 ? 'high' : 'medium'
      })
    }
    // Continuation of question text
    else if (currentQuestion && line.length > 0 && !line.match(/^[A-D][\.\)]/)) {
      // Only add if it seems like a continuation
      if (line.length > 5 && !line.match(/^\d/)) {
        currentQuestion.questionText += ' ' + line
        currentQuestion.rawText += '\n' + line
      }
    }
  }
  
  // Don't forget the last question
  if (currentQuestion) {
    questions.push(currentQuestion)
  }
  
  return { questions, answers }
}
