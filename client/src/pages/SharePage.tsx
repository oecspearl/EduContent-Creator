import { useState } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Breadcrumbs } from "@/components/Breadcrumbs";
import { useBreadcrumbs } from "@/hooks/useBreadcrumbs";
import { ArrowLeft, Copy, Check, Share2, Globe } from "lucide-react";
import type { H5pContent } from "@shared/schema";

export default function SharePage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const { toast } = useToast();
  const contentId = params.id;
  const [copied, setCopied] = useState(false);

  const { data: content } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
  });

  const breadcrumbs = useBreadcrumbs(contentId);

  const shareMutation = useMutation({
    mutationFn: async () => {
      return await apiRequest("POST", `/api/content/${contentId}/share`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/content", contentId] });
      toast({ title: "Share link created!", description: "Content is now publicly accessible." });
    },
  });

  const shareUrl = content?.isPublished
    ? `${window.location.origin}/public/${contentId}`
    : null;

  const handleCopy = async () => {
    if (shareUrl) {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      toast({ title: "Copied!", description: "Share link copied to clipboard." });
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleCreateShare = async () => {
    await shareMutation.mutateAsync();
  };

  if (!content) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-foreground">Share Content</h1>
          </div>
        </div>
      </div>

      {/* Breadcrumbs */}
      <div className="bg-background border-b">
        <div className="max-w-7xl mx-auto px-6 py-3">
          <Breadcrumbs items={breadcrumbs} />
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-6 py-12">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3 mb-2">
              <div className="h-12 w-12 bg-primary/10 rounded-lg flex items-center justify-center">
                <Share2 className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>{content.title}</CardTitle>
                <CardDescription>Share this content with others</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {!content.isPublished ? (
              <div className="bg-muted/50 rounded-lg p-6 text-center space-y-4">
                <Globe className="h-12 w-12 text-muted-foreground mx-auto" />
                <div>
                  <h3 className="font-semibold text-foreground mb-2">Content is not published</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Publish your content to make it publicly accessible via a shareable link.
                  </p>
                  <Button onClick={handleCreateShare} disabled={shareMutation.isPending} data-testid="button-publish-share">
                    {shareMutation.isPending ? "Publishing..." : "Publish & Create Share Link"}
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold text-foreground mb-3">Public Share Link</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Anyone with this link can view your content. No account required.
                  </p>
                  <div className="flex gap-2">
                    <Input value={shareUrl || ""} readOnly className="font-mono text-sm" data-testid="input-share-url" />
                    <Button onClick={handleCopy} variant="outline" data-testid="button-copy-link">
                      {copied ? (
                        <>
                          <Check className="h-4 w-4 mr-2" />
                          Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-4 w-4 mr-2" />
                          Copy
                        </>
                      )}
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t">
                  <h3 className="font-semibold text-foreground mb-3">Quick Actions</h3>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" asChild data-testid="button-preview">
                      <a href={shareUrl || "#"} target="_blank" rel="noopener noreferrer">
                        Preview in New Tab
                      </a>
                    </Button>
                  </div>
                </div>

                <div className="bg-muted/30 rounded-lg p-4">
                  <p className="text-xs text-muted-foreground">
                    <strong>Note:</strong> To make this content private again, unpublish it from the editor page.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
