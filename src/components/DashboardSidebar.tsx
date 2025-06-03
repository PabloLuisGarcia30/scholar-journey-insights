
import { BookOpen, ChartBar, GraduationCap, Calendar, Users } from "lucide-react";
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

interface DashboardSidebarProps {
  activeView: 'dashboard' | 'search' | 'classes' | 'analytics';
  onViewChange: (view: 'dashboard' | 'search' | 'classes' | 'analytics') => void;
}

const navigationItems = [
  { id: 'dashboard', title: 'Dashboard', icon: ChartBar },
  { id: 'search', title: 'Students', icon: GraduationCap },
  { id: 'classes', title: 'Classes', icon: Users },
  { id: 'analytics', title: 'Analytics', icon: BookOpen },
];

export function DashboardSidebar({ activeView, onViewChange }: DashboardSidebarProps) {
  const { collapsed } = useSidebar();

  return (
    <Sidebar className={collapsed ? "w-14" : "w-60"} collapsible>
      <div className="p-4 border-b">
        <SidebarTrigger className="mb-2" />
        {!collapsed && (
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
                    {!collapsed && <span>{item.title}</span>}
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
