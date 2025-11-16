import type { Express } from "express";
import { createServer, type Server } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { Pool } from "pg";
import crypto from "crypto";
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
  generateInteractiveBookPages,
  getOpenAIClient
} from "./openai";
import { searchEducationalVideos } from "./youtube";
import passportConfig from "./passport-config";
import { getMsalClient, getRedirectUri } from "./msal-config";

// Type augmentation for session
declare module "express-session" {
  interface SessionData {
    userId: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  // Trust proxy for deployed apps (Replit uses reverse proxy)
  // This is critical for secure cookies to work properly
  if (process.env.NODE_ENV === "production") {
    app.set("trust proxy", 1);
  }

  // Configure session store (PostgreSQL or memory fallback)
  let sessionStore: session.Store | undefined;
  
  if (process.env.DATABASE_URL) {
    // Use PostgreSQL session store (recommended for production)
    const PgSession = connectPgSimple(session);
    const pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: {
        rejectUnauthorized: false,
      },
      max: 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000, // Increased timeout for Neon cold starts
    });
    
    // Handle pool errors
    pgPool.on('error', (err) => {
      console.error('Unexpected error on idle PostgreSQL client', err);
    });
    
    // Test database connection at startup
    try {
      await pgPool.query('SELECT NOW()');
      console.log('✓ PostgreSQL connection verified');
      
      sessionStore = new PgSession({
        pool: pgPool,
        createTableIfMissing: true,
        tableName: "session",
        pruneSessionInterval: 900, // Clean up old sessions every 15 minutes
        errorLog: (error) => {
          console.error('Session store error:', error);
        },
      });
      console.log('✓ Using PostgreSQL session store');
    } catch (error) {
      console.error('⚠ Failed to connect to PostgreSQL:', error);
      console.warn('⚠ Falling back to memory session store (not recommended for production)');
      sessionStore = undefined; // Will use default memory store
    }
  } else {
    console.warn('⚠ DATABASE_URL not set. Using memory session store.');
    console.warn('⚠ For production, set DATABASE_URL to use persistent session storage.');
    sessionStore = undefined; // Will use default memory store
  }
  
  // Check OAuth provider availability
  const isGoogleOAuthAvailable = !!(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );
  const isMicrosoftOAuthAvailable = !!(
    process.env.MICROSOFT_CLIENT_ID && 
    process.env.MICROSOFT_CLIENT_SECRET && 
    process.env.MICROSOFT_TENANT_ID
  );
  
  console.log('OAuth providers:', {
    google: isGoogleOAuthAvailable,
    microsoft: isMicrosoftOAuthAvailable,
  });

  // Session middleware
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax", // Use 'lax' since frontend and backend are same-origin
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
    },
  };
  
  // Add PostgreSQL store if available
  if (sessionStore) {
    sessionConfig.store = sessionStore;
  }
  
  app.use(session(sessionConfig));

  // Initialize Passport
  app.use(passportConfig.initialize());
  app.use(passportConfig.session());

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

  // Google OAuth routes
  app.get("/api/auth/google", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.status(503).json({ 
        message: "Google authentication is not configured. Please set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET." 
      });
    }
    passportConfig.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
  });

  app.get("/api/auth/google/callback", (req, res, next) => {
    if (!isGoogleOAuthAvailable) {
      return res.redirect("/login?error=google_not_configured");
    }
    passportConfig.authenticate("google", { failureRedirect: "/login" })(req, res, next);
  }, (req: any, res) => {
    // Set session userId
    req.session.userId = req.user.id;
    req.session.save(() => {
      res.redirect("/dashboard");
    });
  });

  // Microsoft OAuth routes
  app.get("/api/auth/microsoft", async (req, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.status(503).json({ 
        message: "Microsoft authentication is not configured. Please set MICROSOFT_CLIENT_ID, MICROSOFT_CLIENT_SECRET, and MICROSOFT_TENANT_ID." 
      });
    }
    
    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        return res.status(503).json({ message: "Microsoft authentication not configured" });
      }

      const authCodeUrlParameters = {
        scopes: ["user.read"],
        redirectUri: getRedirectUri(),
      };

      const authUrl = await msalClient.getAuthCodeUrl(authCodeUrlParameters);
      res.redirect(authUrl);
    } catch (error: any) {
      console.error("Microsoft auth initiation error:", error);
      res.status(500).json({ message: "Failed to initiate Microsoft authentication" });
    }
  });

  app.get("/api/auth/microsoft/callback", async (req: any, res) => {
    if (!isMicrosoftOAuthAvailable) {
      return res.redirect("/login?error=microsoft_not_configured");
    }
    
    try {
      const msalClient = getMsalClient();
      if (!msalClient) {
        return res.redirect("/login?error=microsoft_not_configured");
      }

      const tokenRequest = {
        code: req.query.code as string,
        scopes: ["user.read"],
        redirectUri: getRedirectUri(),
      };

      const response = await msalClient.acquireTokenByCode(tokenRequest);
      const email = response.account?.username;
      const name = response.account?.name || email;
      const microsoftId = response.account?.homeAccountId;

      if (!email || !microsoftId) {
        return res.redirect("/login?error=no_email");
      }

      // Find or create user
      let user = await storage.getProfileByEmail(email);
      if (!user) {
        // Create new Microsoft OAuth user with sentinel password
        const sentinelPassword = await bcrypt.hash(crypto.randomBytes(32).toString("hex"), 10);

        user = await storage.createProfile({
          email,
          password: sentinelPassword,
          fullName: name || email,
          role: "teacher",
          institution: null,
          authProvider: "microsoft",
          googleId: null,
          microsoftId,
        });
      } else if (!user.microsoftId) {
        // Link Microsoft account to existing user
        await storage.updateProfile(user.id, {
          microsoftId,
        });
      }

      // Set session
      req.session.userId = user.id;
      req.session.save(() => {
        res.redirect("/dashboard");
      });
    } catch (error: any) {
      console.error("Microsoft OAuth callback error:", error);
      res.redirect("/login?error=microsoft_auth_failed");
    }
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

  // Chat assistant endpoint with streaming
  app.post("/api/chat", requireAuth, async (req, res) => {
    try {
      const { message, context } = req.body;
      const userId = req.session.userId!;

      if (!message || typeof message !== "string") {
        return res.status(400).json({ message: "Message is required" });
      }

      // Get user info
      const user = await storage.getProfileById(userId);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Get recent chat history for context (last 10 messages)
      const history = await storage.getChatHistory(userId, 10);
      const recentMessages = history.reverse().slice(-10);

      // Build context-aware system message
      let systemMessage = `You are a helpful AI assistant for the OECS Content Creator platform, an educational content creation tool for teachers in the Organization of Eastern Caribbean States.

Your role is to help educators:
- Create engaging educational content (quizzes, flashcards, interactive videos, etc.)
- Get guidance on using the platform features
- Answer questions about educational best practices
- Provide support with content creation

User Information:
- Name: ${user.fullName}
- Role: ${user.role}
- Institution: ${user.institution || "Not specified"}

Platform Features:
- 8 content types: Quiz, Flashcard, Interactive Video, Image Hotspot, Drag & Drop, Fill in the Blanks, Memory Game, Interactive Book
- AI-powered content generation
- Progress tracking and analytics
- Public sharing and preview links
- Full accessibility support (WCAG 2.1 AA compliant)

Be conversational, friendly, and educational. Provide specific, actionable advice.`;

      // Add additional context if provided
      if (context) {
        systemMessage += `\n\nCurrent Context:\n${JSON.stringify(context, null, 2)}`;
      }

      // Build messages array for OpenAI
      const messages: any[] = [
        { role: "system", content: systemMessage },
        ...recentMessages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: "user", content: message },
      ];

      // Save user message
      await storage.createChatMessage({
        userId,
        role: "user",
        content: message,
        context: context || null,
      });

      // CRITICAL: Save session before starting SSE stream
      // This ensures auth cookies remain valid during streaming in production
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });

      // Set headers for streaming
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const openai = getOpenAIClient();
      const stream = await openai.chat.completions.create({
        model: "gpt-5",
        messages,
        stream: true,
        max_completion_tokens: 2048,
      });

      let fullResponse = "";

      // Stream the response
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      // Save assistant response
      await storage.createChatMessage({
        userId,
        role: "assistant",
        content: fullResponse,
        context: null,
      });

      res.write(`data: [DONE]\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Chat error:", error);
      if (!res.headersSent) {
        res.status(500).json({ message: error.message || "Failed to process chat" });
      } else {
        res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
        res.end();
      }
    }
  });

  // Get chat history
  app.get("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      const limit = parseInt(req.query.limit as string) || 50;
      const history = await storage.getChatHistory(userId, limit);
      res.json(history.reverse());
    } catch (error: any) {
      console.error("Get chat history error:", error);
      res.status(500).json({ message: "Failed to get chat history" });
    }
  });

  // Clear chat history
  app.delete("/api/chat/history", requireAuth, async (req, res) => {
    try {
      const userId = req.session.userId!;
      await storage.deleteChatHistory(userId);
      res.json({ message: "Chat history cleared" });
    } catch (error: any) {
      console.error("Delete chat history error:", error);
      res.status(500).json({ message: "Failed to clear chat history" });
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

  app.get("/api/analytics/content/:contentId/learners", requireAuth, async (req, res) => {
    try {
      // First verify user owns this content
      const content = await storage.getContentById(req.params.contentId);
      if (!content || content.userId !== req.session.userId!) {
        return res.status(403).json({ message: "Not authorized to view learner data for this content" });
      }

      const learners = await storage.getContentLearners(req.params.contentId);
      res.json(learners);
    } catch (error: any) {
      console.error("Get content learners error:", error);
      res.status(500).json({ message: "Failed to fetch learner data" });
    }
  });

  // YouTube video search route
  app.post("/api/youtube/search", requireAuth, async (req, res) => {
    try {
      const { subject, topic, learningOutcome, gradeLevel, ageRange, videoCount } = req.body;

      if (!subject || !topic || !learningOutcome || !gradeLevel || !videoCount) {
        return res.status(400).json({ message: "Missing required search criteria" });
      }

      if (videoCount < 1 || videoCount > 50) {
        return res.status(400).json({ message: "Video count must be between 1 and 50" });
      }

      const results = await searchEducationalVideos({
        subject,
        topic,
        learningOutcome,
        gradeLevel,
        ageRange: ageRange || '',
        maxResults: videoCount,
      });

      res.json({ results, searchDate: new Date().toISOString() });
    } catch (error: any) {
      console.error("YouTube search error:", error);
      res.status(500).json({ 
        message: error.message || "Failed to search YouTube videos. Please try again." 
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
