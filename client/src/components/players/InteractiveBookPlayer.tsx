import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import DOMPurify from "dompurify";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, BookOpen, Check } from "lucide-react";
import type { InteractiveBookData, H5pContent } from "@shared/schema";
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

  // Ensure currentPageIndex is within bounds
  const safePageIndex = Math.max(0, Math.min(currentPageIndex, data.pages.length - 1));
  const currentPage = data.pages[safePageIndex];
  
  // Update currentPageIndex if it was out of bounds
  useEffect(() => {
    if (currentPageIndex !== safePageIndex) {
      setCurrentPageIndex(safePageIndex);
    }
  }, [currentPageIndex, safePageIndex]);

  // If no pages exist, show helpful message with link to edit
  if (!data.pages || data.pages.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">No Pages Available</h3>
          <p className="text-muted-foreground mb-4">
            This interactive book doesn't have any pages yet. Please add pages to view the book.
          </p>
          <Button
            onClick={() => window.location.href = `/create/interactive-book/${contentId}`}
            variant="outline"
            data-testid="button-edit-book"
          >
            Edit Book
          </Button>
        </CardContent>
      </Card>
    );
  }

  // If currentPage is still undefined, show error
  if (!currentPage) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Page Not Found</h3>
          <p className="text-muted-foreground">
            The requested page could not be found.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  const { data: embeddedContent, isLoading: isLoadingEmbedded, error: embeddedError } = useQuery<H5pContent>({
    queryKey: ["/api/content", currentPage?.embeddedContentId],
    enabled: !!currentPage?.embeddedContentId,
  });

  const hasLegacySnapshot = !!currentPage.embeddedContent;
  const shouldUseFetched = embeddedContent && !embeddedError;
  const shouldFallbackToLegacy = hasLegacySnapshot && (!currentPage.embeddedContentId || embeddedError || (!isLoadingEmbedded && !embeddedContent));
  
  const effectiveEmbeddedData = shouldUseFetched 
    ? embeddedContent.data 
    : (shouldFallbackToLegacy ? currentPage.embeddedContent!.data : null);
  const effectiveEmbeddedType = shouldUseFetched 
    ? embeddedContent.type 
    : (shouldFallbackToLegacy ? currentPage.embeddedContent!.type : null);
  const effectiveEmbeddedId = shouldUseFetched 
    ? embeddedContent.id 
    : contentId;
  const effectiveEmbeddedTitle = shouldUseFetched 
    ? embeddedContent.title 
    : "Embedded Activity";

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

  const completionPercentage = (viewedPages.size / data.pages.length) * 100;

  return (
    <div className="flex gap-6">
      {/* Sidebar - Desktop Only */}
      <aside className="hidden lg:block w-64 flex-shrink-0">
        <Card className="sticky top-4">
          <CardContent className="p-4">
            <h3 className="text-sm font-semibold mb-3">Table of Contents</h3>
            {data.settings.showProgress && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs text-muted-foreground">Progress</span>
                  <span className="text-xs text-muted-foreground">
                    {viewedPages.size}/{data.pages.length}
                  </span>
                </div>
                <Progress value={completionPercentage} className="h-1" data-testid="progress-bar" />
              </div>
            )}
            <nav className="space-y-1">
              {data.pages.map((page, idx) => (
                <button
                  key={page.id}
                  onClick={() => goToPage(idx)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center gap-2 ${
                    idx === currentPageIndex
                      ? "bg-primary text-primary-foreground"
                      : "hover-elevate"
                  }`}
                  data-testid={`button-page-${idx}`}
                >
                  <span className="flex-shrink-0 w-5 h-5 rounded-full border flex items-center justify-center text-xs">
                    {viewedPages.has(idx) ? (
                      <Check className="h-3 w-3" />
                    ) : (
                      idx + 1
                    )}
                  </span>
                  <span className="truncate">{page.title || "Untitled"}</span>
                </button>
              ))}
            </nav>
          </CardContent>
        </Card>
      </aside>

      {/* Main Content */}
      <div className="flex-1 min-w-0 space-y-6">
        {data.settings.showProgress && (
          <div className="lg:hidden">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">
                Page {currentPageIndex + 1} of {data.pages.length}
              </span>
              <span className="text-sm text-muted-foreground">
                {viewedPages.size} of {data.pages.length} pages viewed
              </span>
            </div>
            <Progress value={completionPercentage} data-testid="progress-bar-mobile" />
          </div>
        )}

        <Card>
          <CardContent className="p-6 md:p-8">
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

        {effectiveEmbeddedData && effectiveEmbeddedType && (
          <Card>
            <CardContent className="p-6">
              <div className="mb-4">
                <p className="text-sm text-muted-foreground uppercase tracking-wide">Interactive Activity: {effectiveEmbeddedTitle}</p>
              </div>
              {effectiveEmbeddedType === "quiz" && (
                <QuizPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "flashcard" && (
                <FlashcardPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "interactive-video" && (
                <VideoPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "image-hotspot" && (
                <ImageHotspotPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "drag-drop" && (
                <DragDropPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "fill-blanks" && (
                <FillBlanksPlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
              {effectiveEmbeddedType === "memory-game" && (
                <MemoryGamePlayer data={effectiveEmbeddedData as any} contentId={effectiveEmbeddedId} />
              )}
            </CardContent>
          </Card>
        )}

        {data.settings.showNavigation && (
          <div className="flex items-center justify-between gap-4">
            <Button
              variant="outline"
              onClick={() => goToPage(currentPageIndex - 1)}
              disabled={currentPageIndex === 0}
              data-testid="button-prev"
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Previous</span>
            </Button>
            
            {/* Mobile Page Selector */}
            <div className="lg:hidden flex-1 max-w-xs">
              <Select
                value={currentPageIndex.toString()}
                onValueChange={(value) => goToPage(parseInt(value))}
              >
                <SelectTrigger data-testid="select-page-mobile">
                  <SelectValue placeholder="Go to page..." />
                </SelectTrigger>
                <SelectContent>
                  {data.pages.map((page, idx) => (
                    <SelectItem key={page.id} value={idx.toString()}>
                      <div className="flex items-center gap-2">
                        {viewedPages.has(idx) && <Check className="h-3 w-3" />}
                        <span>
                          {idx + 1}. {page.title || "Untitled"}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              onClick={() => goToPage(currentPageIndex + 1)}
              disabled={currentPageIndex === data.pages.length - 1}
              data-testid="button-next"
            >
              <span className="hidden sm:inline">Next</span>
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
