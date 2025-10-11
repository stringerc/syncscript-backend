/**
 * Rate Limiting Middleware
 * Security requirement from GERC Review
 * Prevents API abuse and cost explosion
 */

import rateLimit from 'express-rate-limit';

// AI endpoint rate limiter (10 calls/min per user)
export const aiRateLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10, // 10 requests per minute
  message: {
    error: 'Too many AI requests. Please try again in a minute.',
    retryAfter: '60 seconds'
  },
  standardHeaders: true,
  legacyHeaders: false,
  // Use user ID as key
  keyGenerator: (req) => {
    const user = req.user as any;
    return user?.sub || user?.id || req.ip || 'anonymous';
  },
  handler: (req, res) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      message: 'Too many AI requests. Please try again in a minute.',
      retryAfter: 60
    });
  }
});

// General API rate limiter (100 calls/min per user)
export const generalRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    error: 'Too many requests. Please slow down.',
    retryAfter: '60 seconds'
  },
  keyGenerator: (req) => {
    const user = req.user as any;
    return user?.sub || user?.id || req.ip || 'anonymous';
  }
});

// Strict rate limiter for auth endpoints (5 attempts/min)
export const authRateLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: {
    error: 'Too many login attempts. Please try again in a minute.',
    retryAfter: '60 seconds'
  },
  keyGenerator: (req) => req.ip || 'anonymous'
});

/**
 * Usage in routes:
 * 
 * app.use('/api/ai', aiRateLimiter);
 * app.use('/api/auth', authRateLimiter);
 * app.use('/api', generalRateLimiter);
 */

