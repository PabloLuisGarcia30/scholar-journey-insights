
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

interface StudentSkillSelectorProps {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  onSave: (studentId: string, selectedSkill: { skill_name: string; score: number } | null) => void;
  onCancel: () => void;
  currentSelectedSkill?: { skill_name: string; score: number } | null;
}

export function StudentSkillSelector({ 
  studentId, 
  studentName, 
  classId, 
  className, 
  onSave, 
  onCancel,
  currentSelectedSkill
}: StudentSkillSelectorProps) {
  const { contentSkillScores } = useStudentProfileData({
    studentId,
    classId,
    className
  });

  // Fetch available content skills for this class
  const { data: classContentSkills = [], isLoading: skillsLoading } = useQuery({
    queryKey: ['classContentSkills', classId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('class_content_skills')
        .select(`
          content_skills (
            skill_name,
            topic,
            subject,
            grade
          )
        `)
        .eq('class_id', classId);

      if (error) throw error;
      return data?.map(item => item.content_skills).filter(Boolean) || [];
    },
    enabled: !!classId
  });

  const [selectedSkillName, setSelectedSkillName] = useState<string | undefined>(
    currentSelectedSkill?.skill_name
  );

  // Group skills by topic for better organization
  const skillsByTopic = classContentSkills.reduce((acc, skill) => {
    if (!skill) return acc;
    const topic = skill.topic || 'Other';
    if (!acc[topic]) acc[topic] = [];
    acc[topic].push(skill);
    return acc;
  }, {} as Record<string, typeof classContentSkills>);

  // Get the student's actual score for the selected skill
  const getSkillScore = (skillName: string) => {
    const skillData = contentSkillScores.find(skill => skill.skill_name === skillName);
    return skillData?.score || 0;
  };

  const handleSave = () => {
    if (!selectedSkillName) {
      onSave(studentId, null);
      return;
    }

    const score = getSkillScore(selectedSkillName);
    onSave(studentId, { skill_name: selectedSkillName, score });
  };

  if (skillsLoading) {
    return (
      <Card className="w-full max-w-2xl">
        <CardContent className="p-8 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Loading class content skills...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Select Target Skill for {studentName}</span>
          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave} className="bg-green-600 hover:bg-green-700">
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="outline" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div>
          <p className="text-sm text-slate-600 mb-4">
            Choose which content skill from {className} to focus on for today's lesson plan. 
            The student's actual test score for that skill will be used.
          </p>

          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700">
              Target Content Skill
            </label>
            <Select value={selectedSkillName} onValueChange={setSelectedSkillName}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a content skill to focus on..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">
                  Use automatically determined weakest skill
                </SelectItem>
                {Object.entries(skillsByTopic).map(([topic, skills]) => (
                  <div key={topic}>
                    <div className="px-2 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wide bg-slate-50">
                      {topic}
                    </div>
                    {skills.map((skill) => (
                      <SelectItem key={skill.skill_name} value={skill.skill_name}>
                        <div className="flex items-center justify-between w-full">
                          <span>{skill.skill_name}</span>
                          <Badge variant={getSkillScore(skill.skill_name) >= 80 ? "default" : getSkillScore(skill.skill_name) >= 60 ? "secondary" : "destructive"} className="ml-2">
                            {Math.round(getSkillScore(skill.skill_name))}%
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedSkillName && selectedSkillName !== "__none__" && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="font-medium text-blue-900 mb-2">Selected Skill Preview</h4>
              <div className="flex items-center justify-between">
                <span className="text-blue-800">{selectedSkillName}</span>
                <Badge variant={getSkillScore(selectedSkillName) >= 80 ? "default" : getSkillScore(selectedSkillName) >= 60 ? "secondary" : "destructive"}>
                  {Math.round(getSkillScore(selectedSkillName))}%
                </Badge>
              </div>
              <p className="text-sm text-blue-600 mt-1">
                This skill will be highlighted as the focus for today's lesson planning.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
