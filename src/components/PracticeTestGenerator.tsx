import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { generatePracticeTest, PracticeTestData, Question } from "@/services/practiceTestService";

interface PracticeTestGeneratorProps {
  studentName: string;
  className: string;
  skillName: string | null;
  onBack: () => void;
}

export function PracticeTestGenerator({ studentName, className, skillName, onBack }: PracticeTestGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testData, setTestData] = useState<PracticeTestData | null>(null);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generatePracticeTest({
        studentName,
        className,
        skillName: skillName || undefined
      });
      
      setTestData(result);
      toast.success("Practice test generated successfully!");
    } catch (error) {
      console.error('Error generating test:', error);
      toast.error("Failed to generate practice test. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };

  const generatePDF = () => {
    if (!testData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;
    let yPosition = margin;
    
    // Header
    pdf.setFillColor(45, 55, 72);
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, 20);
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 20);
    
    yPosition = 50;
    
    // Student and class info
    pdf.setTextColor(0, 0, 0);
    pdf.setFillColor(59, 130, 246);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'F');
    
    pdf.setTextColor(255, 255, 255);
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Student: ${studentName} | Class: ${className}`, margin + 5, yPosition + 12);
    
    if (skillName) {
      pdf.text(`Focus: ${skillName}`, margin + 5, yPosition + 12);
    }
    
    yPosition += 30;
    pdf.setTextColor(0, 0, 0);
    
    // Student information section
    pdf.setFillColor(245, 245, 245);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 45, 'FD');
    
    yPosition += 10;
    pdf.setFontSize(12);
    pdf.setFont(undefined, 'bold');
    pdf.text('STUDENT INFORMATION', margin + 5, yPosition);
    
    yPosition += 20;
    pdf.setFontSize(10);
    pdf.text('Name:', margin + 5, yPosition);
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(1);
    pdf.rect(margin + 35, yPosition - 8, 100, 12);
    
    pdf.text('Date:', margin + 145, yPosition);
    pdf.rect(margin + 165, yPosition - 8, 60, 12);
    
    yPosition += 25;
    
    // Test info
    pdf.setFillColor(248, 250, 252);
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 30, 'FD');
    
    yPosition += 8;
    if (testData.description) {
      pdf.setFontSize(9);
      pdf.setFont(undefined, 'normal');
      const descLines = pdf.splitTextToSize(testData.description, pageWidth - 2 * margin - 10);
      pdf.text(descLines, margin + 5, yPosition);
      yPosition += Math.max(descLines.length * 4, 8);
    }
    
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text(`Time: ${testData.estimatedTime} min`, margin + 5, yPosition);
    pdf.text(`Points: ${testData.totalPoints}`, margin + 60, yPosition);
    pdf.text(`Questions: ${testData.questions.length}`, margin + 100, yPosition);
    
    yPosition += 20;
    
    // Questions
    testData.questions.forEach((question, index) => {
      const estimatedHeight = question.type === 'multiple-choice' ? 50 : 30;
      
      if (yPosition + estimatedHeight > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin + 10;
      }
      
      // Question header
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 18, 'F');
      
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(37, 99, 235);
      pdf.text(`Question ${index + 1}`, margin + 5, yPosition + 5);
      
      pdf.setTextColor(107, 114, 128);
      pdf.setFontSize(9);
      pdf.text(`(${question.points} pts)`, pageWidth - margin - 25, yPosition + 5);
      
      yPosition += 18;
      
      // Question text
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 5, yPosition);
      yPosition += questionLines.length * 5 + 8;
      
      // Answer options
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          if (optionIndex % 2 === 1) {
            pdf.setFillColor(253, 253, 253);
            pdf.rect(margin + 10, yPosition - 3, pageWidth - 2 * margin - 20, 10, 'F');
          }
          
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          pdf.text(`${optionLetter})`, margin + 15, yPosition + 2);
          
          const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 140);
          pdf.text(optionLines, margin + 25, yPosition + 2);
          
          // Answer bubble
          const bubbleX = pageWidth - margin - 30;
          const bubbleY = yPosition;
          pdf.setDrawColor(100, 116, 139);
          pdf.setLineWidth(0.5);
          pdf.circle(bubbleX, bubbleY, 4);
          
          yPosition += Math.max(optionLines.length * 5, 10);
        });
      } else if (question.type === 'true-false') {
        pdf.setFontSize(9);
        pdf.text('A) True', margin + 15, yPosition + 2);
        pdf.circle(pageWidth - margin - 30, yPosition, 4);
        yPosition += 10;
        
        pdf.text('B) False', margin + 15, yPosition + 2);
        pdf.circle(pageWidth - margin - 30, yPosition, 4);
        yPosition += 15;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(9);
        pdf.text('Answer:', margin + 15, yPosition);
        
        for (let i = 0; i < 2; i++) {
          yPosition += 8;
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 15, yPosition, pageWidth - margin - 15, yPosition);
        }
        yPosition += 10;
      }
      
      if (index < testData.questions.length - 1) {
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 10;
      }
    });
    
    // Footer
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      pdf.text(testData.title, margin, pageHeight - 10);
    }
    
    const fileName = `${testData.title.replace(/\s+/g, '_')}_Practice_Test.pdf`;
    pdf.save(fileName);
    toast.success('Practice test PDF generated successfully!');
  };

  if (!testData) {
    return (
      <div className="p-6">
        <Button variant="ghost" onClick={onBack} className="mb-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Student Profile
        </Button>

        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Generate Practice Exercises
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Test Details</h3>
                <div className="space-y-1 text-sm text-blue-800">
                  <p><strong>Student:</strong> {studentName}</p>
                  <p><strong>Class:</strong> {className}</p>
                  {skillName ? (
                    <p><strong>Focus Skill:</strong> {skillName}</p>
                  ) : (
                    <p><strong>Type:</strong> Comprehensive Skills Assessment</p>
                  )}
                </div>
              </div>

              <Button 
                onClick={handleGenerateTest} 
                disabled={isGenerating}
                className="w-full"
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating Practice Exercises...
                  </>
                ) : (
                  <>
                    <FileText className="h-4 w-4 mr-2" />
                    Generate Practice Exercises
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Student Profile
        </Button>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setTestData(null)}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Generate New Exercises
          </Button>
          <Button onClick={generatePDF}>
            <Download className="h-4 w-4 mr-2" />
            Download PDF
          </Button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto">
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              {testData.title}
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span><strong>Student:</strong> {studentName}</span>
              <span><strong>Class:</strong> {className}</span>
              {skillName && <span><strong>Focus:</strong> {skillName}</span>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{testData.questions.length}</p>
                <p className="text-sm text-blue-700">Questions</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{testData.totalPoints}</p>
                <p className="text-sm text-green-700">Total Points</p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">{testData.estimatedTime}</p>
                <p className="text-sm text-purple-700">Minutes</p>
              </div>
            </div>
            
            {testData.description && (
              <div className="mb-4">
                <h3 className="font-semibold mb-2">Description:</h3>
                <p className="text-gray-600">{testData.description}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="space-y-6">
          {testData.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {question.type.replace('-', ' ')}
                    </Badge>
                    <Badge className="bg-blue-100 text-blue-700">
                      {question.points} pts
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-900 mb-4 font-medium">{question.question}</p>
                
                {question.type === 'multiple-choice' && question.options && (
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div 
                        key={optionIndex} 
                        className="flex items-center p-3 rounded border border-gray-200 hover:bg-gray-50"
                      >
                        <div className="w-6 h-6 rounded-full border-2 border-gray-300 mr-3 flex-shrink-0"></div>
                        <span className="font-medium text-gray-700 mr-2">
                          {String.fromCharCode(65 + optionIndex)}.
                        </span>
                        <span>{option}</span>
                      </div>
                    ))}
                  </div>
                )}
                
                {question.type === 'true-false' && (
                  <div className="space-y-2">
                    <div className="flex items-center p-3 rounded border border-gray-200 hover:bg-gray-50">
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 mr-3"></div>
                      <span className="font-medium text-gray-700 mr-2">A.</span>
                      <span>True</span>
                    </div>
                    <div className="flex items-center p-3 rounded border border-gray-200 hover:bg-gray-50">
                      <div className="w-6 h-6 rounded-full border-2 border-gray-300 mr-3"></div>
                      <span className="font-medium text-gray-700 mr-2">B.</span>
                      <span>False</span>
                    </div>
                  </div>
                )}
                
                {question.type === 'short-answer' && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 mb-2">Write your answer below:</p>
                    <div className="space-y-2">
                      <div className="h-8 border-b border-gray-300"></div>
                      <div className="h-8 border-b border-gray-300"></div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
