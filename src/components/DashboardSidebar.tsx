
import { BookOpen, ChartBar, GraduationCap, Calendar, Users, Upload, TestTube, Link, Globe } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
import { Link as RouterLink } from "react-router-dom";

interface DashboardSidebarProps {
  activeView: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals';
  onViewChange: (view: 'dashboard' | 'search' | 'classes' | 'analytics' | 'portals') => void;
}

const navigationItems = [
  { id: 'dashboard', title: 'Dashboard', icon: ChartBar },
  { id: 'search', title: 'Students', icon: GraduationCap },
  { id: 'classes', title: 'Classes', icon: Users },
  { id: 'analytics', title: 'Analytics', icon: BookOpen },
  { id: 'portals', title: 'Student Portals', icon: Globe },
];

const teacherTools = [
  { title: 'Upload Test', href: '/upload-test', icon: Upload },
  { title: 'Test Creator', href: '/test-creator', icon: TestTube },
  { title: 'Create Quiz Link', href: '/create-quiz-link', icon: Link },
];

export function DashboardSidebar({ activeView, onViewChange }: DashboardSidebarProps) {
  const { state } = useSidebar();
  const isCollapsed = state === "collapsed";

  return (
    <Sidebar collapsible="icon">
      <div className="p-4 border-b">
        <SidebarTrigger className="mb-2" />
        {!isCollapsed && (
          <div className="flex items-center gap-2">
            <GraduationCap className="h-6 w-6 text-blue-600" />
            <h1 className="text-lg font-bold text-gray-900">EduTracker</h1>
          </div>
        )}
      </div>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navigationItems.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton 
                    onClick={() => onViewChange(item.id as any)}
                    className={`w-full ${activeView === item.id ? 'bg-blue-100 text-blue-700 font-medium' : 'hover:bg-gray-100'}`}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {!isCollapsed && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel>Teacher Tools</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {teacherTools.map((link) => (
                <SidebarMenuItem key={link.title}>
                  <SidebarMenuButton asChild className="w-full hover:bg-gray-100">
                    <RouterLink to={link.href}>
                      <link.icon className="mr-2 h-4 w-4" />
                      {!isCollapsed && <span>{link.title}</span>}
                    </RouterLink>
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
