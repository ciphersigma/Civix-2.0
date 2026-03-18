import { Router, Request, Response } from 'express';
import { ReportService } from '../services/report.service';
import { createAuthMiddleware } from '../middleware/auth.middleware';
import { Pool } from 'pg';

export function createReportRouter(pool: Pool): Router {
  const router = Router();
  const reportService = new ReportService(pool);
  const authMiddleware = createAuthMiddleware(pool);

  /**
   * POST /api/v1/reports
   * Create a new waterlogging report
   * Requires authentication
   */
  router.post('/', authMiddleware, async (req: Request, res: Response) => {
    try {
      const { location, severity, reportType } = req.body;
      const userId = req.user?.userId;

      // Validate user ID (should always be present after auth middleware)
      if (!userId) {
        return res.status(401).json({
          success: false,
          message: 'User not authenticated'
        });
      }

      // Validate required fields
      if (!location || !location.latitude || !location.longitude || !location.accuracy) {
        return res.status(400).json({
          success: false,
          message: 'Location with latitude, longitude, and accuracy is required'
        });
      }

      if (!severity) {
        return res.status(400).json({
          success: false,
          message: 'Severity is required'
        });
      }

      // Validate severity value
      if (!['Low', 'Medium', 'High'].includes(severity)) {
        return res.status(400).json({
          success: false,
          message: 'Severity must be Low, Medium, or High'
        });
      }

      // Validate report type if provided
      if (reportType && !['waterlogged', 'clear'].includes(reportType)) {
        return res.status(400).json({
          success: false,
          message: 'Report type must be waterlogged or clear'
        });
      }

      // Create report
      const result = await reportService.createReport({
        userId,
        location: {
          latitude: parseFloat(location.latitude),
          longitude: parseFloat(location.longitude),
          accuracy: parseFloat(location.accuracy)
        },
        severity,
        reportType: reportType || 'waterlogged'
      });

      if (!result.success) {
        // Handle specific error cases
        if (result.message === 'Daily report limit reached') {
          return res.status(403).json({
            success: false,
            message: result.message
          });
        }

        if (result.message === 'Location accuracy must be within 200 meters') {
          return res.status(400).json({
            success: false,
            message: result.message
          });
        }

        return res.status(400).json({
          success: false,
          message: result.message
        });
      }

      return res.status(201).json({
        success: true,
        report: result.report,
        message: result.message
      });
    } catch (error) {
      console.error('Report submission error:', error);
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to create report'
      });
    }
  });

  /**
   * GET /api/v1/reports/area
   * Get aggregated reports for a specific area
   * Query parameters: lat, lng, radius (optional, defaults to 500m)
   * Returns aggregated area status with report count, severity, and report age
   */
  router.get('/area', async (req: Request, res: Response) => {
    try {
      const { lat, lng, radius } = req.query;

      // Validate required parameters
      if (!lat || !lng) {
        return res.status(400).json({
          success: false,
          message: 'Latitude (lat) and longitude (lng) are required'
        });
      }

      const latitude = parseFloat(lat as string);
      const longitude = parseFloat(lng as string);

      // Validate coordinate values
      if (isNaN(latitude) || isNaN(longitude)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid latitude or longitude values'
        });
      }

      if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) {
        return res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
        });
      }

      // Parse and validate radius (defaults to 500m)
      let radiusMeters = 500;
      if (radius) {
        radiusMeters = parseFloat(radius as string);
        if (isNaN(radiusMeters) || radiusMeters <= 0 || radiusMeters > 50000) {
          return res.status(400).json({
            success: false,
            message: 'Radius must be a positive number up to 50000 meters'
          });
        }
      }

      // Get aggregated reports for the area
      const areaStatus = await reportService.aggregateReports({
        latitude,
        longitude,
        accuracy: 0 // Not used for aggregation query
      }, radiusMeters);

      if (!areaStatus) {
        return res.status(200).json({
          success: true,
          areaStatus: null,
          message: 'No active reports found in this area'
        });
      }

      return res.status(200).json({
        success: true,
        areaStatus,
        message: 'Area status retrieved successfully'
      });
    } catch (error) {
      console.error('Get area reports error:', error);
      // If database is unavailable, return empty result instead of 500
      if (error instanceof Error && (
        error.message.includes('ECONNREFUSED') ||
        error.message.includes('getaddrinfo') ||
        error.message.includes('connection') ||
        error.message.includes('timeout')
      )) {
        return res.status(200).json({
          success: true,
          areaStatus: null,
          message: 'Database unavailable, no data to display'
        });
      }
      return res.status(500).json({
        success: false,
        message: error instanceof Error ? error.message : 'Failed to retrieve area reports'
      });
    }
  });

  return router;
}
