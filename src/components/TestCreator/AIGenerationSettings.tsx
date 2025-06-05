
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Sparkles } from "lucide-react";
import type { ContentSkill } from "@/services/examService";

interface AIGenerationSettingsProps {
  examId: string;
  selectedSkills: ContentSkill[];
  customSkills: string[];
  testTitle: string;
  testDescription: string;
  timeLimit: number;
  onTestTitleChange: (title: string) => void;
  onTestDescriptionChange: (description: string) => void;
  onTimeLimitChange: (timeLimit: number) => void;
  onBack: () => void;
  onGenerate: (settings: {
    numQuestions: number;
    difficulty: string;
    questionTypes: string[];
    focusAreas: string;
  }) => void;
}

export const AIGenerationSettings = ({
  examId,
  selectedSkills,
  customSkills,
  testTitle,
  testDescription,
  timeLimit,
  onTestTitleChange,
  onTestDescriptionChange,
  onTimeLimitChange,
  onBack,
  onGenerate
}: AIGenerationSettingsProps) => {
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedQuestionTypes, setSelectedQuestionTypes] = useState<string[]>(['multiple-choice']);
  const [focusAreas, setFocusAreas] = useState('');

  const questionTypes = [
    { value: 'multiple-choice', label: 'Multiple Choice' },
    { value: 'true-false', label: 'True/False' },
    { value: 'short-answer', label: 'Short Answer' },
    { value: 'essay', label: 'Essay' }
  ];

  const handleQuestionTypeToggle = (type: string) => {
    setSelectedQuestionTypes(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const handleGenerate = () => {
    onGenerate({
      numQuestions,
      difficulty,
      questionTypes: selectedQuestionTypes,
      focusAreas
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          AI Test Generation Settings
        </h2>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Skills
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
          <CardTitle>Test Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="test-title">Test Title</Label>
            <Input
              id="test-title"
              value={testTitle}
              onChange={(e) => onTestTitleChange(e.target.value)}
              placeholder="Enter test title"
            />
          </div>
          
          <div>
            <Label htmlFor="test-description">Description</Label>
            <Textarea
              id="test-description"
              value={testDescription}
              onChange={(e) => onTestDescriptionChange(e.target.value)}
              placeholder="Enter test description"
            />
          </div>
          
          <div>
            <Label htmlFor="time-limit">Time Limit (minutes)</Label>
            <Input
              id="time-limit"
              type="number"
              value={timeLimit}
              onChange={(e) => onTimeLimitChange(parseInt(e.target.value) || 60)}
              min="1"
              max="300"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Selected Skills</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {selectedSkills.map((skill) => (
              <div key={skill.id} className="p-2 bg-blue-50 rounded border">
                <span className="font-medium text-blue-800">{skill.skill_name}</span>
                <p className="text-sm text-blue-600">{skill.skill_description}</p>
              </div>
            ))}
            {customSkills.map((skill, index) => (
              <div key={index} className="p-2 bg-green-50 rounded border">
                <span className="font-medium text-green-800">{skill}</span>
                <p className="text-sm text-green-600">Custom skill</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Generation Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="num-questions">Number of Questions</Label>
            <Input
              id="num-questions"
              type="number"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value) || 10)}
              min="1"
              max="50"
            />
          </div>

          <div>
            <Label htmlFor="difficulty">Difficulty Level</Label>
            <Select value={difficulty} onValueChange={setDifficulty}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="easy">Easy</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="hard">Hard</SelectItem>
                <SelectItem value="mixed">Mixed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Question Types</Label>
            <div className="space-y-2">
              {questionTypes.map((type) => (
                <div key={type.value} className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    id={type.value}
                    checked={selectedQuestionTypes.includes(type.value)}
                    onChange={() => handleQuestionTypeToggle(type.value)}
                    className="rounded"
                  />
                  <Label htmlFor={type.value}>{type.label}</Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label htmlFor="focus-areas">Additional Focus Areas (Optional)</Label>
            <Textarea
              id="focus-areas"
              value={focusAreas}
              onChange={(e) => setFocusAreas(e.target.value)}
              placeholder="Describe any specific topics or areas you want the AI to focus on..."
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      <Button 
        onClick={handleGenerate} 
        className="w-full"
        disabled={selectedQuestionTypes.length === 0}
      >
        Generate AI Test Questions
      </Button>
    </div>
  );
};
