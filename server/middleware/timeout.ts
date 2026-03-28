import type { Request, Response, NextFunction } from "express";

/**
 * Express middleware that sends a 504 if the handler hasn't responded
 * within `ms` milliseconds. The timer is automatically cleared when
 * the response finishes, so handlers don't need manual cleanup.
 */
export function withTimeoutMiddleware(ms = 25000) {
  return (_req: Request, res: Response, next: NextFunction) => {
    const timer = setTimeout(() => {
      if (!res.headersSent) {
        res.status(504).json({
          message:
            "Request timeout - The AI generation is taking longer than expected. Please try again with fewer items or simpler content.",
        });
      }
    }, ms);

    // Clear the timer as soon as the response finishes (success or error)
    res.on("finish", () => clearTimeout(timer));
    res.on("close", () => clearTimeout(timer));

    next();
  };
}
