import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_STORAGE_KEY = '@local_reports';
const PENDING_REPORTS_KEY = '@pending_reports';

interface Report {
  id?: string;
  latitude: number;
  longitude: number;
  severity: string;
  description?: string;
  userId: string;
  createdAt?: string;
  isLocal?: boolean;
}

export class ReportService {
  /**
   * Submit a waterlogging report
   * Stores locally if server is unavailable and syncs later
   */
  static async submitReport(report: Report): Promise<any> {
    try {
      // Transform to backend expected format
      const payload = {
        location: {
          latitude: report.latitude,
          longitude: report.longitude,
          accuracy: 10, // default accuracy
        },
        severity: report.severity,
        reportType: 'waterlogged',
      };
      const response = await api.post('/reports', payload);
      
      // Also store locally for offline viewing
      await this.storeLocalReport({ ...report, ...response.data });
      
      return response.data;
    } catch (error: any) {
      // If offline, store report locally and queue for sync
      if (error.offline) {
        console.log('Server unavailable - storing report locally');
        
        const localReport: Report = {
          ...report,
          id: `local_${Date.now()}`,
          createdAt: new Date().toISOString(),
          isLocal: true,
        };
        
        // Store in local reports
        await this.storeLocalReport(localReport);
        
        // Queue for sync when online
        await this.queuePendingReport(localReport);
        
        return localReport;
      }
      throw error;
    }
  }

  /**
   * Get reports for an area
   * Falls back to local reports if server is unavailable
   */
  static async getAreaReports(lat: number, lng: number, radius = 5000): Promise<Report[]> {
    try {
      // Try to fetch from server
      const response = await api.get(`/reports/area?lat=${lat}&lng=${lng}&radius=${radius}`);
      
      // API returns { areaStatus: { reports: [...] } } — extract the reports array
      const areaStatus = response.data?.areaStatus;
      const serverReports = areaStatus?.reports || [];
      
      // Merge with local reports
      const localReports = await this.getLocalReports();
      
      // Combine and deduplicate
      const allReports = [...serverReports, ...localReports];
      const uniqueReports = this.deduplicateReports(allReports);
      
      return uniqueReports;
    } catch (error: any) {
      // If offline, return only local reports
      if (error.offline) {
        console.log('Server unavailable - using local reports only');
        return await this.getLocalReports();
      }
      throw error;
    }
  }

  /**
   * Store report locally
   */
  private static async storeLocalReport(report: Report): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      const reports: Report[] = stored ? JSON.parse(stored) : [];
      
      // Add new report
      reports.unshift(report);
      
      // Keep only last 100 reports
      const trimmedReports = reports.slice(0, 100);
      
      await AsyncStorage.setItem(REPORTS_STORAGE_KEY, JSON.stringify(trimmedReports));
    } catch (error) {
      console.error('Failed to store local report:', error);
    }
  }

  /**
   * Get locally stored reports
   */
  private static async getLocalReports(): Promise<Report[]> {
    try {
      const stored = await AsyncStorage.getItem(REPORTS_STORAGE_KEY);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to get local reports:', error);
      return [];
    }
  }

  /**
   * Queue report for sync when online
   */
  private static async queuePendingReport(report: Report): Promise<void> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
      const pending: Report[] = stored ? JSON.parse(stored) : [];
      
      pending.push(report);
      
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(pending));
    } catch (error) {
      console.error('Failed to queue pending report:', error);
    }
  }

  /**
   * Sync pending reports when online
   */
  static async syncPendingReports(): Promise<{ synced: number; failed: number }> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
      if (!stored) return { synced: 0, failed: 0 };
      
      const pending: Report[] = JSON.parse(stored);
      if (pending.length === 0) return { synced: 0, failed: 0 };
      
      let synced = 0;
      let failed = 0;
      const remaining: Report[] = [];
      
      for (const report of pending) {
        try {
          const payload = {
            location: {
              latitude: report.latitude,
              longitude: report.longitude,
              accuracy: 10,
            },
            severity: report.severity,
            reportType: 'waterlogged',
          };
          await api.post('/reports', payload);
          synced++;
        } catch (error) {
          failed++;
          remaining.push(report);
        }
      }
      
      // Update pending queue
      await AsyncStorage.setItem(PENDING_REPORTS_KEY, JSON.stringify(remaining));
      
      return { synced, failed };
    } catch (error) {
      console.error('Failed to sync pending reports:', error);
      return { synced: 0, failed: 0 };
    }
  }

  /**
   * Get count of pending reports
   */
  static async getPendingCount(): Promise<number> {
    try {
      const stored = await AsyncStorage.getItem(PENDING_REPORTS_KEY);
      if (!stored) return 0;
      
      const pending: Report[] = JSON.parse(stored);
      return pending.length;
    } catch (error) {
      return 0;
    }
  }

  /**
   * Deduplicate reports by ID
   */
  private static deduplicateReports(reports: Report[]): Report[] {
    const seen = new Set<string>();
    return reports.filter(report => {
      if (!report.id) return true;
      if (seen.has(report.id)) return false;
      seen.add(report.id);
      return true;
    });
  }
}