import { Request, Response, NextFunction } from 'express';
import { AuthService } from '../services/auth.service';
import { Pool } from 'pg';

// Extend Express Request type to include user
declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
      };
    }
  }
}

/**
 * Middleware to authenticate requests using JWT token
 */
export function createAuthMiddleware(pool: Pool) {
  const authService = new AuthService(pool);

  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get token from Authorization header
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
          success: false,
          message: 'No token provided'
        });
      }

      const token = authHeader.substring(7); // Remove 'Bearer ' prefix

      // Validate token
      const decoded = authService.validateToken(token);
      
      if (!decoded) {
        return res.status(401).json({
          success: false,
          message: 'Invalid or expired token'
        });
      }

      // Get user from database
      const user = await authService.getUserById(decoded.userId);
      
      if (!user) {
        return res.status(401).json({
          success: false,
          message: 'User not found'
        });
      }

      // Check if phone is verified
      if (!user.phone_verified) {
        return res.status(403).json({
          success: false,
          message: 'Phone number not verified'
        });
      }

      // Attach user to request
      req.user = { userId: decoded.userId };
      
      next();
    } catch (error) {
      console.error('Auth middleware error:', error);
      return res.status(500).json({
        success: false,
        message: 'Authentication failed'
      });
    }
  };
}
