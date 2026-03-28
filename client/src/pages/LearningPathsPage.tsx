import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Plus,
  Trash2,
  GripVertical,
  Menu,
  Waypoints,
  BookOpen,
  ArrowUp,
  ArrowDown,
  CheckCircle2,
  Eye,
  AlertTriangle,
} from "lucide-react";
import { format } from "date-fns";
import type { H5pContent, Class } from "@shared/schema";

type LearningPath = {
  id: string;
  name: string;
  description: string | null;
  userId: string;
  classId: string | null;
  createdAt: string;
  updatedAt: string;
};

type PathWithItems = LearningPath & {
  items: Array<{
    id: string;
    contentId: string;
    orderIndex: number;
    isRequired: boolean;
    contentTitle: string;
    contentType: string;
  }>;
};

export default function LearningPathsPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [viewPathId, setViewPathId] = useState<string | null>(null);
  const [deletePathId, setDeletePathId] = useState<string | null>(null);

  // Form state
  const [pathName, setPathName] = useState("");
  const [pathDescription, setPathDescription] = useState("");
  const [pathClassId, setPathClassId] = useState<string>("");
  const [selectedContentIds, setSelectedContentIds] = useState<string[]>([]);

  const { data: paths, isLoading, isError } = useQuery<LearningPath[]>({
    queryKey: ["/api/learning-paths"],
    retry: 1,
  });

  const { data: contents } = useQuery<H5pContent[]>({
    queryKey: ["/api/content"],
    retry: 1,
  });

  const { data: classes } = useQuery<Class[]>({
    queryKey: ["/api/classes"],
    retry: 1,
  });

  const { data: viewPath, isLoading: loadingViewPath } = useQuery<PathWithItems>({
    queryKey: ["/api/learning-paths", viewPathId],
    enabled: !!viewPathId,
    retry: 1,
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", "/api/learning-paths", {
        name: pathName,
        description: pathDescription || undefined,
        classId: pathClassId && pathClassId !== "none" ? pathClassId : undefined,
        items: selectedContentIds.map(id => ({ contentId: id, isRequired: true })),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-paths"] });
      setCreateOpen(false);
      resetForm();
      toast({ title: "Learning path created" });
    },
    onError: () => {
      toast({ title: "Failed to create learning path", variant: "destructive" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/learning-paths/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/learning-paths"] });
      setDeletePathId(null);
      toast({ title: "Learning path deleted" });
    },
  });

  const resetForm = () => {
    setPathName("");
    setPathDescription("");
    setPathClassId("");
    setSelectedContentIds([]);
  };

  const toggleContent = (contentId: string) => {
    setSelectedContentIds(prev =>
      prev.includes(contentId)
        ? prev.filter(id => id !== contentId)
        : [...prev, contentId]
    );
  };

  const moveItem = (index: number, direction: "up" | "down") => {
    const newIds = [...selectedContentIds];
    const swapIdx = direction === "up" ? index - 1 : index + 1;
    if (swapIdx < 0 || swapIdx >= newIds.length) return;
    [newIds[index], newIds[swapIdx]] = [newIds[swapIdx], newIds[index]];
    setSelectedContentIds(newIds);
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
          <h1 className="text-lg font-semibold">Learning Paths</h1>
          <div className="w-10" />
        </div>

        <main id="main-content" className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8" role="main">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold text-foreground tracking-tight">Learning Paths</h2>
              <p className="text-sm text-muted-foreground mt-1">Create ordered sequences of content for students to follow</p>
            </div>
            <Button className="cursor-pointer gap-2" onClick={() => setCreateOpen(true)}>
              <Plus className="h-4 w-4" />
              Create Path
            </Button>
          </div>

          {/* Path list */}
          {isError ? (
            <Card className="border-border/40 border-destructive/30">
              <CardContent className="py-12 text-center">
                <AlertTriangle className="h-12 w-12 text-amber-500 mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">Database Setup Required</p>
                <p className="text-sm text-muted-foreground mt-1 max-w-md mx-auto">
                  The learning paths tables haven't been created yet. Run the database migration to enable this feature:
                </p>
                <code className="block mt-3 text-xs bg-muted p-3 rounded-md max-w-md mx-auto text-left">
                  psql $DATABASE_URL -f migrations/add_new_features.sql
                </code>
              </CardContent>
            </Card>
          ) : isLoading ? (
            <div className="space-y-3">{[1, 2, 3].map(i => <Skeleton key={i} className="h-24" />)}</div>
          ) : !paths || paths.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-16 text-center">
                <Waypoints className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-lg font-medium text-foreground">No learning paths yet</p>
                <p className="text-sm text-muted-foreground mt-1 mb-4">
                  Create a learning path to guide students through your content in a specific order.
                </p>
                <Button className="cursor-pointer" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Path
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {paths.map(path => (
                <Card key={path.id} className="border-border/40">
                  <CardContent className="p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <Waypoints className="h-4 w-4 text-primary shrink-0" />
                          <h3 className="font-semibold text-foreground truncate">{path.name}</h3>
                        </div>
                        {path.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{path.description}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-2">
                          Created {format(new Date(path.createdAt), "MMM d, yyyy")}
                        </p>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        <Button variant="outline" size="sm" className="cursor-pointer gap-1.5" onClick={() => setViewPathId(path.id)}>
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </Button>
                        <Button variant="outline" size="sm" className="cursor-pointer text-destructive" onClick={() => setDeletePathId(path.id)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>

      {/* Create Path Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create Learning Path</DialogTitle>
            <DialogDescription>
              Select content items and arrange them in the order students should complete them.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="path-name">Path Name</Label>
              <Input
                id="path-name"
                value={pathName}
                onChange={e => setPathName(e.target.value)}
                placeholder="e.g. Introduction to Fractions"
              />
            </div>

            <div>
              <Label htmlFor="path-desc">Description (optional)</Label>
              <Input
                id="path-desc"
                value={pathDescription}
                onChange={e => setPathDescription(e.target.value)}
                placeholder="Brief description of this learning path"
              />
            </div>

            <div>
              <Label>Assign to Class (optional)</Label>
              <Select value={pathClassId} onValueChange={setPathClassId}>
                <SelectTrigger>
                  <SelectValue placeholder="No class (standalone path)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No class</SelectItem>
                  {classes?.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content picker */}
            <div>
              <Label className="mb-2 block">Select & Order Content</Label>
              {!contents || contents.length === 0 ? (
                <p className="text-sm text-muted-foreground">No content available. Create some content first.</p>
              ) : (
                <div className="space-y-1 border rounded-lg p-3 max-h-48 overflow-y-auto">
                  {contents.map(content => (
                    <label
                      key={content.id}
                      className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50 cursor-pointer"
                    >
                      <Checkbox
                        checked={selectedContentIds.includes(content.id)}
                        onCheckedChange={() => toggleContent(content.id)}
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-sm font-medium truncate">{content.title}</span>
                        <Badge variant="outline" className="ml-2 text-[10px]">{content.type}</Badge>
                      </div>
                    </label>
                  ))}
                </div>
              )}
            </div>

            {/* Ordering */}
            {selectedContentIds.length > 0 && (
              <div>
                <Label className="mb-2 block">Order ({selectedContentIds.length} items)</Label>
                <div className="space-y-1 border rounded-lg p-3">
                  {selectedContentIds.map((id, index) => {
                    const content = contents?.find(c => c.id === id);
                    return (
                      <div key={id} className="flex items-center gap-2 p-2 bg-muted/30 rounded-md">
                        <span className="text-xs font-bold text-muted-foreground w-6 text-center">{index + 1}</span>
                        <GripVertical className="h-4 w-4 text-muted-foreground shrink-0" />
                        <span className="text-sm flex-1 truncate">{content?.title || id}</span>
                        <div className="flex gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer"
                            disabled={index === 0}
                            onClick={() => moveItem(index, "up")}
                          >
                            <ArrowUp className="h-3 w-3" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 cursor-pointer"
                            disabled={index === selectedContentIds.length - 1}
                            onClick={() => moveItem(index, "down")}
                          >
                            <ArrowDown className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); resetForm(); }} className="cursor-pointer">
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!pathName.trim() || selectedContentIds.length === 0 || createMutation.isPending}
              className="cursor-pointer"
            >
              {createMutation.isPending ? "Creating..." : "Create Path"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Path Dialog */}
      <Dialog open={!!viewPathId} onOpenChange={() => setViewPathId(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{viewPath?.name || "Learning Path"}</DialogTitle>
            {viewPath?.description && (
              <DialogDescription>{viewPath.description}</DialogDescription>
            )}
          </DialogHeader>
          {loadingViewPath ? (
            <div className="space-y-2">{[1, 2, 3].map(i => <Skeleton key={i} className="h-12" />)}</div>
          ) : viewPath?.items && viewPath.items.length > 0 ? (
            <div className="space-y-2">
              {viewPath.items.map((item, i) => (
                <div key={item.id} className="flex items-center gap-3 p-3 rounded-lg border border-border/40">
                  <div className="h-7 w-7 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs font-bold shrink-0">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{item.contentTitle}</p>
                    <Badge variant="outline" className="text-[10px]">{item.contentType}</Badge>
                  </div>
                  {item.isRequired && (
                    <Badge variant="secondary" className="text-[10px]">Required</Badge>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-4">No items in this path.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletePathId} onOpenChange={() => setDeletePathId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Learning Path?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this learning path. Student progress data on individual content items will not be affected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="cursor-pointer">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="cursor-pointer bg-destructive text-destructive-foreground"
              onClick={() => deletePathId && deleteMutation.mutate(deletePathId)}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
