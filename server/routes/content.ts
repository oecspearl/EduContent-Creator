import { ContentService } from "../services/content-service";
import type { RouteContext } from "./types";

export function registerContentRoutes({ app, storage, requireAuth, requireTeacher }: RouteContext) {
  const contentSvc = new ContentService(storage);

  // List user's content (teachers only — students use /api/student/* endpoints)
  app.get("/api/content", requireTeacher, async (req: any, res) => {
    try {
      const contents = await contentSvc.getUserContent(req.session.userId, req.query);
      res.json(contents);
    } catch (error: any) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Public content (teachers only — shared resources browser)
  app.get("/api/content/public", requireTeacher, async (req: any, res) => {
    try {
      const contents = await contentSvc.getPublicContent(req.query);
      res.set("Cache-Control", "no-cache, no-store, must-revalidate");
      res.set("Pragma", "no-cache");
      res.set("Expires", "0");
      res.json(contents);
    } catch (error: any) {
      console.error("Get public content error:", error);
      res.status(500).json({ message: "Failed to fetch public content" });
    }
  });

  // Get single content item (all authenticated users — students can view assigned content)
  app.get("/api/content/:id", requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getProfileById(req.session.userId);
      const result = await contentSvc.getById(req.params.id, req.session.userId, user?.role);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // Create content (teachers only)
  app.post("/api/content", requireTeacher, async (req: any, res) => {
    try {
      const result = await contentSvc.create(req.session.userId!, req.body);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Create content error:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  // Update content (teachers only)
  app.put("/api/content/:id", requireTeacher, async (req: any, res) => {
    try {
      const { title, description, data, isPublished, isPublic, tags, subject, gradeLevel, ageRange } = req.body;
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

      const result = await contentSvc.update(req.params.id, req.session.userId, updates);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Update content error:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  // Delete content (teachers only)
  app.delete("/api/content/:id", requireTeacher, async (req: any, res) => {
    try {
      const result = await contentSvc.delete(req.params.id, req.session.userId);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Delete content error:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  // Share content (teachers only)
  app.post("/api/content/:id/share", requireTeacher, async (req: any, res) => {
    try {
      const result = await contentSvc.share(req.params.id, req.session.userId);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Share content error:", error);
      res.status(500).json({ message: "Failed to share content" });
    }
  });

  // Duplicate own content (teachers only)
  app.post("/api/content/:id/duplicate", requireTeacher, async (req: any, res) => {
    try {
      const result = await contentSvc.duplicate(req.params.id, req.session.userId!);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Duplicate content error:", error);
      res.status(500).json({ message: "Failed to duplicate content" });
    }
  });

  // Copy public content (teachers only)
  app.post("/api/content/:id/copy", requireTeacher, async (req: any, res) => {
    try {
      const result = await contentSvc.copy(req.params.id, req.session.userId!);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Copy content error:", error);
      res.status(500).json({ message: "Failed to copy content" });
    }
  });

  // Public preview (no auth required)
  app.get("/api/preview/:id", async (req, res) => {
    try {
      const result = await contentSvc.getPublished(req.params.id);
      if (!result.ok) return res.status(result.status).json({ message: result.message });
      res.json(result.data);
    } catch (error: any) {
      console.error("Preview content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });
}
