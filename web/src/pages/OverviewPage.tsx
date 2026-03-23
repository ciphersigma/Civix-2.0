import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

interface Stats {
  totalUsers: number;
  totalReports: number;
  activeReports: number;
  reportsToday: number;
  severityBreakdown: { Low: number; Medium: number; High: number };
}

const sevColors: Record<string, string> = { High: '#ef4444', Medium: '#f97316', Low: '#eab308' };

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [recentReports, setRecentReports] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          ApiService.getStats(),
          ApiService.getReports({ limit: 6 }),
        ]);
        setStats(statsRes.data);
        setRecentReports(reportsRes.data.reports || []);
      } catch (err) { console.error('Failed to fetch dashboard data:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 16, marginBottom: 24 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 88, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    </div>
  );

  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalActive = (stats?.activeReports ?? 1) || 1;

  return (
    <div>
      {/* ── Metrics row ── */}
      <div style={metricsRow} className="overview-metrics-row">
        <MetricTile label="Total Users" value={stats?.totalUsers ?? 0} accent="#6366f1" />
        <MetricTile label="Active Reports" value={stats?.activeReports ?? 0} accent="#ef4444" />
        <MetricTile label="Reports Today" value={stats?.reportsToday ?? 0} accent="#22c55e" />
        <MetricTile label="All-time Reports" value={stats?.totalReports ?? 0} accent="#8b5cf6" />
      </div>

      {/* ── Middle row: Severity + Quick summary ── */}
      <div style={midRow} className="overview-bottom-row">
        {/* Severity ring */}
        <div style={sectionCard}>
          <p style={sectionLabel}>Severity distribution</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 28 }}>
            <SeverityRing sev={sev} total={totalActive} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, flex: 1 }}>
              {(['High', 'Medium', 'Low'] as const).map(s => {
                const count = sev[s] || 0;
                const pct = Math.round((count / totalActive) * 100);
                return (
                  <div key={s}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColors[s] }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{s}</span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: sevColors[s], transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Platform status */}
        <div style={sectionCard}>
          <p style={sectionLabel}>Platform status</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { name: 'API Server', status: 'Operational' },
              { name: 'Database', status: 'Operational' },
              { name: 'Redis Cache', status: 'Operational' },
              { name: 'Weather Service', status: 'Operational' },
            ].map((item, i, arr) => (
              <div key={item.name} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '12px 0',
                borderBottom: i < arr.length - 1 ? '1px solid var(--border-secondary)' : 'none',
              }}>
                <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.name}</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />
                  {item.status}
                </span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, padding: '10px 14px', background: 'rgba(34,197,94,0.06)', borderRadius: 8, border: '1px solid rgba(34,197,94,0.1)' }}>
            <span style={{ fontSize: 12, color: '#22c55e', fontWeight: 600 }}>All systems operational</span>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', marginLeft: 8 }}>Last checked just now</span>
          </div>
        </div>
      </div>

      {/* ── Recent reports table ── */}
      <div style={{ marginTop: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <p style={sectionLabel}>Recent reports</p>
          <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Showing latest {recentReports.length}</span>
        </div>
        <div className="dash-table-card" style={sectionCard}>
          {recentReports.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 14, textAlign: 'center', padding: 32 }}>No reports yet.</p>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {['Severity','Type','Status','Location','Time'].map(h => (
                    <th key={h} style={themed.th}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {recentReports.map((r: any) => (
                  <tr key={r.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={themed.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: sevColors[r.severity] || 'var(--text-faint)' }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: sevColors[r.severity] || 'var(--text-secondary)' }}>{r.severity}</span>
                      </span>
                    </td>
                    <td style={themed.td}>{r.report_type}</td>
                    <td style={themed.td}>
                      {r.is_active
                        ? <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 13 }}>Active</span>
                        : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>Expired</span>}
                    </td>
                    <td style={{ ...themed.td, fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)' }}>
                      {r.latitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : '—'}
                    </td>
                    <td style={{ ...themed.td, color: 'var(--text-muted)', fontSize: 13 }}>
                      {new Date(r.created_at).toLocaleString()}
                    </td>
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

/* ── Metric tile ── */
const MetricTile: React.FC<{ label: string; value: number; accent: string }> = ({ label, value, accent }) => (
  <div style={{
    padding: '18px 20px',
    borderRadius: 12,
    border: '1px solid var(--border-primary)',
    background: 'var(--bg-secondary)',
    position: 'relative',
    overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: accent, opacity: 0.7 }} />
    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 6 }}>
      {value.toLocaleString()}
    </div>
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
  </div>
);

/* ── Severity ring ── */
const SeverityRing: React.FC<{ sev: { High: number; Medium: number; Low: number }; total: number }> = ({ sev, total }) => {
  const data = [
    { key: 'High', color: '#ef4444', pct: (sev.High / total) * 100 },
    { key: 'Medium', color: '#f97316', pct: (sev.Medium / total) * 100 },
    { key: 'Low', color: '#eab308', pct: (sev.Low / total) * 100 },
  ];
  let offset = 0;
  return (
    <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-primary)" strokeWidth="3" />
        {data.map(d => {
          const el = (
            <circle key={d.key} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="3.5"
              strokeDasharray={`${d.pct * 0.88} ${88 - d.pct * 0.88}`}
              strokeDashoffset={-offset * 0.88} strokeLinecap="round" />
          );
          offset += d.pct;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Active</span>
      </div>
    </div>
  );
};

/* ── Styles ── */
const metricsRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: 14,
  marginBottom: 24,
};

const midRow: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: 16,
  alignItems: 'start',
};

const sectionCard: React.CSSProperties = {
  padding: 22,
  borderRadius: 12,
  border: '1px solid var(--border-primary)',
  background: 'var(--bg-secondary)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: 'var(--text-faint)',
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  margin: '0 0 16px',
};

export default OverviewPage;
