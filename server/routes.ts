import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupWebSocket } from "./websocket";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import { pool as sharedPool } from "../db/index";
import { storage } from "./storage";
import passportConfig from "./passport-config";

// Route modules
import { registerAuthRoutes } from "./routes/auth";
import { registerContentRoutes } from "./routes/content";
import { registerAIRoutes } from "./routes/ai";
import { registerAnalyticsRoutes } from "./routes/analytics";
import { registerClassRoutes } from "./routes/classes";
import { registerPresentationRoutes } from "./routes/presentations";
import { registerClassroomRoutes } from "./routes/classroom";
import { registerStudentRoutes } from "./routes/student";
import { registerNotificationRoutes } from "./routes/notifications";
import { registerMessageRoutes } from "./routes/messages";
import { registerLearningPathRoutes } from "./routes/learning-paths";
import { registerStudentGroupRoutes } from "./routes/student-groups";
import { registerParentViewRoutes } from "./routes/parent-view";
import { registerRubricRoutes } from "./routes/rubrics";
import { registerCurriculumRoutes } from "./routes/curriculum";
import { registerAdminRoutes } from "./routes/admin";
import { registerReviewRoutes } from "./routes/reviews";
import type { AuthMiddleware } from "./routes/types";

// Type augmentation for session
declare module "express-session" {
  interface SessionData {
    userId: string;
    oauthReturnTo?: string;
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Trust proxy (required for secure cookies behind reverse proxies)
  app.set("trust proxy", 1);

  // Validate required environment variables
  if (!process.env.SESSION_SECRET) {
    throw new Error("SESSION_SECRET environment variable is required");
  }

  // Configure session store
  let sessionStore: session.Store | undefined;
  const isVercel = !!process.env.VERCEL;

  if (sharedPool) {
    const PgSession = connectPgSimple(session);
    try {
      await sharedPool.query("SELECT NOW()");
      sessionStore = new PgSession({
        pool: sharedPool,
        createTableIfMissing: true,
        tableName: "session",
        pruneSessionInterval: isVercel ? false : 900,
        errorLog: (error) => console.error("Session store error:", error),
      });
    } catch (error) {
      console.error("Failed to connect to PostgreSQL for sessions:", error);
      sessionStore = undefined;
    }
  }

  // Check OAuth provider availability
  const isGoogleOAuthAvailable = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const isMicrosoftOAuthAvailable = !!(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);

  // Session middleware
  const sessionConfig: session.SessionOptions = {
    secret: process.env.SESSION_SECRET!,
    resave: isVercel, // Vercel serverless: always re-save to keep session alive
    saveUninitialized: false,
    proxy: true,
    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 1000 * 60 * 60 * 24 * 7, // 7 days
      ...(process.env.COOKIE_DOMAIN ? { domain: process.env.COOKIE_DOMAIN } : {}),
    },
  };
  if (sessionStore) sessionConfig.store = sessionStore;

  app.use(session(sessionConfig));
  app.use(passportConfig.initialize());
  app.use(passportConfig.session());

  // Auth middleware — any logged-in user
  const requireAuth: AuthMiddleware = (req: any, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Role middleware — blocks students from teacher/admin features
  const requireTeacher: AuthMiddleware = async (req: any, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile || profile.role === "student") {
        return res.status(403).json({ message: "This feature is only available to teachers" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Health check endpoint (no auth required)
  app.get("/api/health", async (_req, res) => {
    try {
      if (sharedPool) {
        await sharedPool.query("SELECT 1");
        return res.json({ status: "ok", db: "connected" });
      }
      return res.status(503).json({
        status: "degraded",
        db: "disconnected",
        error: "Database pool not initialized",
      });
    } catch (err: any) {
      return res.status(503).json({
        status: "degraded",
        db: "disconnected",
        error: err.message || "Unknown database error",
      });
    }
  });

  // Role middleware — blocks non-admins from admin features
  const requireAdmin: AuthMiddleware = async (req: any, res, next) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    try {
      const profile = await storage.getProfileById(req.session.userId);
      if (!profile || profile.role !== "admin") {
        return res.status(403).json({ message: "This feature is only available to administrators" });
      }
      next();
    } catch {
      return res.status(500).json({ message: "Authorization check failed" });
    }
  };

  // Shared context for all route modules
  const ctx = { app, storage, requireAuth, requireTeacher, requireAdmin };

  // Register all route modules
  registerAuthRoutes(ctx, isGoogleOAuthAvailable, isMicrosoftOAuthAvailable);
  registerContentRoutes(ctx);
  registerAIRoutes(ctx);
  registerAnalyticsRoutes(ctx);
  registerClassRoutes(ctx);
  registerPresentationRoutes(ctx);
  registerClassroomRoutes(ctx);
  registerStudentRoutes(ctx);
  registerNotificationRoutes(ctx);
  registerMessageRoutes(ctx);
  registerLearningPathRoutes(ctx);
  registerStudentGroupRoutes(ctx);
  registerParentViewRoutes(ctx);
  registerRubricRoutes(ctx);
  registerCurriculumRoutes(ctx);
  registerAdminRoutes(ctx);
  registerReviewRoutes(ctx);

  const httpServer = createServer(app);
  setupWebSocket(httpServer);
  return httpServer;
}
