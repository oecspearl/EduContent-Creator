import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RotateCcw, Trophy } from "lucide-react";
import type { MemoryGameData, MemoryCard } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type MemoryGamePlayerProps = {
  data: MemoryGameData;
  contentId: string;
};

export function MemoryGamePlayer({ data, contentId }: MemoryGamePlayerProps) {
  const [shuffledCards, setShuffledCards] = useState<MemoryCard[]>([]);
  const [flippedIndices, setFlippedIndices] = useState<number[]>([]);
  const [matchedPairs, setMatchedPairs] = useState<Set<string>>(new Set());
  const [moves, setMoves] = useState(0);
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

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

    const uniqueMatches = matchedPairs.size;
    const totalPairs = data.cards.length / 2;
    if (uniqueMatches > 0 && totalPairs > 0) {
      const completionPercentage = Math.round((uniqueMatches / totalPairs) * 100);
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
  }, [matchedPairs.size, lastSentProgress, isProgressInitialized, isAuthenticated]);

  useEffect(() => {
    const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setStartTime(Date.now());
  }, [data.cards]);

  useEffect(() => {
    if (data.settings.showTimer && !isComplete) {
      const interval = setInterval(() => {
        setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [data.settings.showTimer, isComplete, startTime]);

  useEffect(() => {
    if (flippedIndices.length === 2) {
      const [first, second] = flippedIndices;
      const firstCard = shuffledCards[first];
      const secondCard = shuffledCards[second];

      if (firstCard.matchId === secondCard.matchId) {
        setMatchedPairs(prev => new Set(prev).add(firstCard.matchId));
        setFlippedIndices([]);
        logInteraction("cards_matched", { matchId: firstCard.matchId });
      } else {
        setTimeout(() => {
          setFlippedIndices([]);
        }, 1000);
      }
      setMoves(prev => prev + 1);
    }
  }, [flippedIndices]);

  useEffect(() => {
    if (matchedPairs.size > 0 && matchedPairs.size === data.cards.length / 2) {
      setIsComplete(true);
      logInteraction("game_completed", {
        moves,
        time: elapsedTime,
      });
    }
  }, [matchedPairs.size]);

  const handleCardClick = (index: number) => {
    if (flippedIndices.length === 2) return;
    if (flippedIndices.includes(index)) return;
    if (matchedPairs.has(shuffledCards[index].matchId)) return;

    setFlippedIndices([...flippedIndices, index]);
  };

  const reset = () => {
    const shuffled = [...data.cards].sort(() => Math.random() - 0.5);
    setShuffledCards(shuffled);
    setFlippedIndices([]);
    setMatchedPairs(new Set());
    setMoves(0);
    setStartTime(Date.now());
    setElapsedTime(0);
    setIsComplete(false);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          {data.settings.showTimer && (
            <Badge variant="secondary" data-testid="badge-timer">
              Time: {formatTime(elapsedTime)}
            </Badge>
          )}
          {data.settings.showMoves && (
            <Badge variant="secondary" data-testid="badge-moves">
              Moves: {moves}
            </Badge>
          )}
        </div>
        <Button onClick={reset} variant="outline" size="sm" data-testid="button-reset">
          <RotateCcw className="h-4 w-4 mr-2" />
          Reset
        </Button>
      </div>

      {isComplete && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
              <p className="text-2xl font-bold mb-2">Congratulations!</p>
              <p className="text-muted-foreground">
                You completed the game in {moves} moves and {formatTime(elapsedTime)}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${data.settings.columns || 4}, minmax(0, 1fr))`,
        }}
      >
        {shuffledCards.map((card, index) => {
          const isFlipped = flippedIndices.includes(index) || matchedPairs.has(card.matchId);
          return (
            <Card
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={`aspect-square cursor-pointer transition-all ${
                isFlipped ? "bg-primary text-primary-foreground" : "hover-elevate active-elevate-2"
              }`}
              data-testid={`card-${index}`}
            >
              <CardContent className="h-full flex items-center justify-center p-2">
                {isFlipped ? (
                  card.type === "image" && card.imageUrl ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <img
                        src={card.imageUrl}
                        alt={card.content || "Memory card"}
                        className="max-w-full max-h-full object-contain rounded"
                      />
                    </div>
                  ) : (
                    <p className="text-center text-sm font-medium break-words">{card.content}</p>
                  )
                ) : (
                  <p className="text-muted-foreground">?</p>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
