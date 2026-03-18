import request from 'supertest';
import express from 'express';
import { Pool } from 'pg';
import { createReportRouter } from './report.routes';
import { AuthService } from '../services/auth.service';

// Mock the auth middleware
jest.mock('../middleware/auth.middleware', () => ({
  createAuthMiddleware: () => {
    return (req: any, res: any, next: any) => {
      // Mock authenticated user
      if (req.headers.authorization === 'Bearer valid-token') {
        req.user = { userId: 'user-123' };
        next();
      } else {
        res.status(401).json({ success: false, message: 'No token provided' });
      }
    };
  }
}));

describe('Report Routes', () => {
  let app: express.Application;
  let pool: Pool;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    mockQuery = jest.fn();
    pool = {
      query: mockQuery
    } as unknown as Pool;

    app = express();
    app.use(express.json());
    app.use('/api/v1/reports', createReportRouter(pool));
  });

  describe('POST /api/v1/reports', () => {
    const validReportData = {
      location: {
        latitude: 23.0225,
        longitude: 72.5714,
        accuracy: 30
      },
      severity: 'Medium'
    };

    it('should create a report with valid data and authentication', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 5, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-123',
          user_id: 'user-123',
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

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send(validReportData);

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.report).toBeDefined();
      expect(response.body.report.severity).toBe('Medium');
      expect(response.body.message).toBe('Report created successfully');
    });

    it('should reject request without authentication', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .send(validReportData);

      expect(response.status).toBe(401);
      expect(response.body.success).toBe(false);
    });

    it('should reject request without location', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({ severity: 'Medium' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Location');
    });

    it('should reject request without severity', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({ location: validReportData.location });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Severity is required');
    });

    it('should reject request with invalid severity', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          location: validReportData.location,
          severity: 'VeryHigh'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Severity must be Low, Medium, or High');
    });

    it('should reject request with invalid report type', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          location: validReportData.location,
          severity: 'Medium',
          reportType: 'invalid'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Report type must be waterlogged or clear');
    });

    it('should return 403 when daily limit reached', async () => {
      const today = new Date().toISOString().split('T')[0];

      // Mock daily limit check - user has reached limit
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 10, last_report_date: today }]
      });

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send(validReportData);

      expect(response.status).toBe(403);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Daily report limit reached');
    });

    it('should return 400 when location accuracy exceeds 50 meters', async () => {
      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          location: {
            latitude: 23.0225,
            longitude: 72.5714,
            accuracy: 75
          },
          severity: 'High'
        });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Location accuracy must be within 50 meters');
    });

    it('should accept clear report type', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 3, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear',
          user_id: 'user-123',
          latitude: '23.0225',
          longitude: '72.5714',
          location_accuracy: '30',
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

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          ...validReportData,
          reportType: 'clear'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
      expect(response.body.report.reportType).toBe('clear');
    });

    it('should expire waterlogged reports when clear report is created', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 2, last_report_date: '2024-01-14' }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-clear-2',
          user_id: 'user-123',
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

      // Mock expiring waterlogged reports
      mockQuery.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          location: {
            latitude: 23.0225,
            longitude: 72.5714,
            accuracy: 25
          },
          severity: 'Low',
          reportType: 'clear'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);

      // Verify that the expire query was called
      expect(mockQuery).toHaveBeenCalledTimes(4);
      const expireCall = mockQuery.mock.calls[3];
      expect(expireCall[0]).toContain('UPDATE waterlogging_reports');
      expect(expireCall[0]).toContain('is_active = false');
      expect(expireCall[0]).toContain('ST_DWithin');
    });

    it('should handle database errors', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 5, last_report_date: '2024-01-14' }]
      });

      // Mock database error
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send(validReportData);

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
    });

    it('should accept all valid severity levels', async () => {
      const severities = ['Low', 'Medium', 'High'];

      for (const severity of severities) {
        // Mock daily limit check
        mockQuery.mockResolvedValueOnce({
          rows: [{ daily_report_count: 0, last_report_date: null }]
        });

        // Mock report creation
        mockQuery.mockResolvedValueOnce({
          rows: [{
            id: `report-${severity}`,
            user_id: 'user-123',
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

        const response = await request(app)
          .post('/api/v1/reports')
          .set('Authorization', 'Bearer valid-token')
          .send({
            location: validReportData.location,
            severity
          });

        expect(response.status).toBe(201);
        expect(response.body.report.severity).toBe(severity);
      }
    });

    it('should parse numeric location values from strings', async () => {
      // Mock daily limit check
      mockQuery.mockResolvedValueOnce({
        rows: [{ daily_report_count: 0, last_report_date: null }]
      });

      // Mock report creation
      mockQuery.mockResolvedValueOnce({
        rows: [{
          id: 'report-parsed',
          user_id: 'user-123',
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

      const response = await request(app)
        .post('/api/v1/reports')
        .set('Authorization', 'Bearer valid-token')
        .send({
          location: {
            latitude: '23.0225',
            longitude: '72.5714',
            accuracy: '30'
          },
          severity: 'Medium'
        });

      expect(response.status).toBe(201);
      expect(response.body.success).toBe(true);
    });
  });

  describe('GET /api/v1/reports/area', () => {
    it('should return aggregated reports for a valid location', async () => {
      const now = new Date();

      // Mock aggregation query
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
            created_at: now,
            expires_at: new Date(now.getTime() + 4 * 60 * 60 * 1000),
            is_active: true
          }
        ]
      });

      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.areaStatus).toBeDefined();
      expect(response.body.areaStatus.reportCount).toBe(2);
      expect(response.body.areaStatus.aggregateSeverity).toBe('High');
      expect(response.body.areaStatus.radius).toBe(500);
      expect(response.body.areaStatus.reportAge).toBeDefined();
    });

    it('should return null when no reports found in area', async () => {
      // Mock empty result
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714 });

      expect(response.status).toBe(200);
      expect(response.body.success).toBe(true);
      expect(response.body.areaStatus).toBeNull();
      expect(response.body.message).toBe('No active reports found in this area');
    });

    it('should reject request without latitude', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lng: 72.5714 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Latitude (lat) and longitude (lng) are required');
    });

    it('should reject request without longitude', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Latitude (lat) and longitude (lng) are required');
    });

    it('should reject request with invalid latitude', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 'invalid', lng: 72.5714 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toBe('Invalid latitude or longitude values');
    });

    it('should reject request with out-of-range latitude', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 100, lng: 72.5714 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Latitude must be between -90 and 90');
    });

    it('should reject request with out-of-range longitude', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 200 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('longitude between -180 and 180');
    });

    it('should handle database errors gracefully', async () => {
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714 });

      expect(response.status).toBe(500);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Failed to aggregate reports');
    });

    it('should return area status with correct structure', async () => {
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

      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714 });

      expect(response.status).toBe(200);
      expect(response.body.areaStatus).toHaveProperty('center');
      expect(response.body.areaStatus).toHaveProperty('radius');
      expect(response.body.areaStatus).toHaveProperty('aggregateSeverity');
      expect(response.body.areaStatus).toHaveProperty('reportCount');
      expect(response.body.areaStatus).toHaveProperty('mostRecentReport');
      expect(response.body.areaStatus).toHaveProperty('reportAge');
      expect(response.body.areaStatus).toHaveProperty('reports');
      expect(response.body.areaStatus.center.latitude).toBe(23.0225);
      expect(response.body.areaStatus.center.longitude).toBe(72.5714);
    });

    it('should accept custom radius parameter', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: []
      });

      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714, radius: 1000 });

      expect(response.status).toBe(200);
      // Verify the query was called with the custom radius
      expect(mockQuery.mock.calls[0][1]).toEqual([72.5714, 23.0225, 1000]);
    });

    it('should reject invalid radius value', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714, radius: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Radius must be a positive number');
    });

    it('should reject negative radius', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714, radius: -100 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Radius must be a positive number');
    });

    it('should reject radius exceeding 10000 meters', async () => {
      const response = await request(app)
        .get('/api/v1/reports/area')
        .query({ lat: 23.0225, lng: 72.5714, radius: 15000 });

      expect(response.status).toBe(400);
      expect(response.body.success).toBe(false);
      expect(response.body.message).toContain('Radius must be a positive number');
    });
  });
});
