import { db } from "../../db";
import { rubrics, rubricScores, profiles } from "@shared/schema";
import { eq, and } from "drizzle-orm";
import { z } from "zod";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

const criterionSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  levels: z.array(z.object({
    label: z.string(),
    points: z.number().min(0),
    description: z.string().optional(),
  })).min(1),
});

const createRubricSchema = z.object({
  contentId: z.string().min(1),
  criteria: z.array(criterionSchema).min(1),
  maxScore: z.number().min(1),
});

const scoreStudentSchema = z.object({
  scores: z.record(z.object({
    level: z.string(),
    points: z.number(),
  })),
  totalScore: z.number().min(0),
  feedback: z.string().optional(),
});

export function registerRubricRoutes({ app, storage, requireTeacher, requireAuth }: RouteContext) {
  // Create rubric for content
  app.post("/api/rubrics", requireTeacher, asyncHandler(async (req: any, res) => {
    const parsed = createRubricSchema.parse(req.body);
    const [rubric] = await db.insert(rubrics).values({
      contentId: parsed.contentId,
      userId: req.session.userId!,
      criteria: parsed.criteria,
      maxScore: parsed.maxScore,
    }).returning();
    res.json(rubric);
  }));

  // Get rubric for content
  app.get("/api/rubrics/content/:contentId", requireAuth, asyncHandler(async (req: any, res) => {
    const [rubric] = await db.select().from(rubrics)
      .where(eq(rubrics.contentId, req.params.contentId)).limit(1);
    if (!rubric) return res.status(404).json({ message: "No rubric found for this content" });
    res.json(rubric);
  }));

  // Score a student with rubric
  app.post("/api/rubrics/:rubricId/score/:studentId", requireTeacher, asyncHandler(async (req: any, res) => {
    const parsed = scoreStudentSchema.parse(req.body);
    const [score] = await db.insert(rubricScores).values({
      rubricId: req.params.rubricId,
      studentId: req.params.studentId,
      scores: parsed.scores,
      totalScore: parsed.totalScore,
      feedback: parsed.feedback || null,
    })
      .onConflictDoUpdate({
        target: [rubricScores.rubricId, rubricScores.studentId],
        set: {
          scores: parsed.scores,
          totalScore: parsed.totalScore,
          feedback: parsed.feedback || null,
          scoredAt: new Date(),
        },
      })
      .returning();
    res.json(score);
  }));

  // Get all scores for a rubric
  app.get("/api/rubrics/:rubricId/scores", requireTeacher, asyncHandler(async (req: any, res) => {
    const scores = await db.select({
      id: rubricScores.id,
      studentId: rubricScores.studentId,
      studentName: profiles.fullName,
      studentEmail: profiles.email,
      scores: rubricScores.scores,
      totalScore: rubricScores.totalScore,
      feedback: rubricScores.feedback,
      scoredAt: rubricScores.scoredAt,
    })
      .from(rubricScores)
      .innerJoin(profiles, eq(rubricScores.studentId, profiles.id))
      .where(eq(rubricScores.rubricId, req.params.rubricId));
    res.json(scores);
  }));

  // Delete rubric
  app.delete("/api/rubrics/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const [rubric] = await db.select().from(rubrics)
      .where(eq(rubrics.id, req.params.id)).limit(1);
    if (!rubric || rubric.userId !== req.session.userId!) {
      return res.status(403).json({ message: "Not authorized" });
    }
    await db.delete(rubrics).where(eq(rubrics.id, req.params.id));
    res.json({ message: "Rubric deleted" });
  }));
}
