import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  FileQuestion,
  Layers,
  Video,
  Image as ImageIcon,
  Move,
  PenTool,
  Brain,
  BookOpenCheck,
  Plus,
  Edit,
  Play,
  Share2,
  Trash2,
  Grid3x3,
  List,
  BookOpen,
  Search,
  Filter,
  X,
  BarChart3,
  Presentation,
  Users,
  TrendingUp,
  Eye,
  CheckCircle2,
  Menu,
  Copy
} from "lucide-react";
import { useLocation } from "wouter";
import type { H5pContent, ContentType } from "@shared/schema";
import { format } from "date-fns";
import { AssignToClassDialog } from "@/components/AssignToClassDialog";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardRightSidebar } from "@/components/DashboardRightSidebar";

const contentTypeConfig: Record<ContentType, {
  icon: typeof FileQuestion;
  label: string;
  pluralLabel: string;
  color: string;
  iconColor: string;
  iconBg: string;
  borderColor: string;
}> = {
  quiz: {
    icon: FileQuestion, label: "Quiz", pluralLabel: "Quizzes",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    iconColor: "text-blue-600 dark:text-blue-400",
    iconBg: "bg-blue-50 dark:bg-blue-900/20",
    borderColor: "border-l-blue-500",
  },
  flashcard: {
    icon: Layers, label: "Flashcard", pluralLabel: "Flashcards",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    iconColor: "text-purple-600 dark:text-purple-400",
    iconBg: "bg-purple-50 dark:bg-purple-900/20",
    borderColor: "border-l-purple-500",
  },
  "interactive-video": {
    icon: Video, label: "Interactive Video", pluralLabel: "Interactive Videos",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    iconColor: "text-green-600 dark:text-green-400",
    iconBg: "bg-green-50 dark:bg-green-900/20",
    borderColor: "border-l-green-500",
  },
  "image-hotspot": {
    icon: ImageIcon, label: "Image Hotspot", pluralLabel: "Image Hotspots",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300",
    iconColor: "text-orange-600 dark:text-orange-400",
    iconBg: "bg-orange-50 dark:bg-orange-900/20",
    borderColor: "border-l-orange-500",
  },
  "drag-drop": {
    icon: Move, label: "Drag & Drop", pluralLabel: "Drag & Drop",
    color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300",
    iconColor: "text-pink-600 dark:text-pink-400",
    iconBg: "bg-pink-50 dark:bg-pink-900/20",
    borderColor: "border-l-pink-500",
  },
  "fill-blanks": {
    icon: PenTool, label: "Fill in the Blanks", pluralLabel: "Fill in the Blanks",
    color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300",
    iconColor: "text-cyan-600 dark:text-cyan-400",
    iconBg: "bg-cyan-50 dark:bg-cyan-900/20",
    borderColor: "border-l-cyan-500",
  },
  "memory-game": {
    icon: Brain, label: "Memory Game", pluralLabel: "Memory Games",
    color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300",
    iconColor: "text-amber-600 dark:text-amber-400",
    iconBg: "bg-amber-50 dark:bg-amber-900/20",
    borderColor: "border-l-amber-500",
  },
  "interactive-book": {
    icon: BookOpenCheck, label: "Interactive Book", pluralLabel: "Interactive Books",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    iconColor: "text-indigo-600 dark:text-indigo-400",
    iconBg: "bg-indigo-50 dark:bg-indigo-900/20",
    borderColor: "border-l-indigo-500",
  },
  "video-finder": {
    icon: Search, label: "Video Finder", pluralLabel: "Video Finders",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    iconBg: "bg-emerald-50 dark:bg-emerald-900/20",
    borderColor: "border-l-emerald-500",
  },
  "presentation": {
    icon: Presentation, label: "Presentation", pluralLabel: "Presentations",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300",
    iconColor: "text-sky-600 dark:text-sky-400",
    iconBg: "bg-sky-50 dark:bg-sky-900/20",
    borderColor: "border-l-sky-500",
  },
};

export default function Dashboard() {
  const { user, logout } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [gradeFilter, setGradeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [contentToDelete, setContentToDelete] = useState<{ id: string; title: string } | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Build query key with filters
  const filters: Record<string, string> = {};
  if (searchQuery) filters.search = searchQuery;
  if (typeFilter !== "all") filters.type = typeFilter;
  if (subjectFilter !== "all") filters.subject = subjectFilter;
  if (gradeFilter !== "all") filters.grade = gradeFilter;
  if (tagFilter) filters.tags = tagFilter;
  if (startDate) filters.startDate = startDate;
  if (endDate) filters.endDate = endDate;

  const hasFilters = Object.keys(filters).length > 0;

  const { data: contents, isLoading } = useQuery<H5pContent[]>({
    queryKey: hasFilters ? ["/api/content", filters] : ["/api/content"],
  });

  // Extract unique subjects and grades from content data
  const extractSubjectAndGrade = (content: H5pContent): { subject: string | null; grade: string | null } => {
    try {
      const data = content.data as any;

      if (content.type === "video-finder" && data?.searchCriteria) {
        return {
          subject: data.searchCriteria.subject || null,
          grade: data.searchCriteria.gradeLevel || null,
        };
      }

      if (content.type === "presentation" && data) {
        return {
          subject: null,
          grade: data.gradeLevel || null,
        };
      }

      if (content.type === "interactive-book" && data) {
        return {
          subject: data.subject || null,
          grade: data.gradeLevel || null,
        };
      }

      if (data?.metadata) {
        return {
          subject: data.metadata.subject || null,
          grade: data.metadata.gradeLevel || data.metadata.grade || null,
        };
      }

      return { subject: null, grade: null };
    } catch {
      return { subject: null, grade: null };
    }
  };

  const allSubjects = Array.from(
    new Set(
      contents
        ?.map(c => extractSubjectAndGrade(c).subject)
        .filter((s): s is string => s !== null && s !== undefined)
    )
  ).sort();

  const allGrades = Array.from(
    new Set(
      contents
        ?.map(c => extractSubjectAndGrade(c).grade)
        .filter((g): g is string => g !== null && g !== undefined)
    )
  ).sort();

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setSubjectFilter("all");
    setGradeFilter("all");
    setTagFilter("");
    setStartDate("");
    setEndDate("");
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || subjectFilter !== "all" || gradeFilter !== "all" || tagFilter || startDate || endDate;

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleCreate = (type: ContentType) => {
    navigate(`/create/${type}`);
  };

  const handleEdit = (id: string, type: ContentType) => {
    navigate(`/create/${type}/${id}`);
  };

  const handlePlay = (id: string) => {
    navigate(`/preview/${id}`);
  };

  const handleShare = (id: string) => {
    navigate(`/share/${id}`);
  };

  const handleLogout = async () => {
    await logout();
  };

  const deleteMutation = useMutation({
    mutationFn: async (contentId: string) => {
      await apiRequest("DELETE", `/api/content/${contentId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === "/api/content";
        }
      });
      toast({
        title: "Content deleted",
        description: "Your content has been permanently deleted.",
      });
      setDeleteDialogOpen(false);
      setContentToDelete(null);
    },
    onError: (error: any) => {
      toast({
        title: "Delete failed",
        description: error.message || "Failed to delete content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: async (contentId: string) => {
      await apiRequest("POST", `/api/content/${contentId}/duplicate`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        predicate: (query) => {
          const queryKey = query.queryKey;
          return Array.isArray(queryKey) && queryKey[0] === "/api/content";
        }
      });
      toast({
        title: "Content duplicated successfully",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Duplicate failed",
        description: error.message || "Failed to duplicate content. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleDeleteClick = (id: string, title: string) => {
    setContentToDelete({ id, title });
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (contentToDelete) {
      deleteMutation.mutate(contentToDelete.id);
    }
  };

  const groupedContents = contents?.reduce((acc, content) => {
    const type = content.type as ContentType;
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(content);
    return acc;
  }, {} as Record<ContentType, H5pContent[]>);

  // Fetch analytics for quick stats
  const { data: analytics } = useQuery<any[]>({
    queryKey: ["/api/analytics/overview"],
  });

  // Calculate quick stats
  const totalContent = contents?.length || 0;
  const publishedContent = contents?.filter(c => c.isPublished).length || 0;
  const totalViews = analytics?.reduce((sum, item) => sum + item.uniqueViewers, 0) || 0;
  const avgCompletion = analytics && analytics.length > 0
    ? analytics.reduce((sum, item) => sum + item.avgCompletion, 0) / analytics.length
    : 0;

  const statCards = [
    { label: "Total Content", value: totalContent, sub: `${publishedContent} published`, icon: FileQuestion, iconColor: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-50 dark:bg-blue-900/20" },
    { label: "Total Views", value: totalViews, sub: "Across all content", icon: Eye, iconColor: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-50 dark:bg-emerald-900/20" },
    { label: "Avg. Completion", value: `${Math.round(avgCompletion)}%`, sub: "Student completion rate", icon: CheckCircle2, iconColor: "text-purple-600 dark:text-purple-400", iconBg: "bg-purple-50 dark:bg-purple-900/20" },
    { label: "Active Content", value: analytics?.length || 0, sub: "Items with activity", icon: TrendingUp, iconColor: "text-orange-600 dark:text-orange-400", iconBg: "bg-orange-50 dark:bg-orange-900/20" },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Skip to main content for keyboard navigation */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>

      {/* Left Sidebar - Desktop */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Left Sidebar - Mobile (Overlay) */}
      {sidebarOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile Header */}
        <div className="lg:hidden border-b border-border/40 bg-card px-4 py-3 flex items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle menu"
            className="cursor-pointer"
          >
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <img
              src="/favicon.png"
              alt="OECS Content Creator Logo"
              className="h-8 w-8 rounded-lg"
            />
            <h1 className="text-lg font-semibold text-foreground">OECS Content Creator</h1>
          </div>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          {/* Welcome + Quick Action */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">
                Welcome back, {user?.fullName?.split(" ")[0]}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Create and manage your interactive educational content
              </p>
            </div>
            <Button
              onClick={() => navigate("/analytics")}
              variant="outline"
              className="cursor-pointer gap-2 self-start"
            >
              <BarChart3 className="h-4 w-4" />
              View Analytics
            </Button>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {statCards.map((stat) => (
              <Card key={stat.label} className="border-border/40">
                <CardContent className="p-5">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm text-muted-foreground">{stat.label}</span>
                    <div className={`h-9 w-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                      <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold text-foreground">{stat.value}</div>
                  <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Create New Content */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-foreground mb-4">Create New Content</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {Object.entries(contentTypeConfig).map(([type, config]) => {
                const Icon = config.icon;
                return (
                  <button
                    key={type}
                    className="group flex flex-col items-center gap-2.5 p-4 rounded-xl border border-border/40 bg-card
                      hover:border-border hover:shadow-md transition-all duration-200 cursor-pointer text-center"
                    onClick={() => handleCreate(type as ContentType)}
                    data-testid={`button-create-${type}`}
                  >
                    <div className={`h-11 w-11 rounded-lg ${config.iconBg} flex items-center justify-center
                      group-hover:scale-105 transition-transform duration-200`}>
                      <Icon className={`h-5 w-5 ${config.iconColor}`} />
                    </div>
                    <span className="text-sm font-medium text-foreground leading-tight">{config.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* My Content Header */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground">My Content</h3>
                {contents && (
                  <p className="text-sm text-muted-foreground">
                    {contents.length} {contents.length === 1 ? "item" : "items"}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <Button
                  variant={viewMode === "grid" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("grid")}
                  className="h-8 w-8 cursor-pointer"
                  data-testid="button-view-grid"
                >
                  <Grid3x3 className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewMode === "list" ? "secondary" : "ghost"}
                  size="icon"
                  onClick={() => setViewMode("list")}
                  className="h-8 w-8 cursor-pointer"
                  data-testid="button-view-list"
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Search Bar and Filters */}
            <div className="flex gap-2 items-center mb-4">
              <div className="relative flex-1 max-w-xl">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search content..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-10 border-border/60"
                  data-testid="input-search"
                />
              </div>
              <Button
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="h-10 cursor-pointer"
              >
                <Filter className="h-4 w-4 mr-2" />
                Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                  className="h-10 cursor-pointer"
                >
                  <X className="h-4 w-4 mr-1" />
                  Clear
                </Button>
              )}
            </div>
          </div>

          {/* Filters Panel */}
          {showFilters && (
            <Card className="mb-6 border-border/40">
              <CardContent className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Content Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger data-testid="select-type-filter" className="h-10">
                        <SelectValue placeholder="All types" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        <SelectItem value="quiz">Quiz</SelectItem>
                        <SelectItem value="flashcard">Flashcard</SelectItem>
                        <SelectItem value="interactive-video">Interactive Video</SelectItem>
                        <SelectItem value="image-hotspot">Image Hotspot</SelectItem>
                        <SelectItem value="drag-drop">Drag & Drop</SelectItem>
                        <SelectItem value="fill-blanks">Fill in the Blanks</SelectItem>
                        <SelectItem value="memory-game">Memory Game</SelectItem>
                        <SelectItem value="interactive-book">Interactive Book</SelectItem>
                        <SelectItem value="video-finder">Video Finder</SelectItem>
                        <SelectItem value="presentation">Presentation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Subject</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger data-testid="select-subject-filter" className="h-10">
                        <SelectValue placeholder="All subjects" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All subjects</SelectItem>
                        {allSubjects.map((subject) => (
                          <SelectItem key={subject} value={subject}>
                            {subject}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Grade</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger data-testid="select-grade-filter" className="h-10">
                        <SelectValue placeholder="All grades" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All grades</SelectItem>
                        {allGrades.map((grade) => (
                          <SelectItem key={grade} value={grade}>
                            {grade}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Tags</label>
                    <Input
                      placeholder="e.g., science, math"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      data-testid="input-tag-filter"
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">From Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                      className="h-10"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">To Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                      className="h-10"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Content Library */}
          {isLoading ? (
            <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-4"}>
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-border/40">
                  <CardHeader className="p-5">
                    <Skeleton className="h-9 w-9 rounded-lg mb-3" />
                    <Skeleton className="h-5 w-3/4 mb-2" />
                    <Skeleton className="h-4 w-1/2" />
                  </CardHeader>
                  <CardFooter className="p-5 pt-3">
                    <Skeleton className="h-8 w-full" />
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : !contents || contents.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-16 px-6 text-center">
                <div className="flex flex-col items-center">
                  <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mb-5">
                    <BookOpen className="h-8 w-8 text-muted-foreground" />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground mb-2">No content yet</h3>
                  <p className="text-sm text-muted-foreground mb-6 max-w-sm">
                    Get started by creating your first piece of interactive content using one of the options above.
                  </p>
                  <Button onClick={() => handleCreate("quiz")} data-testid="button-create-first" className="cursor-pointer">
                    <Plus className="h-4 w-4 mr-2" />
                    Create Your First Content
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-10">
              {Object.entries(contentTypeConfig).map(([type, config]) => {
                const typeContents = groupedContents?.[type as ContentType] || [];
                if (typeContents.length === 0) return null;

                const Icon = config.icon;

                return (
                  <div key={type}>
                    <div className="flex items-center gap-2.5 mb-4">
                      <div className={`h-7 w-7 rounded-md ${config.iconBg} flex items-center justify-center`}>
                        <Icon className={`h-4 w-4 ${config.iconColor}`} />
                      </div>
                      <h4 className="text-base font-semibold text-foreground">
                        {config.pluralLabel}
                      </h4>
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                        {typeContents.length}
                      </span>
                    </div>

                    <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4" : "space-y-3"}>
                      {typeContents.map((content) => (
                        <Card
                          key={content.id}
                          className={`border-l-[3px] ${config.borderColor} border-border/40 bg-card
                            hover:shadow-md transition-shadow duration-200`}
                          data-testid={`card-content-${content.id}`}
                        >
                          <CardHeader className="p-5 pb-3">
                            <div className="flex items-start justify-between mb-3">
                              <div className={`h-10 w-10 rounded-lg ${config.iconBg} flex items-center justify-center`}>
                                <Icon className={`h-5 w-5 ${config.iconColor}`} />
                              </div>
                              {content.isPublished && (
                                <Badge variant="outline" className="text-xs border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20">
                                  Published
                                </Badge>
                              )}
                            </div>
                            <CardTitle className="text-base font-medium leading-snug">{content.title}</CardTitle>
                            {content.description && (
                              <CardDescription className="text-sm text-muted-foreground line-clamp-2 mt-1">
                                {content.description}
                              </CardDescription>
                            )}
                          </CardHeader>
                          <CardContent className="px-5 pb-3">
                            <div className="flex items-center gap-2 text-xs text-muted-foreground">
                              <span>Updated {format(new Date(content.updatedAt), "MMM d, yyyy")}</span>
                              {content.tags && content.tags.length > 0 && (
                                <>
                                  <span className="text-border">|</span>
                                  <div className="flex gap-1 flex-wrap">
                                    {content.tags.slice(0, 2).map((tag, i) => (
                                      <span key={i} className="text-xs text-muted-foreground">
                                        {tag}
                                      </span>
                                    ))}
                                  </div>
                                </>
                              )}
                            </div>
                          </CardContent>
                          <CardFooter className="p-5 pt-3 flex gap-1.5 border-t border-border/30">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1 h-8 text-xs cursor-pointer"
                              onClick={() => handleEdit(content.id, content.type as ContentType)}
                              data-testid={`button-edit-${content.id}`}
                            >
                              <Edit className="h-3.5 w-3.5 mr-1.5" />
                              Edit
                            </Button>
                            <AssignToClassDialog contentId={content.id}>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8 cursor-pointer"
                                data-testid={`button-assign-${content.id}`}
                                aria-label="Assign to class"
                              >
                                <Users className="h-3.5 w-3.5" />
                              </Button>
                            </AssignToClassDialog>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handlePlay(content.id)}
                              data-testid={`button-play-${content.id}`}
                              aria-label="Preview content"
                            >
                              <Play className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleShare(content.id)}
                              data-testid={`button-share-${content.id}`}
                              aria-label="Share content"
                            >
                              <Share2 className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => duplicateMutation.mutate(content.id)}
                              disabled={duplicateMutation.isPending}
                              data-testid={`button-duplicate-${content.id}`}
                              aria-label="Duplicate content"
                            >
                              <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-8 w-8 cursor-pointer"
                              onClick={() => handleDeleteClick(content.id, content.title)}
                              data-testid={`button-delete-${content.id}`}
                              aria-label="Delete content"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </CardFooter>
                        </Card>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>

      {/* Right Sidebar */}
      <div className="hidden xl:block">
        <DashboardRightSidebar />
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent data-testid="dialog-delete-confirmation">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{contentToDelete?.title}"? This action cannot be undone and will permanently remove this content and all associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-delete" disabled={deleteMutation.isPending}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteMutation.isPending}
              data-testid="button-confirm-delete"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
