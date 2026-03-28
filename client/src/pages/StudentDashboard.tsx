import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import {
  BookOpen,
  CheckCircle2,
  Clock,
  Trophy,
  Target,
  Play,
  BarChart3,
  GraduationCap,
  Menu,
  TrendingUp,
} from "lucide-react";
import { format, formatDistanceToNow, isPast } from "date-fns";

type Assignment = {
  assignmentId: string;
  contentId: string;
  contentTitle: string;
  contentType: string;
  classId: string;
  className: string;
  assignedAt: string;
  dueDate: string | null;
  instructions: string | null;
  completionPercentage: number;
  completedAt: string | null;
  lastAccessedAt: string | null;
};

type Score = {
  contentId: string;
  contentTitle: string;
  contentType: string;
  className: string;
  attempts: number;
  bestScore: number;
  bestTotal: number;
  bestPercentage: number;
  latestAttemptDate: string;
};

type ProgressSummary = {
  summary: {
    totalClasses: number;
    totalAssignments: number;
    completedAssignments: number;
    avgCompletion: number;
    inProgressAssignments: number;
  };
  progress: Array<{
    contentId: string;
    contentTitle: string;
    contentType: string;
    className: string;
    dueDate: string | null;
    completionPercentage: number;
    completedAt: string | null;
    lastAccessedAt: string | null;
  }>;
};

function getScoreColor(percentage: number) {
  if (percentage >= 80) return "text-green-600 dark:text-green-400";
  if (percentage >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(percentage: number) {
  if (percentage >= 80) return "bg-green-50 dark:bg-green-900/20";
  if (percentage >= 60) return "bg-yellow-50 dark:bg-yellow-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

function getScoreLabel(percentage: number) {
  if (percentage >= 90) return "Excellent";
  if (percentage >= 80) return "Great";
  if (percentage >= 70) return "Good";
  if (percentage >= 60) return "Fair";
  return "Needs Work";
}

export default function StudentDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: assignments, isLoading: loadingAssignments } = useQuery<Assignment[]>({
    queryKey: ["/api/student/my-assignments"],
  });

  const { data: scores, isLoading: loadingScores } = useQuery<Score[]>({
    queryKey: ["/api/student/my-scores"],
  });

  const { data: progressData, isLoading: loadingProgress } = useQuery<ProgressSummary>({
    queryKey: ["/api/student/my-progress"],
  });

  const summary = progressData?.summary;

  const pendingAssignments = assignments?.filter(a => a.completionPercentage < 100) || [];
  const completedAssignments = assignments?.filter(a => a.completionPercentage >= 100) || [];
  const overdueAssignments = pendingAssignments.filter(a => a.dueDate && isPast(new Date(a.dueDate)));

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
        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border/40 bg-card px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu" className="cursor-pointer">
            <Menu className="h-5 w-5" />
          </Button>
          <h1 className="text-lg font-semibold text-foreground">My Learning</h1>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          {/* Welcome */}
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">
              Welcome back, {user?.fullName?.split(" ")[0]}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Here's an overview of your learning progress
            </p>
          </div>

          {/* Summary Stats */}
          {loadingProgress ? (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-28" />)}
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">My Classes</span>
                    <div className="h-9 w-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                      <GraduationCap className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{summary?.totalClasses ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Enrolled classes</p>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Assignments</span>
                    <div className="h-9 w-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                      <Target className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{summary?.completedAssignments ?? 0}/{summary?.totalAssignments ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">Completed</p>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">Avg. Progress</span>
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 flex items-center justify-center">
                      <TrendingUp className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{summary?.avgCompletion ?? 0}%</div>
                  <p className="text-xs text-muted-foreground mt-1">Overall completion</p>
                </CardContent>
              </Card>

              <Card className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">To Do</span>
                    <div className="h-9 w-9 rounded-lg bg-orange-50 dark:bg-orange-900/20 flex items-center justify-center">
                      <Clock className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{summary?.inProgressAssignments ?? 0}</div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {overdueAssignments.length > 0 && (
                      <span className="text-red-500">{overdueAssignments.length} overdue</span>
                    )}
                    {overdueAssignments.length === 0 && "Pending assignments"}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabbed Content */}
          <Tabs defaultValue="assignments" className="space-y-6">
            <TabsList className="grid w-full grid-cols-3 max-w-md">
              <TabsTrigger value="assignments" className="cursor-pointer">
                <BookOpen className="h-4 w-4 mr-2" />
                Assignments
              </TabsTrigger>
              <TabsTrigger value="scores" className="cursor-pointer">
                <Trophy className="h-4 w-4 mr-2" />
                My Scores
              </TabsTrigger>
              <TabsTrigger value="progress" className="cursor-pointer">
                <BarChart3 className="h-4 w-4 mr-2" />
                Progress
              </TabsTrigger>
            </TabsList>

            {/* Assignments Tab */}
            <TabsContent value="assignments" className="space-y-4">
              {loadingAssignments ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-28" />)}</div>
              ) : pendingAssignments.length === 0 && completedAssignments.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="py-16 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">No assignments yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Your teacher hasn't assigned any content to you yet.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {pendingAssignments.length > 0 && (
                    <div>
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">To Do ({pendingAssignments.length})</h3>
                      <div className="space-y-3">
                        {pendingAssignments.map(a => (
                          <Card key={a.assignmentId} className={`border-border/40 ${a.dueDate && isPast(new Date(a.dueDate)) ? "border-l-4 border-l-red-500" : ""}`}>
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <h4 className="font-medium text-foreground truncate">{a.contentTitle}</h4>
                                  <div className="flex flex-wrap items-center gap-2 mt-1.5">
                                    <Badge variant="outline" className="text-xs">{a.contentType}</Badge>
                                    <span className="text-xs text-muted-foreground">{a.className}</span>
                                    {a.dueDate && (
                                      <span className={`text-xs ${isPast(new Date(a.dueDate)) ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                                        Due {formatDistanceToNow(new Date(a.dueDate), { addSuffix: true })}
                                      </span>
                                    )}
                                  </div>
                                  {a.instructions && (
                                    <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{a.instructions}</p>
                                  )}
                                  <div className="flex items-center gap-3 mt-3">
                                    <Progress value={a.completionPercentage} className="flex-1 h-2" />
                                    <span className="text-xs font-medium text-muted-foreground tabular-nums w-10 text-right">{Math.round(a.completionPercentage)}%</span>
                                  </div>
                                </div>
                                <Button size="sm" className="cursor-pointer gap-1.5 shrink-0" onClick={() => navigate(`/preview/${a.contentId}`)}>
                                  <Play className="h-3.5 w-3.5" />
                                  {a.completionPercentage > 0 ? "Continue" : "Start"}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}

                  {completedAssignments.length > 0 && (
                    <div className="mt-6">
                      <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Completed ({completedAssignments.length})</h3>
                      <div className="space-y-3">
                        {completedAssignments.map(a => (
                          <Card key={a.assignmentId} className="border-border/40 border-l-4 border-l-green-500">
                            <CardContent className="p-5">
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2">
                                    <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" />
                                    <h4 className="font-medium text-foreground truncate">{a.contentTitle}</h4>
                                  </div>
                                  <div className="flex items-center gap-2 mt-1.5 ml-6">
                                    <Badge variant="outline" className="text-xs">{a.contentType}</Badge>
                                    <span className="text-xs text-muted-foreground">{a.className}</span>
                                    {a.completedAt && (
                                      <span className="text-xs text-muted-foreground">
                                        Completed {format(new Date(a.completedAt), "MMM d, yyyy")}
                                      </span>
                                    )}
                                  </div>
                                </div>
                                <Button size="sm" variant="outline" className="cursor-pointer gap-1.5 shrink-0" onClick={() => navigate(`/preview/${a.contentId}`)}>
                                  <Play className="h-3.5 w-3.5" />
                                  Review
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </TabsContent>

            {/* Scores Tab */}
            <TabsContent value="scores" className="space-y-4">
              {loadingScores ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
              ) : !scores || scores.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="py-16 text-center">
                    <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">No scores yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Complete quizzes and activities to see your scores here.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {scores.map(s => (
                    <Card key={s.contentId} className="border-border/40">
                      <CardContent className="p-5">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">{s.contentTitle}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="outline" className="text-xs">{s.contentType}</Badge>
                              <span className="text-xs text-muted-foreground">{s.className}</span>
                              <span className="text-xs text-muted-foreground">{s.attempts} attempt{s.attempts !== 1 ? "s" : ""}</span>
                            </div>
                          </div>
                          <div className="text-right shrink-0">
                            <div className={`text-2xl font-bold ${getScoreColor(s.bestPercentage)}`}>
                              {s.bestPercentage}%
                            </div>
                            <div className="flex items-center gap-1.5 mt-0.5 justify-end">
                              <div className={`text-xs px-1.5 py-0.5 rounded ${getScoreBg(s.bestPercentage)} ${getScoreColor(s.bestPercentage)} font-medium`}>
                                {getScoreLabel(s.bestPercentage)}
                              </div>
                            </div>
                            <p className="text-xs text-muted-foreground mt-1">{s.bestScore}/{s.bestTotal} correct</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            {/* Progress Tab */}
            <TabsContent value="progress" className="space-y-4">
              {loadingProgress ? (
                <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}</div>
              ) : !progressData || progressData.progress.length === 0 ? (
                <Card className="border-border/40">
                  <CardContent className="py-16 text-center">
                    <BarChart3 className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium text-foreground">No progress yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Start working on your assignments to track progress.</p>
                  </CardContent>
                </Card>
              ) : (
                <>
                  {/* Overall progress bar */}
                  <Card className="border-border/40">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base">Overall Progress</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4">
                        <Progress value={summary?.avgCompletion ?? 0} className="flex-1 h-3" />
                        <span className="text-lg font-bold text-foreground tabular-nums">{summary?.avgCompletion ?? 0}%</span>
                      </div>
                      <p className="text-sm text-muted-foreground mt-2">
                        {summary?.completedAssignments ?? 0} of {summary?.totalAssignments ?? 0} assignments completed
                      </p>
                    </CardContent>
                  </Card>

                  {/* Per-content progress */}
                  <div className="space-y-2">
                    {progressData.progress.map(p => (
                      <Card key={p.contentId} className="border-border/40">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-foreground truncate">{p.contentTitle}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-muted-foreground">{p.className}</span>
                                {p.dueDate && (
                                  <span className={`text-xs ${isPast(new Date(p.dueDate)) && p.completionPercentage < 100 ? "text-red-500" : "text-muted-foreground"}`}>
                                    Due {format(new Date(p.dueDate), "MMM d")}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              {p.completionPercentage >= 100 ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <span className="text-sm font-medium text-muted-foreground tabular-nums">{Math.round(p.completionPercentage)}%</span>
                              )}
                            </div>
                          </div>
                          <Progress value={p.completionPercentage} className="h-1.5" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </div>
  );
}
