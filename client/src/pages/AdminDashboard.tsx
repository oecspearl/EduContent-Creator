import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { format } from "date-fns";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Users, FileQuestion, GraduationCap, Trophy, Search, Trash2,
  ChevronLeft, ChevronRight, Eye, Menu, Shield, BarChart3,
  Layers, Video, Image as ImageIcon, Move, PenTool, Brain,
  BookOpenCheck, Presentation, Activity, MoreVertical,
  CheckCircle, XCircle, Flag, Send, BookOpen,
} from "lucide-react";

// ─── Types ─────────────────────────────────────────────────

type AdminStats = {
  users: { total: number; teachers: number; students: number; admins: number };
  content: { total: number; published: number; public: number };
  classes: { total: number };
  quizzes: { total: number; avgScore: number };
};

type ContentByType = { type: string; count: number }[];

type AdminContentItem = {
  id: string;
  title: string;
  description: string | null;
  type: string;
  isPublished: boolean;
  isPublic: boolean;
  reviewStatus: string;
  reviewNotes: string | null;
  subject: string | null;
  gradeLevel: string | null;
  tags: string[] | null;
  createdAt: string;
  updatedAt: string;
  creatorId: string;
  creatorName: string;
  creatorEmail: string;
};

type AdminUser = {
  id: string;
  email: string;
  fullName: string;
  role: string;
  institution: string | null;
  authProvider: string | null;
  createdAt: string;
  contentCount: number;
};

type PaginatedResponse<T> = {
  items: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
};

type AuditEntry = {
  id: string;
  action: string;
  entityType: string;
  entityId: string | null;
  metadata: any;
  createdAt: string;
  userName: string | null;
  userEmail: string | null;
};

// ─── Content type icons ────────────────────────────────────

const typeIcons: Record<string, { icon: typeof FileQuestion; color: string; bg: string; label: string }> = {
  quiz: { icon: FileQuestion, color: "text-blue-600 dark:text-blue-400", bg: "bg-blue-50 dark:bg-blue-900/20", label: "Quiz" },
  flashcard: { icon: Layers, color: "text-purple-600 dark:text-purple-400", bg: "bg-purple-50 dark:bg-purple-900/20", label: "Flashcard" },
  "interactive-video": { icon: Video, color: "text-green-600 dark:text-green-400", bg: "bg-green-50 dark:bg-green-900/20", label: "Interactive Video" },
  "image-hotspot": { icon: ImageIcon, color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/20", label: "Image Hotspot" },
  "drag-drop": { icon: Move, color: "text-pink-600 dark:text-pink-400", bg: "bg-pink-50 dark:bg-pink-900/20", label: "Drag & Drop" },
  "fill-blanks": { icon: PenTool, color: "text-cyan-600 dark:text-cyan-400", bg: "bg-cyan-50 dark:bg-cyan-900/20", label: "Fill in Blanks" },
  "memory-game": { icon: Brain, color: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-900/20", label: "Memory Game" },
  "interactive-book": { icon: BookOpenCheck, color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/20", label: "Interactive Book" },
  "video-finder": { icon: Search, color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20", label: "Video Finder" },
  presentation: { icon: Presentation, color: "text-sky-600 dark:text-sky-400", bg: "bg-sky-50 dark:bg-sky-900/20", label: "Presentation" },
};

// ─── Tabs ──────────────────────────────────────────────────

type Tab = "overview" | "content" | "users" | "activity";

// ─── Component ─────────────────────────────────────────────

export default function AdminDashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  // Content tab state
  const [contentPage, setContentPage] = useState(1);
  const [contentSearch, setContentSearch] = useState("");
  const [contentTypeFilter, setContentTypeFilter] = useState("all");
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);

  // Users tab state
  const [usersPage, setUsersPage] = useState(1);
  const [usersSearch, setUsersSearch] = useState("");
  const [usersRoleFilter, setUsersRoleFilter] = useState("all");
  const [roleChangeTarget, setRoleChangeTarget] = useState<{ id: string; name: string; newRole: string } | null>(null);

  // Flag / review dialog state
  const [flagTarget, setFlagTarget] = useState<{ id: string; title: string } | null>(null);
  const [flagNotes, setFlagNotes] = useState("");
  const [flagStatus, setFlagStatus] = useState("flagged");
  const [reviewTarget, setReviewTarget] = useState<{ id: string; title: string } | null>(null);
  const [reviewAssignee, setReviewAssignee] = useState("");

  // ─── Queries ───────────────────────────────────────────

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: contentByType } = useQuery<ContentByType>({
    queryKey: ["/api/admin/content-by-type"],
  });

  const contentFilters: Record<string, string> = { page: String(contentPage), limit: "20" };
  if (contentSearch) contentFilters.search = contentSearch;
  if (contentTypeFilter !== "all") contentFilters.type = contentTypeFilter;

  const { data: contentData, isLoading: contentLoading } = useQuery<PaginatedResponse<AdminContentItem>>({
    queryKey: ["/api/admin/content", contentFilters],
    enabled: activeTab === "content" || activeTab === "overview",
  });

  const userFilters: Record<string, string> = { page: String(usersPage), limit: "20" };
  if (usersSearch) userFilters.search = usersSearch;
  if (usersRoleFilter !== "all") userFilters.role = usersRoleFilter;

  const { data: usersData, isLoading: usersLoading } = useQuery<PaginatedResponse<AdminUser>>({
    queryKey: ["/api/admin/users", userFilters],
    enabled: activeTab === "users" || activeTab === "overview",
  });

  const { data: activityData } = useQuery<AuditEntry[]>({
    queryKey: ["/api/admin/activity", { limit: "20" }],
    enabled: activeTab === "activity" || activeTab === "overview",
  });

  const { data: timeline } = useQuery<{ date: string; count: number }[]>({
    queryKey: ["/api/admin/content-timeline"],
    enabled: activeTab === "overview",
  });

  // ─── Mutations ─────────────────────────────────────────

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/content/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("/api/admin") });
      toast({ title: "Content deleted" });
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Delete failed", description: err.message, variant: "destructive" });
    },
  });

  const roleChangeMutation = useMutation({
    mutationFn: async ({ id, role }: { id: string; role: string }) => {
      await apiRequest("PATCH", `/api/admin/users/${id}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("/api/admin") });
      toast({ title: "Role updated" });
      setRoleChangeTarget(null);
    },
    onError: (err: any) => {
      toast({ title: "Role change failed", description: err.message, variant: "destructive" });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async ({ id, isPublished }: { id: string; isPublished: boolean }) => {
      await apiRequest("PATCH", `/api/admin/content/${id}/publish`, { isPublished });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("/api/admin") });
      toast({ title: "Publish status updated" });
    },
    onError: (err: any) => {
      toast({ title: "Update failed", description: err.message, variant: "destructive" });
    },
  });

  const flagMutation = useMutation({
    mutationFn: async ({ id, reviewStatus, reviewNotes }: { id: string; reviewStatus: string; reviewNotes?: string }) => {
      await apiRequest("PATCH", `/api/admin/content/${id}/flag`, { reviewStatus, reviewNotes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("/api/admin") });
      toast({ title: "Review status updated" });
      setFlagTarget(null);
      setFlagNotes("");
      setFlagStatus("flagged");
    },
    onError: (err: any) => {
      toast({ title: "Flag failed", description: err.message, variant: "destructive" });
    },
  });

  const assignReviewMutation = useMutation({
    mutationFn: async ({ contentId, email }: { contentId: string; email: string }) => {
      await apiRequest("POST", `/api/admin/content/${contentId}/review`, { email });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ predicate: (q) => (q.queryKey[0] as string).startsWith("/api/admin") });
      toast({ title: "Review request sent" });
      setReviewTarget(null);
      setReviewAssignee("");
    },
    onError: (err: any) => {
      toast({ title: "Failed to assign reviewer", description: err.message, variant: "destructive" });
    },
  });

  // ─── Helpers ───────────────────────────────────────────

  const getTypeInfo = (type: string) => typeIcons[type] || { icon: FileQuestion, color: "text-gray-600", bg: "bg-gray-50", label: type };

  const formatAction = (action: string) => {
    return action.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
  };

  const roleBadgeColor = (role: string) => {
    switch (role) {
      case "admin": return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300";
      case "teacher": return "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300";
      case "student": return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300";
      default: return "bg-gray-100 text-gray-700";
    }
  };

  const reviewStatusBadge = (status: string) => {
    switch (status) {
      case "flagged": return { label: "Flagged", className: "border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400" };
      case "in_review": return { label: "In Review", className: "border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400" };
      case "approved": return { label: "Approved", className: "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400" };
      case "rejected": return { label: "Rejected", className: "border-red-200 dark:border-red-800 text-red-700 dark:text-red-400" };
      default: return null;
    }
  };

  // ─── Tab navigation ────────────────────────────────────

  const tabs: { key: Tab; label: string; icon: typeof BarChart3 }[] = [
    { key: "overview", label: "Overview", icon: BarChart3 },
    { key: "content", label: "All Content", icon: FileQuestion },
    { key: "users", label: "Users", icon: Users },
    { key: "activity", label: "Activity Log", icon: Activity },
  ];

  // ─── Render sections ──────────────────────────────────

  const renderOverview = () => (
    <div className="space-y-8">
      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Total Users", value: stats?.users.total ?? 0, sub: `${stats?.users.teachers ?? 0} teachers, ${stats?.users.students ?? 0} students`, icon: Users, iconColor: "text-blue-600 dark:text-blue-400", iconBg: "bg-blue-50 dark:bg-blue-900/20" },
          { label: "Total Content", value: stats?.content.total ?? 0, sub: `${stats?.content.published ?? 0} published`, icon: FileQuestion, iconColor: "text-emerald-600 dark:text-emerald-400", iconBg: "bg-emerald-50 dark:bg-emerald-900/20" },
          { label: "Classes", value: stats?.classes.total ?? 0, sub: "Active classes", icon: GraduationCap, iconColor: "text-purple-600 dark:text-purple-400", iconBg: "bg-purple-50 dark:bg-purple-900/20" },
          { label: "Quiz Avg Score", value: `${stats?.quizzes.avgScore ?? 0}%`, sub: `${stats?.quizzes.total ?? 0} total attempts`, icon: Trophy, iconColor: "text-orange-600 dark:text-orange-400", iconBg: "bg-orange-50 dark:bg-orange-900/20" },
        ].map((stat) => (
          <Card key={stat.label} className="border-border/40">
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-muted-foreground">{stat.label}</span>
                <div className={`h-9 w-9 rounded-lg ${stat.iconBg} flex items-center justify-center`}>
                  <stat.icon className={`h-4 w-4 ${stat.iconColor}`} />
                </div>
              </div>
              <div className="text-2xl font-bold text-foreground">{statsLoading ? <Skeleton className="h-7 w-16" /> : stat.value}</div>
              <p className="text-xs text-muted-foreground mt-1">{stat.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Content by type */}
      <Card className="border-border/40">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Content by Type</CardTitle>
        </CardHeader>
        <CardContent>
          {contentByType && contentByType.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
              {contentByType.map((item) => {
                const info = getTypeInfo(item.type);
                const Icon = info.icon;
                return (
                  <div key={item.type} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                    <div className={`h-9 w-9 rounded-lg ${info.bg} flex items-center justify-center shrink-0`}>
                      <Icon className={`h-4 w-4 ${info.color}`} />
                    </div>
                    <div className="min-w-0">
                      <div className="text-lg font-bold text-foreground">{item.count}</div>
                      <div className="text-xs text-muted-foreground truncate">{info.label}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">No content yet.</p>
          )}
        </CardContent>
      </Card>

      {/* Content creation timeline */}
      {timeline && timeline.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Content Created (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-1 h-32">
              {timeline.map((day) => {
                const maxCount = Math.max(...timeline.map(d => d.count));
                const height = maxCount > 0 ? (day.count / maxCount) * 100 : 0;
                return (
                  <div
                    key={day.date}
                    className="flex-1 bg-primary/20 hover:bg-primary/40 rounded-t transition-colors relative group"
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${day.date}: ${day.count} items`}
                  >
                    <div className="absolute -top-6 left-1/2 -translate-x-1/2 text-xs text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">
                      {day.count}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="flex justify-between mt-2 text-xs text-muted-foreground">
              <span>{timeline[0]?.date}</span>
              <span>{timeline[timeline.length - 1]?.date}</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recent activity */}
      {activityData && activityData.length > 0 && (
        <Card className="border-border/40">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {activityData.slice(0, 8).map((entry) => (
                <div key={entry.id} className="flex items-center justify-between py-2 border-b border-border/30 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground">{formatAction(entry.action)}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {entry.userName || entry.userEmail || "System"} &middot; {entry.entityType}
                    </p>
                  </div>
                  <span className="text-xs text-muted-foreground whitespace-nowrap ml-4">
                    {format(new Date(entry.createdAt), "MMM d, HH:mm")}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );

  const renderContentTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search content by title..."
            value={contentSearch}
            onChange={(e) => { setContentSearch(e.target.value); setContentPage(1); }}
            className="pl-9 h-10"
          />
        </div>
        <Select value={contentTypeFilter} onValueChange={(v) => { setContentTypeFilter(v); setContentPage(1); }}>
          <SelectTrigger className="w-48 h-10">
            <SelectValue placeholder="All types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All types</SelectItem>
            {Object.entries(typeIcons).map(([key, val]) => (
              <SelectItem key={key} value={key}>{val.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">Title</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Type</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Creator</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Status</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Created</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {contentLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-3"><Skeleton className="h-5 w-48" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-20" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-5 w-32" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16 ml-auto" /></td>
                  </tr>
                ))
              ) : contentData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No content found.</td>
                </tr>
              ) : (
                contentData?.items.map((item) => {
                  const info = getTypeInfo(item.type);
                  const Icon = info.icon;
                  return (
                    <tr key={item.id} className="border-b border-border/20 hover:bg-muted/20">
                      <td className="p-3">
                        <div className="flex items-center gap-2.5">
                          <div className={`h-8 w-8 rounded-md ${info.bg} flex items-center justify-center shrink-0`}>
                            <Icon className={`h-4 w-4 ${info.color}`} />
                          </div>
                          <div className="min-w-0">
                            <p className="font-medium text-foreground truncate max-w-xs">{item.title}</p>
                            {item.subject && (
                              <p className="text-xs text-muted-foreground">{item.subject}{item.gradeLevel ? ` - ${item.gradeLevel}` : ""}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline" className="text-xs">{info.label}</Badge>
                      </td>
                      <td className="p-3 hidden md:table-cell">
                        <div className="min-w-0">
                          <p className="text-sm text-foreground truncate">{item.creatorName}</p>
                          <p className="text-xs text-muted-foreground truncate">{item.creatorEmail}</p>
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {item.isPublished && <Badge variant="outline" className="text-xs border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">Published</Badge>}
                          {item.isPublic && <Badge variant="outline" className="text-xs border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-400">Public</Badge>}
                          {!item.isPublished && !item.isPublic && <span className="text-xs text-muted-foreground">Draft</span>}
                          {(() => {
                            const badge = reviewStatusBadge(item.reviewStatus);
                            return badge ? <Badge variant="outline" className={`text-xs ${badge.className}`}>{badge.label}</Badge> : null;
                          })()}
                        </div>
                      </td>
                      <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
                        {format(new Date(item.createdAt), "MMM d, yyyy")}
                      </td>
                      <td className="p-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 cursor-pointer"
                            onClick={() => navigate(`/preview/${item.id}`)}
                            title="Preview"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 cursor-pointer" title="Actions">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {item.isPublished ? (
                                <DropdownMenuItem
                                  onClick={() => publishMutation.mutate({ id: item.id, isPublished: false })}
                                  className="cursor-pointer"
                                >
                                  <XCircle className="h-4 w-4 mr-2" />
                                  Unpublish
                                </DropdownMenuItem>
                              ) : (
                                <DropdownMenuItem
                                  onClick={() => publishMutation.mutate({ id: item.id, isPublished: true })}
                                  className="cursor-pointer"
                                >
                                  <CheckCircle className="h-4 w-4 mr-2" />
                                  Publish
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => { setFlagTarget({ id: item.id, title: item.title }); setFlagStatus("flagged"); }}
                                className="cursor-pointer"
                              >
                                <Flag className="h-4 w-4 mr-2" />
                                Flag for Review
                              </DropdownMenuItem>
                              {item.reviewStatus !== "none" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() => { setFlagTarget({ id: item.id, title: item.title }); setFlagStatus("approved"); }}
                                    className="cursor-pointer"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-2 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => { setFlagTarget({ id: item.id, title: item.title }); setFlagStatus("rejected"); }}
                                    className="cursor-pointer"
                                  >
                                    <XCircle className="h-4 w-4 mr-2 text-red-600" />
                                    Reject
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => flagMutation.mutate({ id: item.id, reviewStatus: "none" })}
                                    className="cursor-pointer"
                                  >
                                    Clear Review Flag
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setReviewTarget({ id: item.id, title: item.title })}
                                className="cursor-pointer"
                              >
                                <Send className="h-4 w-4 mr-2" />
                                Share for Review
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setDeleteTarget({ id: item.id, title: item.title })}
                                className="cursor-pointer text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {contentData && contentData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Showing {((contentData.pagination.page - 1) * contentData.pagination.limit) + 1}-{Math.min(contentData.pagination.page * contentData.pagination.limit, contentData.pagination.total)} of {contentData.pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={contentPage <= 1}
                onClick={() => setContentPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {contentData.pagination.page} of {contentData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={contentPage >= contentData.pagination.totalPages}
                onClick={() => setContentPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderUsersTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or email..."
            value={usersSearch}
            onChange={(e) => { setUsersSearch(e.target.value); setUsersPage(1); }}
            className="pl-9 h-10"
          />
        </div>
        <Select value={usersRoleFilter} onValueChange={(v) => { setUsersRoleFilter(v); setUsersPage(1); }}>
          <SelectTrigger className="w-40 h-10">
            <SelectValue placeholder="All roles" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="teacher">Teacher</SelectItem>
            <SelectItem value="student">Student</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Table */}
      <Card className="border-border/40">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-muted/30">
                <th className="text-left p-3 font-medium text-muted-foreground">User</th>
                <th className="text-left p-3 font-medium text-muted-foreground">Role</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden md:table-cell">Institution</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Content</th>
                <th className="text-left p-3 font-medium text-muted-foreground hidden lg:table-cell">Joined</th>
                <th className="text-right p-3 font-medium text-muted-foreground">Actions</th>
              </tr>
            </thead>
            <tbody>
              {usersLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/20">
                    <td className="p-3"><Skeleton className="h-5 w-48" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-16" /></td>
                    <td className="p-3 hidden md:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-10" /></td>
                    <td className="p-3 hidden lg:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="p-3"><Skeleton className="h-5 w-20 ml-auto" /></td>
                  </tr>
                ))
              ) : usersData?.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-muted-foreground">No users found.</td>
                </tr>
              ) : (
                usersData?.items.map((u) => (
                  <tr key={u.id} className="border-b border-border/20 hover:bg-muted/20">
                    <td className="p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-foreground">{u.fullName}</p>
                        <p className="text-xs text-muted-foreground truncate">{u.email}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge className={`text-xs ${roleBadgeColor(u.role)}`}>{u.role}</Badge>
                    </td>
                    <td className="p-3 hidden md:table-cell text-muted-foreground">
                      {u.institution || "-"}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-muted-foreground">
                      {u.contentCount}
                    </td>
                    <td className="p-3 hidden lg:table-cell text-sm text-muted-foreground">
                      {format(new Date(u.createdAt), "MMM d, yyyy")}
                    </td>
                    <td className="p-3 text-right">
                      {u.id !== user?.id && (
                        <Select
                          value={u.role}
                          onValueChange={(newRole) => {
                            if (newRole !== u.role) {
                              setRoleChangeTarget({ id: u.id, name: u.fullName, newRole });
                            }
                          }}
                        >
                          <SelectTrigger className="w-28 h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="student">Student</SelectItem>
                            <SelectItem value="teacher">Teacher</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      )}
                      {u.id === user?.id && (
                        <span className="text-xs text-muted-foreground italic">You</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {usersData && usersData.pagination.totalPages > 1 && (
          <div className="flex items-center justify-between p-3 border-t border-border/40">
            <p className="text-sm text-muted-foreground">
              Showing {((usersData.pagination.page - 1) * usersData.pagination.limit) + 1}-{Math.min(usersData.pagination.page * usersData.pagination.limit, usersData.pagination.total)} of {usersData.pagination.total}
            </p>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={usersPage <= 1}
                onClick={() => setUsersPage(p => p - 1)}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <span className="text-sm text-muted-foreground px-2">
                Page {usersData.pagination.page} of {usersData.pagination.totalPages}
              </span>
              <Button
                variant="outline"
                size="icon"
                className="h-8 w-8 cursor-pointer"
                disabled={usersPage >= usersData.pagination.totalPages}
                onClick={() => setUsersPage(p => p + 1)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );

  const renderActivityTab = () => (
    <Card className="border-border/40">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Audit Log</CardTitle>
      </CardHeader>
      <CardContent>
        {!activityData || activityData.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No activity recorded yet.</p>
        ) : (
          <div className="space-y-2">
            {activityData.map((entry) => (
              <div key={entry.id} className="flex items-start justify-between py-3 border-b border-border/30 last:border-0 gap-4">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-foreground">{formatAction(entry.action)}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    by {entry.userName || entry.userEmail || "System"}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {entry.entityType}{entry.entityId ? ` #${entry.entityId.slice(0, 8)}...` : ""}
                  </p>
                  {entry.metadata && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {typeof entry.metadata === "object" ? Object.entries(entry.metadata).map(([k, v]) => `${k}: ${v}`).join(", ") : String(entry.metadata)}
                    </p>
                  )}
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {format(new Date(entry.createdAt), "MMM d, yyyy HH:mm")}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );

  // ─── Main render ───────────────────────────────────────

  return (
    <div className="min-h-screen flex bg-background">
      <a href="#main-content" className="skip-to-content">Skip to main content</a>

      {/* Left Sidebar - Desktop */}
      <div className="hidden lg:block">
        <DashboardSidebar />
      </div>

      {/* Left Sidebar - Mobile */}
      {sidebarOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setSidebarOpen(false)} />
          <div className="fixed left-0 top-0 bottom-0 z-50 lg:hidden">
            <DashboardSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </>
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Mobile header */}
        <div className="lg:hidden border-b border-border/40 bg-card px-4 py-3 flex items-center justify-between">
          <Button variant="ghost" size="icon" onClick={() => setSidebarOpen(!sidebarOpen)} aria-label="Toggle menu" className="cursor-pointer">
            <Menu className="h-5 w-5" />
          </Button>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5 text-red-500" />
            <h1 className="text-lg font-semibold text-foreground">Admin Dashboard</h1>
          </div>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <Shield className="h-5 w-5 text-red-500" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Admin Dashboard</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Manage all content, users, and monitor platform activity
            </p>
          </div>

          {/* Tab bar */}
          <div className="flex gap-1 mb-6 border-b border-border/40 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap cursor-pointer ${
                    activeTab === tab.key
                      ? "border-primary text-primary"
                      : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Tab content */}
          {activeTab === "overview" && renderOverview()}
          {activeTab === "content" && renderContentTab()}
          {activeTab === "users" && renderUsersTab()}
          {activeTab === "activity" && renderActivityTab()}
        </main>
      </div>

      {/* Delete confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Content?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
              disabled={deleteMutation.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Role change confirmation */}
      <AlertDialog open={!!roleChangeTarget} onOpenChange={() => setRoleChangeTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change User Role?</AlertDialogTitle>
            <AlertDialogDescription>
              Change {roleChangeTarget?.name}'s role to <strong>{roleChangeTarget?.newRole}</strong>? This will immediately affect their permissions.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={roleChangeMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => roleChangeTarget && roleChangeMutation.mutate({ id: roleChangeTarget.id, role: roleChangeTarget.newRole })}
              disabled={roleChangeMutation.isPending}
            >
              {roleChangeMutation.isPending ? "Updating..." : "Confirm"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Flag for review dialog */}
      <Dialog open={!!flagTarget} onOpenChange={() => { setFlagTarget(null); setFlagNotes(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {flagStatus === "flagged" ? "Flag Content for Review" : flagStatus === "approved" ? "Approve Content" : "Reject Content"}
            </DialogTitle>
            <DialogDescription>
              {flagStatus === "flagged"
                ? `Flag "${flagTarget?.title}" for review. The content owner will be notified.`
                : `${flagStatus === "approved" ? "Approve" : "Reject"} "${flagTarget?.title}". ${flagStatus === "approved" ? "This will also publish the content." : "This will unpublish the content."}`}
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Notes (optional)</label>
            <Textarea
              placeholder="Add notes about why this content is being flagged/reviewed..."
              value={flagNotes}
              onChange={(e) => setFlagNotes(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setFlagTarget(null); setFlagNotes(""); }} disabled={flagMutation.isPending} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={() => flagTarget && flagMutation.mutate({ id: flagTarget.id, reviewStatus: flagStatus, reviewNotes: flagNotes || undefined })}
              disabled={flagMutation.isPending}
              className="cursor-pointer"
              variant={flagStatus === "rejected" ? "destructive" : "default"}
            >
              {flagMutation.isPending ? "Updating..." : flagStatus === "flagged" ? "Flag" : flagStatus === "approved" ? "Approve" : "Reject"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Share for review dialog */}
      <Dialog open={!!reviewTarget} onOpenChange={() => { setReviewTarget(null); setReviewAssignee(""); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Share Content for Review</DialogTitle>
            <DialogDescription>
              Enter the email of the user who should review "{reviewTarget?.title}". They will receive a notification.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium text-foreground mb-1.5 block">Reviewer email</label>
            <Input
              type="email"
              placeholder="user@example.com"
              value={reviewAssignee}
              onChange={(e) => setReviewAssignee(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setReviewTarget(null); setReviewAssignee(""); }} disabled={assignReviewMutation.isPending} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={() => reviewTarget && reviewAssignee.trim() && assignReviewMutation.mutate({ contentId: reviewTarget.id, email: reviewAssignee.trim() })}
              disabled={assignReviewMutation.isPending || !reviewAssignee.trim()}
              className="cursor-pointer"
            >
              {assignReviewMutation.isPending ? "Sending..." : "Send Review Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
