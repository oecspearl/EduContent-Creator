import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";

type ProgressData = {
  id: string;
  userId: string;
  contentId: string;
  completionPercentage: number;
  completedAt: string | null;
  lastAccessedAt: string;
  createdAt: string;
  updatedAt: string;
};

type QuizAttempt = {
  id: string;
  userId: string;
  contentId: string;
  score: number;
  totalQuestions: number;
  answers: Array<{
    questionId: string;
    answer: string | number | boolean;
    isCorrect: boolean;
  }>;
  completedAt: string;
};

type InteractionEvent = {
  id: string;
  userId: string;
  contentId: string;
  eventType: string;
  eventData: Record<string, any> | null;
  createdAt: string;
};

export function useProgressTracker(contentId: string, learnerName?: string | null) {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { user } = useAuth();

  // Only track progress for authenticated users
  const isAuthenticated = !!user;

  // Get current progress
  const { data: progress, isFetched } = useQuery<ProgressData | null>({
    queryKey: ["/api/progress", contentId],
    enabled: !!contentId && isAuthenticated,
  });

  // Update progress mutation
  const updateProgressMutation = useMutation({
    mutationFn: async ({ completionPercentage }: { completionPercentage: number }) => {
      return await apiRequest("POST", `/api/progress`, {
        contentId,
        completionPercentage,
        learnerName: learnerName || null,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/progress", contentId] });
      queryClient.invalidateQueries({ queryKey: ["/api/progress"] });
    },
    onError: (error: any) => {
      console.error("Failed to save progress:", error);
      toast({
        title: "Error",
        description: "Failed to save your progress. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Save quiz attempt mutation
  const saveQuizAttemptMutation = useMutation({
    mutationFn: async ({
      score,
      totalQuestions,
      answers,
    }: {
      score: number;
      totalQuestions: number;
      answers: Array<{ questionId: string; answer: string | number | boolean; isCorrect: boolean }>;
    }) => {
      return await apiRequest("POST", `/api/quiz-attempts`, {
        contentId,
        score,
        totalQuestions,
        answers,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/quiz-attempts", contentId] });
      // Also update progress to 100%
      updateProgressMutation.mutate({ completionPercentage: 100 });
    },
    onError: (error: any) => {
      console.error("Failed to save quiz attempt:", error);
      toast({
        title: "Error",
        description: "Failed to save your quiz results. Please try again.",
        variant: "destructive",
      });
    },
  });

  // Log interaction event mutation
  const logInteractionMutation = useMutation({
    mutationFn: async ({ eventType, eventData }: { eventType: string; eventData?: Record<string, any> }) => {
      return await apiRequest("POST", `/api/interaction-events`, {
        contentId,
        eventType,
        eventData: eventData || null,
      });
    },
    onError: (error: any) => {
      console.error("Failed to log interaction:", error);
    },
  });

  return {
    progress,
    isProgressFetched: isFetched,
    updateProgress: (completionPercentage: number) => {
      if (!isAuthenticated) return;
      updateProgressMutation.mutate({ completionPercentage });
    },
    saveQuizAttempt: (
      score: number,
      totalQuestions: number,
      answers: Array<{ questionId: string; answer: string | number | boolean; isCorrect: boolean }>
    ) => {
      if (!isAuthenticated) return;
      saveQuizAttemptMutation.mutate({ score, totalQuestions, answers });
    },
    logInteraction: (eventType: string, eventData?: Record<string, any>) => {
      if (!isAuthenticated) return;
      logInteractionMutation.mutate({ eventType, eventData });
    },
    isLoading:
      updateProgressMutation.isPending || saveQuizAttemptMutation.isPending || logInteractionMutation.isPending,
    isAuthenticated,
  };
}
