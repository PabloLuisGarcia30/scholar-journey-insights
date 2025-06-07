import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Database-driven template recognition using stored answer keys
async function recognizeTemplateFromDatabase(examId: string) {
  console.log('🔍 Querying database for exam format:', examId);
  
  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  try {
    // Query answer keys to get question types for this exam
    const { data: answerKeys, error } = await supabase
      .from('answer_keys')
      .select('question_number, question_type, correct_answer, options')
      .eq('exam_id', examId)
      .order('question_number');
    
    if (error) {
      console.warn('⚠️ Database query failed:', error);
      return null;
    }
    
    if (!answerKeys || answerKeys.length === 0) {
      console.log('📝 No answer keys found for exam:', examId);
      return null;
    }
    
    // Analyze question types to determine detection strategy
    const questionTypes = answerKeys.map(key => key.question_type);
    const multipleChoiceCount = questionTypes.filter(type => 
      type === 'multiple_choice' || type === 'true_false'
    ).length;
    const textBasedCount = questionTypes.filter(type => 
      type === 'short_answer' || type === 'essay'
    ).length;
    
    console.log(`📊 Found ${answerKeys.length} questions: ${multipleChoiceCount} MC/TF, ${textBasedCount} text-based`);
    
    return {
      isMatch: true,
      confidence: 0.98, // High confidence since we have database info
      template: 'database_driven',
      examId,
      questionCount: answerKeys.length,
      questionTypes: {
        multiple_choice: multipleChoiceCount,
        text_based: textBasedCount
      },
      questionMap: answerKeys.reduce((map, key) => {
        map[key.question_number] = {
          type: key.question_type,
          correctAnswer: key.correct_answer,
          options: key.options
        };
        return map;
      }, {} as Record<number, any>),
      detectedFormat: multipleChoiceCount > 0 ? 'mixed_format' : 'text_based',
      needsBubbleDetection: multipleChoiceCount > 0,
      needsTextExtraction: true,
      preprocessing: {
        rotationCorrection: true,
        contrastEnhancement: 1.2,
        bubbleEnhancement: multipleChoiceCount > 0,
        gridAlignment: multipleChoiceCount > 0,
        textEnhancement: textBasedCount > 0
      }
    };
    
  } catch (error) {
    console.error('❌ Database query error:', error);
    return null;
  }
}

// Fallback template recognition for documents without exam_id
async function fallbackTemplateRecognition(imageData: string, fileName: string) {
  console.log('🔍 Using fallback template recognition for:', fileName);
  
  // Conservative approach - assume mixed format and try both detection methods
  return {
    isMatch: false,
    confidence: 0.6,
    template: 'fallback_mixed',
    detectedFormat: 'mixed_format',
    needsBubbleDetection: true,
    needsTextExtraction: true,
    questionTypes: {
      multiple_choice: 0, // Unknown
      text_based: 0 // Unknown
    },
    preprocessing: {
      rotationCorrection: true,
      contrastEnhancement: 1.2,
      bubbleEnhancement: true,
      gridAlignment: true,
      textEnhancement: true
    }
  };
}

// Enhanced OCR extraction with database-driven strategy
async function extractTextWithDatabaseStrategy(imageData: string, apiKey: string, templateConfig: any) {
  console.log('🎯 Using database-driven OCR strategy');
  
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
  const requestBody = {
    requests: [{
      image: { content: imageData },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
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
    throw new Error(`Vision API error: ${response.statusText}`);
  }

  const result = await response.json();
  const fullTextAnnotation = result.responses[0]?.fullTextAnnotation;
  
  if (!fullTextAnnotation) {
    return { extractedText: '', confidence: 0 };
  }

  const extractedText = fullTextAnnotation.text || '';
  
  // Enhanced confidence based on database match
  let confidence = 0.9;
  if (templateConfig.isMatch) {
    confidence = 0.98; // Very high confidence with database info
  }

  return { extractedText, confidence };
}

// Database-driven question detection
async function detectQuestionsWithDatabaseInfo(imageData: string, apiKey: string, templateConfig: any) {
  console.log('🎯 Using database-driven question detection');
  
  const questionGroups: any[] = [];
  
  // Only use Roboflow if we know we have multiple choice questions
  if (!templateConfig.needsBubbleDetection) {
    console.log('📝 No bubble detection needed based on database info');
    return [];
  }
  
  try {
    const roboflowUrl = "https://detect.roboflow.com/test-answer-sheet/2";
    const confidence = 0.3; // Use consistent confidence threshold
    
    const response = await fetch(`${roboflowUrl}?api_key=${apiKey}&confidence=${confidence}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: imageData
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.status}`);
    }

    const result = await response.json();
    return processDatabaseDrivenDetections(result.predictions || [], templateConfig);
  } catch (error) {
    console.warn('⚠️ Database-driven Roboflow detection failed:', error);
    return [];
  }
}

function processDatabaseDrivenDetections(predictions: any[], templateConfig: any) {
  console.log(`📊 Processing ${predictions.length} detections with database guidance`);
  
  const questionGroups: any[] = [];
  const groupedByQuestion = new Map();

  predictions.forEach(prediction => {
    const questionNumber = extractFlexibleQuestionNumber(prediction, templateConfig);
    
    // Validate against database expectations
    const expectedQuestion = templateConfig.questionMap?.[questionNumber];
    if (expectedQuestion && (expectedQuestion.type === 'short_answer' || expectedQuestion.type === 'essay')) {
      console.warn(`⚠️ Bubble detected for text-based question ${questionNumber}`);
      return; // Skip this detection
    }
    
    if (!groupedByQuestion.has(questionNumber)) {
      groupedByQuestion.set(questionNumber, {
        questionNumber,
        detections: []
      });
    }
    groupedByQuestion.get(questionNumber).detections.push(prediction);
  });

  groupedByQuestion.forEach((group, questionNumber) => {
    const selectedAnswer = findSelectedAnswerWithFlexibleTemplate(group.detections, templateConfig);
    const expectedQuestion = templateConfig.questionMap?.[questionNumber];
    
    // Enhanced confidence based on database alignment
    let confidence = selectedAnswer ? selectedAnswer.confidence : 0;
    if (expectedQuestion && (expectedQuestion.type === 'multiple_choice' || expectedQuestion.type === 'true_false')) {
      confidence = Math.min(0.98, confidence + 0.1); // Boost confidence for expected MC questions
    }
    
    questionGroups.push({
      questionNumber,
      selectedAnswer,
      confidence,
      detectionCount: group.detections.length,
      databaseEnhanced: !!expectedQuestion,
      expectedType: expectedQuestion?.type || 'unknown',
      questionType: expectedQuestion?.type || 'multiple_choice'
    });
  });

  return questionGroups.sort((a, b) => a.questionNumber - b.questionNumber);
}

// Enhanced text-based question extraction with database validation
function extractDatabaseGuidedQuestionsFromOCR(text: string, templateConfig: any) {
  const questions = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const questionMatch = line.match(/^(\d+)[\.\)\s]/);
    
    if (questionMatch) {
      const questionNumber = parseInt(questionMatch[1]);
      const questionText = line.substring(questionMatch[0].length).trim();
      
      // Use database info to determine question type
      const expectedQuestion = templateConfig.questionMap?.[questionNumber];
      let questionType = expectedQuestion?.type || 'multiple_choice';
      let selectedAnswer = null;
      
      // Look for answers based on expected question type
      if (questionType === 'multiple_choice' || questionType === 'true_false') {
        for (let j = i + 1; j < Math.min(i + 10, lines.length); j++) {
          const answerMatch = lines[j].match(/(?:Answer|Selected):\s*([A-E])/i);
          if (answerMatch) {
            selectedAnswer = {
              optionLetter: answerMatch[1].toUpperCase(),
              confidence: 0.8
            };
            break;
          }
        }
      } else {
        // Look for text answers for short_answer/essay
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const textAnswer = lines[j].trim();
          if (textAnswer.length > 0 && !textAnswer.match(/^\d+[\.\)]/)) {
            selectedAnswer = {
              textAnswer,
              confidence: 0.7
            };
            break;
          }
        }
      }
      
      questions.push({
        questionNumber,
        questionText: questionText || `Question ${questionNumber}`,
        questionType,
        selectedAnswer,
        confidence: selectedAnswer ? selectedAnswer.confidence : 0,
        databaseEnhanced: !!expectedQuestion,
        expectedAnswer: expectedQuestion?.correctAnswer
      });
    }
  }
  
  return questions;
}

// Optimized flexible template recognition 
async function recognizeFlexibleTemplate(imageData: string, fileName: string) {
  console.log('🔍 Recognizing flexible template format for:', fileName);
  
  // Analyze file characteristics
  const isTestFile = fileName.toLowerCase().includes('test') || 
                    fileName.toLowerCase().includes('exam') ||
                    fileName.toLowerCase().includes('quiz');
  
  // Mock format detection based on filename patterns
  let detectedFormat = 'bubble_sheet';
  let questionTypes = ['multiple_choice'];
  
  if (fileName.toLowerCase().includes('mixed') || fileName.toLowerCase().includes('essay')) {
    detectedFormat = 'mixed_format';
    questionTypes = ['multiple_choice', 'short_answer', 'essay'];
  } else if (fileName.toLowerCase().includes('essay') || fileName.toLowerCase().includes('written')) {
    detectedFormat = 'text_based';
    questionTypes = ['short_answer', 'essay'];
  }
  
  return {
    isMatch: isTestFile,
    confidence: isTestFile ? 0.95 : 0.3,
    template: isTestFile ? 'test_creator_flexible' : null,
    detectedFormat,
    questionTypes,
    preprocessing: {
      rotationCorrection: true,
      contrastEnhancement: detectedFormat === 'text_based' ? 1.2 : 1.3,
      bubbleEnhancement: detectedFormat !== 'text_based',
      gridAlignment: detectedFormat === 'bubble_sheet',
      textEnhancement: detectedFormat !== 'bubble_sheet'
    },
    extractionMethods: {
      'multiple_choice': 'roboflow_bubbles',
      'short_answer': 'google_vision_text',
      'essay': 'google_vision_text'
    }
  };
}

// Simplified and optimized OCR extraction using DOCUMENT_TEXT_DETECTION
async function extractTextWithFlexibleVision(imageData: string, apiKey: string, templateConfig: any) {
  console.log('🎯 Using simplified Vision API processing');
  
  const visionApiUrl = `https://vision.googleapis.com/v1/images:annotate?key=${apiKey}`;
  
  // Only use DOCUMENT_TEXT_DETECTION for best efficiency and accuracy
  const requestBody = {
    requests: [{
      image: { content: imageData },
      features: [{ type: 'DOCUMENT_TEXT_DETECTION' }],
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
    throw new Error(`Vision API error: ${response.statusText}`);
  }

  const result = await response.json();
  const fullTextAnnotation = result.responses[0]?.fullTextAnnotation;
  
  if (!fullTextAnnotation) {
    return { extractedText: '', confidence: 0 };
  }

  // Use the full text from DOCUMENT_TEXT_DETECTION for best results
  const extractedText = fullTextAnnotation.text || '';
  
  // Simplified confidence calculation - high default due to DOCUMENT_TEXT_DETECTION reliability
  let confidence = 0.9;
  
  if (templateConfig.isMatch) {
    confidence = Math.min(0.98, confidence + 0.05);
  }
  
  if (templateConfig.detectedFormat === 'mixed_format') {
    confidence *= 0.95; // Slightly lower for mixed format complexity
  }

  return { extractedText, confidence };
}

// Enhanced question detection with flexible format support
async function detectQuestionsWithFlexibleRoboflow(imageData: string, apiKey: string, templateConfig: any) {
  console.log('🎯 Using flexible format-aware detection');
  
  const questionGroups: any[] = [];
  
  // Only use Roboflow for formats that include bubbles
  if (templateConfig.detectedFormat === 'text_based') {
    console.log('📝 Text-based format detected, skipping bubble detection');
    return [];
  }
  
  try {
    const roboflowUrl = "https://detect.roboflow.com/test-answer-sheet/2";
    const confidence = templateConfig.detectedFormat === 'mixed_format' ? 0.4 : 0.3;
    
    const response = await fetch(`${roboflowUrl}?api_key=${apiKey}&confidence=${confidence}`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: imageData
    });

    if (!response.ok) {
      throw new Error(`Roboflow API error: ${response.status}`);
    }

    const result = await response.json();
    return processFlexibleDetections(result.predictions || [], templateConfig);
  } catch (error) {
    console.warn('⚠️ Flexible Roboflow detection failed:', error);
    return [];
  }
}

function processFlexibleDetections(predictions: any[], templateConfig: any) {
  console.log(`📊 Processing ${predictions.length} detections with flexible format awareness`);
  
  const questionGroups: any[] = [];
  const groupedByQuestion = new Map();

  predictions.forEach(prediction => {
    const questionNumber = extractFlexibleQuestionNumber(prediction, templateConfig);
    
    if (!groupedByQuestion.has(questionNumber)) {
      groupedByQuestion.set(questionNumber, {
        questionNumber,
        detections: []
      });
    }
    groupedByQuestion.get(questionNumber).detections.push(prediction);
  });

  groupedByQuestion.forEach((group, questionNumber) => {
    const selectedAnswer = findSelectedAnswerWithFlexibleTemplate(group.detections, templateConfig);
    
    const confidence = selectedAnswer ? 
      (templateConfig.isMatch ? Math.min(0.98, selectedAnswer.confidence + 0.1) : selectedAnswer.confidence) : 0;
    
    questionGroups.push({
      questionNumber,
      selectedAnswer,
      confidence,
      detectionCount: group.detections.length,
      templateEnhanced: templateConfig.isMatch,
      questionType: questionNumber <= 10 ? 'multiple_choice' : 
                   (templateConfig.detectedFormat === 'mixed_format' ? 'short_answer' : 'multiple_choice')
    });
  });

  return questionGroups.sort((a, b) => a.questionNumber - b.questionNumber);
}

function extractFlexibleQuestionNumber(prediction: any, templateConfig: any): number {
  if (prediction.class && prediction.class.includes('question-')) {
    const match = prediction.class.match(/question-(\d+)/);
    if (match) return parseInt(match[1]);
  }
  
  // Adjust spacing based on format type
  const spacing = templateConfig.detectedFormat === 'mixed_format' ? 30 : 20;
  return Math.floor((prediction.y - 150) / spacing) + 1;
}

function findSelectedAnswerWithFlexibleTemplate(detections: any[], templateConfig: any) {
  const selectedDetections = detections.filter(d => 
    d.class && (d.class.includes('selected') || d.class.includes('filled'))
  );

  if (selectedDetections.length === 0) return null;

  const bestDetection = selectedDetections.reduce((best, current) => 
    current.confidence > best.confidence ? current : best
  );

  const option = templateConfig.isMatch ? 
    extractFlexibleOptionLetter(bestDetection, templateConfig) : 
    extractOptionLetter(bestDetection);

  return {
    optionLetter: option,
    confidence: bestDetection.confidence,
    boundingBox: {
      x: bestDetection.x,
      y: bestDetection.y,
      width: bestDetection.width,
      height: bestDetection.height
    },
    templateEnhanced: templateConfig.isMatch
  };
}

function extractFlexibleOptionLetter(detection: any, templateConfig: any): string {
  const x = detection.x;
  
  // Adjust spacing based on format
  const baseX = templateConfig.detectedFormat === 'mixed_format' ? 480 : 500;
  const spacing = templateConfig.detectedFormat === 'mixed_format' ? 30 : 25;
  
  if (x < baseX + spacing * 0.5) return 'A';
  if (x < baseX + spacing * 1.5) return 'B';
  if (x < baseX + spacing * 2.5) return 'C';
  if (x < baseX + spacing * 3.5) return 'D';
  return 'E';
}

// Extract text-based questions for flexible formats
function extractFlexibleQuestionsFromOCR(text: string, templateConfig: any) {
  const questions = [];
  const lines = text.split('\n');
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const questionMatch = line.match(/^(\d+)[\.\)\s]/);
    
    if (questionMatch) {
      const questionNumber = parseInt(questionMatch[1]);
      const questionText = line.substring(questionMatch[0].length).trim();
      
      // Determine question type based on context and template format
      let questionType = 'multiple_choice';
      let selectedAnswer = null;
      
      if (templateConfig.detectedFormat === 'mixed_format' && questionNumber > 10) {
        questionType = 'short_answer';
      } else if (templateConfig.detectedFormat === 'text_based') {
        questionType = questionText.length > 100 ? 'essay' : 'short_answer';
      }
      
      // Look for answers based on question type
      if (questionType === 'multiple_choice') {
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
      } else {
        // Look for text answers
        for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
          const textAnswer = lines[j].trim();
          if (textAnswer.length > 0 && !textAnswer.match(/^\d+[\.\)]/)) {
            selectedAnswer = {
              textAnswer,
              confidence: 0.6
            };
            break;
          }
        }
      }
      
      questions.push({
        questionNumber,
        questionText: questionText || `Question ${questionNumber}`,
        questionType,
        selectedAnswer,
        confidence: selectedAnswer ? selectedAnswer.confidence : 0,
        templateEnhanced: templateConfig.isMatch
      });
    }
  }
  
  return questions;
}

// ... keep existing code (helper functions like extractQuestionNumber, extractOptionLetter, etc.)

function extractQuestionNumber(prediction: any): number {
  if (prediction.class && prediction.class.includes('question-')) {
    const match = prediction.class.match(/question-(\d+)/);
    if (match) return parseInt(match[1]);
  }
  return Math.floor(prediction.y / 50) + 1;
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

// Main serve function with database-driven OCR processing
serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { fileName, fileContent } = await req.json();
    console.log(`🔍 Processing file with database-driven OCR pipeline: ${fileName}`);

    const visionApiKey = Deno.env.get('GOOGLE_CLOUD_VISION_API_KEY');
    const roboflowApiKey = Deno.env.get('ROBOFLOW_API_KEY');

    if (!visionApiKey) {
      throw new Error('Google Cloud Vision API key not configured');
    }

    // Step 1: Extract basic text to get exam ID
    const ocrResult = await extractTextWithDatabaseStrategy(fileContent, visionApiKey, { isMatch: false });
    console.log(`📝 Initial OCR extracted ${ocrResult.extractedText.length} characters`);

    // Step 2: Detect exam ID
    const examId = detectExamId(ocrResult.extractedText, fileName);
    console.log(`🆔 Detected exam ID: ${examId}`);

    // Step 3: Database-driven template recognition
    let templateConfig = await recognizeTemplateFromDatabase(examId);
    
    if (!templateConfig) {
      console.log('📋 No database info found, using fallback recognition');
      templateConfig = await fallbackTemplateRecognition(fileContent, fileName);
    } else {
      console.log(`📋 Database-driven format: ${templateConfig.detectedFormat} (${templateConfig.questionCount} questions)`);
      console.log(`📊 Question breakdown: ${JSON.stringify(templateConfig.questionTypes)}`);
    }

    // Step 4: Enhanced student ID detection
    const studentIdResult = detectStudentId(ocrResult.extractedText, fileName);
    console.log(`🆔 Student ID detection:`, studentIdResult);

    // Step 5: Database-guided question detection
    let questionGroups = [];
    if (roboflowApiKey && templateConfig.needsBubbleDetection) {
      try {
        questionGroups = await detectQuestionsWithDatabaseInfo(fileContent, roboflowApiKey, templateConfig);
        console.log(`❓ Database-guided detection: ${questionGroups.length} question groups`);
      } catch (error) {
        console.warn('⚠️ Database-guided Roboflow failed, using OCR fallback:', error.message);
        questionGroups = extractDatabaseGuidedQuestionsFromOCR(ocrResult.extractedText, templateConfig);
      }
    } else if (templateConfig.needsTextExtraction) {
      questionGroups = extractDatabaseGuidedQuestionsFromOCR(ocrResult.extractedText, templateConfig);
    }

    // Step 6: Build enhanced structured data with database validation
    const structuredData = {
      examId,
      detectedStudentId: studentIdResult.detectedId,
      studentIdConfidence: studentIdResult.confidence,
      studentIdDetectionMethod: studentIdResult.detectionMethod,
      questionGroups,
      questions: questionGroups.map((group: any, index: number) => ({
        questionNumber: group.questionNumber || index + 1,
        questionText: group.questionText || `Question ${index + 1}`,
        questionType: group.questionType || 'multiple_choice',
        detectedAnswer: group.selectedAnswer || null,
        confidence: group.confidence || 0,
        databaseEnhanced: group.databaseEnhanced || false,
        expectedType: group.expectedType || 'unknown'
      })),
      templateRecognition: {
        isMatch: templateConfig.isMatch,
        confidence: templateConfig.confidence,
        template: templateConfig.template,
        detectedFormat: templateConfig.detectedFormat,
        databaseDriven: templateConfig.isMatch,
        questionCount: templateConfig.questionCount || 0,
        enhancementsApplied: templateConfig.isMatch
      },
      metadata: {
        totalQuestions: questionGroups.length,
        expectedQuestions: templateConfig.questionCount || 0,
        ocrConfidence: ocrResult.confidence,
        hasStudentId: !!studentIdResult.detectedId,
        processingTimestamp: new Date().toISOString(),
        databaseDrivenProcessing: templateConfig.isMatch,
        questionValidation: {
          expectedCount: templateConfig.questionCount || 0,
          detectedCount: questionGroups.length,
          countMatch: Math.abs((templateConfig.questionCount || 0) - questionGroups.length) <= 1
        },
        bubbleDetectionUsed: templateConfig.needsBubbleDetection,
        textExtractionUsed: templateConfig.needsTextExtraction,
        averageQuestionConfidence: questionGroups.length > 0 ? 
          questionGroups.reduce((sum: number, q: any) => sum + (q.confidence || 0), 0) / questionGroups.length : 0
      }
    };

    // Calculate enhanced confidence score based on database alignment
    const enhancedConfidence = templateConfig.isMatch ? 
      Math.min(0.98, ocrResult.confidence + 0.08) : ocrResult.confidence;

    console.log(`✅ Database-driven OCR processing completed successfully (enhanced confidence: ${(enhancedConfidence * 100).toFixed(1)}%)`);
    console.log(`📊 Database alignment: ${templateConfig.isMatch ? 'YES' : 'NO'}`);
    console.log(`🎯 Question count validation: Expected ${templateConfig.questionCount || 0}, Found ${questionGroups.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        extractedText: ocrResult.extractedText,
        examId,
        studentName: null,
        studentId: studentIdResult.detectedId,
        fileName,
        structuredData,
        confidence: enhancedConfidence,
        templateEnhanced: templateConfig.isMatch,
        databaseDriven: templateConfig.isMatch,
        detectedFormat: templateConfig.detectedFormat
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200
      }
    );

  } catch (error) {
    console.error('❌ Database-driven OCR processing failed:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        extractedText: '',
        examId: null,
        studentName: null,
        studentId: null,
        structuredData: null,
        templateEnhanced: false,
        databaseDriven: false
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500
      }
    );
  }
});
