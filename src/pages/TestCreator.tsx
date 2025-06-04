import { useState } from "react";
import { ArrowLeft, Plus, Trash2, FileText, Clock, CheckCircle, Edit, Download, Key } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

// Import the classes data structure from ClassView
const availableClasses = [
  { id: '1', name: 'Math Grade 6', subject: 'Mathematics', grade: '6', teacher: 'Ms. Johnson' },
  { id: '2', name: 'Science Grade 7', subject: 'Science', grade: '7', teacher: 'Mr. Chen' },
  { id: '3', name: 'English Grade 8', subject: 'English', grade: '8', teacher: 'Mrs. Williams' },
  { id: '4', name: 'History Grade 9', subject: 'History', grade: '9', teacher: 'Dr. Brown' }
];

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
      { type: 'essay', question: 'Describe the causes and effects of climate change.', correctAnswer: 'Sample answer: Climate change is caused by greenhouse gas emissions, deforestation, and human activities. Effects include rising temperatures, sea level rise, and extreme weather patterns.', points: 10 },
      { type: 'short-answer', question: 'Define photosynthesis in your own words.', correctAnswer: 'Photosynthesis is the process by which plants convert sunlight, carbon dioxide, and water into glucose and oxygen.', points: 5 },
    ]
  },
  {
    id: 'custom',
    name: 'Custom Test',
    description: 'Start from scratch with your own questions',
    defaultQuestions: []
  }
];

// Generate unique exam ID
const generateExamId = () => {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `EXAM-${timestamp}-${random}`.toUpperCase();
};

const TestCreator = () => {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [className, setClassName] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'template' | 'details' | 'questions' | 'answer-key' | 'class-input' | 'preview'>('template');
  const [examId, setExamId] = useState<string>('');

  const handleTemplateSelect = (templateId: string) => {
    const template = testTemplates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setTestTitle(template.name);
      setTestDescription(template.description);
      
      // Generate unique exam ID when template is selected
      const newExamId = generateExamId();
      setExamId(newExamId);
      
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
    const margin = 20;
    const maxQuestionsPerPage = 8; // Increased capacity
    
    // Split questions into pages
    const questionPages: Question[][] = [];
    for (let i = 0; i < questions.length; i += maxQuestionsPerPage) {
      questionPages.push(questions.slice(i, i + maxQuestionsPerPage));
    }
    
    // Dynamic spacing based on content density
    const calculateLayout = (questionsCount: number) => {
      const availableHeight = pageHeight - 160; // Reserve space for header/footer
      const baseSpacing = Math.max(15, Math.floor(availableHeight / questionsCount) - 20);
      
      return {
        questionSpacing: Math.min(baseSpacing, 30),
        optionSpacing: Math.max(6, Math.floor(baseSpacing / 4)),
        headerHeight: 120
      };
    };

    questionPages.forEach((pageQuestions, pageIndex) => {
      if (pageIndex > 0) {
        pdf.addPage();
      }
      
      const layout = calculateLayout(pageQuestions.length);
      let yPosition = margin;
      
      // Compact Header Section
      pdf.setFillColor(45, 55, 72);
      pdf.rect(0, 0, pageWidth, 30, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(18);
      pdf.setFont(undefined, 'bold');
      pdf.text(testTitle, margin, 18);
      
      pdf.setFontSize(9);
      pdf.text(`Created: ${new Date().toLocaleDateString()}`, pageWidth - margin - 35, 18);
      
      yPosition = 40;
      pdf.setTextColor(0, 0, 0);
      
      // Compact Exam ID Section
      pdf.setFillColor(220, 38, 38);
      pdf.rect(margin, yPosition, pageWidth - 2 * margin, 18, 'F');
      
      pdf.setTextColor(255, 255, 255);
      pdf.setFontSize(12);
      pdf.setFont(undefined, 'bold');
      pdf.text(`EXAM ID: ${examId}`, margin + 5, yPosition + 12);
      
      yPosition += 25;
      pdf.setTextColor(0, 0, 0);
      
      // Compact Class Information
      if (className && pageIndex === 0) {
        pdf.setFillColor(59, 130, 246);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 15, 'F');
        
        pdf.setTextColor(255, 255, 255);
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text(`Class: ${className}`, margin + 5, yPosition + 10);
        
        yPosition += 20;
        pdf.setTextColor(0, 0, 0);
      }
      
      // Compact Student Information (first page only)
      if (pageIndex === 0) {
        pdf.setFillColor(248, 250, 252);
        pdf.setDrawColor(203, 213, 225);
        pdf.rect(margin, yPosition, pageWidth - 2 * margin, 35, 'FD');
        
        yPosition += 8;
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.text('STUDENT INFO', margin + 5, yPosition);
        
        yPosition += 12;
        
        // Inline student fields for space efficiency
        pdf.setFontSize(9);
        pdf.text('Name:', margin + 5, yPosition);
        pdf.setDrawColor(100, 100, 100);
        pdf.setLineWidth(0.5);
        pdf.rect(margin + 25, yPosition - 6, 80, 8);
        
        pdf.text('ID:', margin + 110, yPosition);
        pdf.rect(margin + 125, yPosition - 6, 40, 8);
        
        // Test info in same row
        pdf.setFont(undefined, 'bold');
        pdf.text(`Time: ${timeLimit}min`, pageWidth - margin - 40, yPosition);
        
        yPosition += 15;
        
        // Instructions in minimal space
        pdf.setFontSize(8);
        pdf.setFont(undefined, 'normal');
        pdf.text('Instructions: Fill bubbles completely. Use #2 pencil. One answer per question.', margin + 5, yPosition);
        
        yPosition += 20;
      } else {
        // Minimal header for subsequent pages
        yPosition += 5;
        pdf.setFontSize(12);
        pdf.setFont(undefined, 'bold');
        pdf.text(`${testTitle} - Page ${pageIndex + 1}`, margin, yPosition);
        pdf.setFontSize(8);
        pdf.text(`Exam ID: ${examId}`, pageWidth - margin - 40, yPosition);
        yPosition += 15;
      }
      
      // Render questions with optimized spacing
      pageQuestions.forEach((question, questionIndex) => {
        const globalQuestionIndex = pageIndex * maxQuestionsPerPage + questionIndex;
        
        // Compact question header
        pdf.setFillColor(250, 250, 250);
        pdf.rect(margin, yPosition - 2, pageWidth - 2 * margin, 12, 'F');
        
        pdf.setFontSize(10);
        pdf.setFont(undefined, 'bold');
        pdf.setTextColor(37, 99, 235);
        pdf.text(`Q${globalQuestionIndex + 1}`, margin + 3, yPosition + 6);
        
        pdf.setTextColor(107, 114, 128);
        pdf.setFontSize(8);
        pdf.text(`(${question.points}pt${question.points !== 1 ? 's' : ''})`, pageWidth - margin - 20, yPosition + 6);
        
        yPosition += 12;
        
        // Question text with word wrapping
        pdf.setTextColor(0, 0, 0);
        pdf.setFont(undefined, 'normal');
        pdf.setFontSize(9);
        const questionLines = pdf.splitTextToSize(question.question, pageWidth - 2 * margin - 5);
        pdf.text(questionLines, margin + 3, yPosition + 2);
        yPosition += questionLines.length * 4 + 4;
        
        // Answer options with compact layout
        if (question.type === 'multiple-choice' && question.options) {
          question.options.forEach((option, optionIndex) => {
            const optionLetter = String.fromCharCode(65 + optionIndex);
            
            // Two-column layout for options when space is tight
            const isSecondColumn = optionIndex % 2 === 1 && pageQuestions.length > 6;
            const xOffset = isSecondColumn ? pageWidth / 2 : 0;
            const actualYPos = isSecondColumn ? yPosition - layout.optionSpacing : yPosition;
            
            pdf.setFontSize(8);
            pdf.text(`${optionLetter})`, margin + 5 + xOffset, actualYPos);
            
            const optionLines = pdf.splitTextToSize(option, (pageWidth / (isSecondColumn ? 2.2 : 1)) - margin - 40);
            pdf.text(optionLines, margin + 15 + xOffset, actualYPos);
            
            // Answer bubble
            const bubbleX = (isSecondColumn ? pageWidth - margin - 15 : pageWidth - margin - 25);
            pdf.setDrawColor(100, 116, 139);
            pdf.setLineWidth(0.5);
            pdf.circle(bubbleX, actualYPos - 2, 3);
            
            if (!isSecondColumn || optionIndex === question.options!.length - 1) {
              yPosition += layout.optionSpacing;
            }
          });
        } else if (question.type === 'true-false') {
          pdf.setFontSize(8);
          pdf.text('A) True', margin + 5, yPosition);
          pdf.text('B) False', margin + 50, yPosition);
          
          // Answer bubbles for True/False
          pdf.setDrawColor(100, 116, 139);
          pdf.setLineWidth(0.5);
          pdf.circle(pageWidth - margin - 40, yPosition - 2, 3);
          pdf.circle(pageWidth - margin - 25, yPosition - 2, 3);
          
          yPosition += layout.optionSpacing;
        } else if (question.type === 'short-answer') {
          pdf.setFontSize(8);
          pdf.text('Answer:', margin + 5, yPosition);
          yPosition += 6;
          
          // Compact answer lines
          for (let i = 0; i < 2; i++) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
            yPosition += 6;
          }
        } else if (question.type === 'essay') {
          pdf.setFontSize(8);
          pdf.text('Answer:', margin + 5, yPosition);
          yPosition += 6;
          
          // Adaptive essay lines based on space
          const essayLines = pageQuestions.length > 6 ? 3 : 4;
          for (let i = 0; i < essayLines; i++) {
            pdf.setDrawColor(200, 200, 200);
            pdf.setLineWidth(0.3);
            pdf.line(margin + 5, yPosition, pageWidth - margin - 5, yPosition);
            yPosition += 6;
          }
        }
        
        yPosition += layout.questionSpacing;
        
        // Separator line between questions
        if (questionIndex < pageQuestions.length - 1) {
          pdf.setDrawColor(229, 231, 235);
          pdf.setLineWidth(0.3);
          pdf.line(margin + 5, yPosition - layout.questionSpacing / 2, pageWidth - margin - 5, yPosition - layout.questionSpacing / 2);
        }
      });
      
      // Compact footer
      pdf.setFontSize(7);
      pdf.setTextColor(107, 114, 128);
      pdf.text(`Page ${pageIndex + 1}/${questionPages.length}`, pageWidth - margin - 15, pageHeight - 8);
      pdf.text(`${testTitle} | ${examId}`, margin, pageHeight - 8);
    });
    
    // Save the PDF
    const fileName = `${testTitle.replace(/\s+/g, '_')}_${examId}.pdf`;
    pdf.save(fileName);
    toast.success('Optimized PDF generated successfully!');
  };

  const handleGenerateTest = () => {
    if (!testTitle.trim()) {
      toast.error('Please enter a test title');
      return;
    }
    if (questions.length === 0) {
      toast.error('Please add at least one question');
      return;
    }
    
    setCurrentStep('answer-key');
  };

  const handleAnswerKeyComplete = () => {
    // Check if all questions have correct answers
    const incompleteQuestions = questions.filter(q => !q.correctAnswer || q.correctAnswer === '');
    if (incompleteQuestions.length > 0) {
      toast.error(`Please provide correct answers for all questions. ${incompleteQuestions.length} question(s) missing answers.`);
      return;
    }
    
    setCurrentStep('class-input');
  };

  const saveTestToDatabase = async (testData: any) => {
    // This would save to your database/OpenAI system
    // For now, we'll just log and show success
    console.log('Test data with answer key and exam ID saved:', testData);
    
    // Here you would make an API call to save the test data
    // The testData includes:
    // - examId: unique identifier for OpenAI to match tests
    // - all questions with their correct answers
    // - test metadata (title, description, class, etc.)
    // This allows OpenAI to access the answers for grading later
    
    toast.success(`Test and answer key saved successfully! Exam ID: ${testData.examId}`);
  };

  const finalizeTest = async () => {
    if (!className.trim()) {
      toast.error('Please select a class');
      return;
    }
    
    const testData = {
      examId, // Include the unique exam ID
      title: testTitle,
      description: testDescription,
      className,
      timeLimit,
      questions,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      createdAt: new Date().toISOString(),
    };
    
    // Save to database with answer key and exam ID
    await saveTestToDatabase(testData);
    
    generatePDF();
    toast.success(`Test created and PDF generated successfully! Exam ID: ${examId}`);
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
      
      {examId && (
        <Card className="border-2 border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-red-800">Exam ID:</span>
              <span className="font-mono text-lg text-red-900 bg-white px-3 py-1 rounded border">
                {examId}
              </span>
            </div>
            <p className="text-sm text-red-700 mt-2">
              This unique ID will be used to identify this exam for grading purposes.
            </p>
          </CardContent>
        </Card>
      )}
      
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
          <Button onClick={handleGenerateTest}>
            Continue to Answer Key
          </Button>
        </div>
      </div>
      
      {examId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Exam ID: </span>
          <span className="text-sm font-mono text-blue-900">{examId}</span>
        </div>
      )}
      
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

  const renderAnswerKey = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Key className="h-6 w-6" />
          Answer Key
        </h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setCurrentStep('questions')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Questions
          </Button>
          <Button onClick={handleAnswerKeyComplete}>
            Continue to Class Selection
          </Button>
        </div>
      </div>
      
      {examId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Exam ID: </span>
          <span className="text-sm font-mono text-blue-900">{examId}</span>
        </div>
      )}
      
      <div className="bg-blue-50 p-4 rounded-lg mb-6">
        <h3 className="font-semibold text-blue-900 mb-2">Answer Key Instructions</h3>
        <p className="text-sm text-blue-800">
          Provide correct answers for all questions. This answer key will be saved securely and used by the AI grading system to automatically score student responses.
        </p>
      </div>
      
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 capitalize">{question.type.replace('-', ' ')}</span>
                  <span className="text-sm text-gray-600">({question.points} pts)</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                <p className="font-medium text-gray-900">{question.question}</p>
              </div>
              
              {question.type === 'multiple-choice' && question.options && (
                <div>
                  <Label>Correct Answer</Label>
                  <div className="space-y-2 mt-2">
                    {question.options.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex items-center gap-2">
                        <Checkbox
                          checked={question.correctAnswer === option}
                          onCheckedChange={(checked) => {
                            if (checked) {
                              updateQuestion(question.id, 'correctAnswer', option);
                            }
                          }}
                        />
                        <span className="text-sm">{String.fromCharCode(65 + optionIndex)}) {option}</span>
                      </div>
                    ))}
                  </div>
                  {question.correctAnswer && (
                    <div className="mt-2 p-2 bg-green-50 rounded text-sm text-green-700">
                      <strong>Selected Answer:</strong> {question.correctAnswer}
                    </div>
                  )}
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
                      <RadioGroupItem value="true" id={`ans-${question.id}-true`} />
                      <Label htmlFor={`ans-${question.id}-true`}>True</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="false" id={`ans-${question.id}-false`} />
                      <Label htmlFor={`ans-${question.id}-false`}>False</Label>
                    </div>
                  </RadioGroup>
                </div>
              )}
              
              {(question.type === 'short-answer' || question.type === 'essay') && (
                <div>
                  <Label htmlFor={`answer-${question.id}`}>
                    {question.type === 'essay' ? 'Sample/Expected Answer' : 'Correct Answer'}
                  </Label>
                  <Textarea
                    id={`answer-${question.id}`}
                    value={question.correctAnswer as string || ''}
                    onChange={(e) => updateQuestion(question.id, 'correctAnswer', e.target.value)}
                    placeholder={question.type === 'essay' 
                      ? 'Provide a sample answer or key points that should be covered...'
                      : 'Enter the correct answer...'
                    }
                    className="mt-2"
                    rows={question.type === 'essay' ? 4 : 2}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {question.type === 'essay' 
                      ? 'This will be used as a reference for AI grading. Include key points and concepts.'
                      : 'This exact answer will be used for automatic grading.'}
                  </p>
                </div>
              )}
              
              {!question.correctAnswer && (
                <div className="p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-700">
                  ⚠️ Please provide a correct answer for this question
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );

  const renderClassInput = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Class Information</h2>
        <Button variant="outline" onClick={() => setCurrentStep('questions')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Questions
        </Button>
      </div>
      
      {examId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Exam ID: </span>
          <span className="text-sm font-mono text-blue-900">{examId}</span>
        </div>
      )}
      
      <Card>
        <CardHeader>
          <CardTitle>Select Class</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="class-select">Class Name</Label>
            <Select value={className} onValueChange={setClassName}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.name}>
                    <div className="flex flex-col">
                      <span className="font-medium">{classItem.name}</span>
                      <span className="text-sm text-gray-500">{classItem.teacher} • Grade {classItem.grade}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              This will be used for data classification and will appear on the test PDF.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Button onClick={finalizeTest} className="w-full">
        Generate PDF
      </Button>
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
          {examId && (
            <div className="bg-red-50 p-3 rounded-lg">
              <span className="text-sm font-medium text-red-800">Exam ID: </span>
              <span className="text-sm font-mono text-red-900">{examId}</span>
            </div>
          )}
          {className && (
            <p className="text-sm text-blue-600 font-medium">Class: {className}</p>
          )}
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
        {currentStep === 'answer-key' && renderAnswerKey()}
        {currentStep === 'class-input' && renderClassInput()}
        {currentStep === 'preview' && renderPreview()}
      </div>
    </div>
  );
};

export default TestCreator;
