import { Router, Request, Response } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

export function createAdminRouter(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/admin/stats - Dashboard statistics
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const [
        usersResult, reportsResult, activeReportsResult, severityResult, todayResult,
        weatherAlerts, feedbackResult, apiKeysResult, votesResult, recentUsersResult,
        notifStats, weeklyReports, apiTotalReqs, apiRecentReqs, topPartners
      ] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM waterlogging_reports'),
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged' AND created_at > NOW() - INTERVAL '4 hours'"),
        pool.query("SELECT severity, COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND created_at > NOW() - INTERVAL '4 hours' GROUP BY severity"),
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE created_at >= CURRENT_DATE"),
        pool.query("SELECT COUNT(*) as count FROM weather_alerts").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COUNT(*) as count FROM feedback").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COUNT(*) as count FROM api_keys WHERE is_active = true").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COALESCE(SUM(upvotes + downvotes), 0) as total FROM waterlogging_reports").catch(() => ({ rows: [{ total: 0 }] })),
        pool.query("SELECT COUNT(*) as count FROM users WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COUNT(*) as total, COUNT(responded_at) as responded FROM notifications WHERE type = 'rain_detection'").catch(() => ({ rows: [{ total: 0, responded: 0 }] })),
        pool.query(`SELECT DATE(created_at) as date, COUNT(*) as count FROM waterlogging_reports WHERE created_at >= CURRENT_DATE - INTERVAL '7 days' GROUP BY DATE(created_at) ORDER BY date`).catch(() => ({ rows: [] })),
        pool.query("SELECT COUNT(*) as count FROM api_request_logs").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query("SELECT COUNT(*) as count FROM api_request_logs WHERE created_at >= NOW() - INTERVAL '24 hours'").catch(() => ({ rows: [{ count: 0 }] })),
        pool.query(`SELECT k.partner_name, k.request_count, k.last_used_at
           FROM api_keys k WHERE k.is_active = true ORDER BY k.request_count DESC LIMIT 5`).catch(() => ({ rows: [] })),
      ]);

      const severityMap: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
      severityResult.rows.forEach((r: any) => { severityMap[r.severity] = parseInt(r.count); });

      const nStats = notifStats.rows[0] || { total: 0, responded: 0 };

      return res.json({
        totalUsers: parseInt(usersResult.rows[0].count),
        totalReports: parseInt(reportsResult.rows[0].count),
        activeReports: parseInt(activeReportsResult.rows[0].count),
        reportsToday: parseInt(todayResult.rows[0].count),
        severityBreakdown: severityMap,
        weatherAlerts: parseInt(weatherAlerts.rows[0].count),
        totalFeedback: parseInt(feedbackResult.rows[0].count),
        activeApiKeys: parseInt(apiKeysResult.rows[0].count),
        totalVotes: parseInt(votesResult.rows[0].total),
        newUsersThisWeek: parseInt(recentUsersResult.rows[0].count),
        notifications: { total: parseInt(nStats.total), responded: parseInt(nStats.responded) },
        weeklyReports: weeklyReports.rows,
        apiStats: {
          totalRequests: parseInt(apiTotalReqs.rows[0].count),
          last24h: parseInt(apiRecentReqs.rows[0].count),
          topPartners: topPartners.rows,
        },
      });
    } catch (error) {
      console.error('Stats error:', error);
      return res.status(500).json({ message: 'Failed to fetch stats' });
    }
  });

  // GET /api/v1/admin/users - List all users
  router.get('/users', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const search = req.query.search as string;
      const offset = (page - 1) * limit;

      let query = `SELECT id, full_name, email, phone_number, phone_verified, language, daily_report_count, last_report_date, created_at, updated_at FROM users`;
      let countQuery = `SELECT COUNT(*) as count FROM users`;
      const params: any[] = [];
      const countParams: any[] = [];

      if (search) {
        query += ` WHERE (phone_number ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1)`;
        countQuery += ` WHERE (phone_number ILIKE $1 OR full_name ILIKE $1 OR email ILIKE $1)`;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;
      query += ` ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
      params.push(limit, offset);

      const [usersResult, totalResult] = await Promise.all([
        pool.query(query, params),
        pool.query(countQuery, countParams),
      ]);

      return res.json({
        users: usersResult.rows,
        total: parseInt(totalResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(totalResult.rows[0].count) / limit),
      });
    } catch (error) {
      console.error('Users list error:', error);
      return res.status(500).json({ message: 'Failed to fetch users' });
    }
  });

  // GET /api/v1/admin/reports - List all reports
  router.get('/reports', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const severity = req.query.severity as string;
      const status = req.query.status as string;
      const offset = (page - 1) * limit;

      let query = `SELECT id, user_id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, severity, report_type, is_active, created_at, expires_at, photo FROM waterlogging_reports`;
      let countQuery = `SELECT COUNT(*) as count FROM waterlogging_reports`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (severity && ['Low', 'Medium', 'High'].includes(severity)) {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(severity);
      }
      if (status === 'active') {
        conditions.push(`is_active = true AND created_at > NOW() - INTERVAL '4 hours'`);
      } else if (status === 'expired') {
        conditions.push(`(is_active = false OR created_at < NOW() - INTERVAL '4 hours')`);
      }

      if (conditions.length > 0) {
        const where = ` WHERE ${conditions.join(' AND ')}`;
        query += where;
        countQuery += where;
      }

      const limitIdx = params.length + 1;
      const offsetIdx = params.length + 2;
      query += ` ORDER BY created_at DESC LIMIT $${limitIdx} OFFSET $${offsetIdx}`;
      const queryParams = [...params, limit, offset];

      const [reportsResult, totalResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, params),
      ]);

      return res.json({
        reports: reportsResult.rows.map((r: any) => ({
          ...r,
          is_active: r.is_active && (Date.now() - new Date(r.created_at).getTime() < 4 * 3600000),
        })),
        total: parseInt(totalResult.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(totalResult.rows[0].count) / limit),
      });
    } catch (error) {
      console.error('Reports list error:', error);
      return res.status(500).json({ message: 'Failed to fetch reports' });
    }
  });

  // GET /api/v1/admin/reports/timeline - Reports over last 7 days
  router.get('/reports/timeline', async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(`
        SELECT DATE(created_at) as date, severity, COUNT(*) as count
        FROM waterlogging_reports
        WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        GROUP BY DATE(created_at), severity
        ORDER BY date
      `);
      return res.json({ timeline: result.rows });
    } catch (error) {
      console.error('Timeline error:', error);
      return res.status(500).json({ message: 'Failed to fetch timeline' });
    }
  });

  // PUT /api/v1/admin/users/:id - Update a user
  router.put('/users/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { full_name, email, phone_number, phone_verified, language } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (full_name !== undefined) { fields.push(`full_name = $${idx++}`); values.push(full_name); }
      if (email !== undefined) { fields.push(`email = $${idx++}`); values.push(email); }
      if (phone_number !== undefined) { fields.push(`phone_number = $${idx++}`); values.push(phone_number); }
      if (phone_verified !== undefined) { fields.push(`phone_verified = $${idx++}`); values.push(phone_verified); }
      if (language !== undefined) { fields.push(`language = $${idx++}`); values.push(language); }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      fields.push(`updated_at = NOW()`);
      values.push(id);

      const result = await pool.query(
        `UPDATE users SET ${fields.join(', ')} WHERE id = $${idx} RETURNING id, full_name, email, phone_number, phone_verified, language`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ user: result.rows[0], message: 'User updated' });
    } catch (error) {
      console.error('Update user error:', error);
      return res.status(500).json({ message: 'Failed to update user' });
    }
  });

  // DELETE /api/v1/admin/users/:id - Delete a user
  router.delete('/users/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await pool.query('DELETE FROM waterlogging_reports WHERE user_id = $1', [id]);
      const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'User not found' });
      }

      return res.json({ message: 'User deleted' });
    } catch (error) {
      console.error('Delete user error:', error);
      return res.status(500).json({ message: 'Failed to delete user' });
    }
  });

  // ==================== WEATHER DASHBOARD ====================

  // GET /api/v1/admin/weather/stats - Weather alert statistics
  router.get('/weather/stats', async (_req: Request, res: Response) => {
    try {
      const [alertsTotal, alertsToday, usersWithFcm, usersWithAlerts, recentAlerts, responseStats, alertsByDay] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM weather_alerts'),
        pool.query("SELECT COUNT(*) as count FROM weather_alerts WHERE created_at >= CURRENT_DATE"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE fcm_token IS NOT NULL"),
        pool.query("SELECT COUNT(*) as count FROM users WHERE weather_alerts_enabled = TRUE AND fcm_token IS NOT NULL"),
        pool.query(
          `SELECT id, latitude, longitude, precipitation_mm, weather_code, description, users_notified, created_at
           FROM weather_alerts ORDER BY created_at DESC LIMIT 20`
        ),
        pool.query(
          `SELECT
             COUNT(*) as total,
             COUNT(responded_at) as responded,
             COUNT(CASE WHEN response::text LIKE '%yes%' THEN 1 END) as confirmed_rain,
             COUNT(CASE WHEN response::text LIKE '%no%' THEN 1 END) as denied_rain
           FROM notifications WHERE type = 'rain_detection'`
        ),
        pool.query(
          `SELECT DATE(created_at) as date, COUNT(*) as count, SUM(users_notified) as notified
           FROM weather_alerts
           WHERE created_at >= CURRENT_DATE - INTERVAL '30 days'
           GROUP BY DATE(created_at) ORDER BY date`
        ),
      ]);

      const resp = responseStats.rows[0];
      const totalNotifs = parseInt(resp.total) || 0;
      const responded = parseInt(resp.responded) || 0;

      return res.json({
        totalAlerts: parseInt(alertsTotal.rows[0].count),
        alertsToday: parseInt(alertsToday.rows[0].count),
        usersWithFcm: parseInt(usersWithFcm.rows[0].count),
        usersWithAlertsEnabled: parseInt(usersWithAlerts.rows[0].count),
        notifications: {
          total: totalNotifs,
          responded,
          responseRate: totalNotifs > 0 ? Math.round((responded / totalNotifs) * 100) : 0,
          confirmedRain: parseInt(resp.confirmed_rain) || 0,
          deniedRain: parseInt(resp.denied_rain) || 0,
        },
        recentAlerts: recentAlerts.rows,
        alertsByDay: alertsByDay.rows,
      });
    } catch (error) {
      console.error('Weather stats error:', error);
      return res.status(500).json({ message: 'Failed to fetch weather stats' });
    }
  });

  // GET /api/v1/admin/weather/notifications - Recent notification delivery log
  router.get('/weather/notifications', async (req: Request, res: Response) => {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 30;
      const offset = (page - 1) * limit;

      const [notifs, total] = await Promise.all([
        pool.query(
          `SELECT n.id, n.user_id, u.email, u.full_name, n.title, n.body, n.sent_at, n.responded_at, n.response
           FROM notifications n
           LEFT JOIN users u ON n.user_id = u.id
           WHERE n.type = 'rain_detection'
           ORDER BY n.sent_at DESC
           LIMIT $1 OFFSET $2`,
          [limit, offset]
        ),
        pool.query("SELECT COUNT(*) as count FROM notifications WHERE type = 'rain_detection'"),
      ]);

      return res.json({
        notifications: notifs.rows,
        total: parseInt(total.rows[0].count),
        page,
        limit,
        totalPages: Math.ceil(parseInt(total.rows[0].count) / limit),
      });
    } catch (error) {
      console.error('Weather notifications error:', error);
      return res.status(500).json({ message: 'Failed to fetch notifications' });
    }
  });

  // POST /api/v1/admin/weather/trigger - Manually trigger weather check
  router.post('/weather/trigger', async (_req: Request, res: Response) => {
    try {
      const apiUrl = process.env.WEATHER_API_URL || 'https://api.open-meteo.com/v1/forecast';
      const weatherRes = await fetch(
        `${apiUrl}?latitude=23.0225&longitude=72.5714&current=precipitation,rain,weather_code,temperature_2m&timezone=Asia/Kolkata`
      );
      const data = await weatherRes.json();
      const current = data.current || {};
      const precip = Math.max(current.precipitation || 0, current.rain || 0);
      const rainCodes = [51,53,55,56,57,61,63,65,66,67,80,81,82,95,96,99];
      const isRaining = precip > 0.1 || rainCodes.includes(current.weather_code);

      return res.json({
        success: true,
        weather: {
          temperature: current.temperature_2m,
          precipitation: current.precipitation,
          rain: current.rain,
          weatherCode: current.weather_code,
          isRaining,
          time: current.time,
        },
        message: isRaining ? 'Rain detected! Notifications would be sent.' : 'No rain currently detected.',
      });
    } catch (error) {
      console.error('Weather trigger error:', error);
      return res.status(500).json({ message: 'Failed to check weather' });
    }
  });

  // ==================== API KEY MANAGEMENT ====================

  // GET /api/v1/admin/api-keys - List all API keys
  router.get('/api-keys', async (_req: Request, res: Response) => {
    try {
      const result = await pool.query(
        `SELECT id, partner_name, api_key, permissions, rate_limit, is_active,
                last_used_at, request_count, webhook_url, created_at, expires_at
         FROM api_keys ORDER BY created_at DESC`,
      );
      return res.json({ keys: result.rows });
    } catch (error) {
      console.error('List API keys error:', error);
      return res.status(500).json({ message: 'Failed to fetch API keys' });
    }
  });

  // POST /api/v1/admin/api-keys - Create a new API key
  router.post('/api-keys', async (req: Request, res: Response) => {
    try {
      const { partnerName, permissions, rateLimit, webhookUrl, expiresAt } = req.body;
      if (!partnerName) {
        return res.status(400).json({ message: 'Partner name is required' });
      }

      const apiKey = 'civix_' + crypto.randomBytes(24).toString('hex');
      const apiSecret = crypto.randomBytes(32).toString('hex');
      const secretHash = crypto.createHash('sha256').update(apiSecret).digest('hex');

      const perms = permissions || ['read:reports'];
      const limit = rateLimit || 1000;

      const result = await pool.query(
        `INSERT INTO api_keys (partner_name, api_key, secret_hash, permissions, rate_limit, webhook_url, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING id, partner_name, api_key, permissions, rate_limit, is_active, webhook_url, created_at, expires_at`,
        [partnerName, apiKey, secretHash, perms, limit, webhookUrl || null, expiresAt || null],
      );

      // Return the secret only once — it can't be retrieved later
      return res.status(201).json({
        key: result.rows[0],
        secret: apiSecret,
        message: 'API key created. Save the secret — it cannot be retrieved again.',
      });
    } catch (error) {
      console.error('Create API key error:', error);
      return res.status(500).json({ message: 'Failed to create API key' });
    }
  });

  // PUT /api/v1/admin/api-keys/:id - Update an API key
  router.put('/api-keys/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const { partnerName, permissions, rateLimit, isActive, webhookUrl, expiresAt } = req.body;

      const fields: string[] = [];
      const values: any[] = [];
      let idx = 1;

      if (partnerName !== undefined) { fields.push(`partner_name = $${idx++}`); values.push(partnerName); }
      if (permissions !== undefined) { fields.push(`permissions = $${idx++}`); values.push(permissions); }
      if (rateLimit !== undefined) { fields.push(`rate_limit = $${idx++}`); values.push(rateLimit); }
      if (isActive !== undefined) { fields.push(`is_active = $${idx++}`); values.push(isActive); }
      if (webhookUrl !== undefined) { fields.push(`webhook_url = $${idx++}`); values.push(webhookUrl); }
      if (expiresAt !== undefined) { fields.push(`expires_at = $${idx++}`); values.push(expiresAt); }

      if (fields.length === 0) {
        return res.status(400).json({ message: 'No fields to update' });
      }

      fields.push('updated_at = NOW()');
      values.push(id);

      const result = await pool.query(
        `UPDATE api_keys SET ${fields.join(', ')} WHERE id = $${idx}
         RETURNING id, partner_name, api_key, permissions, rate_limit, is_active, webhook_url, created_at, expires_at`,
        values,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'API key not found' });
      }

      return res.json({ key: result.rows[0], message: 'API key updated' });
    } catch (error) {
      console.error('Update API key error:', error);
      return res.status(500).json({ message: 'Failed to update API key' });
    }
  });

  // DELETE /api/v1/admin/api-keys/:id - Delete an API key
  router.delete('/api-keys/:id', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const result = await pool.query('DELETE FROM api_keys WHERE id = $1 RETURNING id', [id]);
      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'API key not found' });
      }
      return res.json({ message: 'API key deleted' });
    } catch (error) {
      console.error('Delete API key error:', error);
      return res.status(500).json({ message: 'Failed to delete API key' });
    }
  });

  // GET /api/v1/admin/api-keys/:id/usage - Get usage stats for an API key
  router.get('/api-keys/:id/usage', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const [total, hourly, endpoints] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM api_request_logs WHERE api_key_id = $1', [id]),
        pool.query(
          `SELECT date_trunc('hour', created_at) as hour, COUNT(*) as count
           FROM api_request_logs WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '24 hours'
           GROUP BY hour ORDER BY hour`,
          [id],
        ),
        pool.query(
          `SELECT endpoint, method, COUNT(*) as count, AVG(response_time_ms)::int as avg_time
           FROM api_request_logs WHERE api_key_id = $1 AND created_at > NOW() - INTERVAL '7 days'
           GROUP BY endpoint, method ORDER BY count DESC LIMIT 10`,
          [id],
        ),
      ]);

      return res.json({
        totalRequests: parseInt(total.rows[0].count),
        hourlyUsage: hourly.rows,
        topEndpoints: endpoints.rows,
      });
    } catch (error) {
      console.error('API key usage error:', error);
      return res.status(500).json({ message: 'Failed to fetch usage data' });
    }
  });

  // POST /api/v1/admin/api-keys/:id/regenerate - Regenerate secret
  router.post('/api-keys/:id/regenerate', async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const newSecret = crypto.randomBytes(32).toString('hex');
      const secretHash = crypto.createHash('sha256').update(newSecret).digest('hex');

      const result = await pool.query(
        `UPDATE api_keys SET secret_hash = $1, updated_at = NOW() WHERE id = $2
         RETURNING id, partner_name, api_key`,
        [secretHash, id],
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ message: 'API key not found' });
      }

      return res.json({
        key: result.rows[0],
        secret: newSecret,
        message: 'Secret regenerated. Save it — it cannot be retrieved again.',
      });
    } catch (error) {
      console.error('Regenerate secret error:', error);
      return res.status(500).json({ message: 'Failed to regenerate secret' });
    }
  });

  return router;
}
