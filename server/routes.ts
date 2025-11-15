import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import { storage } from "./storage";
import { 
  aiGenerationSchema, 
  insertLearnerProgressSchema, 
  insertQuizAttemptSchema, 
  insertInteractionEventSchema 
} from "@shared/schema";
import bcrypt from "bcryptjs";
import { 
  generateQuizQuestions, 
  generateFlashcards, 
  generateVideoHotspots, 
  generateImageHotspots,
  generateDragDropItems,
  generateFillBlanksBlanks,
  generateMemoryGameCards,
  generateInteractiveBookPages 
} from "./openai";

// Type augmentation for session
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Session middleware
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "educreat-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      },
    })
  )

  // Auth middleware
  const requireAuth = (req: any, res: any, next: any) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Auth routes
  app.post("/api/auth/register", async (req, res) => {
    try {
      const { email, password, fullName, role, institution } = req.body;

      if (!email || !password || !fullName) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const existing = await storage.getProfileByEmail(email);
      if (existing) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const profile = await storage.createProfile({
        email,
        password,
        fullName,
        role: role || "teacher",
        institution: institution || null,
      });

      req.session.userId = profile.id;

      // Don't send password back
      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Missing email or password" });
      }

      const profile = await storage.getProfileByEmail(email);
      if (!profile) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, profile.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      req.session.userId = profile.id;

      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", requireAuth, async (req, res) => {
    try {
      const profile = await storage.getProfileById(req.session.userId!);
      if (!profile) {
        return res.status(404).json({ message: "Profile not found" });
      }

      const { password: _, ...profileWithoutPassword } = profile;
      res.json(profileWithoutPassword);
    } catch (error: any) {
      console.error("Get profile error:", error);
      res.status(500).json({ message: "Failed to get profile" });
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });

  // Content routes
  app.get("/api/content", requireAuth, async (req, res) => {
    try {
      const { search, type, tags, startDate, endDate } = req.query;
      let contents = await storage.getContentByUserId(req.session.userId!);
      
      // Apply search filter (title or description)
      if (search && typeof search === 'string') {
        const searchLower = search.toLowerCase();
        contents = contents.filter(c => 
          c.title.toLowerCase().includes(searchLower) || 
          (c.description && c.description.toLowerCase().includes(searchLower))
        );
      }
      
      // Apply content type filter
      if (type && typeof type === 'string') {
        contents = contents.filter(c => c.type === type);
      }
      
      // Apply tags filter (comma-separated)
      if (tags && typeof tags === 'string') {
        const tagList = tags.split(',').map(t => t.trim().toLowerCase());
        contents = contents.filter(c => 
          c.tags && c.tags.some(tag => tagList.includes(tag.toLowerCase()))
        );
      }
      
      // Apply date range filter
      if (startDate && typeof startDate === 'string') {
        const start = new Date(startDate);
        if (!isNaN(start.getTime())) {
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated >= start;
          });
        }
      }
      if (endDate && typeof endDate === 'string') {
        const end = new Date(endDate);
        if (!isNaN(end.getTime())) {
          end.setHours(23, 59, 59, 999); // Include the entire end date
          contents = contents.filter(c => {
            if (!c.updatedAt) return false;
            const updated = new Date(c.updatedAt);
            return !isNaN(updated.getTime()) && updated <= end;
          });
        }
      }
      
      res.json(contents);
    } catch (error: any) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.get("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      res.json(content);
    } catch (error: any) {
      console.error("Get content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  app.post("/api/content", requireAuth, async (req, res) => {
    try {
      const { title, description, type, data, isPublished, tags } = req.body;

      if (!title || !type || !data) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      const content = await storage.createContent({
        title,
        description: description || null,
        type,
        data,
        userId: req.session.userId!,
        isPublished: isPublished || false,
        tags: tags || null,
      });

      res.json(content);
    } catch (error: any) {
      console.error("Create content error:", error);
      res.status(500).json({ message: "Failed to create content" });
    }
  });

  app.put("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      const { title, description, data, isPublished, tags } = req.body;
      const updates: any = {};

      if (title !== undefined) updates.title = title;
      if (description !== undefined) updates.description = description;
      if (data !== undefined) updates.data = data;
      if (isPublished !== undefined) updates.isPublished = isPublished;
      if (tags !== undefined) updates.tags = tags;

      const updated = await storage.updateContent(req.params.id, updates);
      res.json(updated);
    } catch (error: any) {
      console.error("Update content error:", error);
      res.status(500).json({ message: "Failed to update content" });
    }
  });

  app.delete("/api/content/:id", requireAuth, async (req, res) => {
    try {
      const existing = await storage.getContentById(req.params.id);
      if (!existing) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (existing.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      await storage.deleteContent(req.params.id);
      res.json({ message: "Content deleted successfully" });
    } catch (error: any) {
      console.error("Delete content error:", error);
      res.status(500).json({ message: "Failed to delete content" });
    }
  });

  app.post("/api/content/:id/share", requireAuth, async (req, res) => {
    try {
      const content = await storage.getContentById(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found" });
      }

      if (content.userId !== req.session.userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Ensure content is published
      if (!content.isPublished) {
        await storage.updateContent(req.params.id, { isPublished: true });
      }

      const share = await storage.createShare({
        contentId: req.params.id,
        sharedBy: req.session.userId!,
      });

      res.json(share);
    } catch (error: any) {
      console.error("Share content error:", error);
      res.status(500).json({ message: "Failed to share content" });
    }
  });

  // Public preview route
  app.get("/api/preview/:id", async (req, res) => {
    try {
      const content = await storage.getPublishedContent(req.params.id);
      if (!content) {
        return res.status(404).json({ message: "Content not found or not published" });
      }

      res.json(content);
    } catch (error: any) {
      console.error("Preview content error:", error);
      res.status(500).json({ message: "Failed to fetch content" });
    }
  });

  // AI generation route
  app.post("/api/ai/generate", requireAuth, async (req, res) => {
    try {
      const parsed = aiGenerationSchema.parse(req.body);

      let result: any;

      switch (parsed.contentType) {
        case "quiz":
          result = { questions: await generateQuizQuestions(parsed) };
          break;
        case "flashcard":
          result = { cards: await generateFlashcards(parsed) };
          break;
        case "interactive-video":
          result = { hotspots: await generateVideoHotspots(parsed) };
          break;
        case "image-hotspot":
          result = { hotspots: await generateImageHotspots(parsed) };
          break;
        case "drag-drop":
          result = await generateDragDropItems(parsed);
          break;
        case "fill-blanks":
          result = await generateFillBlanksBlanks(parsed);
          break;
        case "memory-game":
          result = { cards: await generateMemoryGameCards(parsed) };
          break;
        case "interactive-book":
          result = { pages: await generateInteractiveBookPages(parsed) };
          break;
        default:
          return res.status(400).json({ message: "Invalid content type" });
      }

      res.json(result);
    } catch (error: any) {
      console.error("AI generation error:", error);
      res.status(500).json({ message: error.message || "Failed to generate content" });
    }
  });

  // Progress tracking routes
  app.post("/api/progress", requireAuth, async (req, res) => {
    try {
      const parsed = insertLearnerProgressSchema.parse({
        ...req.body,
        userId: req.session.userId!,
        completedAt: req.body.completedAt 
          ? new Date(req.body.completedAt) 
          : (req.body.completionPercentage >= 100 ? new Date() : null),
        lastAccessedAt: new Date(),
      });

      const progress = await storage.upsertLearnerProgress(parsed);
      res.json(progress);
    } catch (error: any) {
      console.error("Save progress error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save progress" });
    }
  });

  app.get("/api/progress/:contentId", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getLearnerProgress(req.session.userId!, req.params.contentId);
      res.json(progress || null);
    } catch (error: any) {
      console.error("Get progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  app.get("/api/progress", requireAuth, async (req, res) => {
    try {
      const progress = await storage.getAllUserProgress(req.session.userId!);
      res.json(progress);
    } catch (error: any) {
      console.error("Get all progress error:", error);
      res.status(500).json({ message: "Failed to fetch progress" });
    }
  });

  // Quiz attempt routes
  app.post("/api/quiz-attempts", requireAuth, async (req, res) => {
    try {
      const parsed = insertQuizAttemptSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const attempt = await storage.createQuizAttempt(parsed);
      res.json(attempt);
    } catch (error: any) {
      console.error("Save quiz attempt error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save quiz attempt" });
    }
  });

  app.get("/api/quiz-attempts/:contentId", requireAuth, async (req, res) => {
    try {
      const attempts = await storage.getQuizAttempts(req.session.userId!, req.params.contentId);
      res.json(attempts);
    } catch (error: any) {
      console.error("Get quiz attempts error:", error);
      res.status(500).json({ message: "Failed to fetch quiz attempts" });
    }
  });

  // Interaction event routes
  app.post("/api/interaction-events", requireAuth, async (req, res) => {
    try {
      const parsed = insertInteractionEventSchema.parse({
        ...req.body,
        userId: req.session.userId!,
      });

      const event = await storage.createInteractionEvent(parsed);
      res.json(event);
    } catch (error: any) {
      console.error("Save interaction event error:", error);
      if (error.name === 'ZodError') {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to save interaction event" });
    }
  });

  app.get("/api/interaction-events/:contentId", requireAuth, async (req, res) => {
    try {
      const events = await storage.getInteractionEvents(req.session.userId!, req.params.contentId);
      res.json(events);
    } catch (error: any) {
      console.error("Get interaction events error:", error);
      res.status(500).json({ message: "Failed to fetch interaction events" });
    }
  });

  // Analytics routes
  app.get("/api/analytics/overview", requireAuth, async (req, res) => {
    try {
      const analytics = await storage.getUserContentAnalytics(req.session.userId!);
      res.json(analytics);
    } catch (error: any) {
      console.error("Get analytics overview error:", error);
      res.status(500).json({ message: "Failed to fetch analytics" });
    }
  });

  app.get("/api/analytics/content/:contentId", requireAuth, async (req, res) => {
    try {
      // First verify user owns this content
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view analytics for this content" });
      }

      const analytics = await storage.getContentAnalytics(req.params.contentId);
      res.json(analytics);
    } catch (error: any) {
      console.error("Get content analytics error:", error);
      res.status(500).json({ message: "Failed to fetch content analytics" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
