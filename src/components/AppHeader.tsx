
import { GraduationCap, User } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useDevRole } from "@/contexts/DevRoleContext";
import { DEV_CONFIG } from "@/config/devConfig";

export function AppHeader() {
  const { profile, user } = useAuth();
  
  // Get current role (dev or actual)
  let currentRole: 'teacher' | 'student' = 'teacher';
  try {
    const { currentRole: devRole, isDevMode } = useDevRole();
    if (isDevMode) {
      currentRole = devRole;
    } else if (profile?.role) {
      currentRole = profile.role;
    }
  } catch {
    currentRole = profile?.role || 'teacher';
  }

  // Get display name and email
  const displayName = profile?.full_name || 'User';
  const displayEmail = profile?.email || user?.email || 'dev@example.com';

  return (
    <header className="bg-blue-900 text-white shadow-lg">
      <div className="mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo and Brand */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <GraduationCap className="h-8 w-8 text-blue-200" />
              <span className="text-xl font-bold text-white">EduPlatform</span>
            </div>
            <div className="hidden sm:block">
              <span className="text-blue-200 text-sm font-medium">
                {currentRole === 'teacher' ? 'Teacher Portal' : 'Student Portal'}
              </span>
            </div>
          </div>

          {/* User Info */}
          <div className="flex items-center gap-3">
            <div className="hidden md:block text-right">
              <p className="text-sm font-medium text-white">{displayName}</p>
              <p className="text-xs text-blue-200">{displayEmail}</p>
            </div>
            <div className="w-10 h-10 bg-blue-700 rounded-full flex items-center justify-center">
              <User className="h-5 w-5 text-blue-200" />
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
