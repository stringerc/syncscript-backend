import { Request, Response, NextFunction } from 'express';
import { expressjwt } from 'express-jwt';
import jwksRsa from 'jwks-rsa';

// Auth0 configuration
const auth0Domain = process.env.AUTH0_DOMAIN || '';
const auth0Audience = process.env.AUTH0_AUDIENCE || '';

// JWT validation middleware
export const checkJwt = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${auth0Domain}/.well-known/jwks.json`
  }) as any,
  audience: auth0Audience,
  issuer: `https://${auth0Domain}/`,
  algorithms: ['RS256']
});

// Optional authentication (allows both authenticated and unauthenticated requests)
export const optionalAuth = expressjwt({
  secret: jwksRsa.expressJwtSecret({
    cache: true,
    rateLimit: true,
    jwksRequestsPerMinute: 5,
    jwksUri: `https://${auth0Domain}/.well-known/jwks.json`
  }) as any,
  audience: auth0Audience,
  issuer: `https://${auth0Domain}/`,
  algorithms: ['RS256'],
  credentialsRequired: false
});

// Extract user info from JWT
export const extractUser = (req: Request, res: Response, next: NextFunction) => {
  if (req.auth) {
    // User is authenticated, attach user info to request
    (req as any).userId = req.auth.sub;
    (req as any).userEmail = req.auth.email;
  }
  next();
};

// Require authentication
export const requireAuth = [checkJwt, extractUser];

// Optional authentication
export const optionalAuthMiddleware = [optionalAuth, extractUser];
