
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Save, X, Plus, Trash2 } from "lucide-react";
import { useStudentProfileData } from "@/hooks/useStudentProfileData";

interface StudentSkillEditorProps {
  studentId: string;
  studentName: string;
  classId: string;
  className: string;
  onSave: (studentId: string, skills: Array<{ skill_name: string; score: number }>) => void;
  onCancel: () => void;
}

export function StudentSkillEditor({ 
  studentId, 
  studentName, 
  classId, 
  className, 
  onSave, 
  onCancel 
}: StudentSkillEditorProps) {
  const { contentSkillScores } = useStudentProfileData({
    studentId,
    classId,
    className
  });

  const [editedSkills, setEditedSkills] = useState(() => 
    contentSkillScores.map(skill => ({
      skill_name: skill.skill_name,
      score: skill.score || 0
    }))
  );

  const handleScoreChange = (skillName: string, newScore: number) => {
    setEditedSkills(prev => 
      prev.map(skill => 
        skill.skill_name === skillName 
          ? { ...skill, score: Math.max(0, Math.min(100, newScore)) }
          : skill
      )
    );
  };

  const handleAddSkill = () => {
    setEditedSkills(prev => [...prev, { skill_name: "New Skill", score: 0 }]);
  };

  const handleRemoveSkill = (skillName: string) => {
    setEditedSkills(prev => prev.filter(skill => skill.skill_name !== skillName));
  };

  const handleSkillNameChange = (oldName: string, newName: string) => {
    setEditedSkills(prev => 
      prev.map(skill => 
        skill.skill_name === oldName 
          ? { ...skill, skill_name: newName }
          : skill
      )
    );
  };

  const handleSave = () => {
    onSave(studentId, editedSkills);
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Edit Skills for {studentName}</span>
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
      <CardContent className="space-y-4">
        <div className="flex justify-between items-center">
          <p className="text-sm text-slate-600">
            Customize skills and scores for today's lesson plan
          </p>
          <Button size="sm" variant="outline" onClick={handleAddSkill}>
            <Plus className="h-4 w-4 mr-1" />
            Add Skill
          </Button>
        </div>
        
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {editedSkills.map((skill, index) => (
            <div key={`${skill.skill_name}-${index}`} className="flex items-center gap-3 p-3 border rounded-lg">
              <div className="flex-1">
                <Input
                  value={skill.skill_name}
                  onChange={(e) => handleSkillNameChange(skill.skill_name, e.target.value)}
                  className="font-medium"
                  placeholder="Skill name"
                />
              </div>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min="0"
                  max="100"
                  value={skill.score}
                  onChange={(e) => handleScoreChange(skill.skill_name, parseInt(e.target.value) || 0)}
                  className="w-20"
                />
                <Badge variant={skill.score >= 80 ? "default" : skill.score >= 60 ? "secondary" : "destructive"}>
                  {skill.score}%
                </Badge>
              </div>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => handleRemoveSkill(skill.skill_name)}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
        
        {editedSkills.length === 0 && (
          <div className="text-center py-8 text-slate-500">
            <p>No skills added yet.</p>
            <Button size="sm" variant="outline" onClick={handleAddSkill} className="mt-2">
              <Plus className="h-4 w-4 mr-1" />
              Add First Skill
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
