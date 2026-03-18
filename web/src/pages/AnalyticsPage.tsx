import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await ApiService.getStats();
        setStats(res.data);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchData();
  }, []);

  if (loading) return <p style={{ textAlign: 'center', color: '#71717a', padding: 60 }}>Loading analytics...</p>;

  const total = stats?.totalReports || 0;
  const active = stats?.activeReports || 0;
  const today = stats?.reportsToday || 0;
  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalSev = sev.Low + sev.Medium + sev.High || 1;

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f4f4f5' }}>Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div style={card}>
          <h3 style={cardTitle}>Report Summary</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
            <Metric label="Total Reports" value={total} />
            <Metric label="Active Reports" value={active} />
            <Metric label="Reports Today" value={today} />
            <Metric label="Total Users" value={stats?.totalUsers || 0} />
          </div>
        </div>
        <div style={card}>
          <h3 style={cardTitle}>Severity Distribution</h3>
          {(['Low','Medium','High'] as const).map(s => {
            const count = sev[s] || 0;
            const pct = Math.round((count / totalSev) * 100);
            const colors = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
            return (
              <div key={s} style={{ marginBottom: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontWeight: 600, fontSize: 14, color: '#e4e4e7' }}>{s}</span>
                  <span style={{ color: '#71717a', fontSize: 14 }}>{count} reports ({pct}%)</span>
                </div>
                <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 8, height: 20, overflow: 'hidden' }}>
                  <div style={{ width: `${pct}%`, background: colors[s], height: '100%', borderRadius: 8, transition: 'width 0.5s', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 11, fontWeight: 700 }}>
                    {pct > 10 ? `${pct}%` : ''}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ ...card, gridColumn: '1 / -1' }}>
          <h3 style={cardTitle}>Platform Health</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12 }}>
            <HealthItem label="Database" status="online" />
            <HealthItem label="Redis Cache" status="online" />
            <HealthItem label="API Server" status="online" />
            <HealthItem label="Weather Service" status="online" />
          </div>
        </div>
      </div>
    </div>
  );
};

const Metric: React.FC<{label: string; value: number}> = ({label, value}) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 20, textAlign: 'center', border: '1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ fontSize: 32, fontWeight: 700, color: '#f4f4f5', letterSpacing: '-0.5px' }}>{value}</div>
    <div style={{ fontSize: 13, color: '#71717a', marginTop: 4 }}>{label}</div>
  </div>
);

const HealthItem: React.FC<{label: string; status: string}> = ({label, status}) => (
  <div style={{ background: 'rgba(255,255,255,0.03)', borderRadius: 12, padding: 16, display: 'flex', alignItems: 'center', gap: 10, border: '1px solid rgba(255,255,255,0.04)' }}>
    <div style={{ width: 10, height: 10, borderRadius: '50%', background: status === 'online' ? '#22c55e' : '#ef4444', boxShadow: status === 'online' ? '0 0 8px rgba(34,197,94,0.4)' : '0 0 8px rgba(239,68,68,0.4)' }} />
    <div>
      <div style={{ fontSize: 14, fontWeight: 600, color: '#e4e4e7' }}>{label}</div>
      <div style={{ fontSize: 12, color: '#71717a', textTransform: 'capitalize' }}>{status}</div>
    </div>
  </div>
);

const card: React.CSSProperties = { background: 'rgba(24,24,32,0.8)', borderRadius: 14, padding: 24, border: '1px solid rgba(255,255,255,0.06)' };
const cardTitle: React.CSSProperties = { margin: '0 0 20px', fontSize: 15, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.3px' };

export default AnalyticsPage;
