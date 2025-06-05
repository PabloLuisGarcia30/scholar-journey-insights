
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Link, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import {
  getContentSkillsBySubjectAndGrade,
  getLinkedContentSkillsForClass,
  linkClassToContentSkills,
  autoLinkMathClassToGrade10Skills,
  type ContentSkill,
  type ActiveClass
} from "@/services/examService";

interface ClassContentSkillsProps {
  activeClass: ActiveClass;
}

export function ClassContentSkills({ activeClass }: ClassContentSkillsProps) {
  const [availableSkills, setAvailableSkills] = useState<ContentSkill[]>([]);
  const [linkedSkills, setLinkedSkills] = useState<ContentSkill[]>([]);
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadSkills();
    // Auto-link Math Studies 10 class on first load
    if (activeClass.name === 'Math Studies 10' && activeClass.subject === 'Mathematics' && activeClass.grade === 'Grade 10') {
      autoLinkMathClass();
    }
  }, [activeClass]);

  const loadSkills = async () => {
    try {
      setLoading(true);
      const [available, linked] = await Promise.all([
        getContentSkillsBySubjectAndGrade(activeClass.subject, activeClass.grade),
        getLinkedContentSkillsForClass(activeClass.id)
      ]);
      
      setAvailableSkills(available);
      setLinkedSkills(linked);
      setSelectedSkills(new Set(linked.map(skill => skill.id)));
    } catch (error) {
      console.error('Error loading skills:', error);
      toast.error('Failed to load content skills');
    } finally {
      setLoading(false);
    }
  };

  const autoLinkMathClass = async () => {
    try {
      await autoLinkMathClassToGrade10Skills();
      await loadSkills(); // Refresh the data
      toast.success('Math Studies 10 class has been automatically linked to Grade 10 Math skills!');
    } catch (error) {
      console.error('Error auto-linking math class:', error);
      // Don't show error toast for auto-link as it's background operation
    }
  };

  const handleSkillToggle = (skillId: string, checked: boolean) => {
    const newSelected = new Set(selectedSkills);
    if (checked) {
      newSelected.add(skillId);
    } else {
      newSelected.delete(skillId);
    }
    setSelectedSkills(newSelected);
  };

  const handleSaveChanges = async () => {
    try {
      setSaving(true);
      await linkClassToContentSkills(activeClass.id, Array.from(selectedSkills));
      await loadSkills(); // Refresh to show updated links
      toast.success('Content skills updated successfully!');
    } catch (error) {
      console.error('Error saving changes:', error);
      toast.error('Failed to update content skills');
    } finally {
      setSaving(false);
    }
  };

  const groupedSkills = availableSkills.reduce((acc, skill) => {
    if (!acc[skill.topic]) {
      acc[skill.topic] = [];
    }
    acc[skill.topic].push(skill);
    return acc;
  }, {} as Record<string, ContentSkill[]>);

  const topics = Object.keys(groupedSkills);
  const hasChanges = selectedSkills.size !== linkedSkills.length || 
    !linkedSkills.every(skill => selectedSkills.has(skill.id));

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Content-Specific Skills
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Content-Specific Skills for {activeClass.subject} {activeClass.grade}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {selectedSkills.size} of {availableSkills.length} selected
            </Badge>
            {hasChanges && (
              <Button onClick={handleSaveChanges} disabled={saving} size="sm">
                <Link className="h-4 w-4 mr-2" />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {availableSkills.length === 0 ? (
          <div className="text-center py-8">
            <BookOpen className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No content skills available</h3>
            <p className="text-gray-600">
              No content-specific skills are defined for {activeClass.subject} {activeClass.grade}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {topics.map((topic) => (
              <div key={topic}>
                <h3 className="text-lg font-semibold text-gray-900 mb-3">{topic}</h3>
                <div className="space-y-3">
                  {groupedSkills[topic].map((skill) => (
                    <div key={skill.id} className="flex items-start gap-3 p-3 rounded-lg border border-gray-100">
                      <Checkbox
                        checked={selectedSkills.has(skill.id)}
                        onCheckedChange={(checked) => handleSkillToggle(skill.id, !!checked)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-gray-900">{skill.skill_name}</span>
                          {linkedSkills.some(linked => linked.id === skill.id) && (
                            <CheckCircle className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{skill.skill_description}</p>
                      </div>
                    </div>
                  ))}
                </div>
                {topic !== topics[topics.length - 1] && <Separator className="mt-6" />}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
