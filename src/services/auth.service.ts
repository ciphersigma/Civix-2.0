import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { cacheGet, cacheSet } from '../utils/cache';
import { sendOTPEmail } from './email.service';

interface User {
  id: string;
  phone_number: string;
  email: string;
  phone_verified: boolean;
  language: string;
  daily_report_count: number;
  last_report_date: Date | null;
}

interface RegistrationResult {
  userId: string;
  message: string;
}

interface VerificationResult {
  success: boolean;
  token?: string;
  message: string;
}

export class AuthService {
  private pool: Pool;
  private jwtSecret: string;
  private jwtExpiresIn: string;

  constructor(pool: Pool) {
    this.pool = pool;
    this.jwtSecret = process.env.JWT_SECRET || 'dev-secret-key';
    this.jwtExpiresIn = process.env.JWT_EXPIRES_IN || '7d';
  }

  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Register a new user with email and send OTP
   */
  async registerUser(email: string, fullName?: string, phoneNumber?: string): Promise<RegistrationResult> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
      const existing = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
      let userId: string;

      if (existing.rows.length > 0) {
        userId = existing.rows[0].id;
        await this.pool.query(
          `UPDATE users SET verification_code = $1, verification_expires_at = $2,
           full_name = COALESCE($3, full_name), phone_number = COALESCE($4, phone_number), updated_at = NOW()
           WHERE id = $5`,
          [code, expiresAt, fullName || null, phoneNumber || null, userId]
        );
      } else {
        const result = await this.pool.query(
          `INSERT INTO users (email, full_name, phone_number, verification_code, verification_expires_at)
           VALUES ($1, $2, $3, $4, $5) RETURNING id`,
          [email, fullName || null, phoneNumber || null, code, expiresAt]
        );
        userId = result.rows[0].id;
      }

      try {
        await sendOTPEmail(email, code);
      } catch (emailErr) {
        console.error('Email send failed but registration succeeded:', emailErr);
      }

      return { userId, message: 'Verification code sent to your email' };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Failed to register user');
    }
  }

  /**
   * Login existing user — send OTP only if account exists
   */
  async loginUser(email: string): Promise<RegistrationResult> {
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      throw new Error('Invalid email format');
    }

    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
      const existing = await this.pool.query('SELECT id FROM users WHERE email = $1', [email]);
      if (existing.rows.length === 0) {
        throw new Error('No account found with this email. Please sign up first.');
      }

      const userId = existing.rows[0].id;
      await this.pool.query(
        `UPDATE users SET verification_code = $1, verification_expires_at = $2, updated_at = NOW() WHERE id = $3`,
        [code, expiresAt, userId]
      );

      try {
        await sendOTPEmail(email, code);
      } catch (emailErr) {
        console.error('Email send failed:', emailErr);
      }

      return { userId, message: 'Verification code sent to your email' };
    } catch (error: any) {
      if (error.message?.includes('No account found')) throw error;
      console.error('Login error:', error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Verify email with OTP code
   */
  async verifyEmail(email: string, code: string): Promise<VerificationResult> {
    const rateLimitKey = `verify_attempts:${email}`;
    const attempts = await cacheGet(rateLimitKey);

    if (attempts && parseInt(attempts) >= 5) {
      return { success: false, message: 'Too many attempts. Please try again later.' };
    }

    try {
      const result = await this.pool.query(
        `SELECT id, verification_code, verification_expires_at, phone_verified FROM users WHERE email = $1`,
        [email]
      );

      if (result.rows.length === 0) {
        await this.incrementAttempts(email);
        return { success: false, message: 'User not found' };
      }

      const user = result.rows[0];

      // Already verified — just issue token
      if (user.phone_verified && !user.verification_code) {
        const token = this.generateToken(user.id);
        return { success: true, token, message: 'Already verified' };
      }

      if (user.verification_code !== code) {
        await this.incrementAttempts(email);
        return { success: false, message: 'Invalid verification code' };
      }

      if (new Date() > new Date(user.verification_expires_at)) {
        return { success: false, message: 'Code expired. Please request a new one.' };
      }

      await this.pool.query(
        `UPDATE users SET phone_verified = TRUE, verification_code = NULL, verification_expires_at = NULL, updated_at = NOW() WHERE id = $1`,
        [user.id]
      );

      await cacheSet(rateLimitKey, '0', 0);
      const token = this.generateToken(user.id);
      return { success: true, token, message: 'Email verified successfully' };
    } catch (error) {
      console.error('Verification error:', error);
      throw new Error('Failed to verify email');
    }
  }

  private async incrementAttempts(identifier: string): Promise<void> {
    const key = `verify_attempts:${identifier}`;
    const attempts = await cacheGet(key);
    await cacheSet(key, ((attempts ? parseInt(attempts) : 0) + 1).toString(), 900);
  }

  generateToken(userId: string): string {
    return jwt.sign({ userId }, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
  }

  validateToken(token: string): { userId: string } | null {
    try {
      return jwt.verify(token, this.jwtSecret) as { userId: string };
    } catch { return null; }
  }

  async refreshToken(token: string): Promise<{ success: boolean; token?: string; message: string }> {
    try {
      const decoded = this.validateToken(token);
      if (!decoded) return { success: false, message: 'Invalid or expired token' };

      const user = await this.getUserById(decoded.userId);
      if (!user) return { success: false, message: 'User not found' };

      const newToken = this.generateToken(decoded.userId);
      return { success: true, token: newToken, message: 'Token refreshed' };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, message: 'Failed to refresh token' };
    }
  }

  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, full_name, phone_number, email, phone_verified, language, daily_report_count, last_report_date, created_at FROM users WHERE id = $1`,
        [userId]
      );
      return result.rows[0] || null;
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Admin login with email and password
   */
  async adminLogin(email: string, password: string): Promise<{ success: boolean; token?: string; message: string; adminId?: string }> {
    try {
      const result = await this.pool.query('SELECT id, email, password_hash, name FROM admin_users WHERE email = $1', [email]);
      if (result.rows.length === 0) return { success: false, message: 'Invalid email or password' };

      const adminUser = result.rows[0];
      const bcrypt = require('bcryptjs');
      const valid = await bcrypt.compare(password, adminUser.password_hash);
      if (!valid) return { success: false, message: 'Invalid email or password' };

      const token = jwt.sign({ userId: adminUser.id, isAdmin: true }, this.jwtSecret, { expiresIn: this.jwtExpiresIn } as jwt.SignOptions);
      await this.pool.query('UPDATE admin_users SET updated_at = NOW() WHERE id = $1', [adminUser.id]);

      return { success: true, token, adminId: adminUser.id, message: 'Login successful' };
    } catch (error) {
      console.error('Admin login error:', error);
      return { success: false, message: 'Login failed' };
    }
  }
}
