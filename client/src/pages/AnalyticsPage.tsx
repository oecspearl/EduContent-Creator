import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BookOpen,
  LogOut,
  ArrowLeft,
  TrendingUp,
  Users,
  Target,
  Activity,
  Eye,
  HelpCircle,
  BarChart3,
  FileQuestion,
  Layers,
  Video,
  Image as ImageIcon,
  Move,
  PenTool,
  Brain,
  BookOpenCheck,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { useState } from "react";

function getInitials(name: string): string {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const contentTypeConfig: Record<string, { icon: typeof FileQuestion; label: string; color: string }> = {
  quiz: { icon: FileQuestion, label: "Quiz", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  flashcard: { icon: Layers, label: "Flashcard", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  "interactive-video": { icon: Video, label: "Interactive Video", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  "image-hotspot": { icon: ImageIcon, label: "Image Hotspot", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  "drag-drop": { icon: Move, label: "Drag & Drop", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
  "fill-blanks": { icon: PenTool, label: "Fill in the Blanks", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  "memory-game": { icon: Brain, label: "Memory Game", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  "interactive-book": { icon: BookOpenCheck, label: "Interactive Book", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
};

export default function AnalyticsPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const [selectedContentId, setSelectedContentId] = useState<string | null>(null);

  const { data: analytics, isLoading } = useQuery<any[]>({
    queryKey: ["/api/analytics/overview"],
  });

  const { data: learners, isLoading: isLoadingLearners } = useQuery<any[]>({
    queryKey: ["/api/analytics/content", selectedContentId, "learners"],
    enabled: !!selectedContentId,
  });

  const handleLogout = async () => {
    await logout();
  };

  const selectedContent = analytics?.find(item => item.contentId === selectedContentId);

  // Calculate summary statistics
  const totalViews = analytics?.reduce((sum, item) => sum + item.uniqueViewers, 0) || 0;
  const totalContent = analytics?.length || 0;
  const publishedContent = analytics?.filter(item => item.isPublished).length || 0;
  const avgCompletion = analytics && analytics.length > 0
    ? analytics.reduce((sum, item) => sum + item.avgCompletion, 0) / analytics.length
    : 0;
  const totalInteractions = analytics?.reduce((sum, item) => sum + item.totalInteractions, 0) || 0;

  // Prepare chart data - top 10 by views
  const chartData = analytics
    ?.slice()
    .sort((a, b) => b.uniqueViewers - a.uniqueViewers)
    .slice(0, 10)
    .map(item => ({
      name: item.title.length > 20 ? item.title.substring(0, 20) + '...' : item.title,
      viewers: item.uniqueViewers,
      completion: Math.round(item.avgCompletion),
    })) || [];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-primary rounded-lg flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">OECS Content Creator</h1>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/help")}
              data-testid="button-help"
            >
              <HelpCircle className="h-5 w-5" />
            </Button>
            <ThemeToggle />
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarFallback className="bg-primary text-primary-foreground">
                  {user ? getInitials(user.fullName) : "U"}
                </AvatarFallback>
              </Avatar>
              <div className="hidden md:block">
                <p className="text-sm font-medium text-foreground">{user?.fullName}</p>
                <p className="text-xs text-muted-foreground">{user?.role}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout} data-testid="button-logout">
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">Analytics Dashboard</h2>
          <p className="text-muted-foreground">
            Track performance and engagement for your educational content
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="h-32" />
              ))}
            </div>
            <Skeleton className="h-96" />
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                  <BarChart3 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-content">{totalContent}</div>
                  <p className="text-xs text-muted-foreground">
                    {publishedContent} published
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                  <Eye className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-views">{totalViews}</div>
                  <p className="text-xs text-muted-foreground">
                    Unique learners
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Completion</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-avg-completion">
                    {avgCompletion.toFixed(1)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Across all content
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between gap-2 space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Interactions</CardTitle>
                  <Activity className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold" data-testid="text-total-interactions">
                    {totalInteractions}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All engagement events
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Chart */}
            {chartData.length > 0 && (
              <Card className="mb-8">
                <CardHeader>
                  <CardTitle>Top Content by Views</CardTitle>
                  <CardDescription>Viewer count and average completion for your most popular content</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-80">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis 
                          dataKey="name" 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <YAxis 
                          className="text-xs"
                          tick={{ fill: 'hsl(var(--muted-foreground))' }}
                        />
                        <Tooltip 
                          contentStyle={{ 
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '6px',
                            color: 'hsl(var(--card-foreground))'
                          }}
                        />
                        <Legend />
                        <Bar dataKey="viewers" fill="hsl(var(--primary))" name="Unique Viewers" />
                        <Bar dataKey="completion" fill="hsl(var(--accent))" name="Avg Completion %" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Content Table */}
            <Card>
              <CardHeader>
                <CardTitle>Content Performance</CardTitle>
                <CardDescription>Detailed analytics for all your content</CardDescription>
              </CardHeader>
              <CardContent>
                {!analytics || analytics.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-foreground mb-2">No Analytics Yet</h3>
                    <p className="text-muted-foreground mb-6">
                      Create and publish content to start tracking engagement and performance
                    </p>
                    <Button onClick={() => navigate("/dashboard")} data-testid="button-go-to-dashboard">
                      Go to Dashboard
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Title</TableHead>
                          <TableHead>Type</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Viewers</TableHead>
                          <TableHead className="text-right">Avg Completion</TableHead>
                          <TableHead className="text-right">Interactions</TableHead>
                          <TableHead className="text-right">Created</TableHead>
                          <TableHead className="text-right">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {analytics.map((item) => {
                          const config = contentTypeConfig[item.type] || contentTypeConfig.quiz;
                          const Icon = config.icon;
                          return (
                            <TableRow key={item.contentId} data-testid={`row-analytics-${item.contentId}`}>
                              <TableCell className="font-medium">
                                <div className="flex items-center gap-2">
                                  <div className={`h-8 w-8 rounded ${config.color} flex items-center justify-center flex-shrink-0`}>
                                    <Icon className="h-4 w-4" />
                                  </div>
                                  <span className="truncate max-w-xs">{item.title}</span>
                                </div>
                              </TableCell>
                              <TableCell>
                                <Badge variant="outline">{config.label}</Badge>
                              </TableCell>
                              <TableCell>
                                {item.isPublished ? (
                                  <Badge variant="default">Published</Badge>
                                ) : (
                                  <Badge variant="secondary">Draft</Badge>
                                )}
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-viewers-${item.contentId}`}>
                                {item.uniqueViewers}
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-completion-${item.contentId}`}>
                                {item.avgCompletion.toFixed(1)}%
                              </TableCell>
                              <TableCell className="text-right" data-testid={`text-interactions-${item.contentId}`}>
                                {item.totalInteractions}
                              </TableCell>
                              <TableCell className="text-right text-muted-foreground text-sm">
                                {format(new Date(item.createdAt), "MMM d, yyyy")}
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setSelectedContentId(item.contentId)}
                                  data-testid={`button-view-learners-${item.contentId}`}
                                >
                                  <Users className="h-4 w-4 mr-2" />
                                  View Learners
                                </Button>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>

      {/* Learner Details Dialog */}
      <Dialog open={!!selectedContentId} onOpenChange={(open) => !open && setSelectedContentId(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Individual Learner Performance
            </DialogTitle>
            <DialogDescription>
              {selectedContent && (
                <span>Viewing learner data for: <strong>{selectedContent.title}</strong></span>
              )}
            </DialogDescription>
          </DialogHeader>

          {isLoadingLearners ? (
            <div className="space-y-4">
              {[1, 2, 3].map(i => (
                <Skeleton key={i} className="h-20" />
              ))}
            </div>
          ) : !learners || learners.length === 0 ? (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Learner Data</h3>
              <p className="text-muted-foreground">
                No authenticated users have interacted with this content yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {learners.map((learner, idx) => (
                <Card key={learner.userId} data-testid={`card-learner-${idx}`}>
                  <CardContent className="pt-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12">
                          <AvatarFallback className="bg-primary text-primary-foreground">
                            {getInitials(learner.displayName)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h4 className="font-semibold text-foreground" data-testid={`text-learner-name-${idx}`}>
                            {learner.displayName}
                          </h4>
                          <p className="text-sm text-muted-foreground" data-testid={`text-learner-email-${idx}`}>
                            {learner.email}
                          </p>
                          {learner.role && (
                            <Badge variant="outline" className="mt-1">{learner.role}</Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                          <Clock className="h-3 w-3" />
                          Last accessed: {format(new Date(learner.lastAccessedAt), "MMM d, yyyy")}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          First accessed: {format(new Date(learner.firstAccessedAt), "MMM d, yyyy")}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {/* Completion */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Target className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Completion</span>
                        </div>
                        <div className="text-2xl font-bold" data-testid={`text-learner-completion-${idx}`}>
                          {learner.completionPercentage.toFixed(1)}%
                        </div>
                        {learner.completedAt && (
                          <div className="flex items-center gap-1 mt-1 text-xs text-muted-foreground">
                            <CheckCircle2 className="h-3 w-3" />
                            Completed {format(new Date(learner.completedAt), "MMM d")}
                          </div>
                        )}
                      </div>

                      {/* Interactions */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <Activity className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Interactions</span>
                        </div>
                        <div className="text-2xl font-bold" data-testid={`text-learner-interactions-${idx}`}>
                          {learner.totalInteractions}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          Total engagement events
                        </div>
                      </div>

                      {/* Quiz Performance */}
                      <div className="bg-muted rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-2">
                          <FileQuestion className="h-4 w-4 text-primary" />
                          <span className="text-sm font-medium">Quiz Attempts</span>
                        </div>
                        <div className="text-2xl font-bold" data-testid={`text-learner-quiz-attempts-${idx}`}>
                          {learner.quizAttempts.length}
                        </div>
                        {learner.quizAttempts.length > 0 && (
                          <div className="text-xs text-muted-foreground mt-1">
                            Best: {Math.max(...learner.quizAttempts.map((a: any) => parseFloat(a.percentage)))}%
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Quiz Attempt Details */}
                    {learner.quizAttempts.length > 0 && (
                      <div className="mt-4">
                        <h5 className="text-sm font-semibold mb-2">Recent Quiz Attempts</h5>
                        <div className="space-y-2">
                          {learner.quizAttempts.map((attempt: any, attemptIdx: number) => (
                            <div 
                              key={attemptIdx} 
                              className="flex items-center justify-between bg-muted rounded px-3 py-2 text-sm"
                              data-testid={`text-quiz-attempt-${idx}-${attemptIdx}`}
                            >
                              <span>
                                {attempt.score} / {attempt.totalQuestions} correct ({attempt.percentage}%)
                              </span>
                              <span className="text-muted-foreground">
                                {format(new Date(attempt.completedAt), "MMM d, yyyy h:mm a")}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
