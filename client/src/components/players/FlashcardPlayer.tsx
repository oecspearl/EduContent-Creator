import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { ChevronLeft, ChevronRight, RotateCcw, Shuffle, ImageOff } from "lucide-react";
import type { FlashcardData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type FlashcardPlayerProps = {
  data: FlashcardData;
  contentId: string;
};

export function FlashcardPlayer({ data, contentId }: FlashcardPlayerProps) {
  const [cards, setCards] = useState(data.cards);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [viewedCards, setViewedCards] = useState<Set<number>>(new Set());
  const [frontImageError, setFrontImageError] = useState(false);
  const [backImageError, setBackImageError] = useState(false);

  const { progress: savedProgress, isProgressFetched, updateProgress, logInteraction, isAuthenticated } = useProgressTracker(contentId);
  const [lastSentProgress, setLastSentProgress] = useState<number>(-1);
  const [isProgressInitialized, setIsProgressInitialized] = useState(false);
  const pendingMilestoneRef = useRef<number | null>(null);
  const pendingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousAuthRef = useRef<boolean>(isAuthenticated);

  const currentCard = cards[currentIndex];
  const progressPercentage = ((currentIndex + 1) / cards.length) * 100;

  // Sync local cards state with prop changes (e.g., from auto-save updates)
  // NOTE: Only depends on data.cards to preserve local shuffle order
  useEffect(() => {
    setCards(data.cards);
    
    // Clamp currentIndex if deck shrunk
    if (currentIndex >= data.cards.length && data.cards.length > 0) {
      setCurrentIndex(data.cards.length - 1);
      setIsFlipped(false);
      setFrontImageError(false);
      setBackImageError(false);
    }
    
    // Reset to 0 if deck became empty
    if (data.cards.length === 0) {
      setCurrentIndex(0);
      setIsFlipped(false);
      setViewedCards(new Set());
      setFrontImageError(false);
      setBackImageError(false);
    } else {
      // Clean up viewedCards: remove indices that no longer exist
      setViewedCards(prev => {
        const validIndices = new Set<number>();
        prev.forEach(index => {
          if (index < data.cards.length) {
            validIndices.add(index);
          }
        });
        
        // Recalculate progress after cleanup
        if (isAuthenticated && isProgressInitialized && validIndices.size > 0) {
          const newCompletionPercentage = Math.round((validIndices.size / data.cards.length) * 100);
          // If progress increased, update backend
          if (newCompletionPercentage > lastSentProgress && newCompletionPercentage !== pendingMilestoneRef.current) {
            setLastSentProgress(newCompletionPercentage);
            pendingMilestoneRef.current = newCompletionPercentage;
            updateProgress(newCompletionPercentage);
            // Clear pending after 5 seconds
            if (pendingTimeoutRef.current) {
              clearTimeout(pendingTimeoutRef.current);
            }
            pendingTimeoutRef.current = setTimeout(() => {
              pendingMilestoneRef.current = null;
              pendingTimeoutRef.current = null;
            }, 5000);
          }
        }
        
        return validIndices;
      });
    }
  }, [data.cards, isAuthenticated, isProgressInitialized, lastSentProgress, updateProgress]);

  // Reset image errors when current card's images change (e.g., after auto-save update)
  useEffect(() => {
    setFrontImageError(false);
    setBackImageError(false);
  }, [currentCard?.frontImageUrl, currentCard?.backImageUrl]);

  // Reset initialization when auth changes from false → true
  useEffect(() => {
    if (!previousAuthRef.current && isAuthenticated) {
      // User just logged in - reset to wait for progress fetch
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

  // Initialize from persisted progress and reconcile when savedProgress updates
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
      // After initialization, reconcile: server can only raise, never lower
      // Only update if savedProgress is truthy (skip null refetches)
      setLastSentProgress(prev => Math.max(prev, savedProgress.completionPercentage));
      // Clear pending milestone if it's been saved
      if (pendingMilestoneRef.current !== null && savedProgress.completionPercentage >= pendingMilestoneRef.current) {
        pendingMilestoneRef.current = null;
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
          pendingTimeoutRef.current = null;
        }
      }
    }
  }, [savedProgress, isProgressFetched, isAuthenticated, isProgressInitialized]);

  // Track when cards are viewed (flipped) - monotonic, only after initialization
  useEffect(() => {
    if (!isProgressInitialized || !isAuthenticated) return;
    
    if (isFlipped && !viewedCards.has(currentIndex)) {
      const newViewedCards = new Set(viewedCards).add(currentIndex);
      setViewedCards(newViewedCards);
      
      // Update progress based on cards viewed (only if higher than local high water mark and not pending)
      const completionPercentage = Math.round((newViewedCards.size / cards.length) * 100);
      if (completionPercentage > lastSentProgress && completionPercentage !== pendingMilestoneRef.current) {
        pendingMilestoneRef.current = completionPercentage;
        updateProgress(completionPercentage);
        // Clear pending after 5 seconds to allow retry on failure
        if (pendingTimeoutRef.current) {
          clearTimeout(pendingTimeoutRef.current);
        }
        pendingTimeoutRef.current = setTimeout(() => {
          pendingMilestoneRef.current = null;
          pendingTimeoutRef.current = null;
        }, 5000);
      }
      
      logInteraction("card_flipped", { cardIndex: currentIndex });
    }
  }, [isFlipped, currentIndex, lastSentProgress, isProgressInitialized, isAuthenticated]);

  const handleNext = () => {
    setIsFlipped(false);
    setFrontImageError(false);
    setBackImageError(false);
    if (currentIndex < cards.length - 1) {
      setCurrentIndex(currentIndex + 1);
    } else {
      setCurrentIndex(0);
    }
  };

  const handlePrevious = () => {
    setIsFlipped(false);
    setFrontImageError(false);
    setBackImageError(false);
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else {
      setCurrentIndex(cards.length - 1);
    }
  };

  const handleShuffle = () => {
    const shuffled = [...cards].sort(() => Math.random() - 0.5);
    setCards(shuffled);
    setCurrentIndex(0);
    setIsFlipped(false);
    setFrontImageError(false);
    setBackImageError(false);
    logInteraction("cards_shuffled");
  };

  const handleRestart = () => {
    setCards(data.cards);
    setCurrentIndex(0);
    setIsFlipped(false);
    setViewedCards(new Set());
    setFrontImageError(false);
    setBackImageError(false);
    // Don't reset lastSentProgress - keep high water mark to prevent regression
    logInteraction("cards_restarted");
  };

  // Defensive check: prevent crashes when no cards or currentCard is undefined
  if (cards.length === 0 || !currentCard) {
    return (
      <div className="max-w-2xl mx-auto space-y-6 text-center py-12">
        <p className="text-muted-foreground">No flashcards available.</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Progress */}
      {data.settings.showProgress && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              Card {currentIndex + 1} of {cards.length}
            </span>
            <span className="font-medium">{Math.round(progressPercentage)}%</span>
          </div>
          <Progress value={progressPercentage} className="h-2" />
        </div>
      )}

      {/* Flashcard */}
      <div
        className="relative cursor-pointer w-full"
        style={{ 
          aspectRatio: "3/2",
          minHeight: "300px",
        }}
        onClick={() => setIsFlipped(!isFlipped)}
        data-testid="flashcard"
      >
        <div
          className="absolute inset-0 transition-transform duration-500 w-full h-full"
          style={{
            transformStyle: "preserve-3d",
            transform: isFlipped ? "rotateY(180deg)" : "rotateY(0deg)",
            perspective: "1000px",
            WebkitPerspective: "1000px",
          }}
        >
          {/* Front */}
          <Card
            className={`absolute inset-0 ${
              isFlipped ? "invisible" : "visible"
            } flex items-center justify-center hover-elevate overflow-hidden`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(0deg)",
            }}
          >
            <CardContent className="p-8 text-center w-full">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Front</div>
                {currentCard.frontImageUrl && !frontImageError && (
                  <div className="mb-4">
                    <img 
                      src={currentCard.frontImageUrl} 
                      alt={currentCard.frontImageAlt || currentCard.front || "Flashcard front image"} 
                      className="max-w-full max-h-48 mx-auto rounded-md object-contain"
                      loading="lazy"
                      onError={() => setFrontImageError(true)}
                    />
                  </div>
                )}
                {currentCard.frontImageUrl && frontImageError && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground p-8 border border-dashed rounded-md">
                    <ImageOff className="h-5 w-5" />
                    <span className="text-sm">Image failed to load</span>
                  </div>
                )}
                {currentCard.front && (
                  <div className="text-2xl font-semibold">{currentCard.front}</div>
                )}
                {currentCard.category && (
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {currentCard.category}
                  </div>
                )}
                <div className="text-sm text-muted-foreground pt-4">Click to flip</div>
              </div>
            </CardContent>
          </Card>

          {/* Back */}
          <Card
            className={`absolute inset-0 ${
              !isFlipped ? "invisible" : "visible"
            } flex items-center justify-center bg-primary/5 hover-elevate overflow-hidden`}
            style={{
              backfaceVisibility: "hidden",
              WebkitBackfaceVisibility: "hidden",
              transform: "rotateY(180deg)",
              WebkitTransform: "rotateY(180deg)",
            }}
          >
            <CardContent className="p-8 text-center w-full">
              <div className="space-y-4">
                <div className="text-xs uppercase tracking-wide text-muted-foreground">Back</div>
                {currentCard.backImageUrl && !backImageError && (
                  <div className="mb-4">
                    <img 
                      src={currentCard.backImageUrl} 
                      alt={currentCard.backImageAlt || currentCard.back || "Flashcard back image"} 
                      className="max-w-full max-h-48 mx-auto rounded-md object-contain"
                      loading="lazy"
                      onError={() => setBackImageError(true)}
                    />
                  </div>
                )}
                {currentCard.backImageUrl && backImageError && (
                  <div className="mb-4 flex items-center justify-center gap-2 text-muted-foreground p-8 border border-dashed rounded-md">
                    <ImageOff className="h-5 w-5" />
                    <span className="text-sm">Image failed to load</span>
                  </div>
                )}
                {currentCard.back && (
                  <div className="text-2xl font-semibold">{currentCard.back}</div>
                )}
                {currentCard.category && (
                  <div className="inline-block px-3 py-1 rounded-full bg-primary/10 text-primary text-xs">
                    {currentCard.category}
                  </div>
                )}
                <div className="text-sm text-muted-foreground pt-4">Click to flip</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between gap-4">
        <Button variant="outline" size="icon" onClick={handlePrevious} data-testid="button-previous">
          <ChevronLeft className="h-5 w-5" />
        </Button>

        <div className="flex gap-2">
          {data.settings.shuffleCards && (
            <Button variant="outline" size="sm" onClick={handleShuffle} data-testid="button-shuffle">
              <Shuffle className="h-4 w-4 mr-2" />
              Shuffle
            </Button>
          )}
          <Button variant="outline" size="sm" onClick={handleRestart} data-testid="button-restart">
            <RotateCcw className="h-4 w-4 mr-2" />
            Restart
          </Button>
        </div>

        <Button variant="outline" size="icon" onClick={handleNext} data-testid="button-next">
          <ChevronRight className="h-5 w-5" />
        </Button>
      </div>
    </div>
  );
}
