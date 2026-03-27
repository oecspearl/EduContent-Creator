/**
 * Rate limiting middleware to prevent abuse of AI endpoints
 */

import type { Request, Response, NextFunction } from 'express';
import { RateLimitError } from '../errors/presentation-errors';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

// In-memory store for rate limiting (use Redis in production for distributed systems)
const rateLimitStore: RateLimitStore = {};

// Cleanup old entries every 10 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetTime < now) {
      delete rateLimitStore[key];
    }
  });
}, 10 * 60 * 1000);

export interface RateLimitOptions {
  /**
   * Maximum number of requests allowed in the time window
   */
  maxRequests: number;

  /**
   * Time window in seconds
   */
  windowSeconds: number;

  /**
   * Key generator function (default: uses IP address)
   */
  keyGenerator?: (req: Request) => string;

  /**
   * Skip rate limiting for certain requests
   */
  skip?: (req: Request) => boolean;

  /**
   * Custom error message
   */
  message?: string;
}

/**
 * Creates a rate limiting middleware
 */
export function rateLimit(options: RateLimitOptions) {
  const {
    maxRequests,
    windowSeconds,
    keyGenerator = (req) => req.ip || req.socket.remoteAddress || 'unknown',
    skip = () => false,
    message,
  } = options;

  return (req: Request, res: Response, next: NextFunction) => {
    // Skip if condition is met
    if (skip(req)) {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    const windowMs = windowSeconds * 1000;

    // Initialize or get existing rate limit data
    if (!rateLimitStore[key] || rateLimitStore[key].resetTime < now) {
      rateLimitStore[key] = {
        count: 0,
        resetTime: now + windowMs,
      };
    }

    const rateLimit = rateLimitStore[key];

    // Increment request count
    rateLimit.count++;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - rateLimit.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(rateLimit.resetTime / 1000));

    // Check if rate limit exceeded
    if (rateLimit.count > maxRequests) {
      const retryAfter = Math.ceil((rateLimit.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfter);

      const errorMessage = message || `Rate limit exceeded. Please try again in ${retryAfter} seconds.`;

      return res.status(429).json({
        message: errorMessage,
        retryAfter,
      });
    }

    next();
  };
}

/**
 * Rate limit for AI generation endpoints (more restrictive)
 */
export const aiGenerationRateLimit = rateLimit({
  maxRequests: 10, // 10 requests
  windowSeconds: 60, // per minute
  keyGenerator: (req) => {
    // Use user ID if authenticated, otherwise IP
    const userId = (req.session as any)?.userId;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: 'Too many AI generation requests. Please wait before generating more content.',
});

/**
 * Rate limit for presentation creation (moderate)
 */
export const presentationCreationRateLimit = rateLimit({
  maxRequests: 5, // 5 presentations
  windowSeconds: 300, // per 5 minutes
  keyGenerator: (req) => {
    const userId = (req.session as any)?.userId;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: 'Too many presentations created. Please wait before creating more.',
});

/**
 * Rate limit for image search (less restrictive)
 */
export const imageSearchRateLimit = rateLimit({
  maxRequests: 30, // 30 searches
  windowSeconds: 60, // per minute
  keyGenerator: (req) => {
    const userId = (req.session as any)?.userId;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: 'Too many image searches. Please wait before searching again.',
});

/**
 * General API rate limit
 */
export const generalApiRateLimit = rateLimit({
  maxRequests: 100, // 100 requests
  windowSeconds: 60, // per minute
  keyGenerator: (req) => {
    const userId = (req.session as any)?.userId;
    return userId || req.ip || req.socket.remoteAddress || 'unknown';
  },
  message: 'Too many requests. Please slow down.',
});
