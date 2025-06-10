
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { User, GraduationCap } from "lucide-react";
import { useDevRole } from "@/contexts/DevRoleContext";

export function DevRoleToggle() {
  const { currentRole, setCurrentRole, isDevMode } = useDevRole();

  if (!isDevMode) {
    return null;
  }

  const isStudentView = currentRole === 'student';

  const handleToggleChange = (checked: boolean) => {
    setCurrentRole(checked ? 'student' : 'teacher');
  };

  return (
    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <Badge variant="secondary" className="bg-orange-100 text-orange-800">
          DEV MODE
        </Badge>
        
        <div className="flex items-center gap-2">
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
      </div>
    </div>
  );
}
