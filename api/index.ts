import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { initRedis } from '../src/config/redis';
import { createAuthRouter } from '../src/routes/auth.routes';
import { createReportRouter } from '../src/routes/report.routes';
import { createAdminRouter } from '../src/routes/admin.routes';
import { createFeedbackRouter } from '../src/routes/feedback.routes';
import { createPartnerRouter } from '../src/routes/partner.routes';
import { createWeatherRouter } from '../src/routes/weather.routes';

dotenv.config();

const app = express();

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
});

// CORS — allow web dashboard and any Vercel preview URLs
app.use(cors({
  origin: [
    'http://localhost:3001',
    'http://localhost:3000',
    process.env.WEB_URL || '',
    /\.vercel\.app$/,
  ].filter(Boolean),
  credentials: true,
}));

app.use(express.json({ limit: '5mb' }));

// Initialize Redis lazily on first request
let redisInitialized = false;
app.use(async (_req, _res, next) => {
  if (!redisInitialized) {
    try {
      await initRedis();
      redisInitialized = true;
    } catch (e) {
      console.warn('Redis init failed:', e);
    }
  }
  next();
});

// Health check
app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/', (_req, res) => {
  res.json({
    name: 'Waterlogging Alert Platform API',
    version: '1.0.1-beta',
    status: 'running',
  });
});

// Mount routes
app.use('/api/v1/auth', createAuthRouter(pool));
app.use('/api/v1/reports', createReportRouter(pool));
app.use('/api/v1/admin', createAdminRouter(pool));
app.use('/api/v1/feedback', createFeedbackRouter(pool));
app.use('/api/v1/partner', createPartnerRouter(pool));
app.use('/api/v1/weather', createWeatherRouter(pool));

export default app;
