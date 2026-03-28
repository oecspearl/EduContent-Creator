import type { H5pContent, LearnerProgress } from "@shared/schema";

export interface ContentAnalytics {
  content: H5pContent;
  stats: {
    uniqueViewers: number;
    avgCompletion: number;
    totalCompleted: number;
    totalAttempts: number;
    avgScore: number;
    avgPercentage: number;
    totalInteractions: number;
  };
  recentProgress: LearnerProgress[];
}

export interface ContentOverviewAnalytics {
  contentId: string;
  title: string;
  type: string;
  isPublished: boolean;
  createdAt: Date;
  uniqueViewers: number;
  avgCompletion: number;
  totalAttempts: number;
  avgScore: number;
  totalInteractions: number;
}

export interface ContentLearner {
  userId: string;
  displayName: string;
  email: string;
  role: string;
  completionPercentage: number;
  completedAt: Date | null;
  lastAccessedAt: Date;
  firstAccessedAt: Date;
  quizAttempts: {
    score: number;
    totalQuestions: number;
    percentage: string;
    completedAt: Date;
  }[];
  totalInteractions: number;
}

export interface QuestionAnalytics {
  questions: {
    questionIndex: number;
    questionText: string;
    questionType: string;
    totalResponses: number;
    correctCount: number;
    incorrectCount: number;
    correctPercentage: number;
    optionDistribution: Record<string, number>;
  }[];
  totalAttempts: number;
}

export interface PerformanceDistribution {
  distribution: {
    range: string;
    count: number;
    percentage: number;
  }[];
  totalStudents: number;
  averageScore: number;
}

export interface ScoreDistribution {
  scores: {
    score: number;
    totalQuestions: number;
    percentage: number;
    count: number;
  }[];
  totalAttempts: number;
}

export interface ClassEnrollmentInfo {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  enrolledAt: Date;
}

export interface ContentAssignmentInfo {
  assignmentId: string;
  contentId: string;
  contentTitle?: string;
  contentType?: string;
  classId: string;
  className: string;
  classDescription?: string;
  dueDate: Date | null;
  instructions: string | null;
  assignedAt: Date;
}
