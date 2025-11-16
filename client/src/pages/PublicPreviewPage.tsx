import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { BookOpen } from "lucide-react";
import type { H5pContent, QuizData, FlashcardData, InteractiveVideoData, ImageHotspotData, DragAndDropData, FillInBlanksData, MemoryGameData, InteractiveBookData, VideoFinderData } from "@shared/schema";
import { QuizPlayer } from "@/components/players/QuizPlayer";
import { FlashcardPlayer } from "@/components/players/FlashcardPlayer";
import { VideoPlayer } from "@/components/players/VideoPlayer";
import { ImageHotspotPlayer } from "@/components/players/ImageHotspotPlayer";
import { DragDropPlayer } from "@/components/players/DragDropPlayer";
import { FillBlanksPlayer } from "@/components/players/FillBlanksPlayer";
import { MemoryGamePlayer } from "@/components/players/MemoryGamePlayer";
import { InteractiveBookPlayer } from "@/components/players/InteractiveBookPlayer";
import { VideoFinderPlayer } from "@/components/players/VideoFinderPlayer";

export default function PublicPreviewPage() {
  const params = useParams();
  const contentId = params.id;

  const { data: content, isLoading, error } = useQuery<H5pContent>({
    queryKey: ["/api/preview", contentId],
    retry: false,
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
      <a href="#main-content" className="skip-to-content">
        Skip to main content
      </a>
      
      {/* Header */}
      <div className="border-b bg-card" role="banner">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-start gap-4">
            <img 
              src="/favicon.png" 
              alt="OECS Content Creator Logo" 
              className="h-12 w-12 rounded-lg flex-shrink-0"
            />
            <div>
              <h1 className="text-2xl font-bold text-foreground mb-1">{content.title}</h1>
              {content.description && (
                <p className="text-muted-foreground">{content.description}</p>
              )}
            </div>
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
