import { Pool } from 'pg';
import jwt from 'jsonwebtoken';
import { cacheGet, cacheSet } from '../utils/cache';

interface User {
  id: string;
  phone_number: string;
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

  /**
   * Generate a 6-digit verification code
   */
  private generateVerificationCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  /**
   * Register a new user with phone number and send verification code
   */
  async registerUser(phoneNumber: string, fullName?: string, email?: string): Promise<RegistrationResult> {
    // Validate phone number format (basic validation)
    if (!phoneNumber || phoneNumber.length < 10) {
      throw new Error('Invalid phone number format');
    }

    // Generate verification code
    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    console.log(`Generated verification code for ${phoneNumber}: ${verificationCode}`);

    try {
      // Check if user already exists
      const existingUser = await this.pool.query(
        'SELECT id, phone_verified FROM users WHERE phone_number = $1',
        [phoneNumber]
      );

      let userId: string;

      if (existingUser.rows.length > 0) {
        // User exists, update verification code and profile fields
        userId = existingUser.rows[0].id;
        await this.pool.query(
          `UPDATE users 
           SET verification_code = $1, 
               verification_expires_at = $2,
               full_name = COALESCE($3, full_name),
               email = COALESCE($4, email),
               updated_at = NOW()
           WHERE id = $5`,
          [verificationCode, expiresAt, fullName || null, email || null, userId]
        );
        console.log(`Updated verification code for existing user ${userId}`);
      } else {
        // Create new user
        const result = await this.pool.query(
          `INSERT INTO users (phone_number, full_name, email, verification_code, verification_expires_at)
           VALUES ($1, $2, $3, $4, $5)
           RETURNING id`,
          [phoneNumber, fullName || null, email || null, verificationCode, expiresAt]
        );
        userId = result.rows[0].id;
        console.log(`Created new user ${userId}`);
      }

      // Send SMS verification code (don't fail registration if SMS fails)
      try {
        await this.sendVerificationSMS(phoneNumber, verificationCode);
      } catch (smsError) {
        console.error('SMS failed but registration succeeded:', smsError);
      }

      return {
        userId,
        message: 'Verification code sent successfully'
      };
    } catch (error) {
      console.error('Registration error:', error);
      throw new Error('Failed to register user');
    }
  }

  /**
   * Login existing user — send OTP only if user already exists
   */
  async loginUser(phoneNumber: string): Promise<RegistrationResult> {
    if (!phoneNumber || phoneNumber.length < 10) {
      throw new Error('Invalid phone number format');
    }

    const verificationCode = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    try {
      const existingUser = await this.pool.query(
        'SELECT id FROM users WHERE phone_number = $1',
        [phoneNumber]
      );

      if (existingUser.rows.length === 0) {
        throw new Error('No account found with this phone number. Please sign up first.');
      }

      const userId = existingUser.rows[0].id;
      await this.pool.query(
        `UPDATE users SET verification_code = $1, verification_expires_at = $2, updated_at = NOW() WHERE id = $3`,
        [verificationCode, expiresAt, userId]
      );

      try {
        await this.sendVerificationSMS(phoneNumber, verificationCode);
      } catch (smsError) {
        console.error('SMS failed but login OTP generated:', smsError);
      }

      return { userId, message: 'Verification code sent successfully' };
    } catch (error: any) {
      if (error.message?.includes('No account found')) throw error;
      console.error('Login error:', error);
      throw new Error('Failed to send verification code');
    }
  }

  /**
   * Verify phone number with verification code
   */
  async verifyPhone(phoneNumber: string, code: string): Promise<VerificationResult> {
    console.log(`Verifying phone ${phoneNumber} with code: ${code}`);
    
    // DEV MODE: Accept "123456" as universal bypass code
    if (code === '123456') {
      console.log('DEV MODE: Using bypass code 123456');
      try {
        let result = await this.pool.query(
          'SELECT id, phone_verified FROM users WHERE phone_number = $1',
          [phoneNumber]
        );
        
        let userId: string;
        if (result.rows.length > 0) {
          userId = result.rows[0].id;
          console.log(`Found existing user: ${userId}`);
        } else {
          // Create user if doesn't exist
          console.log('Creating new user for bypass');
          const createResult = await this.pool.query(
            'INSERT INTO users (phone_number, phone_verified) VALUES ($1, TRUE) RETURNING id',
            [phoneNumber]
          );
          userId = createResult.rows[0].id;
          console.log(`Created new user: ${userId}`);
        }
        
        // Mark as verified
        await this.pool.query(
          'UPDATE users SET phone_verified = TRUE, verification_code = NULL, verification_expires_at = NULL WHERE id = $1',
          [userId]
        );
        
        const token = this.generateToken(userId);
        console.log(`Generated token for user ${userId}`);
        return { success: true, token, message: 'Phone verified (dev mode)' };
      } catch (error) {
        console.error('Dev bypass error:', error);
        // Continue to normal flow if bypass fails
      }
    }
    
    // Check rate limiting for verification attempts
    const rateLimitKey = `verify_attempts:${phoneNumber}`;
    const attempts = await cacheGet(rateLimitKey);
    
    if (attempts && parseInt(attempts) >= 5) {
      return {
        success: false,
        message: 'Too many verification attempts. Please try again later.'
      };
    }

    try {
      // Get user and verify code
      const result = await this.pool.query(
        `SELECT id, phone_number, verification_code, verification_expires_at, phone_verified
         FROM users
         WHERE phone_number = $1`,
        [phoneNumber]
      );

      if (result.rows.length === 0) {
        console.log(`User not found for phone: ${phoneNumber}`);
        // Increment rate limit counter
        await this.incrementVerificationAttempts(phoneNumber);
        return {
          success: false,
          message: 'User not found'
        };
      }

      const user = result.rows[0];
      console.log(`User found: ${user.id}, stored code: ${user.verification_code}, expires: ${user.verification_expires_at}`);

      // Check if already verified
      if (user.phone_verified) {
        console.log(`Phone already verified for user ${user.id}`);
        // Generate token for already verified user
        const token = this.generateToken(user.id);
        return {
          success: true,
          token,
          message: 'Phone already verified'
        };
      }

      // Check if code matches
      if (user.verification_code !== code) {
        console.log(`Code mismatch: expected ${user.verification_code}, got ${code}`);
        // Increment rate limit counter
        await this.incrementVerificationAttempts(phoneNumber);
        return {
          success: false,
          message: 'Invalid verification code'
        };
      }

      // Check if code expired
      const now = new Date();
      const expiresAt = new Date(user.verification_expires_at);
      if (now > expiresAt) {
        return {
          success: false,
          message: 'Verification code expired. Please request a new code.'
        };
      }

      // Mark phone as verified
      await this.pool.query(
        `UPDATE users 
         SET phone_verified = TRUE,
             verification_code = NULL,
             verification_expires_at = NULL,
             updated_at = NOW()
         WHERE id = $1`,
        [user.id]
      );

      // Clear rate limit counter
      await cacheSet(rateLimitKey, '0', 0);

      // Generate JWT token
      const token = this.generateToken(user.id);

      return {
        success: true,
        token,
        message: 'Phone verified successfully'
      };
    } catch (error) {
      console.error('Verification error:', error);
      throw new Error('Failed to verify phone number');
    }
  }

  /**
   * Increment verification attempts counter for rate limiting
   */
  private async incrementVerificationAttempts(phoneNumber: string): Promise<void> {
    const rateLimitKey = `verify_attempts:${phoneNumber}`;
    const attempts = await cacheGet(rateLimitKey);
    const newAttempts = attempts ? parseInt(attempts) + 1 : 1;
    // Store for 15 minutes
    await cacheSet(rateLimitKey, newAttempts.toString(), 900);
  }

  /**
   * Generate JWT token for authenticated user
   */
  generateToken(userId: string): string {
    return jwt.sign(
      { userId },
      this.jwtSecret,
      { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
    );
  }

  /**
   * Validate JWT token
   */
  validateToken(token: string): { userId: string } | null {
    try {
      const decoded = jwt.verify(token, this.jwtSecret) as { userId: string };
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Refresh JWT token for authenticated user
   * Validates the existing token and issues a new one
   */
  async refreshToken(token: string): Promise<{ success: boolean; token?: string; message: string }> {
    try {
      // Validate the existing token
      const decoded = this.validateToken(token);
      
      if (!decoded) {
        return {
          success: false,
          message: 'Invalid or expired token'
        };
      }

      // Verify user still exists and is verified
      const user = await this.getUserById(decoded.userId);
      
      if (!user) {
        return {
          success: false,
          message: 'User not found'
        };
      }

      if (!user.phone_verified) {
        return {
          success: false,
          message: 'Phone number not verified'
        };
      }

      // Generate new token
      const newToken = this.generateToken(decoded.userId);

      return {
        success: true,
        token: newToken,
        message: 'Token refreshed successfully'
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return {
        success: false,
        message: 'Failed to refresh token'
      };
    }
  }

  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await this.pool.query(
        `SELECT id, phone_number, phone_verified, language, daily_report_count, last_report_date
         FROM users
         WHERE id = $1`,
        [userId]
      );

      if (result.rows.length === 0) {
        return null;
      }

      return result.rows[0];
    } catch (error) {
      console.error('Get user error:', error);
      return null;
    }
  }

  /**
   * Send SMS verification code
   * This is a placeholder that integrates with SMS gateway
   */
  private async sendVerificationSMS(phoneNumber: string, code: string): Promise<void> {
    const smsProvider = process.env.SMS_PROVIDER || 'console';

    try {
      if (smsProvider === 'twilio') {
        await this.sendTwilioSMS(phoneNumber, code);
      } else if (smsProvider === 'vonage') {
        await this.sendVonageSMS(phoneNumber, code);
      } else {
        // Console mode - log to console (use code 123456 to bypass)
        console.log(`[SMS] Verification code for ${phoneNumber}: ${code}`);
      }
    } catch (error) {
      console.error('SMS sending error:', error);
      // Don't fail registration if SMS fails — user can use bypass code
      console.log(`[SMS FALLBACK] Code for ${phoneNumber}: ${code}`);
    }
  }

  /**
   * Send SMS via Twilio
   */
  private async sendTwilioSMS(phoneNumber: string, code: string): Promise<void> {
    const accountSid = process.env.TWILIO_ACCOUNT_SID;
    const authToken = process.env.TWILIO_AUTH_TOKEN;
    const fromNumber = process.env.TWILIO_PHONE_NUMBER;

    if (!accountSid || !authToken || !fromNumber) {
      throw new Error('Twilio credentials not configured');
    }

    // Twilio API call would go here
    // For now, we'll use a simple HTTP request approach
    const axios = require('axios');
    const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

    await axios.post(
      `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
      new URLSearchParams({
        To: phoneNumber,
        From: fromNumber,
        Body: `Your Waterlogging Alert verification code is: ${code}`
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
  }

  /**
   * Send SMS via Vonage (Nexmo)
   */
  private async sendVonageSMS(phoneNumber: string, code: string): Promise<void> {
    const apiKey = process.env.VONAGE_API_KEY;
    const apiSecret = process.env.VONAGE_API_SECRET;
    const fromNumber = process.env.VONAGE_PHONE_NUMBER || 'WaterAlert';

    if (!apiKey || !apiSecret) {
      throw new Error('Vonage credentials not configured');
    }

    const axios = require('axios');

    await axios.post('https://rest.nexmo.com/sms/json', {
      api_key: apiKey,
      api_secret: apiSecret,
      to: phoneNumber,
      from: fromNumber,
      text: `Your Waterlogging Alert verification code is: ${code}`
    });
  }

  /**
   * Admin login with email and password
   */
  async adminLogin(email: string, password: string): Promise<{ success: boolean; token?: string; message: string; adminId?: string }> {
    try {
      // Get admin user by email
      const result = await this.pool.query(
        'SELECT id, email, password_hash, name FROM admin_users WHERE email = $1',
        [email]
      );

      if (result.rows.length === 0) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      const admin = result.rows[0];

      // Verify password
      const bcrypt = require('bcryptjs');
      const isValidPassword = await bcrypt.compare(password, admin.password_hash);

      if (!isValidPassword) {
        return {
          success: false,
          message: 'Invalid email or password'
        };
      }

      // Generate JWT token with admin flag
      const token = jwt.sign(
        { userId: admin.id, isAdmin: true },
        this.jwtSecret,
        { expiresIn: this.jwtExpiresIn } as jwt.SignOptions
      );

      // Update last login timestamp
      await this.pool.query(
        'UPDATE admin_users SET updated_at = NOW() WHERE id = $1',
        [admin.id]
      );

      return {
        success: true,
        token,
        adminId: admin.id,
        message: 'Login successful'
      };
    } catch (error) {
      console.error('Admin login error:', error);
      return {
        success: false,
        message: 'Login failed'
      };
    }
  }
}
