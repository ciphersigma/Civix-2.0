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
      <div style={grid}>{[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 96, borderRadius: 14 }} />)}</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 16, marginTop: 20 }}>
        <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 240, borderRadius: 14 }} />
      </div>
    </div>
  );

  const statCards = [
    { label: 'Total Users', value: stats?.totalUsers ?? 0, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, bg: 'rgba(99,102,241,0.08)' },
    { label: 'Active Reports', value: stats?.activeReports ?? 0, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>, bg: 'rgba(239,68,68,0.08)' },
    { label: 'Reports Today', value: stats?.reportsToday ?? 0, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>, bg: 'rgba(34,197,94,0.08)' },
    { label: 'Total Reports', value: stats?.totalReports ?? 0, icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#a855f7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, bg: 'rgba(168,85,247,0.08)' },
  ];

  return (
    <div>
      <div style={grid}>
        {statCards.map((card, i) => (
          <div key={i} style={themed.statCard}>
            <div style={{ width: 40, height: 40, borderRadius: 10, background: card.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>{card.icon}</div>
            <div>
              <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{card.value.toLocaleString()}</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{card.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div style={row}>
        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Severity Breakdown</h3>
          {(['High', 'Medium', 'Low'] as const).map((sev) => {
            const count = stats?.severityBreakdown?.[sev] ?? 0;
            const total = (stats?.activeReports ?? 1) || 1;
            const pct = Math.round((count / total) * 100);
            const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
            return (
              <div key={sev} style={{ marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[sev], display: 'inline-block' }} />{sev}
                  </span>
                  <span style={{ color: 'var(--text-muted)', fontVariantNumeric: 'tabular-nums', fontSize: 12 }}>{count} ({pct}%)</span>
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
            <div style={themed.empty}><p>No reports yet</p></div>
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
                    <td style={{ ...themed.td, color: 'var(--text-muted)', fontSize: 13 }}>{new Date(r.created_at).toLocaleString()}</td>
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
  const c = colors[severity] || 'var(--text-faint)';
  return <span style={{ background: `${c}15`, color: c, padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${c}25`, whiteSpace: 'nowrap' }}>{severity}</span>;
};

const StatusDot: React.FC<{ active: boolean }> = ({ active }) => active
  ? <span style={{ color: '#22c55e', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6, fontSize: 13 }}><span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Active</span>
  : <span style={{ color: 'var(--text-faint)', fontSize: 13 }}>Expired</span>;

const grid: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 14, marginBottom: 20 };
const row: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 14 };

export default OverviewPage;
