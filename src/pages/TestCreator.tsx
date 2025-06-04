import { useState } from "react";
import { ArrowLeft, Plus, Trash2, FileText, Clock, CheckCircle, Edit, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import jsPDF from 'jspdf';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | string[];
  points: number;
}

interface TestTemplate {
  id: string;
  name: string;
  description: string;
  defaultQuestions: Partial<Question>[];
}

const testTemplates: TestTemplate[] = [
  {
    id: 'math-quiz',
    name: 'Math Quiz',
    description: 'Basic mathematics assessment with multiple choice questions',
    defaultQuestions: [
      { type: 'multiple-choice', question: 'What is 2 + 2?', options: ['3', '4', '5', '6'], correctAnswer: '4', points: 1 },
      { type: 'multiple-choice', question: 'What is 5 × 3?', options: ['12', '15', '18', '20'], correctAnswer: '15', points: 1 },
    ]
  },
  {
    id: 'science-test',
    name: 'Science Test',
    description: 'General science knowledge assessment',
    defaultQuestions: [
      { type: 'true-false', question: 'The Earth revolves around the Sun.', correctAnswer: 'true', points: 1 },
      { type: 'multiple-choice', question: 'What is the chemical symbol for water?', options: ['H2O', 'CO2', 'NaCl', 'O2'], correctAnswer: 'H2O', points: 2 },
    ]
  },
  {
    id: 'essay-exam',
    name: 'Essay Exam',
    description: 'Long-form written responses',
    defaultQuestions: [
      { type: 'essay', question: 'Describe the causes and effects of climate change.', points: 10 },
      { type: 'short-answer', question: 'Define photosynthesis in your own words.', points: 5 },
    ]
  },
  {
    id: 'custom',
    name: 'Custom Test',
    description: 'Start from scratch with your own questions',
    defaultQuestions: []
  }
];

const TestCreator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'template' | 'details' | 'questions' | 'preview'>('template');

  const handleTemplateSelect = (templateId: string) => {
    const template = testTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTestTitle(template.name);
      setTestDescription(template.description);
      
      const defaultQuestions: Question[] = template.defaultQuestions.map((q, index) => ({
        id: `q-${index}`,
        type: q.type || 'multiple-choice',
        question: q.question || '',
        options: q.options || (q.type === 'multiple-choice' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : undefined),
        correctAnswer: q.correctAnswer || '',
        points: q.points || 1,
      }));
      
      setQuestions(defaultQuestions);
      setCurrentStep('details');
    }
  };

  const addQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type,
      question: '',
      options: type === 'multiple-choice' ? ['Option 1', 'Option 2', 'Option 3', 'Option 4'] : undefined,
      correctAnswer: '',
      points: 1,
    };
    setQuestions([...questions, newQuestion]);
  };

  const updateQuestion = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const updateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId && q.options ? 
        { ...q, options: q.options.map((opt, idx) => idx === optionIndex ? value : opt) } : 
        q
    ));
  };

  const deleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const generatePDF = () => {
    const pdf = new jsPDF();
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const margin = 25;
    let yPosition = margin;
    
    // Header section with styling
    pdf.setFillColor(45, 55, 72); // Dark blue background
    pdf.rect(0, 0, pageWidth, 35, 'F');
    
    pdf.setTextColor(255, 255, 255); // White text
    pdf.setFontSize(20);
    pdf.setFont(undefined, 'bold');
    pdf.text(testTitle, margin, 20);
    
    pdf.setFontSize(10);
    pdf.setFont(undefined, 'normal');
    pdf.text(`Created: ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, 20);
    
    yPosition = 50;
    
    // Reset text color for content
    pdf.setTextColor(0, 0, 0);
    
    // Test information box
    pdf.setFillColor(248, 250, 252); // Light gray background
    pdf.setDrawColor(203, 213, 225); // Border color
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 40, 'FD');
    
    yPosition += 10;
    
    // Test description
    if (testDescription) {
      pdf.setFontSize(10);
      pdf.setFont(undefined, 'normal');
      const descLines = pdf.splitTextToSize(testDescription, pageWidth - 2 * margin - 10);
      pdf.text(descLines, margin + 5, yPosition);
      yPosition += Math.max(descLines.length * 4, 8);
    }
    
    // Test details in columns
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('Time Limit:', margin + 5, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${timeLimit} minutes`, margin + 30, yPosition);
    
    pdf.setFont(undefined, 'bold');
    pdf.text('Total Points:', margin + 80, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${questions.reduce((sum, q) => sum + q.points, 0)}`, margin + 110, yPosition);
    
    pdf.setFont(undefined, 'bold');
    pdf.text('Questions:', margin + 130, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text(`${questions.length}`, margin + 155, yPosition);
    
    yPosition += 20;
    
    // Instructions section
    pdf.setFillColor(239, 246, 255); // Light blue background
    pdf.rect(margin, yPosition, pageWidth - 2 * margin, 20, 'F');
    
    yPosition += 6;
    pdf.setFontSize(9);
    pdf.setFont(undefined, 'bold');
    pdf.text('INSTRUCTIONS:', margin + 5, yPosition);
    pdf.setFont(undefined, 'normal');
    pdf.text('Fill in the bubbles completely. Use a #2 pencil. Erase completely to change answers.', margin + 35, yPosition);
    
    yPosition += 8;
    pdf.text('Choose the BEST answer for each question. Mark only ONE answer per question.', margin + 5, yPosition);
    
    yPosition += 25;
    
    // Questions section
    questions.forEach((question, index) => {
      // Check if we need a new page
      const estimatedQuestionHeight = question.type === 'multiple-choice' ? 50 : 
                                     question.type === 'true-false' ? 30 : 
                                     question.type === 'essay' ? 60 : 25;
      
      if (yPosition + estimatedQuestionHeight > pageHeight - 30) {
        pdf.addPage();
        yPosition = margin + 10;
      }
      
      // Question header with background
      pdf.setFillColor(250, 250, 250);
      pdf.rect(margin, yPosition - 5, pageWidth - 2 * margin, 18, 'F');
      
      // Question number and points
      pdf.setFontSize(11);
      pdf.setFont(undefined, 'bold');
      pdf.setTextColor(37, 99, 235); // Blue color
      const questionHeader = `Question ${index + 1}`;
      pdf.text(questionHeader, margin + 5, yPosition + 5);
      
      pdf.setTextColor(107, 114, 128); // Gray color
      pdf.setFontSize(9);
      pdf.text(`(${question.points} point${question.points !== 1 ? 's' : ''})`, pageWidth - margin - 25, yPosition + 5);
      
      yPosition += 18;
      
      // Question text
      pdf.setTextColor(0, 0, 0);
      pdf.setFont(undefined, 'normal');
      pdf.setFontSize(10);
      const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 10);
      pdf.text(questionLines, margin + 5, yPosition);
      yPosition += questionLines.length * 5 + 8;
      
      // Answer options with improved styling
      if (question.type === 'multiple-choice' && question.options) {
        question.options.forEach((option, optionIndex) => {
          const optionLetter = String.fromCharCode(65 + optionIndex); // A, B, C, D
          
          // Option background for better readability
          if (optionIndex % 2 === 1) {
            pdf.setFillColor(253, 253, 253);
            pdf.rect(margin + 10, yPosition - 3, pageWidth - 2 * margin - 20, 10, 'F');
          }
          
          // Option text
          pdf.setTextColor(0, 0, 0);
          pdf.setFontSize(9);
          pdf.text(`${optionLetter})`, margin + 15, yPosition + 2);
          
          const optionLines = pdf.splitTextToSize(option, pageWidth - margin - 140);
          pdf.text(optionLines, margin + 25, yPosition + 2);
          
          // Answer bubble with better styling
          const bubbleX = pageWidth - margin - 30;
          const bubbleY = yPosition;
          const bubbleRadius = 4;
          
          pdf.setDrawColor(100, 116, 139);
          pdf.setLineWidth(0.5);
          pdf.circle(bubbleX, bubbleY, bubbleRadius);
          
          yPosition += Math.max(optionLines.length * 5, 10);
        });
        yPosition += 8;
      } else if (question.type === 'true-false') {
        // True option
        pdf.setFontSize(9);
        pdf.text('A) True', margin + 15, yPosition + 2);
        pdf.setDrawColor(100, 116, 139);
        pdf.setLineWidth(0.5);
        pdf.circle(pageWidth - margin - 30, yPosition, 4);
        yPosition += 10;
        
        // False option
        pdf.text('B) False', margin + 15, yPosition + 2);
        pdf.circle(pageWidth - margin - 30, yPosition, 4);
        yPosition += 15;
      } else if (question.type === 'short-answer') {
        pdf.setFontSize(9);
        pdf.text('Answer:', margin + 15, yPosition);
        
        // Draw answer lines with better spacing
        for (let i = 0; i < 2; i++) {
          yPosition += 8;
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 15, yPosition, pageWidth - margin - 15, yPosition);
        }
        yPosition += 10;
      } else if (question.type === 'essay') {
        pdf.setFontSize(9);
        pdf.text('Answer:', margin + 15, yPosition);
        yPosition += 8;
        
        // Add lined space for essay answer
        for (let i = 0; i < 6; i++) {
          pdf.setDrawColor(200, 200, 200);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 15, yPosition, pageWidth - margin - 15, yPosition);
          yPosition += 8;
        }
        yPosition += 8;
      }
      
      // Add subtle separator between questions
      if (index < questions.length - 1) {
        pdf.setDrawColor(229, 231, 235);
        pdf.setLineWidth(0.5);
        pdf.line(margin + 10, yPosition, pageWidth - margin - 10, yPosition);
        yPosition += 10;
      }
    });
    
    // Footer on each page
    const pageCount = pdf.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Page ${i} of ${pageCount}`, pageWidth - margin - 20, pageHeight - 10);
      pdf.text(testTitle, margin, pageHeight - 10);
    }
    
    // Save the PDF
    const fileName = `${testTitle.replace(/\s+/g, '_')}_Test.pdf`;
    pdf.save(fileName);
    toast.success('Beautiful PDF generated successfully!');
  };

  const generateTest = () => {
    if (!testTitle.trim()) {
      toast.error('Please enter a test title');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    const testData = {
      title: testTitle,
      description: testDescription,
      timeLimit,
      questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      createdAt: new Date().toISOString(),
    };
    
    console.log('Generated Test:', testData);
    generatePDF();
    toast.success('Test created and PDF generated successfully!');
    setCurrentStep('preview');
  };

  const renderTemplateSelection = () => (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Choose a Template</h2>
        <p className="text-gray-600">Select a template to get started quickly</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testTemplates.map((template) => (
          <Card 
            key={template.id} 
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedTemplate === template.id ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => handleTemplateSelect(template.id)}
          >
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                {template.name}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">{template.description}</p>
              <p className="text-sm text-blue-600 mt-2">
                {template.defaultQuestions.length} default questions
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderTestDetails = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Test Details</h2>
        <Button variant="outline" onClick={() => setCurrentStep('template')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Basic Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-title">Test Title</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => setTestTitle(e.target.value)}
              placeholder="Enter test title"
            />
          </div>
          
          <div>
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              value={testDescription}
              onChange={(e) => setTestDescription(e.target.value)}
              placeholder="Enter test description"
            />
          </div>
          
          <div>
            <Label htmlFor="time-limit">Time Limit (minutes)</Label>
            <Input
              id="time-limit"
              type="number"
              value={timeLimit}
              onChange={(e) => setTimeLimit(parseInt(e.target.value) || 60)}
              min="1"
              max="300"
            />
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={() => setCurrentStep('questions')} className="w-full">
        Continue to Questions
      </Button>
    </div>
  );

  const renderQuestionEditor = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Questions</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('details')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Details
          </Button>
          <Button onClick={generateTest}>
            Generate Test
          </Button>
        </div>
      </div>
      
      <div className="flex gap-2 mb-4">
        <Button onClick={() => addQuestion('multiple-choice')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Multiple Choice
        </Button>
        <Button onClick={() => addQuestion('true-false')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          True/False
        </Button>
        <Button onClick={() => addQuestion('short-answer')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Short Answer
        </Button>
        <Button onClick={() => addQuestion('essay')} variant="outline" size="sm">
          <Plus className="h-4 w-4 mr-1" />
          Essay
        </Button>
      </div>
      
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 capitalize">{question.type.replace('-', ' ')}</span>
                  <Button variant="ghost" size="sm" onClick={() => deleteQuestion(question.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Question Text</Label>
                <Textarea
                  value={question.question}
                  onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                  placeholder="Enter your question"
                />
              </div>
              
              {question.type === 'multiple-choice' && question.options && (
                <div>
                  <Label>Answer Options</Label>
                  <div className="space-y-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <Checkbox
                          checked={question.correctAnswer === option}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateQuestion(question.id, 'correctAnswer', option);
                            }
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {question.type === 'true-false' && (
                <div>
                  <Label>Correct Answer</Label>
                  <RadioGroup
                    value={question.correctAnswer as string}
                    onValueChange={(value) => updateQuestion(question.id, 'correctAnswer', value)}
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="true" id={`${question.id}-true`} />
                      <Label htmlFor={`${question.id}-true`}>True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`${question.id}-false`} />
                      <Label htmlFor={`${question.id}-false`}>False</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              <div className="flex items-center gap-4">
                <div>
                  <Label htmlFor={`points-${question.id}`}>Points</Label>
                  <Input
                    id={`points-${question.id}`}
                    type="number"
                    value={question.points}
                    onChange={(e) => updateQuestion(question.id, 'points', parseInt(e.target.value) || 1)}
                    min="1"
                    max="100"
                    className="w-20"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      
      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No questions added yet. Click the buttons above to add questions.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderPreview = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Test Preview</h2>
        <Button variant="outline" onClick={() => setCurrentStep('questions')}>
          <Edit className="h-4 w-4 mr-2" />
          Edit Questions
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CheckCircle className="h-5 w-5 text-green-600" />
            {testTitle}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="text-center p-4 bg-blue-50 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">{questions.length}</p>
              <p className="text-sm text-blue-700">Questions</p>
            </div>
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <p className="text-2xl font-bold text-green-600">{questions.reduce((sum, q) => sum + q.points, 0)}</p>
              <p className="text-sm text-green-700">Total Points</p>
            </div>
            <div className="text-center p-4 bg-purple-50 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">{timeLimit}</p>
              <p className="text-sm text-purple-700">Minutes</p>
            </div>
          </div>
          
          <div className="mb-4">
            <h3 className="font-semibold mb-2">Description:</h3>
            <p className="text-gray-600">{testDescription}</p>
          </div>
          
          <div>
            <h3 className="font-semibold mb-2">Questions Preview:</h3>
            <div className="space-y-2">
              {questions.map((question, index) => (
                <div key={question.id} className="p-3 bg-gray-50 rounded">
                  <p className="font-medium">
                    {index + 1}. {question.question} 
                    <span className="text-sm text-gray-500 ml-2">({question.points} pts)</span>
                  </p>
                  <p className="text-xs text-gray-500 capitalize">{question.type.replace('-', ' ')}</p>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="flex gap-2">
        <Button onClick={() => setCurrentStep('template')} variant="outline">
          Create Another Test
        </Button>
        <Button onClick={generatePDF}>
          <Download className="h-4 w-4 mr-2" />
          Download PDF
        </Button>
        <Button onClick={() => toast.success('Test exported successfully!')}>
          Export Test
        </Button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <Button asChild variant="outline" className="mb-4">
            <Link to="/" className="flex items-center gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back to Homepage
            </Link>
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Test & Quiz Creator</h1>
          <p className="text-gray-600">Create customizable tests and quizzes with different question types</p>
        </div>

        {currentStep === 'template' && renderTemplateSelection()}
        {currentStep === 'details' && renderTestDetails()}
        {currentStep === 'questions' && renderQuestionEditor()}
        {currentStep === 'preview' && renderPreview()}
      </div>
    </div>
  );
};

export default TestCreator;
