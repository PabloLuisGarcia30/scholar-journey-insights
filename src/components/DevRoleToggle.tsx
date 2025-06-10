
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { User, GraduationCap } from "lucide-react";
import { useDevRole } from "@/contexts/DevRoleContext";

export function DevRoleToggle() {
  const { currentRole, setCurrentRole, isDevMode } = useDevRole();

  if (!isDevMode) {
    return null;
  }

  return (
    <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="bg-orange-100 text-orange-800">
            DEV MODE
          </Badge>
          <span className="text-sm text-orange-700">
            Current view: {currentRole}
          </span>
        </div>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant={currentRole === 'teacher' ? 'default' : 'outline'}
            onClick={() => setCurrentRole('teacher')}
            className="h-7 px-2"
          >
            <GraduationCap className="h-3 w-3 mr-1" />
            Teacher
          </Button>
          <Button
            size="sm"
            variant={currentRole === 'student' ? 'default' : 'outline'}
            onClick={() => setCurrentRole('student')}
            className="h-7 px-2"
          >
            <User className="h-3 w-3 mr-1" />
            Student
          </Button>
        </div>
      </div>
    </div>
  );
}
