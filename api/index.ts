import type { VercelRequest, VercelResponse } from '@vercel/node';
import express from 'express';

let app: any = null;
let initError: Error | null = null;
let initPromise: Promise<void> | null = null;

async function initializeApp() {
  if (app) return;
  if (initError) throw initError;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    try {
      console.log('[Init] Starting Express app initialization...');

      app = express();
      app.set('trust proxy', 1);

      // Body parsing middleware
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: false, limit: '50mb' }));

      console.log('[Init] Importing routes...');

      // Import routes - registerRoutes sets up session, passport, and all routes
      const { registerRoutes } = await import('../server/routes.js');
      await registerRoutes(app);

      console.log('[Init] Routes registered');

      // Error handler
      app.use((err: any, _req: any, res: any, _next: any) => {
        console.error('[Error]', err);
        res.status(err.status || 500).json({ message: err.message || 'Internal Server Error' });
      });

      console.log('[Init] App initialization complete');
    } catch (error: any) {
      console.error('[Init] Failed:', error.message);
      console.error('[Init] Stack:', error.stack);
      initError = error;
      throw error;
    }
  })();

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();
    return app(req, res);
  } catch (error: any) {
    return res.status(500).json({
      message: 'Server initialization failed',
      error: error.message,
    });
  }
}
