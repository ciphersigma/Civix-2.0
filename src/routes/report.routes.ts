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
   * GET /api/v1/reports/public
   * Public endpoint — returns active reports for the live map (no auth required)
   */
  router.get('/public', async (req: Request, res: Response) => {
    try {
      // Also expire old reports inline so is_active stays accurate
      await pool.query(
        `UPDATE waterlogging_reports SET is_active = false, updated_at = NOW()
         WHERE is_active = true AND created_at < NOW() - INTERVAL '4 hours'`
      );

      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, report_type, created_at
         FROM waterlogging_reports
         WHERE is_active = true AND created_at > NOW() - INTERVAL '4 hours'
         ORDER BY created_at DESC
         LIMIT 200`
      );
      return res.json({ success: true, reports: result.rows });
    } catch (error) {
      console.error('Public reports error:', error);
      return res.status(200).json({ success: true, reports: [] });
    }
  });

  /**
   * GET /api/v1/reports/navigate
   * Public navigation endpoint — shortest path with waterlogging avoidance
   * Used by the mobile app. No API key required (uses auth token).
   * Query: origin=lat,lng  destination=lat,lng  profile=driving|walking|cycling
   */
  router.get('/navigate', async (req: Request, res: Response) => {
    const originStr = req.query.origin as string;
    const destStr = req.query.destination as string;
    const profile = (['driving', 'walking', 'cycling'].includes(req.query.profile as string))
      ? req.query.profile as string : 'driving';
    const buffer = Math.min(parseFloat(req.query.buffer as string) || 300, 5000);

    if (!originStr || !destStr) return res.status(400).json({ success: false, message: 'origin and destination required (lat,lng)' });

    const [oLat, oLng] = originStr.split(',').map(Number);
    const [dLat, dLng] = destStr.split(',').map(Number);
    if ([oLat, oLng, dLat, dLng].some(isNaN)) return res.status(400).json({ success: false, message: 'Invalid coordinates' });

    try {
      const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_SECRET_TOKEN;
      if (!mapboxToken) return res.status(500).json({ success: false, message: 'Mapbox not configured' });

      // Fetch all hazards in bounding box
      const pad = 0.05;
      const allHazards = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, severity, created_at
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
           AND ST_Y(location::geometry) BETWEEN $1 AND $2 AND ST_X(location::geometry) BETWEEN $3 AND $4`,
        [Math.min(oLat, dLat) - pad, Math.max(oLat, dLat) + pad, Math.min(oLng, dLng) - pad, Math.max(oLng, dLng) + pad]
      );

      // Shortest route via Mapbox Directions (Dijkstra)
      const dirUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${oLng},${oLat};${dLng},${dLat}?geometries=geojson&overview=full&steps=true&alternatives=true&access_token=${mapboxToken}`;
      const dirRes = await fetch(dirUrl);
      const dirData = await dirRes.json();

      if (!dirData.routes || dirData.routes.length === 0) {
        return res.status(404).json({ success: false, message: 'No route found' });
      }

      const shortestRoute = dirData.routes[0];
      const coords: number[][] = shortestRoute.geometry.coordinates;

      // Find hazards on shortest route
      let shortestHazards: any[] = [];
      if (coords.length >= 2) {
        const lineWKT = 'LINESTRING(' + coords.map((c: number[]) => c[0] + ' ' + c[1]).join(',') + ')';
        const hResult = await pool.query(
          `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                  severity, created_at, ST_Distance(location, ST_GeomFromText($1, 4326)::geography) as distance_m
           FROM waterlogging_reports
           WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
             AND ST_DWithin(location, ST_GeomFromText($1, 4326)::geography, $2)
           ORDER BY severity DESC LIMIT 50`,
          [lineWKT, buffer]
        );
        shortestHazards = hResult.rows;
      }

      // If hazards found, compute safe route with avoidance waypoint
      let safeRoute = null;
      let safeHazards: any[] = [];

      if (shortestHazards.length > 0) {
        const hazardCoords = shortestHazards.slice(0, 8).map((h: any) => ({
          lat: parseFloat(h.latitude), lng: parseFloat(h.longitude),
        }));
        const midIdx = Math.floor(coords.length / 2);
        const midPt = coords[midIdx];
        const cLat = hazardCoords.reduce((s: number, h: any) => s + h.lat, 0) / hazardCoords.length;
        const cLng = hazardCoords.reduce((s: number, h: any) => s + h.lng, 0) / hazardCoords.length;
        const dx = midPt[0] - cLng;
        const dy = midPt[1] - cLat;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const offset = 0.005;
        const avoidLng = midPt[0] + (dx / dist) * offset;
        const avoidLat = midPt[1] + (dy / dist) * offset;

        const safeUrl = `https://api.mapbox.com/directions/v5/mapbox/${profile}/${oLng},${oLat};${avoidLng.toFixed(6)},${avoidLat.toFixed(6)};${dLng},${dLat}?geometries=geojson&overview=full&steps=true&access_token=${mapboxToken}`;
        const safeRes = await fetch(safeUrl);
        const safeData = await safeRes.json();

        if (safeData.routes && safeData.routes.length > 0) {
          safeRoute = safeData.routes[0];
          const sc = safeRoute.geometry.coordinates;
          if (sc.length >= 2) {
            const sLineWKT = 'LINESTRING(' + sc.map((c: number[]) => c[0] + ' ' + c[1]).join(',') + ')';
            const shResult = await pool.query(
              `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                      severity, ST_Distance(location, ST_GeomFromText($1, 4326)::geography) as distance_m
               FROM waterlogging_reports
               WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
                 AND ST_DWithin(location, ST_GeomFromText($1, 4326)::geography, $2)
               ORDER BY severity DESC LIMIT 50`,
              [sLineWKT, buffer]
            );
            safeHazards = shResult.rows;
          }
        }
      }

      const fmtSteps = (r: any) => (r.legs || []).flatMap((l: any) => (l.steps || []).map((s: any) => ({
        instruction: s.maneuver?.instruction || '',
        distance: Math.round(s.distance),
        duration: Math.round(s.duration),
        maneuver: { type: s.maneuver?.type, modifier: s.maneuver?.modifier },
        startCoord: s.maneuver?.location,
      })));

      const fmtHazard = (rows: any[]) => rows.map((r: any) => ({
        id: r.id, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude),
        severity: r.severity, distance_from_route_m: Math.round(parseFloat(r.distance_m || '0')),
      }));

      return res.json({
        success: true,
        shortest: {
          distance: Math.round(shortestRoute.distance), duration: Math.round(shortestRoute.duration),
          geometry: shortestRoute.geometry, steps: fmtSteps(shortestRoute),
          hazards: { count: shortestHazards.length, reports: fmtHazard(shortestHazards) },
        },
        safe: safeRoute ? {
          distance: Math.round(safeRoute.distance), duration: Math.round(safeRoute.duration),
          geometry: safeRoute.geometry, steps: fmtSteps(safeRoute),
          hazards: { count: safeHazards.length, reports: fmtHazard(safeHazards) },
        } : null,
        allHazards: allHazards.rows.map((r: any) => ({
          id: r.id, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude), severity: r.severity,
        })),
        meta: { algorithm: 'dijkstra-shortest-path-with-avoidance', profile },
      });
    } catch (error) {
      console.error('Navigate error:', error);
      return res.status(500).json({ success: false, message: 'Navigation failed' });
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
