import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { 
  Home, 
  GraduationCap, 
  BarChart3, 
  Users, 
  HelpCircle, 
  Settings,
  X
} from "lucide-react";
import { cn } from "@/lib/utils";

type NavItem = {
  label: string;
  icon: typeof Home;
  path: string;
  badge?: number;
};

const navItems: NavItem[] = [
  { label: "Dashboard", icon: Home, path: "/dashboard" },
  { label: "My Classes", icon: GraduationCap, path: "/classes" },
  { label: "Analytics", icon: BarChart3, path: "/analytics" },
  { label: "Shared Resources", icon: Users, path: "/shared-resources" },
  { label: "Help", icon: HelpCircle, path: "/help" },
  { label: "Settings", icon: Settings, path: "/dashboard" },
];

type DashboardSidebarProps = {
  onNavigate?: () => void;
};

export function DashboardSidebar({ onNavigate }: DashboardSidebarProps) {
  const [location, navigate] = useLocation();

  const handleNavigate = (path: string) => {
    navigate(path);
    onNavigate?.();
  };

  return (
    <aside className="w-64 border-r border-border/40 bg-card h-screen sticky top-0 flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border/40 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img 
            src="/favicon.png" 
            alt="OECS Content Creator Logo" 
            className="h-10 w-10 rounded-lg"
          />
          <div>
            <h1 className="text-lg font-semibold text-foreground">OECS Content Creator</h1>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="lg:hidden"
          onClick={onNavigate}
          aria-label="Close menu"
        >
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = location === item.path || 
            (item.path === "/dashboard" && location.startsWith("/create"));
          
          return (
            <Button
              key={item.path}
              variant={isActive ? "secondary" : "ghost"}
              className={cn(
                "w-full justify-start gap-3 h-11",
                isActive && "bg-muted font-medium"
              )}
              onClick={() => handleNavigate(item.path)}
            >
              <Icon className="h-5 w-5" />
              <span className="flex-1 text-left">{item.label}</span>
              {item.badge !== undefined && item.badge > 0 && (
                <span className="h-5 w-5 rounded-full bg-destructive text-destructive-foreground text-xs flex items-center justify-center">
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

