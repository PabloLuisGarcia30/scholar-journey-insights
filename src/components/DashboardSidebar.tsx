
import { BarChart3, Users, GraduationCap, Calendar, Brain, Home, User, LogOut, TrendingUp } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useDevRole } from "@/contexts/DevRoleContext";
import { RoleToggle } from "@/components/RoleToggle";
import { DEV_CONFIG } from "@/config/devConfig";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  activeView: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker' | 'learner-profiles';
  onViewChange: (view: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker' | 'learner-profiles') => void;
}

export function DashboardSidebar({ activeView, onViewChange }: DashboardSidebarProps) {
  const location = useLocation();
  const { user, profile, signOut } = useAuth();
  
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

  // In dev mode, always show sidebar. In production, check for auth
  if (!DEV_CONFIG.DISABLE_AUTH_FOR_DEV && (!user || !profile)) {
    return null;
  }

  const isTeacherView = currentRole === 'teacher';

  const teacherNavigationItems = [
    {
      title: "Dashboard",
      icon: Home,
      onClick: () => onViewChange('dashboard'),
      isActive: activeView === 'dashboard'
    },
    {
      title: "Student Directory",
      icon: Users,
      onClick: () => onViewChange('search'),
      isActive: activeView === 'search'
    },
    {
      title: "Classes",
      icon: GraduationCap,
      onClick: () => onViewChange('classes'),
      isActive: activeView === 'classes'
    },
    {
      title: "Analytics",
      icon: BarChart3,
      onClick: () => onViewChange('analytics'),
      isActive: activeView === 'analytics'
    },
    {
      title: "Student Portals",
      icon: Calendar,
      onClick: () => onViewChange('portals'),
      isActive: activeView === 'portals'
    },
    {
      title: "Learner Profiles",
      href: "/student-learner-profile",
      icon: Brain,
      isActive: location.pathname === '/student-learner-profile'
    }
  ];

  const studentNavigationItems = [
    {
      title: "My Dashboard",
      href: "/student-dashboard",
      icon: Home,
      isActive: location.pathname === '/student-dashboard'
    },
    {
      title: "My Assignments",
      href: "/student-assignments",
      icon: Calendar,
      isActive: location.pathname === '/student-assignments'
    },
    {
      title: "My Progress",
      href: "/student-progress",
      icon: BarChart3,
      isActive: location.pathname === '/student-progress'
    },
    {
      title: "Learning Profile",
      href: "/student-learner-profile",
      icon: Brain,
      isActive: location.pathname === '/student-learner-profile'
    }
  ];

  const externalLinks = [
    {
      title: "Test Creator",
      href: "/test-creator"
    },
    {
      title: "Upload Test",
      href: "/upload-test"
    },
    {
      title: "Student Upload",
      href: "/student-upload"
    },
    {
      title: "Create Quiz Link",
      href: "/create-quiz-link"
    },
    {
      title: "Lesson Tracker",
      href: "/student-lesson-tracker"
    },
    {
      title: "ClassRunner",
      href: "/class-runner"
    },
    {
      title: "Mistake Pattern Demo",
      href: "/mistake-pattern-demo"
    }
  ];

  const navigationItems = isTeacherView ? teacherNavigationItems : studentNavigationItems;

  // Get display name and email
  const displayName = profile?.full_name || 'User';
  const displayEmail = profile?.email || user?.email || 'dev@example.com';

  return (
    <Sidebar className="border-r bg-white">
      <SidebarHeader className="p-4 border-b">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            <span className="font-semibold text-slate-900">EduPlatform</span>
          </div>

          {/* Role Toggle */}
          <RoleToggle />

          {/* User Info */}
          <div className="flex items-center gap-3 p-2 bg-blue-50 rounded-lg">
            <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center">
              <User className="h-4 w-4 text-blue-700" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-900 truncate">
                {displayName}
              </p>
              <p className="text-xs text-slate-600">{displayEmail}</p>
            </div>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>
            {isTeacherView ? 'Teacher Navigation' : 'Student Navigation'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.isActive}
                    className="w-full justify-start"
                    asChild={!!item.href}
                  >
                    {item.href ? (
                      <Link 
                        to={item.href}
                        className={`w-full justify-start ${
                          item.isActive ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </Link>
                    ) : (
                      <>
                        <item.icon className="mr-2 h-4 w-4" />
                        {item.title}
                      </>
                    )}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {isTeacherView && (
          <SidebarGroup>
            <SidebarGroupLabel>Tools & Features</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {externalLinks.map((link) => (
                  <SidebarMenuItem key={link.title}>
                    <SidebarMenuButton asChild>
                      <Link 
                        to={link.href}
                        className={`w-full justify-start ${
                          location.pathname === link.href ? 'bg-accent text-accent-foreground' : ''
                        }`}
                      >
                        <div className="mr-2 h-4 w-4" />
                        {link.title}
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter className="p-4 border-t">
        <Button 
          variant="outline" 
          onClick={signOut}
          className="w-full justify-start"
        >
          <LogOut className="mr-2 h-4 w-4" />
          {DEV_CONFIG.DISABLE_AUTH_FOR_DEV ? 'Sign Out (Dev)' : 'Sign Out'}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
