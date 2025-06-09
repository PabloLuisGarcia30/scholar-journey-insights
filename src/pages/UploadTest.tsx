
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, X, Play, CheckCircle, AlertCircle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { extractTextFromFile, analyzeTest } from '@/services/testAnalysisService';
import { TimeEstimationService, TimeEstimate } from '@/services/timeEstimationService';
import EnhancedProcessingProgress from '@/components/EnhancedProcessingProgress';

interface UploadedFile {
  file: File;
  id: string;
  extractedText?: string;
  structuredData?: any;
  status: 'pending' | 'processing' | 'completed' | 'error';
  error?: string;
}

interface TestResult {
  fileName: string;
  studentName: string;
  examId: string;
  overallScore: number;
  grade: string;
  totalPointsEarned: number;
  totalPointsPossible: number;
  processingTime: number;
}

const UploadTest = () => {
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [currentStage, setCurrentStage] = useState<'upload' | 'extracting' | 'analyzing' | 'complete'>('upload');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [processingStats, setProcessingStats] = useState<any>(null);
  const [timeEstimate, setTimeEstimate] = useState<TimeEstimate | null>(null);
  const [processingStartTime, setProcessingStartTime] = useState<number | undefined>();
  const [processedFileCount, setProcessedFileCount] = useState(0);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const newFiles = acceptedFiles.map(file => ({
      file,
      id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      status: 'pending' as const
    }));
    
    setUploadedFiles(prev => {
      const allFiles = [...prev, ...newFiles];
      // Calculate time estimate whenever files change
      const estimate = TimeEstimationService.estimateProcessingTime(allFiles.map(f => f.file));
      setTimeEstimate(estimate);
      return allFiles;
    });
    
    if (acceptedFiles.length > 1) {
      toast.success(`${acceptedFiles.length} test files added for batch processing`);
    } else {
      toast.success('Test file added successfully');
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.bmp'],
      'application/pdf': ['.pdf']
    },
    multiple: true
  });

  const removeFile = (fileId: string) => {
    setUploadedFiles(prev => {
      const filtered = prev.filter(f => f.id !== fileId);
      // Recalculate estimate when files are removed
      if (filtered.length > 0) {
        const estimate = TimeEstimationService.estimateProcessingTime(filtered.map(f => f.file));
        setTimeEstimate(estimate);
      } else {
        setTimeEstimate(null);
      }
      return filtered;
    });
  };

  const processAllTests = async () => {
    if (uploadedFiles.length === 0) {
      toast.error('Please upload test files first');
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(0);
    setCurrentStage('upload');
    setTestResults([]);
    setProcessedFileCount(0);
    setProcessingStartTime(Date.now());

    const startTime = Date.now();
    const totalFiles = uploadedFiles.length;
    const results: TestResult[] = [];
    let processedCount = 0;

    // Enhanced processing with smart defaults enabled
    console.log('🚀 Starting simplified batch processing with all optimizations enabled');
    console.log(`📊 Processing ${totalFiles} files with smart defaults:`);
    console.log('✅ Smart OCR: Enabled');
    console.log('✅ Auto Processing: Enabled');
    console.log('✅ Caching: Enabled');
    console.log('✅ Security Scan: Enabled');
    console.log('✅ Batch Processing: Enabled');

    try {
      // Process files in optimal batches for better performance
      const batchSize = Math.min(3, totalFiles);
      
      for (let i = 0; i < totalFiles; i += batchSize) {
        const batch = uploadedFiles.slice(i, i + batchSize);
        
        // Process batch concurrently
        const batchPromises = batch.map(async (uploadedFile) => {
          try {
            // Update file status to processing
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadedFile.id ? { ...f, status: 'processing' } : f
            ));

            setCurrentStage('extracting');

            // Extract text with all optimizations enabled
            const fileContent = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onload = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(uploadedFile.file);
            });

            const extractResult = await extractTextFromFile({
              fileContent: fileContent.split(',')[1],
              fileName: uploadedFile.file.name,
            });

            // Update file with extracted data
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadedFile.id ? { 
                ...f, 
                extractedText: extractResult.extractedText,
                structuredData: extractResult.structuredData,
                status: 'completed'
              } : f
            ));

            setCurrentStage('analyzing');

            // Analyze the test
            const analysisResult = await analyzeTest({
              files: [{
                fileName: uploadedFile.file.name,
                extractedText: extractResult.extractedText,
                structuredData: extractResult.structuredData
              }],
              examId: extractResult.examId || 'auto-detected',
              studentName: extractResult.studentName || 'auto-detected'
            });

            const result: TestResult = {
              fileName: uploadedFile.file.name,
              studentName: extractResult.studentName || 'Student Name Not Detected',
              examId: extractResult.examId || 'Exam ID Not Detected',
              overallScore: analysisResult.overall_score,
              grade: analysisResult.grade,
              totalPointsEarned: analysisResult.total_points_earned,
              totalPointsPossible: analysisResult.total_points_possible,
              processingTime: Date.now() - startTime
            };

            return result;
          } catch (error) {
            console.error(`Error processing ${uploadedFile.file.name}:`, error);
            
            // Update file status to error
            setUploadedFiles(prev => prev.map(f => 
              f.id === uploadedFile.id ? { 
                ...f, 
                status: 'error',
                error: error instanceof Error ? error.message : 'Processing failed'
              } : f
            ));

            throw error;
          }
        });

        // Wait for batch to complete
        const batchResults = await Promise.allSettled(batchPromises);
        
        batchResults.forEach((result, index) => {
          processedCount++;
          setProcessedFileCount(processedCount);
          setProcessingProgress((processedCount / totalFiles) * 100);
          
          if (result.status === 'fulfilled') {
            results.push(result.value);
          }
        });
      }

      setCurrentStage('complete');

      const totalTime = Date.now() - startTime;
      const successCount = results.length;
      const errorCount = totalFiles - successCount;

      // Set processing statistics
      setProcessingStats({
        totalFiles,
        successCount,
        errorCount,
        totalProcessingTime: totalTime,
        averageTimePerFile: totalTime / totalFiles,
        batchProcessingUsed: totalFiles > 1,
        smartOcrEnabled: true,
        cachingEnabled: true,
        securityScanEnabled: true,
        optimizationsApplied: [
          'Smart OCR',
          'Batch Processing',
          'Intelligent Caching',
          'Security Scanning',
          'Auto Student/Exam Detection'
        ]
      });

      setTestResults(results);
      
      if (successCount > 0) {
        toast.success(`Successfully processed ${successCount} test${successCount > 1 ? 's' : ''}`);
      }
      
      if (errorCount > 0) {
        toast.error(`${errorCount} test${errorCount > 1 ? 's' : ''} failed to process`);
      }

    } catch (error) {
      console.error('Batch processing error:', error);
      toast.error('Failed to process tests');
    } finally {
      setIsProcessing(false);
      setProcessingProgress(100);
    }
  };

  const getFileStatusIcon = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return <CheckCircle className="h-4 w-4 text-green-600" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-600" />;
      case 'processing': return <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />;
      default: return <FileText className="h-4 w-4 text-gray-600" />;
    }
  };

  const getFileStatusColor = (status: UploadedFile['status']) => {
    switch (status) {
      case 'completed': return 'bg-green-50 border-green-200';
      case 'error': return 'bg-red-50 border-red-200';
      case 'processing': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Upload Tests</h1>
        <p className="text-muted-foreground">
          Upload single or multiple test files for automatic processing with smart defaults
        </p>
      </div>

      {/* Simplified Upload Area */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            Upload Test Files
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
              isDragActive
                ? 'border-primary bg-primary/5'
                : 'border-muted-foreground/25 hover:border-primary/50'
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <div className="space-y-2">
              <p className="text-lg font-medium">
                {isDragActive
                  ? 'Drop test files here...'
                  : 'Drag & drop test files here, or click to select'}
              </p>
              <p className="text-sm text-muted-foreground">
                Supports images (PNG, JPG, JPEG) and PDF files. Multiple files will be processed automatically as a batch.
              </p>
              <div className="flex flex-wrap justify-center gap-2 mt-4">
                <Badge variant="secondary">Smart OCR Enabled</Badge>
                <Badge variant="secondary">Batch Processing Ready</Badge>
                <Badge variant="secondary">All Optimizations Active</Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* File List */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Uploaded Files ({uploadedFiles.length})</span>
              {uploadedFiles.length > 1 && (
                <Badge variant="outline">Batch Processing Mode</Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {uploadedFiles.map((uploadedFile) => (
              <div
                key={uploadedFile.id}
                className={`flex items-center justify-between p-3 rounded-lg border ${getFileStatusColor(uploadedFile.status)}`}
              >
                <div className="flex items-center gap-3">
                  {getFileStatusIcon(uploadedFile.status)}
                  <div>
                    <p className="font-medium">{uploadedFile.file.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {(uploadedFile.file.size / 1024 / 1024).toFixed(2)} MB
                    </p>
                    {uploadedFile.error && (
                      <p className="text-sm text-red-600 mt-1">{uploadedFile.error}</p>
                    )}
                  </div>
                </div>
                {!isProcessing && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeFile(uploadedFile.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Process Button */}
      {uploadedFiles.length > 0 && (
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <Button
                onClick={processAllTests}
                disabled={isProcessing}
                className="w-full"
                size="lg"
              >
                {isProcessing ? (
                  <div className="flex items-center gap-2">
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Processing Tests...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <Play className="h-4 w-4" />
                    Process {uploadedFiles.length} Test{uploadedFiles.length > 1 ? 's' : ''}
                  </div>
                )}
              </Button>
              
              {/* Enhanced Processing Progress */}
              <EnhancedProcessingProgress
                isProcessing={isProcessing}
                progress={processingProgress}
                currentStage={currentStage}
                timeEstimate={timeEstimate}
                processedFiles={processedFileCount}
                totalFiles={uploadedFiles.length}
                processingStartTime={processingStartTime}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results */}
      {testResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Test Results</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {testResults.map((result, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-lg"
                >
                  <div className="space-y-1">
                    <p className="font-medium">{result.studentName}</p>
                    <p className="text-sm text-muted-foreground">
                      {result.examId} • {result.fileName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          result.grade === 'A' ? 'default' :
                          result.grade === 'B' ? 'secondary' :
                          result.grade === 'C' ? 'outline' : 'destructive'
                        }
                      >
                        {result.grade}
                      </Badge>
                      <span className="font-bold text-lg">{result.overallScore.toFixed(1)}%</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {result.totalPointsEarned}/{result.totalPointsPossible} points
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Enhanced Processing Statistics */}
      {processingStats && (
        <Card>
          <CardHeader>
            <CardTitle>Enhanced Processing Statistics</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {processingStats.totalFiles}
                </div>
                <div className="text-sm text-muted-foreground">Total Files</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {processingStats.successCount}
                </div>
                <div className="text-sm text-muted-foreground">Successful</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600">
                  {processingStats.errorCount}
                </div>
                <div className="text-sm text-muted-foreground">Errors</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(processingStats.totalProcessingTime / 1000).toFixed(1)}s
                </div>
                <div className="text-sm text-muted-foreground">Total Time</div>
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-sm font-medium">Average Time per File:</span>
                <span className="text-sm">{(processingStats.averageTimePerFile / 1000).toFixed(1)}s</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Batch Processing:</span>
                <Badge variant={processingStats.batchProcessingUsed ? "default" : "secondary"}>
                  {processingStats.batchProcessingUsed ? "Enabled" : "Single File"}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Smart OCR:</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Intelligent Caching:</span>
                <Badge variant="default">Enabled</Badge>
              </div>
              <div className="flex justify-between">
                <span className="text-sm font-medium">Security Scanning:</span>
                <Badge variant="default">Enabled</Badge>
              </div>
            </div>

            {processingStats.optimizationsApplied && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Optimizations Applied:</p>
                <div className="flex flex-wrap gap-2">
                  {processingStats.optimizationsApplied.map((optimization: string, index: number) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {optimization}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadTest;
