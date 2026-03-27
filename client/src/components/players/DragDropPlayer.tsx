import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import type { DragAndDropData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type DragDropPlayerProps = {
  data: DragAndDropData;
  contentId: string;
};

export function DragDropPlayer({ data, contentId }: DragDropPlayerProps) {
  const [draggedItem, setDraggedItem] = useState<string | null>(null);
  const [placements, setPlacements] = useState<Record<string, string>>({});
  const [feedback, setFeedback] = useState<Record<string, boolean>>({});
  const [showResults, setShowResults] = useState(false);

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

    const placedCount = Object.keys(placements).length;
    if (placedCount > 0 && data.items.length > 0) {
      const completionPercentage = Math.round((placedCount / data.items.length) * 100);
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
  }, [placements, lastSentProgress, isProgressInitialized, isAuthenticated]);

  const handleDragStart = (itemId: string) => {
    setDraggedItem(itemId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (zoneId: string) => {
    if (!draggedItem) return;

    const zone = data.zones.find(z => z.id === zoneId);
    if (!zone) return;

    if (!zone.allowMultiple) {
      const existingInZone = Object.entries(placements).find(([_, z]) => z === zoneId);
      if (existingInZone && existingInZone[0] !== draggedItem) return;
    }

    setPlacements(prev => ({ ...prev, [draggedItem]: zoneId }));

    if (data.settings.instantFeedback) {
      const item = data.items.find(i => i.id === draggedItem);
      const isCorrect = item?.correctZone === zoneId;
      setFeedback(prev => ({ ...prev, [draggedItem]: isCorrect }));
      logInteraction("item_dropped", {
        itemId: draggedItem,
        zoneId,
        isCorrect,
      });
    }

    setDraggedItem(null);
  };

  const checkAnswers = () => {
    const newFeedback: Record<string, boolean> = {};
    data.items.forEach(item => {
      const placedZone = placements[item.id];
      newFeedback[item.id] = placedZone === item.correctZone;
    });
    setFeedback(newFeedback);
    setShowResults(true);

    const correct = Object.values(newFeedback).filter(Boolean).length;
    logInteraction("check_answers", {
      score: correct,
      total: data.items.length,
    });
  };

  const reset = () => {
    setPlacements({});
    setFeedback({});
    setShowResults(false);
    setDraggedItem(null);
  };

  const score = Object.values(feedback).filter(Boolean).length;
  const total = data.items.length;
  const completionPercentage = Object.keys(placements).length > 0 ? (Object.keys(placements).length / total) * 100 : 0;
  const scorePercentage = total > 0 ? Math.round((score / total) * 100) : 0;

  // Calculate grade based on percentage
  const getGrade = (percentage: number): { grade: string; color: string; message: string } => {
    if (percentage >= 90) return { grade: "A+", color: "text-green-600", message: "Excellent! Outstanding work!" };
    if (percentage >= 80) return { grade: "A", color: "text-green-600", message: "Great job! Well done!" };
    if (percentage >= 70) return { grade: "B", color: "text-blue-600", message: "Good work! Keep it up!" };
    if (percentage >= 60) return { grade: "C", color: "text-yellow-600", message: "Not bad! Review and try again." };
    if (percentage >= 50) return { grade: "D", color: "text-orange-600", message: "Keep practicing! You can do better." };
    return { grade: "F", color: "text-red-600", message: "Don't give up! Review the material and try again." };
  };

  const gradeInfo = showResults ? getGrade(scorePercentage) : null;

  // Get correct zone label for an item
  const getCorrectZoneLabel = (itemId: string): string => {
    const item = data.items.find(i => i.id === itemId);
    if (!item) return "";
    const correctZone = data.zones.find(z => z.id === item.correctZone);
    return correctZone?.label || "";
  };

  const unplacedItems = data.items.filter(item => !placements[item.id]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Progress value={completionPercentage} className="w-48" data-testid="progress-bar" />
          <p className="text-sm text-muted-foreground mt-1">
            {Object.keys(placements).length} of {total} items placed
          </p>
        </div>
        <div className="flex gap-2">
          {!showResults && (
            <Button 
              onClick={checkAnswers} 
              disabled={Object.keys(placements).length !== total} 
              data-testid="button-check"
            >
              {data.settings.instantFeedback ? "View Results" : "Check Answers"}
            </Button>
          )}
          {showResults && data.settings.allowRetry && (
            <Button onClick={reset} variant="outline" data-testid="button-retry">
              <RotateCcw className="h-4 w-4 mr-2" />
              Try Again
            </Button>
          )}
        </div>
      </div>

      {showResults && (
        <Card className="border-2">
          <CardContent className="pt-6">
            <div className="space-y-4">
              {/* Score Header */}
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-4">
                  <div>
                    <p className="text-4xl font-bold">
                      {score}/{total}
                    </p>
                    <p className="text-sm text-muted-foreground">Correct Answers</p>
                  </div>
                  <div className="h-16 w-px bg-border" />
                  <div>
                    <p className={`text-4xl font-bold ${gradeInfo?.color}`}>
                      {scorePercentage}%
                    </p>
                    <p className="text-sm text-muted-foreground">Score</p>
                  </div>
                  {gradeInfo && (
                    <>
                      <div className="h-16 w-px bg-border" />
                      <div>
                        <p className={`text-4xl font-bold ${gradeInfo.color}`}>
                          {gradeInfo.grade}
                        </p>
                        <p className="text-sm text-muted-foreground">Grade</p>
                      </div>
                    </>
                  )}
                </div>
                {gradeInfo && (
                  <p className={`text-lg font-semibold ${gradeInfo.color} mt-2`}>
                    {gradeInfo.message}
                  </p>
                )}
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{scorePercentage}%</span>
                </div>
                <Progress value={scorePercentage} className="h-3" />
              </div>

              {/* Breakdown */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center p-3 bg-green-50 dark:bg-green-950 rounded-lg">
                  <p className="text-2xl font-bold text-green-600 dark:text-green-400">{score}</p>
                  <p className="text-sm text-muted-foreground">Correct</p>
                </div>
                <div className="text-center p-3 bg-red-50 dark:bg-red-950 rounded-lg">
                  <p className="text-2xl font-bold text-red-600 dark:text-red-400">{total - score}</p>
                  <p className="text-sm text-muted-foreground">Incorrect</p>
                </div>
              </div>

              {/* Detailed Feedback */}
              {Object.keys(feedback).length > 0 && (
                <div className="space-y-2 pt-4 border-t">
                  <h4 className="font-semibold text-sm">Item Feedback:</h4>
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {data.items.map(item => {
                      const isCorrect = feedback[item.id] === true;
                      const placedZone = placements[item.id];
                      const placedZoneLabel = data.zones.find(z => z.id === placedZone)?.label || "Unknown";
                      const correctZoneLabel = getCorrectZoneLabel(item.id);
                      
                      return (
                        <div
                          key={item.id}
                          className={`p-2 rounded text-sm flex items-start gap-2 ${
                            isCorrect
                              ? "bg-green-50 dark:bg-green-950 border border-green-200 dark:border-green-800"
                              : "bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800"
                          }`}
                        >
                          {isCorrect ? (
                            <CheckCircle2 className="h-4 w-4 text-green-600 dark:text-green-400 mt-0.5 flex-shrink-0" />
                          ) : (
                            <XCircle className="h-4 w-4 text-red-600 dark:text-red-400 mt-0.5 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="font-medium truncate">{item.content}</p>
                            {isCorrect ? (
                              <p className="text-xs text-muted-foreground">
                                ✓ Correctly placed in "{placedZoneLabel}"
                              </p>
                            ) : (
                              <p className="text-xs text-muted-foreground">
                                ✗ Placed in "{placedZoneLabel}" (should be "{correctZoneLabel}")
                              </p>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold mb-4">Items to Drag</h3>
            <div className="space-y-2">
              {unplacedItems.map(item => (
                <div
                  key={item.id}
                  draggable
                  onDragStart={() => handleDragStart(item.id)}
                  className="p-3 bg-card border-2 border-border rounded-lg cursor-move hover-elevate active-elevate-2 select-none"
                  data-testid={`drag-item-${item.id}`}
                >
                  {item.content}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4">
          <h3 className="font-semibold">Drop Zones</h3>
          {data.zones.map(zone => {
            const itemsInZone = data.items.filter(item => placements[item.id] === zone.id);
            return (
              <Card
                key={zone.id}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(zone.id)}
                className={`min-h-32 border-2 transition-all ${
                  showResults
                    ? (() => {
                        const itemsInZone = data.items.filter(item => placements[item.id] === zone.id);
                        if (itemsInZone.length === 0) return "border-dashed";
                        const allCorrect = itemsInZone.every(item => feedback[item.id] === true);
                        return allCorrect
                          ? "border-green-500 bg-green-50 dark:bg-green-950"
                          : "border-red-500 bg-red-50 dark:bg-red-950";
                      })()
                    : "border-dashed"
                }`}
                data-testid={`drop-zone-${zone.id}`}
              >
                <CardContent className="p-4">
                  {data.settings.showZoneLabels && (
                    <h4 className="font-medium mb-2">{zone.label}</h4>
                  )}
                  <div className="space-y-2">
                    {itemsInZone.map(item => {
                      const isCorrect = feedback[item.id] === true;
                      const hasFeedback = feedback[item.id] !== undefined;
                      return (
                        <div
                          key={item.id}
                          className={`p-3 rounded-lg flex items-center justify-between transition-all ${
                            hasFeedback
                              ? isCorrect
                                ? "bg-green-50 dark:bg-green-950 border-2 border-green-500"
                                : "bg-red-50 dark:bg-red-950 border-2 border-red-500"
                              : "bg-accent border-2 border-border"
                          }`}
                          data-testid={`placed-item-${item.id}`}
                        >
                          <span className={hasFeedback && !isCorrect ? "line-through opacity-60" : ""}>
                            {item.content}
                          </span>
                          {hasFeedback && (
                            feedback[item.id] ? (
                              <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 flex-shrink-0" data-testid={`correct-${item.id}`} />
                            ) : (
                              <XCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" data-testid={`incorrect-${item.id}`} />
                            )
                          )}
                        </div>
                      );
                    })}
                    {itemsInZone.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        Drop items here
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
}
