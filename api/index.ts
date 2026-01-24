import type { VercelRequest, VercelResponse } from '@vercel/node';
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "../server/routes";

const app = express();

// Trust proxy for Vercel
app.set('trust proxy', 1);

declare module 'http' {
  interface IncomingMessage {
    rawBody: unknown
  }
}

app.use(express.json({
  limit: '50mb',
  verify: (req, _res, buf) => {
    req.rawBody = buf;
  }
}));
app.use(express.urlencoded({ extended: false, limit: '50mb' }));

// Simple logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      console.log(`${req.method} ${path} ${res.statusCode} in ${duration}ms`);
    }
  });

  next();
});

// Initialize routes (but don't start server)
let initialized = false;
let initPromise: Promise<void> | null = null;

async function initializeApp() {
  if (initialized) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      // registerRoutes returns an HTTP server, but we just need the app configured
      await registerRoutes(app);
      console.log('Routes registered successfully');
    } catch (error) {
      console.error('Failed to register routes:', error);
      throw error;
    }

    // Error handling middleware
    app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
      const status = err.status || err.statusCode || 500;
      const message = err.message || "Internal Server Error";
      console.error('Error:', err);
      res.status(status).json({ message });
    });

    initialized = true;
  })();

  return initPromise;
}

// Export for Vercel serverless
export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();
    return app(req as any, res as any);
  } catch (error: any) {
    console.error('Handler error:', error);
    res.status(500).json({
      message: 'Server initialization failed',
      error: error.message
    });
  }
}
