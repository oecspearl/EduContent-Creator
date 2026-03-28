import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import type { QuizQuestion } from "@shared/schema";

type QuestionInsightProps = {
  question: QuizQuestion;
  studentAnswer: string | number | string[] | Record<string, string> | null;
  isCorrect: boolean;
};

export function QuestionInsight({ question, studentAnswer, isCorrect }: QuestionInsightProps) {
  const { user } = useAuth();
  const [visible, setVisible] = useState(false);

  if (user?.role !== "student") return null;

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/student/ai-question-insight", {
        question: question.question,
        type: question.type,
        studentAnswer,
        correctAnswer: question.correctAnswer,
        options: question.options ?? null,
        isCorrect,
        explanation: question.explanation ?? null,
      });
      return (await res.json()) as { insight: string };
    },
  });

  const handleClick = () => {
    setVisible(true);
    if (!mutation.data && !mutation.isPending) {
      mutation.mutate();
    }
  };

  if (!visible) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="mt-1.5 h-7 text-xs cursor-pointer gap-1 text-amber-600 dark:text-amber-400 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20 px-2"
        onClick={handleClick}
      >
        <Sparkles className="h-3 w-3" />
        Explain this
      </Button>
    );
  }

  return (
    <div className="mt-2 p-3 rounded-md bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/40">
      {mutation.isPending && (
        <div className="space-y-1.5">
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-5/6" />
          <Skeleton className="h-3 w-3/4" />
        </div>
      )}

      {mutation.isError && (
        <div className="text-xs text-destructive">
          Could not generate explanation.{" "}
          <button className="underline cursor-pointer" onClick={() => mutation.mutate()}>
            Retry
          </button>
        </div>
      )}

      {mutation.data && (
        <div className="text-sm text-foreground prose prose-sm dark:prose-invert max-w-none [&_p]:mb-1 [&_p]:leading-relaxed">
          <ReactMarkdown>{mutation.data.insight}</ReactMarkdown>
        </div>
      )}
    </div>
  );
}
