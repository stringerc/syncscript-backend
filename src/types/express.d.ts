import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      auth?: {
        sub?: string;
        email?: string;
        [key: string]: any;
      };
      userId?: string;
      userEmail?: string;
    }
  }
}

export {};
