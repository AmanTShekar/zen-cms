import rateLimit from 'express-rate-limit';

/**
 * Zenith API Rate Limiter
 * ───────────────────────
 * Protects the CMS from brute-force and DoS attacks.
 * Uses a tiered approach: stricter for Auth, more relaxed for general API.
 */

// General API: 100 requests per minute
export const rateLimitMiddleware = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: { error: 'Too many requests, please try again later.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Alias for clarity
export const apiRateLimiter = rateLimitMiddleware;

// Auth Routes: 10 requests per 15 minutes (tighter)
export const authRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Too many login attempts. Please wait 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});
