import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { GraduationCap, Target, TrendingUp, Trophy } from "lucide-react";

type ParentViewData = {
  studentName: string;
  totalClasses: number;
  totalAssignments: number;
  completedAssignments: number;
  avgCompletion: number;
  scores: Array<{
    contentTitle: string;
    className: string;
    bestPercentage: number;
    bestScore: number;
    bestTotal: number;
  }>;
};

function getScoreColor(pct: number) {
  if (pct >= 80) return "text-green-600";
  if (pct >= 60) return "text-yellow-600";
  return "text-red-600";
}

export default function ParentViewPage() {
  const params = useParams();
  const token = params.token;

  const { data, isLoading, error } = useQuery<ParentViewData>({
    queryKey: ["/api/parent-view", token],
    queryFn: async () => {
      const res = await fetch(`/api/parent-view/${token}`);
      if (!res.ok) throw new Error("Invalid or expired link");
      return res.json();
    },
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-3xl mx-auto space-y-6">
          <Skeleton className="h-16 w-full" />
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-24" />)}
          </div>
          <Skeleton className="h-64" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <Card className="max-w-md">
          <CardContent className="py-12 text-center">
            <p className="text-lg font-medium">Invalid or Expired Link</p>
            <p className="text-sm text-muted-foreground mt-2">
              This progress link is no longer valid. Please ask the student for a new link.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="max-w-3xl mx-auto px-6 py-4">
          <div className="flex items-center gap-3">
            <img src="/favicon.png" alt="OECS Logo" className="h-9 w-9 rounded-lg" />
            <div>
              <h1 className="text-lg font-bold text-foreground">Student Progress Report</h1>
              <p className="text-sm text-muted-foreground">{data.studentName}</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-8">
        {/* Summary */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4 text-center">
              <GraduationCap className="h-6 w-6 text-blue-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{data.totalClasses}</div>
              <p className="text-xs text-muted-foreground">Classes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-purple-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{data.completedAssignments}/{data.totalAssignments}</div>
              <p className="text-xs text-muted-foreground">Completed</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-emerald-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">{data.avgCompletion}%</div>
              <p className="text-xs text-muted-foreground">Avg Progress</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <Trophy className="h-6 w-6 text-amber-500 mx-auto mb-2" />
              <div className="text-2xl font-bold">
                {data.scores.length > 0
                  ? `${Math.round(data.scores.reduce((s, sc) => s + sc.bestPercentage, 0) / data.scores.length)}%`
                  : "—"}
              </div>
              <p className="text-xs text-muted-foreground">Avg Score</p>
            </CardContent>
          </Card>
        </div>

        {/* Overall Progress */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Overall Progress</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={data.avgCompletion} className="flex-1 h-3" />
              <span className="text-lg font-bold tabular-nums">{data.avgCompletion}%</span>
            </div>
          </CardContent>
        </Card>

        {/* Scores */}
        {data.scores.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Quiz & Activity Scores</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.scores.map((s, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
                    <div>
                      <p className="font-medium text-sm">{s.contentTitle}</p>
                      <p className="text-xs text-muted-foreground">{s.className}</p>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold ${getScoreColor(s.bestPercentage)}`}>
                        {s.bestPercentage}%
                      </span>
                      <p className="text-xs text-muted-foreground">{s.bestScore}/{s.bestTotal}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        <p className="text-xs text-muted-foreground text-center mt-8">
          This is a read-only view generated by OECS Content Creator.
        </p>
      </main>
    </div>
  );
}
