
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Target, Play } from "lucide-react";
import { toast } from "sonner";

interface Skill {
  id: string;
  skill_name: string;
  score: number;
  skill_description?: string;
  points_earned?: number;
  points_possible?: number;
}

interface SkillPracticeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skills: Skill[];
  className: string;
}

export function SkillPracticeDialog({ open, onOpenChange, skills, className }: SkillPracticeDialogProps) {
  const [selectedSkills, setSelectedSkills] = useState<Set<string>>(new Set());

  const handleSkillToggle = (skillId: string) => {
    const newSelected = new Set(selectedSkills);
    if (newSelected.has(skillId)) {
      newSelected.delete(skillId);
    } else {
      newSelected.add(skillId);
    }
    setSelectedSkills(newSelected);
  };

  const handleStartPractice = () => {
    if (selectedSkills.size === 0) {
      toast.info("Please select at least one skill to practice.");
      return;
    }

    const selectedSkillNames = skills
      .filter(skill => selectedSkills.has(skill.id))
      .map(skill => skill.skill_name);

    toast.success(`Starting practice session for ${selectedSkillNames.join(", ")}!`);
    onOpenChange(false);
    setSelectedSkills(new Set());
    
    // TODO: Navigate to practice session or generate practice test
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Target className="h-6 w-6 text-blue-600" />
            What do you want to practice today?
          </DialogTitle>
          <p className="text-sm text-slate-600">
            Choose one or more skills from {className} to focus on during your practice session.
          </p>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto py-4">
          <div className="space-y-4">
            <h4 className="font-medium text-slate-700 mb-3">Top 5 Skills to Improve:</h4>
            {skills.map((skill) => (
              <div key={skill.id} className="flex items-start space-x-3 p-4 rounded-lg border bg-white/50 hover:bg-white/80 transition-colors">
                <Checkbox
                  id={skill.id}
                  checked={selectedSkills.has(skill.id)}
                  onCheckedChange={() => handleSkillToggle(skill.id)}
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-2">
                    <label 
                      htmlFor={skill.id}
                      className="font-medium text-slate-900 cursor-pointer"
                    >
                      {skill.skill_name}
                    </label>
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-semibold ${getScoreColor(skill.score)}`}>
                        {skill.score.toFixed(1)}%
                      </span>
                      <Badge variant="outline" className="text-xs">
                        {skill.points_earned || 0}/{skill.points_possible || 0} points
                      </Badge>
                    </div>
                  </div>
                  {skill.skill_description && (
                    <p className="text-sm text-slate-600 mb-3">{skill.skill_description}</p>
                  )}
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${Math.max(skill.score, 5)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t pt-4 flex items-center justify-between">
          <p className="text-sm text-slate-600">
            {selectedSkills.size} skill{selectedSkills.size !== 1 ? 's' : ''} selected
          </p>
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleStartPractice}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2 rounded-lg shadow-md transition-all duration-200 flex items-center gap-2"
            >
              <Play className="h-4 w-4" />
              Start Practice ({selectedSkills.size})
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
