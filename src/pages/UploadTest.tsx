import { useState, useEffect } from "react";
import { Upload, FileText, Image, Video, Brain, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { extractTextFromFile, analyzeTest } from "@/services/testAnalysisService";
import { FileValidationService, FilePreview, FileValidationResult } from "@/services/fileValidationService";
import { FileOptimizationService } from "@/services/fileOptimizationService";
import { ProgressService, ProcessingProgress } from "@/services/progressService";
import { FilePreviewCard } from "@/components/FilePreviewCard";
import { EnhancedProgressIndicator, ProcessingStep } from "@/components/EnhancedProgressIndicator";
import { ResultsManager } from "@/components/ResultsManager";
import { PerformanceMonitoringService, SmartOcrService } from "@/services/advancedServices";
import { BatchProcessingManager, PerformanceDashboard } from "@/components/AdvancedFeatures";
import { CacheService } from "@/services/cacheService";
import { ErrorHandlingService } from "@/services/errorHandlingService";
import { SecurityService } from "@/services/securityService";
import { EnterpriseFeatures } from "@/components/EnterpriseFeatures";
import { ExamIdDetectionService, ExamIdDetectionResult } from "@/services/examIdDetectionService";
import { MultiPageDetectionService, PageGroup } from "@/services/multiPageDetectionService";
import { ExamSelectionModal } from "@/components/ExamSelectionModal";

const UploadTest = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [filePreviews, setFilePreviews] = useState<FilePreview[]>([]);
  const [fileValidations, setFileValidations] = useState<Record<string, FileValidationResult>>({});
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'extracting' | 'analyzing' | 'complete'>('upload');
  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([]);
  const [sessionId, setSessionId] = useState<string>('');
  const [extractedExamId, setExtractedExamId] = useState("");
  const [detectedStudentName, setDetectedStudentName] = useState("");
  const [manualStudentName, setManualStudentName] = useState("");
  const [needsManualName, setNeedsManualName] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<any>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number>(0);
  const [showBatchProcessing, setShowBatchProcessing] = useState(false);
  const [showPerformanceDashboard, setShowPerformanceDashboard] = useState(false);
  const [smartOcrEnabled, setSmartOcrEnabled] = useState(true);
  const [showEnterpriseFeatures, setShowEnterpriseFeatures] = useState(false);
  const [cacheEnabled, setCacheEnabled] = useState(true);
  const [securityScanEnabled, setSecurityScanEnabled] = useState(true);
  const [fileHash, setFileHash] = useState<string>('');
  const [examDetectionResult, setExamDetectionResult] = useState<ExamIdDetectionResult | null>(null);
  const [showExamSelectionModal, setShowExamSelectionModal] = useState(false);
  const [pageGroups, setPageGroups] = useState<PageGroup[]>([]);
  const [autoProcessingEnabled, setAutoProcessingEnabled] = useState(true);
  const [selectedExamIdOverride, setSelectedExamIdOverride] = useState<string>('');

  // Initialize processing steps
  useEffect(() => {
    const steps: ProcessingStep[] = [
      {
        id: 'upload',
        name: 'File Upload & Validation',
        description: 'Uploading and validating files for processing',
        status: 'pending'
      },
      {
        id: 'optimization',
        name: 'File Optimization',
        description: 'Optimizing files for enhanced OCR processing',
        status: 'pending'
      },
      {
        id: 'extracting',
        name: 'Dual OCR Text Extraction',
        description: 'Extracting text using Google OCR + Roboflow bubble detection',
        status: 'pending'
      },
      {
        id: 'analyzing',
        name: 'AI Analysis',
        description: 'Analyzing test results with enhanced AI',
        status: 'pending'
      }
    ];
    setProcessingSteps(steps);
  }, []);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const files = Array.from(e.dataTransfer.files);
      handleFiles(files);
    }
  };

  const handleFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      await handleFiles(files);
    }
  };

  const handleFiles = async (files: File[]) => {
    // Track user action for audit
    ErrorHandlingService.trackUserAction(`file_upload_${files.length}_files`);
    
    // Update upload step
    updateProcessingStep('upload', { status: 'active', progress: 0 });
    
    // Batch validation with security scanning
    const batchValidation = FileValidationService.validateBatch(files);
    
    if (batchValidation.invalid.length > 0) {
      await ErrorHandlingService.reportError(
        new Error(`${batchValidation.invalid.length} files failed validation`),
        { invalidFiles: batchValidation.invalid.map(f => f.name) },
        undefined,
        sessionId
      );
      toast.error(`${batchValidation.invalid.length} files are invalid and will be skipped`);
    }
    
    if (batchValidation.warnings.length > 0) {
      batchValidation.warnings.forEach(warning => toast.warning(warning));
    }

    // Process valid files with security scanning
    const validFiles = batchValidation.valid;
    const previews: FilePreview[] = [];
    const validations: Record<string, FileValidationResult> = {};

    for (let i = 0; i < validFiles.length; i++) {
      const file = validFiles[i];
      updateProcessingStep('upload', { 
        progress: ((i + 1) / validFiles.length) * 100,
        description: `Processing file ${i + 1} of ${validFiles.length}: ${file.name}`
      });
      
      try {
        // Security scan if enabled
        if (securityScanEnabled) {
          const securityScan = await SecurityService.scanFileContent(file);
          
          if (securityScan.scanResults.riskLevel === 'critical') {
            toast.error(`Security risk detected in ${file.name}: ${securityScan.scanResults.threats.join(', ')}`);
            continue;
          }
          
          if (securityScan.scanResults.riskLevel === 'high') {
            toast.warning(`High security risk in ${file.name}: ${securityScan.scanResults.threats.join(', ')}`);
          }
          
          // Log security scan
          await SecurityService.logAuditEvent(
            'security_scan',
            file.name,
            { scanResults: securityScan.scanResults },
            undefined,
            sessionId,
            true
          );
        }

        const [preview, validation] = await Promise.all([
          FileValidationService.createPreview(file),
          FileValidationService.validateFile(file)
        ]);
        
        previews.push(preview);
        validations[file.name] = validation;
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
        await ErrorHandlingService.reportError(
          error,
          { fileName: file.name, fileSize: file.size },
          undefined,
          sessionId
        );
        toast.error(`Failed to process ${file.name}`);
      }
    }

    setUploadedFiles(validFiles);
    setFilePreviews(previews);
    setFileValidations(validations);
    
    // Reset other states
    setExtractedExamId("");
    setDetectedStudentName("");
    setManualStudentName("");
    setNeedsManualName(false);
    setAnalysisResult(null);
    setCurrentStep('upload');

    // Complete upload step
    updateProcessingStep('upload', { 
      status: 'completed',
      progress: 100,
      description: `Successfully processed ${validFiles.length} file(s)`
    });

    toast.success(`Processed ${validFiles.length} valid file(s)`);
  };

  const updateProcessingStep = (stepId: string, updates: Partial<ProcessingStep>) => {
    setProcessingSteps(prev => prev.map(step => 
      step.id === stepId 
        ? { 
            ...step, 
            ...updates, 
            startTime: updates.status === 'active' ? Date.now() : step.startTime,
            endTime: updates.status === 'completed' || updates.status === 'error' ? Date.now() : undefined
          }
        : step
    ));
  };

  const removeFile = (index: number) => {
    const newFiles = uploadedFiles.filter((_, i) => i !== index);
    const newPreviews = filePreviews.filter((_, i) => i !== index);
    
    setUploadedFiles(newFiles);
    setFilePreviews(newPreviews);
    
    // Clean up preview URLs
    if (filePreviews[index]) {
      URL.revokeObjectURL(filePreviews[index].previewUrl);
    }
  };

  const processDocument = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload a file first.");
      return;
    }

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    const newSessionId = ProgressService.generateSessionId();
    setSessionId(newSessionId);
    
    let firstOptimizedFile: File;
    
    try {
      // Check cache first if enabled
      let cachedResult = null;
      if (cacheEnabled && uploadedFiles.length > 0) {
        const hash = await CacheService.generateFileHash(uploadedFiles[0]);
        setFileHash(hash);
        cachedResult = await CacheService.getCachedResult(hash);
        
        if (cachedResult) {
          setAnalysisResult(cachedResult);
          setCurrentStep('complete');
          setExtractedExamId(cachedResult.examId || 'cached');
          setDetectedStudentName(cachedResult.studentName || 'Cached Result');
          toast.success("Results loaded from cache!");
          
          await SecurityService.logAuditEvent(
            'cache_hit',
            uploadedFiles[0].name,
            { fileHash: hash },
            undefined,
            newSessionId,
            true
          );
          
          setIsProcessing(false);
          return;
        }
      }

      await PerformanceMonitoringService.measureOperation(
        'full_pipeline',
        async () => {
          // Step 1: File Optimization
          updateProcessingStep('optimization', { 
            status: 'active', 
            progress: 0,
            description: 'Optimizing files for enhanced processing...'
          });

          const optimizedFiles = await Promise.all(
            uploadedFiles.map(async (file, index) => {
              updateProcessingStep('optimization', { 
                progress: ((index + 1) / uploadedFiles.length) * 100,
                description: `Optimizing ${file.name}...`
              });
              
              try {
                const optimization = await FileOptimizationService.processFileForUpload(file);
                return {
                  original: file,
                  optimized: optimization.optimizedFile,
                  compressionRatio: optimization.compressionRatio,
                  processingTime: optimization.processingTime
                };
              } catch (error) {
                await ErrorHandlingService.reportError(
                  error,
                  { fileName: file.name, stage: 'optimization' },
                  undefined,
                  newSessionId
                );
                throw error;
              }
            })
          );

          updateProcessingStep('optimization', { 
            status: 'completed',
            description: `Optimized ${optimizedFiles.length} file(s) for processing`
          });

          firstOptimizedFile = optimizedFiles[0].optimized;

          // Enhanced Step 2: Smart OCR with improved exam ID detection
          updateProcessingStep('extracting', { 
            status: 'active', 
            progress: 0,
            description: 'Starting enhanced exam ID detection and OCR...'
          });
          
          const base64Content = await FileOptimizationService.convertFileToBase64Chunked(firstOptimizedFile);
          
          updateProcessingStep('extracting', { 
            progress: 20,
            description: 'Running initial OCR extraction...'
          });

          let extractResult;
          try {
            extractResult = await extractTextFromFile({
              fileContent: base64Content,
              fileName: firstOptimizedFile.name
            });
          } catch (error) {
            await ErrorHandlingService.reportError(
              error,
              { fileName: firstOptimizedFile.name, stage: 'ocr_extraction' },
              undefined,
              newSessionId
            );
            throw error;
          }

          updateProcessingStep('extracting', { 
            progress: 50,
            description: 'Enhanced exam ID detection in progress...'
          });

          // Enhanced Exam ID Detection
          const detectionResult = await ExamIdDetectionService.detectExamId(extractResult.extractedText);
          setExamDetectionResult(detectionResult);

          let finalExamId = selectedExamIdOverride || detectionResult.examId || extractResult.examId;

          // If no exam ID detected and auto-processing is enabled, show selection modal
          if (!finalExamId && autoProcessingEnabled) {
            updateProcessingStep('extracting', { 
              progress: 60,
              description: 'Exam ID not detected - user selection required...'
            });
            
            setIsProcessing(false);
            setShowExamSelectionModal(true);
            toast.warning("Exam ID could not be detected automatically. Please select from recent exams.");
            return;
          }

          if (!finalExamId) {
            const error = new Error('Could not determine Exam ID for the document');
            await ErrorHandlingService.reportError(
              error,
              { fileName: firstOptimizedFile.name, stage: 'exam_id_detection', detectionResult },
              undefined,
              newSessionId
            );
            updateProcessingStep('extracting', { 
              status: 'error',
              error: 'Could not determine Exam ID for the document'
            });
            toast.error("Could not determine Exam ID. Please ensure the document contains a clearly marked Exam ID or select one manually.");
            setCurrentStep('upload');
            setIsProcessing(false);
            return;
          }

          setExtractedExamId(finalExamId);
          
          updateProcessingStep('extracting', { 
            progress: 70,
            description: `Exam ID confirmed: ${finalExamId} (${detectionResult.detectionMethod})`
          });

          // Multi-page detection for future enhancement
          if (optimizedFiles.length > 1) {
            const extractResults = await Promise.all(
              optimizedFiles.map(async (fileData) => {
                const base64 = await FileOptimizationService.convertFileToBase64Chunked(fileData.optimized);
                const result = await extractTextFromFile({
                  fileContent: base64,
                  fileName: fileData.optimized.name
                });
                return {
                  file: fileData.optimized,
                  examId: result.examId,
                  studentName: result.studentName,
                  extractedText: result.extractedText
                };
              })
            );

            const pageDetection = await MultiPageDetectionService.detectPageGroups(
              optimizedFiles.map(f => f.optimized),
              extractResults
            );
            setPageGroups(pageDetection.pageGroups);
          }

          // Continue with existing student name detection logic
          if (extractResult.studentName) {
            setDetectedStudentName(extractResult.studentName);
            toast.success(`Automatically detected student: ${extractResult.studentName}`);
            setNeedsManualName(false);
          } else {
            toast.warning("Could not automatically detect student name. Please enter it manually.");
            setNeedsManualName(true);
            setIsProcessing(false);
            setCurrentStep('upload');
            return;
          }

          updateProcessingStep('extracting', { 
            status: 'completed',
            progress: 100,
            description: `Enhanced OCR completed - Exam: ${finalExamId}, Student: ${extractResult.studentName}`
          });

          // Continue with rest of existing analysis logic...
          // Step 3: Analyze all files with enhanced data
          updateProcessingStep('analyzing', { 
            status: 'active', 
            progress: 0,
            description: 'Starting AI analysis with enhanced OCR data...'
          });

          const allFileResults = await Promise.all(
            optimizedFiles.map(async (fileData, index) => {
              updateProcessingStep('analyzing', { 
                progress: ((index + 1) / optimizedFiles.length) * 50,
                description: `Analyzing file ${index + 1} of ${optimizedFiles.length}...`
              });
              
              try {
                const base64Content = await FileOptimizationService.convertFileToBase64Chunked(fileData.optimized);
                const result = await extractTextFromFile({
                  fileContent: base64Content,
                  fileName: fileData.optimized.name
                });
                return {
                  fileName: fileData.optimized.name,
                  extractedText: result.extractedText,
                  structuredData: result.structuredData
                };
              } catch (error) {
                await ErrorHandlingService.reportError(
                  error,
                  { fileName: fileData.optimized.name, stage: 'individual_analysis' },
                  undefined,
                  newSessionId
                );
                throw error;
              }
            })
          );

          updateProcessingStep('analyzing', { 
            progress: 75,
            description: 'Running final AI analysis...'
          });

          const finalStudentName = detectedStudentName || manualStudentName.trim();

          let analysisResult;
          try {
            analysisResult = await analyzeTest({
              files: allFileResults,
              examId: extractResult.examId,
              studentName: finalStudentName
            });
          } catch (error) {
            await ErrorHandlingService.reportError(
              error,
              { examId: extractResult.examId, studentName: finalStudentName, stage: 'final_analysis' },
              undefined,
              newSessionId
            );
            throw error;
          }

          setAnalysisResult(analysisResult);
          setCurrentStep('complete');
          
          // Define OCR metadata from analysis result
          const ocrMetadata = {
            reliability: analysisResult.dual_ocr_summary?.overall_reliability || 0,
            confidence: analysisResult.dual_ocr_summary?.overall_reliability || 0,
            detections: analysisResult.dual_ocr_summary?.high_confidence_detections || 0
          };
          
          // Cache result if enabled
          if (cacheEnabled && fileHash) {
            await CacheService.setCachedResult(
              fileHash,
              firstOptimizedFile.name,
              firstOptimizedFile.size,
              {
                ...analysisResult,
                examId: extractResult.examId,
                studentName: finalStudentName
              },
              {
                processingTime: Date.now() - processingStartTime,
                ocrReliability: ocrMetadata.reliability
              }
            );
          }
          
          // Update final step
          const analysisMetadata = {
            confidence: analysisResult.dual_ocr_summary?.overall_reliability || 0,
            detections: analysisResult.dual_ocr_summary?.high_confidence_detections || 0,
            reliability: analysisResult.dual_ocr_summary?.overall_reliability || 0
          };

          updateProcessingStep('analyzing', { 
            status: 'completed',
            progress: 100,
            metadata: analysisMetadata,
            description: 'Enhanced AI analysis completed successfully'
          });

          // Record smart OCR performance metrics
          if (smartOcrEnabled && analysisResult.dual_ocr_summary) {
            SmartOcrService.recordPerformanceMetrics(
              `${firstOptimizedFile.name}_${Date.now()}`,
              {
                accuracy: analysisResult.dual_ocr_summary.overall_reliability,
                confidence: analysisResult.dual_ocr_summary.overall_reliability,
                processingTime: Date.now() - processingStartTime,
                methodsUsed: analysisResult.dual_ocr_summary.processing_methods_used || ['google_ocr'],
                fallbacksTriggered: analysisResult.dual_ocr_summary.fallback_detections || 0,
                crossValidationScore: analysisResult.dual_ocr_summary.cross_validated_answers || 0
              }
            );
          }

          // Log successful processing
          await SecurityService.logAuditEvent(
            'file_processing',
            firstOptimizedFile.name,
            {
              examId: extractResult.examId,
              studentName: finalStudentName,
              processingTime: Date.now() - processingStartTime,
              reliability: analysisMetadata.reliability
            },
            undefined,
            newSessionId,
            true
          );

          // Save progress
          const progress: ProcessingProgress = {
            sessionId: newSessionId,
            fileName: firstOptimizedFile.name,
            currentStep: 'complete',
            extractedText: extractResult.extractedText,
            examId: extractResult.examId,
            studentName: finalStudentName,
            structuredData: extractResult.structuredData,
            analysisResult,
            timestamp: Date.now(),
            processingStartTime
          };
          ProgressService.saveProgress(progress);

          if (analysisResult.dual_ocr_summary?.overall_reliability) {
            const reliability = analysisResult.dual_ocr_summary.overall_reliability;
            toast.success(`Enhanced analysis completed! OCR Reliability: ${(reliability * 100).toFixed(1)}%`);
          } else {
            toast.success("Document analysis completed!");
          }

        },
        {
          fileName: firstOptimizedFile?.name || uploadedFiles[0]?.name || 'unknown',
          fileSize: firstOptimizedFile?.size || uploadedFiles[0]?.size || 0,
          smartOcrEnabled
        }
      );
    } catch (error) {
      console.error("Error processing document:", error);
      
      await ErrorHandlingService.reportError(
        error,
        {
          fileName: firstOptimizedFile?.name || uploadedFiles[0]?.name,
          sessionId: newSessionId,
          stage: 'document_processing',
          examDetection: examDetectionResult
        },
        undefined,
        newSessionId
      );
      
      const currentActiveStep = processingSteps.find(step => step.status === 'active');
      if (currentActiveStep) {
        updateProcessingStep(currentActiveStep.id, { 
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error occurred'
        });
      }
      
      toast.error("Failed to process document. Please try again.");
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleExamSelection = (examId: string) => {
    setSelectedExamIdOverride(examId);
    setExtractedExamId(examId);
    setShowExamSelectionModal(false);
    
    // Continue processing with selected exam ID
    toast.success(`Exam ID selected: ${examId}. Continuing processing...`);
    processDocument();
  };

  const resetProcess = () => {
    setUploadedFiles([]);
    setFilePreviews([]);
    setFileValidations({});
    setExtractedExamId("");
    setDetectedStudentName("");
    setManualStudentName("");
    setNeedsManualName(false);
    setAnalysisResult(null);
    setCurrentStep('upload');
    setIsProcessing(false);
    setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));
  };

  const getFileIcon = (file: File) => {
    if (file.type.startsWith('image/')) return <Image className="h-4 w-4" />;
    if (file.type.startsWith('video/')) return <Video className="h-4 w-4" />;
    return <FileText className="h-4 w-4" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getStepColor = (step: string) => {
    if (currentStep === step && isProcessing) return "text-blue-600";
    if (currentStep === 'complete' || 
        (currentStep === 'analyzing' && step === 'extracting')) return "text-green-600";
    return "text-gray-400";
  };

  const getOverallProgress = () => {
    const completedSteps = processingSteps.filter(step => step.status === 'completed').length;
    const activeStep = processingSteps.find(step => step.status === 'active');
    
    let progress = (completedSteps / processingSteps.length) * 100;
    
    if (activeStep && activeStep.progress) {
      progress += (activeStep.progress / 100) * (1 / processingSteps.length) * 100;
    }
    
    return Math.min(progress, 100);
  };

  const getEstimatedTimeRemaining = () => {
    if (!processingStartTime) return undefined;
    
    const activeStep = processingSteps.find(step => step.status === 'active');
    if (!activeStep) return undefined;
    
    return ProgressService.estimateTimeRemaining(
      activeStep.id as any,
      processingStartTime
    );
  };

  const finalStudentName = detectedStudentName || manualStudentName;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Back to Homepage Button */}
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Homepage
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Test - Enterprise Edition</h1>
          <p className="text-gray-600">Enhanced processing with caching, security scanning, and enterprise-grade monitoring</p>
        </div>

        {/* Enhanced Features Toggle */}
        <div className="mb-6 flex flex-wrap gap-2">
          <Button
            variant={showBatchProcessing ? "default" : "outline"}
            size="sm"
            onClick={() => setShowBatchProcessing(!showBatchProcessing)}
          >
            Batch Processing
          </Button>
          <Button
            variant={showPerformanceDashboard ? "default" : "outline"}
            size="sm"
            onClick={() => setShowPerformanceDashboard(!showPerformanceDashboard)}
          >
            Performance Dashboard
          </Button>
          <Button
            variant={smartOcrEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSmartOcrEnabled(!smartOcrEnabled)}
          >
            Smart OCR {smartOcrEnabled ? '✓' : ''}
          </Button>
          <Button
            variant={autoProcessingEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setAutoProcessingEnabled(!autoProcessingEnabled)}
          >
            Auto Processing {autoProcessingEnabled ? '✓' : ''}
          </Button>
          <Button
            variant={showEnterpriseFeatures ? "default" : "outline"}
            size="sm"
            onClick={() => setShowEnterpriseFeatures(!showEnterpriseFeatures)}
          >
            Enterprise Features {showEnterpriseFeatures ? '✓' : ''}
          </Button>
          <Button
            variant={cacheEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setCacheEnabled(!cacheEnabled)}
          >
            Caching {cacheEnabled ? '✓' : ''}
          </Button>
          <Button
            variant={securityScanEnabled ? "default" : "outline"}
            size="sm"
            onClick={() => setSecurityScanEnabled(!securityScanEnabled)}
          >
            Security Scan {securityScanEnabled ? '✓' : ''}
          </Button>
        </div>

        {/* Enhanced Detection Results Display */}
        {examDetectionResult && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  Enhanced Exam ID Detection Results
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Detection Method:</span>
                    <Badge variant="outline">{examDetectionResult.detectionMethod}</Badge>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Confidence:</span>
                    <Badge variant={examDetectionResult.confidence > 0.8 ? "default" : "secondary"}>
                      {Math.round(examDetectionResult.confidence * 100)}%
                    </Badge>
                  </div>
                  {examDetectionResult.examId && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Detected Exam ID:</span>
                      <Badge variant="default">{examDetectionResult.examId}</Badge>
                    </div>
                  )}
                  {examDetectionResult.rawMatches.length > 0 && (
                    <div className="space-y-1">
                      <span className="text-sm font-medium">Raw Matches Found:</span>
                      <div className="flex flex-wrap gap-1">
                        {examDetectionResult.rawMatches.map((match, index) => (
                          <Badge key={index} variant="outline" className="text-xs">{match}</Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Page Groups Display (for multi-page documents) */}
        {pageGroups.length > 0 && (
          <div className="mb-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Detected Page Groups ({pageGroups.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {pageGroups.map((group, index) => (
                    <div key={group.groupId} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge variant="default">Group {index + 1}</Badge>
                          <span className="text-sm font-medium">
                            {group.examId || 'Unknown Exam'} - {group.studentName || 'Unknown Student'}
                          </span>
                        </div>
                        <Badge variant={group.isComplete ? "default" : "secondary"}>
                          {group.isComplete ? 'Complete' : 'Incomplete'}
                        </Badge>
                      </div>
                      <div className="text-xs text-gray-600">
                        {group.totalPages} page(s): {group.pages.map(p => p.fileName).join(', ')}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Processing Progress */}
        {(isProcessing || analysisResult) && (
          <div className="mb-6">
            <EnhancedProgressIndicator
              steps={processingSteps}
              currentStep={currentStep}
              overallProgress={getOverallProgress()}
              estimatedTimeRemaining={getEstimatedTimeRemaining()}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                Enterprise File Upload with Enhanced Detection
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={(e) => { e.preventDefault(); setDragActive(true); }}
                onDragLeave={(e) => { e.preventDefault(); setDragActive(false); }}
                onDragOver={(e) => { e.preventDefault(); setDragActive(true); }}
                onDrop={(e) => {
                  e.preventDefault();
                  setDragActive(false);
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const files = Array.from(e.dataTransfer.files);
                    handleFiles(files);
                  }
                }}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop test documents here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to select files (images, PDFs) - up to 10MB each
                  {securityScanEnabled && <span className="block text-green-600">✓ Security scanning enabled</span>}
                  {cacheEnabled && <span className="block text-blue-600">✓ Caching enabled</span>}
                </p>
                <input
                  type="file"
                  multiple
                  accept="image/*,.pdf"
                  onChange={handleFileInput}
                  className="hidden"
                  id="file-upload"
                />
                <Button asChild>
                  <label htmlFor="file-upload" className="cursor-pointer">
                    Select Files
                  </label>
                </Button>
              </div>

              {/* File Previews */}
              {filePreviews.length > 0 && (
                <div className="mt-6 space-y-3">
                  <h3 className="font-medium text-gray-900">Uploaded Files ({filePreviews.length})</h3>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {filePreviews.map((preview, index) => (
                      <FilePreviewCard
                        key={`${preview.file.name}-${index}`}
                        preview={preview}
                        validation={fileValidations[preview.file.name]}
                        onRemove={() => removeFile(index)}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Manual Name Input (fallback) */}
              {uploadedFiles.length > 0 && needsManualName && !analysisResult && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <h3 className="font-medium text-yellow-900 mb-3">⚠️ Manual Input Required</h3>
                    <p className="text-sm text-yellow-700 mb-3">
                      Could not automatically detect the student name. Please enter it manually:
                    </p>
                    <div>
                      <Label htmlFor="manual-student-name">Student Name *</Label>
                      <Input
                        id="manual-student-name"
                        value={manualStudentName}
                        onChange={(e) => setManualStudentName(e.target.value)}
                        placeholder="Enter student's full name"
                        className="mt-1"
                      />
                    </div>
                  </div>
                </div>
              )}

              {/* Enhanced Process Document Button */}
              {!analysisResult && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Ready for Enhanced Processing</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    {uploadedFiles.length === 0 
                      ? "Upload your document to enable enhanced exam ID detection, multi-page processing, and automated student association."
                      : "Your document is ready for enhanced processing with improved exam ID detection and automated workflows."
                    }
                  </p>
                  {autoProcessingEnabled && (
                    <p className="text-xs text-blue-600 mb-3">
                      ✓ Auto-processing enabled: System will automatically handle exam ID detection and student association
                    </p>
                  )}
                  <Button 
                    onClick={processDocument}
                    disabled={isProcessing || uploadedFiles.length === 0 || (needsManualName && !manualStudentName.trim())}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing with Enhanced Detection...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Process with Enhanced Detection
                      </>
                    )}
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Enhanced Results Display */}
          {analysisResult ? (
            <ResultsManager
              result={analysisResult}
              studentName={finalStudentName}
              examId={extractedExamId}
              fileName={uploadedFiles[0]?.name || 'Unknown'}
              processingTime={processingStartTime ? Date.now() - processingStartTime : undefined}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Enhanced Processing Statistics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-emerald-50 rounded-lg">
                    <span className="text-sm font-medium text-emerald-700">Auto Processing</span>
                    <span className="text-lg font-bold text-emerald-900">
                      {autoProcessingEnabled ? "✓ Enabled" : "Disabled"}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-violet-50 rounded-lg">
                    <span className="text-sm font-medium text-violet-700">Detection Method</span>
                    <span className="text-lg font-bold text-violet-900">
                      {examDetectionResult?.detectionMethod || "Pending"}
                    </span>
                  </div>
                  {pageGroups.length > 0 && (
                    <div className="flex justify-between items-center p-3 bg-cyan-50 rounded-lg">
                      <span className="text-sm font-medium text-cyan-700">Page Groups</span>
                      <span className="text-lg font-bold text-cyan-900">
                        {pageGroups.length} detected
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Exam Selection Modal */}
        <ExamSelectionModal
          isOpen={showExamSelectionModal}
          onClose={() => setShowExamSelectionModal(false)}
          onSelect={handleExamSelection}
          detectionResult={examDetectionResult}
          fileName={uploadedFiles[0]?.name || 'Unknown'}
        />

        {/* Reset button for completed analysis */}
        {analysisResult && (
          <div className="mt-6 text-center">
            <Button 
              onClick={() => {
                setUploadedFiles([]);
                setFilePreviews([]);
                setFileValidations({});
                setExtractedExamId("");
                setDetectedStudentName("");
                setManualStudentName("");
                setNeedsManualName(false);
                setAnalysisResult(null);
                setCurrentStep('upload');
                setIsProcessing(false);
                setFileHash('');
                setProcessingSteps(prev => prev.map(step => ({ ...step, status: 'pending' as const })));
              }}
              variant="outline"
              size="lg"
            >
              Process Another Document
            </Button>
          </div>
        )}
      </div>
    </div>
  );
};

export default UploadTest;
