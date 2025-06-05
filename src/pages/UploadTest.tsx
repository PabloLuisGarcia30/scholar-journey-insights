import { useState, useEffect } from "react";
import { Upload, FileText, Image, Video, Brain, ArrowLeft, CheckCircle, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { extractTextFromFile, analyzeTest } from "@/services/testAnalysisService";
import { FileValidationService, FilePreview, FileValidationResult } from "@/services/fileValidationService";
import { FileOptimizationService } from "@/services/fileOptimizationService";
import { ProgressService, ProcessingProgress } from "@/services/progressService";
import { FilePreviewCard } from "@/components/FilePreviewCard";
import { EnhancedProgressIndicator, ProcessingStep } from "@/components/EnhancedProgressIndicator";
import { ResultsManager } from "@/components/ResultsManager";

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
    // Update upload step
    updateProcessingStep('upload', { status: 'active', progress: 0 });
    
    // Batch validation
    const batchValidation = FileValidationService.validateBatch(files);
    
    if (batchValidation.invalid.length > 0) {
      toast.error(`${batchValidation.invalid.length} files are invalid and will be skipped`);
    }
    
    if (batchValidation.warnings.length > 0) {
      batchValidation.warnings.forEach(warning => toast.warning(warning));
    }

    // Process valid files
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
        const [preview, validation] = await Promise.all([
          FileValidationService.createPreview(file),
          FileValidationService.validateFile(file)
        ]);
        
        previews.push(preview);
        validations[file.name] = validation;
      } catch (error) {
        console.error(`Failed to process file ${file.name}:`, error);
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

    if (needsManualName && !manualStudentName.trim()) {
      toast.error("Please enter the student's name.");
      return;
    }

    // Check if all files are valid
    const hasInvalidFiles = uploadedFiles.some(file => 
      !fileValidations[file.name]?.isValid
    );
    
    if (hasInvalidFiles) {
      toast.error("Please fix file validation errors before processing.");
      return;
    }

    setIsProcessing(true);
    setProcessingStartTime(Date.now());
    const newSessionId = ProgressService.generateSessionId();
    setSessionId(newSessionId);
    
    try {
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
          
          const optimization = await FileOptimizationService.processFileForUpload(file);
          return {
            original: file,
            optimized: optimization.optimizedFile,
            compressionRatio: optimization.compressionRatio,
            processingTime: optimization.processingTime
          };
        })
      );

      updateProcessingStep('optimization', { 
        status: 'completed',
        description: `Optimized ${optimizedFiles.length} file(s) for processing`
      });

      // Step 2: Extract text with enhanced dual OCR
      updateProcessingStep('extracting', { 
        status: 'active', 
        progress: 0,
        description: 'Starting enhanced dual OCR extraction...'
      });
      
      const firstOptimizedFile = optimizedFiles[0].optimized;
      const base64Content = await FileOptimizationService.convertFileToBase64Chunked(firstOptimizedFile);
      
      updateProcessingStep('extracting', { 
        progress: 30,
        description: 'Running Google OCR + Roboflow bubble detection...'
      });

      const extractResult = await extractTextFromFile({
        fileContent: base64Content,
        fileName: firstOptimizedFile.name
      });

      if (!extractResult.examId) {
        updateProcessingStep('extracting', { 
          status: 'error',
          error: 'Could not find Exam ID in the document'
        });
        toast.error("Could not find Exam ID in the document. Please ensure the document contains a clearly marked Exam ID.");
        setCurrentStep('upload');
        setIsProcessing(false);
        return;
      }

      setExtractedExamId(extractResult.examId);
      
      // Update step with OCR metadata
      const ocrMetadata = {
        confidence: extractResult.structuredData?.validationResults?.overallReliability || 0,
        detections: extractResult.structuredData?.documentMetadata?.roboflowDetections || 0,
        reliability: extractResult.structuredData?.validationResults?.overallReliability || 0,
        method: extractResult.structuredData?.documentMetadata?.processingMethods?.join(' + ') || 'Standard OCR'
      };

      updateProcessingStep('extracting', { 
        progress: 70,
        metadata: ocrMetadata,
        description: `OCR extraction completed with ${(ocrMetadata.reliability * 100).toFixed(1)}% reliability`
      });
      
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
        description: 'Enhanced dual OCR extraction completed successfully'
      });

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
        })
      );

      updateProcessingStep('analyzing', { 
        progress: 75,
        description: 'Running final AI analysis...'
      });

      const finalStudentName = detectedStudentName || manualStudentName.trim();

      const analysisResult = await analyzeTest({
        files: allFileResults,
        examId: extractResult.examId,
        studentName: finalStudentName
      });

      setAnalysisResult(analysisResult);
      setCurrentStep('complete');
      
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

    } catch (error) {
      console.error("Error processing document:", error);
      
      // Update current step with error
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Test - Enhanced Dual OCR</h1>
          <p className="text-gray-600">Upload test documents for automatic Google OCR + Roboflow bubble detection and AI analysis with 99% accuracy</p>
        </div>

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
                Enhanced File Upload
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
                      ? "Upload your document first to enable Google OCR + Roboflow bubble detection and AI analysis."
                      : "Your document is ready for enhanced dual OCR processing and AI analysis with 99% accuracy."
                    }
                  </p>
                  <Button 
                    onClick={processDocument}
                    disabled={isProcessing || uploadedFiles.length === 0 || (needsManualName && !manualStudentName.trim())}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing with Enhanced AI...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Process with Enhanced Dual OCR
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
                  <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                    <span className="text-sm font-medium text-blue-700">Total Files</span>
                    <span className="text-lg font-bold text-blue-900">{uploadedFiles.length}</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                    <span className="text-sm font-medium text-green-700">Valid Files</span>
                    <span className="text-lg font-bold text-green-900">
                      {Object.values(fileValidations).filter(v => v.isValid).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-yellow-50 rounded-lg">
                    <span className="text-sm font-medium text-yellow-700">Warnings</span>
                    <span className="text-lg font-bold text-yellow-900">
                      {Object.values(fileValidations).reduce((acc, v) => acc + v.warnings.length, 0)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                    <span className="text-sm font-medium text-purple-700">Student</span>
                    <span className="text-lg font-bold text-purple-900">
                      {finalStudentName || (needsManualName ? "Manual input needed" : "Auto-detecting...")}
                    </span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                    <span className="text-sm font-medium text-orange-700">Exam ID Status</span>
                    <span className="text-lg font-bold text-orange-900">
                      {extractedExamId ? `✓ ${extractedExamId}` : "Pending"}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

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
