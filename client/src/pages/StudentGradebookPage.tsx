import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import {
  Menu,
  Trophy,
  BookOpen,
  CheckCircle2,
  Clock,
  AlertCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink,
} from "lucide-react";
import { format, isPast } from "date-fns";

type GradeItem = {
  contentId: string;
  contentTitle: string;
  contentType: string;
  dueDate: string | null;
  bestScore: number | null;
  bestTotal: number | null;
  bestPercentage: number | null;
  attempts: number;
  completionPercentage: number;
  completedAt: string | null;
};

type ClassGrades = {
  classId: string;
  className: string;
  subject: string | null;
  gradeLevel: string | null;
  assignments: GradeItem[];
  classAverage: number | null;
  totalAssignments: number;
  completedAssignments: number;
};

type GradebookData = {
  classes: ClassGrades[];
  individualAssignments: GradeItem[];
  overall: {
    average: number | null;
    totalAssignments: number;
    totalGraded: number;
    totalCompleted: number;
  } | null;
};

function getGradeColor(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

function getGradeBg(pct: number | null) {
  if (pct === null) return "bg-muted/50";
  if (pct >= 80) return "bg-green-50 dark:bg-green-900/20";
  if (pct >= 60) return "bg-amber-50 dark:bg-amber-900/20";
  return "bg-red-50 dark:bg-red-900/20";
}

function getGradeLabel(pct: number) {
  if (pct >= 90) return "Excellent";
  if (pct >= 80) return "Great";
  if (pct >= 70) return "Good";
  if (pct >= 60) return "Fair";
  return "Needs Work";
}

export default function StudentGradebookPage() {
  const { user } = useAuth();
  const [, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedClassId, setExpandedClassId] = useState<string | null>(null);

  const { data: gradebook, isLoading, isError } = useQuery<GradebookData>({
    queryKey: ["/api/student/gradebook"],
    staleTime: 30_000,
    retry: 2,
  });

  const toggleClass = (classId: string) => {
    setExpandedClassId(prev => prev === classId ? null : classId);
  };

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
          <h1 className="text-lg font-semibold">My Grades</h1>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          <div className="mb-8">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">My Grades</h2>
            <p className="text-sm text-muted-foreground mt-1">
              View your scores and progress across all classes and assignments
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-28 rounded-lg" />)}
              </div>
              {[1, 2].map(i => <Skeleton key={i} className="h-48 rounded-lg" />)}
            </div>
          ) : isError ? (
            <Card className="border-destructive/30">
              <CardContent className="py-12 text-center">
                <AlertCircle className="h-12 w-12 text-destructive mx-auto mb-3" />
                <p className="text-lg font-medium">Failed to load grades</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Please try again later.</p>
                <Button variant="outline" onClick={() => window.location.reload()}>Try Again</Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Overall Summary */}
              {gradebook?.overall && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                  <Card className="border-border/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Overall Average</p>
                          <p className={`text-3xl font-bold mt-1 ${getGradeColor(gradebook.overall.average)}`}>
                            {gradebook.overall.average !== null ? `${gradebook.overall.average}%` : "—"}
                          </p>
                        </div>
                        <div className={`h-12 w-12 rounded-full flex items-center justify-center ${getGradeBg(gradebook.overall.average)}`}>
                          <Trophy className={`h-6 w-6 ${getGradeColor(gradebook.overall.average)}`} />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Completed</p>
                          <p className="text-3xl font-bold mt-1">
                            {gradebook.overall.totalCompleted}/{gradebook.overall.totalAssignments}
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                          <CheckCircle2 className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  <Card className="border-border/40">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">Graded</p>
                          <p className="text-3xl font-bold mt-1">
                            {gradebook.overall.totalGraded}/{gradebook.overall.totalAssignments}
                          </p>
                        </div>
                        <div className="h-12 w-12 rounded-full bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                          <BookOpen className="h-6 w-6 text-purple-600 dark:text-purple-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Per-class grades */}
              {gradebook?.classes && gradebook.classes.length > 0 ? (
                <div className="space-y-4">
                  {gradebook.classes.map(cls => {
                    const isExpanded = expandedClassId === cls.classId;
                    return (
                      <Card key={cls.classId} className="border-border/40">
                        <button
                          className="w-full p-5 flex items-center gap-4 text-left hover:bg-muted/30 transition-colors cursor-pointer"
                          onClick={() => toggleClass(cls.classId)}
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-foreground">{cls.className}</h3>
                              {cls.subject && <Badge variant="outline" className="text-[10px]">{cls.subject}</Badge>}
                            </div>
                            <div className="flex items-center gap-4 mt-1.5">
                              <span className="text-sm text-muted-foreground">
                                {cls.completedAssignments}/{cls.totalAssignments} completed
                              </span>
                              {cls.classAverage !== null && (
                                <span className={`text-sm font-medium ${getGradeColor(cls.classAverage)}`}>
                                  Average: {cls.classAverage}%
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            {cls.classAverage !== null && (
                              <div className={`text-2xl font-bold ${getGradeColor(cls.classAverage)}`}>
                                {cls.classAverage}%
                              </div>
                            )}
                            {isExpanded ? <ChevronUp className="h-5 w-5 text-muted-foreground" /> : <ChevronDown className="h-5 w-5 text-muted-foreground" />}
                          </div>
                        </button>

                        {isExpanded && (
                          <div className="px-5 pb-5 border-t border-border/40">
                            <div className="space-y-3 mt-4">
                              {cls.assignments.map(grade => (
                                <GradeRow key={grade.contentId} grade={grade} onNavigate={navigate} />
                              ))}
                              {cls.assignments.length === 0 && (
                                <p className="text-sm text-muted-foreground text-center py-4">No assignments in this class yet.</p>
                              )}
                            </div>
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              ) : (
                <Card className="border-border/40">
                  <CardContent className="py-16 text-center">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="text-lg font-medium">No classes yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      You'll see your grades here once you're enrolled in a class with assignments.
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Individual assignments */}
              {gradebook?.individualAssignments && gradebook.individualAssignments.length > 0 && (
                <div className="mt-6">
                  <h3 className="text-lg font-semibold mb-3">Individual Assignments</h3>
                  <Card className="border-border/40">
                    <CardContent className="p-5 space-y-3">
                      {gradebook.individualAssignments.map(grade => (
                        <GradeRow key={grade.contentId} grade={grade} onNavigate={navigate} />
                      ))}
                    </CardContent>
                  </Card>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

function GradeRow({ grade, onNavigate }: { grade: GradeItem; onNavigate: (path: string) => void }) {
  const isOverdue = grade.dueDate && isPast(new Date(grade.dueDate)) && grade.completionPercentage < 100;

  return (
    <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/20 hover:bg-muted/40 transition-colors">
      {/* Score circle */}
      <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${getGradeBg(grade.bestPercentage)}`}>
        {grade.bestPercentage !== null ? (
          <span className={`text-sm font-bold ${getGradeColor(grade.bestPercentage)}`}>
            {grade.bestPercentage}%
          </span>
        ) : grade.completionPercentage >= 100 ? (
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </div>

      {/* Content info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium truncate">{grade.contentTitle}</p>
          <Badge variant="outline" className="text-[9px] shrink-0">{grade.contentType}</Badge>
        </div>
        <div className="flex items-center gap-3 mt-1">
          {grade.bestPercentage !== null && (
            <span className={`text-xs font-medium ${getGradeColor(grade.bestPercentage)}`}>
              {getGradeLabel(grade.bestPercentage)} ({grade.bestScore}/{grade.bestTotal})
            </span>
          )}
          {grade.attempts > 0 && (
            <span className="text-xs text-muted-foreground">
              {grade.attempts} attempt{grade.attempts !== 1 ? "s" : ""}
            </span>
          )}
          {grade.dueDate && (
            <span className={`text-xs flex items-center gap-1 ${isOverdue ? "text-red-600 dark:text-red-400" : "text-muted-foreground"}`}>
              <Clock className="h-3 w-3" />
              {isOverdue ? "Overdue" : `Due ${format(new Date(grade.dueDate), "MMM d")}`}
            </span>
          )}
        </div>
        {grade.completionPercentage > 0 && grade.completionPercentage < 100 && (
          <Progress value={grade.completionPercentage} className="h-1.5 mt-2 max-w-xs" />
        )}
      </div>

      {/* Action */}
      <Button
        variant="ghost"
        size="sm"
        className="shrink-0 gap-1 cursor-pointer"
        onClick={() => onNavigate(`/preview/${grade.contentId}`)}
      >
        {grade.completionPercentage >= 100 ? "Review" : "Open"}
        <ExternalLink className="h-3 w-3" />
      </Button>
    </div>
  );
}
