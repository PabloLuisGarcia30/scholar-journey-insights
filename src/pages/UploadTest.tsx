import { useState } from "react";
import { Upload, FileText, Image, Video, Brain, Settings, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Link } from "react-router-dom";

const UploadTest = () => {
  const [dragActive, setDragActive] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExtractingExamId, setIsExtractingExamId] = useState(false);
  const [openaiApiKey, setOpenaiApiKey] = useState("");
  const [googleCloudApiKey, setGoogleCloudApiKey] = useState("");
  const [extractedExamId, setExtractedExamId] = useState("");

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
    setExtractedExamId(""); // Reset extracted exam ID when new files are added
    toast.success(`Uploaded ${files.length} file(s) successfully!`);
  };

  const convertFileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const result = reader.result as string;
        // Remove the data:image/jpeg;base64, prefix to get just the base64 string
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = error => reject(error);
    });
  };

  const extractExamIdFromFiles = async () => {
    if (!googleCloudApiKey) {
      toast.error("Please configure your Google Cloud API key first.");
      return;
    }

    setIsExtractingExamId(true);
    try {
      // Use the first uploaded file to extract Exam ID
      const firstFile = uploadedFiles[0];
      const base64Content = await convertFileToBase64(firstFile);
      
      const ocrPayload = {
        requests: [
          {
            image: {
              content: base64Content
            },
            features: [
              {
                type: "TEXT_DETECTION"
              }
            ]
          }
        ]
      };

      const ocrResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(ocrPayload)
      });

      if (!ocrResponse.ok) {
        throw new Error(`Google OCR error: ${ocrResponse.statusText}`);
      }

      const ocrResult = await ocrResponse.json();
      const extractedText = ocrResult.responses[0]?.textAnnotations?.[0]?.description || "";
      
      // Look for Exam ID patterns in the extracted text
      const examIdPatterns = [
        /EXAM\s*ID[\s:]*([A-Z0-9\-_]+)/i,
        /TEST\s*ID[\s:]*([A-Z0-9\-_]+)/i,
        /ID[\s:]*([A-Z0-9\-_]{3,})/i,
        /EXAM[\s:]*([A-Z0-9\-_]{3,})/i
      ];

      let foundExamId = "";
      for (const pattern of examIdPatterns) {
        const match = extractedText.match(pattern);
        if (match && match[1]) {
          foundExamId = match[1].trim();
          break;
        }
      }

      if (foundExamId) {
        setExtractedExamId(foundExamId);
        toast.success(`Exam ID extracted: ${foundExamId}`);
      } else {
        toast.error("Could not find Exam ID in the document. Please check the file contains a clearly marked Exam ID.");
      }

    } catch (error) {
      console.error("Error extracting Exam ID:", error);
      toast.error("Failed to extract Exam ID. Please check your Google Cloud API key.");
    } finally {
      setIsExtractingExamId(false);
    }
  };

  const handleAIAnalysis = async () => {
    if (!openaiApiKey) {
      toast.error("Please configure your OpenAI API key first.");
      return;
    }

    if (!googleCloudApiKey) {
      toast.error("Please configure your Google Cloud API key first.");
      return;
    }

    if (!extractedExamId) {
      toast.error("Please extract the Exam ID from the file first.");
      return;
    }

    setIsAnalyzing(true);
    try {
      // Step 1: Use Google Cloud Vision OCR to extract text from images
      const ocrResults = await Promise.all(
        uploadedFiles.map(async (file) => {
          const base64Content = await convertFileToBase64(file);
          
          const ocrPayload = {
            requests: [
              {
                image: {
                  content: base64Content
                },
                features: [
                  {
                    type: "TEXT_DETECTION"
                  }
                ]
              }
            ]
          };

          const ocrResponse = await fetch(`https://vision.googleapis.com/v1/images:annotate?key=${googleCloudApiKey}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(ocrPayload)
          });

          if (!ocrResponse.ok) {
            throw new Error(`Google OCR error: ${ocrResponse.statusText}`);
          }

          const ocrResult = await ocrResponse.json();
          const extractedText = ocrResult.responses[0]?.textAnnotations?.[0]?.description || "";
          
          return {
            fileName: file.name,
            extractedText: extractedText
          };
        })
      );

      console.log("OCR extracted text:", ocrResults);

      // Step 2: Send extracted text to OpenAI for analysis and grading
      const combinedText = ocrResults.map(result => 
        `File: ${result.fileName}\nExtracted Text:\n${result.extractedText}`
      ).join('\n\n---\n\n');

      const aiPayload = {
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `You are an AI grading assistant. Analyze the OCR-extracted text from test documents. Match this with exam ID: ${extractedExamId} to find the corresponding answer key. Grade the test and provide detailed feedback.`
          },
          {
            role: "user",
            content: `Please analyze this OCR-extracted test content for Exam ID: ${extractedExamId}. Extract all student answers and grade them against the stored answer key. Provide a detailed grade report.\n\nOCR Content:\n${combinedText}`
          }
        ],
        max_tokens: 2000,
        temperature: 0.1
      };

      console.log("Sending to OpenAI for analysis:", aiPayload);

      const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${openaiApiKey}`
        },
        body: JSON.stringify(aiPayload)
      });

      if (aiResponse.ok) {
        const result = await aiResponse.json();
        console.log("OpenAI response:", result);
        
        const analysisText = result.choices[0]?.message?.content || "No analysis received";
        alert(`AI Analysis Complete!\n\n${analysisText}`);
        
        toast.success("Document analyzed successfully with Google OCR + OpenAI!");
      } else {
        const errorData = await aiResponse.json();
        throw new Error(`OpenAI API error: ${errorData.error?.message || aiResponse.statusText}`);
      }
    } catch (error) {
      console.error("Error in OCR + AI analysis:", error);
      toast.error("Failed to analyze document. Please check your API keys and try again.");
    } finally {
      setIsAnalyzing(false);
    }
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
          <p className="text-gray-600">Upload test documents for Google OCR extraction and OpenAI analysis</p>
        </div>

        {/* Google OCR + OpenAI Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Google OCR + OpenAI Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="google-api" className="block text-sm font-medium text-gray-700 mb-2">
                  Google Cloud Vision API Key
                </label>
                <input
                  id="google-api"
                  type="password"
                  value={googleCloudApiKey}
                  onChange={(e) => setGoogleCloudApiKey(e.target.value)}
                  placeholder="Enter your Google Cloud API key"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div>
                <label htmlFor="openai-api" className="block text-sm font-medium text-gray-700 mb-2">
                  OpenAI API Key
                </label>
                <input
                  id="openai-api"
                  type="password"
                  value={openaiApiKey}
                  onChange={(e) => setOpenaiApiKey(e.target.value)}
                  placeholder="sk-..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              {/* Extracted Exam ID Display */}
              {extractedExamId && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Brain className="h-4 w-4 text-green-600" />
                    <span className="text-sm font-medium text-green-700">Extracted Exam ID:</span>
                    <span className="text-sm font-bold text-green-900">{extractedExamId}</span>
                  </div>
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <p className="mb-2"><strong>How it works:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Enter your Google Cloud Vision API key for OCR text extraction</li>
                  <li>Enter your OpenAI API key for intelligent analysis</li>
                  <li>Upload the test document (image or PDF)</li>
                  <li>Click "Extract Exam ID" to automatically find the exam ID from the document</li>
                  <li>Google OCR will extract all text from the document</li>
                  <li>OpenAI will analyze the extracted text, match answers with the stored answer key, and provide grades</li>
                </ol>
              </div>
              {googleCloudApiKey && openaiApiKey && extractedExamId && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">✓ Google OCR + OpenAI configuration ready</p>
                </div>
              )}
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

              {/* Extract Exam ID Button */}
              {uploadedFiles.length > 0 && !extractedExamId && (
                <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                  <div className="flex items-center gap-3 mb-3">
                    <FileText className="h-5 w-5 text-yellow-600" />
                    <h3 className="font-medium text-yellow-900">Extract Exam ID</h3>
                  </div>
                  <p className="text-sm text-yellow-700 mb-4">
                    First, extract the Exam ID from your uploaded document using Google OCR.
                  </p>
                  <Button 
                    onClick={extractExamIdFromFiles}
                    disabled={isExtractingExamId || !googleCloudApiKey}
                    className="w-full bg-yellow-600 hover:bg-yellow-700"
                  >
                    {isExtractingExamId ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Extracting Exam ID...
                      </>
                    ) : (
                      <>
                        <FileText className="h-4 w-4 mr-2" />
                        Extract Exam ID from Document
                      </>
                    )}
                  </Button>
                  {!googleCloudApiKey && (
                    <p className="text-xs text-red-600 mt-2">
                      Please configure Google Cloud API key first
                    </p>
                  )}
                </div>
              )}

              {/* AI Analysis Button */}
              {uploadedFiles.length > 0 && extractedExamId && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">OCR + AI Analysis Ready</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Exam ID extracted! Ready to process with Google OCR for text extraction, then OpenAI for automated grading.
                  </p>
                  <Button 
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !openaiApiKey || !googleCloudApiKey}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Processing with Google OCR + OpenAI...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Analyze with Google OCR + OpenAI
                      </>
                    )}
                  </Button>
                  {(!openaiApiKey || !googleCloudApiKey) && (
                    <p className="text-xs text-red-600 mt-2">
                      Please configure both API keys first
                    </p>
                  )}
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
                  <span className="text-sm font-medium text-purple-700">Exam ID Status</span>
                  <span className="text-lg font-bold text-purple-900">
                    {extractedExamId ? "✓ Extracted" : "Pending"}
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
                  onClick={() => {
                    setUploadedFiles([]);
                    setExtractedExamId("");
                  }}
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
