import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Download, RefreshCw, Zap, Printer } from "lucide-react";
import { toast } from "sonner";
import jsPDF from 'jspdf';
import { generatePracticeTest, PracticeTestData, PracticeTestQuestion } from "@/services/practiceTestService";
import { printTest } from "@/services/printService";

interface PracticeTestGeneratorProps {
  studentName: string;
  className: string;
  skillName: string | null;
  grade?: string;
  subject?: string;
  classId?: string;
  onBack: () => void;
}

export function PracticeTestGenerator({ 
  studentName, 
  className, 
  skillName, 
  grade, 
  subject, 
  classId,
  onBack 
}: PracticeTestGeneratorProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [testData, setTestData] = useState<PracticeTestData | null>(null);

  const handleGenerateTest = async () => {
    setIsGenerating(true);
    
    try {
      const result = await generatePracticeTest({
        studentName,
        className,
        skillName: skillName || undefined,
        grade,
        subject,
        classId
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

  const handlePrint = () => {
    if (!testData) return;

    // Get student ID from active students or generate one for practice tests
    const practiceStudentId = `PRAC-${Date.now().toString().slice(-6)}`;

    // Convert PracticeTestData to the format expected by printService
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
        correctAnswer: undefined, // Don't include answers in printed version
        points: q.points
      })),
      studentName: studentName,
      studentId: practiceStudentId // Include Student ID for practice tests
    };

    printTest(printableTestData);
  };

  const generatePDF = () => {
    if (!testData) return;

    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 20;
    let yPosition = margin;
    
    // Generate practice Student ID
    const practiceStudentId = `PRAC-${Date.now().toString().slice(-6)}`;
    
    // Header styling with Student ID
    pdf.setFontSize(18);
    pdf.setFont(undefined, 'bold');
    pdf.setTextColor(0, 0, 0);
    pdf.text(testData.title, margin, yPosition);
    
    yPosition += 15;
    
    // Student info section with Student ID
    pdf.setFontSize(11);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Student: ${studentName} | ID: ${practiceStudentId} | Class: ${className}`, margin, yPosition);
    
    if (skillName) {
      yPosition += 8;
      pdf.text(`Focus: ${skillName}`, margin, yPosition);
    }
    
    yPosition += 15;
    
    // Professional divider line
    pdf.setDrawColor(100, 100, 100);
    pdf.setLineWidth(0.8);
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    
    yPosition += 20;
    
    // Questions
    testData.questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedHeight = question.type === 'multiple-choice' ? 80 : 
                             question.type === 'true-false' ? 60 :
                             question.type === 'short-answer' ? 100 : 50;
      if (yPosition + estimatedHeight > pageHeight - 40) {
        pdf.addPage();
        yPosition = margin;
      }
      
      // Question number and text with improved formatting
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`${index + 1}.`, margin, yPosition);
      
      pdf.setFont(undefined, 'normal');
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 15);
      pdf.text(questionLines, margin + 15, yPosition);
      yPosition += questionLines.length * 6 + 12;
      
      // Answer options with drawable circles
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex);
          
          // Draw empty circle for shading
          const circleX = margin + 25;
          const circleY = yPosition - 3;
          const circleRadius = 3;
          
          pdf.setDrawColor(0, 0, 0);
          pdf.setLineWidth(0.5);
          pdf.circle(circleX, circleY, circleRadius, 'S'); // 'S' for stroke only (empty circle)
          
          // Place letter beside the circle
          pdf.setFontSize(10);
          pdf.setFont(undefined, 'normal');
          pdf.text(`${optionLetter}.`, circleX + 8, yPosition);
          
          // Place option text after letter
          const optionLines = pdf.splitTextToSize(option, pageWidth - 2 * margin - 50);
          pdf.text(optionLines, circleX + 18, yPosition);
          yPosition += Math.max(8, optionLines.length * 6);
        });
        yPosition += 8;
      } else if (question.type === 'true-false') {
        // True option with circle
        const trueCircleX = margin + 25;
        const trueCircleY = yPosition - 3;
        const circleRadius = 3;
        
        pdf.setDrawColor(0, 0, 0);
        pdf.setLineWidth(0.5);
        pdf.circle(trueCircleX, trueCircleY, circleRadius, 'S');
        
        pdf.setFontSize(10);
        pdf.text('A.', trueCircleX + 8, yPosition);
        pdf.text('True', trueCircleX + 18, yPosition);
        yPosition += 10;
        
        // False option with circle
        const falseCircleX = margin + 25;
        const falseCircleY = yPosition - 3;
        
        pdf.circle(falseCircleX, falseCircleY, circleRadius, 'S');
        pdf.text('B.', falseCircleX + 8, yPosition);
        pdf.text('False', falseCircleX + 18, yPosition);
        yPosition += 15;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(9);
        pdf.setTextColor(80, 80, 80);
        pdf.text('Answer:', margin + 20, yPosition);
        yPosition += 10;
        
        // Answer lines
        pdf.setDrawColor(150, 150, 150);
        pdf.setLineWidth(0.3);
        for (let i = 0; i < 3; i++) {
          pdf.line(margin + 20, yPosition, pageWidth - margin - 20, yPosition);
          yPosition += 12;
        }
        yPosition += 8;
      }
      
      pdf.setTextColor(0, 0, 0); // Reset text color
      
      // Add space between questions
      yPosition += 15;
    });
    
    // Footer on each page with Student ID
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(120, 120, 120);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 25, pageHeight - 15);
      
      // Add student info with ID to footer
      pdf.setFont(undefined, 'bold');
      pdf.text(`${studentName} (ID: ${practiceStudentId})`, margin, pageHeight - 15);
    }
    
    const fileName = `${testData.title.replace(/\s+/g, '_')}_${studentName.replace(/\s+/g, '_')}_${practiceStudentId}.pdf`;
    pdf.save(fileName);
    toast.success('Practice exercises PDF generated successfully!');
  };

  const isSuperExercise = skillName === 'super-exercise-content' || skillName === 'super-exercise-subject';
  const exerciseType = skillName === 'super-exercise-content' ? 'Content-Specific Skills' : 
                      skillName === 'super-exercise-subject' ? 'Subject-Specific Skills' : skillName;

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
                {isSuperExercise ? (
                  <>
                    <Zap className="h-5 w-5 text-orange-600" />
                    Generate Super Exercise
                  </>
                ) : (
                  <>
                    <FileText className="h-5 w-5" />
                    Generate Practice Exercises
                  </>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className={isSuperExercise ? "bg-orange-50 p-4 rounded-lg" : "bg-blue-50 p-4 rounded-lg"}>
                <h3 className={`font-semibold mb-2 ${isSuperExercise ? 'text-orange-900' : 'text-blue-900'}`}>
                  {isSuperExercise ? 'Super Exercise Details' : 'Test Details'}
                </h3>
                <div className={`space-y-1 text-sm ${isSuperExercise ? 'text-orange-800' : 'text-blue-800'}`}>
                  <p><strong>Student:</strong> {studentName}</p>
                  <p><strong>Class:</strong> {className}</p>
                  {grade && <p><strong>Grade:</strong> {grade}</p>}
                  {subject && <p><strong>Subject:</strong> {subject}</p>}
                  {isSuperExercise ? (
                    <p><strong>Focus:</strong> All {exerciseType} scoring below 80%</p>
                  ) : skillName ? (
                    <p><strong>Focus Skill:</strong> {skillName}</p>
                  ) : (
                    <p><strong>Type:</strong> Comprehensive Skills Assessment</p>
                  )}
                </div>
              </div>

              {isSuperExercise && (
                <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap className="h-4 w-4 text-yellow-600" />
                    <span className="font-medium text-yellow-800">Super Exercise</span>
                  </div>
                  <p className="text-sm text-yellow-700">
                    This will generate targeted practice exercises for all skills where the student scored below 80%, 
                    helping them focus on areas that need the most improvement.
                  </p>
                </div>
              )}

              <Button 
                onClick={handleGenerateTest} 
                disabled={isGenerating}
                className={`w-full ${isSuperExercise ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                    Generating {isSuperExercise ? 'Super Exercise' : 'Practice Exercises'}...
                  </>
                ) : (
                  <>
                    {isSuperExercise ? (
                      <Zap className="h-4 w-4 mr-2" />
                    ) : (
                      <FileText className="h-4 w-4 mr-2" />
                    )}
                    Generate {isSuperExercise ? 'Super Exercise' : 'Practice Exercises'}
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
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="h-4 w-4 mr-2" />
            Print
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
              {grade && <span><strong>Grade:</strong> {grade}</span>}
              {subject && <span><strong>Subject:</strong> {subject}</span>}
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
