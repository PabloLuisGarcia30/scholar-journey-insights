import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { SmartOcrService, DocumentClassification, OcrMethodType, AdaptiveOcrConfig } from "@/services/smartOcrService";
import { PerformanceMonitoringService } from "@/services/performanceMonitoringService";
import { OpenAIComplexGradingService } from "@/services/openAIComplexGradingService";
import { EnhancedQuestionClassifier, SimpleAnswerValidation } from "@/services/enhancedQuestionClassifier";
import { BatchProcessingService } from "@/services/batchProcessingService";
import { BatchProcessingManager } from "@/components/BatchProcessingManager";
import { PerformanceDashboard } from "@/components/PerformanceDashboard";
import { DashboardAnalytics } from "@/components/DashboardAnalytics";
import { EnhancedBatchProcessingManager } from "@/components/EnhancedBatchProcessingManager";

const measureOperation = async <T,>(operation: string, fn: () => Promise<T>): Promise<T> => {
  const startTime = Date.now();
  try {
    const result = await fn();
    const duration = Date.now() - startTime;
    PerformanceMonitoringService.recordMetric(operation, duration, true);
    return result;
  } catch (error: any) {
    const duration = Date.now() - startTime;
    PerformanceMonitoringService.recordMetric(operation, duration, false, { error: error.message });
    throw error;
  }
};

const UploadTest: React.FC = () => {
  const [files, setFiles] = useState<File[]>([]);
  const [documentType, setDocumentType] = useState<DocumentClassification | null>(null);
  const [ocrMethod, setOcrMethod] = useState<OcrMethodType>('adaptive');
  const [adaptiveConfig, setAdaptiveConfig] = useState<AdaptiveOcrConfig>({
    primaryMethod: {
      name: 'google_vision',
      confidence: 0.9,
      processingTime: 2000,
      accuracy: 0.85,
      cost: 0.01
    },
    fallbackMethods: [],
    confidenceThreshold: 0.7,
    enableCrossValidation: true,
    adaptiveLearning: true,
    useGoogleVision: true,
    useRoboflow: true,
    threshold: 0.7
  });
  const [examQuestions, setExamQuestions] = useState<any[]>([]);
  const [gradingResults, setGradingResults] = useState<any[]>([]);
  const [questionClassification, setQuestionClassification] = useState<any[]>([]);
  const [simpleValidationResults, setSimpleValidationResults] = useState<SimpleAnswerValidation[]>([]);
  const [batchJobId, setBatchJobId] = useState<string | null>(null);
  const [openaiBatchId, setOpenaiBatchId] = useState<string | null>(null);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    setFiles(acceptedFiles);
  }, []);

  const {getRootProps, getInputProps, isDragActive} = useDropzone({onDrop});

  const handleDocumentAnalysis = async () => {
    if (files.length === 0) return;

    try {
      const classification = await SmartOcrService.analyzeDocument(files[0]);
      setDocumentType(classification);
    } catch (error) {
      console.error("Error during document analysis:", error);
    }
  };

  const handleOcrExtraction = async () => {
    if (files.length === 0) return;

    try {
      let extractedText = "";
      if (ocrMethod === 'adaptive') {
        extractedText = await SmartOcrService.extractTextFromImageAdaptive(files[0], adaptiveConfig);
      } else {
        extractedText = await SmartOcrService.extractTextFromImage(files[0], ocrMethod);
      }
      console.log("Extracted Text:", extractedText);
    } catch (error) {
      console.error("Error during OCR extraction:", error);
    }
  };

  const handleEnhancedQuestionClassification = async () => {
    if (files.length === 0) return;

    try {
      const results = await EnhancedQuestionClassifier.classifyQuestions(files[0]);
      setQuestionClassification(results);
      console.log("Question Classification Results:", results);
    } catch (error) {
      console.error("Error during enhanced question classification:", error);
    }
  };

  const handleSimpleAnswerValidation = async () => {
    if (files.length === 0) return;

    try {
      const results = await EnhancedQuestionClassifier.validateSimpleAnswers(files[0]);
      setSimpleValidationResults(results);
      console.log("Simple Answer Validation Results:", results);
    } catch (error) {
      console.error("Error during simple answer validation:", error);
    }
  };

  const handleCreateExam = async () => {
    if (files.length === 0) return;

    try {
      const questions = await SmartOcrService.generateExamQuestions(files[0]);
      setExamQuestions(questions);
      console.log("Generated Exam Questions:", questions);
    } catch (error) {
      console.error("Error generating exam questions:", error);
    }
  };

  const handleGradeExam = async () => {
    if (examQuestions.length === 0) return;

    try {
      const results = await SmartOcrService.gradeExam(examQuestions);
      setGradingResults(results);
      console.log("Grading Results:", results);
    } catch (error) {
      console.error("Error grading exam:", error);
    }
  };

  const handleComplexGrading = async () => {
    if (examQuestions.length === 0) return;

    try {
      const batchId = await OpenAIComplexGradingService.createBatch(examQuestions);
      setOpenaiBatchId(batchId);
      console.log("Created OpenAI batch with ID:", batchId);
    } catch (error) {
      console.error("Error creating OpenAI batch:", error);
    }
  };

  const handleBatchProcessing = async () => {
    if (files.length === 0) return;

    try {
      const jobId = BatchProcessingService.createBatchJob(files);
      setBatchJobId(jobId);
      console.log("Created batch job with ID:", jobId);
    } catch (error) {
      console.error("Error creating batch job:", error);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <h1 className="text-2xl font-bold">AI Grading Test Page</h1>

      {/* File Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Documents</CardTitle>
        </CardHeader>
        <CardContent>
          <div {...getRootProps()} className={`dropzone border-2 border-dashed p-6 text-center cursor-pointer ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300'}`}>
            <input {...getInputProps()} />
            {
              isDragActive ?
                <p>Drop the files here ...</p> :
                <p>Drag 'n' drop some files here, or click to select files</p>
            }
          </div>
          <aside className="mt-4">
            <h4>Files</h4>
            <ul>
              {files.map(file => (
                <li key={file.name}>
                  {file.name} - {file.size} bytes
                </li>
              ))}
            </ul>
          </aside>
        </CardContent>
      </Card>

      {/* Document Analysis Section */}
      <Card>
        <CardHeader>
          <CardTitle>Document Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleDocumentAnalysis} disabled={files.length === 0}>
            Analyze Document
          </Button>
          {documentType && (
            <div className="mt-2">
              <p>Document Type: {documentType.type}</p>
              <p>Confidence: {documentType.confidence}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* OCR Extraction Section */}
      <Card>
        <CardHeader>
          <CardTitle>OCR Extraction</CardTitle>
        </CardHeader>
        <CardContent>
          <Label htmlFor="ocrMethod">OCR Method</Label>
          <select
            id="ocrMethod"
            className="block w-full p-2 border rounded mb-2"
            value={ocrMethod}
            onChange={(e) => setOcrMethod(e.target.value as OcrMethodType)}
          >
            <option value="google_vision">Google Vision</option>
            <option value="roboflow">Roboflow</option>
            <option value="tesseract">Tesseract</option>
            <option value="adaptive">Adaptive</option>
          </select>

          {ocrMethod === 'adaptive' && (
            <div className="space-y-2">
              <Label>Adaptive Configuration</Label>
              <Label htmlFor="useGoogleVision" className="flex items-center space-x-2">
                <Input
                  type="checkbox"
                  id="useGoogleVision"
                  checked={adaptiveConfig.useGoogleVision}
                  onChange={(e) => setAdaptiveConfig({ ...adaptiveConfig, useGoogleVision: e.target.checked })}
                />
                <span>Use Google Vision</span>
              </Label>
              <Label htmlFor="useRoboflow" className="flex items-center space-x-2">
                <Input
                  type="checkbox"
                  id="useRoboflow"
                  checked={adaptiveConfig.useRoboflow}
                  onChange={(e) => setAdaptiveConfig({ ...adaptiveConfig, useRoboflow: e.target.checked })}
                />
                <span>Use Roboflow</span>
              </Label>
              <div>
                <Label htmlFor="threshold">Threshold</Label>
                <Input
                  type="number"
                  id="threshold"
                  value={adaptiveConfig.threshold}
                  onChange={(e) => setAdaptiveConfig({ ...adaptiveConfig, threshold: parseFloat(e.target.value) })}
                />
              </div>
            </div>
          )}

          <Button onClick={handleOcrExtraction} disabled={files.length === 0}>
            Extract Text with OCR
          </Button>
        </CardContent>
      </Card>

      {/* Enhanced Question Classification Section */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Question Classification</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleEnhancedQuestionClassification} disabled={files.length === 0}>
            Classify Questions
          </Button>
          {questionClassification.length > 0 && (
            <div className="mt-2">
              <h3>Classification Results:</h3>
              <ul>
                {questionClassification.map((result, index) => (
                  <li key={index}>
                    Question {index + 1}: Type - {result.questionType}, Confidence - {result.confidence}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Simple Answer Validation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Simple Answer Validation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleSimpleAnswerValidation} disabled={files.length === 0}>
            Validate Answers
          </Button>
          {simpleValidationResults.length > 0 && (
            <div className="mt-2">
              <h3>Validation Results:</h3>
              <ul>
                {simpleValidationResults.map((result, index) => (
                  <li key={index}>
                    Question {index + 1}: Valid - {result.isValid ? 'Yes' : 'No'}, Explanation - {result.explanation}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Generation Section */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleCreateExam} disabled={files.length === 0}>
            Generate Exam Questions
          </Button>
          {examQuestions.length > 0 && (
            <div className="mt-2">
              <h3>Generated Exam Questions:</h3>
              <ul>
                {examQuestions.map((question, index) => (
                  <li key={index}>
                    Question {index + 1}: {question.text}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Exam Grading Section */}
      <Card>
        <CardHeader>
          <CardTitle>Exam Grading</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleGradeExam} disabled={examQuestions.length === 0}>
            Grade Exam
          </Button>
          {gradingResults.length > 0 && (
            <div className="mt-2">
              <h3>Grading Results:</h3>
              <ul>
                {gradingResults.map((result, index) => (
                  <li key={index}>
                    Question {index + 1}: Correct - {result.isCorrect ? 'Yes' : 'No'}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Complex Grading Section */}
      <Card>
        <CardHeader>
          <CardTitle>Complex Grading (OpenAI)</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleComplexGrading} disabled={examQuestions.length === 0}>
            Start Complex Grading
          </Button>
          {openaiBatchId && (
            <div className="mt-2">
              <p>OpenAI Batch ID: {openaiBatchId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Processing Section */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={handleBatchProcessing} disabled={files.length === 0}>
            Start Batch Processing
          </Button>
          {batchJobId && (
            <div className="mt-2">
              <p>Batch Job ID: {batchJobId}</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Batch Processing Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Batch Processing Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <BatchProcessingManager />
        </CardContent>
      </Card>

      {/* Enhanced Batch Processing Manager */}
      <Card>
        <CardHeader>
          <CardTitle>Enhanced Batch Processing Manager</CardTitle>
        </CardHeader>
        <CardContent>
          <EnhancedBatchProcessingManager />
        </CardContent>
      </Card>

      {/* Performance Monitoring Dashboard */}
      <Card>
        <CardHeader>
          <CardTitle>Performance Monitoring Dashboard</CardTitle>
        </CardHeader>
        <CardContent>
          <PerformanceDashboard />
        </CardContent>
      </Card>

      {/* Dashboard Analytics Section */}
      <Card>
        <CardHeader>
          <CardTitle>Dashboard Analytics</CardTitle>
        </CardHeader>
        <CardContent>
          <DashboardAnalytics />
        </CardContent>
      </Card>
    </div>
  );
};

export default UploadTest;
