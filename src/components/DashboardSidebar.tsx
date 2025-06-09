
import { BarChart3, Users, GraduationCap, Calendar, Brain, Home } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

interface DashboardSidebarProps {
  activeView: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker';
  onViewChange: (view: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals' | 'student-lesson-tracker') => void;
}

export function DashboardSidebar({ activeView, onViewChange }: DashboardSidebarProps) {
  const location = useLocation();

  const navigationItems = [
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
      title: "Learner Profiles",
      href: "/student-learner-profile",
      icon: Brain
    }
  ];

  return (
    <Sidebar className="border-r bg-white">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Main Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    onClick={item.onClick}
                    isActive={item.isActive}
                    className="w-full justify-start"
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {item.title}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

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
                      {link.icon && <link.icon className="mr-2 h-4 w-4" />}
                      {!link.icon && <div className="mr-2 h-4 w-4" />}
                      {link.title}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
