import { Request, Response, NextFunction } from 'express';
import { db } from '../utils/database';

/**
 * Middleware to sync Auth0 user with our database
 * Creates user if doesn't exist, and attaches internal userId to request
 */
export const syncUser = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth0Id = (req as any).userId; // This is actually the Auth0 ID (e.g., "google-oauth2|...")
    
    if (!auth0Id) {
      return next();
    }

    console.log('[syncUser] Auth0 ID:', auth0Id);

    // Check if user exists
    let user = await db.oneOrNone(
      'SELECT id, email, name FROM users WHERE auth0_id = $1',
      [auth0Id]
    );

    // If user doesn't exist, create them
    if (!user) {
      console.log('[syncUser] User not found, creating new user');
      
      // Get email from Auth0 token
      const email = (req.auth as any)?.email || `user-${auth0Id}@syncscript.app`;
      const name = (req.auth as any)?.name || 'SyncScript User';
      
      user = await db.one(
        `INSERT INTO users (auth0_id, email, name) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (auth0_id) DO UPDATE SET email = $2, name = $3
         RETURNING id, email, name`,
        [auth0Id, email, name]
      );
      
      console.log('[syncUser] Created new user:', user.id);
    } else {
      console.log('[syncUser] Found existing user:', user.id);
    }

    // Attach internal UUID to request
    (req as any).userId = user.id;
    (req as any).userEmail = user.email;
    (req as any).userName = user.name;
    
    next();
  } catch (error) {
    console.error('[syncUser] Error syncing user:', error);
    res.status(500).json({ error: 'Failed to sync user' });
  }
};
