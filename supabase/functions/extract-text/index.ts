
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BubbleDetection {
  class: string;
  confidence: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface RoboflowResponse {
  predictions: BubbleDetection[];
  image: {
    width: number;
    height: number;
  };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    console.log('Enhanced dual OCR extract-text function called')
    const { fileContent, fileName } = await req.json()
    console.log('Processing file with dual OCR:', fileName)
    
    const googleApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY')
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY')
    
    if (!googleApiKey) {
      console.error('Google Cloud Vision API key not configured')
      throw new Error('Google Cloud Vision API key not configured')
    }

    if (!roboflowApiKey) {
      console.error('Roboflow API key not configured')
      throw new Error('Roboflow API key not configured')
    }

    // Step 1: Run both OCR methods in parallel
    console.log('Running dual OCR: Google Vision + Roboflow bubble detection...')
    
    const [googleResult, roboflowResult] = await Promise.allSettled([
      runGoogleOCR(fileContent, googleApiKey),
      runRoboflowBubbleDetection(fileContent, roboflowApiKey)
    ])

    let googleOcrData = null
    let roboflowData = null

    if (googleResult.status === 'fulfilled') {
      googleOcrData = googleResult.value
      console.log('Google OCR completed successfully')
    } else {
      console.error('Google OCR failed:', googleResult.reason)
    }

    if (roboflowResult.status === 'fulfilled') {
      roboflowData = roboflowResult.value
      console.log('Roboflow bubble detection completed successfully, found', roboflowData?.predictions?.length || 0, 'bubbles')
    } else {
      console.error('Roboflow bubble detection failed:', roboflowResult.reason)
    }

    // Step 2: Process Google OCR data
    const extractedText = googleOcrData?.response?.textAnnotations?.[0]?.description || ""
    const fullTextAnnotation = googleOcrData?.response?.fullTextAnnotation

    // Step 3: Create enhanced structured data by combining both sources
    const enhancedStructuredData = createEnhancedStructuredData(
      extractedText, 
      fullTextAnnotation, 
      roboflowData,
      fileName
    )
    
    // Step 4: Extract Exam ID and Student Name (using Google OCR)
    const examId = extractExamId(extractedText)
    const studentName = extractStudentName(extractedText)

    console.log('Enhanced dual OCR processing completed:')
    console.log('- Exam ID:', examId)
    console.log('- Student Name:', studentName)
    console.log('- Questions detected:', enhancedStructuredData.questions.length)
    console.log('- Answers detected:', enhancedStructuredData.answers.length)
    console.log('- Overall reliability:', enhancedStructuredData.validationResults.overallReliability)

    return new Response(
      JSON.stringify({
        extractedText,
        examId,
        studentName,
        fileName,
        structuredData: enhancedStructuredData
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in enhanced dual OCR extract-text function:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      },
    )
  }
})

async function runGoogleOCR(fileContent: string, apiKey: string) {
  const ocrPayload = {
    requests: [
      {
        image: { content: fileContent },
        features: [
          { type: "TEXT_DETECTION" },
          { type: "DOCUMENT_TEXT_DETECTION" }
        ]
      }
    ]
  }

  const response = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(ocrPayload)
  })

  if (!response.ok) {
    throw new Error(`Google OCR error: ${response.statusText}`)
  }

  const result = await response.json()
  return { response: result.responses[0] }
}

async function runRoboflowBubbleDetection(fileContent: string, apiKey: string): Promise<RoboflowResponse | null> {
  try {
    // Convert base64 to blob for Roboflow
    const imageBlob = new Blob([Uint8Array.from(atob(fileContent), c => c.charCodeAt(0))], { type: 'image/jpeg' })
    
    const formData = new FormData()
    formData.append('file', imageBlob, 'test_image.jpg')

    const response = await fetch(`https://detect.roboflow.com/bubble-sheet-detector/1?api_key=${apiKey}`, {
      method: 'POST',
      body: formData
    })

    if (!response.ok) {
      console.warn('Roboflow API error:', response.statusText)
      return null
    }

    const result = await response.json()
    return result as RoboflowResponse
  } catch (error) {
    console.warn('Roboflow detection failed:', error)
    return null
  }
}

function createEnhancedStructuredData(extractedText: string, fullTextAnnotation: any, roboflowData: RoboflowResponse | null, fileName: string) {
  console.log('Creating enhanced structured data with dual OCR fusion...')
  
  const lines = extractedText.split('\n').filter(line => line.trim().length > 0)
  const pages = fullTextAnnotation?.pages || []
  
  // Initialize enhanced structured data
  const enhancedData = {
    documentMetadata: {
      totalPages: pages.length,
      processingMethods: ['google_ocr'],
      overallConfidence: 0,
      googleOcrBlocks: pages.reduce((sum: number, page: any) => sum + (page.blocks?.length || 0), 0),
      roboflowDetections: 0
    },
    pages: [] as any[],
    questions: [] as any[],
    answers: [] as any[],
    validationResults: {
      questionAnswerAlignment: 0,
      bubbleDetectionAccuracy: 0,
      textOcrAccuracy: 0,
      overallReliability: 0,
      crossValidationCount: 0,
      fallbackUsageCount: 0
    },
    metadata: {
      totalPages: pages.length,
      processingNotes: [] as string[]
    }
  }

  // Add Roboflow to processing methods if available
  if (roboflowData?.predictions) {
    enhancedData.documentMetadata.processingMethods.push('roboflow_bubbles')
    enhancedData.documentMetadata.roboflowDetections = roboflowData.predictions.length
  }

  // Process pages from Google OCR
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
    
    enhancedData.pages.push(pageData)
  })

  // Extract questions using Google OCR
  const questionsFromOCR = extractQuestionsFromOCR(lines)
  
  // Process Roboflow bubble detections
  const bubbleAnswers = roboflowData ? processBubbleDetections(roboflowData) : []
  
  // Perform intelligent data fusion
  const fusedData = performDataFusion(questionsFromOCR, bubbleAnswers, enhancedData)
  
  // Calculate validation metrics
  enhancedData.validationResults = calculateValidationMetrics(fusedData.questions, fusedData.answers, bubbleAnswers)
  
  // Set overall confidence
  enhancedData.documentMetadata.overallConfidence = enhancedData.validationResults.overallReliability
  
  enhancedData.questions = fusedData.questions
  enhancedData.answers = fusedData.answers

  // Add processing notes
  if (roboflowData?.predictions && roboflowData.predictions.length > 0) {
    enhancedData.metadata.processingNotes.push(`Roboflow detected ${roboflowData.predictions.length} bubble marks`)
  }
  if (enhancedData.validationResults.crossValidationCount > 0) {
    enhancedData.metadata.processingNotes.push(`${enhancedData.validationResults.crossValidationCount} answers cross-validated between OCR methods`)
  }
  if (enhancedData.validationResults.fallbackUsageCount > 0) {
    enhancedData.metadata.processingNotes.push(`${enhancedData.validationResults.fallbackUsageCount} answers detected using fallback OCR method`)
  }

  console.log(`Enhanced structured data created: ${enhancedData.questions.length} questions, ${enhancedData.answers.length} answers, reliability: ${enhancedData.validationResults.overallReliability.toFixed(2)}`)
  
  return enhancedData
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
  
  if (/^\d+[\.\)]/.test(trimmedText) || trimmedText.includes('?')) {
    return 'question'
  }
  
  if (/^[A-D][\.\)]/.test(trimmedText) || /^(A|B|C|D)\s*[:\-]/.test(trimmedText)) {
    return 'multiple_choice_option'
  }
  
  if (trimmedText.length < 50 && /^[A-Z\s]+$/.test(trimmedText)) {
    return 'header'
  }
  
  if (trimmedText.toLowerCase().includes('instruction') || trimmedText.toLowerCase().includes('direction')) {
    return 'instruction'
  }
  
  return 'content'
}

function extractQuestionsFromOCR(lines: string[]) {
  const questions: any[] = []
  let currentQuestion: any = null
  let questionCounter = 0
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim()
    
    const questionMatch = line.match(/^(\d+)[\.\)](.+)/)
    if (questionMatch) {
      if (currentQuestion) {
        questions.push(currentQuestion)
      }
      
      questionCounter++
      currentQuestion = {
        questionNumber: parseInt(questionMatch[1]),
        questionText: questionMatch[2].trim(),
        type: line.includes('?') ? 'multiple_choice' : 'short_answer',
        options: [] as any[],
        rawText: line,
        confidence: line.length > 10 ? 'high' : 'medium'
      }
      
      if (questionMatch[2].trim().length < 10) {
        currentQuestion.confidence = 'low'
        currentQuestion.notes = 'Question text appears incomplete'
      }
    }
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
    else if (currentQuestion && line.length > 0 && !line.match(/^[A-D][\.\)]/)) {
      if (line.length > 5 && !line.match(/^\d/)) {
        currentQuestion.questionText += ' ' + line
        currentQuestion.rawText += '\n' + line
      }
    }
  }
  
  if (currentQuestion) {
    questions.push(currentQuestion)
  }
  
  return questions
}

function processBubbleDetections(roboflowData: RoboflowResponse): any[] {
  const bubbleAnswers: any[] = []
  
  // Group bubbles by vertical position (approximate question grouping)
  const bubblesByQuestion = new Map<number, BubbleDetection[]>()
  
  roboflowData.predictions.forEach(bubble => {
    // Estimate question number based on vertical position
    const questionEstimate = Math.floor(bubble.y / 50) + 1 // Rough estimation
    
    if (!bubblesByQuestion.has(questionEstimate)) {
      bubblesByQuestion.set(questionEstimate, [])
    }
    bubblesByQuestion.get(questionEstimate)?.push(bubble)
  })
  
  // Process each question's bubbles
  bubblesByQuestion.forEach((bubbles, questionNum) => {
    // Find the bubble with highest confidence (most likely selected)
    const selectedBubble = bubbles.reduce((prev, current) => 
      (prev.confidence > current.confidence) ? prev : current
    )
    
    // Map bubble class to answer letter
    const answerLetter = mapBubbleClassToLetter(selectedBubble.class)
    
    if (answerLetter) {
      bubbleAnswers.push({
        questionNumber: questionNum,
        selectedOption: answerLetter,
        detectionMethod: 'roboflow_bubble',
        confidence: selectedBubble.confidence,
        bubbleCoordinates: {
          x: selectedBubble.x,
          y: selectedBubble.y,
          width: selectedBubble.width,
          height: selectedBubble.height
        },
        crossValidated: false
      })
    }
  })
  
  return bubbleAnswers
}

function mapBubbleClassToLetter(bubbleClass: string): string | null {
  // Map Roboflow bubble detection classes to answer letters
  const classMapping: { [key: string]: string } = {
    'bubble_a': 'A',
    'bubble_b': 'B', 
    'bubble_c': 'C',
    'bubble_d': 'D',
    'filled_a': 'A',
    'filled_b': 'B',
    'filled_c': 'C',
    'filled_d': 'D',
    'selected_a': 'A',
    'selected_b': 'B',
    'selected_c': 'C',
    'selected_d': 'D'
  }
  
  const lowerClass = bubbleClass.toLowerCase()
  return classMapping[lowerClass] || null
}

function performDataFusion(ocrQuestions: any[], bubbleAnswers: any[], enhancedData: any) {
  console.log('Performing intelligent data fusion...')
  
  const fusedQuestions: any[] = []
  const fusedAnswers: any[] = []
  
  // Process each OCR question
  ocrQuestions.forEach(ocrQuestion => {
    const questionNum = ocrQuestion.questionNumber
    
    // Find corresponding bubble answer
    const bubbleAnswer = bubbleAnswers.find(ba => ba.questionNumber === questionNum)
    
    const enhancedQuestion = {
      ...ocrQuestion,
      detectedAnswer: bubbleAnswer || null
    }
    
    if (bubbleAnswer) {
      // Cross-validate: we have both OCR question and Roboflow answer
      bubbleAnswer.crossValidated = true
      
      // Create enhanced answer with high confidence
      const enhancedAnswer = {
        ...bubbleAnswer,
        crossValidated: true,
        detectionMethod: 'cross_validated' as const
      }
      
      fusedAnswers.push(enhancedAnswer)
      enhancedQuestion.detectedAnswer = enhancedAnswer
      
    } else {
      // No bubble detected, try to extract answer from OCR text
      const ocrAnswer = extractAnswerFromOCRText(ocrQuestion)
      if (ocrAnswer) {
        ocrAnswer.fallbackUsed = true
        fusedAnswers.push(ocrAnswer)
        enhancedQuestion.detectedAnswer = ocrAnswer
      }
    }
    
    fusedQuestions.push(enhancedQuestion)
  })
  
  // Handle bubble answers that don't match any OCR questions
  bubbleAnswers.forEach(bubbleAnswer => {
    if (!bubbleAnswer.crossValidated) {
      // Standalone bubble detection
      fusedAnswers.push(bubbleAnswer)
    }
  })
  
  return { questions: fusedQuestions, answers: fusedAnswers }
}

function extractAnswerFromOCRText(question: any): any | null {
  // Try to find answer patterns in the question text or nearby
  const patterns = [
    /answer[\s:]*([A-D])/i,
    /selected[\s:]*([A-D])/i,
    /^([A-D])$/m,
    /\b([A-D])\s*[\✓×]/
  ]
  
  for (const pattern of patterns) {
    const match = question.rawText.match(pattern)
    if (match && match[1]) {
      return {
        questionNumber: question.questionNumber,
        selectedOption: match[1].toUpperCase(),
        detectionMethod: 'google_ocr',
        confidence: 0.7, // Lower confidence for OCR-only detection
        crossValidated: false,
        fallbackUsed: true
      }
    }
  }
  
  return null
}

function calculateValidationMetrics(questions: any[], answers: any[], bubbleAnswers: any[]) {
  const totalQuestions = questions.length
  const totalAnswers = answers.length
  const crossValidatedAnswers = answers.filter(a => a.crossValidated).length
  const fallbackAnswers = answers.filter(a => a.fallbackUsed).length
  const roboflowDetections = bubbleAnswers.length
  
  // Calculate metrics
  const questionAnswerAlignment = totalQuestions > 0 ? totalAnswers / totalQuestions : 0
  const bubbleDetectionAccuracy = roboflowDetections > 0 ? crossValidatedAnswers / roboflowDetections : 0
  const textOcrAccuracy = totalQuestions > 0 ? (totalQuestions - fallbackAnswers) / totalQuestions : 1
  
  // Overall reliability considers multiple factors
  const reliabilityFactors = [
    questionAnswerAlignment * 0.4, // 40% - answer coverage
    bubbleDetectionAccuracy * 0.3, // 30% - bubble accuracy
    textOcrAccuracy * 0.2, // 20% - text quality
    Math.min(crossValidatedAnswers / Math.max(totalAnswers, 1), 1) * 0.1 // 10% - cross-validation rate
  ]
  
  const overallReliability = reliabilityFactors.reduce((sum, factor) => sum + factor, 0)
  
  return {
    questionAnswerAlignment: Math.round(questionAnswerAlignment * 100) / 100,
    bubbleDetectionAccuracy: Math.round(bubbleDetectionAccuracy * 100) / 100,
    textOcrAccuracy: Math.round(textOcrAccuracy * 100) / 100,
    overallReliability: Math.round(overallReliability * 100) / 100,
    crossValidationCount: crossValidatedAnswers,
    fallbackUsageCount: fallbackAnswers
  }
}

function extractExamId(text: string): string | null {
  const examIdPatterns = [
    /EXAM\s*ID[\s:]*([A-Z0-9\-_]+)/i,
    /TEST\s*ID[\s:]*([A-Z0-9\-_]+)/i,
    /ID[\s:]*([A-Z0-9\-_]{3,})/i,
    /EXAM[\s:]*([A-Z0-9\-_]{3,})/i
  ]

  for (const pattern of examIdPatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      return match[1].trim()
    }
  }
  return null
}

function extractStudentName(text: string): string | null {
  const studentNamePatterns = [
    /(?:STUDENT\s*NAME|NAME|STUDENT)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i,
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m,
    /(?:^|\n)([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\n|$)/,
    /(?:BY|SUBMITTED BY|FOR)[\s:]*([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/i
  ]

  for (const pattern of studentNamePatterns) {
    const match = text.match(pattern)
    if (match && match[1]) {
      const candidate = match[1].trim()
      const words = candidate.split(/\s+/)
      if (words.length >= 2 && words.length <= 4 && candidate.length >= 5 && candidate.length <= 50) {
        const validNamePattern = /^[A-Za-z\s\-'\.]+$/
        if (validNamePattern.test(candidate)) {
          return candidate
        }
      }
    }
  }
  return null
}
