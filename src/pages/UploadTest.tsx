
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
  const [bubbleApiUrl, setBubbleApiUrl] = useState("");
  const [showApiConfig, setShowApiConfig] = useState(false);

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

  const handleAIAnalysis = async () => {
    if (!bubbleApiUrl) {
      toast.error("Please configure your Bubble.io API endpoint first.");
      setShowApiConfig(true);
      return;
    }

    setIsAnalyzing(true);
    try {
      // Convert files to base64 for sending to Bubble.io
      const filesData = await Promise.all(
        uploadedFiles.map(async (file) => {
          const base64Content = await convertFileToBase64(file);
          return {
            name: file.name,
            type: file.type,
            size: file.size,
            content: base64Content,
            lastModified: file.lastModified
          };
        })
      );

      const payload = {
        files: filesData,
        timestamp: new Date().toISOString(),
        action: "ai_grade_analyze"
      };

      console.log("Sending to Bubble.io:", payload);

      const response = await fetch(bubbleApiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const result = await response.json();
        console.log("Bubble.io response:", result);
        toast.success("Document sent to Bubble.io for AI analysis!");
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      console.error("Error sending to Bubble.io:", error);
      toast.error("Failed to send document to Bubble.io. Please check your API endpoint and try again.");
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
          <p className="text-gray-600">Test file upload functionality with drag and drop support</p>
        </div>

        {/* Bubble.io API Configuration */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Bubble.io Configuration
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label htmlFor="bubble-api" className="block text-sm font-medium text-gray-700 mb-2">
                  Bubble.io API Endpoint URL
                </label>
                <input
                  id="bubble-api"
                  type="url"
                  value={bubbleApiUrl}
                  onChange={(e) => setBubbleApiUrl(e.target.value)}
                  placeholder="https://yourapp.bubbleapps.io/api/1.1/wf/analyze-document"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="text-sm text-gray-600">
                <p className="mb-2"><strong>Setup Instructions:</strong></p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>In Bubble.io, create a new API Workflow</li>
                  <li>Set it to accept POST requests</li>
                  <li>Configure it to receive: files (list), timestamp (text), action (text)</li>
                  <li>Add your ChatGPT integration within the workflow</li>
                  <li>Copy the workflow URL and paste it above</li>
                </ol>
              </div>
              {bubbleApiUrl && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-sm text-green-700">✓ API endpoint configured</p>
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
                  Drop files here to upload
                </p>
                <p className="text-sm text-gray-500 mb-4">
                  or click to select files
                </p>
                <input
                  type="file"
                  multiple
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

              {/* AI Analysis Button */}
              {uploadedFiles.length > 0 && (
                <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <div className="flex items-center gap-3 mb-3">
                    <Brain className="h-5 w-5 text-blue-600" />
                    <h3 className="font-medium text-blue-900">AI Analysis Ready</h3>
                  </div>
                  <p className="text-sm text-blue-700 mb-4">
                    Upload complete! Ready to send to Bubble.io for AI analysis and grading.
                  </p>
                  <Button 
                    onClick={handleAIAnalysis}
                    disabled={isAnalyzing || !bubbleApiUrl}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                  >
                    {isAnalyzing ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending to Bubble.io...
                      </>
                    ) : (
                      <>
                        <Brain className="h-4 w-4 mr-2" />
                        Send to Bubble.io for AI Analysis
                      </>
                    )}
                  </Button>
                  {!bubbleApiUrl && (
                    <p className="text-xs text-red-600 mt-2">Please configure Bubble.io API endpoint first</p>
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
                  <span className="text-sm font-medium text-purple-700">Success Rate</span>
                  <span className="text-lg font-bold text-purple-900">100%</span>
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
                  onClick={() => setUploadedFiles([])}
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
