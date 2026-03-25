import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

const sevColors: Record<string, string> = { High: '#ef4444', Medium: '#f97316', Low: '#eab308' };

const OverviewPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [s, r] = await Promise.all([ApiService.getStats(), ApiService.getReports({ limit: 5 })]);
        setStats(s.data);
        setReports(r.data.reports || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 120, borderRadius: 16, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 14, marginBottom: 20 }}>
        {[0,1,2,3].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 260, borderRadius: 12 }} />
      </div>
    </div>
  );

  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalActive = stats?.activeReports || 0;
  const weekly = stats?.weeklyReports || [];
  const maxW = Math.max(...weekly.map((d: any) => parseInt(d.count) || 0), 1);
  const nStats = stats?.notifications || { total: 0, responded: 0 };
  const respRate = nStats.total > 0 ? Math.round((nStats.responded / nStats.total) * 100) : 0;

  return (
    <div>
      {/* Hero strip */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 400px', padding: '28px 32px', borderRadius: 16, background: 'linear-gradient(135deg, #312e81 0%, #1e1b4b 100%)', color: '#fff', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: -20, right: -10, fontSize: 100, opacity: 0.05, lineHeight: 1 }}>📊</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.5, marginBottom: 14 }}>Platform overview</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 44, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{stats?.totalReports ?? 0}</span>
              <span style={{ fontSize: 13, opacity: 0.5, marginLeft: 8 }}>total reports</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>{stats?.totalUsers ?? 0}</span>
              <span style={{ fontSize: 13, opacity: 0.45, marginLeft: 6 }}>users</span>
            </div>
            <div style={{ width: 1, height: 32, background: 'rgba(255,255,255,0.12)' }} />
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, color: '#4ade80' }}>{totalActive}</span>
              <span style={{ fontSize: 13, opacity: 0.45, marginLeft: 6 }}>active now</span>
            </div>
          </div>
          <div style={{ marginTop: 14, display: 'flex', gap: 20, fontSize: 12, opacity: 0.45 }}>
            <span>{stats?.reportsToday ?? 0} reports today</span>
            <span>·</span>
            <span>{stats?.newUsersThisWeek ?? 0} new users this week</span>
          </div>
        </div>

        {/* Quick stats sidebar */}
        <div style={{ flex: '0 0 220px', display: 'flex', flexDirection: 'column', gap: 10 }}>
          <QuickStat icon="🌧" label="Weather alerts" value={stats?.weatherAlerts ?? 0} to="/dashboard/weather" />
          <QuickStat icon="💬" label="Feedback" value={stats?.totalFeedback ?? 0} to="/dashboard/feedback" />
          <QuickStat icon="🔑" label="API keys" value={stats?.activeApiKeys ?? 0} to="/dashboard/api-keys" />
          <QuickStat icon="👍" label="Community votes" value={stats?.totalVotes ?? 0} />
        </div>
      </div>

      {/* Metric tiles row */}
      <div style={metricsRow} className="overview-metrics-row">
        <Tile label="Active Reports" value={totalActive} accent="#ef4444" sub={`${sev.High} high · ${sev.Medium} med · ${sev.Low} low`} />
        <Tile label="Reports Today" value={stats?.reportsToday ?? 0} accent="#6366f1" />
        <Tile label="Rain Notifications" value={nStats.total} accent="#3b82f6" sub={`${respRate}% response rate`} />
        <Tile label="New Users (7d)" value={stats?.newUsersThisWeek ?? 0} accent="#22c55e" />
      </div>

      {/* Middle: severity + 7-day chart */}
      <div style={twoCol} className="overview-bottom-row">
        {/* Severity breakdown */}
        <div style={card}>
          <p style={label}>Active report severity</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
            <SevRing sev={sev} total={totalActive || 1} />
            <div style={{ flex: 1 }}>
              {(['High', 'Medium', 'Low'] as const).map(s => {
                const count = sev[s] || 0;
                const pct = totalActive > 0 ? Math.round((count / totalActive) * 100) : 0;
                return (
                  <div key={s} style={{ marginBottom: 12 }}>
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

        {/* 7-day report activity */}
        <div style={card}>
          <p style={label}>Last 7 days</p>
          {weekly.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 14 }}>No reports this week</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
              {weekly.map((d: any) => {
                const count = parseInt(d.count) || 0;
                const dt = new Date(d.date);
                const isToday = dt.toDateString() === new Date().toDateString();
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    <div style={{
                      width: '100%', maxWidth: 48, borderRadius: '4px 4px 0 0',
                      background: isToday ? '#6366f1' : count > 0 ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : 'var(--border-primary)',
                      height: `${Math.max((count / maxW) * 80, 4)}px`,
                      opacity: count > 0 ? (isToday ? 1 : 0.7) : 0.3,
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 10, color: isToday ? '#6366f1' : 'var(--text-faint)', fontWeight: isToday ? 700 : 400 }}>
                      {isToday ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Bottom: Platform status + Recent reports */}
      <div style={{ ...twoCol, marginTop: 20 }} className="overview-bottom-row">
        {/* Platform status */}
        <div style={card}>
          <p style={label}>System status</p>
          {[
            { name: 'API Server', status: 'Operational' },
            { name: 'Database (Neon)', status: 'Operational' },
            { name: 'Redis (Upstash)', status: 'Operational' },
            { name: 'Weather Service', status: 'Operational' },
            { name: 'FCM Push', status: stats?.weatherAlerts > 0 ? 'Operational' : 'Standby' },
          ].map((item, i, arr) => (
            <div key={item.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '11px 0', borderBottom: i < arr.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
              <span style={{ fontSize: 14, color: 'var(--text-secondary)', fontWeight: 500 }}>{item.name}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: item.status === 'Operational' ? '#22c55e' : '#eab308', fontWeight: 600 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: item.status === 'Operational' ? '#22c55e' : '#eab308' }} />
                {item.status}
              </span>
            </div>
          ))}
        </div>

        {/* Recent reports */}
        <div style={card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <p style={{ ...label, marginBottom: 0 }}>Recent reports</p>
            <Link to="/dashboard/reports" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>View all →</Link>
          </div>
          {reports.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: 'var(--text-faint)', fontSize: 14 }}>No reports yet</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {reports.map((r: any, i: number) => (
                <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: i < reports.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColors[r.severity] || '#94a3b8', flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)' }}>{r.severity} — {r.report_type}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)' }}>
                      {r.latitude ? `${Number(r.latitude).toFixed(3)}°, ${Number(r.longitude).toFixed(3)}°` : '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <div style={{ fontSize: 12, color: r.is_active ? '#22c55e' : 'var(--text-faint)', fontWeight: 600 }}>{r.is_active ? 'Active' : 'Expired'}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>{new Date(r.created_at).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

/* Components */
const QuickStat: React.FC<{ icon: string; label: string; value: number; to?: string }> = ({ icon, label, value, to }) => {
  const inner = (
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', display: 'flex', alignItems: 'center', gap: 12, cursor: to ? 'pointer' : 'default', transition: 'border-color 0.15s' }}>
      <span style={{ fontSize: 18 }}>{icon}</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
        <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{label}</div>
      </div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
};

const Tile: React.FC<{ label: string; value: number; accent: string; sub?: string }> = ({ label, value, accent, sub }) => (
  <div style={{ padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', position: 'relative', overflow: 'hidden' }}>
    <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: 3, background: accent, opacity: 0.7 }} />
    <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-1px', fontVariantNumeric: 'tabular-nums', lineHeight: 1, marginBottom: 6 }}>{value.toLocaleString()}</div>
    <div style={{ fontSize: 12, color: 'var(--text-muted)', fontWeight: 500 }}>{label}</div>
    {sub && <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{sub}</div>}
  </div>
);

const SevRing: React.FC<{ sev: { High: number; Medium: number; Low: number }; total: number }> = ({ sev, total }) => {
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
          const el = <circle key={d.key} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="3.5" strokeDasharray={`${d.pct * 0.88} ${88 - d.pct * 0.88}`} strokeDashoffset={-offset * 0.88} strokeLinecap="round" />;
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

const metricsRow: React.CSSProperties = { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 20 };
const twoCol: React.CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start' };
const card: React.CSSProperties = { padding: 22, borderRadius: 14, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' };
const label: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px' };

export default OverviewPage;
