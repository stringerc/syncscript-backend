/**
 * CSRF Protection Middleware
 * Security requirement from GERC Review
 * Protects against cross-site request forgery
 */

import csrf from 'csurf';

// CSRF protection for state-changing operations
export const csrfProtection = csrf({
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict'
  }
});

// Middleware to attach CSRF token to responses
export const attachCSRFToken = (req: any, res: any, next: any) => {
  res.locals.csrfToken = req.csrfToken();
  next();
};

/**
 * Usage:
 * 
 * // In server.ts:
 * app.use(csrfProtection);
 * app.use(attachCSRFToken);
 * 
 * // In API responses:
 * res.json({ data: {...}, csrfToken: res.locals.csrfToken });
 * 
 * // In frontend forms:
 * <input type="hidden" name="_csrf" value={csrfToken} />
 */

