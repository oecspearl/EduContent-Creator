import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Lightbulb, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { QuizQuestion } from "@shared/schema";

type AIInsightsProps = {
  questions: QuizQuestion[];
  answers: (string | number | string[] | Record<string, string> | null)[];
  score: number;
  totalQuestions: number;
  checkCorrectness: (question: QuizQuestion, answer: any) => boolean;
};

type InsightsResponse = {
  overallFeedback: string;
  strengths: string[];
  areasToImprove: string[];
  questionInsights: Array<{
    questionId: string;
    insight: string;
  }>;
  studyTips: string[];
};

export function AIInsights({ questions, answers, score, totalQuestions, checkCorrectness }: AIInsightsProps) {
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);

  // Only show for students
  if (user?.role !== "student") return null;

  const percentage = Math.round((score / totalQuestions) * 100);

  const insightsMutation = useMutation({
    mutationFn: async () => {
      const incorrectQuestions = questions
        .map((q, i) => ({
          question: q.question,
          type: q.type,
          studentAnswer: answers[i],
          correctAnswer: q.correctAnswer,
          options: q.options,
          isCorrect: checkCorrectness(q, answers[i]),
          explanation: q.explanation,
        }))
        .filter(q => !q.isCorrect);

      const res = await apiRequest("POST", "/api/student/ai-insights", {
        score,
        totalQuestions,
        percentage,
        incorrectQuestions,
        totalIncorrect: incorrectQuestions.length,
      });
      return (await res.json()) as InsightsResponse;
    },
  });

  const handleGetInsights = () => {
    setExpanded(true);
    if (!insightsMutation.data && !insightsMutation.isPending) {
      insightsMutation.mutate();
    }
  };

  if (!expanded) {
    return (
      <Button
        variant="outline"
        className="w-full cursor-pointer gap-2 mt-4"
        onClick={handleGetInsights}
      >
        <Sparkles className="h-4 w-4 text-amber-500" />
        Get AI Study Insights
      </Button>
    );
  }

  return (
    <Card className="mt-4 border-amber-200 dark:border-amber-800 bg-amber-50/50 dark:bg-amber-950/20">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-amber-500" />
            AI Study Insights
          </CardTitle>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 cursor-pointer"
            onClick={() => setExpanded(false)}
          >
            <ChevronUp className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {insightsMutation.isPending && (
          <div className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-4 w-4/6" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </div>
        )}

        {insightsMutation.isError && (
          <div className="text-sm text-destructive">
            <p>Could not generate insights right now. Try again later.</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-2 cursor-pointer"
              onClick={() => insightsMutation.mutate()}
            >
              Retry
            </Button>
          </div>
        )}

        {insightsMutation.data && (
          <>
            {/* Overall Feedback */}
            <div className="text-sm text-foreground">
              <ReactMarkdown>{insightsMutation.data.overallFeedback}</ReactMarkdown>
            </div>

            {/* Strengths */}
            {insightsMutation.data.strengths.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-green-700 dark:text-green-400 mb-1.5">What you did well</h4>
                <ul className="space-y-1">
                  {insightsMutation.data.strengths.map((s, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-green-500 mt-0.5">+</span>
                      {s}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Areas to improve */}
            {insightsMutation.data.areasToImprove.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-amber-700 dark:text-amber-400 mb-1.5">Areas to focus on</h4>
                <ul className="space-y-1">
                  {insightsMutation.data.areasToImprove.map((a, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-amber-500 mt-0.5">-</span>
                      {a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Per-question insights (only for wrong answers) */}
            {insightsMutation.data.questionInsights.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-1.5">Question Breakdown</h4>
                <div className="space-y-2">
                  {insightsMutation.data.questionInsights.map((qi, i) => (
                    <div key={i} className="text-sm p-2.5 rounded-md bg-background border border-border/60">
                      <ReactMarkdown>{qi.insight}</ReactMarkdown>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Study Tips */}
            {insightsMutation.data.studyTips.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-400 mb-1.5">Study Tips</h4>
                <ul className="space-y-1">
                  {insightsMutation.data.studyTips.map((t, i) => (
                    <li key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                      <span className="text-blue-500 mt-0.5">•</span>
                      {t}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
