import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { extractTextFromFile, analyzeTest } from '@/services/testAnalysisService';
import type { ExtractTextResponse, AnalyzeTestResponse } from '@/services/testAnalysisService';

export default function StudentUpload() {
  const [studentName, setStudentName] = useState('');
  const [studentId, setStudentId] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractedResults, setExtractedResults] = useState<ExtractTextResponse[]>([]);
  const [analysisResult, setAnalysisResult] = useState<AnalyzeTestResponse | null>(null);
  const [currentStep, setCurrentStep] = useState<'upload' | 'processing' | 'results'>('upload');
  const { toast } = useToast();

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setSelectedFiles(files);
  };

  const handleRemoveFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]); // Remove data:image/jpeg;base64, prefix
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  const handleUploadAndAnalyze = async () => {
    if (!studentName.trim() && !studentId.trim()) {
      toast({
        title: "Student information required",
        description: "Please enter your name or student ID before uploading files.",
        variant: "destructive",
      });
      return;
    }

    if (selectedFiles.length === 0) {
      toast({
        title: "No files selected",
        description: "Please select at least one file to upload.",
        variant: "destructive",
      });
      return;
    }

    setIsProcessing(true);
    setCurrentStep('processing');

    try {
      console.log('🚀 Starting consolidated processing workflow');
      
      // Step 1: Extract text from all files
      const extractionPromises = selectedFiles.map(async (file) => {
        const fileContent = await convertFileToBase64(file);
        return extractTextFromFile({
          fileContent,
          fileName: file.name,
        });
      });

      const extractionResults = await Promise.all(extractionPromises);
      setExtractedResults(extractionResults);

      // Check for detected Student IDs
      const detectedIds = extractionResults
        .map(result => result.studentId)
        .filter(Boolean);
      
      if (detectedIds.length > 0) {
        console.log(`🆔 Detected Student IDs: ${detectedIds.join(', ')}`);
        
        if (!studentId.trim() && detectedIds[0]) {
          setStudentId(detectedIds[0]);
        }
      }

      // Step 2: Analyze the test if we found an exam ID
      const examId = extractionResults.find(result => result.examId)?.examId;
      
      if (!examId) {
        toast({
          title: "Exam not recognized",
          description: "Could not automatically detect the exam. The system will still process your submission, but manual review may be required.",
          variant: "destructive",
        });
        setCurrentStep('results');
        return;
      }

      // Prepare files for analysis
      const filesForAnalysis = extractionResults.map(result => ({
        fileName: result.fileName,
        extractedText: result.extractedText,
        structuredData: result.structuredData,
      }));

      console.log('🎯 Starting test analysis with consolidated grading service');
      const analysisResponse = await analyzeTest({
        files: filesForAnalysis,
        examId,
        studentName: studentName.trim() || studentId.trim(),
        studentEmail: '',
      });

      setAnalysisResult(analysisResponse);
      setCurrentStep('results');

      const detectedIdInfo = detectedIds.length > 0 ? ` Student ID detected: ${detectedIds[0]}` : '';
      
      toast({
        title: "Analysis completed!",
        description: `Your test has been processed successfully. Overall score: ${analysisResponse.overall_score}%${detectedIdInfo}`,
      });

    } catch (error) {
      console.error('Error processing files:', error);
      toast({
        title: "Processing failed",
        description: error instanceof Error ? error.message : "An error occurred while processing your files.",
        variant: "destructive",
      });
      setCurrentStep('upload');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleStartOver = () => {
    setSelectedFiles([]);
    setExtractedResults([]);
    setAnalysisResult(null);
    setCurrentStep('upload');
    setStudentName('');
    setStudentId('');
  };

  const renderUploadStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="studentName">Your Name</Label>
          <Input
            id="studentName"
            value={studentName}
            onChange={(e) => setStudentName(e.target.value)}
            placeholder="Enter your full name"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="studentId">Student ID (recommended)</Label>
          <Input
            id="studentId"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            placeholder="Enter your student ID"
          />
        </div>
      </div>
      
      <div className="text-sm text-muted-foreground bg-accent p-3 rounded">
        <strong>Tip:</strong> Including your Student ID improves processing accuracy and helps ensure your test is correctly identified.
      </div>

      <div className="space-y-4">
        <Label>Upload Your Test Files</Label>
        <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center">
          <Upload className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-sm text-muted-foreground mb-4">
            Click to select files or drag and drop your test images/PDFs here
          </p>
          <input
            type="file"
            multiple
            accept="image/*,.pdf"
            onChange={handleFileSelect}
            className="hidden"
            id="file-upload"
          />
          <Button asChild variant="outline">
            <label htmlFor="file-upload" className="cursor-pointer">
              Select Files
            </label>
          </Button>
        </div>
      </div>

      {selectedFiles.length > 0 && (
        <div className="space-y-2">
          <Label>Selected Files ({selectedFiles.length})</Label>
          {selectedFiles.map((file, index) => (
            <div key={index} className="flex items-center justify-between p-3 bg-accent rounded">
              <div className="flex items-center space-x-3">
                <FileText className="h-5 w-5 text-primary" />
                <span className="text-sm">{file.name}</span>
                <span className="text-xs text-muted-foreground">
                  ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveFile(index)}
              >
                Remove
              </Button>
            </div>
          ))}
        </div>
      )}

      <Button 
        onClick={handleUploadAndAnalyze}
        disabled={(!studentName.trim() && !studentId.trim()) || selectedFiles.length === 0 || isProcessing}
        className="w-full"
        size="lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Upload className="mr-2 h-4 w-4" />
            Upload & Analyze Test
          </>
        )}
      </Button>
    </div>
  );

  const renderProcessingStep = () => (
    <div className="text-center space-y-6">
      <Loader2 className="h-16 w-16 animate-spin text-primary mx-auto" />
      <div className="space-y-2">
        <h3 className="text-lg font-semibold">Processing Your Test</h3>
        <p className="text-muted-foreground">
          Please wait while we analyze your uploaded files using our consolidated grading system.
        </p>
      </div>
      <div className="space-y-2 text-sm text-muted-foreground">
        <p>• Extracting text from images</p>
        <p>• Classifying question complexity</p>
        <p>• Routing to appropriate AI models</p>
        <p>• Calculating scores and generating feedback</p>
      </div>
    </div>
  );

  const renderResultsStep = () => (
    <div className="space-y-6">
      {analysisResult ? (
        <>
          <div className="text-center">
            <CheckCircle className="h-16 w-16 text-green-600 mx-auto mb-4" />
            <h3 className="text-2xl font-bold text-green-700">
              Test Completed!
            </h3>
            <p className="text-muted-foreground mt-2">
              Your test has been successfully analyzed using our consolidated grading system.
            </p>
            {extractedResults.some(r => r.studentId) && (
              <p className="text-sm text-primary mt-1">
                Student ID detected: {extractedResults.find(r => r.studentId)?.studentId}
              </p>
            )}
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Your Results</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-4 bg-accent rounded-lg">
                  <div className="text-3xl font-bold text-primary">
                    {analysisResult.overall_score}%
                  </div>
                  <div className="text-sm text-muted-foreground">Overall Score</div>
                </div>
                <div className="text-center p-4 bg-accent rounded-lg">
                  <div className="text-3xl font-bold text-green-700">
                    {analysisResult.grade}
                  </div>
                  <div className="text-sm text-muted-foreground">Grade</div>
                </div>
              </div>

              <div className="p-4 bg-accent rounded-lg">
                <h4 className="font-semibold mb-2">Points Breakdown</h4>
                <p className="text-sm text-muted-foreground">
                  {analysisResult.total_points_earned} out of {analysisResult.total_points_possible} points earned
                </p>
              </div>

              {analysisResult.feedback && (
                <div className="p-4 bg-accent rounded-lg">
                  <h4 className="font-semibold mb-2">Feedback</h4>
                  <p className="text-sm">{analysisResult.feedback}</p>
                </div>
              )}

              {analysisResult.detailed_results && analysisResult.detailed_results.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Grading Method Distribution</h4>
                  <div className="text-sm text-muted-foreground">
                    {analysisResult.detailed_results.filter(r => r.method === 'local_ai').length} questions graded with Local AI, {' '}
                    {analysisResult.detailed_results.filter(r => r.method === 'openai').length} questions graded with OpenAI, {' '}
                    {analysisResult.detailed_results.filter(r => r.method === 'pattern_match').length} questions graded with pattern matching
                  </div>
                </div>
              )}

              {analysisResult.content_skill_scores && analysisResult.content_skill_scores.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-semibold">Content Skills Performance</h4>
                  {analysisResult.content_skill_scores.map((skill, index) => (
                    <div key={index} className="flex justify-between items-center p-2 bg-accent rounded">
                      <span className="text-sm">{skill.skill_name}</span>
                      <span className="text-sm font-medium">
                        {skill.score}% ({skill.points_earned}/{skill.points_possible})
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <div className="text-center">
          <AlertCircle className="h-16 w-16 text-yellow-600 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-yellow-700 mb-2">
            Processing Complete
          </h3>
          <p className="text-muted-foreground">
            Your files have been uploaded successfully, but automatic analysis couldn't be completed. 
            A teacher will review your submission manually.
          </p>
        </div>
      )}

      <Button onClick={handleStartOver} variant="outline" className="w-full">
        Upload Another Test
      </Button>
    </div>
  );

  return (
    <div className="min-h-screen bg-background py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">
            Student Test Upload
          </h1>
          <p className="text-muted-foreground">
            Upload your completed test for automatic grading with our consolidated AI system
          </p>
        </div>

        <Card>
          <CardContent className="p-6">
            {currentStep === 'upload' && renderUploadStep()}
            {currentStep === 'processing' && renderProcessingStep()}
            {currentStep === 'results' && renderResultsStep()}
          </CardContent>
        </Card>

        <div className="text-center mt-6 text-sm text-muted-foreground">
          <p>
            Supported formats: Images (JPG, PNG, etc.) and PDF files
          </p>
          <p>
            Maximum file size: 10MB per file
          </p>
          <p className="text-primary font-medium">
            📍 Include your Student ID for 98%+ accurate processing
          </p>
        </div>
      </div>
    </div>
  );
}
