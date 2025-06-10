
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { GraduationCap, User } from "lucide-react";
import { useDevRole } from "@/contexts/DevRoleContext";
import { DEV_CONFIG } from "@/config/devConfig";

export function RoleToggle() {
  const { currentRole, setCurrentRole, isDevMode } = useDevRole();

  // Only show in dev mode
  if (!isDevMode || !DEV_CONFIG.DISABLE_AUTH_FOR_DEV) {
    return null;
  }

  const isStudent = currentRole === 'student';

  const handleToggle = (checked: boolean) => {
    setCurrentRole(checked ? 'student' : 'teacher');
  };

  return (
    <div className="flex items-center justify-between gap-4 p-3 bg-blue-50 rounded-lg border min-w-fit">
      <div className="flex items-center gap-2 whitespace-nowrap">
        <GraduationCap className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <Label htmlFor="role-toggle" className="text-sm font-medium">
          Teacher
        </Label>
      </div>
      
      <Switch
        id="role-toggle"
        checked={isStudent}
        onCheckedChange={handleToggle}
        className="flex-shrink-0"
      />
      
      <div className="flex items-center gap-2 whitespace-nowrap">
        <Label htmlFor="role-toggle" className="text-sm font-medium">
          Student
        </Label>
        <User className="h-4 w-4 text-green-600 flex-shrink-0" />
      </div>
    </div>
  );
}
