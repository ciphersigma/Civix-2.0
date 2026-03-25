import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

const WeatherDashboardPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [nPage, setNPage] = useState(1);
  const [nPages, setNPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [live, setLive] = useState<any>(null);

  useEffect(() => { load(); }, []);
  useEffect(() => { loadNotifs(); }, [nPage]);

  const load = async () => {
    setLoading(true);
    try { setStats((await ApiService.getWeatherStats()).data); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const loadNotifs = async () => {
    try {
      const r = (await ApiService.getWeatherNotifications({ page: nPage, limit: 12 })).data;
      setNotifications(r.notifications || []);
      setNPages(r.totalPages || 1);
    } catch (e) { console.error(e); }
  };

  const checkNow = async () => {
    setChecking(true); setLive(null);
    try { setLive((await ApiService.triggerWeatherCheck()).data); }
    catch { setLive({ message: 'Check failed' }); }
    finally { setChecking(false); }
  };

  if (loading) return (
    <div style={{ padding: '8px 0' }}>
      <div className="skeleton" style={{ height: 140, borderRadius: 16, marginBottom: 20 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 16 }}>
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
        <div className="skeleton" style={{ height: 320, borderRadius: 14 }} />
      </div>
    </div>
  );

  const n = stats?.notifications || {};
  const days = stats?.alertsByDay || [];
  const alerts = stats?.recentAlerts || [];
  const maxN = Math.max(...days.map((d: any) => parseInt(d.notified) || 0), 1);
  const responseRate = n.responseRate || 0;
  const noResp = (n.total || 0) - (n.responded || 0);

  return (
    <div style={{ padding: '4px 0' }}>

      {/* ── Hero strip: big number + live check ── */}
      <div style={{ display: 'flex', gap: 16, marginBottom: 28, flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 340px', padding: '28px 32px', borderRadius: 16, background: 'linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%)', color: '#fff', position: 'relative', overflow: 'hidden', minHeight: 140 }}>
          <div style={{ position: 'absolute', top: -30, right: -20, fontSize: 120, opacity: 0.06, lineHeight: 1 }}>🌧</div>
          <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1.2, opacity: 0.5, marginBottom: 12 }}>Weather Intelligence</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
            <div>
              <span style={{ fontSize: 48, fontWeight: 800, letterSpacing: -2, lineHeight: 1 }}>{stats?.totalAlerts ?? 0}</span>
              <span style={{ fontSize: 14, opacity: 0.5, marginLeft: 8 }}>alerts triggered</span>
            </div>
            <div style={{ width: 1, height: 36, background: 'rgba(255,255,255,0.12)' }} />
            <div>
              <span style={{ fontSize: 28, fontWeight: 700, letterSpacing: -1 }}>{stats?.usersWithAlertsEnabled ?? 0}</span>
              <span style={{ fontSize: 13, opacity: 0.45, marginLeft: 6 }}>subscribers</span>
            </div>
          </div>
          <div style={{ marginTop: 16, display: 'flex', gap: 20, fontSize: 13, opacity: 0.55 }}>
            <span>{stats?.alertsToday ?? 0} today</span>
            <span>·</span>
            <span>{stats?.usersWithFcm ?? 0} devices registered</span>
          </div>
        </div>

        {/* Live check card */}
        <div style={{ flex: '0 0 280px', padding: '24px 28px', borderRadius: 16, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.8, color: 'var(--text-faint)', marginBottom: 10 }}>Live probe</div>
            {live ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 36 }}>{live.weather?.isRaining ? '🌧️' : '☀️'}</span>
                <div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5 }}>{live.weather?.temperature ?? '--'}°C</div>
                  <div style={{ fontSize: 12, color: live.weather?.isRaining ? '#60a5fa' : '#22c55e', fontWeight: 600 }}>{live.weather?.isRaining ? 'Rain detected' : 'Clear skies'}</div>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.6 }}>Poll Open-Meteo to check Ahmedabad weather right now.</div>
            )}
          </div>
          <button onClick={checkNow} disabled={checking} style={{ marginTop: 14, padding: '10px 0', borderRadius: 10, border: 'none', background: checking ? 'var(--border-primary)' : '#6366f1', color: '#fff', fontSize: 13, fontWeight: 700, cursor: checking ? 'wait' : 'pointer', transition: 'opacity 0.15s', opacity: checking ? 0.6 : 1 }}>
            {checking ? 'Checking…' : 'Check now'}
          </button>
          {live?.weather && (
            <div style={{ marginTop: 10, display: 'flex', gap: 8, fontSize: 11, color: 'var(--text-faint)' }}>
              <span>💧 {live.weather.precipitation}mm</span>
              <span>·</span>
              <span>Code {live.weather.weatherCode}</span>
            </div>
          )}
        </div>
      </div>

      {/* ── Response funnel + Timeline ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: 16, marginBottom: 28, alignItems: 'start' }} className="analytics-inner-grid">
        {/* Funnel */}
        <div style={S.card}>
          <div style={S.label}>Notification funnel</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
            {[
              { name: 'Sent', val: n.total || 0, color: '#6366f1', w: 100 },
              { name: 'Responded', val: n.responded || 0, color: '#22c55e', w: n.total ? ((n.responded || 0) / n.total) * 100 : 0 },
              { name: 'Confirmed rain', val: n.confirmedRain || 0, color: '#3b82f6', w: n.total ? ((n.confirmedRain || 0) / n.total) * 100 : 0 },
              { name: 'Denied', val: n.deniedRain || 0, color: '#f97316', w: n.total ? ((n.deniedRain || 0) / n.total) * 100 : 0 },
              { name: 'No response', val: noResp, color: '#cbd5e1', w: n.total ? (noResp / n.total) * 100 : 0 },
            ].map((item, i) => (
              <div key={item.name} style={{ padding: '14px 0', borderBottom: i < 4 ? '1px solid var(--border-secondary)' : 'none' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-secondary)' }}>{item.name}</span>
                  <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{item.val}</span>
                </div>
                <div style={{ height: 6, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                  <div style={{ width: `${Math.max(item.w, item.val > 0 ? 3 : 0)}%`, height: '100%', borderRadius: 3, background: item.color, transition: 'width 0.5s ease' }} />
                </div>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 8, textAlign: 'center', padding: '12px 0', borderRadius: 10, background: responseRate > 50 ? 'rgba(34,197,94,0.06)' : 'rgba(99,102,241,0.05)' }}>
            <span style={{ fontSize: 28, fontWeight: 800, color: responseRate > 50 ? '#22c55e' : '#6366f1', letterSpacing: -1 }}>{responseRate}%</span>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>response rate</div>
          </div>
        </div>

        {/* Timeline chart */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
            <div style={S.label}>30-day alert activity</div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{days.length} days with data</span>
          </div>
          {days.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: 'var(--text-faint)', fontSize: 14 }}>No alerts in the last 30 days</div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 140, paddingBottom: 24, position: 'relative' }}>
              {/* Y-axis hint */}
              <div style={{ position: 'absolute', left: 0, top: 0, fontSize: 10, color: 'var(--text-faint)' }}>{maxN}</div>
              <div style={{ position: 'absolute', left: 0, bottom: 24, fontSize: 10, color: 'var(--text-faint)' }}>0</div>
              <div style={{ marginLeft: 20, display: 'flex', alignItems: 'flex-end', gap: 2, flex: 1, height: '100%' }}>
                {days.map((d: any, i: number) => {
                  const notified = parseInt(d.notified) || 0;
                  const count = parseInt(d.count) || 0;
                  const dt = new Date(d.date);
                  const isToday = dt.toDateString() === new Date().toDateString();
                  return (
                    <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
                      title={`${dt.toLocaleDateString()}: ${count} alert(s), ${notified} users notified`}>
                      <div style={{
                        width: '100%', maxWidth: 18, borderRadius: '4px 4px 2px 2px',
                        height: `${Math.max((notified / maxN) * 110, count > 0 ? 6 : 2)}px`,
                        background: isToday ? '#6366f1' : count > 0 ? '#3b82f6' : 'var(--border-primary)',
                        opacity: count > 0 ? (isToday ? 1 : 0.65) : 0.25,
                        transition: 'height 0.4s ease',
                      }} />
                      {(i === 0 || i === days.length - 1 || isToday) && (
                        <span style={{ fontSize: 9, color: isToday ? '#6366f1' : 'var(--text-faint)', fontWeight: isToday ? 700 : 400 }}>
                          {isToday ? 'Today' : `${dt.getDate()}/${dt.getMonth() + 1}`}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Recent alerts — editorial table ── */}
      {alerts.length > 0 && (
        <div style={{ marginBottom: 28 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 14 }}>
            <div style={S.label}>Recent detections</div>
            <span style={{ fontSize: 12, color: 'var(--text-faint)' }}>Last {alerts.length}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 12 }}>
            {alerts.slice(0, 8).map((a: any, i: number) => {
              const mm = parseFloat(a.precipitation_mm);
              const intensity = mm > 10 ? 'Heavy' : mm > 3 ? 'Moderate' : mm > 0.5 ? 'Light' : 'Trace';
              const iColor = mm > 10 ? '#ef4444' : mm > 3 ? '#f97316' : mm > 0.5 ? '#3b82f6' : '#94a3b8';
              const dt = new Date(a.created_at);
              return (
                <div key={a.id} style={{ padding: '18px 20px', borderRadius: 14, border: '1px solid var(--border-primary)', background: i === 0 ? 'var(--bg-secondary)' : 'transparent', transition: 'border-color 0.15s' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: iColor, textTransform: 'uppercase', letterSpacing: 0.5 }}>{intensity}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}, {dt.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -0.5, marginBottom: 4 }}>{mm} mm</div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8 }}>{a.description || `${Number(a.latitude).toFixed(3)}°N, ${Number(a.longitude).toFixed(3)}°E`}</div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: '#6366f1' }}>{a.users_notified}</span>
                    <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>users notified</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Delivery log ── */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
          <div style={S.label}>Delivery log</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <button onClick={() => setNPage(p => Math.max(1, p - 1))} disabled={nPage <= 1} style={S.pgBtn}>‹</button>
            <span style={{ fontSize: 12, color: 'var(--text-faint)', padding: '0 6px', fontVariantNumeric: 'tabular-nums' }}>{nPage}/{nPages}</span>
            <button onClick={() => setNPage(p => Math.min(nPages, p + 1))} disabled={nPage >= nPages} style={S.pgBtn}>›</button>
          </div>
        </div>
        <div style={S.card}>
          {notifications.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)', fontSize: 14 }}>No notifications sent yet. Alerts will appear here once rain is detected.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
              {notifications.map((item: any, i: number) => {
                const hasResp = !!item.responded_at;
                const isYes = item.response && JSON.stringify(item.response).includes('yes');
                return (
                  <div key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 4px', borderBottom: i < notifications.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                    {/* Avatar circle */}
                    <div style={{ width: 36, height: 36, borderRadius: 18, background: hasResp ? (isYes ? 'rgba(59,130,246,0.1)' : 'rgba(249,115,22,0.1)') : 'var(--border-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: 14 }}>
                      {hasResp ? (isYes ? '🌧' : '☀') : '·'}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {item.full_name || item.email || 'Anonymous user'}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--text-faint)', marginTop: 2 }}>
                        {new Date(item.sent_at).toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      {hasResp ? (
                        <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 700, background: isYes ? 'rgba(59,130,246,0.08)' : 'rgba(249,115,22,0.08)', color: isYes ? '#3b82f6' : '#f97316' }}>
                          {isYes ? 'Confirmed' : 'Denied'}
                        </span>
                      ) : (
                        <span style={{ fontSize: 12, color: 'var(--text-faint)', fontStyle: 'italic' }}>awaiting</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const S = {
  card: { padding: '22px 24px', borderRadius: 14, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' } as React.CSSProperties,
  label: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 0 } as React.CSSProperties,
  pgBtn: { width: 28, height: 28, borderRadius: 8, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)', color: 'var(--text-secondary)', fontSize: 14, fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' } as React.CSSProperties,
};

export default WeatherDashboardPage;
