import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createApiKeyMiddleware } from '../middleware/apikey.middleware';

export function createPartnerRouter(pool: Pool): Router {
  const router = Router();
  const apiKeyAuth = createApiKeyMiddleware(pool);

  router.use(apiKeyAuth);

  // GET /api/v1/partner/reports — all active reports
  router.get('/reports', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    try {
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, report_type, created_at, expires_at
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
         ORDER BY created_at DESC LIMIT 500`
      );
      return res.json({ success: true, count: result.rows.length, reports: result.rows });
    } catch (err) {
      console.error('Partner reports error:', err);
      return res.status(500).json({ error: 'Failed to fetch reports' });
    }
  });

  // GET /api/v1/partner/reports/area — reports within radius
  router.get('/reports/area', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const lat = parseFloat(req.query.lat as string);
    const lng = parseFloat(req.query.lng as string);
    const radius = Math.min(parseFloat(req.query.radius as string) || 5000, 50000);
    if (isNaN(lat) || isNaN(lng)) return res.status(400).json({ error: 'lat and lng required' });
    try {
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, report_type, created_at, expires_at,
                ST_Distance(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography) as distance_m
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
           AND ST_DWithin(location, ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, $3)
         ORDER BY distance_m ASC LIMIT 200`,
        [lng, lat, radius]
      );
      return res.json({ success: true, count: result.rows.length, reports: result.rows });
    } catch (err) {
      console.error('Partner area error:', err);
      return res.status(500).json({ error: 'Failed to fetch area reports' });
    }
  });

  // GET /api/v1/partner/route-check — check if route passes through waterlogged areas
  router.get('/route-check', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    const pointsStr = req.query.points as string;
    const buffer = Math.min(parseFloat(req.query.buffer as string) || 500, 5000);
    if (!pointsStr) return res.status(400).json({ error: 'points required (lat1,lng1;lat2,lng2)' });
    try {
      const points = pointsStr.split(';').map(p => { const [lat, lng] = p.split(',').map(Number); return { lat, lng }; });
      if (points.some(p => isNaN(p.lat) || isNaN(p.lng))) return res.status(400).json({ error: 'Invalid point format' });
      const lineWKT = 'LINESTRING(' + points.map(p => p.lng + ' ' + p.lat).join(',') + ')';
      const result = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                severity, created_at, ST_Distance(location, ST_GeomFromText($1, 4326)::geography) as distance_m
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
           AND ST_DWithin(location, ST_GeomFromText($1, 4326)::geography, $2)
         ORDER BY severity DESC, distance_m ASC LIMIT 50`,
        [lineWKT, buffer]
      );
      const maxSeverity = result.rows.length > 0
        ? (['High', 'Medium', 'Low'].find(s => result.rows.some((r: any) => r.severity === s)) || 'Low') : null;
      return res.json({ success: true, routeAffected: result.rows.length > 0, maxSeverity, affectedPoints: result.rows.length, reports: result.rows });
    } catch (err) {
      console.error('Route check error:', err);
      return res.status(500).json({ error: 'Failed to check route' });
    }
  });

  /**
   * GET /api/v1/partner/navigate
   * Shortest-path navigation with waterlogging avoidance (Dijkstra + hazard rerouting)
   *
   * Algorithm:
   * 1. Fetch all active waterlogged reports in the origin-destination bounding box
   * 2. Request shortest route via Mapbox Directions (Dijkstra on road network graph)
   * 3. Check if shortest route passes through any waterlogged zones (PostGIS ST_DWithin)
   * 4. If hazards found, re-request route with waypoints that steer around hazard clusters
   * 5. Return both routes (shortest + safe) so the client can choose
   *
   * Query: origin=lat,lng  destination=lat,lng  profile=driving|walking|cycling  avoid=true|false  buffer=300
   * Permission: read:routes or read:reports
   */
  router.get('/navigate', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:routes') && !req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }

    const originStr = req.query.origin as string;
    const destStr = req.query.destination as string;
    const profile = (['driving', 'walking', 'cycling'].includes(req.query.profile as string))
      ? req.query.profile as string : 'driving';
    const buffer = Math.min(parseFloat(req.query.buffer as string) || 300, 5000);
    const shouldAvoid = req.query.avoid !== 'false';

    if (!originStr || !destStr) return res.status(400).json({ error: 'origin and destination required (lat,lng)' });

    const [oLat, oLng] = originStr.split(',').map(Number);
    const [dLat, dLng] = destStr.split(',').map(Number);
    if ([oLat, oLng, dLat, dLng].some(isNaN)) return res.status(400).json({ error: 'Invalid coordinates' });

    try {
      const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN || process.env.MAPBOX_SECRET_TOKEN;
      if (!mapboxToken) return res.status(500).json({ error: 'Mapbox token not configured' });

      // Step 1: Get all active hazards in the bounding box
      const pad = 0.05;
      const allHazards = await pool.query(
        `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, severity, created_at
         FROM waterlogging_reports
         WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
           AND ST_Y(location::geometry) BETWEEN $1 AND $2
           AND ST_X(location::geometry) BETWEEN $3 AND $4
         ORDER BY severity DESC`,
        [Math.min(oLat, dLat) - pad, Math.max(oLat, dLat) + pad, Math.min(oLng, dLng) - pad, Math.max(oLng, dLng) + pad]
      );

      // Helper: fetch route from Mapbox Directions (Dijkstra shortest path on road graph)
      const fetchRoute = async (waypoints: string) => {
        const url = 'https://api.mapbox.com/directions/v5/mapbox/' + profile + '/' + waypoints
          + '?geometries=geojson&overview=full&steps=true&alternatives=true&access_token=' + mapboxToken;
        const r = await fetch(url);
        return r.json();
      };

      // Helper: find hazards near a route geometry using PostGIS
      const findHazardsOnRoute = async (geom: any) => {
        const coords: number[][] = geom.coordinates;
        if (coords.length < 2) return [];
        const lineWKT = 'LINESTRING(' + coords.map((c: number[]) => c[0] + ' ' + c[1]).join(',') + ')';
        const result = await pool.query(
          `SELECT id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude,
                  severity, created_at, ST_Distance(location, ST_GeomFromText($1, 4326)::geography) as distance_m
           FROM waterlogging_reports
           WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'
             AND ST_DWithin(location, ST_GeomFromText($1, 4326)::geography, $2)
           ORDER BY severity DESC, distance_m ASC LIMIT 50`,
          [lineWKT, buffer]
        );
        return result.rows;
      };

      // Step 2: Get shortest route (Dijkstra via Mapbox)
      const originWp = oLng + ',' + oLat;
      const destWp = dLng + ',' + dLat;
      const shortestData = await fetchRoute(originWp + ';' + destWp);
      if (!shortestData.routes || shortestData.routes.length === 0) {
        return res.status(404).json({ error: 'No route found' });
      }
      const shortestRoute = shortestData.routes[0];

      // Step 3: Check hazards on shortest route
      const shortestHazards = await findHazardsOnRoute(shortestRoute.geometry);

      const formatRoute = (r: any) => ({
        distance: Math.round(r.distance),
        duration: Math.round(r.duration),
        geometry: r.geometry,
        steps: (r.legs[0]?.steps || []).map((s: any) => ({
          instruction: s.maneuver?.instruction || '',
          distance: Math.round(s.distance),
          duration: Math.round(s.duration),
          maneuver: { type: s.maneuver?.type, modifier: s.maneuver?.modifier },
          startCoord: s.maneuver?.location,
        })),
      });

      const formatHazards = (rows: any[]) => rows.map((r: any) => ({
        id: r.id, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude),
        severity: r.severity, distance_from_route_m: Math.round(parseFloat(r.distance_m)), created_at: r.created_at,
      }));

      const maxSev = (rows: any[]) => rows.length > 0
        ? (['High', 'Medium', 'Low'].find(s => rows.some((r: any) => r.severity === s)) || null) : null;

      // Step 4: If hazards found and avoidance requested, compute safe route
      // Strategy: add intermediate waypoints that push the route away from hazard clusters
      let safeRoute = null;
      let safeHazards: any[] = [];

      if (shortestHazards.length > 0 && shouldAvoid) {
        // Compute avoidance waypoints: for each hazard cluster, push a waypoint perpendicular to the route
        const hazardCoords = shortestHazards.slice(0, 8).map((h: any) => ({
          lat: parseFloat(h.latitude), lng: parseFloat(h.longitude),
        }));

        // Find midpoint of route and push it away from hazard centroid
        const routeCoords: number[][] = shortestRoute.geometry.coordinates;
        const midIdx = Math.floor(routeCoords.length / 2);
        const midPt = routeCoords[midIdx];

        // Hazard centroid
        const cLat = hazardCoords.reduce((s: number, h: any) => s + h.lat, 0) / hazardCoords.length;
        const cLng = hazardCoords.reduce((s: number, h: any) => s + h.lng, 0) / hazardCoords.length;

        // Push waypoint away from hazard centroid (perpendicular offset ~500m)
        const dx = midPt[0] - cLng;
        const dy = midPt[1] - cLat;
        const dist = Math.sqrt(dx * dx + dy * dy) || 0.001;
        const offset = 0.005; // ~500m in degrees
        const avoidLng = midPt[0] + (dx / dist) * offset;
        const avoidLat = midPt[1] + (dy / dist) * offset;

        // Request route through avoidance waypoint
        const safeWaypoints = originWp + ';' + avoidLng.toFixed(6) + ',' + avoidLat.toFixed(6) + ';' + destWp;
        const safeData = await fetchRoute(safeWaypoints);

        if (safeData.routes && safeData.routes.length > 0) {
          // Pick the route with fewest hazards
          let bestRoute = safeData.routes[0];
          let bestCount = Infinity;
          for (const candidate of safeData.routes) {
            const ch = await findHazardsOnRoute(candidate.geometry);
            if (ch.length < bestCount) {
              bestCount = ch.length;
              bestRoute = candidate;
              safeHazards = ch;
            }
            if (bestCount === 0) break;
          }
          safeRoute = bestRoute;
          if (safeHazards.length === 0) safeHazards = await findHazardsOnRoute(safeRoute.geometry);
        }
      }

      return res.json({
        success: true,
        shortest: {
          ...formatRoute(shortestRoute),
          hazards: { count: shortestHazards.length, maxSeverity: maxSev(shortestHazards), reports: formatHazards(shortestHazards) },
        },
        safe: safeRoute ? {
          ...formatRoute(safeRoute),
          hazards: { count: safeHazards.length, maxSeverity: maxSev(safeHazards), reports: formatHazards(safeHazards) },
        } : null,
        allHazards: allHazards.rows.map((r: any) => ({
          id: r.id, latitude: parseFloat(r.latitude), longitude: parseFloat(r.longitude),
          severity: r.severity, created_at: r.created_at,
        })),
        meta: {
          algorithm: 'dijkstra-shortest-path-with-avoidance',
          profile, origin: { latitude: oLat, longitude: oLng }, destination: { latitude: dLat, longitude: dLng },
          buffer_m: buffer, avoidance: shouldAvoid && shortestHazards.length > 0,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (err) {
      console.error('Navigate error:', err);
      return res.status(500).json({ error: 'Failed to compute route' });
    }
  });

  // GET /api/v1/partner/status — overall waterlogging summary
  router.get('/status', async (req: Request, res: Response) => {
    if (!req.apiKey?.permissions.includes('read:reports')) {
      return res.status(403).json({ error: 'Insufficient permissions' });
    }
    try {
      const [total, severity, recent] = await Promise.all([
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'"),
        pool.query("SELECT severity, COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours' GROUP BY severity"),
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND created_at > NOW() - INTERVAL '1 hour'"),
      ]);
      const bySeverity: Record<string, number> = { High: 0, Medium: 0, Low: 0 };
      severity.rows.forEach((r: any) => { bySeverity[r.severity] = parseInt(r.count); });
      return res.json({
        success: true, activeReports: parseInt(total.rows[0].count),
        reportsLastHour: parseInt(recent.rows[0].count), bySeverity, timestamp: new Date().toISOString(),
      });
    } catch (err) {
      console.error('Partner status error:', err);
      return res.status(500).json({ error: 'Failed to fetch status' });
    }
  });

  return router;
}
