import { AuthService } from './auth.service';
import { Pool } from 'pg';
import * as fc from 'fast-check';
import * as cache from '../utils/cache';

// Mock the cache module
jest.mock('../utils/cache');

// Mock pool
const mockPool = {
  query: jest.fn(),
} as unknown as Pool;

/**
 * Feature: waterlogging-alert-platform, Property 31: Phone Number Registration Requirement
 * 
 * **Validates: Requirements 9.1**
 * 
 * Property: For any user registration attempt, the system should require a valid mobile phone number.
 * 
 * This property test verifies that:
 * 1. Registration fails when phone number is missing (null, undefined, empty string)
 * 2. Registration fails when phone number is invalid (< 10 characters)
 * 3. Registration succeeds when phone number is valid (>= 10 characters)
 */
describe('AuthService - Property-Based Tests', () => {
  let authService: AuthService;

  beforeEach(() => {
    authService = new AuthService(mockPool);
    jest.clearAllMocks();
    process.env.JWT_SECRET = 'test-secret';
    process.env.NODE_ENV = 'test';
  });

  describe('Property 31: Phone Number Registration Requirement', () => {
    /**
     * Property: Registration should fail for missing or empty phone numbers
     */
    it('should reject registration attempts without a phone number', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constantFrom('', null, undefined),
          async (phoneNumber) => {
            // Attempt to register with missing/empty phone number
            await expect(
              authService.registerUser(phoneNumber as any)
            ).rejects.toThrow('Invalid phone number format');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Registration should fail for invalid phone numbers (< 10 characters)
     */
    it('should reject registration attempts with invalid phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate strings with length 1-9 characters
          fc.string({ minLength: 1, maxLength: 9 }),
          async (phoneNumber) => {
            // Attempt to register with invalid phone number
            await expect(
              authService.registerUser(phoneNumber)
            ).rejects.toThrow('Invalid phone number format');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Registration should succeed for valid phone numbers (>= 10 characters)
     */
    it('should accept registration attempts with valid phone numbers', async () => {
      await fc.assert(
        fc.asyncProperty(
          // Generate valid phone numbers with 10-15 digits
          fc.string({ minLength: 10, maxLength: 15 }).filter(s => s.length >= 10),
          async (phoneNumber) => {
            // Mock database responses for successful registration
            (mockPool.query as jest.Mock)
              .mockResolvedValueOnce({ rows: [] }) // No existing user
              .mockResolvedValueOnce({ rows: [{ id: 'test-user-id' }] }); // Insert new user

            // Attempt to register with valid phone number
            const result = await authService.registerUser(phoneNumber);

            // Verify registration succeeded
            expect(result).toBeDefined();
            expect(result.userId).toBe('test-user-id');
            expect(result.message).toBe('Verification code sent successfully');
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Registration should require a phone number for all registration attempts
     * This comprehensive test combines all scenarios
     */
    it('should enforce phone number requirement for all registration attempts', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.oneof(
            // Invalid cases: empty, null, undefined, or short strings
            fc.constantFrom('', null, undefined),
            fc.string({ minLength: 1, maxLength: 9 }),
            // Valid cases: strings with 10+ characters
            fc.string({ minLength: 10, maxLength: 15 }).map(s => ({ valid: true, value: s }))
          ),
          async (input) => {
            // Check if this is a valid phone number case
            const isValid = typeof input === 'object' && input !== null && 'valid' in input;
            const phoneNumber = isValid ? (input as any).value : input;

            if (isValid) {
              // Mock successful registration for valid phone numbers
              (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'test-user-id' }] });

              const result = await authService.registerUser(phoneNumber);
              expect(result).toBeDefined();
              expect(result.userId).toBeDefined();
            } else {
              // Expect rejection for invalid phone numbers
              await expect(
                authService.registerUser(phoneNumber as any)
              ).rejects.toThrow('Invalid phone number format');
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    /**
     * Property: Registration with realistic phone number formats
     * Tests with phone numbers that match real-world formats
     */
    it('should handle realistic phone number formats correctly', async () => {
      // Generator for realistic phone numbers
      const phoneNumberGen = fc.oneof(
        // Indian phone numbers with country code
        fc.tuple(
          fc.constantFrom('+91'),
          fc.integer({ min: 6000000000, max: 9999999999 })
        ).map(([code, num]) => code + num.toString()),
        
        // Indian phone numbers without country code
        fc.integer({ min: 6000000000, max: 9999999999 }).map(n => n.toString()),
        
        // Invalid: too short
        fc.integer({ min: 100000, max: 999999999 }).map(n => n.toString()),
        
        // Invalid: empty or null
        fc.constantFrom('', null, undefined)
      );

      await fc.assert(
        fc.asyncProperty(
          phoneNumberGen,
          async (phoneNumber) => {
            // Determine if phone number is valid (>= 10 characters)
            const isValid = phoneNumber && phoneNumber.length >= 10;

            if (isValid) {
              // Mock successful registration
              (mockPool.query as jest.Mock)
                .mockResolvedValueOnce({ rows: [] })
                .mockResolvedValueOnce({ rows: [{ id: 'test-user-id' }] });

              const result = await authService.registerUser(phoneNumber);
              expect(result).toBeDefined();
              expect(result.userId).toBe('test-user-id');
            } else {
              // Expect rejection
              await expect(
                authService.registerUser(phoneNumber as any)
              ).rejects.toThrow('Invalid phone number format');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
