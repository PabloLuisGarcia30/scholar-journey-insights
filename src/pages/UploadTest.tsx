import { useState } from "react";
import { Upload, FileText, Image, Video, Brain, ArrowLeft, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import { extractTextFromFile, analyzeTest } from "@/services/testAnalysisService";

const UploadTest = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentStep, setCurrentStep] = useState<'upload' | 'extracting' | 'analyzing' | 'complete'>('upload');
  const [extractedExamId, setExtractedExamId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentEmail, setStudentEmail] = useState("");
  const [analysisResult, setAnalysisResult] = useState<{
    overall_score: number;
    total_points_earned: number;
    total_points_possible: number;
    grade: string;
    feedback: string;
    detailed_analysis: string;
    content_skill_scores: Array<{skill_name: string, score: number, points_earned: number, points_possible: number}>;
    subject_skill_scores: Array<{skill_name: string, score: number, points_earned: number, points_possible: number}>;
  } | null>(null);

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

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      handleFiles(files);
    }
  };

  const handleFiles = (files: File[]) => {
    setUploadedFiles(prev => [...prev, ...files]);
    setExtractedExamId("");
    setAnalysisResult(null);
    setCurrentStep('upload');
    toast.success(`Uploaded ${files.length} file(s) successfully!`);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const processDocument = async () => {
    if (uploadedFiles.length === 0) {
      toast.error("Please upload a file first.");
      return;
    }

    if (!studentName.trim()) {
      toast.error("Please enter the student's name.");
      return;
    }

    setIsProcessing(true);
    
    try {
      // Step 1: Extract text and exam ID
      setCurrentStep('extracting');
      toast.info("Extracting text from document...");
      
      const firstFile = uploadedFiles[0];
      const base64Content = await convertFileToBase64(firstFile);
      
      const extractResult = await extractTextFromFile({
        fileContent: base64Content,
        fileName: firstFile.name
      });

      if (!extractResult.examId) {
        toast.error("Could not find Exam ID in the document. Please ensure the document contains a clearly marked Exam ID.");
        setCurrentStep('upload');
        setIsProcessing(false);
        return;
      }

      setExtractedExamId(extractResult.examId);
      toast.success(`Exam ID extracted: ${extractResult.examId}`);

      // Step 2: Analyze all files
      setCurrentStep('analyzing');
      toast.info("Analyzing test with AI...");

      const allFileResults = await Promise.all(
        uploadedFiles.map(async (file) => {
          const base64Content = await convertFileToBase64(file);
          const result = await extractTextFromFile({
            fileContent: base64Content,
            fileName: file.name
          });
          return {
            fileName: file.name,
            extractedText: result.extractedText
          };
        })
      );

      const analysisResult = await analyzeTest({
        files: allFileResults,
        examId: extractResult.examId,
        studentName: studentName.trim(),
        studentEmail: studentEmail.trim() || undefined
      });

      setAnalysisResult(analysisResult);
      setCurrentStep('complete');
      toast.success("Document analysis completed!");

    } catch (error) {
      console.error("Error processing document:", error);
      toast.error("Failed to process document. Please try again.");
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const resetProcess = () => {
    setUploadedFiles([]);
    setExtractedExamId("");
    setStudentName("");
    setStudentEmail("");
    setAnalysisResult(null);
    setCurrentStep('upload');
    setIsProcessing(false);
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

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Upload Test</h1>
          <p className="text-gray-600">Upload test documents for automatic OCR extraction and AI analysis</p>
        </div>

        {/* Processing Steps */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Processing Steps</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  uploadedFiles.length > 0 ? 'bg-green-100 border-green-500' : 'border-gray-300'
                }`}>
                  {uploadedFiles.length > 0 ? <CheckCircle className="h-4 w-4 text-green-600" /> : '1'}
                </div>
                <span className={uploadedFiles.length > 0 ? 'text-green-600 font-medium' : 'text-gray-600'}>
                  Upload Document
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  extractedExamId ? 'bg-green-100 border-green-500' : 
                  currentStep === 'extracting' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                }`}>
                  {extractedExamId ? <CheckCircle className="h-4 w-4 text-green-600" /> : 
                   currentStep === 'extracting' && isProcessing ? 
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> : '2'}
                </div>
                <span className={getStepColor('extracting')}>
                  Extract Exam ID
                </span>
              </div>
              
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center ${
                  analysisResult ? 'bg-green-100 border-green-500' : 
                  currentStep === 'analyzing' ? 'bg-blue-100 border-blue-500' : 'border-gray-300'
                }`}>
                  {analysisResult ? <CheckCircle className="h-4 w-4 text-green-600" /> : 
                   currentStep === 'analyzing' && isProcessing ? 
                   <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div> : '3'}
                </div>
                <span className={getStepColor('analyzing')}>
                  AI Analysis
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Upload Area */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5" />
                File Upload
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  dragActive
                    ? "border-blue-500 bg-blue-50"
                    : "border-gray-300 hover:border-gray-400"
                }`}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
              >
                <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-lg font-medium text-gray-700 mb-2">
                  Drop test documents here
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to select files (images, PDFs)
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

              {/* Student Information */}
              {uploadedFiles.length > 0 && !analysisResult && (
                <div className="mt-6 space-y-4">
                  <div className="p-4 bg-gray-50 rounded-lg border">
                    <h3 className="font-medium text-gray-900 mb-3">Student Information</h3>
                    <div className="space-y-3">
                      <div>
                        <Label htmlFor="student-name">Student Name *</Label>
                        <Input
                          id="student-name"
                          value={studentName}
                          onChange={(e) => setStudentName(e.target.value)}
                          placeholder="Enter student's full name"
                          className="mt-1"
                        />
                      </div>
                      <div>
                        <Label htmlFor="student-email">Student Email (Optional)</Label>
                        <Input
                          id="student-email"
                          type="email"
                          value={studentEmail}
                          onChange={(e) => setStudentEmail(e.target.value)}
                          placeholder="student@example.com"
                          className="mt-1"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Process Document Button */}
              {uploadedFiles.length > 0 && !analysisResult && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">Ready to Process</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Your document is ready for OCR text extraction and AI analysis. This will automatically extract the Exam ID and grade the test.
                  </p>
                  <Button 
                    onClick={processDocument}
                    disabled={isProcessing || !studentName.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        {currentStep === 'extracting' ? 'Extracting text...' : 'Analyzing with AI...'}
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Process Document
                      </>
                    )}
                  </Button>
                  {!studentName.trim() && (
                    <p className="text-xs text-red-600 mt-2">Please enter the student's name to continue</p>
                  )}
                </div>
              )}

              {/* Results Display */}
              {analysisResult && (
                <div className="mt-6 p-4 bg-green-50 rounded-lg border border-green-200">
                  <div className="flex items-center gap-3 mb-3">
                    <CheckCircle className="h-5 w-5 text-green-600" />
                    <h3 className="font-medium text-green-900">Analysis Complete - {studentName}</h3>
                  </div>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-green-700">Overall Grade: </span>
                      <span className="text-lg font-bold text-green-900">{analysisResult.grade}</span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Score: </span>
                      <span className="text-sm text-green-800">
                        {analysisResult.total_points_earned}/{analysisResult.total_points_possible} points
                      </span>
                    </div>
                    <div>
                      <span className="text-sm font-medium text-green-700">Feedback: </span>
                      <p className="text-sm text-green-800">{analysisResult.feedback}</p>
                    </div>
                    
                    {/* Content Skills */}
                    {analysisResult.content_skill_scores && analysisResult.content_skill_scores.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-green-700">Content Skills: </span>
                        <div className="mt-1 space-y-1">
                          {analysisResult.content_skill_scores.map((skill, index) => (
                            <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                              {skill.skill_name}: {skill.score.toFixed(1)}% ({skill.points_earned}/{skill.points_possible})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Subject Skills */}
                    {analysisResult.subject_skill_scores && analysisResult.subject_skill_scores.length > 0 && (
                      <div>
                        <span className="text-sm font-medium text-green-700">Subject Skills: </span>
                        <div className="mt-1 space-y-1">
                          {analysisResult.subject_skill_scores.map((skill, index) => (
                            <div key={index} className="text-xs text-green-700 bg-green-100 px-2 py-1 rounded">
                              {skill.skill_name}: {skill.score.toFixed(1)}% ({skill.points_earned}/{skill.points_possible})
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <details className="text-sm">
                      <summary className="font-medium text-green-700 cursor-pointer">View Detailed Analysis</summary>
                      <pre className="mt-2 p-3 bg-white rounded border text-xs whitespace-pre-wrap">{analysisResult.detailed_analysis}</pre>
                    </details>
                  </div>
                  <Button 
                    onClick={resetProcess}
                    variant="outline"
                    className="w-full mt-4"
                  >
                    Process Another Document
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Upload Stats */}
          <Card>
            <CardHeader>
              <CardTitle>Upload Statistics</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-700">Total Files</span>
                  <span className="text-lg font-bold text-blue-900">{uploadedFiles.length}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
                  <span className="text-sm font-medium text-green-700">Total Size</span>
                  <span className="text-lg font-bold text-green-900">
                    {formatFileSize(uploadedFiles.reduce((acc, file) => acc + file.size, 0))}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-purple-50 rounded-lg">
                  <span className="text-sm font-medium text-purple-700">Student</span>
                  <span className="text-lg font-bold text-purple-900">
                    {studentName || "Not entered"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
                  <span className="text-sm font-medium text-orange-700">Exam ID Status</span>
                  <span className="text-lg font-bold text-orange-900">
                    {extractedExamId ? `✓ ${extractedExamId}` : "Pending"}
                  </span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-gray-700">Processing Status</span>
                  <span className="text-lg font-bold text-gray-900">
                    {analysisResult ? "✓ Complete" : 
                     isProcessing ? "In Progress" : 
                     uploadedFiles.length > 0 ? "Ready" : "Waiting"}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Uploaded Files List */}
        {uploadedFiles.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {uploadedFiles.map((file, index) => (
                  <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      {getFileIcon(file)}
                      <div>
                        <p className="font-medium text-gray-900">{file.name}</p>
                        <p className="text-sm text-gray-500">{file.type || 'Unknown type'}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-700">{formatFileSize(file.size)}</p>
                      <p className="text-xs text-green-600">✓ Uploaded</p>
                    </div>
                  </div>
                ))}
              </div>
              {uploadedFiles.length > 0 && (
                <Button 
                  variant="outline" 
                  className="w-full mt-4"
                  onClick={resetProcess}
                >
                  Clear All Files
                </Button>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default UploadTest;
