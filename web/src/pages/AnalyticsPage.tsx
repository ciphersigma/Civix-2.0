import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try { const res = await ApiService.getStats(); setStats(res.data); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 8 }}>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 14 }} />)}
      </div>
    </div>
  );

  const total = stats?.totalReports || 0;
  const active = stats?.activeReports || 0;
  const today = stats?.reportsToday || 0;
  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalSev = sev.Low + sev.Medium + sev.High || 1;

  return (
    <div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Report Summary */}
        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Report Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
            {[
              { label: 'Total Reports', value: total, color: '#6366f1' },
              { label: 'Active Reports', value: active, color: '#ef4444' },
              { label: 'Reports Today', value: today, color: '#22c55e' },
              { label: 'Total Users', value: stats?.totalUsers || 0, color: '#a855f7' },
            ].map((m, i) => (
              <div key={i} style={themed.metricCard}>
                <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>{m.value.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />{m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Severity Distribution */}
        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Severity Distribution</h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <div style={{ position: 'relative', width: 110, height: 110 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  const data = [
                    { key: 'High', color: '#ef4444', pct: (sev.High / totalSev) * 100 },
                    { key: 'Medium', color: '#f97316', pct: (sev.Medium / totalSev) * 100 },
                    { key: 'Low', color: '#eab308', pct: (sev.Low / totalSev) * 100 },
                  ];
                  let offset = 0;
                  return data.map(d => {
                    const el = <circle key={d.key} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="3.5" strokeDasharray={`${d.pct * 0.88} ${88 - d.pct * 0.88}`} strokeDashoffset={-offset * 0.88} strokeLinecap="round" opacity="0.85" />;
                    offset += d.pct;
                    return el;
                  });
                })()}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text-primary)', lineHeight: 1 }}>{totalSev}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)', marginTop: 2 }}>Total</div>
              </div>
            </div>
          </div>
          {(['High','Medium','Low'] as const).map(s => {
            const count = sev[s] || 0;
            const pct = Math.round((count / totalSev) * 100);
            const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
            return (
              <div key={s} style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ width: 7, height: 7, borderRadius: '50%', background: colors[s], display: 'inline-block' }} />{s}
                  </span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 12, fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                </div>
                <div style={themed.barTrack}>
                  <div style={{ width: `${pct}%`, background: colors[s], height: '100%', borderRadius: 6, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            );
          })}
        </div>

        {/* Platform Health */}
        <div style={{ ...themed.card, gridColumn: '1 / -1' }}>
          <h3 style={themed.cardTitle}>Platform Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
            {[
              { label: 'Database', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg> },
              { label: 'Redis Cache', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> },
              { label: 'API Server', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg> },
              { label: 'Weather API', icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 10h-1.26A8 8 0 109 20h9a5 5 0 000-10z"/></svg> },
            ].map(item => (
              <div key={item.label} style={themed.metricCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>{item.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
                    <div style={{ fontSize: 11, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />Online
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;
