import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  Bell,
  ChevronDown,
  LogOut,
  Activity,
  User,
  FileQuestion,
  BookOpen,
  Layers,
  Video,
  Image,
  Presentation,
  Gamepad2
} from "lucide-react";
import { format, formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

type RecentActivity = {
  progressId: string;
  studentId: string;
  studentName: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  completionPercentage: number;
  lastAccessedAt: string;
};

function getContentIcon(type: string) {
  switch (type) {
    case "quiz":
      return <FileQuestion className="h-4 w-4" />;
    case "flashcard":
      return <Layers className="h-4 w-4" />;
    case "interactive-book":
      return <BookOpen className="h-4 w-4" />;
    case "interactive-video":
      return <Video className="h-4 w-4" />;
    case "image-hotspot":
      return <Image className="h-4 w-4" />;
    case "presentation":
      return <Presentation className="h-4 w-4" />;
    case "memory-game":
      return <Gamepad2 className="h-4 w-4" />;
    default:
      return <Activity className="h-4 w-4" />;
  }
}

function getContentColor(type: string) {
  switch (type) {
    case "quiz":
      return "bg-blue-100 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
    case "flashcard":
      return "bg-purple-100 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400";
    case "interactive-book":
      return "bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400";
    case "interactive-video":
      return "bg-red-100 dark:bg-red-900/20 text-red-600 dark:text-red-400";
    case "image-hotspot":
      return "bg-orange-100 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400";
    case "presentation":
      return "bg-pink-100 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400";
    case "memory-game":
      return "bg-yellow-100 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400";
    default:
      return "bg-gray-100 dark:bg-gray-900/20 text-gray-600 dark:text-gray-400";
  }
}

export function DashboardRightSidebar() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const { data: recentActivity = [], isLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    refetchInterval: 60000, // Refresh every minute
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-80 border-l border-border/40 bg-card h-screen sticky top-0 flex flex-col overflow-y-auto">
      {/* User Profile & Notifications */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            {recentActivity.length > 0 && (
              <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
            )}
          </Button>
          <ThemeToggle />
        </div>
        <div className="flex items-center gap-3">
          <Avatar className="h-10 w-10">
            <AvatarFallback className="bg-primary text-primary-foreground">
              {user ? getInitials(user.fullName) : "U"}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-between h-auto p-0">
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
                <ChevronDown className="h-4 w-4 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/settings")}>
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Calendar Widget */}
      <div className="p-6 border-b border-border/40">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">
              {format(selectedDate, "MMMM yyyy")}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              className="rounded-md"
            />
          </CardContent>
        </Card>
      </div>

      {/* Recent Student Activity */}
      <div className="p-6 flex-1">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Recent Student Activity
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center gap-3 p-2">
                    <div className="h-8 w-8 rounded bg-muted"></div>
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-muted rounded w-3/4"></div>
                      <div className="h-2 bg-muted rounded w-1/2"></div>
                    </div>
                  </div>
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="text-center py-6">
                <User className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground">
                  No student activity yet
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Activity will appear here when students access your content
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentActivity.slice(0, 8).map((activity) => (
                  <div
                    key={activity.progressId}
                    className="flex items-start gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => navigate(`/analytics/${activity.contentId}`)}
                  >
                    <div className={`h-8 w-8 rounded flex items-center justify-center flex-shrink-0 ${getContentColor(activity.contentType)}`}>
                      {getContentIcon(activity.contentType)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">
                        {activity.studentName}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {activity.contentTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-muted-foreground">
                          {activity.completionPercentage}% complete
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(activity.lastAccessedAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}
