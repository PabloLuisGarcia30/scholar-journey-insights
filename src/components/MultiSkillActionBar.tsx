
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X, Zap, Loader2 } from "lucide-react";
import { useMultiSkillSelection } from "@/contexts/MultiSkillSelectionContext";

interface MultiSkillActionBarProps {
  onGenerateTests: () => void;
  isGenerating?: boolean;
}

export function MultiSkillActionBar({ onGenerateTests, isGenerating = false }: MultiSkillActionBarProps) {
  const { selectedSkills, isSelectionMode, clearSelection, toggleSelectionMode } = useMultiSkillSelection();

  if (!isSelectionMode || selectedSkills.length === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50">
      <Card className="p-4 shadow-lg border-2 border-blue-200 bg-white">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedSkills.length} skill{selectedSkills.length !== 1 ? 's' : ''} selected
            </Badge>
            <div className="text-sm text-gray-600">
              {selectedSkills.map(skill => skill.name).join(', ')}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              onClick={onGenerateTests}
              disabled={isGenerating}
              className="bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Zap className="h-4 w-4 mr-2" />
                  Generate Practice Tests
                </>
              )}
            </Button>
            
            <Button
              variant="outline"
              onClick={clearSelection}
              disabled={isGenerating}
            >
              Clear
            </Button>
            
            <Button
              variant="ghost"
              size="sm"
              onClick={toggleSelectionMode}
              disabled={isGenerating}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
