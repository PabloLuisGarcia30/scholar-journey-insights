import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileText, X, ArrowLeft, Printer, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router-dom';
import { generateTestPDF, generateStudentTestPDFs, generateConsolidatedTestPDF } from '@/utils/pdfGenerator';
import { printTest, printConsolidatedTests } from '@/services/printService';

interface Question {
  id: string;
  type: 'multiple-choice' | 'true-false' | 'short-answer' | 'essay';
  question: string;
  options?: string[];
  correctAnswer?: string | boolean;
  points: number;
}

interface TestData {
  examId: string;
  title: string;
  description: string;
  className: string;
  timeLimit: number;
  questions: Question[];
}

const TestCreator = () => {
  const [testData, setTestData] = useState<TestData>({
    examId: '',
    title: '',
    description: '',
    className: '',
    timeLimit: 60,
    questions: []
  });

  const [currentQuestion, setCurrentQuestion] = useState<Partial<Question>>({
    type: 'multiple-choice',
    question: '',
    options: ['', '', '', ''],
    points: 1
  });

  const [studentNames, setStudentNames] = useState<string>('');

  const addQuestion = () => {
    if (!currentQuestion.question?.trim()) {
      toast.error('Please enter a question');
      return;
    }

    if (currentQuestion.type === 'multiple-choice' && (!currentQuestion.options || currentQuestion.options.some(opt => !opt.trim()))) {
      toast.error('Please fill in all multiple choice options');
      return;
    }

    const newQuestion: Question = {
      id: `q-${Date.now()}`,
      type: currentQuestion.type as Question['type'],
      question: currentQuestion.question,
      options: currentQuestion.type === 'multiple-choice' ? currentQuestion.options : undefined,
      points: currentQuestion.points || 1
    };

    setTestData(prev => ({
      ...prev,
      questions: [...prev.questions, newQuestion]
    }));

    setCurrentQuestion({
      type: 'multiple-choice',
      question: '',
      options: ['', '', '', ''],
      points: 1
    });

    toast.success('Question added successfully!');
  };

  const removeQuestion = (questionId: string) => {
    setTestData(prev => ({
      ...prev,
      questions: prev.questions.filter(q => q.id !== questionId)
    }));
    toast.success('Question removed');
  };

  const updateQuestion = (questionId: string, updates: Partial<Question>) => {
    setTestData(prev => ({
      ...prev,
      questions: prev.questions.map(q => 
        q.id === questionId ? { ...q, ...updates } : q
      )
    }));
  };

  const handleDownloadPDF = () => {
    if (testData.questions.length === 0) {
      toast.error('Please add at least one question before downloading');
      return;
    }

    if (!testData.title || !testData.examId) {
      toast.error('Please fill in the test title and exam ID');
      return;
    }

    generateTestPDF(testData);
    toast.success('PDF downloaded successfully!');
  };

  const handlePrint = () => {
    if (testData.questions.length === 0) {
      toast.error('Please add at least one question before printing');
      return;
    }

    if (!testData.title || !testData.examId) {
      toast.error('Please fill in the test title and exam ID');
      return;
    }

    printTest(testData);
  };

  const handleDownloadStudentPDFs = () => {
    if (testData.questions.length === 0) {
      toast.error('Please add at least one question before downloading');
      return;
    }

    if (!testData.title || !testData.examId) {
      toast.error('Please fill in the test title and exam ID');
      return;
    }

    const names = studentNames.split('\n').filter(name => name.trim() !== '');
    if (names.length === 0) {
      toast.error('Please enter at least one student name');
      return;
    }

    generateStudentTestPDFs(testData, names);
    toast.success(`${names.length} student PDFs downloaded successfully!`);
  };

  const handleDownloadConsolidatedPDF = () => {
    if (testData.questions.length === 0) {
      toast.error('Please add at least one question before downloading');
      return;
    }

    if (!testData.title || !testData.examId) {
      toast.error('Please fill in the test title and exam ID');
      return;
    }

    const names = studentNames.split('\n').filter(name => name.trim() !== '');
    if (names.length === 0) {
      toast.error('Please enter at least one student name');
      return;
    }

    generateConsolidatedTestPDF(testData, names);
    toast.success('Consolidated PDF downloaded successfully!');
  };

  const handlePrintConsolidated = () => {
    if (testData.questions.length === 0) {
      toast.error('Please add at least one question before printing');
      return;
    }

    if (!testData.title || !testData.examId) {
      toast.error('Please fill in the test title and exam ID');
      return;
    }

    const names = studentNames.split('\n').filter(name => name.trim() !== '');
    if (names.length === 0) {
      toast.error('Please enter at least one student name');
      return;
    }

    printConsolidatedTests(testData, names);
  };

  const totalPoints = testData.questions.reduce((sum, q) => sum + q.points, 0);

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <Button asChild variant="ghost" size="sm">
          <Link to="/" className="flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Link>
        </Button>
      </div>

      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-2">Test Creator</h1>
        <p className="text-muted-foreground">
          Create professional tests and quizzes with automatic PDF generation
        </p>
      </div>

      {/* Test Details Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Test Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title">Test Title</Label>
              <Input
                id="title"
                value={testData.title}
                onChange={(e) => setTestData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="e.g., Chapter 5 Quiz"
              />
            </div>
            <div>
              <Label htmlFor="examId">Exam ID</Label>
              <Input
                id="examId"
                value={testData.examId}
                onChange={(e) => setTestData(prev => ({ ...prev, examId: e.target.value }))}
                placeholder="e.g., MATH-CH5-001"
              />
            </div>
            <div>
              <Label htmlFor="className">Class Name</Label>
              <Input
                id="className"
                value={testData.className}
                onChange={(e) => setTestData(prev => ({ ...prev, className: e.target.value }))}
                placeholder="e.g., Algebra 1"
              />
            </div>
            <div>
              <Label htmlFor="timeLimit">Time Limit (minutes)</Label>
              <Input
                id="timeLimit"
                type="number"
                value={testData.timeLimit}
                onChange={(e) => setTestData(prev => ({ ...prev, timeLimit: Number(e.target.value) }))}
                min="1"
              />
            </div>
          </div>
          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={testData.description}
              onChange={(e) => setTestData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of the test content..."
              rows={2}
            />
          </div>
        </CardContent>
      </Card>

      {/* Question Builder Section */}
      <Card>
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="questionType">Question Type</Label>
              <Select
                value={currentQuestion.type}
                onValueChange={(value: Question['type']) => 
                  setCurrentQuestion(prev => ({ 
                    ...prev, 
                    type: value,
                    options: value === 'multiple-choice' ? ['', '', '', ''] : undefined
                  }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                  <SelectItem value="true-false">True/False</SelectItem>
                  <SelectItem value="short-answer">Short Answer</SelectItem>
                  <SelectItem value="essay">Essay</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="points">Points</Label>
              <Input
                id="points"
                type="number"
                value={currentQuestion.points}
                onChange={(e) => setCurrentQuestion(prev => ({ ...prev, points: Number(e.target.value) }))}
                min="1"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="questionText">Question</Label>
            <Textarea
              id="questionText"
              value={currentQuestion.question}
              onChange={(e) => setCurrentQuestion(prev => ({ ...prev, question: e.target.value }))}
              placeholder="Enter your question here..."
              rows={3}
            />
          </div>

          {currentQuestion.type === 'multiple-choice' && (
            <div>
              <Label>Answer Options</Label>
              <div className="space-y-2 mt-2">
                {currentQuestion.options?.map((option, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <span className="font-medium text-sm w-6">
                      {String.fromCharCode(65 + index)}.
                    </span>
                    <Input
                      value={option}
                      onChange={(e) => {
                        const newOptions = [...(currentQuestion.options || [])];
                        newOptions[index] = e.target.value;
                        setCurrentQuestion(prev => ({ ...prev, options: newOptions }));
                      }}
                      placeholder={`Option ${String.fromCharCode(65 + index)}`}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <Button onClick={addQuestion} className="w-full">
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </CardContent>
      </Card>

      {/* Questions List */}
      {testData.questions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              <span>Questions ({testData.questions.length})</span>
              <Badge variant="secondary">{totalPoints} Total Points</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {testData.questions.map((question, index) => (
              <div key={question.id} className="border rounded-lg p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-semibold">Q{index + 1}.</span>
                      <Badge variant="outline" className="capitalize">
                        {question.type.replace('-', ' ')}
                      </Badge>
                      <Badge className="bg-blue-100 text-blue-700">
                        {question.points} pts
                      </Badge>
                    </div>
                    <p className="text-gray-900 mb-2">{question.question}</p>
                    
                    {question.type === 'multiple-choice' && question.options && (
                      <div className="space-y-1 ml-4">
                        {question.options.map((option, optionIndex) => (
                          <div key={optionIndex} className="flex items-center gap-2">
                            <span className="font-medium text-sm">
                              {String.fromCharCode(65 + optionIndex)}.
                            </span>
                            <span className="text-gray-700">{option}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeQuestion(question.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Student Names Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Student Names (Optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div>
            <Label htmlFor="studentNames">Student Names</Label>
            <Textarea
              id="studentNames"
              value={studentNames}
              onChange={(e) => setStudentNames(e.target.value)}
              placeholder="Enter student names, one per line:&#10;John Smith&#10;Jane Doe&#10;Mike Johnson"
              rows={6}
              className="mt-2"
            />
            <p className="text-sm text-muted-foreground mt-1">
              Enter one student name per line. This will generate individual PDFs with pre-filled names.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Download Section */}
      <Card>
        <CardHeader>
          <CardTitle>Download & Print Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-3">
              <h3 className="font-semibold">General Test</h3>
              <div className="space-y-2">
                <Button onClick={handleDownloadPDF} className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download PDF (Blank)
                </Button>
                <Button variant="outline" onClick={handlePrint} className="w-full">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Test
                </Button>
              </div>
            </div>
            
            <div className="space-y-3">
              <h3 className="font-semibold">Student-Specific Tests</h3>
              <div className="space-y-2">
                <Button 
                  onClick={handleDownloadStudentPDFs} 
                  className="w-full"
                  disabled={!studentNames.trim()}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Download Individual PDFs
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadConsolidatedPDF}
                  className="w-full"
                  disabled={!studentNames.trim()}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Download Consolidated PDF
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handlePrintConsolidated}
                  className="w-full"
                  disabled={!studentNames.trim()}
                >
                  <Printer className="h-4 w-4 mr-2" />
                  Print All Tests
                </Button>
              </div>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Download Options:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li><strong>Blank PDF:</strong> General test without student names</li>
              <li><strong>Individual PDFs:</strong> Separate PDF file for each student</li>
              <li><strong>Consolidated PDF:</strong> All students in one PDF file</li>
              <li><strong>Print Options:</strong> Direct browser printing</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TestCreator;
