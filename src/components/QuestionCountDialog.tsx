
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock, Target, Zap, BookOpen } from "lucide-react";

interface QuestionCountDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (questionCount: number) => void;
  skillName: string;
}

const questionOptions = [
  {
    count: 3,
    label: "Quick Practice",
    time: "5-8 minutes",
    description: "Perfect for a quick skill check",
    icon: Zap
  },
  {
    count: 5,
    label: "Focused Practice",
    time: "8-12 minutes",
    description: "Good balance of practice and time",
    icon: Target
  },
  {
    count: 8,
    label: "Deep Practice",
    time: "15-20 minutes",
    description: "Thorough skill development",
    icon: BookOpen
  },
  {
    count: 10,
    label: "Comprehensive",
    time: "20-25 minutes",
    description: "Maximum skill assessment",
    icon: Target
  }
];

export function QuestionCountDialog({ isOpen, onClose, onConfirm, skillName }: QuestionCountDialogProps) {
  const [selectedCount, setSelectedCount] = useState<number | null>(null);
  const [customCount, setCustomCount] = useState("");
  const [useCustom, setUseCustom] = useState(false);

  const handleConfirm = () => {
    const finalCount = useCustom ? parseInt(customCount) : selectedCount;
    if (finalCount && finalCount >= 1 && finalCount <= 15) {
      onConfirm(finalCount);
      onClose();
      // Reset state
      setSelectedCount(null);
      setCustomCount("");
      setUseCustom(false);
    }
  };

  const handleQuickStart = () => {
    onConfirm(4); // Default question count
    onClose();
    setSelectedCount(null);
    setCustomCount("");
    setUseCustom(false);
  };

  const isValidSelection = useCustom 
    ? customCount && parseInt(customCount) >= 1 && parseInt(customCount) <= 15
    : selectedCount !== null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-xl">Customize Your Practice Session</DialogTitle>
          <p className="text-gray-600">
            Choose how many questions you'd like for <strong>{skillName}</strong>
          </p>
        </DialogHeader>

        <div className="space-y-6">
          {/* Quick Start Option */}
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 text-blue-600" />
                  <div>
                    <h4 className="font-medium text-blue-900">Quick Start (Recommended)</h4>
                    <p className="text-sm text-blue-700">4 questions • 10-12 minutes • Optimal practice length</p>
                  </div>
                </div>
                <Button onClick={handleQuickStart} className="bg-blue-600 hover:bg-blue-700">
                  Start Now
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="text-center text-gray-500 text-sm">or customize your session below</div>

          {/* Preset Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {questionOptions.map((option) => {
              const Icon = option.icon;
              const isSelected = selectedCount === option.count && !useCustom;
              
              return (
                <Card 
                  key={option.count}
                  className={`cursor-pointer transition-all ${
                    isSelected 
                      ? 'border-green-500 bg-green-50 shadow-md' 
                      : 'border-gray-200 hover:border-green-300 hover:shadow-sm'
                  }`}
                  onClick={() => {
                    setSelectedCount(option.count);
                    setUseCustom(false);
                  }}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <Icon className={`h-5 w-5 mt-1 ${isSelected ? 'text-green-600' : 'text-gray-500'}`} />
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className={`font-medium ${isSelected ? 'text-green-900' : 'text-gray-900'}`}>
                            {option.label}
                          </h4>
                          <span className={`text-lg font-bold ${isSelected ? 'text-green-700' : 'text-gray-700'}`}>
                            {option.count}
                          </span>
                        </div>
                        <div className="flex items-center gap-1 mb-2">
                          <Clock className="h-3 w-3 text-gray-400" />
                          <span className="text-sm text-gray-600">{option.time}</span>
                        </div>
                        <p className="text-xs text-gray-500">{option.description}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Custom Input */}
          <Card 
            className={`cursor-pointer transition-all ${
              useCustom 
                ? 'border-green-500 bg-green-50' 
                : 'border-gray-200 hover:border-green-300'
            }`}
            onClick={() => setUseCustom(true)}
          >
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Target className={`h-5 w-5 ${useCustom ? 'text-green-600' : 'text-gray-500'}`} />
                <div className="flex-1">
                  <h4 className={`font-medium mb-2 ${useCustom ? 'text-green-900' : 'text-gray-900'}`}>
                    Custom Amount
                  </h4>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max="15"
                      placeholder="Enter 1-15"
                      value={customCount}
                      onChange={(e) => {
                        setCustomCount(e.target.value);
                        setUseCustom(true);
                      }}
                      className="w-24 px-2 py-1 text-sm border border-gray-300 rounded focus:border-green-500 focus:outline-none"
                    />
                    <span className="text-sm text-gray-600">questions (1-15)</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleConfirm} 
              disabled={!isValidSelection}
              className="flex-1 bg-green-600 hover:bg-green-700"
            >
              Generate Practice Exercise
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
