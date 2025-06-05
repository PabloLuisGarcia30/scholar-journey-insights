
import { useState, useEffect } from "react";
import { ArrowLeft, Plus, BookOpen, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { getLinkedContentSkillsForClass, type ContentSkill, type ActiveClass } from "@/services/examService";

interface AISkillSelectionProps {
  selectedClassId: string;
  availableClasses: ActiveClass[];
  examId: string;
  onBack: () => void;
  onContinue: (selectedSkills: ContentSkill[], customSkills: string[]) => void;
}

interface CustomSkill {
  id: string;
  name: string;
  description: string;
}

export const AISkillSelection = ({ 
  selectedClassId, 
  availableClasses, 
  examId,
  onBack, 
  onContinue 
}: AISkillSelectionProps) => {
  const [contentSkills, setContentSkills] = useState<ContentSkill[]>([]);
  const [selectedSkillIds, setSelectedSkillIds] = useState<Set<string>>(new Set());
  const [customSkills, setCustomSkills] = useState<CustomSkill[]>([]);
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillDescription, setNewSkillDescription] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedClass = availableClasses.find(c => c.id === selectedClassId);

  useEffect(() => {
    const loadContentSkills = async () => {
      if (!selectedClassId) return;
      
      try {
        setLoading(true);
        const skills = await getLinkedContentSkillsForClass(selectedClassId);
        setContentSkills(skills);
        
        // Pre-select all skills by default
        setSelectedSkillIds(new Set(skills.map(skill => skill.id)));
      } catch (error) {
        console.error('Error loading content skills:', error);
        toast({
          title: "Error",
          description: 'Failed to load content skills for this class',
          variant: "destructive",
        });
      } finally {
        setLoading(false);
      }
    };

    loadContentSkills();
  }, [selectedClassId]);

  const handleSkillToggle = (skillId: string, checked: boolean) => {
    const newSelected = new Set(selectedSkillIds);
    if (checked) {
      newSelected.add(skillId);
    } else {
      newSelected.delete(skillId);
    }
    setSelectedSkillIds(newSelected);
  };

  const addCustomSkill = () => {
    if (!newSkillName.trim()) {
      toast({
        title: "Error",
        description: 'Please enter a skill name',
        variant: "destructive",
      });
      return;
    }

    const customSkill: CustomSkill = {
      id: `custom-${Date.now()}`,
      name: newSkillName.trim(),
      description: newSkillDescription.trim() || `Custom skill: ${newSkillName.trim()}`
    };

    setCustomSkills([...customSkills, customSkill]);
    setNewSkillName('');
    setNewSkillDescription('');

    toast({
      title: "Success",
      description: 'Custom skill added successfully',
    });
  };

  const removeCustomSkill = (skillId: string) => {
    setCustomSkills(customSkills.filter(skill => skill.id !== skillId));
  };

  const handleContinue = () => {
    const selectedSkills = contentSkills.filter(skill => selectedSkillIds.has(skill.id));
    const customSkillNames = customSkills.map(skill => skill.name);
    
    if (selectedSkills.length === 0 && customSkills.length === 0) {
      toast({
        title: "Error",
        description: 'Please select at least one skill or add a custom skill',
        variant: "destructive",
      });
      return;
    }

    onContinue(selectedSkills, customSkillNames);
  };

  // Group skills by topic for better organization
  const groupedSkills = contentSkills.reduce((acc, skill) => {
    if (!acc[skill.topic]) {
      acc[skill.topic] = [];
    }
    acc[skill.topic].push(skill);
    return acc;
  }, {} as Record<string, ContentSkill[]>);

  const topics = Object.keys(groupedSkills);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold text-gray-900">Loading Skills...</h2>
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="animate-pulse space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-16 bg-gray-200 rounded"></div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-blue-600" />
          Select Skills for AI Test Generation
        </h2>
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Class Selection
        </Button>
      </div>

      {examId && (
        <Card className="border-2 border-blue-200 bg-blue-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <span className="font-bold text-blue-800">Exam ID:</span>
              <span className="font-mono text-lg text-blue-900 bg-white px-3 py-1 rounded border">
                {examId}
              </span>
            </div>
            {selectedClass && (
              <p className="text-sm text-blue-700 mt-2">
                Creating AI test for: <strong>{selectedClass.name}</strong> ({selectedClass.subject} - Grade {selectedClass.grade})
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
        <div className="flex items-start gap-2">
          <Sparkles className="h-5 w-5 text-yellow-600 mt-0.5" />
          <div>
            <h3 className="font-semibold text-yellow-800">AI Test Generation</h3>
            <p className="text-sm text-yellow-700 mt-1">
              Select the content skills you want the AI to focus on when generating test questions. 
              The AI will create relevant questions that assess these specific skills.
            </p>
          </div>
        </div>
      </div>

      {contentSkills.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Content Skills Linked</h3>
            <p className="text-gray-600 mb-4">
              This class doesn't have any content skills linked yet. You can still add custom skills below.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                Content Skills for {selectedClass?.name}
              </CardTitle>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSkillIds(new Set(contentSkills.map(s => s.id)))}
                  disabled={selectedSkillIds.size === contentSkills.length}
                >
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => setSelectedSkillIds(new Set())}
                  disabled={selectedSkillIds.size === 0}
                >
                  Deselect All
                </Button>
              </div>
            </div>
            <p className="text-sm text-gray-600">
              {selectedSkillIds.size} of {contentSkills.length} skills selected
            </p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {topics.map((topic) => (
                <div key={topic}>
                  <h3 className="text-lg font-semibold text-gray-900 mb-3">{topic}</h3>
                  <div className="space-y-3">
                    {groupedSkills[topic].map((skill) => (
                      <div key={skill.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                        <Checkbox
                          checked={selectedSkillIds.has(skill.id)}
                          onCheckedChange={(checked) => handleSkillToggle(skill.id, !!checked)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <span className="font-medium text-gray-900">{skill.skill_name}</span>
                          <p className="text-sm text-gray-600 mt-1">{skill.skill_description}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {topic !== topics[topics.length - 1] && <Separator className="mt-6" />}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            Add Custom Skills
          </CardTitle>
          <p className="text-sm text-gray-600">
            Add additional topics or skills that you want the AI to include in the test
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4">
            <div>
              <Label htmlFor="skill-name">Skill Name</Label>
              <Input
                id="skill-name"
                value={newSkillName}
                onChange={(e) => setNewSkillName(e.target.value)}
                placeholder="e.g., Advanced Problem Solving"
              />
            </div>
            <div>
              <Label htmlFor="skill-description">Description (Optional)</Label>
              <Textarea
                id="skill-description"
                value={newSkillDescription}
                onChange={(e) => setNewSkillDescription(e.target.value)}
                placeholder="Describe what this skill covers..."
                rows={2}
              />
            </div>
            <Button onClick={addCustomSkill} variant="outline" className="w-fit">
              <Plus className="h-4 w-4 mr-2" />
              Add Custom Skill
            </Button>
          </div>

          {customSkills.length > 0 && (
            <div className="space-y-2">
              <Label>Custom Skills Added:</Label>
              {customSkills.map((skill) => (
                <div key={skill.id} className="flex items-center justify-between p-2 bg-green-50 rounded border">
                  <div>
                    <span className="font-medium text-green-800">{skill.name}</span>
                    {skill.description && (
                      <p className="text-sm text-green-600">{skill.description}</p>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCustomSkill(skill.id)}
                    className="text-red-600 hover:text-red-800"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Button 
        onClick={handleContinue} 
        className="w-full"
        disabled={selectedSkillIds.size === 0 && customSkills.length === 0}
      >
        Generate AI Test Questions
      </Button>
    </div>
  );
};
