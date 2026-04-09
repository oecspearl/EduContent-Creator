import { asyncHandler } from "../utils/async-handler";
import { db } from "../../db";
import { contentReviews, h5pContent, profiles, auditLog, notifications } from "@shared/schema";
import { eq, and, desc } from "drizzle-orm";
import type { RouteContext } from "./types";

/** Default checklist items for content review */
const DEFAULT_CHECKLIST = [
  { item: "Content is accurate and free of factual errors", checked: false, notes: "" },
  { item: "Content is age-appropriate for the target audience", checked: false, notes: "" },
  { item: "Instructions and questions are clear and unambiguous", checked: false, notes: "" },
  { item: "Content is well-organized and logically structured", checked: false, notes: "" },
  { item: "Media (images, videos) are appropriate and functional", checked: false, notes: "" },
  { item: "Content aligns with stated learning objectives", checked: false, notes: "" },
  { item: "No spelling, grammar, or formatting issues", checked: false, notes: "" },
  { item: "Content is accessible and inclusive", checked: false, notes: "" },
];

export function registerReviewRoutes({ app, requireAuth, requireTeacher }: RouteContext) {

  // ─── Get my pending reviews ─────────────────────────────
  app.get("/api/reviews/mine", requireTeacher, asyncHandler(async (req: any, res) => {
    const userId = req.session.userId;

    const reviews = await db
      .select({
        id: contentReviews.id,
        contentId: contentReviews.contentId,
        status: contentReviews.status,
        checklist: contentReviews.checklist,
        feedback: contentReviews.feedback,
        recommendation: contentReviews.recommendation,
        createdAt: contentReviews.createdAt,
        completedAt: contentReviews.completedAt,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        contentDescription: h5pContent.description,
        requestedByName: profiles.fullName,
        requestedByEmail: profiles.email,
      })
      .from(contentReviews)
      .innerJoin(h5pContent, eq(contentReviews.contentId, h5pContent.id))
      .innerJoin(profiles, eq(contentReviews.requestedBy, profiles.id))
      .where(eq(contentReviews.assignedTo, userId))
      .orderBy(desc(contentReviews.createdAt));

    res.json(reviews);
  }));

  // ─── Get a single review with default checklist ──────────
  app.get("/api/reviews/:id", requireAuth, asyncHandler(async (req: any, res) => {
    const reviewId = req.params.id;
    const userId = req.session.userId;

    const rows = await db
      .select({
        id: contentReviews.id,
        contentId: contentReviews.contentId,
        status: contentReviews.status,
        checklist: contentReviews.checklist,
        feedback: contentReviews.feedback,
        recommendation: contentReviews.recommendation,
        createdAt: contentReviews.createdAt,
        completedAt: contentReviews.completedAt,
        assignedTo: contentReviews.assignedTo,
        requestedBy: contentReviews.requestedBy,
        contentTitle: h5pContent.title,
        contentType: h5pContent.type,
        contentDescription: h5pContent.description,
      })
      .from(contentReviews)
      .innerJoin(h5pContent, eq(contentReviews.contentId, h5pContent.id))
      .where(eq(contentReviews.id, reviewId))
      .limit(1);

    if (rows.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }

    const review = rows[0];

    // Only the assigned reviewer or an admin can view
    const user = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);
    if (review.assignedTo !== userId && user[0]?.role !== "admin") {
      return res.status(403).json({ message: "Forbidden" });
    }

    // Provide default checklist if none exists yet
    const result = {
      ...review,
      checklist: review.checklist || DEFAULT_CHECKLIST,
    };

    res.json(result);
  }));

  // ─── Submit / save review (reviewer) ─────────────────────
  app.patch("/api/reviews/:id/submit", requireTeacher, asyncHandler(async (req: any, res) => {
    const reviewId = req.params.id;
    const userId = req.session.userId;
    const { checklist, feedback, recommendation, status } = req.body;

    const review = await db.select().from(contentReviews).where(eq(contentReviews.id, reviewId)).limit(1);
    if (review.length === 0) {
      return res.status(404).json({ message: "Review not found" });
    }
    if (review[0].assignedTo !== userId) {
      return res.status(403).json({ message: "You are not assigned to this review" });
    }
    if (review[0].status === "completed") {
      return res.status(400).json({ message: "Review already completed" });
    }

    const isSubmitting = status === "completed";
    if (isSubmitting && !recommendation) {
      return res.status(400).json({ message: "A recommendation (approve, reject, or needs_changes) is required to submit" });
    }

    const updates: any = {};
    if (checklist !== undefined) updates.checklist = checklist;
    if (feedback !== undefined) updates.feedback = feedback;
    if (recommendation !== undefined) updates.recommendation = recommendation;
    if (isSubmitting) {
      updates.status = "completed";
      updates.completedAt = new Date();
    } else {
      updates.status = "in_progress";
    }

    await db.update(contentReviews).set(updates).where(eq(contentReviews.id, reviewId));

    if (isSubmitting) {
      // Notify the admin who requested the review
      const content = await db.select().from(h5pContent).where(eq(h5pContent.id, review[0].contentId)).limit(1);
      const reviewer = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

      await db.insert(notifications).values({
        userId: review[0].requestedBy,
        type: "review_completed",
        title: "Review Completed",
        body: `${reviewer[0]?.fullName || "A reviewer"} has completed their review of "${content[0]?.title || "content"}". Recommendation: ${recommendation}.`,
        linkUrl: `/admin?tab=content`,
      });

      await db.insert(auditLog).values({
        userId,
        action: "review_submitted",
        entityType: "content_review",
        entityId: reviewId,
        metadata: {
          contentId: review[0].contentId,
          recommendation,
          contentTitle: content[0]?.title,
        },
      });
    }

    res.json({ message: isSubmitting ? "Review submitted" : "Review progress saved" });
  }));
}
