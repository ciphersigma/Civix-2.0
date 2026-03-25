import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import { createAuthMiddleware } from '../middleware/auth.middleware';

export function createWeatherRouter(pool: Pool): Router {
  const router = Router();
  const authMiddleware = createAuthMiddleware(pool);

  /**
   * POST /api/v1/weather/register-token
   * Register or update FCM token for push notifications
   */
  router.post('/register-token', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { fcmToken } = req.body;
      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
      if (!fcmToken) return res.status(400).json({ success: false, message: 'fcmToken is required' });

      await pool.query(
        'UPDATE users SET fcm_token = $1, updated_at = NOW() WHERE id = $2',
        [fcmToken, userId]
      );
      return res.json({ success: true, message: 'FCM token registered' });
    } catch (error) {
      console.error('Register token error:', error);
      return res.status(500).json({ success: false, message: 'Failed to register token' });
    }
  });

  /**
   * POST /api/v1/weather/update-location
   * Update user's last known location for weather alerts
   */
  router.post('/update-location', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { latitude, longitude } = req.body;
      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
      if (!latitude || !longitude) return res.status(400).json({ success: false, message: 'latitude and longitude required' });

      await pool.query(
        `UPDATE users SET last_known_location = ST_SetSRID(ST_MakePoint($1, $2), 4326)::geography, updated_at = NOW() WHERE id = $3`,
        [parseFloat(longitude), parseFloat(latitude), userId]
      );
      return res.json({ success: true, message: 'Location updated' });
    } catch (error) {
      console.error('Update location error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update location' });
    }
  });

  /**
   * GET /api/v1/weather/alerts
   * Get recent weather alerts for the user's area
   */
  router.get('/alerts', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });

      // Get user's notifications of type rain_detection
      const result = await pool.query(
        `SELECT n.id, n.title, n.body, n.data, n.sent_at, n.responded_at, n.response
         FROM notifications n
         WHERE n.user_id = $1 AND n.type = 'rain_detection'
         ORDER BY n.sent_at DESC LIMIT 20`,
        [userId]
      );

      return res.json({ success: true, alerts: result.rows });
    } catch (error) {
      console.error('Get alerts error:', error);
      return res.status(500).json({ success: false, message: 'Failed to get alerts' });
    }
  });

  /**
   * POST /api/v1/weather/alerts/:id/respond
   * Respond to a weather alert (Yes/No — is it raining?)
   */
  router.post('/alerts/:id/respond', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { id } = req.params;
      const { response } = req.body; // 'yes' or 'no'
      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
      if (!response || !['yes', 'no'].includes(response)) {
        return res.status(400).json({ success: false, message: 'response must be "yes" or "no"' });
      }

      const result = await pool.query(
        `UPDATE notifications SET responded_at = NOW(), response = $1
         WHERE id = $2 AND user_id = $3 AND responded_at IS NULL
         RETURNING id`,
        [JSON.stringify({ answer: response }), id, userId]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ success: false, message: 'Alert not found or already responded' });
      }

      return res.json({ success: true, message: 'Response recorded' });
    } catch (error) {
      console.error('Respond to alert error:', error);
      return res.status(500).json({ success: false, message: 'Failed to record response' });
    }
  });

  /**
   * PUT /api/v1/weather/preferences
   * Toggle weather alerts on/off
   */
  router.put('/preferences', authMiddleware, async (req: Request, res: Response) => {
    try {
      const userId = req.user?.userId;
      const { enabled } = req.body;
      if (!userId) return res.status(401).json({ success: false, message: 'Not authenticated' });
      if (typeof enabled !== 'boolean') return res.status(400).json({ success: false, message: 'enabled must be boolean' });

      await pool.query(
        'UPDATE users SET weather_alerts_enabled = $1, updated_at = NOW() WHERE id = $2',
        [enabled, userId]
      );
      return res.json({ success: true, message: `Weather alerts ${enabled ? 'enabled' : 'disabled'}` });
    } catch (error) {
      console.error('Update preferences error:', error);
      return res.status(500).json({ success: false, message: 'Failed to update preferences' });
    }
  });

  /**
   * GET /api/v1/weather/current
   * Get current weather for a location (public, no auth)
   */
  router.get('/current', async (req: Request, res: Response) => {
    try {
      const lat = parseFloat(req.query.lat as string) || 23.0225;
      const lng = parseFloat(req.query.lng as string) || 72.5714;

      const apiUrl = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
      const weatherRes = await fetch(
        `${apiUrl}?latitude=${lat}&longitude=${lng}&current=precipitation,rain,weather_code,temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=Asia/Kolkata`
      );
      const data = await weatherRes.json();

      const current = data.current || {};
      const isRaining = (current.precipitation > 0.1) || (current.rain > 0.1) ||
        [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99].includes(current.weather_code);

      return res.json({
        success: true,
        weather: {
          temperature: current.temperature_2m,
          humidity: current.relative_humidity_2m,
          windSpeed: current.wind_speed_10m,
          precipitation: current.precipitation,
          rain: current.rain,
          weatherCode: current.weather_code,
          isRaining,
          time: current.time,
        },
      });
    } catch (error) {
      console.error('Weather fetch error:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch weather' });
    }
  });

  return router;
}
