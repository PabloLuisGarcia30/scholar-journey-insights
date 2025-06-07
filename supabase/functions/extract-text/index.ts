
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent } = await req.json();
    console.log(`🔍 Processing file: ${fileName}`);

    // Initialize services
    const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');

    if (!visionApiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    // OCR text extraction
    const ocrResult = await extractTextWithVision(fileContent, visionApiKey);
    console.log(`📝 OCR extracted ${ocrResult.extractedText.length} characters`);

    // Enhanced student name detection
    const studentNameResult = detectStudentName(ocrResult.extractedText, fileName);
    console.log(`👤 Student name detection:`, studentNameResult);

    // Question detection using Roboflow (if available)
    let questionGroups = [];
    if (roboflowApiKey) {
      try {
        questionGroups = await detectQuestionsWithRoboflow(fileContent, roboflowApiKey);
        console.log(`❓ Detected ${questionGroups.length} question groups`);
      } catch (error) {
        console.warn('⚠️ Roboflow detection failed, using OCR fallback:', error.message);
        questionGroups = extractQuestionsFromOCR(ocrResult.extractedText);
      }
    } else {
      questionGroups = extractQuestionsFromOCR(ocrResult.extractedText);
    }

    // Exam ID detection
    const examId = detectExamId(ocrResult.extractedText, fileName);
    console.log(`🆔 Detected exam ID: ${examId}`);

    // Build structured data with enhanced student information
    const structuredData = {
      examId,
      detectedStudentName: studentNameResult.detectedName,
      studentNameConfidence: studentNameResult.confidence,
      studentNameDetectionMethod: studentNameResult.detectionMethod,
      questionGroups,
      questions: questionGroups.map((group: any, index: number) => ({
        questionNumber: group.questionNumber || index + 1,
        questionText: group.questionText || `Question ${index + 1}`,
        detectedAnswer: group.selectedAnswer || null,
        confidence: group.confidence || 0
      })),
      metadata: {
        totalQuestions: questionGroups.length,
        ocrConfidence: ocrResult.confidence,
        hasStudentName: !!studentNameResult.detectedName,
        processingTimestamp: new Date().toISOString()
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: ocrResult.extractedText,
        structuredData,
        confidence: ocrResult.confidence
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Text extraction failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        extractedText: '',
        structuredData: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});

async function extractTextWithVision(imageData: string, apiKey: string) {
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
  const requestBody = {
    requests: [{
      image: { content: imageData },
      features: [
        { type: 'TEXT_DETECTION', maxResults: 1 },
        { type: 'DOCUMENT_TEXT_DETECTION', maxResults: 1 }
      ],
      imageContext: {
        languageHints: ['en']
      }
    }]
  };

  const response = await fetch(visionApiUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(requestBody)
  });

  if (!response.ok) {
    throw new Error(`Vision API error: ${response.status}`);
  }

  const result = await response.json();
  const textAnnotations = result.responses[0]?.textAnnotations;
  
  if (!textAnnotations || textAnnotations.length === 0) {
    return { extractedText: '', confidence: 0 };
  }

  const extractedText = textAnnotations[0].description || '';
  const confidence = textAnnotations[0].confidence || 0.8;

  return { extractedText, confidence };
}

function detectStudentName(extractedText: string, fileName?: string) {
  console.log('🔍 Detecting student name from extracted text');
  
  // Enhanced name detection patterns
  const namePatterns = [
    // Header patterns (most reliable for generated tests)
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\s+.*(?:ID:|Exam|Test)/im,
    // Form field patterns
    /(?:Student\s*Name|Name)\s*:?\s*([A-Za-z\s\-\'\.]{2,50})/i,
    /Student:\s*([A-Za-z\s\-\'\.]{2,50})/i,
    // General name patterns
    /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)(?:\s|$)/m
  ];

  // Try header detection first (most reliable)
  const headerLines = extractedText.split('\n').slice(0, 5).join('\n');
  for (const pattern of namePatterns) {
    const match = headerLines.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (isValidName(name)) {
        return {
          detectedName: name,
          confidence: 0.95,
          detectionMethod: 'header'
        };
      }
    }
  }

  // Try form field detection
  for (const pattern of namePatterns.slice(1, 3)) {
    const match = extractedText.match(pattern);
    if (match) {
      const name = match[1].trim();
      if (isValidName(name) && !isCommonNonName(name)) {
        return {
          detectedName: name,
          confidence: 0.85,
          detectionMethod: 'form_field'
        };
      }
    }
  }

  // Try filename detection
  if (fileName) {
    const cleanName = fileName
      .replace(/\.(pdf|jpg|jpeg|png|tiff?)$/i, '')
      .replace(/^(test|exam|quiz|assignment)_?/i, '')
      .replace(/_/g, ' ')
      .trim();

    const nameMatch = cleanName.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      if (isValidName(name)) {
        return {
          detectedName: name,
          confidence: 0.60,
          detectionMethod: 'filename'
        };
      }
    }
  }

  return {
    detectedName: null,
    confidence: 0,
    detectionMethod: 'none'
  };
}

function isValidName(name: string): boolean {
  const trimmedName = name.trim();
  
  if (trimmedName.length < 2 || trimmedName.length > 50) return false;
  if (!trimmedName.includes(' ')) return false;
  if (!/^[A-Za-z]/.test(trimmedName)) return false;
  if (!/^[A-Za-z\s\-\'\.]+$/.test(trimmedName)) return false;

  const words = trimmedName.split(/\s+/);
  if (words.length < 2) return false;

  for (const word of words) {
    if (word.length < 1 || !/^[A-Za-z]/.test(word)) return false;
  }

  return true;
}

function isCommonNonName(text: string): boolean {
  const commonNonNames = [
    'test', 'exam', 'quiz', 'assignment', 'homework', 'name', 'student name',
    'answer key', 'answer sheet', 'multiple choice', 'true false', 'essay question',
    'page', 'question', 'number', 'date', 'class', 'subject', 'grade', 'score'
  ];

  const lowerText = text.toLowerCase().trim();
  return commonNonNames.some(nonName => lowerText.includes(nonName));
}

async function detectQuestionsWithRoboflow(imageData: string, apiKey: string) {
  const roboflowUrl = "https://detect.roboflow.com/test-answer-sheet/2";
  
  try {
    const response = await fetch(`${roboflowUrl}?api_key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: imageData
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.status}`);
    }

    const result = await response.json();
    return processRoboflowDetections(result.predictions || []);
  } catch (error) {
    console.warn('Roboflow detection failed:', error);
    return [];
  }
}

function processRoboflowDetections(predictions: any[]) {
  const questionGroups: any[] = [];
  const groupedByQuestion = new Map();

  predictions.forEach(prediction => {
    const questionNumber = extractQuestionNumber(prediction);
    if (!groupedByQuestion.has(questionNumber)) {
      groupedByQuestion.set(questionNumber, {
        questionNumber,
        detections: []
      });
    }
    groupedByQuestion.get(questionNumber).detections.push(prediction);
  });

  groupedByQuestion.forEach((group, questionNumber) => {
    const selectedAnswer = findSelectedAnswer(group.detections);
    questionGroups.push({
      questionNumber,
      selectedAnswer,
      confidence: selectedAnswer ? selectedAnswer.confidence : 0,
      detectionCount: group.detections.length
    });
  });

  return questionGroups.sort((a, b) => a.questionNumber - b.questionNumber);
}

function extractQuestionNumber(prediction: any): number {
  if (prediction.class && prediction.class.includes('question-')) {
    const match = prediction.class.match(/question-(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return Math.floor(prediction.y / 50) + 1;
}

function findSelectedAnswer(detections: any[]) {
  const selectedDetections = detections.filter(d => 
    d.class && (d.class.includes('selected') || d.class.includes('filled'))
  );

  if (selectedDetections.length === 0) return null;

  const bestDetection = selectedDetections.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );

  return {
    optionLetter: extractOptionLetter(bestDetection),
    confidence: bestDetection.confidence,
    boundingBox: {
      x: bestDetection.x,
      y: bestDetection.y,
      width: bestDetection.width,
      height: bestDetection.height
    }
  };
}

function extractOptionLetter(detection: any): string {
  if (detection.class) {
    const match = detection.class.match(/[A-E]/);
    if (match) return match[0];
  }
  
  const x = detection.x;
  if (x < 100) return 'A';
  if (x < 200) return 'B';
  if (x < 300) return 'C';
  if (x < 400) return 'D';
  return 'E';
}

function extractQuestionsFromOCR(text: string) {
  const questions = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const questionMatch = line.match(/^(\d+)[\.\)\s]/);
    
    if (questionMatch) {
      const questionNumber = parseInt(questionMatch[1]);
      const questionText = line.substring(questionMatch[0].length).trim();
      
      let selectedAnswer = null;
      // Look for answer in subsequent lines
      for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
        const answerMatch = lines[j].match(/(?:Answer|Selected):\s*([A-E])/i);
        if (answerMatch) {
          selectedAnswer = {
            optionLetter: answerMatch[1].toUpperCase(),
            confidence: 0.7
          };
          break;
        }
      }
      
      questions.push({
        questionNumber,
        questionText: questionText || `Question ${questionNumber}`,
        selectedAnswer,
        confidence: selectedAnswer ? selectedAnswer.confidence : 0
      });
    }
  }
  
  return questions;
}

function detectExamId(text: string, fileName: string): string {
  // Try to find exam ID in text
  const examIdPatterns = [
    /(?:Exam|Test|Quiz)\s*(?:ID|#)?\s*:?\s*([A-Z0-9\-_]+)/i,
    /ID:\s*([A-Z0-9\-_]+)/i,
    /^([A-Z]{2,4}\d{2,4})/m
  ];

  for (const pattern of examIdPatterns) {
    const match = text.match(pattern);
    if (match && match[1].length >= 3) {
      return match[1];
    }
  }

  // Fallback to filename-based ID
  const fileNameMatch = fileName.match(/([A-Z0-9\-_]{3,})/i);
  if (fileNameMatch) {
    return fileNameMatch[1];
  }

  // Generate default ID
  return `EXAM_${Date.now().toString().slice(-6)}`;
}
