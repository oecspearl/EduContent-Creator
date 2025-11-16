import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Share2 } from "lucide-react";
import type { H5pContent, QuizData, FlashcardData, InteractiveVideoData, ImageHotspotData, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, VideoFinderData, GoogleSlidesData } from "@shared/schema";
import { QuizPlayer } from "@/components/players/QuizPlayer";
import { FlashcardPlayer } from "@/components/players/FlashcardPlayer";
import { VideoPlayer } from "@/components/players/VideoPlayer";
import { ImageHotspotPlayer } from "@/components/players/ImageHotspotPlayer";
import { DragDropPlayer } from "@/components/players/DragDropPlayer";
import { FillBlanksPlayer } from "@/components/players/FillBlanksPlayer";
import { MemoryGamePlayer } from "@/components/players/MemoryGamePlayer";
import { InteractiveBookPlayer } from "@/components/players/InteractiveBookPlayer";
import { VideoFinderPlayer } from "@/components/players/VideoFinderPlayer";
import GoogleSlidesPlayer from "@/components/players/GoogleSlidesPlayer";
import { Skeleton } from "@/components/ui/skeleton";

export default function PreviewPage() {
  const params = useParams();
  const [_, navigate] = useLocation();
  const contentId = params.id;

  const { data: content, isLoading } = useQuery<H5pContent>({
    queryKey: ["/api/content", contentId],
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-96 w-full" />
        </div>
      </div>
    );
  }

  if (!content) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-2">Content not found</h1>
          <p className="text-muted-foreground mb-6">The content you're looking for doesn't exist.</p>
          <Button onClick={() => navigate("/")} data-testid="button-home">
            Go to Dashboard
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Skip to main content */}
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <div className="border-b bg-card" role="banner">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => navigate("/")} data-testid="button-back" aria-label="Back to dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-foreground">{content.title}</h1>
              {content.description && <p className="text-sm text-muted-foreground">{content.description}</p>}
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={() => navigate(`/share/${content.id}`)} data-testid="button-share">
            <Share2 className="h-4 w-4 mr-2" />
            Share
          </Button>
        </div>
      </div>

      {/* Content Player */}
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
        {content.type === "google-slides" && <GoogleSlidesPlayer data={content.data as GoogleSlidesData} />}
      </main>
    </div>
  );
}
