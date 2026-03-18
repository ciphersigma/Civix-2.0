import { ReportService } from './report.service';
import { Pool } from 'pg';
import * as fc from 'fast-check';

// Mock cache utilities so expireOldReports can clear Redis cache in tests
jest.mock('../utils/cache', () => ({
  __esModule: true,
  cacheGetJSON: jest.fn().mockResolvedValue(null),
  cacheSetJSON: jest.fn().mockResolvedValue(true),
  cacheDelMultiple: jest.fn().mockImplementation((keys: string[]) => Promise.resolve(keys.length)),
  cacheKeys: jest.fn().mockImplementation((pattern: string) => {
    // Return a mock key matching the pattern (replace * with 500)
    const baseKey = pattern.replace(':*', ':500');
    return Promise.resolve([baseKey]);
  }),
}));

/**
 * Property-Based Tests for Report Service
 * 
 * These tests verify universal properties that should hold across all valid inputs
 * using the fast-check framework with minimum 100 iterations per property.
 */

describe('ReportService - Property-Based Tests', () => {
  let reportService: ReportService;
  let mockPool: Pool;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery
    } as unknown as Pool;
    reportService = new ReportService(mockPool);
    jest.clearAllMocks();
  });

  /**
   * Feature: waterlogging-alert-platform, Property 6: Location Capture Accuracy
   * 
   * **Validates: Requirements 2.4**
   * 
   * Property: For any waterlogging report submission, the system should capture 
   * the user's GPS coordinates with accuracy within 50 meters.
   * 
   * This property test verifies that:
   * 1. Reports with accuracy <= 50 meters are accepted
   * 2. Reports with accuracy > 50 meters are rejected
   */
  describe('Property 6: Location Capture Accuracy', () => {
    // Generator for valid coordinates (Ahmedabad bounds)
    const validCoordinateGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true })
    });

    it('should reject reports with GPS accuracy > 50 meters', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCoordinateGen,
          fc.double({ min: 50.01, max: 500, noNaN: true }), // Accuracy > 50
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (coords, accuracy, severity, userId) => {
            const result = await reportService.createReport({
              userId,
              location: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy
              },
              severity
            });

            // Verify report is rejected
            expect(result.success).toBe(false);
            expect(result.message).toBe('Location accuracy must be within 50 meters');
            expect(result.report).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should accept reports with GPS accuracy <= 50 meters', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCoordinateGen,
          fc.double({ min: 0.1, max: 50, noNaN: true }), // Accuracy <= 50
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (coords, accuracy, severity, userId) => {
            // Mock daily limit check - user can submit
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 5, last_report_date: '2024-01-01' }]
            });

            // Mock successful report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-id',
                user_id: userId,
                latitude: coords.latitude.toString(),
                longitude: coords.longitude.toString(),
                location_accuracy: accuracy.toString(),
                severity,
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location: {
                latitude: coords.latitude,
                longitude: coords.longitude,
                accuracy
              },
              severity
            });

            // Verify report is accepted
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report?.location.accuracy).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce 50-meter accuracy threshold for all report submissions', async () => {
      await fc.assert(
        fc.asyncProperty(
          validCoordinateGen,
          fc.double({ min: 0.1, max: 500, noNaN: true }), // Any accuracy
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (coords, accuracy, severity, userId) => {
            const shouldAccept = accuracy <= 50;

            if (shouldAccept) {
              // Mock successful path
              mockQuery.mockResolvedValueOnce({
                rows: [{ daily_report_count: 0, last_report_date: null }]
              });
              mockQuery.mockResolvedValueOnce({
                rows: [{
                  id: 'report-id',
                  user_id: userId,
                  latitude: coords.latitude.toString(),
                  longitude: coords.longitude.toString(),
                  location_accuracy: accuracy.toString(),
                  severity,
                  report_type: 'waterlogged',
                  created_at: new Date(),
                  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                  is_active: true
                }]
              });
              mockQuery.mockResolvedValueOnce({ rows: [] });

              const result = await reportService.createReport({
                userId,
                location: { latitude: coords.latitude, longitude: coords.longitude, accuracy },
                severity
              });

              expect(result.success).toBe(true);
            } else {
              const result = await reportService.createReport({
                userId,
                location: { latitude: coords.latitude, longitude: coords.longitude, accuracy },
                severity
              });

              expect(result.success).toBe(false);
              expect(result.message).toBe('Location accuracy must be within 50 meters');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 7: Report Creation Timing
   * 
   * **Validates: Requirements 2.5**
   * 
   * Property: For any waterlogging report submission, the system should create 
   * a complete report (with timestamp, location, and severity) within 2 seconds.
   * 
   * This property test verifies that:
   * 1. Report creation completes within 2000ms
   * 2. Created report contains all required fields (timestamp, location, severity)
   */
  describe('Property 7: Report Creation Timing', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should create complete report within 2 seconds', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (location, severity, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 3, last_report_date: '2024-01-01' }]
            });

            // Mock report creation
            const createdAt = new Date();
            const expiresAt = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity,
                report_type: 'waterlogged',
                created_at: createdAt,
                expires_at: expiresAt,
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Measure execution time
            const startTime = Date.now();
            const result = await reportService.createReport({
              userId,
              location,
              severity
            });
            const endTime = Date.now();
            const executionTime = endTime - startTime;

            // Verify timing requirement (within 2 seconds = 2000ms)
            expect(executionTime).toBeLessThan(2000);

            // Verify report completeness
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report?.createdAt).toBeDefined();
            expect(result.report?.location).toBeDefined();
            expect(result.report?.location.latitude).toBe(location.latitude);
            expect(result.report?.location.longitude).toBe(location.longitude);
            expect(result.report?.severity).toBe(severity);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create reports with all required fields populated', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (location, severity, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 0, last_report_date: null }]
            });

            // Mock report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity,
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity
            });

            // Verify all required fields are present
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            
            // Timestamp
            expect(result.report?.createdAt).toBeInstanceOf(Date);
            expect(result.report?.expiresAt).toBeInstanceOf(Date);
            
            // Location
            expect(result.report?.location).toBeDefined();
            expect(typeof result.report?.location.latitude).toBe('number');
            expect(typeof result.report?.location.longitude).toBe('number');
            expect(typeof result.report?.location.accuracy).toBe('number');
            
            // Severity
            expect(result.report?.severity).toBe(severity);
            expect(['Low', 'Medium', 'High']).toContain(result.report?.severity);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 34: Daily Report Limit
   * 
   * **Validates: Requirements 9.4**
   * 
   * Property: For any user and any 24-hour period, the system should allow 
   * at most 10 waterlogging report submissions.
   * 
   * This property test verifies that:
   * 1. Users can submit up to 10 reports per day
   * 2. The 11th report in a day is rejected
   * 3. Report count resets on a new day
   */
  describe('Property 34: Daily Report Limit', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should allow up to 10 reports per user per day', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          fc.integer({ min: 0, max: 9 }), // Report count 0-9 (can submit 10th)
          async (location, severity, userId, currentCount) => {
            const today = new Date().toISOString().split('T')[0];

            // Mock daily limit check - user has submitted currentCount reports today
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: currentCount, last_report_date: today }]
            });

            // Mock report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity,
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity
            });

            // Verify report is accepted (count is 0-9, so can submit)
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reject 11th report in same day', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          async (location, severity, userId) => {
            const today = new Date().toISOString().split('T')[0];

            // Mock daily limit check - user has already submitted 10 reports today
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 10, last_report_date: today }]
            });

            const result = await reportService.createReport({
              userId,
              location,
              severity
            });

            // Verify report is rejected
            expect(result.success).toBe(false);
            expect(result.message).toBe('Daily report limit reached');
            expect(result.report).toBeUndefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should reset daily limit on new day', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          fc.integer({ min: 10, max: 50 }), // Previous day count (even if > 10)
          async (location, severity, userId, previousCount) => {
            const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];

            // Mock daily limit check - user submitted reports yesterday
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: previousCount, last_report_date: yesterday }]
            });

            // Mock report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity,
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity
            });

            // Verify report is accepted (new day, count resets)
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce 10-report limit for all users', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.uuid(),
          fc.integer({ min: 0, max: 15 }), // Any count from 0 to 15
          async (location, severity, userId, reportCount) => {
            const today = new Date().toISOString().split('T')[0];

            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: reportCount, last_report_date: today }]
            });

            const shouldAccept = reportCount < 10;

            if (shouldAccept) {
              // Mock successful report creation
              mockQuery.mockResolvedValueOnce({
                rows: [{
                  id: 'report-id',
                  user_id: userId,
                  latitude: location.latitude.toString(),
                  longitude: location.longitude.toString(),
                  location_accuracy: location.accuracy.toString(),
                  severity,
                  report_type: 'waterlogged',
                  created_at: new Date(),
                  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                  is_active: true
                }]
              });
              mockQuery.mockResolvedValueOnce({ rows: [] });

              const result = await reportService.createReport({
                userId,
                location,
                severity
              });

              expect(result.success).toBe(true);
            } else {
              const result = await reportService.createReport({
                userId,
                location,
                severity
              });

              expect(result.success).toBe(false);
              expect(result.message).toBe('Daily report limit reached');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 8: Clear Report Processing
   * 
   * **Validates: Requirements 2.6**
   * 
   * Property: For any user who selects "No" for waterlogging, the system should 
   * create a clear report for that area and update the map interface to reflect 
   * the cleared status.
   * 
   * This property test verifies that:
   * 1. Clear reports are successfully created with report_type='clear'
   * 2. Clear reports are stored with proper location and timestamp data
   * 3. The system accepts clear reports with valid location accuracy
   */
  describe('Property 8: Clear Report Processing', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should create clear report when user reports no waterlogging', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 2, last_report_date: '2024-01-01' }]
            });

            // Mock clear report creation
            const createdAt = new Date();
            const expiresAt = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low', // Clear reports still need a severity value
                report_type: 'clear',
                created_at: createdAt,
                expires_at: expiresAt,
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports in area
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity: 'Low', // Severity is required but not meaningful for clear reports
              reportType: 'clear'
            });

            // Verify clear report is created successfully
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report?.reportType).toBe('clear');
            expect(result.report?.location.latitude).toBe(location.latitude);
            expect(result.report?.location.longitude).toBe(location.longitude);
            expect(result.report?.createdAt).toBeDefined();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should create clear report with proper timestamp and location data', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 0, last_report_date: null }]
            });

            // Mock clear report creation
            const createdAt = new Date();
            const expiresAt = new Date(createdAt.getTime() + 4 * 60 * 60 * 1000);
            
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low',
                report_type: 'clear',
                created_at: createdAt,
                expires_at: expiresAt,
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity: 'Low',
              reportType: 'clear'
            });

            // Verify clear report has all required data
            expect(result.success).toBe(true);
            expect(result.report).toBeDefined();
            expect(result.report?.reportType).toBe('clear');
            
            // Verify timestamp data
            expect(result.report?.createdAt).toBeInstanceOf(Date);
            expect(result.report?.expiresAt).toBeInstanceOf(Date);
            
            // Verify location data
            expect(result.report?.location.latitude).toBe(location.latitude);
            expect(result.report?.location.longitude).toBe(location.longitude);
            expect(result.report?.location.accuracy).toBe(location.accuracy);
            expect(result.report?.location.accuracy).toBeLessThanOrEqual(50);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should enforce location accuracy requirements for clear reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
            longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
            accuracy: fc.double({ min: 0.1, max: 100, noNaN: true })
          }),
          fc.uuid(),
          async (location, userId) => {
            const shouldAccept = location.accuracy <= 50;

            if (shouldAccept) {
              // Mock successful path
              mockQuery.mockResolvedValueOnce({
                rows: [{ daily_report_count: 0, last_report_date: null }]
              });
              mockQuery.mockResolvedValueOnce({
                rows: [{
                  id: 'clear-report-id',
                  user_id: userId,
                  latitude: location.latitude.toString(),
                  longitude: location.longitude.toString(),
                  location_accuracy: location.accuracy.toString(),
                  severity: 'Low',
                  report_type: 'clear',
                  created_at: new Date(),
                  expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                  is_active: true
                }]
              });
              mockQuery.mockResolvedValueOnce({ rows: [] });
              mockQuery.mockResolvedValueOnce({ rows: [] });

              const result = await reportService.createReport({
                userId,
                location,
                severity: 'Low',
                reportType: 'clear'
              });

              expect(result.success).toBe(true);
              expect(result.report?.reportType).toBe('clear');
            } else {
              const result = await reportService.createReport({
                userId,
                location,
                severity: 'Low',
                reportType: 'clear'
              });

              expect(result.success).toBe(false);
              expect(result.message).toBe('Location accuracy must be within 50 meters');
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 21: Clear Report Expiry Effect
   * 
   * **Validates: Requirements 6.4**
   * 
   * Property: For any clear report submitted for an area, all active waterlogged 
   * reports in that area should be immediately marked as expired.
   * 
   * This property test verifies that:
   * 1. Clear reports trigger expiry of waterlogged reports within 500m radius
   * 2. The expiry query is executed with correct location parameters
   * 3. Only active waterlogged reports are affected (not other clear reports)
   */
  describe('Property 21: Clear Report Expiry Effect', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should expire waterlogged reports when clear report is submitted', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Track call count before this test iteration
            const callCountBefore = mockQuery.mock.calls.length;

            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 3, last_report_date: '2024-01-01' }]
            });

            // Mock clear report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low',
                report_type: 'clear',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports in area
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity: 'Low',
              reportType: 'clear'
            });

            // Verify clear report was created
            expect(result.success).toBe(true);
            expect(result.report?.reportType).toBe('clear');

            // Verify that 4 queries were made in this iteration
            const callCountAfter = mockQuery.mock.calls.length;
            expect(callCountAfter - callCountBefore).toBe(4);
            
            // Verify the expiry query includes the location parameters (last call)
            const expiryQueryCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
            expect(expiryQueryCall[0]).toContain('UPDATE waterlogging_reports');
            expect(expiryQueryCall[0]).toContain('is_active = false');
            expect(expiryQueryCall[0]).toContain('report_type = \'waterlogged\'');
            expect(expiryQueryCall[0]).toContain('ST_DWithin');
            expect(expiryQueryCall[1]).toEqual([location.longitude, location.latitude]);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use 500m radius for expiring waterlogged reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 0, last_report_date: null }]
            });

            // Mock clear report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low',
                report_type: 'clear',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await reportService.createReport({
              userId,
              location,
              severity: 'Low',
              reportType: 'clear'
            });

            // Verify the expiry query uses 500m radius
            const expiryQueryCall = mockQuery.mock.calls[3];
            expect(expiryQueryCall[0]).toContain('500'); // 500 meter radius
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only expire active waterlogged reports, not clear reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 5, last_report_date: '2024-01-01' }]
            });

            // Mock clear report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low',
                report_type: 'clear',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports
            mockQuery.mockResolvedValueOnce({ rows: [] });

            await reportService.createReport({
              userId,
              location,
              severity: 'Low',
              reportType: 'clear'
            });

            // Verify the expiry query filters for active waterlogged reports only
            const expiryQueryCall = mockQuery.mock.calls[3];
            expect(expiryQueryCall[0]).toContain('is_active = true');
            expect(expiryQueryCall[0]).toContain('report_type = \'waterlogged\'');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should execute expiry for all clear reports regardless of location', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.uuid(),
          async (location, userId) => {
            // Track call count before this test iteration
            const callCountBefore = mockQuery.mock.calls.length;

            // Mock daily limit check
            mockQuery.mockResolvedValueOnce({
              rows: [{ daily_report_count: 1, last_report_date: '2024-01-01' }]
            });

            // Mock clear report creation
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'clear-report-id',
                user_id: userId,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: location.accuracy.toString(),
                severity: 'Low',
                report_type: 'clear',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            // Mock increment daily count
            mockQuery.mockResolvedValueOnce({ rows: [] });

            // Mock expiring waterlogged reports
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.createReport({
              userId,
              location,
              severity: 'Low',
              reportType: 'clear'
            });

            // Verify clear report was created successfully
            expect(result.success).toBe(true);
            
            // Verify 4 queries were made in this iteration
            const callCountAfter = mockQuery.mock.calls.length;
            expect(callCountAfter - callCountBefore).toBe(4);
            
            // Verify the location parameters match the clear report location (last call)
            const expiryQueryCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
            expect(expiryQueryCall[1][0]).toBe(location.longitude);
            expect(expiryQueryCall[1][1]).toBe(location.latitude);
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 15: Report Aggregation
   * 
   * **Validates: Requirements 5.1**
   * 
   * Property: For any area with multiple waterlogging reports within a 1-hour period, 
   * the system should calculate an aggregate severity level.
   * 
   * This property test verifies that:
   * 1. Multiple reports within 500m radius and 1-hour period are aggregated
   * 2. The aggregation returns an AreaStatus with all reports
   * 3. The report count matches the number of reports in the area
   * 4. The aggregation uses PostGIS ST_DWithin for spatial queries
   */
  describe('Property 15: Report Aggregation', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should aggregate multiple reports within 500m radius and 1-hour period', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.integer({ min: 2, max: 10 }), // Number of reports to aggregate
          async (location, reportCount) => {
            // Generate mock reports within the area
            const now = new Date();
            const mockReports = Array.from({ length: reportCount }, (_, i) => ({
              id: `report-${i}`,
              user_id: `user-${i}`,
              latitude: (location.latitude + (Math.random() - 0.5) * 0.001).toString(),
              longitude: (location.longitude + (Math.random() - 0.5) * 0.001).toString(),
              location_accuracy: '20',
              severity: ['Low', 'Medium', 'High'][Math.floor(Math.random() * 3)],
              report_type: 'waterlogged',
              created_at: new Date(now.getTime() - Math.random() * 3600000), // Within 1 hour
              expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
              is_active: true
            }));

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregation was performed
            expect(result).toBeDefined();
            expect(result).not.toBeNull();
            
            if (result) {
              // Verify area status structure
              expect(result.center.latitude).toBe(location.latitude);
              expect(result.center.longitude).toBe(location.longitude);
              expect(result.radius).toBe(500);
              
              // Verify report count matches
              expect(result.reportCount).toBe(reportCount);
              expect(result.reports.length).toBe(reportCount);
              
              // Verify aggregate severity is calculated
              expect(['Low', 'Medium', 'High']).toContain(result.aggregateSeverity);
              
              // Verify most recent report timestamp is set
              expect(result.mostRecentReport).toBeInstanceOf(Date);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use PostGIS ST_DWithin with 500m radius for spatial queries', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          async (location) => {
            // Clear previous mocks
            jest.clearAllMocks();
            
            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({
              rows: [{
                id: 'report-1',
                user_id: 'user-1',
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'Medium',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }]
            });

            await reportService.aggregateReports(location);

            // Verify the spatial query was executed - it should be the first (and only) call
            const spatialQueryCall = mockQuery.mock.calls[0];
            
            expect(spatialQueryCall).toBeDefined();
            if (spatialQueryCall) {
              // Verify query uses ST_DWithin with parameterized radius
              expect(spatialQueryCall[0]).toContain('ST_DWithin');
              expect(spatialQueryCall[0]).toContain('$3');
              
              // Verify query filters for active waterlogged reports
              expect(spatialQueryCall[0]).toContain('is_active = true');
              expect(spatialQueryCall[0]).toContain('report_type = \'waterlogged\'');
              
              // Verify query filters for 1-hour period
              expect(spatialQueryCall[0]).toContain('INTERVAL \'1 hour\'');
              
              // Verify location parameters are passed (longitude, latitude, radius order for PostGIS)
              expect(spatialQueryCall[1][0]).toBeCloseTo(location.longitude, 3);
              expect(spatialQueryCall[1][1]).toBeCloseTo(location.latitude, 3);
              expect(spatialQueryCall[1][2]).toBe(500);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return null when no reports exist in the area', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          async (location) => {
            // Mock empty query result (no reports in area)
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.aggregateReports(location);

            // Verify null is returned when no reports exist
            expect(result).toBeNull();
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should only aggregate reports within 1-hour period', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          async (location) => {
            const now = new Date();
            
            // Mock query returns only recent reports (within 1 hour)
            mockQuery.mockResolvedValueOnce({
              rows: [
                {
                  id: 'report-1',
                  user_id: 'user-1',
                  latitude: location.latitude.toString(),
                  longitude: location.longitude.toString(),
                  location_accuracy: '20',
                  severity: 'High',
                  report_type: 'waterlogged',
                  created_at: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
                  expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
                  is_active: true
                }
              ]
            });

            const result = await reportService.aggregateReports(location);

            // Verify the query includes 1-hour time filter
            const spatialQueryCall = mockQuery.mock.calls.find(call => 
              call[0] && call[0].includes('ST_DWithin')
            );
            
            expect(spatialQueryCall).toBeDefined();
            if (spatialQueryCall) {
              expect(spatialQueryCall[0]).toContain('created_at >= NOW() - INTERVAL \'1 hour\'');
            }

            // Verify result contains only recent reports
            expect(result).not.toBeNull();
            if (result) {
              expect(result.reportCount).toBe(1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should aggregate reports for any valid location within Ahmedabad bounds', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.integer({ min: 1, max: 5 }),
          async (location, reportCount) => {
            // Generate mock reports
            const mockReports = Array.from({ length: reportCount }, (_, i) => ({
              id: `report-${i}`,
              user_id: `user-${i}`,
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString(),
              location_accuracy: '15',
              severity: 'Low',
              report_type: 'waterlogged',
              created_at: new Date(),
              expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
              is_active: true
            }));

            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregation works for any valid location
            expect(result).not.toBeNull();
            if (result) {
              expect(result.center.latitude).toBeGreaterThanOrEqual(22.9);
              expect(result.center.latitude).toBeLessThanOrEqual(23.2);
              expect(result.center.longitude).toBeGreaterThanOrEqual(72.4);
              expect(result.center.longitude).toBeLessThanOrEqual(72.8);
              expect(result.reportCount).toBe(reportCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 16: Maximum Severity Aggregation
   * 
   * **Validates: Requirements 5.2, 5.3**
   * 
   * Property: For any area with 2 or more waterlogging reports, the aggregate 
   * severity should be the highest severity level among all reports.
   * 
   * This property test verifies that:
   * 1. Aggregate severity equals the maximum severity when multiple reports exist
   * 2. Severity hierarchy is correctly applied: High > Medium > Low
   * 3. The maximum severity rule applies regardless of report order or count
   */
  describe('Property 16: Maximum Severity Aggregation', () => {
    const validLocationGen = fc.record({
      latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
      longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true }),
      accuracy: fc.double({ min: 5, max: 50, noNaN: true })
    });

    it('should calculate aggregate severity as maximum severity among all reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.array(fc.constantFrom('Low', 'Medium', 'High'), { minLength: 2, maxLength: 10 }),
          async (location, severities) => {
            // Determine expected maximum severity
            const severityOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3 };
            const expectedMaxSeverity = severities.reduce((max, severity) => 
              severityOrder[severity] > severityOrder[max] ? severity : max
            );

            // Generate mock reports with the given severities
            const mockReports = severities.map((severity, i) => ({
              id: `report-${i}`,
              user_id: `user-${i}`,
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString(),
              location_accuracy: '20',
              severity,
              report_type: 'waterlogged',
              created_at: new Date(Date.now() - i * 60000), // Stagger by 1 minute
              expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
              is_active: true
            }));

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity equals maximum severity
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe(expectedMaxSeverity);
              expect(result.reportCount).toBe(severities.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize High severity over Medium and Low', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.integer({ min: 0, max: 5 }), // Number of Low reports
          fc.integer({ min: 0, max: 5 }), // Number of Medium reports
          fc.integer({ min: 1, max: 5 }), // Number of High reports (at least 1)
          async (location, lowCount, mediumCount, highCount) => {
            // Generate mock reports with mixed severities including at least one High
            const mockReports = [
              ...Array.from({ length: lowCount }, (_, i) => ({
                id: `low-${i}`,
                user_id: `user-low-${i}`,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'Low',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              })),
              ...Array.from({ length: mediumCount }, (_, i) => ({
                id: `medium-${i}`,
                user_id: `user-medium-${i}`,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'Medium',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              })),
              ...Array.from({ length: highCount }, (_, i) => ({
                id: `high-${i}`,
                user_id: `user-high-${i}`,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'High',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }))
            ];

            // Skip test if no reports (edge case)
            if (mockReports.length === 0) {
              return;
            }

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity is High when any High report exists
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe('High');
              expect(result.reportCount).toBe(lowCount + mediumCount + highCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should prioritize Medium severity over Low when no High reports exist', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.integer({ min: 0, max: 5 }), // Number of Low reports
          fc.integer({ min: 1, max: 5 }), // Number of Medium reports (at least 1)
          async (location, lowCount, mediumCount) => {
            // Generate mock reports with only Low and Medium severities
            const mockReports = [
              ...Array.from({ length: lowCount }, (_, i) => ({
                id: `low-${i}`,
                user_id: `user-low-${i}`,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'Low',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              })),
              ...Array.from({ length: mediumCount }, (_, i) => ({
                id: `medium-${i}`,
                user_id: `user-medium-${i}`,
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: 'Medium',
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }))
            ];

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity is Medium when any Medium report exists (no High)
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe('Medium');
              expect(result.reportCount).toBe(lowCount + mediumCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use Low severity when all reports are Low', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.integer({ min: 2, max: 10 }), // Number of Low reports (at least 2)
          async (location, reportCount) => {
            // Generate mock reports with only Low severity
            const mockReports = Array.from({ length: reportCount }, (_, i) => ({
              id: `low-${i}`,
              user_id: `user-low-${i}`,
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString(),
              location_accuracy: '20',
              severity: 'Low',
              report_type: 'waterlogged',
              created_at: new Date(),
              expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
              is_active: true
            }));

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity is Low when all reports are Low
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe('Low');
              expect(result.reportCount).toBe(reportCount);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should apply maximum severity rule regardless of report order', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.shuffledSubarray(['Low', 'Medium', 'High', 'Low', 'High', 'Medium'], { minLength: 2, maxLength: 6 }),
          async (location, severities) => {
            // Determine expected maximum severity
            const severityOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3 };
            const expectedMaxSeverity = severities.reduce((max, severity) => 
              severityOrder[severity] > severityOrder[max] ? severity : max
            );

            // Generate mock reports in the given order
            const mockReports = severities.map((severity, i) => ({
              id: `report-${i}`,
              user_id: `user-${i}`,
              latitude: location.latitude.toString(),
              longitude: location.longitude.toString(),
              location_accuracy: '20',
              severity,
              report_type: 'waterlogged',
              created_at: new Date(Date.now() - i * 60000),
              expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
              is_active: true
            }));

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity equals maximum regardless of order
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe(expectedMaxSeverity);
              expect(result.reportCount).toBe(severities.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should correctly aggregate severity for exactly 2 reports', async () => {
      await fc.assert(
        fc.asyncProperty(
          validLocationGen,
          fc.constantFrom('Low', 'Medium', 'High'),
          fc.constantFrom('Low', 'Medium', 'High'),
          async (location, severity1, severity2) => {
            // Determine expected maximum severity
            const severityOrder: Record<string, number> = { 'Low': 1, 'Medium': 2, 'High': 3 };
            const expectedMaxSeverity = severityOrder[severity1] > severityOrder[severity2] 
              ? severity1 
              : severity2;

            // Generate exactly 2 mock reports
            const mockReports = [
              {
                id: 'report-1',
                user_id: 'user-1',
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: severity1,
                report_type: 'waterlogged',
                created_at: new Date(),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              },
              {
                id: 'report-2',
                user_id: 'user-2',
                latitude: location.latitude.toString(),
                longitude: location.longitude.toString(),
                location_accuracy: '20',
                severity: severity2,
                report_type: 'waterlogged',
                created_at: new Date(Date.now() - 60000),
                expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
                is_active: true
              }
            ];

            // Mock query for reports in area
            mockQuery.mockResolvedValueOnce({ rows: mockReports });

            const result = await reportService.aggregateReports(location);

            // Verify aggregate severity equals the higher of the two severities
            expect(result).not.toBeNull();
            if (result) {
              expect(result.aggregateSeverity).toBe(expectedMaxSeverity);
              expect(result.reportCount).toBe(2);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  /**
   * Feature: waterlogging-alert-platform, Property 18: Report Expiry
   * 
   * **Validates: Requirements 6.1**
   * 
   * Property: For any waterlogging report that reaches 4 hours of age, 
   * the system should mark the report as inactive.
   * 
   * This property test verifies that:
   * 1. Reports older than 4 hours are marked as inactive by expireOldReports
   * 2. The expiry query targets only active reports older than 4 hours
   * 3. Reports younger than 4 hours are not expired
   * 4. The expiry returns correct count and clears cache for affected areas
   */
  describe('Property 18: Report Expiry', () => {
    it('should mark reports older than 4 hours as inactive', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.integer({ min: 1, max: 20 }), // Number of expired reports
          fc.array(
            fc.record({
              latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
              longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true })
            }),
            { minLength: 1, maxLength: 10 }
          ),
          async (expiredCount, locations) => {
            // Generate mock expired report rows returned by the UPDATE...RETURNING query
            const expiredRows = Array.from({ length: expiredCount }, (_, i) => {
              const loc = locations[i % locations.length];
              return {
                latitude: loc.latitude.toFixed(6),
                longitude: loc.longitude.toFixed(6)
              };
            });

            // Mock the UPDATE query that marks old reports as inactive
            mockQuery.mockResolvedValueOnce({ rows: expiredRows });

            const result = await reportService.expireOldReports();

            // Verify the correct number of reports were expired
            expect(result.expiredCount).toBe(expiredCount);

            // Verify the UPDATE query was called with correct SQL
            const updateCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
            expect(updateCall[0]).toContain('UPDATE waterlogging_reports');
            expect(updateCall[0]).toContain('is_active = false');
            expect(updateCall[0]).toContain('is_active = true');
            expect(updateCall[0]).toContain("INTERVAL '4 hours'");
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should use 4-hour threshold for expiry across all report ages', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.record({
            latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
            longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true })
          }),
          async (location) => {
            // Mock the UPDATE query returning one expired report
            mockQuery.mockResolvedValueOnce({
              rows: [{
                latitude: location.latitude.toFixed(6),
                longitude: location.longitude.toFixed(6)
              }]
            });

            await reportService.expireOldReports();

            // Verify the query uses the 4-hour interval
            const updateCall = mockQuery.mock.calls[mockQuery.mock.calls.length - 1];
            const sql = updateCall[0];

            // The query must filter for reports created more than 4 hours ago
            expect(sql).toContain("created_at < NOW() - INTERVAL '4 hours'");
            // The query must only target active reports
            expect(sql).toContain('is_active = true');
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should return zero expired count when no reports are older than 4 hours', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.constant(null), // No specific input needed
          async () => {
            // Mock the UPDATE query returning no rows (no expired reports)
            mockQuery.mockResolvedValueOnce({ rows: [] });

            const result = await reportService.expireOldReports();

            // Verify no reports were expired
            expect(result.expiredCount).toBe(0);
            expect(result.clearedCacheKeys).toBe(0);
          }
        ),
        { numRuns: 100 }
      );
    });

    it('should clear cache keys for all unique expired report locations', async () => {
      await fc.assert(
        fc.asyncProperty(
          fc.array(
            fc.record({
              latitude: fc.double({ min: 22.9, max: 23.2, noNaN: true }),
              longitude: fc.double({ min: 72.4, max: 72.8, noNaN: true })
            }),
            { minLength: 1, maxLength: 8 }
          ),
          async (locations) => {
            // Generate expired report rows with the given locations
            const expiredRows = locations.map(loc => ({
              latitude: loc.latitude.toFixed(6),
              longitude: loc.longitude.toFixed(6)
            }));

            // Mock the UPDATE query
            mockQuery.mockResolvedValueOnce({ rows: expiredRows });

            const result = await reportService.expireOldReports();

            // Verify expired count matches
            expect(result.expiredCount).toBe(locations.length);

            // Verify cache was cleared (clearedCacheKeys should be > 0)
            expect(result.clearedCacheKeys).toBeGreaterThanOrEqual(1);

            // Unique locations (rounded to 4 decimal places) determine cache key count
            const uniqueKeys = new Set(
              locations.map(loc => {
                const lat = parseFloat(loc.latitude.toFixed(6)).toFixed(4);
                const lng = parseFloat(loc.longitude.toFixed(6)).toFixed(4);
                return `aggregation:${lat}:${lng}`;
              })
            );
            expect(result.clearedCacheKeys).toBe(uniqueKeys.size);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
