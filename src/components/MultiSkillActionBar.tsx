
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Zap, FileText } from "lucide-react";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";

interface MultiSkillActionBarProps {
  onGenerateTests: () => void;
}

export function MultiSkillActionBar({ onGenerateTests }: MultiSkillActionBarProps) {
  const { selectedSkills, clearSelection, toggleSelectionMode, isSelectionMode } = useMultiSkillSelection();

  if (!isSelectionMode || selectedSkills.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slide-in-right">
      <Card className="p-4 shadow-lg bg-white border-2 border-blue-200">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
              {selectedSkills.length}/5 skills selected
            </Badge>
            <div className="text-sm text-gray-600 max-w-48 truncate">
              {selectedSkills.map(skill => skill.name).join(', ')}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSelection}
              className="text-gray-600 hover:text-gray-800"
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
            
            <Button
              onClick={onGenerateTests}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={selectedSkills.length === 0}
            >
              <FileText className="h-4 w-4 mr-2" />
              Generate {selectedSkills.length} Practice Test{selectedSkills.length !== 1 ? 's' : ''}
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectionMode}
              className="text-gray-500 hover:text-gray-700"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
