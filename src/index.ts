import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Pool } from 'pg';
import { initRedis, closeRedis } from './config/redis';
import { createAuthRouter } from './routes/auth.routes';
import { createReportRouter } from './routes/report.routes';
import { createAdminRouter } from './routes/admin.routes';
import { createFeedbackRouter } from './routes/feedback.routes';
import { createWeatherRouter } from './routes/weather.routes';
import { createPartnerRouter } from './routes/partner.routes';
import { startReportExpiryJob, stopReportExpiryJob } from './jobs/report-expiry.job';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

// Initialize database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000, // Increased from 2000 to 10000
});

// Enable CORS for web dashboard
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  credentials: true
}));

app.use(express.json());

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API info endpoint
app.get('/api', (_req, res) => {
  res.json({
    name: 'Waterlogging Alert Platform API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      auth: {
        register: 'POST /api/v1/auth/register',
        verify: 'POST /api/v1/auth/verify'
      },
      reports: {
        create: 'POST /api/v1/reports'
      }
    }
  });
});

// Mount authentication routes
app.use('/api/v1/auth', createAuthRouter(pool));

// Mount report routes
app.use('/api/v1/reports', createReportRouter(pool));

// Mount admin routes
app.use('/api/v1/admin', createAdminRouter(pool));
app.use('/api/v1/feedback', createFeedbackRouter(pool));
app.use('/api/v1/weather', createWeatherRouter(pool));
app.use('/api/v1/partner', createPartnerRouter(pool));

// Initialize server and Redis
const startServer = async () => {
  try {
    // Try to initialize Redis (optional)
    try {
      await initRedis();
      console.log('✓ Redis connected');
    } catch (error) {
      console.warn('⚠ Redis not available - running without cache');
    }

    // Try to test database connection (optional)
    try {
      await pool.query('SELECT NOW()');
      console.log('✓ Database connected');
    } catch (error) {
      console.warn('⚠ Database not available - some features will not work');
      console.error('Database error details:', error instanceof Error ? error.message : error);
    }

    // Start Express server
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running on http://localhost:${PORT}`);
      console.log(`📖 API Documentation: http://localhost:${PORT}/`);
      console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
    });

    // Start background jobs
    startReportExpiryJob(pool);
  } catch (error) {
    console.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Graceful shutdown
const shutdown = async () => {
  console.log('Shutting down gracefully...');
  try {
    stopReportExpiryJob();
    await closeRedis();
    await pool.end();
    process.exit(0);
  } catch (error) {
    console.error('Error during shutdown:', error);
    process.exit(1);
  }
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start the server
startServer();

export default app;
