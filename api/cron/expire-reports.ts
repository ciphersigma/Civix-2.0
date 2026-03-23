import type { VercelRequest, VercelResponse } from '@vercel/node';
import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

/**
 * Vercel Cron Job: Expire old reports
 * Runs every 5 minutes via vercel.json cron config
 * Marks reports older than 4 hours as inactive
 */
export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET (Vercel cron uses GET) or POST
  if (req.method !== 'GET' && req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify cron secret to prevent unauthorized calls
  const authHeader = req.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}` && process.env.CRON_SECRET) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 2,
    idleTimeoutMillis: 10000,
    connectionTimeoutMillis: 10000,
  });

  try {
    const result = await pool.query(
      `UPDATE waterlogging_reports
       SET is_active = false, updated_at = NOW()
       WHERE is_active = true
         AND created_at < NOW() - INTERVAL '4 hours'
       RETURNING id`
    );

    const expiredCount = result.rows.length;
    console.log(`[Cron] Expired ${expiredCount} reports`);

    return res.status(200).json({
      success: true,
      expiredCount,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Cron] Expire reports error:', error);
    return res.status(500).json({ error: 'Failed to expire reports' });
  } finally {
    await pool.end();
  }
}
