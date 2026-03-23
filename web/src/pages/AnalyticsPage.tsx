import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

const sevColors: Record<string, string> = { High: '#ef4444', Medium: '#f97316', Low: '#eab308' };

const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, reportsRes] = await Promise.all([
          ApiService.getStats(),
          ApiService.getReports({ limit: 100 }),
        ]);
        setStats(statsRes.data);
        setReports(reportsRes.data.reports || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 100, borderRadius: 12, marginBottom: 24 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }} className="analytics-inner-grid">
        <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
        <div className="skeleton" style={{ height: 280, borderRadius: 12 }} />
      </div>
    </div>
  );

  const total = stats?.totalReports || 0;
  const active = stats?.activeReports || 0;
  const users = stats?.totalUsers || 0;
  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalSev = sev.Low + sev.Medium + sev.High || 1;
  const expired = total - active;

  // Compute report type breakdown
  const typeMap: Record<string, number> = {};
  reports.forEach(r => { typeMap[r.report_type] = (typeMap[r.report_type] || 0) + 1; });
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  // Compute reports by day (last 7 days)
  const dayMap: Record<string, number> = {};
  const now = new Date();
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayMap[d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })] = 0;
  }
  reports.forEach(r => {
    const d = new Date(r.created_at);
    const key = d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
    if (key in dayMap) dayMap[key]++;
  });
  const dayEntries = Object.entries(dayMap);
  const maxDay = Math.max(...dayEntries.map(d => d[1]), 1);

  return (
    <div>
      {/* ── Key ratios strip ── */}
      <div style={ratioStrip}>
        <RatioItem label="Active rate" value={`${total > 0 ? Math.round((active / total) * 100) : 0}%`} desc={`${active} of ${total}`} />
        <span style={divider} />
        <RatioItem label="Avg per user" value={users > 0 ? (total / users).toFixed(1) : '0'} desc={`${total} reports / ${users} users`} />
        <span style={divider} />
        <RatioItem label="High severity" value={`${totalSev > 0 ? Math.round((sev.High / totalSev) * 100) : 0}%`} desc={`${sev.High} high of ${totalSev}`} />
        <span style={divider} />
        <RatioItem label="Expired" value={String(expired)} desc={`${total > 0 ? Math.round((expired / total) * 100) : 0}% of all reports`} />
      </div>

      {/* ── Two-column: Severity + Report types ── */}
      <div style={twoCol} className="analytics-inner-grid">
        {/* Severity breakdown */}
        <div style={card}>
          <p style={sectionLabel}>Severity distribution</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
            <SeverityRing sev={sev} total={totalSev} />
            <div style={{ flex: 1 }}>
              {(['High', 'Medium', 'Low'] as const).map(s => {
                const count = sev[s] || 0;
                const pct = Math.round((count / totalSev) * 100);
                return (
                  <div key={s} style={{ marginBottom: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <span style={{ width: 8, height: 8, borderRadius: '50%', background: sevColors[s] }} />
                        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{s}</span>
                      </span>
                      <span style={{ fontSize: 12, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={barTrack}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: sevColors[s], transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Report types */}
        <div style={card}>
          <p style={sectionLabel}>Report types</p>
          {typeEntries.length === 0 ? (
            <p style={{ color: 'var(--text-faint)', fontSize: 13 }}>No data yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {typeEntries.map(([type, count], i) => {
                const pct = Math.round((count / total) * 100);
                return (
                  <div key={type} style={{ padding: '12px 0', borderBottom: i < typeEntries.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type}</span>
                      <span style={{ fontSize: 13, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                    </div>
                    <div style={barTrack}>
                      <div style={{ width: `${pct}%`, height: '100%', borderRadius: 3, background: '#6366f1', opacity: 0.7, transition: 'width 0.6s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── 7-day activity ── */}
      <div style={{ marginTop: 24 }}>
        <p style={sectionLabel}>Last 7 days</p>
        <div style={card}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
            {dayEntries.map(([day, count]) => (
              <div key={day} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6 }}>
                <span style={{ fontSize: 11, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                <div style={{
                  width: '100%', maxWidth: 48, borderRadius: '4px 4px 0 0',
                  background: count > 0 ? 'linear-gradient(180deg, #6366f1, #8b5cf6)' : 'var(--border-primary)',
                  height: `${Math.max((count / maxDay) * 80, 4)}px`,
                  transition: 'height 0.4s ease',
                  opacity: count > 0 ? 0.85 : 0.4,
                }} />
                <span style={{ fontSize: 10, color: 'var(--text-faint)', whiteSpace: 'nowrap' }}>{day.split(',')[0]}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Components ── */
const RatioItem: React.FC<{ label: string; value: string; desc: string }> = ({ label, value, desc }) => (
  <div style={{ flex: 1, minWidth: 120 }}>
    <div style={{ fontSize: 24, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{value}</div>
    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 4 }}>{label}</div>
    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{desc}</div>
  </div>
);

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
          const el = <circle key={d.key} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="3.5" strokeDasharray={`${d.pct * 0.88} ${88 - d.pct * 0.88}`} strokeDashoffset={-offset * 0.88} strokeLinecap="round" />;
          offset += d.pct;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Total</span>
      </div>
    </div>
  );
};

/* ── Styles ── */
const ratioStrip: React.CSSProperties = {
  display: 'flex', alignItems: 'flex-start', gap: 0,
  marginBottom: 28, paddingBottom: 24,
  borderBottom: '1px solid var(--border-primary)', flexWrap: 'wrap',
};

const divider: React.CSSProperties = {
  width: 1, height: 48, background: 'var(--border-primary)', flexShrink: 0, margin: '0 8px',
};

const twoCol: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, alignItems: 'start',
};

const card: React.CSSProperties = {
  padding: 22, borderRadius: 12,
  border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)',
};

const sectionLabel: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--text-faint)',
  textTransform: 'uppercase', letterSpacing: '0.8px', margin: '0 0 16px',
};

const barTrack: React.CSSProperties = {
  height: 5, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden',
};

export default AnalyticsPage;
