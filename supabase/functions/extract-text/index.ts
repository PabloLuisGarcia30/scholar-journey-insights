import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

function detectQuestionsWithRoboflow(imageData: string, apiKey: string) {
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

function detectStudentId(extractedText: string, fileName?: string) {
  console.log('🔍 Detecting student ID from extracted text');
  
  // Enhanced ID detection patterns
  const idPatterns = [
    // Common student ID patterns
    /(?:student\s*id|id|student\s*#|id\s*#)\s*:?\s*([A-Z0-9]{4,12})/i,
    /(?:^|\s)([A-Z]{2,4}\d{4,8})(?:\s|$)/m, // Format: ABC1234, ABCD12345678
    /(?:^|\s)(\d{6,10})(?:\s|$)/m, // Pure numeric IDs: 123456789
    /(?:^|\s)([A-Z]\d{6,9})(?:\s|$)/m, // Format: A1234567
    /(?:^|\s)(\d{2}[A-Z]{2,3}\d{4,6})(?:\s|$)/m, // Format: 22ABC1234
    // Header patterns for generated tests
    /Student\s+ID:\s*([A-Z0-9]{4,12})/i,
    /ID:\s*([A-Z0-9]{4,12})/i
  ];

  // Try header detection first (most reliable)
  const headerLines = extractedText.split('\n').slice(0, 5).join('\n');
  for (const pattern of idPatterns) {
    const match = headerLines.match(pattern);
    if (match) {
      const id = match[1].trim();
      if (isValidStudentId(id)) {
        return {
          detectedId: id,
          confidence: 0.98,
          detectionMethod: 'header'
        };
      }
    }
  }

  // Try form field detection
  const formPatterns = [
    /(?:Student\s*ID|Student\s*#|ID)\s*:?\s*([A-Z0-9]{4,12})/i,
    /Student:\s*([A-Z0-9]{4,12})/i,
    /ID:\s*([A-Z0-9]{4,12})/i
  ];

  for (const pattern of formPatterns) {
    const match = extractedText.match(pattern);
    if (match) {
      const id = match[1].trim();
      if (isValidStudentId(id)) {
        return {
          detectedId: id,
          confidence: 0.95,
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

    for (const pattern of idPatterns) {
      const match = cleanName.match(pattern);
      if (match) {
        const id = match[1].trim();
        if (isValidStudentId(id)) {
          return {
            detectedId: id,
            confidence: 0.85,
            detectionMethod: 'filename'
          };
        }
      }
    }
  }

  return {
    detectedId: null,
    confidence: 0,
    detectionMethod: 'none'
  };
}

function isValidStudentId(id: string): boolean {
  const trimmedId = id.trim();
  
  if (trimmedId.length < 4 || trimmedId.length > 12) return false;
  if (!/[A-Za-z0-9]/.test(trimmedId)) return false;
  if (!/^[A-Za-z0-9\-_]+$/.test(trimmedId)) return false;

  // Exclude common non-ID strings
  const excludePatterns = [
    /^(test|exam|quiz|name|student|answer|key|page|question)$/i,
    /^(true|false|yes|no|none|null)$/i
  ];

  for (const pattern of excludePatterns) {
    if (pattern.test(trimmedId)) return false;
  }

  return true;
}

// Update the main serve function to use Student ID detection
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

    // Enhanced student ID detection (replaces name detection)
    const studentIdResult = detectStudentId(ocrResult.extractedText, fileName);
    console.log(`🆔 Student ID detection:`, studentIdResult);

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

    // Build structured data with enhanced student ID information
    const structuredData = {
      examId,
      detectedStudentId: studentIdResult.detectedId,
      studentIdConfidence: studentIdResult.confidence,
      studentIdDetectionMethod: studentIdResult.detectionMethod,
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
        hasStudentId: !!studentIdResult.detectedId,
        processingTimestamp: new Date().toISOString(),
        studentIdDetectionEnabled: true
      }
    };

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: ocrResult.extractedText,
        examId,
        studentName: null, // Deprecated in favor of Student ID
        studentId: studentIdResult.detectedId,
        fileName,
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
        examId: null,
        studentName: null,
        studentId: null,
        structuredData: null
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
