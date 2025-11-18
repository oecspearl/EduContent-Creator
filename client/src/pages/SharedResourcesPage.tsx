import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useAuth } from "@/hooks/useAuth";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import {
  BookOpen,
  Layers,
  Video,
  Image as ImageIcon,
  Move,
  Edit3,
  Brain,
  BookText,
  Search as SearchIcon,
  Presentation,
  Eye,
  Filter,
  X,
  ArrowLeft,
  LogOut,
  GraduationCap,
  User,
  Grid3x3,
  List,
} from "lucide-react";
import type { H5pContent } from "@shared/schema";

const contentTypeIcons = {
  quiz: BookOpen,
  flashcard: Layers,
  "interactive-video": Video,
  "image-hotspot": ImageIcon,
  "drag-drop": Move,
  "fill-blanks": Edit3,
  "memory-game": Brain,
  "interactive-book": BookText,
  "video-finder": SearchIcon,
  "presentation": Presentation,
};

const contentTypeLabels = {
  quiz: "Quiz",
  flashcard: "Flashcard",
  "interactive-video": "Interactive Video",
  "image-hotspot": "Image Hotspot",
  "drag-drop": "Drag & Drop",
  "fill-blanks": "Fill in Blanks",
  "memory-game": "Memory Game",
  "interactive-book": "Interactive Book",
  "video-finder": "Video Finder",
  "presentation": "Presentation",
};

export default function SharedResourcesPage() {
  const { user, logout } = useAuth();
  const [_, navigate] = useLocation();
  const [searchQuery, setSearchQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [tagFilter, setTagFilter] = useState("all");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const breadcrumbs = useBreadcrumbs();

  const { data: contents = [], isLoading } = useQuery<H5pContent[]>({
    queryKey: [
      "/api/content/public", 
      {
        ...(searchQuery && { search: searchQuery }),
        ...(typeFilter !== "all" && { type: typeFilter }),
        ...(tagFilter !== "all" && { tags: tagFilter })
      }
    ],
  });

  // Get unique tags from all content
  const allTags = Array.from(
    new Set(
      contents
        .flatMap(c => c.tags || [])
        .filter(Boolean)
    )
  ).sort();

  const clearFilters = () => {
    setSearchQuery("");
    setTypeFilter("all");
    setTagFilter("all");
  };

  const hasActiveFilters = searchQuery || typeFilter !== "all" || tagFilter !== "all";

  const getInitials = (name?: string) => {
    if (!name) return "??";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <header className="border-b bg-card" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/dashboard")}
              data-testid="button-back-dashboard"
              aria-label="Back to dashboard"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
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
          </div>
          <div className="flex items-center gap-4">
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

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Main Content */}
      <main id="main-content" className="container mx-auto px-4 py-8 max-w-7xl" role="main">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Shared Resources</h1>
        <p className="text-muted-foreground">
          Discover and use interactive educational content shared by teachers across the Caribbean
        </p>
      </div>

      {/* Filters */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Search</label>
              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by title or description..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                  data-testid="input-search"
                />
              </div>
            </div>

            {/* Content Type Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Content Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger data-testid="select-type-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="quiz">Quiz</SelectItem>
                  <SelectItem value="flashcard">Flashcard</SelectItem>
                  <SelectItem value="interactive-video">Interactive Video</SelectItem>
                  <SelectItem value="image-hotspot">Image Hotspot</SelectItem>
                  <SelectItem value="drag-drop">Drag & Drop</SelectItem>
                  <SelectItem value="fill-blanks">Fill in Blanks</SelectItem>
                  <SelectItem value="memory-game">Memory Game</SelectItem>
                  <SelectItem value="interactive-book">Interactive Book</SelectItem>
                  <SelectItem value="video-finder">Video Finder</SelectItem>
                  <SelectItem value="presentation">Presentation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Tag Filter */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Tags</label>
              <Select value={tagFilter} onValueChange={setTagFilter}>
                <SelectTrigger data-testid="select-tag-filter">
                  <SelectValue placeholder="All Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {allTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {hasActiveFilters && (
            <div className="mt-4 flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={clearFilters}
                data-testid="button-clear-filters"
              >
                <X className="h-4 w-4 mr-1" />
                Clear Filters
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Results Count & View Toggle */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Filter className="h-4 w-4" />
          <span data-testid="text-results-count">
            {contents.length} {contents.length === 1 ? "resource" : "resources"} found
          </span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant={viewMode === "grid" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("grid")}
            data-testid="button-view-grid"
            aria-label="Grid view"
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button
            variant={viewMode === "list" ? "default" : "ghost"}
            size="icon"
            onClick={() => setViewMode("list")}
            data-testid="button-view-list"
            aria-label="List view"
          >
            <List className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Content Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-6 bg-muted rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-muted rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : contents.length === 0 ? (
        <Card className="text-center py-12">
          <CardContent>
            <SearchIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No resources found</h3>
            <p className="text-muted-foreground mb-4">
              {hasActiveFilters
                ? "Try adjusting your filters to find more resources"
                : "No public resources have been shared yet"}
            </p>
            {hasActiveFilters && (
              <Button variant="outline" onClick={clearFilters} data-testid="button-clear-filters-empty">
                Clear Filters
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className={viewMode === "grid" ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" : "flex flex-col gap-4"}>
          {contents.map((content: any) => {
            const Icon = contentTypeIcons[content.type as keyof typeof contentTypeIcons] || BookOpen;
            const typeLabel = contentTypeLabels[content.type as keyof typeof contentTypeLabels] || content.type;
            
            // Extract subject and grade level from content data
            const subject = content.data?.topic || content.data?.subject || null;
            const gradeLevel = content.data?.gradeLevel || null;

            if (viewMode === "list") {
              // List View Layout
              return (
                <Card key={content.id} className="hover-elevate" data-testid={`card-resource-${content.id}`}>
                  <div className="flex flex-col md:flex-row gap-4 p-6">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start gap-3">
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <Icon className="h-3 w-3" />
                          {typeLabel}
                        </Badge>
                      </div>
                      <div>
                        <h3 className="text-xl font-semibold mb-1">{content.title}</h3>
                        {content.description && (
                          <p className="text-sm text-muted-foreground line-clamp-2">
                            {content.description}
                          </p>
                        )}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                        {subject && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{subject}</span>
                          </div>
                        )}
                        {gradeLevel && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{gradeLevel}</span>
                          </div>
                        )}
                        {content.creatorName && (
                          <div className="flex items-center gap-2 text-muted-foreground">
                            <User className="h-3.5 w-3.5 flex-shrink-0" />
                            <span className="truncate">{content.creatorName}</span>
                          </div>
                        )}
                      </div>
                      {content.tags && content.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {content.tags.slice(0, 5).map((tag: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {content.tags.length > 5 && (
                            <Badge variant="outline" className="text-xs">
                              +{content.tags.length - 5}
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center md:items-start">
                      <Link href={`/public/${content.id}`}>
                        <Button size="default" data-testid={`button-preview-${content.id}`}>
                          <Eye className="h-4 w-4 mr-2" />
                          Preview & Use
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              );
            }

            // Grid View Layout (with aligned buttons at bottom)
            return (
              <Card key={content.id} className="hover-elevate flex flex-col" data-testid={`card-resource-${content.id}`}>
                <CardHeader>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <Badge variant="secondary" className="flex items-center gap-1">
                      <Icon className="h-3 w-3" />
                      {typeLabel}
                    </Badge>
                  </div>
                  <CardTitle className="line-clamp-2">{content.title}</CardTitle>
                  {content.description && (
                    <CardDescription className="line-clamp-2">
                      {content.description}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="flex flex-col flex-1 space-y-3">
                  {/* Meta Information */}
                  <div className="space-y-1.5 text-sm">
                    {subject && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <BookOpen className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{subject}</span>
                      </div>
                    )}
                    {gradeLevel && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <GraduationCap className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{gradeLevel}</span>
                      </div>
                    )}
                    {content.creatorName && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <User className="h-3.5 w-3.5 flex-shrink-0" />
                        <span className="truncate">{content.creatorName}</span>
                      </div>
                    )}
                  </div>

                  {content.tags && content.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {content.tags.slice(0, 3).map((tag: string, idx: number) => (
                        <Badge key={idx} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {content.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{content.tags.length - 3}
                        </Badge>
                      )}
                    </div>
                  )}
                  
                  {/* Spacer to push button to bottom */}
                  <div className="flex-1"></div>
                  
                  <Link href={`/public/${content.id}`}>
                    <Button className="w-full" size="sm" data-testid={`button-preview-${content.id}`}>
                      <Eye className="h-4 w-4 mr-1" />
                      Preview & Use
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
      </main>
    </div>
  );
}
