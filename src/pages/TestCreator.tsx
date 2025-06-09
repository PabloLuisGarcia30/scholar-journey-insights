import { useState, useEffect } from "react";
import { ArrowLeft, FileText, RefreshCw, Printer, CheckCircle, Edit, Key, Download, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";
import { generateTestPDF, generateConsolidatedTestPDF, type Question, type TestData } from "@/utils/pdfGenerator";
import { TemplateSelection, type TestTemplate } from "@/components/TestCreator/TemplateSelection";
import { TestDetails } from "@/components/TestCreator/TestDetails";
import { QuestionEditor } from "@/components/TestCreator/QuestionEditor";
import { AISkillSelection } from "@/components/TestCreator/AISkillSelection";
import { saveExamToDatabase, getAllActiveClasses, type ExamData, type ActiveClass, type ContentSkill } from "@/services/examService";
import { generatePracticeTest, type GeneratePracticeTestRequest } from "@/services/practiceTestService";

interface PrintTestsDialogProps {
  selectedClass: ActiveClass;
  examId: string;
  testTitle: string;
  testDescription: string;
  timeLimit: number;
  questions: Question[];
  isPrintDialogOpen: boolean;
  setIsPrintDialogOpen: (open: boolean) => void;
  selectedStudentsForPrint: string[];
  isPrinting: boolean;
  onToggleStudent: (studentName: string) => void;
  onSelectAll: (studentNames: string[]) => void;
  onDeselectAll: () => void;
  onPrintTests: (studentNames: string[], pdfFormat: 'individual' | 'consolidated') => void;
}

interface DownloadDialogProps {
  selectedClass: ActiveClass;
  examId: string;
  testTitle: string;
  testDescription: string;
  timeLimit: number;
  questions: Question[];
  isDownloadDialogOpen: boolean;
  setIsDownloadDialogOpen: (open: boolean) => void;
  selectedStudentsForDownload: string[];
  isDownloading: boolean;
  onToggleStudentDownload: (studentName: string) => void;
  onSelectAllDownload: (studentNames: string[]) => void;
  onDeselectAllDownload: () => void;
  onDownloadPDF: (studentNames: string[]) => void;
}

const testTemplates: TestTemplate[] = [
  {
    id: 'ai-test',
    name: 'Create an AI crafted Super Test tailored to your Class',
    description: 'Let AI generate questions based on your class content skills and topics',
    defaultQuestions: []
  },
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
  const [currentStep, setCurrentStep] = useState<'template' | 'details' | 'questions' | 'answer-key' | 'class-input' | 'preview' | 'ai-class-selection' | 'ai-skill-selection' | 'ai-generating'>('template');
  const [examId, setExamId] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<ActiveClass[]>([]);
  const [isGeneratingStudentTests, setIsGeneratingStudentTests] = useState(false);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [selectedStudentsForPrint, setSelectedStudentsForPrint] = useState<string[]>([]);
  const [isPrinting, setIsPrinting] = useState(false);
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [pdfFormat, setPdfFormat] = useState<'individual' | 'consolidated'>('individual');
  const [isDownloadDialogOpen, setIsDownloadDialogOpen] = useState(false);
  const [selectedStudentsForDownload, setSelectedStudentsForDownload] = useState<string[]>([]);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [questionCount, setQuestionCount] = useState<number>(10);
  const [isGeneratingSingleQuestion, setIsGeneratingSingleQuestion] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classes = await getAllActiveClasses();
        setAvailableClasses(classes);
      } catch (error) {
        console.error('Error loading classes:', error);
        toast({
          title: "Error",
          description: 'Failed to load classes',
          variant: "destructive",
        });
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
      
      const newExamId = generateExamId();
      setExamId(newExamId);
      
      if (templateId === 'ai-test') {
        // For AI test, go to class selection first
        setCurrentStep('ai-class-selection');
      } else {
        // For regular templates, continue with normal flow
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

  const generateAIQuestions = async (selectedSkills: ContentSkill[], customSkills: string[]) => {
    setIsGeneratingQuestions(true);
    setCurrentStep('ai-generating');
    
    try {
      const selectedClass = availableClasses.find(c => c.id === selectedClassId);
      if (!selectedClass) {
        throw new Error('Selected class not found');
      }

      // Combine selected skills and custom skills
      const allSkills = [
        ...selectedSkills.map(skill => skill.skill_name),
        ...customSkills
      ];

      const request: GeneratePracticeTestRequest = {
        studentName: 'Practice Test', // Generic name for teacher preview
        className: selectedClass.name,
        skillName: allSkills.join(', '),
        grade: selectedClass.grade,
        subject: selectedClass.subject,
        questionCount: questionCount
      };

      console.log('Generating AI questions with request:', request);
      const practiceTestData = await generatePracticeTest(request);
      
      // Convert practice test questions to our Question format
      const convertedQuestions: Question[] = practiceTestData.questions.map((q, index) => ({
        id: `ai-q-${index}`,
        type: q.type,
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswer || '',
        points: q.points
      }));

      setQuestions(convertedQuestions);
      setTestTitle(practiceTestData.title);
      setTestDescription(practiceTestData.description);
      setTimeLimit(practiceTestData.estimatedTime);
      
      toast({
        title: "✅ Success!",
        description: `Generated ${convertedQuestions.length} AI questions for your test`,
      });
      
      // Go directly to answer key review
      setCurrentStep('answer-key');
      
    } catch (error) {
      console.error('Error generating AI questions:', error);
      toast({
        title: "❌ Error",
        description: 'Failed to generate AI questions. Please try again.',
        variant: "destructive",
      });
      // Go back to skill selection on error
      setCurrentStep('ai-skill-selection');
    } finally {
      setIsGeneratingQuestions(false);
    }
  };

  const generateSingleAIQuestion = async () => {
    setIsGeneratingSingleQuestion(true);
    
    try {
      const selectedClass = availableClasses.find(c => c.id === selectedClassId);
      if (!selectedClass) {
        throw new Error('Selected class not found');
      }

      const request: GeneratePracticeTestRequest = {
        studentName: 'Single Question',
        className: selectedClass.name,
        skillName: 'Generate one additional question',
        grade: selectedClass.grade,
        subject: selectedClass.subject,
        questionCount: 1
      };

      const practiceTestData = await generatePracticeTest(request);
      
      if (practiceTestData.questions && practiceTestData.questions.length > 0) {
        const newQuestion: Question = {
          id: `ai-q-${Date.now()}`,
          type: practiceTestData.questions[0].type,
          question: practiceTestData.questions[0].question,
          options: practiceTestData.questions[0].options,
          correctAnswer: practiceTestData.questions[0].correctAnswer || '',
          points: practiceTestData.questions[0].points
        };

        setQuestions(prev => [...prev, newQuestion]);
        
        toast({
          title: "✅ Success!",
          description: 'Added new AI-generated question',
        });
      }
      
    } catch (error) {
      console.error('Error generating single AI question:', error);
      toast({
        title: "❌ Error",
        description: 'Failed to generate AI question. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsGeneratingSingleQuestion(false);
    }
  };

  const addCustomQuestion = () => {
    const newQuestion: Question = {
      id: `custom-q-${Date.now()}`,
      type: 'multiple-choice',
      question: '',
      options: ['Option 1', 'Option 2', 'Option 3', 'Option 4'],
      correctAnswer: '',
      points: 1,
    };
    setQuestions(prev => [...prev, newQuestion]);
  };

  const deleteQuestionFromAnswerKey = (questionId: string) => {
    setQuestions(prev => prev.filter(q => q.id !== questionId));
  };

  const handleGenerateTest = () => {
    if (!testTitle.trim()) {
      toast({
        title: "Error",
        description: 'Please enter a test title',
        variant: "destructive",
      });
      return;
    }
    if (questions.length === 0) {
      toast({
        title: "Error",
        description: 'Please add at least one question',
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep('answer-key');
  };

  const handleAnswerKeyComplete = () => {
    const incompleteQuestions = questions.filter(q => !q.correctAnswer || q.correctAnswer === '');
    if (incompleteQuestions.length > 0) {
      toast({
        title: "Error",
        description: `Please provide correct answers for all questions. ${incompleteQuestions.length} question(s) missing answers.`,
        variant: "destructive",
      });
      return;
    }
    
    setCurrentStep('class-input');
  };

  const saveTestToDatabase = async (testData: ExamData, classId: string) => {
    try {
      console.log('Saving test data with answer key and exam ID:', testData);
      await saveExamToDatabase(testData, classId);
      toast({
        title: "✅ Success!",
        description: `Test and answer key saved successfully! Exam ID: ${testData.examId}`,
      });
    } catch (error) {
      console.error('Error saving test to database:', error);
      toast({
        title: "❌ Error",
        description: 'Failed to save test to database. Please try again.',
        variant: "destructive",
      });
      throw error;
    }
  };

  const finalizeTest = async () => {
    if (!selectedClassId.trim()) {
      toast({
        title: "⚠️ Missing Information",
        description: 'Please select a class',
        variant: "destructive",
      });
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
      toast({
        title: "🎉 Test Saved!",
        description: `Successfully saved with ID: ${examId}`,
      });
      setCurrentStep('preview');
    } catch (error) {
      return;
    }
  };

  const handlePrintTests = async (studentNames: string[], selectedPdfFormat: 'individual' | 'consolidated') => {
    if (studentNames.length === 0) {
      toast({
        title: "Error",
        description: 'Please select at least one student test to print',
        variant: "destructive",
      });
      return;
    }

    setIsPrinting(true);

    try {
      const testData: TestData = {
        examId,
        title: testTitle,
        description: testDescription,
        className: availableClasses.find(c => c.id === selectedClassId)?.name || 'Unknown Class',
        timeLimit,
        questions,
      };

      if (selectedPdfFormat === 'consolidated') {
        const { generateConsolidatedTestPDF } = await import('@/utils/pdfGenerator');
        generateConsolidatedTestPDF(testData, studentNames);
        
        setSuccessMessage(`Consolidated PDF has been downloaded with all ${studentNames.length} student tests in one document - just open and print!`);
      } else {
        const { generateStudentTestPDFs } = await import('@/utils/pdfGenerator');
        generateStudentTestPDFs(testData, studentNames);
        
        setSuccessMessage(`PDFs have successfully downloaded - just open the pdf and print them individually.`);
      }
      
      setShowSuccessDialog(true);
      setIsPrintDialogOpen(false);
    } catch (error) {
      console.error('Error generating tests for printing:', error);
      toast({
        title: "Error",
        description: 'Failed to generate tests for printing. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const toggleStudentSelection = (studentName: string) => {
    setSelectedStudentsForPrint(prev => 
      prev.includes(studentName) 
        ? prev.filter(name => name !== studentName)
        : [...prev, studentName]
    );
  };

  const selectAllStudents = (studentNames: string[]) => {
    setSelectedStudentsForPrint(studentNames);
  };

  const deselectAllStudents = () => {
    setSelectedStudentsForPrint([]);
  };

  const toggleStudentDownloadSelection = (studentName: string) => {
    setSelectedStudentsForDownload(prev => 
      prev.includes(studentName) 
        ? prev.filter(name => name !== studentName)
        : [...prev, studentName]
    );
  };

  const selectAllStudentsDownload = (studentNames: string[]) => {
    setSelectedStudentsForDownload(studentNames);
  };

  const deselectAllStudentsDownload = () => {
    setSelectedStudentsForDownload([]);
  };

  const handleDownloadPDF = async (studentNames: string[]) => {
    const selectedClass = availableClasses.find(c => c.id === selectedClassId);
    if (!selectedClass || studentNames.length === 0) {
      toast({
        title: "Error",
        description: 'Please select at least one student',
        variant: "destructive",
      });
      return;
    }

    setIsDownloading(true);

    try {
      const testData = {
        examId,
        title: testTitle,
        description: testDescription,
        className: selectedClass.name,
        timeLimit,
        questions,
      };

      const { generateConsolidatedTestPDF } = await import('@/utils/pdfGenerator');
      generateConsolidatedTestPDF(testData, studentNames);

      toast({
        title: "Success!",
        description: `Downloaded PDF test for ${studentNames.length} students. The PDF is ready to print.`,
      });
      
      setIsDownloadDialogOpen(false);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast({
        title: "Error",
        description: 'Failed to download test. Please try again.',
        variant: "destructive",
      });
    } finally {
      setIsDownloading(false);
    }
  };

  const renderTemplateSelection = () => (
    <TemplateSelection 
      templates={testTemplates}
      selectedTemplate={selectedTemplate}
      onTemplateSelect={handleTemplateSelect}
    />
  );

  const renderAIClassSelection = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Select Class for AI Test</h2>
        <Button variant="outline" onClick={() => setCurrentStep('template')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Templates
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
          <CardTitle>Choose Your Class</CardTitle>
          <p className="text-sm text-gray-600">
            Select the class for which you want to create an AI-generated test. This will determine the available content skills.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ai-class-select">Class Name</Label>
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
          </div>

          <div>
            <Label htmlFor="question-count">Number of Questions</Label>
            <Select value={questionCount.toString()} onValueChange={(value) => setQuestionCount(parseInt(value))}>
              <SelectTrigger>
                <SelectValue placeholder="Select number of questions" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="5">5 Questions</SelectItem>
                <SelectItem value="10">10 Questions</SelectItem>
                <SelectItem value="15">15 Questions</SelectItem>
                <SelectItem value="20">20 Questions</SelectItem>
                <SelectItem value="25">25 Questions</SelectItem>
                <SelectItem value="30">30 Questions</SelectItem>
                <SelectItem value="40">40 Questions</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 mt-1">
              Choose how many questions the AI should generate for your test.
            </p>
          </div>
        </CardContent>
      </Card>
      
      <Button 
        onClick={() => setCurrentStep('ai-skill-selection')} 
        disabled={!selectedClassId}
        className="w-full"
      >
        Continue to Skill Selection
      </Button>
    </div>
  );

  const renderAIGenerating = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Generating AI Questions</h2>
      </div>
      
      {examId && (
        <div className="bg-blue-50 p-3 rounded-lg">
          <span className="text-sm font-medium text-blue-800">Exam ID: </span>
          <span className="text-sm font-mono text-blue-900">{examId}</span>
        </div>
      )}
      
      <Card>
        <CardContent className="text-center py-12">
          <RefreshCw className="h-12 w-12 animate-spin mx-auto mb-4 text-blue-600" />
          <h3 className="text-lg font-semibold mb-2">Creating Your AI Test</h3>
          <p className="text-gray-600 mb-4">
            Our AI is generating personalized questions based on your selected skills and class content...
          </p>
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-blue-800">
              This usually takes 10-30 seconds. Please wait while we craft the perfect test for your students.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
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
          Answer Key Review
        </h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setCurrentStep(selectedTemplate === 'ai-test' ? 'ai-skill-selection' : 'questions')}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            {selectedTemplate === 'ai-test' ? 'Back to Skills' : 'Back to Questions'}
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
          {selectedTemplate === 'ai-test' 
            ? 'Review and adjust the AI-generated answers if needed. The AI has already provided correct answers, but you can modify them if necessary. You can also add or remove questions.'
            : 'Provide correct answers for all questions. This answer key will be saved securely and used by the AI grading system to automatically score student responses.'
          }
        </p>
      </div>

      {selectedTemplate === 'ai-test' && (
        <div className="flex gap-2 mb-4">
          <Button 
            onClick={generateSingleAIQuestion} 
            variant="outline" 
            size="sm"
            disabled={isGeneratingSingleQuestion}
          >
            {isGeneratingSingleQuestion ? (
              <>
                <RefreshCw className="h-4 w-4 mr-1 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Plus className="h-4 w-4 mr-1" />
                Add AI Generated Question
              </>
            )}
          </Button>
          <Button 
            onClick={addCustomQuestion} 
            variant="outline" 
            size="sm"
          >
            <Plus className="h-4 w-4 mr-1" />
            Add Custom Question
          </Button>
        </div>
      )}
      
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500 capitalize">{question.type.replace('-', ' ')}</span>
                  <span className="text-sm text-gray-600">({question.points} pts)</span>
                  {selectedTemplate === 'ai-test' && question.id.startsWith('ai-q-') && (
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded">AI Generated</span>
                  )}
                  {selectedTemplate === 'ai-test' && question.id.startsWith('custom-q-') && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">Custom</span>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deleteQuestionFromAnswerKey(question.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="bg-gray-50 p-3 rounded">
                {selectedTemplate === 'ai-test' && question.id.startsWith('custom-q-') ? (
                  <Textarea
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, 'question', e.target.value)}
                    placeholder="Enter your question"
                    className="bg-white"
                  />
                ) : (
                  <p className="font-medium text-gray-900">{question.question}</p>
                )}
              </div>
              
              {question.type === 'multiple-choice' && question.options && (
                <div>
                  <Label>Answer Options {selectedTemplate === 'ai-test' && question.id.startsWith('custom-q-') && '(Click to edit)'}</Label>
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
                        {selectedTemplate === 'ai-test' && question.id.startsWith('custom-q-') ? (
                          <Input
                            value={option}
                            onChange={(e) => updateQuestionOption(question.id, optionIndex, e.target.value)}
                            placeholder={`Option ${optionIndex + 1}`}
                            className="flex-1"
                          />
                        ) : (
                          <span className="text-sm flex-1">{String.fromCharCode(65 + optionIndex)}) {option}</span>
                        )}
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
              
              {selectedTemplate === 'ai-test' && question.id.startsWith('custom-q-') && (
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

      {questions.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500">No questions available. Please go back and generate questions.</p>
          </CardContent>
        </Card>
      )}
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
          <p className="text-sm text-blue-600 font-medium mt-2">
            Please select the corresponding class with care. It helps us create better students together!
          </p>
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
        </CardContent>
      </Card>
      
      <Button 
        onClick={finalizeTest} 
        disabled={!selectedClassId}
        className="w-full"
      >
        <FileText className="h-4 w-4 mr-2" />
        Save Test & Continue to Preview
      </Button>
    </div>
  );

  const DownloadTestsDialog = ({ 
    selectedClass, 
    examId,
    testTitle,
    testDescription,
    timeLimit,
    questions,
    isDownloadDialogOpen,
    setIsDownloadDialogOpen,
    selectedStudentsForDownload,
    isDownloading,
    onToggleStudentDownload,
    onSelectAllDownload,
    onDeselectAllDownload,
    onDownloadPDF
  }: DownloadDialogProps) => {
    const [studentNames, setStudentNames] = useState<string[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);

    useEffect(() => {
      const loadStudentNames = async () => {
        if (isDownloadDialogOpen && selectedClass.students && selectedClass.students.length > 0) {
          setIsLoadingStudents(true);
          try {
            const { getAllActiveStudents } = await import('@/services/examService');
            const allStudents = await getAllActiveStudents();
            
            const classStudentNames = allStudents
              .filter(student => selectedClass.students.includes(student.id))
              .map(student => student.name)
              .sort();
            
            setStudentNames(classStudentNames);
            
            if (selectedStudentsForDownload.length === 0) {
              onSelectAllDownload(classStudentNames);
            }
          } catch (error) {
            console.error('Error loading student names:', error);
            toast({
              title: "Error",
              description: 'Failed to load student names',
              variant: "destructive",
            });
          } finally {
            setIsLoadingStudents(false);
          }
        }
      };

      loadStudentNames();
    }, [isDownloadDialogOpen, selectedClass.students]);

    return (
      <Dialog open={isDownloadDialogOpen} onOpenChange={setIsDownloadDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Download PDF to Print Later
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Download className="h-5 w-5" />
              Download Student Tests
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{testTitle}</h3>
              <p className="text-sm text-blue-800">Exam ID: {examId}</p>
              <p className="text-sm text-blue-700">
                Class: {selectedClass.name} ({selectedClass.student_count} students)
              </p>
            </div>

            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading students...</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Select Students ({selectedStudentsForDownload.length}/{studentNames.length})</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onSelectAllDownload(studentNames)}
                      disabled={selectedStudentsForDownload.length === studentNames.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onDeselectAllDownload}
                      disabled={selectedStudentsForDownload.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {studentNames.map((studentName) => (
                    <div key={studentName} className="flex items-center space-x-2">
                      <Checkbox
                        id={`download-student-${studentName}`}
                        checked={selectedStudentsForDownload.includes(studentName)}
                        onCheckedChange={() => onToggleStudentDownload(studentName)}
                      />
                      <Label 
                        htmlFor={`download-student-${studentName}`}
                        className="text-sm cursor-pointer"
                      >
                        {studentName}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDownloadDialogOpen(false)}
                    disabled={isDownloading}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={() => onDownloadPDF(selectedStudentsForDownload)}
                    disabled={isDownloading || selectedStudentsForDownload.length === 0}
                  >
                    {isDownloading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Downloading...
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4 mr-2" />
                        Download ({selectedStudentsForDownload.length} students)
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

  const PrintTestsDialog = ({ 
    selectedClass, 
    examId,
    testTitle,
    testDescription,
    timeLimit,
    questions,
    isPrintDialogOpen,
    setIsPrintDialogOpen,
    selectedStudentsForPrint,
    isPrinting,
    onToggleStudent,
    onSelectAll,
    onDeselectAll,
    onPrintTests
  }: PrintTestsDialogProps) => {
    const [studentNames, setStudentNames] = useState<string[]>([]);
    const [isLoadingStudents, setIsLoadingStudents] = useState(false);
    const [selectedFormat, setSelectedFormat] = useState<'individual' | 'consolidated'>('consolidated');

    useEffect(() => {
      const loadStudentNames = async () => {
        if (isPrintDialogOpen && selectedClass.students && selectedClass.students.length > 0) {
          setIsLoadingStudents(true);
          try {
            const { getAllActiveStudents } = await import('@/services/examService');
            const allStudents = await getAllActiveStudents();
            
            const classStudentNames = allStudents
              .filter(student => selectedClass.students.includes(student.id))
              .map(student => student.name)
              .sort();
            
            setStudentNames(classStudentNames);
            
            if (selectedStudentsForPrint.length === 0) {
              onSelectAll(classStudentNames);
            }
          } catch (error) {
            console.error('Error loading student names:', error);
            toast({
              title: "Error",
              description: 'Failed to load student names',
              variant: "destructive",
            });
          } finally {
            setIsLoadingStudents(false);
          }
        }
      };

      loadStudentNames();
    }, [isPrintDialogOpen, selectedClass.students]);

    const handleDirectPrint = async () => {
      if (selectedStudentsForPrint.length === 0) {
        toast({
          title: "Error",
          description: 'Please select at least one student test to print',
          variant: "destructive",
        });
        return;
      }

      try {
        const { printTest, printConsolidatedTests } = await import('@/services/printService');
        
        const testData = {
          examId,
          title: testTitle,
          description: testDescription,
          className: selectedClass.name,
          timeLimit,
          questions,
        };

        if (selectedFormat === 'consolidated') {
          printConsolidatedTests(testData, selectedStudentsForPrint);
          toast({
            title: "Success!",
            description: 'Opening print dialog for consolidated test...',
          });
        } else {
          // For individual tests, print them one by one
          for (const studentName of selectedStudentsForPrint) {
            const studentTestData = {
              ...testData,
              studentName,
            };
            printTest(studentTestData);
            // Small delay between prints to prevent browser issues
            await new Promise(resolve => setTimeout(resolve, 500));
          }
          toast({
            title: "Success!",
            description: `Opening print dialogs for ${selectedStudentsForPrint.length} individual tests...`,
          });
        }
        
        setIsPrintDialogOpen(false);
      } catch (error) {
        console.error('Error printing tests:', error);
        toast({
          title: "Error",
          description: 'Failed to print tests. Please try again.',
          variant: "destructive",
        });
      }
    };

    return (
      <Dialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <DialogTrigger asChild>
          <Button className="flex-1">
            <Printer className="h-4 w-4 mr-2" />
            Print Tests Now
          </Button>
        </DialogTrigger>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Printer className="h-5 w-5" />
              Print Student Tests
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-semibold text-blue-900 mb-2">{testTitle}</h3>
              <p className="text-sm text-blue-800">Exam ID: {examId}</p>
              <p className="text-sm text-blue-700">
                Class: {selectedClass.name} ({selectedClass.student_count} students)
              </p>
            </div>

            <div className="space-y-3">
              <Label className="text-base font-semibold">Format</Label>
              <RadioGroup value={selectedFormat} onValueChange={(value: 'individual' | 'consolidated') => setSelectedFormat(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="consolidated" id="consolidated" />
                  <Label htmlFor="consolidated" className="cursor-pointer">
                    <div>
                      <span className="font-medium">Consolidated</span>
                      <p className="text-sm text-gray-500">
                        All student tests in one print job (easier to print)
                      </p>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="individual" id="individual" />
                  <Label htmlFor="individual" className="cursor-pointer">
                    <div>
                      <span className="font-medium">Individual Tests</span>
                      <p className="text-sm text-gray-500">
                        Separate print dialog for each student
                      </p>
                    </div>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {isLoadingStudents ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading students...</span>
              </div>
            ) : (
              <>
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Select Students ({selectedStudentsForPrint.length}/{studentNames.length})</h4>
                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => onSelectAll(studentNames)}
                      disabled={selectedStudentsForPrint.length === studentNames.length}
                    >
                      Select All
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={onDeselectAll}
                      disabled={selectedStudentsForPrint.length === 0}
                    >
                      Deselect All
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 max-h-60 overflow-y-auto border rounded-lg p-4">
                  {studentNames.map((studentName) => (
                    <div key={studentName} className="flex items-center space-x-2">
                      <Checkbox
                        id={`student-${studentName}`}
                        checked={selectedStudentsForPrint.includes(studentName)}
                        onCheckedChange={() => onToggleStudent(studentName)}
                      />
                      <Label 
                        htmlFor={`student-${studentName}`}
                        className="text-sm cursor-pointer"
                      >
                        {studentName}
                      </Label>
                    </div>
                  ))}
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button 
                    variant="outline" 
                    onClick={() => setIsPrintDialogOpen(false)}
                    disabled={isPrinting}
                  >
                    Cancel
                  </Button>
                  <Button 
                    onClick={handleDirectPrint}
                    disabled={isPrinting || selectedStudentsForPrint.length === 0}
                  >
                    {isPrinting ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Printer className="h-4 w-4 mr-2" />
                        Print Now
                        {selectedFormat === 'consolidated' ? ' Consolidated' : ` ${selectedStudentsForPrint.length}`}
                      </>
                    )}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>
    );
  };

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
            <>
              <PrintTestsDialog 
                selectedClass={selectedClass}
                examId={examId}
                testTitle={testTitle}
                testDescription={testDescription}
                timeLimit={timeLimit}
                questions={questions}
                isPrintDialogOpen={isPrintDialogOpen}
                setIsPrintDialogOpen={setIsPrintDialogOpen}
                selectedStudentsForPrint={selectedStudentsForPrint}
                isPrinting={isPrinting}
                onToggleStudent={toggleStudentSelection}
                onSelectAll={selectAllStudents}
                onDeselectAll={deselectAllStudents}
                onPrintTests={handlePrintTests}
              />
              <DownloadTestsDialog
                selectedClass={selectedClass}
                examId={examId}
                testTitle={testTitle}
                testDescription={testDescription}
                timeLimit={timeLimit}
                questions={questions}
                isDownloadDialogOpen={isDownloadDialogOpen}
                setIsDownloadDialogOpen={setIsDownloadDialogOpen}
                selectedStudentsForDownload={selectedStudentsForDownload}
                isDownloading={isDownloading}
                onToggleStudentDownload={toggleStudentDownloadSelection}
                onSelectAllDownload={selectAllStudentsDownload}
                onDeselectAllDownload={deselectAllStudentsDownload}
                onDownloadPDF={handleDownloadPDF}
              />
            </>
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
        {currentStep === 'ai-class-selection' && renderAIClassSelection()}
        {currentStep === 'ai-skill-selection' && <AISkillSelection 
          selectedClassId={selectedClassId}
          availableClasses={availableClasses}
          examId={examId}
          onBack={() => setCurrentStep('ai-class-selection')}
          onContinue={generateAIQuestions}
        />}
        {currentStep === 'ai-generating' && renderAIGenerating()}
        {currentStep === 'details' && renderTestDetails()}
        {currentStep === 'questions' && renderQuestionEditor()}
        {currentStep === 'answer-key' && renderAnswerKey()}
        {currentStep === 'class-input' && renderClassInput()}
        {currentStep === 'preview' && renderPreview()}

        <Dialog open={showSuccessDialog} onOpenChange={setShowSuccessDialog}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-green-600">
                <CheckCircle className="h-6 w-6" />
                Tests Generated Successfully!
              </DialogTitle>
            </DialogHeader>
            <div className="py-4">
              <p className="text-gray-700">{successMessage}</p>
            </div>
            <div className="flex justify-end">
              <Button onClick={() => setShowSuccessDialog(false)}>
                Got it!
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default TestCreator;
