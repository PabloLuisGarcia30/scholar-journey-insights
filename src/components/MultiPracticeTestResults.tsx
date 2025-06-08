
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, RefreshCw, Printer, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { MultiPracticeTestResult, PracticeTestData } from "@/services/practiceTestService";
import { printTest } from "@/services/printService";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

interface MultiPracticeTestResultsProps {
  results: MultiPracticeTestResult[];
  studentName: string;
  className: string;
  onBack: () => void;
  onRegenerateSkill: (skillName: string) => void;
}

export function MultiPracticeTestResults({ 
  results, 
  studentName, 
  className, 
  onBack,
  onRegenerateSkill
}: MultiPracticeTestResultsProps) {
  const [expandedTests, setExpandedTests] = useState<string[]>([]);
  
  const completedTests = results.filter(r => r.status === 'completed' && r.testData);
  const failedTests = results.filter(r => r.status === 'error');
  const pendingTests = results.filter(r => r.status === 'pending' || r.status === 'generating');

  const toggleExpanded = (skillName: string) => {
    setExpandedTests(prev => 
      prev.includes(skillName) 
        ? prev.filter(name => name !== skillName)
        : [...prev, skillName]
    );
  };

  const handlePrintTest = (testData: PracticeTestData) => {
    const practiceStudentId = `PRAC-${Date.now().toString().slice(-6)}`;

    const printableTestData = {
      examId: `PRACTICE-${Date.now()}`,
      title: testData.title,
      description: testData.description || '',
      className: className,
      timeLimit: testData.estimatedTime,
      questions: testData.questions.map(q => ({
        id: q.id,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: undefined,
        points: q.points
      })),
      studentName: studentName,
      studentId: practiceStudentId
    };

    printTest(printableTestData);
  };

  const generatePDF = (testData: PracticeTestData) => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    const practiceStudentId = `PRAC-${Date.now().toString().slice(-6)}`;
    
    // Header
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.text(testData.title, margin, yPosition);
    
    yPosition += 15;
    
    // Student info
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Student: ${studentName} | ID: ${practiceStudentId} | Class: ${className}`, margin, yPosition);
    pdf.text(`Focus: ${testData.skillName}`, margin, yPosition + 8);
    
    yPosition += 25;
    
    // Questions
    testData.questions.forEach((question, index) => {
      if (yPosition + 80 > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${index + 1}.`, margin, yPosition);
      
      pdf.setFont(undefined, 'normal');
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 15);
      pdf.text(questionLines, margin + 15, yPosition);
      yPosition += questionLines.length * 6 + 12;
      
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          const circleX = margin + 25;
          const circleY = yPosition - 3;
          
          pdf.circle(circleX, circleY, 3, 'S');
          pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
          
          const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 50);
          pdf.text(optionLines, circleX + 18, yPosition);
          yPosition += Math.max(8, optionLines.length * 6);
        });
      }
      
      yPosition += 15;
    });
    
    const fileName = `${testData.skillName.replace(/\s+/g, '_')}_${studentName.replace(/\s+/g, '_')}_${practiceStudentId}.pdf`;
    pdf.save(fileName);
    toast.success('Practice test PDF generated successfully!');
  };

  const downloadAllPDFs = () => {
    completedTests.forEach(result => {
      if (result.testData) {
        generatePDF(result.testData);
      }
    });
    toast.success(`Generated ${completedTests.length} practice test PDFs!`);
  };

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <Button variant="ghost" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Student Profile
        </Button>
        <div className="flex gap-2">
          {completedTests.length > 1 && (
            <Button onClick={downloadAllPDFs} variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Download All PDFs
            </Button>
          )}
        </div>
      </div>

      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              Multi-Skill Practice Tests
            </CardTitle>
            <div className="flex items-center gap-4 text-sm text-gray-600">
              <span><strong>Student:</strong> {studentName}</span>
              <span><strong>Class:</strong> {className}</span>
              <span><strong>Total Skills:</strong> {results.length}</span>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{completedTests.length}</p>
                <p className="text-sm text-green-700">Completed</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-2xl font-bold text-red-600">{failedTests.length}</p>
                <p className="text-sm text-red-700">Failed</p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{pendingTests.length}</p>
                <p className="text-sm text-blue-700">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          {results.map((result) => (
            <Card key={result.skillName} className="border-l-4 border-l-blue-500">
              <Collapsible>
                <CollapsibleTrigger asChild>
                  <CardHeader className="cursor-pointer hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-3">
                        <CardTitle className="text-lg">{result.skillName}</CardTitle>
                        <Badge 
                          variant={
                            result.status === 'completed' ? 'default' : 
                            result.status === 'error' ? 'destructive' : 
                            'secondary'
                          }
                          className="capitalize"
                        >
                          {result.status}
                        </Badge>
                        <span className="text-sm text-gray-500">Score: {result.skillScore}%</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {result.status === 'completed' && (
                          <div className="flex gap-1">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (result.testData) handlePrintTest(result.testData);
                              }}
                            >
                              <Printer className="h-3 w-3" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (result.testData) generatePDF(result.testData);
                              }}
                            >
                              <Download className="h-3 w-3" />
                            </Button>
                          </div>
                        )}
                        {result.status === 'error' && (
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              onRegenerateSkill(result.skillName);
                            }}
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        {expandedTests.includes(result.skillName) ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </CardHeader>
                </CollapsibleTrigger>
                
                <CollapsibleContent>
                  <CardContent className="pt-0">
                    {result.status === 'error' && (
                      <div className="bg-red-50 border border-red-200 p-3 rounded mb-4">
                        <p className="text-red-700 text-sm">
                          <strong>Error:</strong> {result.error}
                        </p>
                      </div>
                    )}
                    
                    {result.status === 'generating' && (
                      <div className="flex items-center gap-2 text-blue-600">
                        <RefreshCw className="h-4 w-4 animate-spin" />
                        <span>Generating practice test...</span>
                      </div>
                    )}
                    
                    {result.testData && (
                      <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                          <div className="text-center p-3 bg-blue-50 rounded">
                            <p className="text-lg font-bold text-blue-600">{result.testData.questions.length}</p>
                            <p className="text-xs text-blue-700">Questions</p>
                          </div>
                          <div className="text-center p-3 bg-green-50 rounded">
                            <p className="text-lg font-bold text-green-600">{result.testData.totalPoints}</p>
                            <p className="text-xs text-green-700">Total Points</p>
                          </div>
                          <div className="text-center p-3 bg-purple-50 rounded">
                            <p className="text-lg font-bold text-purple-600">{result.testData.estimatedTime}</p>
                            <p className="text-xs text-purple-700">Minutes</p>
                          </div>
                        </div>
                        
                        {result.testData.description && (
                          <div className="bg-gray-50 p-3 rounded">
                            <p className="text-sm text-gray-700">{result.testData.description}</p>
                          </div>
                        )}
                        
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            onClick={() => handlePrintTest(result.testData!)}
                          >
                            <Printer className="h-4 w-4 mr-2" />
                            Print Test
                          </Button>
                          <Button 
                            onClick={() => generatePDF(result.testData!)}
                          >
                            <Download className="h-4 w-4 mr-2" />
                            Download PDF
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </CollapsibleContent>
              </Collapsible>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
