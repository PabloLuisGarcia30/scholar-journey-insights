
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { User, GraduationCap, RotateCcw } from "lucide-react";
import { useDevRole } from "@/contexts/DevRoleContext";
import { Button } from "@/components/ui/button";

export function DevRoleToggle() {
  const { currentRole, setCurrentRole, isDevMode } = useDevRole();

  if (!isDevMode) {
    return null;
  }

  const isStudentView = currentRole === 'student';

  const handleToggleChange = (checked: boolean) => {
    setCurrentRole(checked ? 'student' : 'teacher');
  };

  const handleQuickSwitch = () => {
    setCurrentRole(isStudentView ? 'teacher' : 'student');
  };

  return (
    <div className="flex items-center gap-3">
      {/* Quick Switch Button */}
      <Button
        onClick={handleQuickSwitch}
        variant="outline"
        size="sm"
        className="bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-800"
      >
        <RotateCcw className="h-3 w-3 mr-2" />
        Switch to {isStudentView ? 'Teacher' : 'Student'}
      </Button>
      
      {/* Detailed Toggle */}
      <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
        <div className="flex flex-col gap-3">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800 w-fit">
            DEV MODE
          </Badge>
          
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-center gap-1 text-sm text-orange-700">
              <GraduationCap className="h-3 w-3" />
              <span>Teacher</span>
            </div>
            
            <Switch
              checked={isStudentView}
              onCheckedChange={handleToggleChange}
              className="data-[state=checked]:bg-orange-600"
            />
            
            <div className="flex items-center gap-1 text-sm text-orange-700">
              <User className="h-3 w-3" />
              <span>Student</span>
            </div>
          </div>
          
          <div className="text-xs text-center text-orange-600 font-medium">
            Current: {currentRole === 'student' ? 'Student View' : 'Teacher View'}
          </div>
        </div>
      </div>
    </div>
  );
}
