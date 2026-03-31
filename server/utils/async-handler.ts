import type { Request, Response, NextFunction } from "express";

/**
 * Wraps an async Express route handler so that rejected promises
 * are forwarded to the global error handler via `next(err)`.
 *
 * Usage:
 *   app.get("/api/foo", asyncHandler(async (req, res) => { ... }));
 *
 * Eliminates the try/catch + console.error boilerplate that was
 * duplicated in every route handler.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<any>,
) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
