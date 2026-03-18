import * as cron from 'node-cron';
import { Pool } from 'pg';
import { ReportService } from '../services/report.service';

/**
 * Report Expiry Background Job
 * Runs every 5 minutes to mark reports older than 4 hours as inactive
 * and clear expired areas from Redis cache
 * 
 * Requirements:
 * - 6.1: Mark reports older than 4 hours as inactive
 * - 6.2: Remove expired areas from map within 5 minutes
 */

let cronJob: cron.ScheduledTask | null = null;

/**
 * Start the report expiry background job
 * Runs every 5 minutes (cron pattern: every 5 minutes)
 */
export const startReportExpiryJob = (pool: Pool): void => {
  if (cronJob) {
    console.log('⚠ Report expiry job already running');
    return;
  }

  const reportService = new ReportService(pool);

  // Run every 5 minutes
  cronJob = cron.schedule('*/5 * * * *', async () => {
    try {
      console.log('[Report Expiry Job] Running at', new Date().toISOString());
      
      const result = await reportService.expireOldReports();
      
      if (result.expiredCount > 0) {
        console.log(
          `[Report Expiry Job] Expired ${result.expiredCount} reports, ` +
          `cleared ${result.clearedCacheKeys} cache keys`
        );
      } else {
        console.log('[Report Expiry Job] No reports to expire');
      }
    } catch (error) {
      console.error('[Report Expiry Job] Error:', error);
    }
  });

  console.log('✓ Report expiry job started (runs every 5 minutes)');
};

/**
 * Stop the report expiry background job
 */
export const stopReportExpiryJob = (): void => {
  if (cronJob) {
    cronJob.stop();
    cronJob = null;
    console.log('✓ Report expiry job stopped');
  }
};

/**
 * Check if the report expiry job is running
 */
export const isReportExpiryJobRunning = (): boolean => {
  return cronJob !== null;
};
