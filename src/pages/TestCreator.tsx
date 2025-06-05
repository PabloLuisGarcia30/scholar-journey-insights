import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, FileText, Sparkles, Users, Key, Download, Save } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { generatePDF, type Question } from '../utils/pdfGenerator';
import { saveExamToDatabase, getActiveClasses, type ActiveClass, type ContentSkill } from '../services/examService';
import { TemplateSelection, type TestTemplate } from '../components/TestCreator/TemplateSelection';
import { TestDetails } from '../components/TestCreator/TestDetails';
import { QuestionEditor } from '../components/TestCreator/QuestionEditor';
import { AISkillSelection } from '../components/TestCreator/AISkillSelection';
import { ClassSelection } from '../components/TestCreator/ClassSelection';
import { AIGenerationSettings } from '../components/TestCreator/AIGenerationSettings';
import { AnswerKeyEditor } from '../components/TestCreator/AnswerKeyEditor';
import { TestPreview } from '../components/TestCreator/TestPreview';

type Step = 'template' | 'details' | 'questions' | 'answer-key' | 'preview' | 'class-selection' | 'ai-skills' | 'ai-generation';

const testTemplates: TestTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Test',
    description: 'Start with a blank test and add your own questions',
    defaultQuestions: []
  },
  {
    id: 'ai-generated',
    name: 'AI Generated Test',
    description: 'Let AI create questions based on your content skills',
    defaultQuestions: []
  },
  {
    id: 'math-quiz',
    name: 'Math Quiz',
    description: 'Basic math problems for elementary students',
    defaultQuestions: [
      { question: 'What is 2 + 2?', type: 'multiple-choice', options: ['3', '4', '5', '6'], correctAnswer: '4', points: 1 },
      { question: 'What is 5 × 3?', type: 'multiple-choice', options: ['10', '15', '20', '25'], correctAnswer: '15', points: 1 }
    ]
  },
  {
    id: 'science-test',
    name: 'Science Test',
    description: 'General science questions for middle school',
    defaultQuestions: [
      { question: 'What is the chemical symbol for water?', type: 'short-answer', correctAnswer: 'H2O', points: 2 },
      { question: 'The Earth revolves around the Sun.', type: 'true-false', correctAnswer: 'true', points: 1 }
    ]
  }
];

export default function TestCreator() {
  const [currentStep, setCurrentStep] = useState<Step>('template');
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [testTitle, setTestTitle] = useState('');
  const [testDescription, setTestDescription] = useState('');
  const [timeLimit, setTimeLimit] = useState(60);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [examId, setExamId] = useState<string>('');
  const [availableClasses, setAvailableClasses] = useState<ActiveClass[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('');
  const [selectedSkills, setSelectedSkills] = useState<ContentSkill[]>([]);
  const [customSkills, setCustomSkills] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const loadClasses = async () => {
      try {
        const classes = await getActiveClasses();
        setAvailableClasses(classes);
      } catch (error) {
        console.error('Error loading classes:', error);
        toast({
          title: "Error",
          description: 'Failed to load available classes',
          variant: "destructive",
        });
      }
    };
    loadClasses();
  }, []);

  const generateExamId = () => {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `EXAM_${timestamp}_${random}`.toUpperCase();
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = testTemplates.find(t => t.id === templateId);
    
    if (template) {
      if (templateId === 'ai-generated') {
        const newExamId = generateExamId();
        setExamId(newExamId);
        setCurrentStep('class-selection');
      } else {
        const newExamId = generateExamId();
        setExamId(newExamId);
        setQuestions(template.defaultQuestions.map((q, index) => ({
          ...q,
          id: `q_${index + 1}_${Date.now()}`
        })) as Question[]);
        setCurrentStep('details');
      }
    }
  };

  const handleClassContinue = () => {
    if (selectedClassId) {
      setCurrentStep('ai-skills');
    }
  };

  const handleSkillsContinue = (skills: ContentSkill[], customSkillList: string[]) => {
    setSelectedSkills(skills);
    setCustomSkills(customSkillList);
    setCurrentStep('ai-generation');
  };

  const handleAIGenerate = async (settings: {
    numQuestions: number;
    difficulty: string;
    questionTypes: string[];
    focusAreas: string;
  }) => {
    try {
      toast({
        title: "Generating Questions",
        description: `Creating ${settings.numQuestions} AI-generated questions...`,
      });

      // Simulate AI generation for now
      const generatedQuestions: Question[] = [];
      for (let i = 0; i < settings.numQuestions; i++) {
        const questionType = settings.questionTypes[i % settings.questionTypes.length] as Question['type'];
        const baseQuestion: Partial<Question> = {
          id: `ai_q_${i + 1}_${Date.now()}`,
          question: `AI Generated ${questionType} question ${i + 1}`,
          type: questionType,
          points: 1,
          correctAnswer: '',
        };

        if (questionType === 'multiple-choice') {
          baseQuestion.options = ['Option A', 'Option B', 'Option C', 'Option D'];
          baseQuestion.correctAnswer = 'Option A';
        } else if (questionType === 'true-false') {
          baseQuestion.correctAnswer = 'true';
        }

        generatedQuestions.push(baseQuestion as Question);
      }

      setQuestions(generatedQuestions);
      setCurrentStep('questions');
      
      toast({
        title: "Success",
        description: `Generated ${settings.numQuestions} questions successfully!`,
      });
    } catch (error) {
      console.error('Error generating AI questions:', error);
      toast({
        title: "Error",
        description: 'Failed to generate AI questions. Please try again.',
        variant: "destructive",
      });
    }
  };

  const handleAddQuestion = (type: Question['type']) => {
    const newQuestion: Question = {
      id: `q_${questions.length + 1}_${Date.now()}`,
      question: '',
      type,
      points: 1,
      correctAnswer: type === 'true-false' ? 'true' : '',
      ...(type === 'multiple-choice' && { options: ['', '', '', ''] })
    };
    setQuestions([...questions, newQuestion]);
  };

  const handleUpdateQuestion = (questionId: string, field: keyof Question, value: any) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { ...q, [field]: value } : q
    ));
  };

  const handleUpdateQuestionOption = (questionId: string, optionIndex: number, value: string) => {
    setQuestions(questions.map(q => {
      if (q.id === questionId && q.options) {
        const newOptions = [...q.options];
        newOptions[optionIndex] = value;
        return { ...q, options: newOptions };
      }
      return q;
    }));
  };

  const handleDeleteQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
  };

  const handleUpdateAnswer = (questionId: string, answer: string, explanation?: string) => {
    setQuestions(questions.map(q => 
      q.id === questionId ? { 
        ...q, 
        correctAnswer: answer,
        ...(explanation !== undefined && { explanation })
      } : q
    ));
  };

  const handleDownloadPDF = () => {
    generatePDF({
      title: testTitle || 'Test',
      description: testDescription,
      timeLimit,
      questions,
      examId
    });
  };

  const handleSaveTest = async () => {
    if (!testTitle.trim()) {
      toast({
        title: "Error",
        description: 'Please enter a test title before saving.',
        variant: "destructive",
      });
      return;
    }

    if (questions.length === 0) {
      toast({
        title: "Error",
        description: 'Please add at least one question before saving.',
        variant: "destructive",
      });
      return;
    }

    setIsSaving(true);
    try {
      await saveExamToDatabase({
        examId,
        title: testTitle,
        description: testDescription,
        timeLimit,
        questions,
        classId: selectedClassId || null
      });

      toast({
        title: "Success",
        description: 'Test saved successfully!',
      });
    } catch (error) {
      console.error('Error saving test:', error);
      toast({
        title: "Error",
        description: 'Failed to save test to database',
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    switch (currentStep) {
      case 'details':
        setCurrentStep('template');
        break;
      case 'questions':
        if (selectedTemplate === 'ai-generated') {
          setCurrentStep('ai-generation');
        } else {
          setCurrentStep('details');
        }
        break;
      case 'answer-key':
        setCurrentStep('questions');
        break;
      case 'preview':
        setCurrentStep('answer-key');
        break;
      case 'class-selection':
        setCurrentStep('template');
        break;
      case 'ai-skills':
        setCurrentStep('class-selection');
        break;
      case 'ai-generation':
        setCurrentStep('ai-skills');
        break;
    }
  };

  const handleContinue = () => {
    switch (currentStep) {
      case 'details':
        setCurrentStep('questions');
        break;
      case 'questions':
        setCurrentStep('answer-key');
        break;
      case 'answer-key':
        setCurrentStep('preview');
        break;
    }
  };

  // Render based on current step
  if (currentStep === 'template') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <Button variant="outline" onClick={() => window.history.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
          </div>
          <TemplateSelection
            templates={testTemplates}
            selectedTemplate={selectedTemplate}
            onTemplateSelect={handleTemplateSelect}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'class-selection') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <ClassSelection
            examId={examId}
            availableClasses={availableClasses}
            selectedClassId={selectedClassId}
            onClassSelect={setSelectedClassId}
            onBack={handleBack}
            onContinue={handleClassContinue}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'ai-skills') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AISkillSelection
            selectedClassId={selectedClassId}
            availableClasses={availableClasses}
            examId={examId}
            onBack={handleBack}
            onContinue={handleSkillsContinue}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'ai-generation') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AIGenerationSettings
            examId={examId}
            selectedSkills={selectedSkills}
            customSkills={customSkills}
            testTitle={testTitle}
            testDescription={testDescription}
            timeLimit={timeLimit}
            onTestTitleChange={setTestTitle}
            onTestDescriptionChange={setTestDescription}
            onTimeLimitChange={setTimeLimit}
            onBack={handleBack}
            onGenerate={handleAIGenerate}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'details') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <TestDetails
            examId={examId}
            testTitle={testTitle}
            testDescription={testDescription}
            timeLimit={timeLimit}
            onTestTitleChange={setTestTitle}
            onTestDescriptionChange={setTestDescription}
            onTimeLimitChange={setTimeLimit}
            onBack={handleBack}
            onContinue={handleContinue}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'questions') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <QuestionEditor
            examId={examId}
            questions={questions}
            onAddQuestion={handleAddQuestion}
            onUpdateQuestion={handleUpdateQuestion}
            onUpdateQuestionOption={handleUpdateQuestionOption}
            onDeleteQuestion={handleDeleteQuestion}
            onBack={handleBack}
            onContinue={handleContinue}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'answer-key') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <AnswerKeyEditor
            examId={examId}
            questions={questions}
            onUpdateAnswer={handleUpdateAnswer}
            onBack={handleBack}
            onContinue={handleContinue}
          />
        </div>
      </div>
    );
  }

  if (currentStep === 'preview') {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <TestPreview
            examId={examId}
            testTitle={testTitle}
            testDescription={testDescription}
            timeLimit={timeLimit}
            questions={questions}
            onBack={handleBack}
            onSave={handleSaveTest}
            onDownload={handleDownloadPDF}
            isSaving={isSaving}
          />
        </div>
      </div>
    );
  }

  return null;
}
