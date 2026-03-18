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
      } catch (err) { console.error('Failed to fetch dashboard data:', err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div>
      <div style={grid}>{[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 100, borderRadius: 16 }} />)}</div>
      <div style={{ ...row, marginTop: 24 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 16 }} />
      </div>
    </div>
  );

  return (
    <div>
      <div style={grid}>
        {[
          { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: '👥', color: '#3b82f6', bg: 'rgba(59,130,246,0.08)' },
          { label: 'Active Reports', value: stats?.activeReports ?? 0, icon: '🚨', color: '#ef4444', bg: 'rgba(239,68,68,0.08)' },
          { label: 'Reports Today', value: stats?.reportsToday ?? 0, icon: '📝', color: '#22c55e', bg: 'rgba(34,197,94,0.08)' },
          { label: 'Total Reports', value: stats?.totalReports ?? 0, icon: '📊', color: '#a855f7', bg: 'rgba(168,85,247,0.08)' },
        ].map((card, i) => (
          <div key={i} style={themed.statCard}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{card.value.toLocaleString()}</div>
              <div style={{ fontSize: 13, color: 'var(--text-muted)', marginTop: 2 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={row}>
        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Severity Breakdown</h3>
          {(['Low', 'Medium', 'High'] as const).map((sev) => {
            const count = stats?.severityBreakdown?.[sev] ?? 0;
            const total = (stats?.activeReports ?? 1) || 1;
            const pct = Math.round((count / total) * 100);
            const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
            return (
              <div key={sev} style={{ marginBottom: 18 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 14 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[sev], display: 'inline-block' }} />{sev}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                </div>
                <div style={themed.barTrack}>
                  <div style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${colors[sev]}, ${colors[sev]}cc)`, height: '100%', borderRadius: 6, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Recent Reports</h3>
          {recentReports.length === 0 ? (
            <div style={themed.empty}><div style={{ fontSize: 32, marginBottom: 8, opacity: 0.5 }}>📋</div><p>No reports yet</p></div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>
                {['Severity','Type','Status','Time'].map(h => <th key={h} style={themed.th}>{h}</th>)}
              </tr></thead>
              <tbody>
                {recentReports.map((r: any) => (
                  <tr key={r.id} style={{ transition: 'background 0.15s' }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                    <td style={themed.td}><SeverityBadge severity={r.severity} /></td>
                    <td style={themed.td}>{r.report_type}</td>
                    <td style={themed.td}><StatusDot active={r.is_active} /></td>
                    <td style={{ ...themed.td, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</td>
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

const SeverityBadge: React.FC<{ severity: string }> = ({ severity }) => {
  const colors: Record<string, string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
  const c = colors[severity] || '#52525b';
  return <span style={{ background: `${c}15`, color: c, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${c}25`, whiteSpace: 'nowrap' }}>{severity}</span>;
};

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => active
  ? <span style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Active</span>
  : <span style={{ color: 'var(--text-faint)' }}>Expired</span>;

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 24 };
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16 };

export default OverviewPage;
