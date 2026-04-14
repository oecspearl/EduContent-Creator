import { useState, useEffect, useRef, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, XCircle, RotateCcw, HelpCircle, Sparkles, GripHorizontal } from "lucide-react";
import type { FillInBlanksData } from "@shared/schema";
import { useProgressTracker } from "@/hooks/use-progress-tracker";

type FillBlanksPlayerProps = {
  data: FillInBlanksData;
  contentId: string;
};

export function FillBlanksPlayer({ data, contentId }: FillBlanksPlayerProps) {
  const [answers, setAnswers] = useState<string[]>(new Array(data.blanks.length).fill(""));
  const [feedback, setFeedback] = useState<boolean[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [showHints, setShowHints] = useState<boolean[]>(new Array(data.blanks.length).fill(false));
  const [focusedBlank, setFocusedBlank] = useState<number | null>(null);
  const [draggedWord, setDraggedWord] = useState<string | null>(null);
  const [dragOverBlank, setDragOverBlank] = useState<number | null>(null);
  const blankRefs = useRef<(HTMLInputElement | null)[]>([]);

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

    const filledCount = answers.filter(a => a.trim() !== "").length;
    if (filledCount > 0 && data.blanks.length > 0) {
      const completionPercentage = Math.round((filledCount / data.blanks.length) * 100);
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
  }, [answers, lastSentProgress, isProgressInitialized, isAuthenticated]);

  const checkAnswers = () => {
    const newFeedback = answers.map((answer, idx) => {
      const blank = data.blanks[idx];
      const userAnswer = data.settings.caseSensitive ? answer.trim() : answer.trim().toLowerCase();
      return blank.correctAnswers.some(correctAnswer => {
        const correct = data.settings.caseSensitive ? correctAnswer.trim() : correctAnswer.trim().toLowerCase();
        return userAnswer === correct;
      });
    });
    setFeedback(newFeedback);
    setShowResults(true);

    const correct = newFeedback.filter(Boolean).length;
    logInteraction("check_answers", {
      score: correct,
      total: data.blanks.length,
    });
  };

  const reset = () => {
    setAnswers(new Array(data.blanks.length).fill(""));
    setFeedback([]);
    setShowResults(false);
    setShowHints(new Array(data.blanks.length).fill(false));
    setFocusedBlank(null);
  };

  const fillBlank = useCallback((blankIdx: number, word: string) => {
    const newAnswers = [...answers];
    newAnswers[blankIdx] = word;
    setAnswers(newAnswers);
    // Auto-advance to next empty blank
    const nextEmpty = newAnswers.findIndex((a, i) => i > blankIdx && a.trim() === "");
    if (nextEmpty !== -1) {
      setFocusedBlank(nextEmpty);
      blankRefs.current[nextEmpty]?.focus();
    }
  }, [answers]);

  // Drag handlers for word bank
  const handleDragStart = (word: string) => {
    setDraggedWord(word);
  };

  const handleDragEnd = () => {
    setDraggedWord(null);
    setDragOverBlank(null);
  };

  const handleBlankDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    setDragOverBlank(idx);
  };

  const handleBlankDragLeave = () => {
    setDragOverBlank(null);
  };

  const handleBlankDrop = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    if (draggedWord) {
      fillBlank(idx, draggedWord);
    }
    setDraggedWord(null);
    setDragOverBlank(null);
  };

  // Check if a word bank word is already used in an answer
  const isWordUsed = (word: string) => {
    return answers.some(a => a.trim().toLowerCase() === word.trim().toLowerCase());
  };

  const renderTextWithBlanks = () => {
    const parts = data.text.split(/\*blank\*|<em>blank<\/em>/i);
    const result: React.ReactElement[] = [];
    const isDisabled = showResults && !data.settings.allowRetry;

    parts.forEach((part, idx) => {
      // Render text part with better typography
      if (part) {
        result.push(
          <span key={`text-${idx}`} dangerouslySetInnerHTML={{ __html: part }} />
        );
      }

      if (idx < data.blanks.length) {
        const isFocused = focusedBlank === idx && !isDisabled;
        const isCorrect = feedback[idx] === true;
        const isIncorrect = feedback[idx] === false;
        const isDragTarget = dragOverBlank === idx;
        const hasValue = answers[idx].trim() !== "";

        result.push(
          <span
            key={`blank-${idx}`}
            className="inline-flex flex-col mx-0.5 align-bottom"
            onDragOver={(e) => handleBlankDragOver(e, idx)}
            onDragLeave={handleBlankDragLeave}
            onDrop={(e) => handleBlankDrop(e, idx)}
          >
            <span className="inline-flex items-center gap-1">
              {/* Blank number badge */}
              <span
                className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold shrink-0 transition-colors ${
                  isCorrect
                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                    : isIncorrect
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : hasValue
                        ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                }`}
              >
                {idx + 1}
              </span>

              {/* Input field */}
              <input
                ref={(el) => { blankRefs.current[idx] = el; }}
                type="text"
                value={answers[idx]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[idx] = e.target.value;
                  setAnswers(newAnswers);
                }}
                onFocus={() => setFocusedBlank(idx)}
                disabled={isDisabled}
                placeholder={`blank ${idx + 1}`}
                className={`inline-block w-36 h-8 px-2 text-sm font-medium text-center rounded-md
                  border-b-2 bg-transparent outline-none
                  transition-all duration-200
                  placeholder:text-muted-foreground/40 placeholder:font-normal
                  disabled:opacity-60 disabled:cursor-not-allowed
                  ${isDragTarget
                    ? "border-primary bg-primary/5 scale-105"
                    : isFocused
                      ? "border-primary bg-primary/5 shadow-sm"
                      : isCorrect
                        ? "border-green-500 bg-green-50 dark:bg-green-900/10"
                        : isIncorrect
                          ? "border-red-500 bg-red-50 dark:bg-red-900/10"
                          : hasValue
                            ? "border-primary/40 bg-muted/30"
                            : "border-muted-foreground/30 hover:border-muted-foreground/50"
                  }`}
                data-testid={`input-blank-${idx}`}
              />

              {/* Feedback icon */}
              {feedback[idx] !== undefined && (
                <span className={`shrink-0 transition-transform duration-300 ${showResults ? "scale-100" : "scale-0"}`}>
                  {isCorrect ? (
                    <CheckCircle2 className="h-4 w-4 text-green-500" data-testid={`correct-${idx}`} />
                  ) : (
                    <XCircle className="h-4 w-4 text-red-500" data-testid={`incorrect-${idx}`} />
                  )}
                </span>
              )}

              {/* Hint button */}
              {data.settings.showHints && data.blanks[idx].showHint && (
                <button
                  type="button"
                  onClick={() => {
                    const newHints = [...showHints];
                    newHints[idx] = !newHints[idx];
                    setShowHints(newHints);
                  }}
                  className="shrink-0 p-0.5 rounded-full text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  data-testid={`button-hint-${idx}`}
                >
                  <HelpCircle className="h-3.5 w-3.5" />
                </button>
              )}
            </span>

            {/* Hint text */}
            {showHints[idx] && data.blanks[idx].showHint && (
              <span className="text-[11px] text-amber-600 dark:text-amber-400 italic ml-6 mt-0.5" data-testid={`hint-${idx}`}>
                {data.blanks[idx].showHint}
              </span>
            )}

            {/* Show correct answer on incorrect */}
            {isIncorrect && showResults && (
              <span className="text-[11px] text-red-500 ml-6 mt-0.5">
                Correct: {data.blanks[idx].correctAnswers[0]}
              </span>
            )}
          </span>
        );
      }
    });

    return result;
  };

  const score = feedback.filter(Boolean).length;
  const total = data.blanks.length;
  const filledCount = answers.filter(a => a.trim() !== "").length;
  const completionPercentage = filledCount > 0 ? (filledCount / total) * 100 : 0;
  const scorePercentage = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <div className="space-y-4">
      {/* Results banner */}
      {showResults && (
        <Card className={`border-2 ${
          scorePercentage === 100
            ? "border-green-500 bg-green-50 dark:bg-green-900/10"
            : scorePercentage >= 70
              ? "border-amber-500 bg-amber-50 dark:bg-amber-900/10"
              : "border-red-500 bg-red-50 dark:bg-red-900/10"
        }`}>
          <CardContent className="py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {scorePercentage === 100 ? (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30">
                    <Sparkles className="h-6 w-6 text-green-600" />
                  </div>
                ) : (
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-muted">
                    <span className="text-lg font-bold">{scorePercentage}%</span>
                  </div>
                )}
                <div>
                  <p className="font-semibold text-lg">
                    {scorePercentage === 100
                      ? "Perfect Score!"
                      : scorePercentage >= 70
                        ? "Good Job!"
                        : "Keep Trying!"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    You got {score} out of {total} blanks correct
                  </p>
                </div>
              </div>
              {data.settings.allowRetry && (
                <Button onClick={reset} variant="outline" size="sm" data-testid="button-retry">
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Try Again
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main content area: passage + word bank side by side on desktop */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px] gap-4">
        {/* Passage card */}
        <Card className="order-2 lg:order-1">
          <CardContent className="p-6 sm:p-8">
            <div className="text-base sm:text-lg leading-[2.2] tracking-wide">
              {renderTextWithBlanks()}
            </div>
          </CardContent>
        </Card>

        {/* Sidebar: progress + word bank + actions */}
        <div className="order-1 lg:order-2 lg:sticky lg:top-4 lg:self-start space-y-4">
          {/* Progress card */}
          <Card>
            <CardContent className="py-4 px-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Progress</span>
                <span className="text-muted-foreground">{filledCount}/{total}</span>
              </div>
              <Progress value={completionPercentage} className="h-2" data-testid="progress-bar" />

              {/* Blank status indicators */}
              <div className="flex flex-wrap gap-1.5">
                {data.blanks.map((_, idx) => {
                  const isCorrect = feedback[idx] === true;
                  const isIncorrect = feedback[idx] === false;
                  const hasFill = answers[idx].trim() !== "";
                  const isActive = focusedBlank === idx;

                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setFocusedBlank(idx);
                        blankRefs.current[idx]?.focus();
                        blankRefs.current[idx]?.scrollIntoView({ behavior: "smooth", block: "center" });
                      }}
                      className={`w-7 h-7 rounded-md text-xs font-semibold transition-all
                        ${isCorrect
                          ? "bg-green-500 text-white"
                          : isIncorrect
                            ? "bg-red-500 text-white"
                            : isActive
                              ? "bg-primary text-primary-foreground ring-2 ring-primary ring-offset-1"
                              : hasFill
                                ? "bg-primary/20 text-primary"
                                : "bg-muted text-muted-foreground hover:bg-muted-foreground/20"
                        }`}
                      data-testid={`blank-indicator-${idx}`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Action buttons */}
              <div className="pt-1">
                {!showResults ? (
                  <Button
                    onClick={checkAnswers}
                    disabled={answers.some(a => a.trim() === "")}
                    className="w-full"
                    data-testid="button-check"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                    Check Answers
                  </Button>
                ) : data.settings.allowRetry ? (
                  <Button onClick={reset} variant="outline" className="w-full" data-testid="button-retry-sidebar">
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Try Again
                  </Button>
                ) : null}
              </div>
            </CardContent>
          </Card>

          {/* Word bank */}
          {data.wordBank && data.wordBank.length > 0 && (
            <Card>
              <CardContent className="py-4 px-4">
                <p className="text-sm font-medium mb-3 flex items-center gap-1.5">
                  <GripHorizontal className="h-4 w-4 text-muted-foreground" />
                  Word Bank
                </p>
                <div className="flex flex-wrap gap-2">
                  {data.wordBank.map((word, i) => {
                    const used = isWordUsed(word);
                    return (
                      <button
                        key={i}
                        type="button"
                        draggable={!used && !(showResults && !data.settings.allowRetry)}
                        onDragStart={() => handleDragStart(word)}
                        onDragEnd={handleDragEnd}
                        onClick={() => {
                          if (focusedBlank !== null && !used) {
                            fillBlank(focusedBlank, word);
                          }
                        }}
                        disabled={showResults && !data.settings.allowRetry}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium border transition-all
                          select-none
                          ${used
                            ? "bg-muted/50 text-muted-foreground/40 border-transparent line-through cursor-default"
                            : focusedBlank !== null
                              ? "bg-primary/5 border-primary/30 text-primary hover:bg-primary/10 hover:border-primary cursor-pointer active:scale-95"
                              : "bg-muted/50 border-border text-foreground hover:bg-muted cursor-grab active:cursor-grabbing"
                          }
                          disabled:opacity-50 disabled:cursor-not-allowed
                        `}
                        data-testid={`word-bank-${i}`}
                      >
                        {word}
                      </button>
                    );
                  })}
                </div>
                {focusedBlank === null && !showResults && (
                  <p className="text-xs text-muted-foreground mt-3">
                    Click a blank in the passage, then click a word. Or drag a word to a blank.
                  </p>
                )}
                {focusedBlank !== null && !showResults && (
                  <p className="text-xs text-primary mt-3 font-medium">
                    Blank {focusedBlank + 1} selected &mdash; click a word to fill it
                  </p>
                )}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
