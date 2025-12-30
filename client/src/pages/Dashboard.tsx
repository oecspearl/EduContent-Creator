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
  Menu
} from "lucide-react";
import { useLocation } from "wouter";
import type { H5pContent, ContentType } from "@shared/schema";
import { format } from "date-fns";
import { AssignToClassDialog } from "@/components/AssignToClassDialog";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardRightSidebar } from "@/components/DashboardRightSidebar";

const contentTypeConfig: Record<ContentType, { icon: typeof FileQuestion; label: string; pluralLabel: string; color: string }> = {
  quiz: { icon: FileQuestion, label: "Quiz", pluralLabel: "Quizzes", color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300" },
  flashcard: { icon: Layers, label: "Flashcard", pluralLabel: "Flashcards", color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300" },
  "interactive-video": { icon: Video, label: "Interactive Video", pluralLabel: "Interactive Videos", color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300" },
  "image-hotspot": { icon: ImageIcon, label: "Image Hotspot", pluralLabel: "Image Hotspots", color: "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300" },
  "drag-drop": { icon: Move, label: "Drag & Drop", pluralLabel: "Drag & Drop", color: "bg-pink-100 text-pink-700 dark:bg-pink-900 dark:text-pink-300" },
  "fill-blanks": { icon: PenTool, label: "Fill in the Blanks", pluralLabel: "Fill in the Blanks", color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900 dark:text-cyan-300" },
  "memory-game": { icon: Brain, label: "Memory Game", pluralLabel: "Memory Games", color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300" },
  "interactive-book": { icon: BookOpenCheck, label: "Interactive Book", pluralLabel: "Interactive Books", color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" },
  "video-finder": { icon: Search, label: "Video Finder", pluralLabel: "Video Finders", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300" },
  "presentation": { icon: Presentation, label: "Presentation", pluralLabel: "Presentations", color: "bg-sky-100 text-sky-700 dark:bg-sky-900 dark:text-sky-300" },
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
      
      // Video Finder: data.searchCriteria.subject and data.searchCriteria.gradeLevel
      if (content.type === "video-finder" && data?.searchCriteria) {
        return {
          subject: data.searchCriteria.subject || null,
          grade: data.searchCriteria.gradeLevel || null,
        };
      }
      
      // Presentation: data.gradeLevel (no subject)
      if (content.type === "presentation" && data) {
        return {
          subject: null,
          grade: data.gradeLevel || null,
        };
      }
      
      // Interactive Book: data.subject and data.gradeLevel
      if (content.type === "interactive-book" && data) {
        return {
          subject: data.subject || null,
          grade: data.gradeLevel || null,
        };
      }
      
      // Other content types might have these in metadata
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

  // Get unique subjects and grades from all content
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

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: '#E5EDD3' }}>
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
          <div className="w-10" /> {/* Spacer for centering */}
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-6 py-6 lg:py-8" role="main">
          {/* Search Bar */}
          <div className="mb-6">
            <div className="relative max-w-2xl">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-11 h-11 border-border/40 bg-card"
                data-testid="input-search"
              />
            </div>
          </div>

          {/* Hero Banner */}
          <Card className="mb-8 bg-gradient-to-r from-primary/10 to-primary/5 border-primary/20">
            <CardContent className="p-8">
              <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-foreground mb-2">
                    Track Your Students' Progress Easier With OECS Content Creator
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    Create engaging educational content and monitor student performance in real-time
                  </p>
                  <Button onClick={() => navigate("/analytics")} size="lg">
                    View Analytics
                  </Button>
                </div>
                <div className="hidden md:block">
                  <div className="h-32 w-32 bg-primary/10 rounded-lg flex items-center justify-center">
                    <BarChart3 className="h-16 w-16 text-primary" />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <Card className="border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Content</CardTitle>
                <FileQuestion className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalContent}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {publishedContent} published
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Views</CardTitle>
                <Eye className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalViews}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all content
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Avg. Completion</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{Math.round(avgCompletion)}%</div>
                <p className="text-xs text-muted-foreground mt-1">
                  Student completion rate
                </p>
              </CardContent>
            </Card>

            <Card className="border-border/40 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Performance</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {analytics && analytics.length > 0 ? analytics.length : 0}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Active content items
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Welcome Section */}
          <div className="mb-8">
            <h2 className="text-2xl font-semibold text-foreground mb-3">
              Welcome back, {user?.fullName?.split(" ")[0]}!
            </h2>
            <p className="text-base text-muted-foreground">
              Create and manage your interactive educational content
            </p>
          </div>

          {/* Create Content Buttons */}
          <div className="mb-8">
            <h3 className="text-xl font-medium text-foreground mb-6">Create New Content</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(contentTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              // Extract color from config for left border
              const borderColorMap: Record<ContentType, string> = {
                quiz: "border-l-blue-500",
                flashcard: "border-l-purple-500",
                "interactive-video": "border-l-green-500",
                "image-hotspot": "border-l-orange-500",
                "drag-drop": "border-l-pink-500",
                "fill-blanks": "border-l-cyan-500",
                "memory-game": "border-l-yellow-500",
                "interactive-book": "border-l-indigo-500",
                "video-finder": "border-l-emerald-500",
                "presentation": "border-l-sky-500",
              };
              return (
                <Card
                  key={type}
                  className={`border-l-2 ${borderColorMap[type as ContentType]} border-border/40 bg-card hover:shadow-md cursor-pointer transition-all duration-150 ease-out`}
                  onClick={() => handleCreate(type as ContentType)}
                  data-testid={`button-create-${type}`}
                >
                  <CardHeader className="p-6">
                    <div className="flex items-center gap-4 mb-2">
                      <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                        <Icon className="h-5 w-5 text-muted-foreground" />
                      </div>
                      <CardTitle className="text-base font-medium">{config.label}</CardTitle>
                    </div>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex gap-3">
              <Button
                variant={showFilters ? "secondary" : "outline"}
                onClick={() => setShowFilters(!showFilters)}
                data-testid="button-toggle-filters"
                className="h-11 border-border/40"
              >
                <Filter className="h-5 w-5 mr-2" />
                Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  onClick={clearFilters}
                  data-testid="button-clear-filters"
                  className="h-11"
                >
                  <X className="h-5 w-5 mr-2" />
                  Clear
                </Button>
              )}
            </div>

          {showFilters && (
            <Card className="border-border/40 shadow-sm">
              <CardContent className="p-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <div>
                    <label className="text-sm font-normal text-foreground mb-2 block">Content Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger data-testid="select-type-filter" className="border-border/40 h-11">
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
                    <label className="text-sm font-normal text-foreground mb-2 block">Subject</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger data-testid="select-subject-filter" className="border-border/40 h-11">
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
                    <label className="text-sm font-normal text-foreground mb-2 block">Grade</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger data-testid="select-grade-filter" className="border-border/40 h-11">
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
                    <label className="text-sm font-normal text-foreground mb-2 block">Tags</label>
                    <Input
                      placeholder="e.g., science, math"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      data-testid="input-tag-filter"
                      className="border-border/40 h-11"
                    />
                    <p className="text-xs text-muted-foreground mt-2">Comma-separated</p>
                  </div>

                  <div>
                    <label className="text-sm font-normal text-foreground mb-2 block">From Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                      className="border-border/40 h-11"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-normal text-foreground mb-2 block">To Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                      className="border-border/40 h-11"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

          {/* View Mode Toggle */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-xl font-medium text-foreground mb-1">My Content</h3>
              {contents && (
                <p className="text-sm text-muted-foreground">
                  {contents.length} {contents.length === 1 ? "item" : "items"} found
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "grid" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("grid")}
                data-testid="button-view-grid"
              >
                <Grid3x3 className="h-5 w-5" />
              </Button>
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="icon"
                onClick={() => setViewMode("list")}
                data-testid="button-view-list"
              >
                <List className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {/* Content Library */}
          {isLoading ? (
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="border-border/40 shadow-sm">
                <CardHeader className="p-6">
                  <Skeleton className="h-10 w-10 rounded-md mb-4" />
                  <Skeleton className="h-5 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardFooter className="p-6 pt-4">
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : !contents || contents.length === 0 ? (
          <Card className="text-center border-border/40 shadow-sm">
            <CardContent className="py-16 px-6">
              <div className="flex flex-col items-center">
                <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="h-10 w-10 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-medium text-foreground mb-3">No content yet</h3>
                <p className="text-base text-muted-foreground mb-8 max-w-md leading-relaxed">
                  Get started by creating your first piece of interactive content. Choose from quizzes, flashcards,
                  interactive videos, or image hotspots.
                </p>
                <Button onClick={() => handleCreate("quiz")} data-testid="button-create-first" className="h-11">
                  <Plus className="h-5 w-5 mr-2" />
                  Create Your First Content
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {Object.entries(contentTypeConfig).map(([type, config]) => {
              const typeContents = groupedContents?.[type as ContentType] || [];
              if (typeContents.length === 0) return null;

              const Icon = config.icon;

              // Border color mapping for left border tint
              const borderColorMap: Record<ContentType, string> = {
                quiz: "border-l-blue-500",
                flashcard: "border-l-purple-500",
                "interactive-video": "border-l-green-500",
                "image-hotspot": "border-l-orange-500",
                "drag-drop": "border-l-pink-500",
                "fill-blanks": "border-l-cyan-500",
                "memory-game": "border-l-yellow-500",
                "interactive-book": "border-l-indigo-500",
                "video-finder": "border-l-emerald-500",
                "presentation": "border-l-sky-500",
              };

              return (
                <div key={type} className="mb-12">
                  <h4 className="text-xl font-medium text-foreground mb-6 flex items-center gap-3">
                    <Icon className="h-5 w-5 text-muted-foreground" />
                    {config.pluralLabel}
                    <span className="text-sm font-normal text-muted-foreground">({typeContents.length})</span>
                  </h4>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-6"}>
                    {typeContents.map((content) => (
                      <Card 
                        key={content.id} 
                        className={`border-l-2 ${borderColorMap[type as ContentType]} border-border/40 bg-card shadow-sm hover:shadow-md transition-all duration-150 ease-out`}
                        data-testid={`card-content-${content.id}`}
                      >
                        <CardHeader className="p-6 pb-4">
                          <div className="flex items-start justify-between mb-4">
                            <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                              <Icon className="h-5 w-5 text-muted-foreground" />
                            </div>
                            {content.isPublished && (
                              <div className="flex items-center gap-1.5">
                                <div className="h-2 w-2 rounded-full bg-green-500"></div>
                                <span className="text-xs font-normal text-muted-foreground">Published</span>
                              </div>
                            )}
                          </div>
                          <CardTitle className="text-lg font-medium mb-2">{content.title}</CardTitle>
                          {content.description && (
                            <CardDescription className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                              {content.description}
                            </CardDescription>
                          )}
                        </CardHeader>
                        <CardContent className="px-6 pb-4">
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Updated {format(new Date(content.updatedAt), "MMM d, yyyy")}</span>
                            {content.tags && content.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex gap-1.5 flex-wrap">
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
                        <CardFooter className="p-6 pt-4 flex gap-2 border-t border-border/40">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-9"
                            onClick={() => handleEdit(content.id, content.type as ContentType)}
                            data-testid={`button-edit-${content.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1.5" />
                            Edit
                          </Button>
                          <AssignToClassDialog contentId={content.id}>
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-9 w-9 border-border/40"
                              data-testid={`button-assign-${content.id}`}
                              aria-label="Assign to class"
                            >
                              <Users className="h-4 w-4" />
                            </Button>
                          </AssignToClassDialog>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-border/40"
                            onClick={() => handlePlay(content.id)}
                            data-testid={`button-play-${content.id}`}
                            aria-label="Preview content"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-border/40"
                            onClick={() => handleShare(content.id)}
                            data-testid={`button-share-${content.id}`}
                            aria-label="Share content"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-9 w-9 border-border/40"
                            onClick={() => handleDeleteClick(content.id, content.title)}
                            data-testid={`button-delete-${content.id}`}
                            aria-label="Delete content"
                          >
                            <Trash2 className="h-4 w-4" />
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
