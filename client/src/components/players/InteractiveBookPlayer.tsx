import { useState, useEffect, useRef } from "react";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, BookOpen } from "lucide-react";
import type { InteractiveBookData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";
import { QuizPlayer } from "./QuizPlayer";
import { FlashcardPlayer } from "./FlashcardPlayer";
import { VideoPlayer } from "./VideoPlayer";
import { ImageHotspotPlayer } from "./ImageHotspotPlayer";
import { DragDropPlayer } from "./DragDropPlayer";
import { FillBlanksPlayer } from "./FillBlanksPlayer";
import { MemoryGamePlayer } from "./MemoryGamePlayer";

type InteractiveBookPlayerProps = {
  data: InteractiveBookData;
  contentId: string;
};

export function InteractiveBookPlayer({ data, contentId }: InteractiveBookPlayerProps) {
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [viewedPages, setViewedPages] = useState<Set<number>>(new Set([0]));

  const { progress: savedProgress, isProgressFetched, updateProgress, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [lastSentProgress, setLastSentProgress] = useState<number>(-1);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(isAuthenticated);

  useEffect(() => {
    if (!previousAuthRef.current && isAuthenticated) {
      setIsProgressInitialized(false);
      setLastSentProgress(-1);
      pendingMilestoneRef.current = null;
      if (pendingTimeoutRef.current) {
        clearTimeout(pendingTimeoutRef.current);
        pendingTimeoutRef.current = null;
      }
    }
    previousAuthRef.current = isAuthenticated;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isProgressInitialized) {
      if (!isAuthenticated) {
        setIsProgressInitialized(true);
      } else if (isProgressFetched) {
        if (savedProgress) {
          setLastSentProgress(savedProgress.completionPercentage);
        }
        setIsProgressInitialized(true);
      }
    } else if (savedProgress) {
      setLastSentProgress(prev => Math.max(prev, savedProgress.completionPercentage));
      if (pendingMilestoneRef.current !== null && savedProgress.completionPercentage >= pendingMilestoneRef.current) {
        pendingMilestoneRef.current = null;
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      }
    }
  }, [savedProgress, isProgressFetched, isAuthenticated, isProgressInitialized]);

  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;

    if (viewedPages.size > 0 && data.pages.length > 0) {
      const completionPercentage = Math.round((viewedPages.size / data.pages.length) * 100);
      if (completionPercentage > lastSentProgress && completionPercentage !== pendingMilestoneRef.current) {
        pendingMilestoneRef.current = completionPercentage;
        updateProgress(completionPercentage);
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
        }
        pendingTimeoutRef.current = setTimeout(() => {
          pendingMilestoneRef.current = null;
          pendingTimeoutRef.current = null;
        }, 5000);
      }
    }
  }, [viewedPages.size, lastSentProgress, isProgressInitialized, isAuthenticated]);

  const goToPage = (index: number) => {
    if (index >= 0 && index < data.pages.length) {
      setCurrentPageIndex(index);
      setViewedPages(prev => new Set(prev).add(index));
      logInteraction("page_viewed", { pageIndex: index });
    }
  };

  const currentPage = data.pages[currentPageIndex];
  const completionPercentage = (viewedPages.size / data.pages.length) * 100;

  return (
    <div className="space-y-6">
      {data.settings.showProgress && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-muted-foreground">
              Page {currentPageIndex + 1} of {data.pages.length}
            </span>
            <span className="text-sm text-muted-foreground">
              {viewedPages.size} of {data.pages.length} pages viewed
            </span>
          </div>
          <Progress value={completionPercentage} data-testid="progress-bar" />
        </div>
      )}

      <Card>
        <CardContent className="p-8">
          <div className="flex items-center gap-3 mb-6">
            <BookOpen className="h-6 w-6 text-primary" />
            <h2 className="text-2xl font-bold">{currentPage.title}</h2>
          </div>
          <div 
            className="prose prose-slate max-w-none dark:prose-invert"
            dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(currentPage.content) }}
          />
        </CardContent>
      </Card>

      {currentPage.embeddedContent && (
        <Card>
          <CardContent className="p-6">
            <div className="mb-4">
              <p className="text-sm text-muted-foreground uppercase tracking-wide">Interactive Activity</p>
            </div>
            {currentPage.embeddedContent.type === "quiz" && (
              <QuizPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "flashcard" && (
              <FlashcardPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "interactive-video" && (
              <VideoPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "image-hotspot" && (
              <ImageHotspotPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "drag-drop" && (
              <DragDropPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "fill-blanks" && (
              <FillBlanksPlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
            {currentPage.embeddedContent.type === "memory-game" && (
              <MemoryGamePlayer data={currentPage.embeddedContent.data as any} contentId={contentId} />
            )}
          </CardContent>
        </Card>
      )}

      {data.settings.showNavigation && (
        <div className="flex items-center justify-between">
          <Button
            variant="outline"
            onClick={() => goToPage(currentPageIndex - 1)}
            disabled={currentPageIndex === 0}
            data-testid="button-prev"
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Button>
          <Button
            variant="outline"
            onClick={() => goToPage(currentPageIndex + 1)}
            disabled={currentPageIndex === data.pages.length - 1}
            data-testid="button-next"
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Button>
        </div>
      )}

      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium mb-3">Table of Contents</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            {data.pages.map((page, idx) => (
              <Button
                key={page.id}
                variant={idx === currentPageIndex ? "default" : "outline"}
                size="sm"
                onClick={() => goToPage(idx)}
                className="justify-start"
                data-testid={`button-page-${idx}`}
              >
                <span className="truncate">
                  {idx + 1}. {page.title || "Untitled"}
                </span>
                {viewedPages.has(idx) && idx !== currentPageIndex && (
                  <span className="ml-1">✓</span>
                )}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
