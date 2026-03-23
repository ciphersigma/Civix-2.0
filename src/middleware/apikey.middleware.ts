import { Request, Response, NextFunction } from 'express';
import { Pool } from 'pg';
import crypto from 'crypto';

declare global {
  namespace Express {
    interface Request {
      apiKey?: { id: string; partnerName: string; permissions: string[] };
    }
  }
}

export function createApiKeyMiddleware(pool: Pool) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-api-key'] as string;
    const secret = req.headers['x-api-secret'] as string;

    if (!key || !secret) {
      return res.status(401).json({ error: 'Missing API key or secret' });
    }

    try {
      const result = await pool.query(
        `SELECT id, partner_name, secret_hash, permissions, rate_limit, request_count,
                expires_at, is_active
         FROM api_keys WHERE api_key = $1`,
        [key],
      );

      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid API key' });
      }

      const row = result.rows[0];

      if (!row.is_active) {
        return res.status(403).json({ error: 'API key is disabled' });
      }

      if (row.expires_at && new Date(row.expires_at) < new Date()) {
        return res.status(403).json({ error: 'API key has expired' });
      }

      // Verify secret
      const hash = crypto.createHash('sha256').update(secret).digest('hex');
      if (hash !== row.secret_hash) {
        return res.status(401).json({ error: 'Invalid API secret' });
      }

      // Simple hourly rate limit check
      const hourAgo = new Date(Date.now() - 3600000).toISOString();
      const countResult = await pool.query(
        `SELECT COUNT(*) as cnt FROM api_request_logs
         WHERE api_key_id = $1 AND created_at > $2`,
        [row.id, hourAgo],
      );
      if (parseInt(countResult.rows[0].cnt) >= row.rate_limit) {
        return res.status(429).json({ error: 'Rate limit exceeded', limit: row.rate_limit });
      }

      // Log request + update last_used
      const start = Date.now();
      res.on('finish', async () => {
        try {
          await pool.query(
            `INSERT INTO api_request_logs (api_key_id, endpoint, method, status_code, response_time_ms, ip_address)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            [row.id, req.path, req.method, res.statusCode, Date.now() - start, req.ip],
          );
          await pool.query(
            `UPDATE api_keys SET last_used_at = NOW(), request_count = request_count + 1 WHERE id = $1`,
            [row.id],
          );
        } catch (e) { /* non-critical */ }
      });

      req.apiKey = { id: row.id, partnerName: row.partner_name, permissions: row.permissions };
      next();
    } catch (err) {
      console.error('API key middleware error:', err);
      return res.status(500).json({ error: 'Authentication failed' });
    }
  };
}
