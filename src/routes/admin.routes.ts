import { Router, Request, Response } from 'express';
import { Pool } from 'pg';

export function createAdminRouter(pool: Pool): Router {
  const router = Router();

  // GET /api/v1/admin/stats - Dashboard statistics
  router.get('/stats', async (_req: Request, res: Response) => {
    try {
      const [usersResult, reportsResult, activeReportsResult, severityResult, todayResult] = await Promise.all([
        pool.query('SELECT COUNT(*) as count FROM users'),
        pool.query('SELECT COUNT(*) as count FROM waterlogging_reports'),
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE is_active = true AND report_type = 'waterlogged'"),
        pool.query("SELECT severity, COUNT(*) as count FROM waterlogging_reports WHERE is_active = true GROUP BY severity"),
        pool.query("SELECT COUNT(*) as count FROM waterlogging_reports WHERE created_at >= CURRENT_DATE"),
      ]);

      const severityMap: Record<string, number> = { Low: 0, Medium: 0, High: 0 };
      severityResult.rows.forEach((r: any) => { severityMap[r.severity] = parseInt(r.count); });

      return res.json({
        totalUsers: parseInt(usersResult.rows[0].count),
        totalReports: parseInt(reportsResult.rows[0].count),
        activeReports: parseInt(activeReportsResult.rows[0].count),
        reportsToday: parseInt(todayResult.rows[0].count),
        severityBreakdown: severityMap,
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

      let query = `SELECT id, phone_number, phone_verified, language, daily_report_count, last_report_date, created_at, updated_at FROM users`;
      let countQuery = `SELECT COUNT(*) as count FROM users`;
      const params: any[] = [];
      const countParams: any[] = [];

      if (search) {
        query += ` WHERE phone_number ILIKE $1`;
        countQuery += ` WHERE phone_number ILIKE $1`;
        params.push(`%${search}%`);
        countParams.push(`%${search}%`);
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
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

      let query = `SELECT id, user_id, ST_Y(location::geometry) as latitude, ST_X(location::geometry) as longitude, severity, report_type, is_active, created_at, expires_at FROM waterlogging_reports`;
      let countQuery = `SELECT COUNT(*) as count FROM waterlogging_reports`;
      const conditions: string[] = [];
      const params: any[] = [];

      if (severity && ['Low', 'Medium', 'High'].includes(severity)) {
        conditions.push(`severity = $${params.length + 1}`);
        params.push(severity);
      }
      if (status === 'active') {
        conditions.push(`is_active = true`);
      } else if (status === 'expired') {
        conditions.push(`is_active = false`);
      }

      if (conditions.length > 0) {
        const where = ` WHERE ${conditions.join(' AND ')}`;
        query += where;
        countQuery += where;
      }

      query += ` ORDER BY created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`;
      const queryParams = [...params, limit, offset];

      const [reportsResult, totalResult] = await Promise.all([
        pool.query(query, queryParams),
        pool.query(countQuery, params),
      ]);

      return res.json({
        reports: reportsResult.rows,
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

  return router;
}
