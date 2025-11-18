import { useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { BookOpen, Copy } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { queryClient, apiRequest } from "@/lib/queryClient";
import type { H5pContent, QuizData, FlashcardData, InteractiveVideoData, ImageHotspotData, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, VideoFinderData, PresentationData } from "@shared/schema";
import { QuizPlayer } from "@/components/players/QuizPlayer";
import { FlashcardPlayer } from "@/components/players/FlashcardPlayer";
import { VideoPlayer } from "@/components/players/VideoPlayer";
import { ImageHotspotPlayer } from "@/components/players/ImageHotspotPlayer";
import { DragDropPlayer } from "@/components/players/DragDropPlayer";
import { FillBlanksPlayer } from "@/components/players/FillBlanksPlayer";
import { MemoryGamePlayer } from "@/components/players/MemoryGamePlayer";
import { InteractiveBookPlayer } from "@/components/players/InteractiveBookPlayer";
import { VideoFinderPlayer } from "@/components/players/VideoFinderPlayer";
import PresentationPlayer from "@/components/players/PresentationPlayer";

export default function PublicPreviewPage() {
  const params = useParams();
  const contentId = params.id;
  const [, setLocation] = useLocation();
  const { toast } = useToast();

  const { data: content, isLoading, error } = useQuery<H5pContent>({
    queryKey: ["/api/preview", contentId],
    retry: false,
  });

  const copyMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/content/${contentId}/copy`);
      return (await res.json()) as H5pContent;
    },
    onSuccess: (copiedContent) => {
      queryClient.invalidateQueries({ queryKey: ["/api/content"] });
      queryClient.invalidateQueries({ queryKey: ["/api/content/public"] });
      toast({
        title: "Content Copied!",
        description: `"${copiedContent.title}" has been added to your content library.`,
      });
      setLocation("/dashboard");
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Failed to copy content. Please try again.";
      toast({
        title: "Copy Failed",
        description: errorMessage,
        variant: "destructive",
      });
    },
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (error || !content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <Card className="max-w-md w-full p-8 text-center">
          <div className="mb-6">
            <div className="h-16 w-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
              <BookOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-2">Content Not Available</h1>
            <p className="text-muted-foreground">
              This content doesn't exist or hasn't been published yet.
            </p>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-content" data-testid="link-skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <div className="border-b bg-card" role="banner">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-4 flex-1">
              <img 
                src="/favicon.png" 
                alt="OECS Content Creator Logo" 
                className="h-12 w-12 rounded-lg flex-shrink-0"
                data-testid="img-logo"
              />
              <div>
                <h1 className="text-2xl font-bold text-foreground mb-1" data-testid="text-content-title">{content.title}</h1>
                {content.description && (
                  <p className="text-muted-foreground" data-testid="text-content-description">{content.description}</p>
                )}
              </div>
            </div>
            <Button 
              onClick={() => copyMutation.mutate()}
              disabled={copyMutation.isPending}
              data-testid="button-copy-content"
              className="flex-shrink-0"
            >
              <Copy className="h-4 w-4 mr-2" />
              {copyMutation.isPending ? "Copying..." : "Copy to My Content"}
            </Button>
          </div>
        </div>
      </div>

      {/* Content Player - Public preview doesn't track progress */}
      <main id="main-content" className="max-w-7xl mx-auto px-6 py-8" role="main">
        {content.type === "quiz" && <QuizPlayer data={content.data as QuizData} contentId={content.id} />}
        {content.type === "flashcard" && <FlashcardPlayer data={content.data as FlashcardData} contentId={content.id} />}
        {content.type === "interactive-video" && <VideoPlayer data={content.data as InteractiveVideoData} contentId={content.id} />}
        {content.type === "image-hotspot" && <ImageHotspotPlayer data={content.data as ImageHotspotData} contentId={content.id} />}
        {content.type === "drag-drop" && <DragDropPlayer data={content.data as DragAndDropData} contentId={content.id} />}
        {content.type === "fill-blanks" && <FillBlanksPlayer data={content.data as FillInBlanksData} contentId={content.id} />}
        {content.type === "memory-game" && <MemoryGamePlayer data={content.data as MemoryGameData} contentId={content.id} />}
        {content.type === "interactive-book" && <InteractiveBookPlayer data={content.data as InteractiveBookData} contentId={content.id} />}
        {content.type === "video-finder" && <VideoFinderPlayer data={content.data as VideoFinderData} />}
        {content.type === "presentation" && <PresentationPlayer data={content.data as PresentationData} />}
      </main>

      {/* Footer */}
      <div className="border-t bg-card mt-12">
        <div className="max-w-7xl mx-auto px-6 py-4 text-center text-sm text-muted-foreground">
          Created with <span className="text-primary font-semibold">OECS Content Creator</span>
        </div>
      </div>
    </div>
  );
}
