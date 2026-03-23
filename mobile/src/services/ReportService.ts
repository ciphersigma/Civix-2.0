import { api } from './api';
import AsyncStorage from '@react-native-async-storage/async-storage';

const REPORTS_KEY = '@local_reports';
const PENDING_KEY = '@pending_reports';
const DESC_KEY = '@report_descriptions';

interface Report {
  id?: string;
  latitude: number;
  longitude: number;
  severity: string;
  description?: string;
  report_type?: string;
  userId: string;
  created_at?: string;
  createdAt?: string;
  isLocal?: boolean;
}

export class ReportService {
  static async submitReport(report: Report): Promise<any> {
    const payload = {
      location: {
        latitude: report.latitude,
        longitude: report.longitude,
        accuracy: 10,
      },
      severity: report.severity,
      reportType: 'waterlogged',
    };
    try {
      const resp = await api.post('/reports', payload);
      const srv = resp && resp.data ? resp.data.report : null;
      try {
        if (srv && srv.id && report.description) {
          await ReportService.saveDesc(srv.id, report.description);
        }
      } catch (e) { /* ignore */ }
      return srv || { success: true };
    } catch (err: any) {
      if (err && err.offline) {
        const loc: Report = {
          ...report,
          id: 'local_' + Date.now(),
          created_at: new Date().toISOString(),
          isLocal: true,
        };
        await ReportService.storeLoc(loc);
        await ReportService.queuePend(loc);
        try {
          if (loc.id && report.description) {
            await ReportService.saveDesc(loc.id, report.description);
          }
        } catch (e) { /* ignore */ }
        return loc;
      }
      const m = (err && err.response && err.response.data && err.response.data.message)
        ? err.response.data.message
        : (err && err.message ? err.message : 'Failed to submit report');
      throw new Error(m);
    }
  }

  static async getAreaReports(lat: number, lng: number, radius: number = 5000): Promise<any[]> {
    try {
      const resp = await api.get('/reports/public');
      const serverReports: any[] = (resp && resp.data && resp.data.reports) ? resp.data.reports : [];
      const normalized = [];
      for (let i = 0; i < serverReports.length; i++) {
        const r = serverReports[i];
        const rlat = (r.location && r.location.latitude != null) ? r.location.latitude : r.latitude;
        const rlng = (r.location && r.location.longitude != null) ? r.location.longitude : r.longitude;
        if (rlat == null || rlng == null || isNaN(Number(rlat)) || isNaN(Number(rlng))) {
          continue;
        }
        normalized.push({
          id: r.id,
          latitude: rlat,
          longitude: rlng,
          severity: r.severity,
          report_type: r.reportType || r.report_type,
          created_at: r.createdAt || r.created_at,
        });
      }
      const now = Date.now();
      const active = normalized.filter(function(r) {
        if (!r.created_at) return true;
        return now - new Date(r.created_at).getTime() < 4 * 3600000;
      });
      const descs = await ReportService.getDescs();
      return active.map(function(r) {
        return { ...r, description: descs[r.id] || undefined };
      });
    } catch (err: any) {
      if (err && err.offline) {
        return await ReportService.getLocals();
      }
      console.error('getAreaReports error:', err);
      return [];
    }
  }

  private static async saveDesc(id: string, d: string): Promise<void> {
    try {
      const s = await AsyncStorage.getItem(DESC_KEY);
      const m: Record<string, string> = s ? JSON.parse(s) : {};
      m[id] = d;
      const k = Object.keys(m);
      if (k.length > 200) { delete m[k[0]]; }
      await AsyncStorage.setItem(DESC_KEY, JSON.stringify(m));
    } catch (e) { /* ignore */ }
  }

  private static async getDescs(): Promise<Record<string, string>> {
    try {
      const s = await AsyncStorage.getItem(DESC_KEY);
      return s ? JSON.parse(s) : {};
    } catch (e) { return {}; }
  }

  private static async storeLoc(report: Report): Promise<void> {
    try {
      const s = await AsyncStorage.getItem(REPORTS_KEY);
      const arr: Report[] = s ? JSON.parse(s) : [];
      arr.unshift(report);
      await AsyncStorage.setItem(REPORTS_KEY, JSON.stringify(arr.slice(0, 100)));
    } catch (e) { /* ignore */ }
  }

  private static async getLocals(): Promise<Report[]> {
    try {
      const s = await AsyncStorage.getItem(REPORTS_KEY);
      return s ? JSON.parse(s) : [];
    } catch (e) { return []; }
  }

  private static async queuePend(report: Report): Promise<void> {
    try {
      const s = await AsyncStorage.getItem(PENDING_KEY);
      const arr: Report[] = s ? JSON.parse(s) : [];
      arr.push(report);
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(arr));
    } catch (e) { /* ignore */ }
  }

  static async syncPendingReports(): Promise<{ synced: number; failed: number }> {
    try {
      const s = await AsyncStorage.getItem(PENDING_KEY);
      if (!s) { return { synced: 0, failed: 0 }; }
      const pend: Report[] = JSON.parse(s);
      if (!pend.length) { return { synced: 0, failed: 0 }; }
      let synced = 0;
      let failed = 0;
      const rem: Report[] = [];
      for (let i = 0; i < pend.length; i++) {
        try {
          await api.post('/reports', {
            location: { latitude: pend[i].latitude, longitude: pend[i].longitude, accuracy: 10 },
            severity: pend[i].severity,
            reportType: 'waterlogged',
          });
          synced++;
        } catch (e) { failed++; rem.push(pend[i]); }
      }
      await AsyncStorage.setItem(PENDING_KEY, JSON.stringify(rem));
      return { synced, failed };
    } catch (e) { return { synced: 0, failed: 0 }; }
  }

  static async getPendingCount(): Promise<number> {
    try {
      const s = await AsyncStorage.getItem(PENDING_KEY);
      if (!s) { return 0; }
      return JSON.parse(s).length;
    } catch (e) { return 0; }
  }
}

