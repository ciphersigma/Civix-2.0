import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

interface Stats {
  totalUsers: number;
  totalReports: number;
  activeReports: number;
  reportsToday: number;
  severityBreakdown: { Low: number; Medium: number; High: number };
}

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          ApiService.getStats(),
          ApiService.getReports({ limit: 5 }),
        ]);
        setStats(statsRes.data);
        setRecentReports(reportsRes.data.reports || []);
      } catch (err) {
        console.error('Failed to fetch dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <div style={styles.loading}>Loading dashboard...</div>;

  return (
    <div>
      <div style={styles.grid}>
        <StatCard label="Total Users" value={stats?.totalUsers ?? 0} icon="👥" color="#3b82f6" />
        <StatCard label="Active Reports" value={stats?.activeReports ?? 0} icon="🚨" color="#ef4444" />
        <StatCard label="Reports Today" value={stats?.reportsToday ?? 0} icon="📝" color="#22c55e" />
        <StatCard label="Total Reports" value={stats?.totalReports ?? 0} icon="📊" color="#a855f7" />
      </div>

      <div style={styles.row}>
        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Severity Breakdown</h3>
          <div style={styles.severityBars}>
            {(['Low', 'Medium', 'High'] as const).map((sev) => {
              const count = stats?.severityBreakdown?.[sev] ?? 0;
              const total = (stats?.activeReports ?? 1) || 1;
              const pct = Math.round((count / total) * 100);
              const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
              return (
                <div key={sev} style={{ marginBottom: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 14 }}>
                    <span style={{ fontWeight: 600, color: '#e4e4e7' }}>{sev}</span>
                    <span style={{ color: '#71717a' }}>{count} ({pct}%)</span>
                  </div>
                  <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 12, overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, background: colors[sev], height: '100%', borderRadius: 8, transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={styles.card}>
          <h3 style={styles.cardTitle}>Recent Reports</h3>
          {recentReports.length === 0 ? (
            <p style={{ color: '#71717a', textAlign: 'center', padding: 24 }}>No reports yet</p>
          ) : (
            <table style={styles.table}>
              <thead>
                <tr>
                  <th style={styles.th}>Severity</th>
                  <th style={styles.th}>Type</th>
                  <th style={styles.th}>Status</th>
                  <th style={styles.th}>Time</th>
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r: any) => (
                  <tr key={r.id}>
                    <td style={styles.td}><SeverityBadge severity={r.severity} /></td>
                    <td style={styles.td}>{r.report_type}</td>
                    <td style={styles.td}>{r.is_active ? <span style={{ color: '#22c55e' }}>Active</span> : <span style={{ color: '#52525b' }}>Expired</span>}</td>
                    <td style={styles.td}>{new Date(r.created_at).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};

const StatCard: React.FC<{ label: string; value: number; icon: string; color: string }> = ({ label, value, icon, color }) => (
  <div style={{ ...styles.statCard, borderLeft: `3px solid ${color}` }}>
    <div style={{ fontSize: 28, opacity: 0.9 }}>{icon}</div>
    <div>
      <div style={{ fontSize: 28, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.5px' }}>{value}</div>
      <div style={{ fontSize: 13, color: '#71717a', marginTop: 2 }}>{label}</div>
    </div>
  </div>
);

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
  return (
    <span style={{ background: `${colors[severity] || '#52525b'}22`, color: colors[severity] || '#a1a1aa', padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${colors[severity] || '#52525b'}33` }}>
      {severity}
    </span>
  );
};

const styles: Record<string, React.CSSProperties> = {
  loading: { display: 'flex', justifyContent: 'center', alignItems: 'center', height: 300, color: '#71717a', fontSize: 16 },
  grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 },
  statCard: { background: 'rgba(24,24,32,0.8)', borderRadius: 14, padding: '24px 20px', display: 'flex', alignItems: 'center', gap: 16, border: '1px solid rgba(255,255,255,0.06)' },
  row: { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 },
  card: { background: 'rgba(24,24,32,0.8)', borderRadius: 14, padding: 24, border: '1px solid rgba(255,255,255,0.06)' },
  cardTitle: { margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.3px' },
  severityBars: { padding: '8px 0' },
  table: { width: '100%', borderCollapse: 'collapse' as const },
  th: { textAlign: 'left' as const, padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase' as const, letterSpacing: '0.5px' },
  td: { padding: '10px 12px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14, color: '#d4d4d8' },
};

export default OverviewPage;
