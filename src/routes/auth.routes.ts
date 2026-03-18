import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { Pool } from 'pg';

export function createAuthRouter(pool: Pool): Router {
  const router = Router();
  const authService = new AuthService(pool);

  /**
   * POST /api/v1/auth/register
   * Register a new user with phone number and send verification code
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { phoneNumber } = req.body;

      console.log('Register request:', { phoneNumber });

      // Validate input
      if (!phoneNumber) {
        return res.status(400).json({
          success: false,
          message: 'Phone number is required'
        });
      }

      // Register user and send verification code
      const result = await authService.registerUser(phoneNumber);

      console.log('Register result:', result);

      return res.status(200).json({
        success: true,
        userId: result.userId,
        message: result.message
      });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  });

  /**
   * POST /api/v1/auth/verify
   * Verify phone number with verification code
   */
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { phoneNumber, code } = req.body;

      console.log('Verify request:', { phoneNumber, code });

      // Validate input
      if (!phoneNumber || !code) {
        return res.status(400).json({
          success: false,
          message: 'Phone number and verification code are required'
        });
      }

      // Verify phone number
      const result = await authService.verifyPhone(phoneNumber, code);

      console.log('Verify result:', result);

      if (!result.success) {
        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      // Get userId from token
      const decoded = authService.validateToken(result.token!);

      return res.status(200).json({
        success: true,
        token: result.token,
        userId: decoded?.userId,
        message: result.message
      });
    } catch (error) {
      console.error('Verification error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Verification failed'
      });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   * Refresh JWT token for authenticated user
   */
  router.post('/refresh', async (req: Request, res: Response) => {
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

      // Refresh token
      const result = await authService.refreshToken(token);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        token: result.token,
        message: result.message
      });
    } catch (error) {
      console.error('Token refresh error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  });

  /**
   * POST /api/v1/auth/admin/login
   * Admin login with email and password
   */
  router.post('/admin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      console.log('Admin login request:', { email });

      // Validate input
      if (!email || !password) {
        return res.status(400).json({
          success: false,
          message: 'Email and password are required'
        });
      }

      // Authenticate admin
      const result = await authService.adminLogin(email, password);

      if (!result.success) {
        return res.status(401).json({
          success: false,
          message: result.message
        });
      }

      return res.status(200).json({
        success: true,
        token: result.token,
        adminId: result.adminId,
        message: result.message
      });
    } catch (error) {
      console.error('Admin login error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Admin login failed'
      });
    }
  });

  return router;
}
