import { Pool } from 'pg';
import { startReportExpiryJob, stopReportExpiryJob, isReportExpiryJobRunning } from './report-expiry.job';
import cron from 'node-cron';

let capturedCallback: (() => Promise<void>) | null = null;

// Mock node-cron
jest.mock('node-cron', () => ({
  schedule: jest.fn((pattern: string, callback: () => Promise<void>) => {
    capturedCallback = callback;
    return {
      stop: jest.fn(),
      start: jest.fn(),
    };
  }),
}));

const mockExpireOldReports = jest.fn();

// Mock ReportService
jest.mock('../services/report.service', () => ({
  ReportService: jest.fn().mockImplementation(() => ({
    expireOldReports: mockExpireOldReports,
  })),
}));

describe('Report Expiry Job', () => {
  let mockPool: Pool;

  beforeEach(() => {
    mockPool = {} as Pool;
    capturedCallback = null;
    mockExpireOldReports.mockReset();
    mockExpireOldReports.mockResolvedValue({ expiredCount: 5, clearedCacheKeys: 3 });
    stopReportExpiryJob(); // Ensure clean state
  });

  afterEach(() => {
    stopReportExpiryJob();
  });

  describe('startReportExpiryJob', () => {
    it('should start the cron job', () => {
      startReportExpiryJob(mockPool);
      expect(isReportExpiryJobRunning()).toBe(true);
    });

    it('should not start multiple jobs', () => {
      startReportExpiryJob(mockPool);
      const consoleSpy = jest.spyOn(console, 'log');
      
      startReportExpiryJob(mockPool);
      
      expect(consoleSpy).toHaveBeenCalledWith('⚠ Report expiry job already running');
      consoleSpy.mockRestore();
    });

    it('should schedule with 5-minute cron pattern', () => {
      startReportExpiryJob(mockPool);
      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });
  });

  describe('stopReportExpiryJob', () => {
    it('should stop the cron job', () => {
      startReportExpiryJob(mockPool);
      expect(isReportExpiryJobRunning()).toBe(true);
      
      stopReportExpiryJob();
      
      expect(isReportExpiryJobRunning()).toBe(false);
    });

    it('should handle stopping when no job is running', () => {
      expect(() => stopReportExpiryJob()).not.toThrow();
    });
  });

  describe('isReportExpiryJobRunning', () => {
    it('should return false when job is not running', () => {
      expect(isReportExpiryJobRunning()).toBe(false);
    });

    it('should return true when job is running', () => {
      startReportExpiryJob(mockPool);
      expect(isReportExpiryJobRunning()).toBe(true);
    });
  });

  describe('cron callback execution', () => {
    it('should call expireOldReports when cron fires', async () => {
      startReportExpiryJob(mockPool);
      expect(capturedCallback).not.toBeNull();

      await capturedCallback!();

      expect(mockExpireOldReports).toHaveBeenCalledTimes(1);
    });

    it('should log expired count when reports are expired', async () => {
      mockExpireOldReports.mockResolvedValue({ expiredCount: 3, clearedCacheKeys: 2 });
      const consoleSpy = jest.spyOn(console, 'log');

      startReportExpiryJob(mockPool);
      await capturedCallback!();

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Expired 3 reports')
      );
      consoleSpy.mockRestore();
    });

    it('should log "No reports to expire" when count is zero', async () => {
      mockExpireOldReports.mockResolvedValue({ expiredCount: 0, clearedCacheKeys: 0 });
      const consoleSpy = jest.spyOn(console, 'log');

      startReportExpiryJob(mockPool);
      await capturedCallback!();

      expect(consoleSpy).toHaveBeenCalledWith('[Report Expiry Job] No reports to expire');
      consoleSpy.mockRestore();
    });

    it('should handle errors in expireOldReports gracefully', async () => {
      mockExpireOldReports.mockRejectedValue(new Error('DB connection lost'));
      const consoleSpy = jest.spyOn(console, 'error');

      startReportExpiryJob(mockPool);
      await capturedCallback!();

      expect(consoleSpy).toHaveBeenCalledWith(
        '[Report Expiry Job] Error:',
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });
});
