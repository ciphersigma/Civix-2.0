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
      <h2 style={themed.title}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginTop: 20 }}>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 220, borderRadius: 16 }} />)}
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
      <h2 style={{ ...themed.title, marginBottom: 20 }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Report Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            {[
              { label: 'Total Reports', value: total, color: '#3b82f6' },
              { label: 'Active Reports', value: active, color: '#ef4444' },
              { label: 'Reports Today', value: today, color: '#22c55e' },
              { label: 'Total Users', value: stats?.totalUsers || 0, color: '#a855f7' },
            ].map((m, i) => (
              <div key={i} style={themed.metricCard}>
                <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '-0.5px', fontVariantNumeric: 'tabular-nums' }}>{m.value.toLocaleString()}</div>
                <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: m.color, display: 'inline-block' }} />{m.label}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={themed.card}>
          <h3 style={themed.cardTitle}>Severity Distribution</h3>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <div style={{ position: 'relative', width: 120, height: 120 }}>
              <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                {(() => {
                  const data = [
                    { key: 'High', color: '#ef4444', pct: (sev.High / totalSev) * 100 },
                    { key: 'Medium', color: '#f97316', pct: (sev.Medium / totalSev) * 100 },
                    { key: 'Low', color: '#eab308', pct: (sev.Low / totalSev) * 100 },
                  ];
                  let offset = 0;
                  return data.map(d => {
                    const el = <circle key={d.key} cx="18" cy="18" r="14" fill="none" stroke={d.color} strokeWidth="4" strokeDasharray={`${d.pct * 0.88} ${88 - d.pct * 0.88}`} strokeDashoffset={-offset * 0.88} strokeLinecap="round" opacity="0.9" />;
                    offset += d.pct;
                    return el;
                  });
                })()}
              </svg>
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text-primary)' }}>{totalSev}</div>
                <div style={{ fontSize: 10, color: 'var(--text-faint)' }}>Total</div>
              </div>
            </div>
          </div>
          {(['High','Medium','Low'] as const).map(s => {
            const count = sev[s] || 0;
            const pct = Math.round((count / totalSev) * 100);
            const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
            return (
              <div key={s} style={{ marginBottom: 14 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: colors[s], display: 'inline-block' }} />{s}
                  </span>
                  <span style={{ color: 'var(--text-faint)', fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>{count} ({pct}%)</span>
                </div>
                <div style={themed.barTrack}>
                  <div style={{ width: `${pct}%`, background: colors[s], height: '100%', borderRadius: 6, transition: 'width 0.8s cubic-bezier(0.4,0,0.2,1)' }} />
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ ...themed.card, gridColumn: '1 / -1' }}>
          <h3 style={themed.cardTitle}>Platform Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            {[
              { label: 'Database', icon: '🗄️' },
              { label: 'Redis Cache', icon: '⚡' },
              { label: 'API Server', icon: '🌐' },
              { label: 'Weather Service', icon: '🌦️' },
            ].map(item => (
              <div key={item.label} style={themed.metricCard}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <span style={{ fontSize: 20 }}>{item.icon}</span>
                  <div style={{ textAlign: 'left' }}>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: '#22c55e', display: 'flex', alignItems: 'center', gap: 4, marginTop: 2 }}>
                      <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block', boxShadow: '0 0 6px rgba(34,197,94,0.4)' }} />Online
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
