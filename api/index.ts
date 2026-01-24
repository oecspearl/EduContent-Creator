import type { VercelRequest, VercelResponse } from '@vercel/node';

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

      // Import express
      const expressModule = await import('express');
      const express = expressModule.default;
      console.log('[Init] Express imported');

      app = express();

      // Trust proxy for Vercel
      app.set('trust proxy', 1);

      // Body parsing middleware
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: false, limit: '50mb' }));
      console.log('[Init] Middleware configured');

      // Import and register routes
      console.log('[Init] Importing routes...');
      const { registerRoutes } = await import('../server/routes');
      console.log('[Init] Routes module imported, registering...');

      await registerRoutes(app);
      console.log('[Init] Routes registered successfully');

      // Error handling middleware
      app.use((err: any, _req: any, res: any, _next: any) => {
        const status = err.status || err.statusCode || 500;
        const message = err.message || "Internal Server Error";
        console.error('[Error]', err);
        res.status(status).json({ message });
      });

      console.log('[Init] App initialization complete');
    } catch (error: any) {
      console.error('[Init] Failed to initialize app:', error);
      console.error('[Init] Error stack:', error.stack);
      initError = error;
      throw error;
    }
  })();

  return initPromise;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    await initializeApp();

    if (!app) {
      return res.status(500).json({
        message: 'App not initialized',
        error: initError?.message
      });
    }

    return app(req, res);
  } catch (error: any) {
    console.error('[Handler] Error:', error.message);
    console.error('[Handler] Stack:', error.stack);

    return res.status(500).json({
      message: 'Server initialization failed',
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
}
