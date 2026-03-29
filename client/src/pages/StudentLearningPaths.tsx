import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import {
  Waypoints,
  CheckCircle2,
  Circle,
  Play,
  Lock,
  Menu,
} from "lucide-react";

type LearningPathSummary = {
  id: string;
  name: string;
  description: string | null;
  totalItems: number;
  completedItems: number;
  progressPercentage: number;
};

type PathProgress = {
  path: { id: string; name: string; description: string | null };
  items: Array<{
    contentId: string;
    orderIndex: number;
    isRequired: boolean;
    contentTitle: string;
    contentType: string;
    completionPercentage: number;
    completedAt: string | null;
  }>;
  completed: number;
  total: number;
  currentIndex: number;
};

export default function StudentLearningPaths() {
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [selectedPathId, setSelectedPathId] = useState<string | null>(null);

  const { data: paths, isLoading } = useQuery<LearningPathSummary[]>({
    queryKey: ["/api/student/learning-paths"],
  });

  const { data: pathProgress, isLoading: loadingProgress } = useQuery<PathProgress>({
    queryKey: ["/api/learning-paths", selectedPathId, "progress"],
    enabled: !!selectedPathId,
  });

  return (
    <div className="min-h-screen flex bg-background">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="lg:hidden border-b border-border/40 bg-card px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} className="cursor-pointer">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold">My Learning Paths</h1>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">My Learning Paths</h2>
            <p className="text-sm text-muted-foreground mt-1">Follow these step-by-step guides from your teacher</p>
          </div>

          {isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
          ) : !paths || paths.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-16 text-center">
                <Waypoints className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">No learning paths yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Your teacher hasn't assigned any learning paths to your class yet.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {paths.map(path => (
                <Card
                  key={path.id}
                  className="border-border/40 cursor-pointer hover:shadow-md transition-shadow"
                  onClick={() => setSelectedPathId(path.id)}
                >
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Waypoints className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">{path.name}</h3>
                        </div>
                        {path.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{path.description}</p>
                        )}
                        <div className="flex items-center gap-3 mt-3">
                          <Progress value={path.progressPercentage} className="flex-1 h-2" />
                          <span className="text-sm font-medium text-muted-foreground tabular-nums w-14 text-right">
                            {path.completedItems}/{path.totalItems}
                          </span>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        {path.progressPercentage >= 100 ? (
                          <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            Complete
                          </Badge>
                        ) : (
                          <Badge variant="outline">{path.progressPercentage}%</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Path detail dialog */}
      <Dialog open={!!selectedPathId} onOpenChange={(open) => { if (!open) setSelectedPathId(null); }}>
        <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Waypoints className="h-5 w-5 text-primary" />
              {pathProgress?.path.name || "Learning Path"}
            </DialogTitle>
            {pathProgress?.path.description && (
              <p className="text-sm text-muted-foreground mt-1">{pathProgress.path.description}</p>
            )}
          </DialogHeader>

          {loadingProgress ? (
            <div className="space-y-3">{[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-16" />)}</div>
          ) : pathProgress ? (
            <div className="space-y-2">
              {/* Overall progress */}
              <div className="flex items-center gap-3 mb-4">
                <Progress value={pathProgress.total > 0 ? (pathProgress.completed / pathProgress.total) * 100 : 0} className="flex-1 h-2.5" />
                <span className="text-sm font-medium tabular-nums">{pathProgress.completed}/{pathProgress.total}</span>
              </div>

              {/* Step-by-step items */}
              {pathProgress.items.map((item, i) => {
                const isCompleted = item.completionPercentage >= 100;
                const isCurrent = i === pathProgress.currentIndex;
                const isLocked = i > pathProgress.currentIndex && !isCompleted;

                return (
                  <div
                    key={item.contentId}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-all ${
                      isCompleted
                        ? "border-green-200 bg-green-50/50 dark:border-green-800 dark:bg-green-950/30"
                        : isCurrent
                        ? "border-primary bg-primary/5 shadow-sm"
                        : "border-border/40 opacity-60"
                    }`}
                  >
                    {/* Step indicator */}
                    <div className="shrink-0">
                      {isCompleted ? (
                        <CheckCircle2 className="h-6 w-6 text-green-500" />
                      ) : isCurrent ? (
                        <div className="h-6 w-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold">
                          {i + 1}
                        </div>
                      ) : isLocked ? (
                        <Lock className="h-5 w-5 text-muted-foreground" />
                      ) : (
                        <Circle className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>

                    {/* Content info */}
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-medium truncate ${isCompleted ? "line-through text-muted-foreground" : "text-foreground"}`}>
                        {item.contentTitle}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge variant="outline" className="text-[10px]">{item.contentType}</Badge>
                        {item.isRequired && <span className="text-[10px] text-muted-foreground">Required</span>}
                        {isCompleted && item.completedAt && (
                          <span className="text-[10px] text-green-600">Completed</span>
                        )}
                        {isCurrent && item.completionPercentage > 0 && item.completionPercentage < 100 && (
                          <span className="text-[10px] text-primary">{Math.round(item.completionPercentage)}% done</span>
                        )}
                      </div>
                    </div>

                    {/* Action */}
                    {(isCurrent || isCompleted) && (
                      <Button
                        size="sm"
                        variant={isCurrent ? "default" : "outline"}
                        className="shrink-0 cursor-pointer gap-1"
                        onClick={() => {
                          setSelectedPathId(null);
                          navigate(`/preview/${item.contentId}`);
                        }}
                      >
                        <Play className="h-3 w-3" />
                        {isCompleted ? "Review" : isCurrent && item.completionPercentage > 0 ? "Continue" : "Start"}
                      </Button>
                    )}
                  </div>
                );
              })}

              {/* All done message */}
              {pathProgress.completed === pathProgress.total && pathProgress.total > 0 && (
                <div className="text-center py-4 mt-2">
                  <p className="text-lg font-semibold text-green-600">All steps complete!</p>
                  <p className="text-sm text-muted-foreground">Great work finishing this learning path.</p>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
