import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import {
  ClipboardCheck, Menu, Clock, CheckCircle, ArrowRight,
} from "lucide-react";

type ReviewItem = {
  id: string;
  contentId: string;
  status: string;
  recommendation: string | null;
  createdAt: string;
  completedAt: string | null;
  contentTitle: string;
  contentType: string;
  contentDescription: string | null;
  requestedByName: string;
  requestedByEmail: string;
};

const statusConfig: Record<string, { label: string; className: string; icon: typeof Clock }> = {
  pending: { label: "Pending", className: "border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-400", icon: Clock },
  in_progress: { label: "In Progress", className: "border-orange-200 dark:border-orange-800 text-orange-700 dark:text-orange-400", icon: Clock },
  completed: { label: "Completed", className: "border-green-200 dark:border-green-800 text-green-700 dark:text-green-400", icon: CheckCircle },
};

export default function MyReviewsPage() {
  const [_, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const { data: reviews = [], isLoading } = useQuery<ReviewItem[]>({
    queryKey: ["/api/reviews/mine"],
  });

  const pendingReviews = reviews.filter((r) => r.status !== "completed");
  const completedReviews = reviews.filter((r) => r.status === "completed");

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
          <h1 className="text-lg font-semibold">My Reviews</h1>
          <div className="w-10" />
        </div>

        <main className="flex-1 overflow-y-auto px-4 lg:px-8 py-6 lg:py-8 max-w-4xl">
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-1">
              <ClipboardCheck className="h-5 w-5 text-primary" />
              <h2 className="text-2xl font-bold text-foreground tracking-tight">My Reviews</h2>
            </div>
            <p className="text-sm text-muted-foreground">
              Content assigned to you for review
            </p>
          </div>

          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-24 w-full" />)}
            </div>
          ) : reviews.length === 0 ? (
            <Card className="border-border/40">
              <CardContent className="py-12 text-center">
                <ClipboardCheck className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm font-medium text-foreground mb-1">No reviews assigned</p>
                <p className="text-xs text-muted-foreground">You'll see content here when an admin asks you to review it.</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6">
              {pendingReviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Needs Your Review ({pendingReviews.length})</h3>
                  <div className="space-y-3">
                    {pendingReviews.map((review) => {
                      const status = statusConfig[review.status] || statusConfig.pending;
                      return (
                        <Card key={review.id} className="border-border/40 hover:bg-muted/20 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <p className="text-sm font-semibold text-foreground truncate">{review.contentTitle}</p>
                                  <Badge variant="outline" className="text-xs">{review.contentType}</Badge>
                                  <Badge variant="outline" className={`text-xs ${status.className}`}>{status.label}</Badge>
                                </div>
                                <p className="text-xs text-muted-foreground">
                                  Requested by {review.requestedByName} &middot; {format(new Date(review.createdAt), "MMM d, yyyy")}
                                </p>
                              </div>
                              <Button
                                size="sm"
                                onClick={() => navigate(`/reviews/${review.id}`)}
                                className="cursor-pointer ml-4"
                              >
                                Start Review
                                <ArrowRight className="h-4 w-4 ml-1" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                </div>
              )}

              {completedReviews.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-muted-foreground mb-3">Completed ({completedReviews.length})</h3>
                  <div className="space-y-3">
                    {completedReviews.map((review) => (
                      <Card key={review.id} className="border-border/40 opacity-75">
                        <CardContent className="p-4">
                          <div className="flex items-center justify-between">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <p className="text-sm font-medium text-foreground truncate">{review.contentTitle}</p>
                                <Badge variant="outline" className="text-xs">{review.contentType}</Badge>
                                <Badge variant="outline" className="text-xs border-green-200 dark:border-green-800 text-green-700 dark:text-green-400">
                                  {review.recommendation === "approve" ? "Approved" : review.recommendation === "reject" ? "Rejected" : "Needs Changes"}
                                </Badge>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                Completed {review.completedAt ? format(new Date(review.completedAt), "MMM d, yyyy") : ""}
                              </p>
                            </div>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/reviews/${review.id}`)}
                              className="cursor-pointer ml-4"
                            >
                              View
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
