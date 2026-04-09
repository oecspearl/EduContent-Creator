import { ContentService } from "../services/content-service";
import { asyncHandler } from "../utils/async-handler";
import type { RouteContext } from "./types";

export function registerContentRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  const contentSvc = new ContentService(storage);

  // List user's content (teachers only — students use /api/student/* endpoints)
  app.get("/api/content", requireTeacher, asyncHandler(async (req: any, res) => {
    const contents = await contentSvc.getUserContent(req.session.userId, req.query);
    res.json(contents);
  }));

  // Public content (teachers only — shared resources browser)
  app.get("/api/content/public", requireTeacher, asyncHandler(async (req: any, res) => {
    const contents = await contentSvc.getPublicContent(req.query);
    res.set("Cache-Control", "no-cache, no-store, must-revalidate");
    res.set("Pragma", "no-cache");
    res.set("Expires", "0");
    res.json(contents);
  }));

  // Get single content item (all authenticated users — students can view assigned content)
  app.get("/api/content/:id", requireAuth, asyncHandler(async (req: any, res) => {
    const user = await storage.getProfileById(req.session.userId);
    const result = await contentSvc.getById(req.params.id, req.session.userId, user?.role);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Create content (teachers only)
  app.post("/api/content", requireTeacher, asyncHandler(async (req: any, res) => {
    const result = await contentSvc.create(req.session.userId!, req.body);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Update content (teachers only)
  app.put("/api/content/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const { title, description, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange, curriculumContext } = req.body;
    const updates: any = {};
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (data !== undefined) updates.data = data;
    if (isPublished !== undefined) updates.isPublished = isPublished;
    if (isPublic !== undefined) updates.isPublic = isPublic;
    if (tags !== undefined) updates.tags = tags;
    if (subject !== undefined) updates.subject = subject;
    if (gradeLevel !== undefined) updates.gradeLevel = gradeLevel;
    if (ageRange !== undefined) updates.ageRange = ageRange;
    updates.curriculumContext = curriculumContext ?? null;

    const result = await contentSvc.update(req.params.id, req.session.userId, updates);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Delete content (teachers only)
  app.delete("/api/content/:id", requireTeacher, asyncHandler(async (req: any, res) => {
    const result = await contentSvc.delete(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Share content (teachers only)
  app.post("/api/content/:id/share", requireTeacher, asyncHandler(async (req: any, res) => {
    const result = await contentSvc.share(req.params.id, req.session.userId);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Duplicate own content (teachers only)
  app.post("/api/content/:id/duplicate", requireTeacher, asyncHandler(async (req: any, res) => {
    const result = await contentSvc.duplicate(req.params.id, req.session.userId!);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Copy public content (teachers only)
  app.post("/api/content/:id/copy", requireTeacher, asyncHandler(async (req: any, res) => {
    const result = await contentSvc.copy(req.params.id, req.session.userId!);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));

  // Public preview (no auth required)
  app.get("/api/preview/:id", asyncHandler(async (req, res) => {
    const result = await contentSvc.getPublished(req.params.id);
    if (!result.ok) return res.status(result.status).json({ message: result.message });
    res.json(result.data);
  }));
}
