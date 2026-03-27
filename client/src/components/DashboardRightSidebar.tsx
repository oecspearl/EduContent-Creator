import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
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
import { formatDistanceToNow } from "date-fns";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
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
      return <FileQuestion className="h-3.5 w-3.5" />;
    case "flashcard":
      return <Layers className="h-3.5 w-3.5" />;
    case "interactive-book":
      return <BookOpen className="h-3.5 w-3.5" />;
    case "interactive-video":
      return <Video className="h-3.5 w-3.5" />;
    case "image-hotspot":
      return <Image className="h-3.5 w-3.5" />;
    case "presentation":
      return <Presentation className="h-3.5 w-3.5" />;
    case "memory-game":
      return <Gamepad2 className="h-3.5 w-3.5" />;
    default:
      return <Activity className="h-3.5 w-3.5" />;
  }
}

function getContentColor(type: string) {
  switch (type) {
    case "quiz":
      return "bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400";
    case "flashcard":
      return "bg-purple-50 dark:bg-purple-900/20 text-purple-600 dark:text-purple-400";
    case "interactive-book":
      return "bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400";
    case "interactive-video":
      return "bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400";
    case "image-hotspot":
      return "bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400";
    case "presentation":
      return "bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400";
    case "memory-game":
      return "bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400";
    default:
      return "bg-muted text-muted-foreground";
  }
}

export function DashboardRightSidebar() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();

  const { data: recentActivity = [], isLoading } = useQuery<RecentActivity[]>({
    queryKey: ["/api/dashboard/recent-activity"],
    refetchInterval: 60000,
  });

  const handleLogout = async () => {
    await logout();
  };

  return (
    <aside className="w-72 border-l border-border/40 bg-card h-screen sticky top-0 flex flex-col overflow-y-auto">
      {/* User Profile & Controls */}
      <div className="p-5 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="relative h-8 w-8 cursor-pointer">
                <Bell className="h-4 w-4" />
                {recentActivity.length > 0 && (
                  <span className="absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full bg-destructive" />
                )}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-72">
              <DropdownMenuLabel className="flex items-center justify-between">
                <span>Notifications</span>
                {recentActivity.length > 0 && (
                  <span className="text-xs text-muted-foreground">{recentActivity.length} new</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {recentActivity.length === 0 ? (
                <div className="py-4 text-center text-sm text-muted-foreground">
                  No new notifications
                </div>
              ) : (
                <>
                  {recentActivity.slice(0, 5).map((activity) => (
                    <DropdownMenuItem
                      key={activity.progressId}
                      className="flex items-start gap-2.5 p-2.5 cursor-pointer"
                      onClick={() => navigate(`/analytics/${activity.contentId}`)}
                    >
                      <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${getContentColor(activity.contentType)}`}>
                        {getContentIcon(activity.contentType)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{activity.studentName}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {activity.completionPercentage}% on {activity.contentTitle}
                        </p>
                      </div>
                    </DropdownMenuItem>
                  ))}
                  {recentActivity.length > 5 && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        className="text-center text-sm text-primary cursor-pointer justify-center"
                        onClick={() => navigate("/analytics")}
                      >
                        View all activity
                      </DropdownMenuItem>
                    </>
                  )}
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
          <ThemeToggle />
        </div>

        <div className="flex items-center gap-2.5">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary text-primary-foreground text-xs">
              {user ? getInitials(user.fullName) : "U"}
            </AvatarFallback>
          </Avatar>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex-1 justify-between h-auto p-0 cursor-pointer">
                <div className="text-left">
                  <p className="text-sm font-medium text-foreground leading-tight">{user?.fullName}</p>
                  <p className="text-xs text-muted-foreground">{user?.role}</p>
                </div>
                <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate("/settings")} className="cursor-pointer">
                Profile Settings
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                <LogOut className="h-4 w-4 mr-2" />
                Log Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Recent Student Activity - Primary focus */}
      <div className="p-5 flex-1">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Activity className="h-4 w-4 text-muted-foreground" />
            Recent Activity
          </h3>
          {recentActivity.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7 cursor-pointer"
              onClick={() => navigate("/analytics")}
            >
              View all
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse flex items-center gap-2.5 p-2">
                <div className="h-7 w-7 rounded-md bg-muted" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3 bg-muted rounded w-3/4" />
                  <div className="h-2 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="text-center py-10">
            <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-3">
              <User className="h-6 w-6 text-muted-foreground" />
            </div>
            <p className="text-sm font-medium text-foreground mb-1">No activity yet</p>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Activity will appear here when students access your content
            </p>
          </div>
        ) : (
          <div className="space-y-1">
            {recentActivity.slice(0, 10).map((activity) => (
              <button
                key={activity.progressId}
                className="w-full flex items-start gap-2.5 p-2.5 rounded-lg hover:bg-muted/50 transition-colors cursor-pointer text-left"
                onClick={() => navigate(`/analytics/${activity.contentId}`)}
              >
                <div className={`h-7 w-7 rounded-md flex items-center justify-center flex-shrink-0 ${getContentColor(activity.contentType)}`}>
                  {getContentIcon(activity.contentType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate leading-tight">
                    {activity.studentName}
                  </p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.contentTitle}
                  </p>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    {/* Completion bar */}
                    <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden max-w-[80px]">
                      <div
                        className="h-full bg-primary rounded-full transition-all"
                        style={{ width: `${activity.completionPercentage}%` }}
                      />
                    </div>
                    <span className="text-[11px] text-muted-foreground tabular-nums">
                      {activity.completionPercentage}%
                    </span>
                    <span className="text-[11px] text-muted-foreground">
                      {formatDistanceToNow(new Date(activity.lastAccessedAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
