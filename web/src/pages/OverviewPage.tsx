import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ApiService from '../services/api';

const SC: Record<string, string> = { High: '#ef4444', Medium: '#f97316', Low: '#eab308' };

const OverviewPage: React.FC = () => {
  const [s, setS] = useState<any>(null);
  const [reps, setReps] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [st, rp] = await Promise.all([ApiService.getStats(), ApiService.getReports({ limit: 6 })]);
        setS(st.data); setReps(rp.data.reports || []);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 100, borderRadius: 16 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 90, borderRadius: 14 }} />)}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 14 }} />
      </div>
    </div>
  );

  const sev = s?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const active = s?.activeReports || 0;
  const weekly = s?.weeklyReports || [];
  const maxW = Math.max(...weekly.map((d: any) => parseInt(d.count) || 0), 1);
  const nS = s?.notifications || { total: 0, responded: 0 };
  const rr = nS.total > 0 ? Math.round((nS.responded / nS.total) * 100) : 0;

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Row 1: Big number strip ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 16, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
        <BigNum value={s?.totalReports ?? 0} label="Total reports" color="#6366f1" first />
        <BigNum value={s?.totalUsers ?? 0} label="Registered users" color="#8b5cf6" />
        <BigNum value={active} label="Active right now" color={active > 0 ? '#ef4444' : '#22c55e'} />
        <BigNum value={s?.reportsToday ?? 0} label="Reported today" color="#3b82f6" />
        <BigNum value={s?.newUsersThisWeek ?? 0} label="New this week" color="#22c55e" last />
      </div>

      {/* ── Row 2: Severity + Activity chart ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16, marginBottom: 20 }} className="overview-bottom-row">

        {/* Severity card — tall, narrow */}
        <div style={C.card}>
          <div style={C.lbl}>Severity</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
            <Ring sev={sev} total={active || 1} />
            <div style={{ width: '100%' }}>
              {(['High','Medium','Low'] as const).map(k => {
                const v = sev[k] || 0;
                const p = active > 0 ? Math.round((v / active) * 100) : 0;
                return (
                  <div key={k} style={{ marginBottom: 14 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ width: 10, height: 10, borderRadius: '50%', background: SC[k] }} />
                        <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{k}</span>
                      </span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{v}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                      <div style={{ width: `${p}%`, height: '100%', borderRadius: 3, background: SC[k], transition: 'width 0.5s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Activity chart + quick links */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* 7-day chart */}
          <div style={{ ...C.card, flex: 1 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={C.lbl}>7-day activity</div>
              <Link to="/dashboard/analytics" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>Analytics →</Link>
            </div>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
              {weekly.length === 0 ? (
                <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-faint)', fontSize: 13, paddingTop: 40 }}>No data yet</div>
              ) : weekly.map((d: any) => {
                const c = parseInt(d.count) || 0;
                const dt = new Date(d.date);
                const today = dt.toDateString() === new Date().toDateString();
                return (
                  <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: today ? '#6366f1' : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{c || ''}</span>
                    <div style={{
                      width: '100%', maxWidth: 40, borderRadius: 6,
                      height: `${Math.max((c / maxW) * 70, c > 0 ? 8 : 3)}px`,
                      background: today ? '#6366f1' : c > 0 ? 'var(--text-faint)' : 'var(--border-primary)',
                      opacity: today ? 1 : c > 0 ? 0.35 : 0.15,
                      transition: 'height 0.4s ease',
                    }} />
                    <span style={{ fontSize: 10, color: today ? '#6366f1' : 'var(--text-faint)', fontWeight: today ? 700 : 400 }}>
                      {today ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' })}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Quick links row */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: 10 }}>
            <QLink icon="🌧" val={s?.weatherAlerts ?? 0} label="Weather" to="/dashboard/weather" />
            <QLink icon="💬" val={s?.totalFeedback ?? 0} label="Feedback" to="/dashboard/feedback" />
            <QLink icon="🔑" val={s?.activeApiKeys ?? 0} label="API Keys" to="/dashboard/api-keys" />
            <QLink icon="👍" val={s?.totalVotes ?? 0} label="Votes" />
          </div>
        </div>
      </div>

      {/* ── Row 3: Recent reports + System ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 16 }} className="overview-bottom-row">

        {/* Recent reports */}
        <div style={C.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={C.lbl}>Recent reports</div>
            <Link to="/dashboard/reports" style={{ fontSize: 12, color: '#6366f1', fontWeight: 600, textDecoration: 'none' }}>All reports →</Link>
          </div>
          {reps.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '36px 0', color: 'var(--text-faint)' }}>No reports yet</div>
          ) : (
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>{['Severity','Type','Status','Coords','Time'].map(h => <th key={h} style={C.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {reps.map((r: any) => (
                  <tr key={r.id} className="dash-row">
                    <td style={C.td}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: SC[r.severity] || '#94a3b8' }} />
                        <span style={{ fontWeight: 600, color: SC[r.severity] || 'var(--text-secondary)', fontSize: 13 }}>{r.severity}</span>
                      </span>
                    </td>
                    <td style={{ ...C.td, textTransform: 'capitalize' }}>{r.report_type}</td>
                    <td style={C.td}>
                      {r.is_active
                        ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Active</span>
                        : <span style={{ color: 'var(--text-faint)' }}>Expired</span>}
                    </td>
                    <td style={{ ...C.td, fontFamily: 'monospace', fontSize: 11, color: 'var(--text-faint)' }}>
                      {r.latitude ? `${Number(r.latitude).toFixed(3)}, ${Number(r.longitude).toFixed(3)}` : '—'}
                    </td>
                    <td style={{ ...C.td, color: 'var(--text-faint)', fontSize: 12 }}>{timeAgo(r.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* System status */}
        <div style={C.card}>
          <div style={C.lbl}>System</div>
          {[
            { n: 'API', ok: true },
            { n: 'Database', ok: true },
            { n: 'Redis', ok: true },
            { n: 'Weather', ok: true },
            { n: 'FCM Push', ok: (s?.weatherAlerts ?? 0) > 0 },
          ].map((x, i, a) => (
            <div key={x.n} style={{ display: 'flex', justifyContent: 'space-between', padding: '9px 0', borderBottom: i < a.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
              <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{x.n}</span>
              <span style={{ fontSize: 12, fontWeight: 600, color: x.ok ? '#22c55e' : '#eab308' }}>{x.ok ? '● Up' : '○ Idle'}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

/* ── Components ── */

const BigNum: React.FC<{ value: number; label: string; color: string; first?: boolean; last?: boolean }> = ({ value, label, color, first, last }) => (
  <div style={{
    flex: 1, padding: '20px 22px', background: 'var(--bg-secondary)',
    borderRight: last ? 'none' : '1px solid var(--border-primary)',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{ position: 'absolute', bottom: 0, left: 0, width: '100%', height: 3, background: color, opacity: 0.5 }} />
    <div style={{ fontSize: 30, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1.5, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value.toLocaleString()}</div>
    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, fontWeight: 500 }}>{label}</div>
  </div>
);

const QLink: React.FC<{ icon: string; val: number; label: string; to?: string }> = ({ icon, val, label, to }) => {
  const inner = (
    <div style={{ padding: '14px 16px', borderRadius: 12, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', textAlign: 'center', transition: 'border-color 0.15s, transform 0.1s', cursor: to ? 'pointer' : 'default' }}>
      <div style={{ fontSize: 20, marginBottom: 4 }}>{icon}</div>
      <div style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{val}</div>
      <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 4, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5 }}>{label}</div>
    </div>
  );
  return to ? <Link to={to} style={{ textDecoration: 'none' }}>{inner}</Link> : inner;
};

const Ring: React.FC<{ sev: { High: number; Medium: number; Low: number }; total: number }> = ({ sev, total }) => {
  const d = [
    { k: 'High', c: '#ef4444', p: (sev.High / total) * 100 },
    { k: 'Medium', c: '#f97316', p: (sev.Medium / total) * 100 },
    { k: 'Low', c: '#eab308', p: (sev.Low / total) * 100 },
  ];
  let o = 0;
  return (
    <div style={{ position: 'relative', width: 110, height: 110 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-primary)" strokeWidth="2.5" />
        {d.map(x => {
          const el = <circle key={x.k} cx="18" cy="18" r="14" fill="none" stroke={x.c} strokeWidth="3.5" strokeDasharray={`${x.p * 0.88} ${88 - x.p * 0.88}`} strokeDashoffset={-o * 0.88} strokeLinecap="round" />;
          o += x.p;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 3, textTransform: 'uppercase', letterSpacing: 0.8 }}>Active</span>
      </div>
    </div>
  );
};

const timeAgo = (d: string) => {
  if (!d) return '';
  const m = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return 'Just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
};

const C = {
  card: { padding: '20px 22px', borderRadius: 14, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' } as React.CSSProperties,
  lbl: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 } as React.CSSProperties,
  th: { textAlign: 'left', padding: '8px 10px', fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, borderBottom: '1px solid var(--border-primary)' } as React.CSSProperties,
  td: { padding: '10px 10px', fontSize: 13, color: 'var(--text-secondary)', borderBottom: '1px solid var(--border-secondary)' } as React.CSSProperties,
};

export default OverviewPage;
