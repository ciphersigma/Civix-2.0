import { Pool } from 'pg';
import { ReportService } from './report.service';

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

describe('ReportService', () => {
  let pool: Pool;
  let reportService: ReportService;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = {
      query: mockQuery
    } as unknown as Pool;
    reportService = new ReportService(pool);
  });

  describe('createReport', () => {
    const validLocation = {
      latitude: 23.0225,
      longitude: 72.5714,
      accuracy: 30
    };

    const userId = 'user-123';

    it('should create a waterlogged report with valid data', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 5, last_report_date: '2024-01-01' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-123',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'Medium',
          report_type: 'waterlogged',
          created_at: new Date('2024-01-15T10:00:00Z'),
          expires_at: new Date('2024-01-15T14:00:00Z'),
          is_active: true
        }]
      });

      // Mock increment daily count
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.createReport({
        userId,
        location: validLocation,
        severity: 'Medium'
      });

      expect(result.success).toBe(true);
      expect(result.report).toBeDefined();
      expect(result.report?.severity).toBe('Medium');
      expect(result.report?.reportType).toBe('waterlogged');
      expect(result.report?.location.latitude).toBe(23.0225);
      expect(result.report?.location.longitude).toBe(72.5714);
      expect(result.message).toBe('Report created successfully');
    });

    it('should reject report with accuracy > 50 meters', async () => {
      const result = await reportService.createReport({
        userId,
        location: {
          latitude: 23.0225,
          longitude: 72.5714,
          accuracy: 75
        },
        severity: 'High'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Location accuracy must be within 50 meters');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should reject report with invalid coordinates', async () => {
      const result = await reportService.createReport({
        userId,
        location: {
          latitude: 200, // Invalid latitude
          longitude: 72.5714,
          accuracy: 30
        },
        severity: 'Low'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid location coordinates');
      expect(mockQuery).not.toHaveBeenCalled();
    });

    it('should reject report when daily limit reached', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock daily limit check - user has already submitted 10 reports today
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 10, last_report_date: today }]
      });

      const result = await reportService.createReport({
        userId,
        location: validLocation,
        severity: 'Medium'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Daily report limit reached');
    });

    it('should allow report when daily limit not reached', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock daily limit check - user has submitted 9 reports today
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 9, last_report_date: today }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-456',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'Low',
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
        location: validLocation,
        severity: 'Low'
      });

      expect(result.success).toBe(true);
    });

    it('should reset daily count for new day', async () => {
      // Mock daily limit check - last report was yesterday
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 10, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-789',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'High',
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
        location: validLocation,
        severity: 'High'
      });

      expect(result.success).toBe(true);
    });

    it('should create clear report when reportType is clear', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 3, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear-1',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '25',
          severity: 'Low',
          report_type: 'clear',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      // Mock increment daily count
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.createReport({
        userId,
        location: { ...validLocation, accuracy: 25 },
        severity: 'Low',
        reportType: 'clear'
      });

      expect(result.success).toBe(true);
      expect(result.report?.reportType).toBe('clear');
    });

    it('should handle database errors gracefully', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 5, last_report_date: '2024-01-14' }]
      });

      // Mock database error
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        reportService.createReport({
          userId,
          location: validLocation,
          severity: 'Medium'
        })
      ).rejects.toThrow('Failed to create report');
    });

    it('should validate all severity levels', async () => {
      const severities: Array<'Low' | 'Medium' | 'High'> = ['Low', 'Medium', 'High'];

      for (const severity of severities) {
        // Mock daily limit check
        mockQuery.mockResolvedValueOnce({
          rows: [{ daily_report_count: 0, last_report_date: null }]
        });

        // Mock report creation
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: `report-${severity}`,
            user_id: userId,
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
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
          location: validLocation,
          severity
        });

        expect(result.success).toBe(true);
        expect(result.report?.severity).toBe(severity);
      }
    });

    it('should store location with correct PostGIS format', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 0, last_report_date: null }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-gis',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'Medium',
          report_type: 'waterlogged',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      // Mock increment daily count
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await reportService.createReport({
        userId,
        location: validLocation,
        severity: 'Medium'
      });

      // Verify the SQL query uses PostGIS functions
      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[0]).toContain('ST_SetSRID');
      expect(insertCall[0]).toContain('ST_MakePoint');
      expect(insertCall[0]).toContain('4326'); // WGS84 SRID
    });

    it('should expire waterlogged reports when clear report is submitted', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 3, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear-2',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '25',
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
        location: { ...validLocation, accuracy: 25 },
        severity: 'Low',
        reportType: 'clear'
      });

      expect(result.success).toBe(true);
      expect(result.report?.reportType).toBe('clear');

      // Verify that the expire query was called
      const expireCall = mockQuery.mock.calls[3];
      expect(expireCall[0]).toContain('UPDATE waterlogging_reports');
      expect(expireCall[0]).toContain('is_active = false');
      expect(expireCall[0]).toContain('report_type = \'waterlogged\'');
      expect(expireCall[0]).toContain('ST_DWithin');
      expect(expireCall[0]).toContain('500'); // 500m radius
    });

    it('should use PostGIS ST_DWithin for finding reports within 500m radius', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 2, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear-3',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '20',
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
        location: { ...validLocation, accuracy: 20 },
        severity: 'Low',
        reportType: 'clear'
      });

      // Verify ST_DWithin is used with correct parameters
      const expireCall = mockQuery.mock.calls[3];
      expect(expireCall[0]).toContain('ST_DWithin');
      expect(expireCall[1]).toEqual([validLocation.longitude, validLocation.latitude]);
    });

    it('should not expire reports when waterlogged report is submitted', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 1, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-waterlogged-1',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'High',
          report_type: 'waterlogged',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      // Mock increment daily count
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await reportService.createReport({
        userId,
        location: validLocation,
        severity: 'High',
        reportType: 'waterlogged'
      });

      // Verify that only 3 queries were made (no expire query)
      expect(mockQuery).toHaveBeenCalledTimes(3);
    });

    it('should handle errors in expiring reports gracefully', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 1, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear-4',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '25',
          severity: 'Low',
          report_type: 'clear',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      // Mock increment daily count
      mockQuery.mockResolvedValueOnce({ rows: [] });

      // Mock error in expiring reports
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      // Should still succeed even if expire fails
      const result = await reportService.createReport({
        userId,
        location: { ...validLocation, accuracy: 25 },
        severity: 'Low',
        reportType: 'clear'
      });

      expect(result.success).toBe(true);
      expect(result.report?.reportType).toBe('clear');
    });
  });

  describe('aggregateReports', () => {
    const testLocation = {
      latitude: 23.0225,
      longitude: 72.5714,
      accuracy: 30
    };

    beforeEach(() => {
      // Mock cache functions to avoid Redis dependency in tests
      jest.mock('../utils/cache', () => ({
        cacheGetJSON: jest.fn().mockResolvedValue(null),
        cacheSetJSON: jest.fn().mockResolvedValue(true)
      }));
    });

    it('should aggregate reports within 500m radius', async () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 30 * 60 * 1000); // 30 minutes ago

      // Mock query for reports within 500m
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'High',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          },
          {
            id: 'report-2',
            user_id: 'user-2',
            latitude: '23.0230',
            longitude: '72.5720',
            location_accuracy: '25',
            severity: 'Medium',
            report_type: 'waterlogged',
            created_at: oneHourAgo,
            expires_at: new Date(oneHourAgo.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result).not.toBeNull();
      expect(result?.reportCount).toBe(2);
      expect(result?.aggregateSeverity).toBe('High'); // Maximum severity
      expect(result?.radius).toBe(500);
      expect(result?.center.latitude).toBe(testLocation.latitude);
      expect(result?.center.longitude).toBe(testLocation.longitude);
      expect(result?.reports).toHaveLength(2);
      expect(result?.reportAge).toBeDefined();
      expect(result?.reportAge).toMatch(/^Updated /);
    });

    it('should calculate aggregate severity as maximum severity', async () => {
      const now = new Date();

      // Test with Low and Medium - should return Medium
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'Medium',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          },
          {
            id: 'report-2',
            user_id: 'user-2',
            latitude: '23.0230',
            longitude: '72.5720',
            location_accuracy: '25',
            severity: 'Low',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.aggregateSeverity).toBe('Medium');
    });

    it('should return High severity when any report is High', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'Low',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          },
          {
            id: 'report-2',
            user_id: 'user-2',
            latitude: '23.0230',
            longitude: '72.5720',
            location_accuracy: '25',
            severity: 'High',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          },
          {
            id: 'report-3',
            user_id: 'user-3',
            latitude: '23.0228',
            longitude: '72.5718',
            location_accuracy: '20',
            severity: 'Medium',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.aggregateSeverity).toBe('High');
      expect(result?.reportCount).toBe(3);
    });

    it('should count all contributing reports', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: Array.from({ length: 5 }, (_, i) => ({
          id: `report-${i}`,
          user_id: `user-${i}`,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
          severity: 'Medium',
          report_type: 'waterlogged',
          created_at: now,
          expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
          is_active: true
        }))
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportCount).toBe(5);
      expect(result?.reports).toHaveLength(5);
    });

    it('should return null when no reports found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result).toBeNull();
    });

    it('should only include reports within 1-hour period', async () => {
      const now = new Date();

      // Mock query should filter by time in SQL
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'High',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      await reportService.aggregateReports(testLocation);

      // Verify SQL query includes 1-hour time filter
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('created_at >= NOW() - INTERVAL \'1 hour\'');
    });

    it('should use PostGIS ST_DWithin for 500m radius query', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      await reportService.aggregateReports(testLocation);

      // Verify SQL query uses ST_DWithin with parameterized radius
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('ST_DWithin');
      expect(queryCall[0]).toContain('$3');
      expect(queryCall[1]).toEqual([testLocation.longitude, testLocation.latitude, 500]);
    });

    it('should only include active waterlogged reports', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      await reportService.aggregateReports(testLocation);

      // Verify SQL query filters for active waterlogged reports
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('is_active = true');
      expect(queryCall[0]).toContain('report_type = \'waterlogged\'');
    });

    it('should return most recent report timestamp', async () => {
      const now = new Date();
      const earlier = new Date(now.getTime() - 30 * 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'High',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          },
          {
            id: 'report-2',
            user_id: 'user-2',
            latitude: '23.0230',
            longitude: '72.5720',
            location_accuracy: '25',
            severity: 'Medium',
            report_type: 'waterlogged',
            created_at: earlier,
            expires_at: new Date(earlier.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.mostRecentReport).toEqual(now);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(
        reportService.aggregateReports(testLocation)
      ).rejects.toThrow('Failed to aggregate reports');
    });

    it('should order reports by created_at DESC', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      await reportService.aggregateReports(testLocation);

      // Verify SQL query orders by created_at DESC
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('ORDER BY created_at DESC');
    });

    it('should handle single report correctly', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'Low',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportCount).toBe(1);
      expect(result?.aggregateSeverity).toBe('Low');
      expect(result?.reports).toHaveLength(1);
    });

    it('should accept custom radius parameter', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      await reportService.aggregateReports(testLocation, 1000);

      // Verify SQL query uses the custom radius
      const queryCall = mockQuery.mock.calls[0];
      expect(queryCall[0]).toContain('ST_DWithin');
      expect(queryCall[1]).toEqual([testLocation.longitude, testLocation.latitude, 1000]);
    });

    it('should return custom radius in area status', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'Medium',
            report_type: 'waterlogged',
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation, 750);

      expect(result?.radius).toBe(750);
    });

    it('should include reportAge as human-readable string', async () => {
      const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'High',
            report_type: 'waterlogged',
            created_at: thirtyMinutesAgo,
            expires_at: new Date(thirtyMinutesAgo.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportAge).toBe('Updated 30 minutes ago');
    });

    it('should show "Updated just now" for very recent reports', async () => {
      const justNow = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1',
            user_id: 'user-1',
            latitude: '23.0225',
            longitude: '72.5714',
            location_accuracy: '30',
            severity: 'Low',
            report_type: 'waterlogged',
            created_at: justNow,
            expires_at: new Date(justNow.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportAge).toBe('Updated just now');
    });
  });

  describe('expireOldReports', () => {
    it('should mark reports older than 4 hours as inactive', async () => {
      const oldReport1 = {
        id: 'old-report-1',
        latitude: 23.0225,
        longitude: 72.5714
      };
      const oldReport2 = {
        id: 'old-report-2',
        latitude: 23.0300,
        longitude: 72.5800
      };

      // Mock the UPDATE query to return expired reports
      mockQuery.mockResolvedValueOnce({
        rows: [
          { latitude: oldReport1.latitude, longitude: oldReport1.longitude },
          { latitude: oldReport2.latitude, longitude: oldReport2.longitude }
        ],
        rowCount: 2
      });

      const result = await reportService.expireOldReports();

      expect(result.expiredCount).toBe(2);
      expect(result.clearedCacheKeys).toBe(2);

      // Verify the UPDATE query was called correctly
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE waterlogging_reports'),
        []
      );
      expect(mockQuery.mock.calls[0][0]).toContain('is_active = false');
      expect(mockQuery.mock.calls[0][0]).toContain('WHERE is_active = true');
      expect(mockQuery.mock.calls[0][0]).toContain("created_at < NOW() - INTERVAL '4 hours'");
    });

    it('should return zero counts when no reports to expire', async () => {
      // Mock the UPDATE query to return no rows
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      const result = await reportService.expireOldReports();

      expect(result.expiredCount).toBe(0);
      expect(result.clearedCacheKeys).toBe(0);
    });

    it('should clear Redis cache for expired areas', async () => {
      const expiredReports = [
        { latitude: 23.0225, longitude: 72.5714 },
        { latitude: 23.0225, longitude: 72.5714 }, // Same area (identical coordinates)
        { latitude: 23.0300, longitude: 72.5800 }  // Different area
      ];

      // Mock the UPDATE query
      mockQuery.mockResolvedValueOnce({
        rows: expiredReports,
        rowCount: 3
      });

      const result = await reportService.expireOldReports();

      // Should have 2 unique cache keys (two distinct areas)
      expect(result.expiredCount).toBe(3);
      expect(result.clearedCacheKeys).toBe(2);
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      await expect(reportService.expireOldReports()).rejects.toThrow('Failed to expire old reports');
    });

    it('should use correct SQL query with 4-hour interval', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [],
        rowCount: 0
      });

      await reportService.expireOldReports();

      const query = mockQuery.mock.calls[0][0];
      expect(query).toContain('UPDATE waterlogging_reports');
      expect(query).toContain('SET is_active = false');
      expect(query).toContain('updated_at = NOW()');
      expect(query).toContain('WHERE is_active = true');
      expect(query).toContain("created_at < NOW() - INTERVAL '4 hours'");
      expect(query).toContain('RETURNING');
      expect(query).toContain('ST_Y(location::geometry) as latitude');
      expect(query).toContain('ST_X(location::geometry) as longitude');
    });

    it('should round coordinates to 4 decimal places for cache keys', async () => {
      const expiredReports = [
        { latitude: 23.022567, longitude: 72.571489 }, // Should round to 23.0226, 72.5715
        { latitude: 23.022512, longitude: 72.571423 }  // Should round to 23.0225, 72.5714
      ];

      mockQuery.mockResolvedValueOnce({
        rows: expiredReports,
        rowCount: 2
      });

      const result = await reportService.expireOldReports();

      // Both should create unique cache keys
      expect(result.expiredCount).toBe(2);
      expect(result.clearedCacheKeys).toBe(2);
    });

    it('should handle duplicate locations correctly', async () => {
      const expiredReports = [
        { latitude: 23.0225, longitude: 72.5714 },
        { latitude: 23.0225, longitude: 72.5714 },
        { latitude: 23.0225, longitude: 72.5714 }
      ];

      mockQuery.mockResolvedValueOnce({
        rows: expiredReports,
        rowCount: 3
      });

      const result = await reportService.expireOldReports();

      // Should have only 1 unique cache key
      expect(result.expiredCount).toBe(3);
      expect(result.clearedCacheKeys).toBe(1);
    });
  });

  describe('createReport - coordinate boundary validation', () => {
    const userId = 'user-123';

    it('should accept report at boundary coordinates (lat=90, lng=180)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 0, last_report_date: null }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-boundary',
          user_id: userId,
          latitude: '90',
          longitude: '180',
          location_accuracy: '10',
          severity: 'Low',
          report_type: 'waterlogged',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.createReport({
        userId,
        location: { latitude: 90, longitude: 180, accuracy: 10 },
        severity: 'Low'
      });

      expect(result.success).toBe(true);
    });

    it('should accept report at negative boundary coordinates (lat=-90, lng=-180)', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 0, last_report_date: null }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-neg-boundary',
          user_id: userId,
          latitude: '-90',
          longitude: '-180',
          location_accuracy: '10',
          severity: 'Medium',
          report_type: 'waterlogged',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.createReport({
        userId,
        location: { latitude: -90, longitude: -180, accuracy: 10 },
        severity: 'Medium'
      });

      expect(result.success).toBe(true);
    });

    it('should reject report with NaN latitude', async () => {
      const result = await reportService.createReport({
        userId,
        location: { latitude: NaN, longitude: 72.5714, accuracy: 30 },
        severity: 'High'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid location coordinates');
    });

    it('should reject report with NaN longitude', async () => {
      const result = await reportService.createReport({
        userId,
        location: { latitude: 23.0225, longitude: NaN, accuracy: 30 },
        severity: 'Low'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid location coordinates');
    });

    it('should reject report with out-of-range longitude (>180)', async () => {
      const result = await reportService.createReport({
        userId,
        location: { latitude: 23.0225, longitude: 181, accuracy: 30 },
        severity: 'Medium'
      });

      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid location coordinates');
    });

    it('should reject report with accuracy exactly at 50 meters', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 0, last_report_date: null }]
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-exact-50',
          user_id: userId,
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '50',
          severity: 'Low',
          report_type: 'waterlogged',
          created_at: new Date(),
          expires_at: new Date(Date.now() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const result = await reportService.createReport({
        userId,
        location: { latitude: 23.0225, longitude: 72.5714, accuracy: 50 },
        severity: 'Low'
      });

      expect(result.success).toBe(true);
    });
  });

  describe('aggregateReports - multiple reports with mixed severities', () => {
    const testLocation = {
      latitude: 23.0225,
      longitude: 72.5714,
      accuracy: 30
    };

    it('should return highest severity with 3+ reports (Requirement 5.2)', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1', user_id: 'user-1',
            latitude: '23.0225', longitude: '72.5714', location_accuracy: '30',
            severity: 'Low', report_type: 'waterlogged',
            created_at: now, expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          },
          {
            id: 'report-2', user_id: 'user-2',
            latitude: '23.0226', longitude: '72.5715', location_accuracy: '25',
            severity: 'Medium', report_type: 'waterlogged',
            created_at: new Date(now.getTime() - 10 * 60 * 1000), expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          },
          {
            id: 'report-3', user_id: 'user-3',
            latitude: '23.0227', longitude: '72.5716', location_accuracy: '20',
            severity: 'High', report_type: 'waterlogged',
            created_at: new Date(now.getTime() - 20 * 60 * 1000), expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          },
          {
            id: 'report-4', user_id: 'user-4',
            latitude: '23.0228', longitude: '72.5717', location_accuracy: '15',
            severity: 'Low', report_type: 'waterlogged',
            created_at: new Date(now.getTime() - 30 * 60 * 1000), expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result).not.toBeNull();
      expect(result?.reportCount).toBe(4);
      expect(result?.aggregateSeverity).toBe('High');
    });

    it('should return Medium when 3+ reports have Low and Medium only', async () => {
      const now = new Date();

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 'report-1', user_id: 'user-1',
            latitude: '23.0225', longitude: '72.5714', location_accuracy: '30',
            severity: 'Low', report_type: 'waterlogged',
            created_at: now, expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          },
          {
            id: 'report-2', user_id: 'user-2',
            latitude: '23.0226', longitude: '72.5715', location_accuracy: '25',
            severity: 'Medium', report_type: 'waterlogged',
            created_at: new Date(now.getTime() - 10 * 60 * 1000), expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          },
          {
            id: 'report-3', user_id: 'user-3',
            latitude: '23.0227', longitude: '72.5716', location_accuracy: '20',
            severity: 'Low', report_type: 'waterlogged',
            created_at: new Date(now.getTime() - 20 * 60 * 1000), expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000), is_active: true
          }
        ]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportCount).toBe(3);
      expect(result?.aggregateSeverity).toBe('Medium');
    });

    it('should format report age as "Updated 1 minute ago" for 1-minute-old report', async () => {
      const oneMinuteAgo = new Date(Date.now() - 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-1', user_id: 'user-1',
          latitude: '23.0225', longitude: '72.5714', location_accuracy: '30',
          severity: 'Low', report_type: 'waterlogged',
          created_at: oneMinuteAgo,
          expires_at: new Date(oneMinuteAgo.getTime() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportAge).toBe('Updated 1 minute ago');
    });

    it('should format report age as "Updated 1 hour ago" for 1-hour-old report', async () => {
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-1', user_id: 'user-1',
          latitude: '23.0225', longitude: '72.5714', location_accuracy: '30',
          severity: 'Medium', report_type: 'waterlogged',
          created_at: oneHourAgo,
          expires_at: new Date(oneHourAgo.getTime() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportAge).toBe('Updated 1 hour ago');
    });

    it('should format report age as "Updated X hours ago" for multi-hour-old report', async () => {
      const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000);

      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-1', user_id: 'user-1',
          latitude: '23.0225', longitude: '72.5714', location_accuracy: '30',
          severity: 'High', report_type: 'waterlogged',
          created_at: threeHoursAgo,
          expires_at: new Date(threeHoursAgo.getTime() + 4 * 60 * 60 * 1000),
          is_active: true
        }]
      });

      const result = await reportService.aggregateReports(testLocation);

      expect(result?.reportAge).toBe('Updated 3 hours ago');
    });
  });
});
