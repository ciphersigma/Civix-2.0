import { Pool, QueryResult } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Execute a database query
 * Convenience wrapper around pool.query
 */
export const query = async (text: string, params?: any[]): Promise<QueryResult> => {
  return pool.query(text, params);
};

export { pool };