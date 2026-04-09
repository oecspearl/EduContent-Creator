import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  ArrowLeft, CheckCircle, XCircle, AlertTriangle, Eye, Save, Send, Menu,
} from "lucide-react";

type ChecklistItem = {
  item: string;
  checked: boolean;
  notes: string;
};

type ReviewData = {
  id: string;
  contentId: string;
  status: string;
  checklist: ChecklistItem[];
  feedback: string | null;
  recommendation: string | null;
  createdAt: string;
  completedAt: string | null;
  contentTitle: string;
  contentType: string;
  contentDescription: string | null;
};

export default function ReviewPage() {
  const { id: reviewId } = useParams<{ id: string }>();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [confirmSubmit, setConfirmSubmit] = useState(false);

  const { data: review, isLoading } = useQuery<ReviewData>({
    queryKey: ["/api/reviews", reviewId],
    enabled: !!reviewId,
  });

  const [checklist, setChecklist] = useState<ChecklistItem[]>([]);
  const [feedback, setFeedback] = useState("");
  const [recommendation, setRecommendation] = useState("");
  const [initialized, setInitialized] = useState(false);

  // Initialize local state from fetched data
  if (review && !initialized) {
    setChecklist(review.checklist || []);
    setFeedback(review.feedback || "");
    setRecommendation(review.recommendation || "");
    setInitialized(true);
  }

  const saveMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/reviews/${reviewId}/submit`, {
        checklist,
        feedback: feedback || null,
        recommendation: recommendation || null,
        status: "in_progress",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Progress saved" });
    },
    onError: (err: any) => {
      toast({ title: "Save failed", description: err.message, variant: "destructive" });
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("PATCH", `/api/reviews/${reviewId}/submit`, {
        checklist,
        feedback: feedback || null,
        recommendation,
        status: "completed",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/reviews"] });
      toast({ title: "Review submitted successfully" });
      navigate("/reviews");
    },
    onError: (err: any) => {
      toast({ title: "Submit failed", description: err.message, variant: "destructive" });
      setConfirmSubmit(false);
    },
  });

  const updateChecklistItem = (index: number, updates: Partial<ChecklistItem>) => {
    setChecklist((prev) => prev.map((item, i) => (i === index ? { ...item, ...updates } : item)));
  };

  const isCompleted = review?.status === "completed";
  const checkedCount = checklist.filter((c) => c.checked).length;

  return (
    <div className="min-h-screen flex bg-background">
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
          <h1 className="text-lg font-semibold">Content Review</h1>
          <div className="w-10" />
        </div>

        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
          <Button variant="ghost" className="mb-4 cursor-pointer" onClick={() => navigate("/reviews")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Reviews
          </Button>

          {isLoading ? (
            <div className="space-y-4">
              <Skeleton className="h-8 w-64" />
              <Skeleton className="h-48 w-full" />
            </div>
          ) : !review ? (
            <p className="text-muted-foreground">Review not found.</p>
          ) : (
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h2 className="text-2xl font-bold text-foreground">{review.contentTitle}</h2>
                  <Badge variant="outline" className="text-xs">{review.contentType}</Badge>
                  {isCompleted && <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300">Completed</Badge>}
                </div>
                {review.contentDescription && (
                  <p className="text-sm text-muted-foreground">{review.contentDescription}</p>
                )}
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-3 cursor-pointer"
                  onClick={() => navigate(`/preview/${review.contentId}`)}
                >
                  <Eye className="h-4 w-4 mr-2" />
                  View Content
                </Button>
              </div>

              {/* Checklist */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center justify-between">
                    <span>Review Checklist</span>
                    <span className="text-sm font-normal text-muted-foreground">
                      {checkedCount} of {checklist.length} completed
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {checklist.map((item, index) => (
                      <div key={index} className="border border-border/40 rounded-lg p-4">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id={`check-${index}`}
                            checked={item.checked}
                            onCheckedChange={(checked) => updateChecklistItem(index, { checked: !!checked })}
                            disabled={isCompleted}
                            className="mt-0.5"
                          />
                          <div className="flex-1 min-w-0">
                            <Label
                              htmlFor={`check-${index}`}
                              className={`text-sm font-medium cursor-pointer ${item.checked ? "text-foreground" : "text-muted-foreground"}`}
                            >
                              {item.item}
                            </Label>
                            <Textarea
                              placeholder="Add notes (optional)..."
                              value={item.notes}
                              onChange={(e) => updateChecklistItem(index, { notes: e.target.value })}
                              disabled={isCompleted}
                              className="mt-2 text-xs min-h-[60px]"
                              rows={2}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Overall feedback */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Overall Feedback</CardTitle>
                </CardHeader>
                <CardContent>
                  <Textarea
                    placeholder="Write your overall feedback about this content..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                    disabled={isCompleted}
                    rows={4}
                  />
                </CardContent>
              </Card>

              {/* Recommendation */}
              <Card className="border-border/40">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Recommendation</CardTitle>
                </CardHeader>
                <CardContent>
                  <RadioGroup
                    value={recommendation}
                    onValueChange={setRecommendation}
                    disabled={isCompleted}
                    className="space-y-3"
                  >
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30">
                      <RadioGroupItem value="approve" id="rec-approve" />
                      <Label htmlFor="rec-approve" className="flex items-center gap-2 cursor-pointer flex-1">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <div>
                          <p className="text-sm font-medium">Approve</p>
                          <p className="text-xs text-muted-foreground">Content is ready to be published</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30">
                      <RadioGroupItem value="needs_changes" id="rec-changes" />
                      <Label htmlFor="rec-changes" className="flex items-center gap-2 cursor-pointer flex-1">
                        <AlertTriangle className="h-4 w-4 text-yellow-600" />
                        <div>
                          <p className="text-sm font-medium">Needs Changes</p>
                          <p className="text-xs text-muted-foreground">Content requires revisions before publishing</p>
                        </div>
                      </Label>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border border-border/40 hover:bg-muted/30">
                      <RadioGroupItem value="reject" id="rec-reject" />
                      <Label htmlFor="rec-reject" className="flex items-center gap-2 cursor-pointer flex-1">
                        <XCircle className="h-4 w-4 text-red-600" />
                        <div>
                          <p className="text-sm font-medium">Reject</p>
                          <p className="text-xs text-muted-foreground">Content is not suitable for publishing</p>
                        </div>
                      </Label>
                    </div>
                  </RadioGroup>
                </CardContent>
              </Card>

              {/* Actions */}
              {!isCompleted && (
                <div className="flex items-center gap-3 pb-8">
                  <Button
                    variant="outline"
                    onClick={() => saveMutation.mutate()}
                    disabled={saveMutation.isPending}
                    className="cursor-pointer"
                  >
                    <Save className="h-4 w-4 mr-2" />
                    {saveMutation.isPending ? "Saving..." : "Save Progress"}
                  </Button>
                  <Button
                    onClick={() => setConfirmSubmit(true)}
                    disabled={!recommendation || submitMutation.isPending}
                    className="cursor-pointer"
                  >
                    <Send className="h-4 w-4 mr-2" />
                    Submit Review
                  </Button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>

      <AlertDialog open={confirmSubmit} onOpenChange={setConfirmSubmit}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Submit Review?</AlertDialogTitle>
            <AlertDialogDescription>
              Once submitted, you won't be able to edit your review. The admin who requested this review will be notified.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={submitMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => submitMutation.mutate()}
              disabled={submitMutation.isPending}
            >
              {submitMutation.isPending ? "Submitting..." : "Submit"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
