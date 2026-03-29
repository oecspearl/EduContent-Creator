import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import {
  Home,
  GraduationCap,
  BarChart3,
  Users,
  HelpCircle,
  Settings,
  X,
  BookOpen,
  Trophy,
  ClipboardList,
  MessageCircle,
  Waypoints,
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof Home;
  path: string;
  badge?: number;
};

const teacherNavItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "My Classes", icon: GraduationCap, path: "/classes" },
  { label: "Gradebook", icon: ClipboardList, path: "/gradebook" },
  { label: "Learning Paths", icon: Waypoints, path: "/learning-paths" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Shared Resources", icon: Users, path: "/shared-resources" },
  { label: "Help", icon: HelpCircle, path: "/help" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

const studentNavItems: NavItem[] = [
  { label: "My Learning", icon: Home, path: "/dashboard" },
  { label: "Learning Paths", icon: Waypoints, path: "/my-learning-paths" },
  { label: "Messages", icon: MessageCircle, path: "/messages" },
  { label: "Help", icon: HelpCircle, path: "/help" },
  { label: "Settings", icon: Settings, path: "/settings" },
];

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const [location, navigate] = useLocation();
  const { user } = useAuth();
  const isStudent = user?.role === "student";
  const navItems = isStudent ? studentNavItems : teacherNavItems;

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <aside className="w-60 border-r border-border/40 bg-card h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-5 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <img
            src="/favicon.png"
            alt="OECS Content Creator Logo"
            className="h-9 w-9 rounded-lg"
          />
          <div>
            <h1 className="text-base font-semibold text-foreground leading-tight">OECS Content Creator</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden h-8 w-8 cursor-pointer"
          onClick={onNavigate}
          aria-label="Close menu"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path ||
            (item.path === "/dashboard" && location.startsWith("/create")) ||
            (item.path === "/settings" && location === "/settings");

          return (
            <Button
              key={item.path}
              variant="ghost"
              className={cn(
                "w-full justify-start gap-2.5 h-10 text-sm font-medium transition-colors cursor-pointer",
                isActive
                  ? "bg-primary text-primary-foreground hover:bg-primary/90"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon className={cn("h-4 w-4", isActive ? "text-primary-foreground" : "text-muted-foreground")} />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="h-5 min-w-5 px-1 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </Button>
          );
        })}
      </nav>
    </aside>
  );
}
