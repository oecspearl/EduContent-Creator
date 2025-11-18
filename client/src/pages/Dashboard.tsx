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
import { ThemeToggle } from "@/components/ThemeToggle";
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
  LogOut,
  Grid3x3,
  List,
  BookOpen,
  Search,
  Filter,
  X,
  HelpCircle,
  BarChart3,
  Presentation,
  Users
} from "lucide-react";
import { useLocation } from "wouter";
import type { H5pContent, ContentType } from "@shared/schema";
import { format } from "date-fns";

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

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content for keyboard navigation */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="border-b bg-card" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img 
              src="/favicon.png" 
              alt="OECS Content Creator Logo" 
              className="h-10 w-10 rounded-lg"
            />
            <div>
              <h1 className="text-xl font-bold text-foreground">OECS Content Creator</h1>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/shared-resources")}
              data-testid="button-shared-resources"
              aria-label="Browse shared resources"
            >
              <Users className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/analytics")}
              data-testid="button-analytics"
              aria-label="View analytics dashboard"
            >
              <BarChart3 className="h-5 w-5" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/help")}
              data-testid="button-help"
              aria-label="Open help documentation"
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
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={handleLogout} 
              data-testid="button-logout"
              aria-label="Log out"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-8" role="main">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-foreground mb-2">
            Welcome back, {user?.fullName?.split(" ")[0]}!
          </h2>
          <p className="text-muted-foreground">
            Create and manage your interactive educational content
          </p>
        </div>

        {/* Create Content Buttons */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold text-foreground mb-4">Create New Content</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Object.entries(contentTypeConfig).map(([type, config]) => {
              const Icon = config.icon;
              return (
                <Card
                  key={type}
                  className="hover-elevate active-elevate-2 cursor-pointer transition-all"
                  onClick={() => handleCreate(type as ContentType)}
                  data-testid={`button-create-${type}`}
                >
                  <CardHeader className="pb-3">
                    <div className={`h-12 w-12 rounded-lg ${config.color} flex items-center justify-center mb-3`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <CardTitle className="text-lg">{config.label}</CardTitle>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Search and Filters */}
        <div className="mb-6 space-y-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by title or description..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
                data-testid="input-search"
              />
            </div>
            <Button
              variant={showFilters ? "secondary" : "outline"}
              onClick={() => setShowFilters(!showFilters)}
              data-testid="button-toggle-filters"
            >
              <Filter className="h-5 w-5 mr-2" />
              Filters
            </Button>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-5 w-5 mr-2" />
                Clear
              </Button>
            )}
          </div>

          {showFilters && (
            <Card>
              <CardContent className="pt-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">Content Type</label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger data-testid="select-type-filter">
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
                    <label className="text-sm font-medium text-foreground mb-2 block">Subject</label>
                    <Select value={subjectFilter} onValueChange={setSubjectFilter}>
                      <SelectTrigger data-testid="select-subject-filter">
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
                    <label className="text-sm font-medium text-foreground mb-2 block">Grade</label>
                    <Select value={gradeFilter} onValueChange={setGradeFilter}>
                      <SelectTrigger data-testid="select-grade-filter">
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
                    <label className="text-sm font-medium text-foreground mb-2 block">Tags</label>
                    <Input
                      placeholder="e.g., science, math"
                      value={tagFilter}
                      onChange={(e) => setTagFilter(e.target.value)}
                      data-testid="input-tag-filter"
                    />
                    <p className="text-xs text-muted-foreground mt-1">Comma-separated</p>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">From Date</label>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      data-testid="input-start-date"
                    />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-2 block">To Date</label>
                    <Input
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      data-testid="input-end-date"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">My Content</h3>
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
          <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i}>
                <CardHeader>
                  <Skeleton className="h-12 w-12 rounded-lg mb-3" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardFooter>
                  <Skeleton className="h-9 w-full" />
                </CardFooter>
              </Card>
            ))}
          </div>
        ) : !contents || contents.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <div className="flex flex-col items-center">
                <div className="h-24 w-24 bg-muted rounded-full flex items-center justify-center mb-6">
                  <BookOpen className="h-12 w-12 text-muted-foreground" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">No content yet</h3>
                <p className="text-muted-foreground mb-6 max-w-md">
                  Get started by creating your first piece of interactive content. Choose from quizzes, flashcards,
                  interactive videos, or image hotspots.
                </p>
                <Button onClick={() => handleCreate("quiz")} data-testid="button-create-first">
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

              return (
                <div key={type}>
                  <h4 className="text-lg font-medium text-foreground mb-4 flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    {config.pluralLabel}
                    <Badge variant="secondary">{typeContents.length}</Badge>
                  </h4>
                  <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "space-y-4"}>
                    {typeContents.map((content) => (
                      <Card key={content.id} className="hover-elevate transition-all" data-testid={`card-content-${content.id}`}>
                        <CardHeader>
                          <div className="flex items-start justify-between mb-2">
                            <div className={`h-12 w-12 rounded-lg ${config.color} flex items-center justify-center`}>
                              <Icon className="h-6 w-6" />
                            </div>
                            {content.isPublished && (
                              <Badge variant="default" className="bg-green-600 hover:bg-green-600">Published</Badge>
                            )}
                          </div>
                          <CardTitle className="text-xl">{content.title}</CardTitle>
                          {content.description && (
                            <CardDescription className="line-clamp-2">{content.description}</CardDescription>
                          )}
                        </CardHeader>
                        <CardContent>
                          <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <span>Updated {format(new Date(content.updatedAt), "MMM d, yyyy")}</span>
                            {content.tags && content.tags.length > 0 && (
                              <>
                                <span>•</span>
                                <div className="flex gap-1 flex-wrap">
                                  {content.tags.slice(0, 2).map((tag, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                </div>
                              </>
                            )}
                          </div>
                        </CardContent>
                        <CardFooter className="flex gap-2">
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleEdit(content.id, content.type as ContentType)}
                            data-testid={`button-edit-${content.id}`}
                          >
                            <Edit className="h-4 w-4 mr-1" />
                            Edit
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handlePlay(content.id)}
                            data-testid={`button-play-${content.id}`}
                            aria-label="Preview content"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleShare(content.id)}
                            data-testid={`button-share-${content.id}`}
                            aria-label="Share content"
                          >
                            <Share2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
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
