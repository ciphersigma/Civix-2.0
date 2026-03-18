import { AuthService } from './auth.service';
import { Pool } from 'pg';
import * as cache from '../utils/cache';

// Mock the cache module
jest.mock('../utils/cache');

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

describe('AuthService', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPool);
    jest.clearAllMocks();
    // Set test environment
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('registerUser', () => {
    it('should create a new user and send verification code', async () => {
      const phoneNumber = '+919876543210';
      
      // Mock no existing user
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // Check existing user
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }); // Insert new user

      const result = await authService.registerUser(phoneNumber);

      expect(result.userId).toBe('user-123');
      expect(result.message).toBe('Verification code sent successfully');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should update verification code for existing user', async () => {
      const phoneNumber = '+919876543210';
      
      // Mock existing user
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-123', phone_verified: false }] }) // Existing user
        .mockResolvedValueOnce({ rows: [] }); // Update verification code

      const result = await authService.registerUser(phoneNumber);

      expect(result.userId).toBe('user-123');
      expect(mockPool.query).toHaveBeenCalledTimes(2);
    });

    it('should reject invalid phone number', async () => {
      await expect(authService.registerUser('')).rejects.toThrow('Invalid phone number format');
      await expect(authService.registerUser('123')).rejects.toThrow('Invalid phone number format');
    });
  });

  describe('verifyPhone', () => {
    it('should verify phone with correct code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Mock user with valid code
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            phone_number: phoneNumber,
            verification_code: code,
            verification_expires_at: futureDate,
            phone_verified: false
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Update verified status

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.message).toBe('Phone verified successfully');
    });

    it('should reject invalid verification code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Mock user with different code
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          phone_number: phoneNumber,
          verification_code: '654321',
          verification_expires_at: futureDate,
          phone_verified: false
        }]
      });

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid verification code');
    });

    it('should reject expired verification code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const pastDate = new Date(Date.now() - 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);

      // Mock user with expired code
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          phone_number: phoneNumber,
          verification_code: code,
          verification_expires_at: pastDate,
          phone_verified: false
        }]
      });

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(false);
      expect(result.message).toContain('expired');
    });

    it('should enforce rate limiting after 5 failed attempts', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';

      (cache.cacheGet as jest.Mock).mockResolvedValue('5');

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(false);
      expect(result.message).toContain('Too many verification attempts');
    });

    it('should return token for already verified user', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);

      // Mock already verified user
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          phone_number: phoneNumber,
          verification_code: code,
          verification_expires_at: new Date(),
          phone_verified: true
        }]
      });

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(result.message).toBe('Phone already verified');
    });
  });

  describe('generateToken', () => {
    it('should generate valid JWT token', () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
    });
  });

  describe('validateToken', () => {
    it('should validate correct token', () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      const decoded = authService.validateToken(token);

      expect(decoded).toBeDefined();
      expect(decoded?.userId).toBe(userId);
    });

    it('should reject invalid token', () => {
      const decoded = authService.validateToken('invalid-token');

      expect(decoded).toBeNull();
    });
  });

  describe('refreshToken', () => {
    it('should refresh valid token for verified user', async () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      const mockUser = {
        id: userId,
        phone_number: '+919876543210',
        phone_verified: true,
        language: 'en',
        daily_report_count: 0,
        last_report_date: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.refreshToken(token);

      expect(result.success).toBe(true);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
      expect(result.message).toBe('Token refreshed successfully');
      
      // Verify the new token is valid
      const decoded = authService.validateToken(result.token!);
      expect(decoded?.userId).toBe(userId);
    });

    it('should reject invalid token', async () => {
      const result = await authService.refreshToken('invalid-token');

      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
      expect(result.message).toBe('Invalid or expired token');
    });

    it('should reject token for non-existent user', async () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.refreshToken(token);

      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
      expect(result.message).toBe('User not found');
    });

    it('should reject token for unverified user', async () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      const mockUser = {
        id: userId,
        phone_number: '+919876543210',
        phone_verified: false,
        language: 'en',
        daily_report_count: 0,
        last_report_date: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const result = await authService.refreshToken(token);

      expect(result.success).toBe(false);
      expect(result.token).toBeUndefined();
      expect(result.message).toBe('Phone number not verified');
    });
  });

  describe('getUserById', () => {
    it('should return user by ID', async () => {
      const userId = 'user-123';
      const mockUser = {
        id: userId,
        phone_number: '+919876543210',
        phone_verified: true,
        language: 'en',
        daily_report_count: 0,
        last_report_date: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const user = await authService.getUserById(userId);

      expect(user).toEqual(mockUser);
    });

    it('should return null for non-existent user', async () => {
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const user = await authService.getUserById('non-existent');

      expect(user).toBeNull();
    });
  });

  describe('Token Expiration', () => {
    it('should generate token with correct expiration time', () => {
      const userId = 'user-123';
      const token = authService.generateToken(userId);

      // Decode token without verification to check expiration
      const jwt = require('jsonwebtoken');
      const decoded = jwt.decode(token) as any;

      expect(decoded).toBeDefined();
      expect(decoded.userId).toBe(userId);
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
      
      // Check that expiration is in the future
      const now = Math.floor(Date.now() / 1000);
      expect(decoded.exp).toBeGreaterThan(now);
    });

    it('should reject expired token', async () => {
      // Create a token with very short expiration
      const userId = 'user-123';
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId },
        process.env.JWT_SECRET,
        { expiresIn: '0s' }
      );

      // Wait a moment to ensure token expires
      await new Promise(resolve => setTimeout(resolve, 100));

      const decoded = authService.validateToken(expiredToken);
      expect(decoded).toBeNull();
    });
  });

  describe('Rate Limiting', () => {
    it('should increment verification attempts on invalid code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Mock user with different code
      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          phone_number: phoneNumber,
          verification_code: '654321',
          verification_expires_at: futureDate,
          phone_verified: false
        }]
      });

      await authService.verifyPhone(phoneNumber, code);

      // Verify that cacheSet was called to increment attempts
      expect(cache.cacheSet).toHaveBeenCalledWith(
        `verify_attempts:${phoneNumber}`,
        '1',
        900
      );
    });

    it('should increment verification attempts on user not found', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Mock no user found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
      expect(cache.cacheSet).toHaveBeenCalledWith(
        `verify_attempts:${phoneNumber}`,
        '1',
        900
      );
    });

    it('should reset rate limit counter on successful verification', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue('3'); // Had 3 previous attempts
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Mock user with valid code
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            phone_number: phoneNumber,
            verification_code: code,
            verification_expires_at: futureDate,
            phone_verified: false
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Update verified status

      const result = await authService.verifyPhone(phoneNumber, code);

      expect(result.success).toBe(true);
      // Verify that rate limit was reset
      expect(cache.cacheSet).toHaveBeenCalledWith(
        `verify_attempts:${phoneNumber}`,
        '0',
        0
      );
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle database errors during registration', async () => {
      const phoneNumber = '+919876543210';

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(authService.registerUser(phoneNumber)).rejects.toThrow('Failed to register user');
    });

    it('should handle database errors during verification', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(authService.verifyPhone(phoneNumber, code)).rejects.toThrow('Failed to verify phone number');
    });

    it('should handle various phone number formats', async () => {
      const validPhoneNumbers = [
        '+919876543210',
        '919876543210',
        '+91-987-654-3210',
        '9876543210'
      ];

      for (const phoneNumber of validPhoneNumbers) {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

        const result = await authService.registerUser(phoneNumber);
        expect(result.userId).toBe('user-123');
      }
    });

    it('should handle verification code edge cases', async () => {
      const phoneNumber = '+919876543210';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (cache.cacheGet as jest.Mock).mockResolvedValue(null);
      (cache.cacheSet as jest.Mock).mockResolvedValue(true);

      // Test with leading zeros - should match exactly
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({
          rows: [{
            id: 'user-123',
            phone_number: phoneNumber,
            verification_code: '012345',
            verification_expires_at: futureDate,
            phone_verified: false
          }]
        })
        .mockResolvedValueOnce({ rows: [] }); // Update verified status

      const result = await authService.verifyPhone(phoneNumber, '012345');
      expect(result.success).toBe(true); // Should succeed because codes match exactly
      expect(result.token).toBeDefined();
    });

    it('should handle concurrent registration attempts', async () => {
      const phoneNumber = '+919876543210';

      // Simulate existing user found
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [{ id: 'user-123', phone_verified: false }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await authService.registerUser(phoneNumber);

      expect(result.userId).toBe('user-123');
      // Should update existing user, not create new one
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.any(Array)
      );
    });
  });

  describe('Security', () => {
    it('should not expose verification code in response', async () => {
      const phoneNumber = '+919876543210';

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

      const result = await authService.registerUser(phoneNumber);

      expect(result).not.toHaveProperty('verificationCode');
      expect(result).not.toHaveProperty('code');
    });

    it('should use different verification codes for each registration', async () => {
      const phoneNumber = '+919876543210';
      const codes: string[] = [];

      for (let i = 0; i < 10; i++) {
        (mockPool.query as jest.Mock)
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [{ id: `user-${i}` }] });

        await authService.registerUser(phoneNumber);

        // Extract the code from the INSERT query call
        const calls = (mockPool.query as jest.Mock).mock.calls;
        const insertCall = calls.find(
          call => call[0].includes('INSERT INTO users')
        );
        if (insertCall && insertCall[1]) {
          codes.push(insertCall[1][1]); // verification_code is second parameter
        }
        
        // Clear mocks for next iteration
        (mockPool.query as jest.Mock).mockClear();
      }

      // All codes should be different (very high probability with 10 codes)
      const uniqueCodes = new Set(codes);
      expect(uniqueCodes.size).toBeGreaterThanOrEqual(8); // At least 8 out of 10 should be unique
      expect(codes.length).toBe(10);
    });

    it('should generate 6-digit verification codes', async () => {
      const phoneNumber = '+919876543210';

      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] });

      await authService.registerUser(phoneNumber);

      // Extract the code from the query call
      const insertCall = (mockPool.query as jest.Mock).mock.calls.find(
        call => call[0].includes('INSERT INTO users')
      );

      expect(insertCall).toBeDefined();
      const code = insertCall[1][1]; // verification_code is second parameter
      expect(code).toMatch(/^\d{6}$/);
      expect(parseInt(code)).toBeGreaterThanOrEqual(100000);
      expect(parseInt(code)).toBeLessThanOrEqual(999999);
    });
  });
});
