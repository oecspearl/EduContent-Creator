import { useState, useEffect, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, HelpCircle } from "lucide-react";
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
  };

  const renderTextWithBlanks = () => {
    const parts = data.text.split(/\*blank\*/i);
    const result: React.ReactElement[] = [];

    parts.forEach((part, idx) => {
      result.push(<span key={`text-${idx}`}>{part}</span>);
      if (idx < data.blanks.length) {
        result.push(
          <span key={`blank-${idx}`} className="inline-flex flex-col gap-1 mx-1">
            <div className="inline-flex items-center gap-2">
              <Input
                value={answers[idx]}
                onChange={(e) => {
                  const newAnswers = [...answers];
                  newAnswers[idx] = e.target.value;
                  setAnswers(newAnswers);
                }}
                onFocus={() => setFocusedBlank(idx)}
                className={`w-32 inline-block ${
                  focusedBlank === idx && !(showResults && !data.settings.allowRetry)
                    ? "ring-2 ring-primary ring-offset-1"
                    : ""
                } ${
                  feedback[idx] !== undefined
                    ? feedback[idx]
                      ? "border-green-500"
                      : "border-destructive"
                    : ""
                }`}
                disabled={showResults && !data.settings.allowRetry}
                data-testid={`input-blank-${idx}`}
              />
              {feedback[idx] !== undefined && (
                feedback[idx] ? (
                  <CheckCircle2 className="h-4 w-4 text-green-500" data-testid={`correct-${idx}`} />
                ) : (
                  <XCircle className="h-4 w-4 text-destructive" data-testid={`incorrect-${idx}`} />
                )
              )}
              {data.settings.showHints && data.blanks[idx].showHint && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    const newHints = [...showHints];
                    newHints[idx] = !newHints[idx];
                    setShowHints(newHints);
                  }}
                  data-testid={`button-hint-${idx}`}
                >
                  <HelpCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
            {showHints[idx] && data.blanks[idx].showHint && (
              <span className="text-xs text-muted-foreground italic" data-testid={`hint-${idx}`}>
                Hint: {data.blanks[idx].showHint}
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
  const completionPercentage = answers.filter(a => a.trim() !== "").length > 0 
    ? (answers.filter(a => a.trim() !== "").length / total) * 100 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Progress value={completionPercentage} className="w-48" data-testid="progress-bar" />
          <p className="text-sm text-muted-foreground mt-1">
            {answers.filter(a => a.trim() !== "").length} of {total} blanks filled
          </p>
        </div>
        <div className="flex gap-2">
          {!showResults && (
            <Button 
              onClick={checkAnswers} 
              disabled={answers.some(a => a.trim() === "")}
              data-testid="button-check"
            >
              Check Answers
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
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-2xl font-bold">
                Score: {score}/{total}
              </p>
              <p className="text-muted-foreground">
                {score === total ? "Perfect! Well done!" : `You got ${score} out of ${total} correct.`}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {data.wordBank && data.wordBank.length > 0 && (
        <Card>
          <CardContent className="pt-4 pb-4">
            <p className="text-sm font-medium mb-2">Word Bank — click a word to fill the selected blank</p>
            <div className="flex flex-wrap gap-2">
              {data.wordBank.map((word, i) => (
                <Button
                  key={i}
                  variant={focusedBlank !== null ? "outline" : "ghost"}
                  size="sm"
                  onClick={() => {
                    if (focusedBlank !== null) {
                      const newAnswers = [...answers];
                      newAnswers[focusedBlank] = word;
                      setAnswers(newAnswers);
                    }
                  }}
                  disabled={showResults && !data.settings.allowRetry}
                  data-testid={`word-bank-${i}`}
                >
                  {word}
                </Button>
              ))}
            </div>
            {focusedBlank === null && (
              <p className="text-xs text-muted-foreground mt-2">
                Click on a blank in the text below to select it, then click a word above to fill it.
              </p>
            )}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardContent className="p-6">
          <div className="text-lg leading-relaxed">
            {renderTextWithBlanks()}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
