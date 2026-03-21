import { Router, Request, Response } from 'express';
import { AuthService } from '../services/auth.service';
import { Pool } from 'pg';

export function createAuthRouter(pool: Pool): Router {
  const router = Router();
  const authService = new AuthService(pool);

  /**
   * POST /api/v1/auth/register
   * Register with email, send OTP
   */
  router.post('/register', async (req: Request, res: Response) => {
    try {
      const { email, fullName, phoneNumber } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const result = await authService.registerUser(email, fullName, phoneNumber);
      return res.status(200).json({ success: true, userId: result.userId, message: result.message });
    } catch (error) {
      console.error('Registration error:', error);
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Registration failed' });
    }
  });

  /**
   * POST /api/v1/auth/login
   * Login existing user — sends OTP only if account exists
   */
  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) return res.status(400).json({ success: false, message: 'Email is required' });

      const result = await authService.loginUser(email);
      return res.status(200).json({ success: true, userId: result.userId, message: result.message });
    } catch (error) {
      const msg = error instanceof Error ? error.message : 'Login failed';
      const status = msg.includes('No account found') ? 404 : 500;
      return res.status(status).json({ success: false, message: msg });
    }
  });

  /**
   * POST /api/v1/auth/verify
   * Verify email with OTP code
   */
  router.post('/verify', async (req: Request, res: Response) => {
    try {
      const { email, code } = req.body;
      if (!email || !code) return res.status(400).json({ success: false, message: 'Email and code are required' });

      const result = await authService.verifyEmail(email, code);
      if (!result.success) return res.status(400).json({ success: false, message: result.message });

      const decoded = authService.validateToken(result.token!);
      return res.status(200).json({ success: true, token: result.token, userId: decoded?.userId, message: result.message });
    } catch (error) {
      return res.status(500).json({ success: false, message: error instanceof Error ? error.message : 'Verification failed' });
    }
  });

  /**
   * POST /api/v1/auth/refresh
   */
  router.post('/refresh', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });

      const result = await authService.refreshToken(authHeader.substring(7));
      if (!result.success) return res.status(401).json({ success: false, message: result.message });

      return res.status(200).json({ success: true, token: result.token, message: result.message });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Token refresh failed' });
    }
  });

  /**
   * GET /api/v1/auth/me
   * Get current user profile (requires auth token)
   */
  router.get('/me', async (req: Request, res: Response) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer ')) return res.status(401).json({ success: false, message: 'No token provided' });

      const decoded = authService.validateToken(authHeader.substring(7));
      if (!decoded) return res.status(401).json({ success: false, message: 'Invalid token' });

      const user = await authService.getUserById(decoded.userId);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });

      return res.status(200).json(user);
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Failed to fetch profile' });
    }
  });

  /**
   * POST /api/v1/auth/admin/login
   */
  router.post('/admin/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required' });

      const result = await authService.adminLogin(email, password);
      if (!result.success) return res.status(401).json({ success: false, message: result.message });

      return res.status(200).json({ success: true, token: result.token, adminId: result.adminId, message: result.message });
    } catch (error) {
      return res.status(500).json({ success: false, message: 'Admin login failed' });
    }
  });

  return router;
}
