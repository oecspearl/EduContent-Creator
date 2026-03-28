import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  BookOpen,
  Download,
  Menu,
  Users,
  Trophy,
  TrendingUp,
  ArrowUpDown,
} from "lucide-react";
import { format } from "date-fns";
import type { Class } from "@shared/schema";

type GradebookAssignment = {
  contentId: string;
  contentTitle: string;
  contentType: string;
  dueDate: string | null;
};

type StudentGrade = {
  bestScore: number | null;
  bestTotal: number | null;
  bestPercentage: number | null;
  attempts: number;
  completionPercentage: number;
  completedAt: string | null;
};

type StudentRow = {
  userId: string;
  fullName: string;
  email: string;
  grades: Record<string, StudentGrade>;
  averageScore: number | null;
  totalAttempted: number;
  totalAssignments: number;
};

type GradebookData = {
  classId: string;
  className: string;
  classSubject: string | null;
  classGradeLevel: string | null;
  assignments: GradebookAssignment[];
  students: StudentRow[];
  classAverage: number | null;
  totalStudents: number;
  totalAssignments: number;
};

function getScoreColor(pct: number | null) {
  if (pct === null) return "text-muted-foreground";
  if (pct >= 80) return "text-green-600 dark:text-green-400";
  if (pct >= 60) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

function getScoreBg(pct: number | null) {
  if (pct === null) return "";
  if (pct >= 80) return "bg-green-50 dark:bg-green-950/30";
  if (pct >= 60) return "bg-yellow-50 dark:bg-yellow-950/30";
  return "bg-red-50 dark:bg-red-950/30";
}

export default function GradebookPage() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedClassId, setSelectedClassId] = useState<string>("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<"name" | "average">("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  // Fetch teacher's classes
  const { data: classes, isLoading: loadingClasses } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
  });

  // Fetch gradebook data for selected class
  const { data: gradebook, isLoading: loadingGradebook } = useQuery<GradebookData>({
    queryKey: ["/api/gradebook", selectedClassId],
    enabled: !!selectedClassId,
  });

  // Auto-select first class
  if (classes && classes.length > 0 && !selectedClassId) {
    setSelectedClassId(classes[0].id);
  }

  const handleExportCSV = () => {
    if (!selectedClassId) return;
    window.open(`/api/gradebook/${selectedClassId}/export/csv`, "_blank");
  };

  const toggleSort = (column: "name" | "average") => {
    if (sortBy === column) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortBy(column);
      setSortDir(column === "average" ? "desc" : "asc");
    }
  };

  const sortedStudents = gradebook
    ? [...gradebook.students].sort((a, b) => {
        if (sortBy === "name") {
          const cmp = a.fullName.localeCompare(b.fullName);
          return sortDir === "asc" ? cmp : -cmp;
        }
        const aScore = a.averageScore ?? -1;
        const bScore = b.averageScore ?? -1;
        return sortDir === "asc" ? aScore - bScore : bScore - aScore;
      })
    : [];

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
          <h1 className="text-lg font-semibold text-foreground">Gradebook</h1>
          <ThemeToggle />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Gradebook</h2>
              <p className="text-sm text-muted-foreground mt-1">View and export student scores across all assignments</p>
            </div>
            <div className="flex items-center gap-3">
              {/* Class selector */}
              {loadingClasses ? (
                <Skeleton className="h-10 w-48" />
              ) : classes && classes.length > 0 ? (
                <Select value={selectedClassId} onValueChange={setSelectedClassId}>
                  <SelectTrigger className="w-56">
                    <SelectValue placeholder="Select a class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : null}
              {gradebook && gradebook.students.length > 0 && (
                <Button variant="outline" className="cursor-pointer gap-2" onClick={handleExportCSV}>
                  <Download className="h-4 w-4" />
                  Export CSV
                </Button>
              )}
            </div>
          </div>

          {/* No classes state */}
          {!loadingClasses && (!classes || classes.length === 0) && (
            <Card className="border-border/40">
              <CardContent className="py-16 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">No classes yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">Create a class and assign content to see grades here.</p>
                <Button className="cursor-pointer" onClick={() => navigate("/classes")}>Go to Classes</Button>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {selectedClassId && loadingGradebook && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}
              </div>
              <Skeleton className="h-96" />
            </div>
          )}

          {/* Gradebook content */}
          {gradebook && (
            <>
              {/* Summary cards */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                <Card className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Students</span>
                      <Users className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{gradebook.totalStudents}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Assignments</span>
                      <BookOpen className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="text-2xl font-bold">{gradebook.totalAssignments}</div>
                  </CardContent>
                </Card>
                <Card className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">Class Average</span>
                      <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className={`text-2xl font-bold ${getScoreColor(gradebook.classAverage)}`}>
                      {gradebook.classAverage !== null ? `${gradebook.classAverage}%` : "—"}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* No data states */}
              {gradebook.totalStudents === 0 && (
                <Card className="border-border/40">
                  <CardContent className="py-12 text-center">
                    <Users className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">No students enrolled</p>
                    <p className="text-sm text-muted-foreground mt-1">Add students to this class to start tracking grades.</p>
                  </CardContent>
                </Card>
              )}

              {gradebook.totalStudents > 0 && gradebook.totalAssignments === 0 && (
                <Card className="border-border/40">
                  <CardContent className="py-12 text-center">
                    <BookOpen className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium text-foreground">No assignments yet</p>
                    <p className="text-sm text-muted-foreground mt-1">Assign content to this class to start tracking grades.</p>
                  </CardContent>
                </Card>
              )}

              {/* Gradebook table */}
              {gradebook.totalStudents > 0 && gradebook.totalAssignments > 0 && (
                <Card className="border-border/40 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b bg-muted/30">
                          <th className="text-left p-3 font-semibold text-foreground sticky left-0 bg-muted/30 z-10 min-w-[180px]">
                            <button
                              className="flex items-center gap-1 cursor-pointer hover:text-primary"
                              onClick={() => toggleSort("name")}
                            >
                              Student
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                          {gradebook.assignments.map(a => (
                            <th key={a.contentId} className="text-center p-3 font-semibold text-foreground min-w-[120px]">
                              <div className="flex flex-col items-center gap-1">
                                <span className="truncate max-w-[110px]" title={a.contentTitle}>{a.contentTitle}</span>
                                <Badge variant="outline" className="text-[10px] font-normal">{a.contentType}</Badge>
                              </div>
                            </th>
                          ))}
                          <th className="text-center p-3 font-semibold text-foreground min-w-[90px] border-l">
                            <button
                              className="flex items-center gap-1 cursor-pointer hover:text-primary mx-auto"
                              onClick={() => toggleSort("average")}
                            >
                              Average
                              <ArrowUpDown className="h-3 w-3" />
                            </button>
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedStudents.map((student, rowIdx) => (
                          <tr key={student.userId} className={rowIdx % 2 === 0 ? "" : "bg-muted/10"}>
                            <td className="p-3 sticky left-0 bg-background z-10 border-r border-border/20">
                              <div>
                                <p className="font-medium text-foreground truncate max-w-[160px]">{student.fullName}</p>
                                <p className="text-xs text-muted-foreground truncate max-w-[160px]">{student.email}</p>
                              </div>
                            </td>
                            {gradebook.assignments.map(a => {
                              const grade = student.grades[a.contentId];
                              return (
                                <td key={a.contentId} className={`text-center p-3 ${getScoreBg(grade?.bestPercentage ?? null)}`}>
                                  {grade?.bestPercentage !== null && grade?.bestPercentage !== undefined ? (
                                    <div>
                                      <span className={`text-sm font-semibold ${getScoreColor(grade.bestPercentage)}`}>
                                        {grade.bestPercentage}%
                                      </span>
                                      <p className="text-[10px] text-muted-foreground mt-0.5">
                                        {grade.bestScore}/{grade.bestTotal}
                                        {grade.attempts > 1 && ` · ${grade.attempts} tries`}
                                      </p>
                                    </div>
                                  ) : grade?.completionPercentage > 0 ? (
                                    <div>
                                      <span className="text-xs text-muted-foreground">{Math.round(grade.completionPercentage)}% done</span>
                                    </div>
                                  ) : (
                                    <span className="text-xs text-muted-foreground">—</span>
                                  )}
                                </td>
                              );
                            })}
                            <td className={`text-center p-3 border-l font-bold ${getScoreColor(student.averageScore)}`}>
                              {student.averageScore !== null ? `${student.averageScore}%` : "—"}
                              {student.averageScore !== null && (
                                <p className="text-[10px] font-normal text-muted-foreground mt-0.5">
                                  {student.totalAttempted}/{student.totalAssignments} graded
                                </p>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      {/* Footer row with per-assignment averages */}
                      <tfoot>
                        <tr className="border-t-2 border-border bg-muted/20">
                          <td className="p-3 font-semibold text-foreground sticky left-0 bg-muted/20 z-10">
                            Class Average
                          </td>
                          {gradebook.assignments.map(a => {
                            const scores = sortedStudents
                              .map(s => s.grades[a.contentId]?.bestPercentage)
                              .filter((p): p is number => p !== null && p !== undefined);
                            const avg = scores.length > 0 ? Math.round(scores.reduce((s, v) => s + v, 0) / scores.length) : null;
                            return (
                              <td key={a.contentId} className={`text-center p-3 font-semibold ${getScoreColor(avg)}`}>
                                {avg !== null ? `${avg}%` : "—"}
                              </td>
                            );
                          })}
                          <td className={`text-center p-3 border-l font-bold text-lg ${getScoreColor(gradebook.classAverage)}`}>
                            {gradebook.classAverage !== null ? `${gradebook.classAverage}%` : "—"}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </Card>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
