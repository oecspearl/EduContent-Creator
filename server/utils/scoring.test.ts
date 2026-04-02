import { describe, it, expect } from "vitest";

/**
 * Tests for the gradebook scoring logic.
 *
 * These test the pure calculation that the gradebook endpoint performs:
 * selecting the best quiz attempt per content and computing percentages.
 *
 * The logic is extracted here from analytics.ts lines 260-263 so it
 * can be tested without spinning up a full Express server + database.
 */

type QuizAttempt = {
  id: string;
  userId: string;
  contentId: string;
  score: number;
  totalQuestions: number;
  completedAt: Date;
};

/** Picks the attempt with the highest percentage — matches gradebook logic. */
function pickBestAttempt(attempts: QuizAttempt[]): QuizAttempt {
  return attempts.reduce((b, a) =>
    (a.score / a.totalQuestions) > (b.score / b.totalQuestions) ? a : b
  );
}

/** Calculates percentage — matches gradebook logic. */
function calcPercentage(score: number, total: number): number {
  return Math.round((score / total) * 100);
}

function makeAttempt(score: number, total: number, id = "a1"): QuizAttempt {
  return { id, userId: "student-1", contentId: "content-1", score, totalQuestions: total, completedAt: new Date() };
}

describe("Gradebook scoring", () => {
  describe("pickBestAttempt", () => {
    it("picks the only attempt", () => {
      const best = pickBestAttempt([makeAttempt(3, 5)]);
      expect(best.score).toBe(3);
    });

    it("picks the higher percentage, not higher absolute score", () => {
      const best = pickBestAttempt([
        makeAttempt(8, 10, "a1"),  // 80%
        makeAttempt(5, 5, "a2"),   // 100%
      ]);
      expect(best.id).toBe("a2");
    });

    it("picks first when tied", () => {
      const best = pickBestAttempt([
        makeAttempt(2, 4, "a1"),   // 50%
        makeAttempt(3, 6, "a2"),   // 50%
      ]);
      // reduce keeps the accumulator when equal, so first wins
      expect(best.id).toBe("a1");
    });

    it("handles perfect scores", () => {
      const best = pickBestAttempt([
        makeAttempt(10, 10, "a1"),
        makeAttempt(9, 10, "a2"),
      ]);
      expect(best.id).toBe("a1");
      expect(calcPercentage(best.score, best.totalQuestions)).toBe(100);
    });

    it("handles zero scores", () => {
      const best = pickBestAttempt([
        makeAttempt(0, 5, "a1"),
        makeAttempt(0, 3, "a2"),
      ]);
      // Both are 0%, first wins
      expect(best.id).toBe("a1");
      expect(calcPercentage(best.score, best.totalQuestions)).toBe(0);
    });
  });

  describe("calcPercentage", () => {
    it("rounds correctly", () => {
      expect(calcPercentage(1, 3)).toBe(33);   // 33.33... → 33
      expect(calcPercentage(2, 3)).toBe(67);   // 66.66... → 67
      expect(calcPercentage(1, 7)).toBe(14);   // 14.28... → 14
    });

    it("handles edge cases", () => {
      expect(calcPercentage(0, 5)).toBe(0);
      expect(calcPercentage(5, 5)).toBe(100);
      expect(calcPercentage(1, 1)).toBe(100);
    });
  });

  describe("interactive video aggregated scoring", () => {
    it("aggregates multiple graded hotspots into one attempt", () => {
      // Simulates what VideoPlayer now does: 5 graded questions, student got 3 right
      const answers = [
        { questionId: "h1", answer: 0, isCorrect: true },
        { questionId: "h2", answer: 1, isCorrect: false },
        { questionId: "h3", answer: 2, isCorrect: true },
        { questionId: "h4", answer: 0, isCorrect: false },
        { questionId: "h5", answer: 1, isCorrect: true },
      ];
      const score = answers.filter(a => a.isCorrect).length;
      const total = answers.length;

      expect(score).toBe(3);
      expect(total).toBe(5);
      expect(calcPercentage(score, total)).toBe(60);
    });

    it("does NOT produce 100% when only some questions are correct", () => {
      // This was the original bug: each hotspot saved as 1/1, so any correct = 100%
      // Now all hotspots aggregate into one attempt
      const answers = [
        { questionId: "h1", answer: 0, isCorrect: true },   // Would have been 1/1 = 100%
        { questionId: "h2", answer: 1, isCorrect: false },  // Would have been 0/1 = 0%
      ];
      const score = answers.filter(a => a.isCorrect).length;
      const total = answers.length;

      expect(score).toBe(1);
      expect(total).toBe(2);
      expect(calcPercentage(score, total)).toBe(50);
      // NOT 100%, which is what the old per-hotspot approach would show
    });

    it("handles quiz hotspots with multiple sub-questions", () => {
      // A single quiz hotspot with 3 questions + 2 single-question hotspots
      const answers = [
        // Single question hotspot 1
        { questionId: "single-1", answer: 0, isCorrect: true },
        // Quiz hotspot with 3 questions
        { questionId: "quiz-q1", answer: 1, isCorrect: true },
        { questionId: "quiz-q2", answer: 0, isCorrect: false },
        { questionId: "quiz-q3", answer: 2, isCorrect: true },
        // Single question hotspot 2
        { questionId: "single-2", answer: 1, isCorrect: false },
      ];
      const score = answers.filter(a => a.isCorrect).length;
      const total = answers.length;

      expect(score).toBe(3);
      expect(total).toBe(5);
      expect(calcPercentage(score, total)).toBe(60);
    });

    it("deduplicates answers by questionId (rewatch scenario)", () => {
      // Simulates the Map-based deduplication in VideoPlayer
      const answersMap = new Map<string, { questionId: string; isCorrect: boolean }>();

      // First watch: got h1 wrong
      answersMap.set("h1", { questionId: "h1", isCorrect: false });
      answersMap.set("h2", { questionId: "h2", isCorrect: true });

      // Rewatch: got h1 right this time (overwrites)
      answersMap.set("h1", { questionId: "h1", isCorrect: true });

      const answers = Array.from(answersMap.values());
      const score = answers.filter(a => a.isCorrect).length;
      const total = answers.length;

      expect(total).toBe(2);  // NOT 3 (no duplicates)
      expect(score).toBe(2);
      expect(calcPercentage(score, total)).toBe(100);
    });
  });
});
