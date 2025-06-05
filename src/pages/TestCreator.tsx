import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Trash2, FileText, Clock, CheckCircle, Edit, Download, Key, RefreshCw } from "lucide-react";
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
import { generateTestPDF, type Question, type TestData } from "@/utils/pdfGenerator";
import { TemplateSelection, type TestTemplate } from "@/components/TestCreator/TemplateSelection";
import { TestDetails } from "@/components/TestCreator/TestDetails";
import { QuestionEditor } from "@/components/TestCreator/QuestionEditor";
import { saveExamToDatabase, getAllActiveClasses, type ExamData, type ActiveClass } from "@/services/examService";

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
  const [selectedClassId, setSelectedClassId] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentStep, setCurrentStep] = useState<'template' | 'details' | 'questions' | 'answer-key' | 'class-input' | 'preview'>('template');
  const [examId, setExamId] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<ActiveClass[]>([]);
  const [isGeneratingStudentTests, setIsGeneratingStudentTests] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classes = await getAllActiveClasses();
        setAvailableClasses(classes);
      } catch (error) {
        console.error('Error loading classes:', error);
        toast.error('Failed to load classes');
      }
    };

    loadClasses();
  }, []);

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

  const saveTestToDatabase = async (testData: ExamData, classId: string) => {
    try {
      console.log('Saving test data with answer key and exam ID:', testData);
      await saveExamToDatabase(testData, classId);
      toast.success(`Test and answer key saved successfully! Exam ID: ${testData.examId}`);
    } catch (error) {
      console.error('Error saving test to database:', error);
      toast.error('Failed to save test to database. Please try again.');
      throw error;
    }
  };

  const finalizeTest = async () => {
    if (!selectedClassId.trim()) {
      toast.error('Please select a class');
      return;
    }
    
    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    const className = selectedClass?.name || 'Unknown Class';
    
    const testData: ExamData = {
      examId,
      title: testTitle,
      description: testDescription,
      className,
      timeLimit,
      totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      questions,
    };
    
    try {
      await saveTestToDatabase(testData, selectedClassId);
      toast.success(`Test saved successfully! Exam ID: ${examId}`);
      setCurrentStep('preview');
    } catch (error) {
      // Error already handled in saveTestToDatabase
      return;
    }
  };

  const generateStudentTests = async () => {
    if (!selectedClassId.trim()) {
      toast.error('Please select a class first');
      return;
    }

    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    if (!selectedClass || !selectedClass.students || selectedClass.students.length === 0) {
      toast.error('No students found in the selected class');
      return;
    }

    setIsGeneratingStudentTests(true);

    try {
      // Import the active students service to get student names
      const { getAllActiveStudents } = await import('@/services/examService');
      const allStudents = await getAllActiveStudents();
      
      // Filter students that are in this class
      const classStudents = allStudents.filter(student => 
        selectedClass.students.includes(student.id)
      );

      if (classStudents.length === 0) {
        toast.error('No student details found for this class');
        return;
      }

      const className = selectedClass.name;
      const studentNames = classStudents.map(student => student.name);
      
      const testData: TestData = {
        examId,
        title: testTitle,
        description: testDescription,
        className,
        timeLimit,
        questions,
      };

      // Save to database first
      const examData: ExamData = {
        ...testData,
        totalPoints: questions.reduce((sum, q) => sum + q.points, 0),
      };
      
      await saveTestToDatabase(examData, selectedClassId);
      
      // Import the new function
      const { generateStudentTestPDFs } = await import('@/utils/pdfGenerator');
      
      // Generate individual tests for each student
      generateStudentTestPDFs(testData, studentNames);
      
      toast.success(`Generated ${studentNames.length} individual test PDFs for each student in ${className}!`);
      setCurrentStep('preview');
    } catch (error) {
      console.error('Error generating student tests:', error);
      toast.error('Failed to generate student tests. Please try again.');
    } finally {
      setIsGeneratingStudentTests(false);
    }
  };

  const renderTemplateSelection = () => (
    <TemplateSelection 
      templates={testTemplates}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={handleTemplateSelect}
    />
  );

  const renderTestDetails = () => (
    <TestDetails
      examId={examId}
      testTitle={testTitle}
      testDescription={testDescription}
      timeLimit={timeLimit}
      onTestTitleChange={setTestTitle}
      onTestDescriptionChange={setTestDescription}
      onTimeLimitChange={setTimeLimit}
      onBack={() => setCurrentStep('template')}
      onContinue={() => setCurrentStep('questions')}
    />
  );

  const renderQuestionEditor = () => (
    <QuestionEditor
      examId={examId}
      questions={questions}
      onAddQuestion={addQuestion}
      onUpdateQuestion={updateQuestion}
      onUpdateQuestionOption={updateQuestionOption}
      onDeleteQuestion={deleteQuestion}
      onBack={() => setCurrentStep('details')}
      onContinue={handleGenerateTest}
    />
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
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {availableClasses.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    <div className="flex flex-col">
                      <span className="font-medium">{classItem.name}</span>
                      <span className="text-sm text-gray-500">
                        {classItem.subject} - Grade {classItem.grade} ({classItem.student_count} students)
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              This will be used for skill-based grading and will appear on the test PDF.
            </p>
          </div>

          {selectedClassId && (
            <div className="bg-green-50 p-4 rounded-lg">
              <h3 className="font-semibold text-green-900 mb-2">Generate Individual Student Tests</h3>
              <p className="text-sm text-green-800 mb-3">
                This will create separate test PDFs with each student's name pre-filled from the class roster.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      <Button 
        onClick={generateStudentTests} 
        disabled={isGeneratingStudentTests || !selectedClassId}
        className="w-full"
      >
        {isGeneratingStudentTests ? (
          <>
            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
            Generating Individual Tests...
          </>
        ) : (
          <>
            <FileText className="h-4 w-4 mr-2" />
            Generate Individual Student Tests
          </>
        )}
      </Button>
    </div>
  );

  const renderPreview = () => {
    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    
    return (
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
            {selectedClass && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm text-blue-600 font-medium">
                  Class: {selectedClass.name} ({selectedClass.student_count} students)
                </p>
                <p className="text-xs text-blue-500">
                  {selectedClass.subject} - Grade {selectedClass.grade}
                </p>
              </div>
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
          {selectedClass && selectedClass.student_count > 0 && (
            <Button 
              onClick={generateStudentTests} 
              disabled={isGeneratingStudentTests}
              className="flex-1"
            >
              {isGeneratingStudentTests ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Individual Student Tests
                </>
              )}
            </Button>
          )}
        </div>
      </div>
    );
  };

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
