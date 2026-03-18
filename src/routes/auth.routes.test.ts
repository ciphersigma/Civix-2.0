import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createAuthRouter } from './auth.routes';

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

// Create test app
const app = express();
app.use(express.json());
app.use('/api/v1/auth', createAuthRouter(mockPool));

describe('Auth Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('POST /api/v1/auth/register', () => {
    it('should register a new user successfully', async () => {
      const phoneNumber = '+919876543210';

      // Mock database responses
      (mockPool.query as jest.Mock)
        .mockResolvedValueOnce({ rows: [] }) // No existing user
        .mockResolvedValueOnce({ rows: [{ id: 'user-123' }] }); // Insert new user

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ phoneNumber })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.userId).toBe('user-123');
      expect(response.body.message).toBe('Verification code sent successfully');
    });

    it('should return 400 if phone number is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({})
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number is required');
    });

    it('should return 500 on database error', async () => {
      const phoneNumber = '+919876543210';

      (mockPool.query as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/auth/register')
        .send({ phoneNumber })
        .expect(500);

      expect(response.body.success).toBe(false);
    });
  });

  describe('POST /api/v1/auth/verify', () => {
    it('should verify phone number with correct code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      // Mock database responses
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

      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, code })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(response.body.message).toBe('Phone verified successfully');
    });

    it('should return 400 if phone number is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ code: '123456' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number and verification code are required');
    });

    it('should return 400 if code is missing', async () => {
      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber: '+919876543210' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number and verification code are required');
    });

    it('should return 400 for invalid verification code', async () => {
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      (mockPool.query as jest.Mock).mockResolvedValueOnce({
        rows: [{
          id: 'user-123',
          phone_number: phoneNumber,
          verification_code: '654321',
          verification_expires_at: futureDate,
          phone_verified: false
        }]
      });

      const response = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, code })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid verification code');
    });
  });

  describe('POST /api/v1/auth/refresh', () => {
    it('should refresh valid token for verified user', async () => {
      // First, generate a valid token
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

      // Mock verification to get a token
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

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, code });

      const token = verifyResponse.body.token;

      // Now test token refresh
      const mockUser = {
        id: 'user-123',
        phone_number: phoneNumber,
        phone_verified: true,
        language: 'en',
        daily_report_count: 0,
        last_report_date: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.token).toBeDefined();
      expect(typeof response.body.token).toBe('string');
      expect(response.body.message).toBe('Token refreshed successfully');
    });

    it('should return 401 if no token provided', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('No token provided');
    });

    it('should return 401 for invalid token', async () => {
      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid or expired token');
    });

    it('should return 401 for token of non-existent user', async () => {
      // Generate a valid token
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

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

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, code });

      const token = verifyResponse.body.token;

      // Mock user not found
      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('User not found');
    });

    it('should return 401 for unverified user', async () => {
      // Generate a valid token
      const phoneNumber = '+919876543210';
      const code = '123456';
      const futureDate = new Date(Date.now() + 10 * 60 * 1000);

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

      const verifyResponse = await request(app)
        .post('/api/v1/auth/verify')
        .send({ phoneNumber, code });

      const token = verifyResponse.body.token;

      // Mock unverified user
      const mockUser = {
        id: 'user-123',
        phone_number: phoneNumber,
        phone_verified: false,
        language: 'en',
        daily_report_count: 0,
        last_report_date: null
      };

      (mockPool.query as jest.Mock).mockResolvedValueOnce({ rows: [mockUser] });

      const response = await request(app)
        .post('/api/v1/auth/refresh')
        .set('Authorization', `Bearer ${token}`)
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Phone number not verified');
    });
  });
});
