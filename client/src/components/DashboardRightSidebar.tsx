import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { 
  Bell, 
  ChevronDown, 
  LogOut,
  Download,
  Trash2,
  FileText
} from "lucide-react";
import { format } from "date-fns";
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

export function DashboardRightSidebar() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handleLogout = async () => {
    await logout();
  };

  // Sample personal notes - in a real app, this would come from an API
  const personalNotes = [
    "Review quiz submissions for Grade 9 Science",
    "Prepare materials for next week's class",
    "Update interactive video with new content",
    "Check student progress on assigned quizzes"
  ];

  // Sample recent documents - in a real app, this would come from an API
  const recentDocuments = [
    { name: "Science_Quiz_Module_1.pdf", size: "2.3 MB", date: "Dec 15, 2024" },
    { name: "Math_Flashcards_Set_A.pdf", size: "1.8 MB", date: "Dec 12, 2024" },
    { name: "History_Timeline.pdf", size: "3.1 MB", date: "Dec 10, 2024" },
  ];

  return (
    <aside className="w-80 border-l border-border/40 bg-card h-screen sticky top-0 flex flex-col overflow-y-auto">
      {/* User Profile & Notifications */}
      <div className="p-6 border-b border-border/40">
        <div className="flex items-center justify-between mb-4">
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="h-5 w-5" />
            <span className="absolute top-0 right-0 h-2 w-2 rounded-full bg-destructive"></span>
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
              <DropdownMenuItem onClick={() => navigate("/dashboard")}>
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

      {/* Personal Notes */}
      <div className="p-6 border-b border-border/40">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Personal Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="space-y-2">
              {personalNotes.map((note, index) => (
                <li key={index} className="text-sm text-muted-foreground flex items-start gap-2">
                  <span className="text-primary mt-1">•</span>
                  <span className="flex-1">{note}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* Recent Documents */}
      <div className="p-6">
        <Card className="border-border/40 shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-base font-medium">Recent Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recentDocuments.map((doc, index) => (
                <div key={index} className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 transition-colors">
                  <div className="h-8 w-8 rounded bg-red-100 dark:bg-red-900/20 flex items-center justify-center flex-shrink-0">
                    <FileText className="h-4 w-4 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{doc.name}</p>
                    <p className="text-xs text-muted-foreground">{doc.size} • {doc.date}</p>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </aside>
  );
}

