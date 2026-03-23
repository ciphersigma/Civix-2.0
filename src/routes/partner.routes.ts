import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createApiKeyMiddleware } from '../middleware/apikey.middleware';

export function createPartnerRouter(pool: Pool): Router {
  const router = Router();
  const apiKeyAuth = createApiKeyMiddleware(pool);

  // All partner routes require API key auth
  router.use(apiKeyAuth);

  /**
   * GET /api/v1/partner/reports
   * Get all active waterlogging reports
   * Permission: read:reports
   */
  router.get('/reports', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    try {
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, report_type, created_at, expires_at
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged'
         ORDER BY created_at DESC
         LIMIT 500`,
      );
      return res.json({ success: true, count: result.rows.length, reports: result.rows });
    } catch (err) {
      console.error('Partner reports error:', err);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  /**
   * GET /api/v1/partner/reports/area
   * Get reports within a radius of a point
   * Query: lat, lng, radius (meters, max 50000)
   * Permission: read:reports
   */
  router.get('/reports/area', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = Math.min(parseFloat(req.query.radius as string) || 5000, 50000);

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ error: 'lat and lng are required' });
    }
    try {
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, report_type, created_at, expires_at,
                ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_m
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged'
           AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         ORDER BY distance_m ASC
         LIMIT 200`,
        [lng, lat, radius],
      );
      return res.json({ success: true, count: result.rows.length, reports: result.rows });
    } catch (err) {
      console.error('Partner area reports error:', err);
      return res.status(500).json({ error: 'Failed to fetch area reports' });
    }
  });

  /**
   * GET /api/v1/partner/route-check
   * Check if a route passes through waterlogged areas
   * Query: points = "lat1,lng1;lat2,lng2;..." (waypoints), buffer (meters, default 500)
   * Permission: read:reports
   */
  router.get('/route-check', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const pointsStr = req.query.points as string;
    const buffer = Math.min(parseFloat(req.query.buffer as string) || 500, 5000);

    if (!pointsStr) {
      return res.status(400).json({ error: 'points parameter required (format: lat1,lng1;lat2,lng2)' });
    }

    try {
      const points = pointsStr.split(';').map(p => {
        const [lat, lng] = p.split(',').map(Number);
        return { lat, lng };
      });

      if (points.some(p => isNaN(p.lat) || isNaN(p.lng))) {
        return res.status(400).json({ error: 'Invalid point format' });
      }

      // Build a linestring from waypoints and find reports near it
      const lineWKT = 'LINESTRING(' + points.map(p => `${p.lng} ${p.lat}`).join(',') + ')';
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, created_at,
                ST_Distance(location, ST_GeomFromText($1, 4326)::geography) as distance_m
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged'
           AND ST_DWithin(location, ST_GeomFromText($1, 4326)::geography, $2)
         ORDER BY severity DESC, distance_m ASC
         LIMIT 50`,
        [lineWKT, buffer],
      );

      const affected = result.rows.length > 0;
      const maxSeverity = result.rows.length > 0
        ? (['High', 'Medium', 'Low'].find(s => result.rows.some((r: any) => r.severity === s)) || 'Low')
        : null;

      return res.json({
        success: true,
        routeAffected: affected,
        maxSeverity,
        affectedPoints: result.rows.length,
        reports: result.rows,
      });
    } catch (err) {
      console.error('Route check error:', err);
      return res.status(500).json({ error: 'Failed to check route' });
    }
  });

  /**
   * GET /api/v1/partner/status
   * Get overall waterlogging status summary
   * Permission: read:reports
   */
  router.get('/status', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    try {
      const [total, severity, recent] = await Promise.all([
        pool.query(`SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged'`),
        pool.query(`SELECT severity, COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged' GROUP BY severity`),
        pool.query(`SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND created_at > NOW() - INTERVAL '1 hour'`),
      ]);

      const bySeverity: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
      severity.rows.forEach((r: any) => { bySeverity[r.severity] = parseInt(r.count); });

      return res.json({
        success: true,
        activeReports: parseInt(total.rows[0].count),
        reportsLastHour: parseInt(recent.rows[0].count),
        bySeverity,
        timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Partner status error:', err);
      return res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  return router;
}
