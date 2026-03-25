import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

const SC: Record<string, string> = { High: '#ef4444', Medium: '#f97316', Low: '#eab308' };

const AnalyticsPage: React.FC = () => {
  const [stats, setStats] = useState<any>(null);
  const [reports, setReports] = useState<any[]>([]);
  const [wStats, setWStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [st, rp, ws] = await Promise.all([
          ApiService.getStats(),
          ApiService.getReports({ limit: 200 }),
          ApiService.getWeatherStats().catch(() => ({ data: null })),
        ]);
        setStats(st.data);
        setReports(rp.data.reports || []);
        setWStats(ws.data);
      } catch (e) { console.error(e); }
      finally { setLoading(false); }
    })();
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div className="skeleton" style={{ height: 80, borderRadius: 14 }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
        {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 240, borderRadius: 14 }} />)}
      </div>
    </div>
  );

  const total = stats?.totalReports || 0;
  const active = stats?.activeReports || 0;
  const users = stats?.totalUsers || 0;
  const sev = stats?.severityBreakdown || { Low: 0, Medium: 0, High: 0 };
  const totalSev = sev.Low + sev.Medium + sev.High || 1;
  const expired = total - active;
  const weekly = stats?.weeklyReports || [];
  const nS = stats?.notifications || { total: 0, responded: 0 };
  const wAlerts = wStats?.totalAlerts || stats?.weatherAlerts || 0;
  const wNotifs = wStats?.notifications || nS;

  // Report type breakdown
  const typeMap: Record<string, number> = {};
  reports.forEach(r => { typeMap[r.report_type] = (typeMap[r.report_type] || 0) + 1; });
  const typeEntries = Object.entries(typeMap).sort((a, b) => b[1] - a[1]);

  // Hourly distribution
  const hourMap: number[] = new Array(24).fill(0);
  reports.forEach(r => {
    const h = new Date(r.created_at).getHours();
    hourMap[h]++;
  });
  const maxHour = Math.max(...hourMap, 1);

  // 7-day
  const maxW = Math.max(...weekly.map((d: any) => parseInt(d.count) || 0), 1);

  return (
    <div style={{ maxWidth: 1100 }}>

      {/* ── Key metrics strip ── */}
      <div style={{ display: 'flex', gap: 0, marginBottom: 24, borderRadius: 14, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
        <Metric value={`${total > 0 ? Math.round((active / total) * 100) : 0}%`} label="Active rate" sub={`${active} of ${total}`} />
        <Metric value={users > 0 ? (total / users).toFixed(1) : '0'} label="Reports per user" sub={`${total} / ${users}`} />
        <Metric value={`${totalSev > 0 ? Math.round((sev.High / totalSev) * 100) : 0}%`} label="High severity" sub={`${sev.High} of ${totalSev}`} color="#ef4444" />
        <Metric value={String(expired)} label="Expired" sub={`${total > 0 ? Math.round((expired / total) * 100) : 0}% of all`} />
        <Metric value={String(wAlerts)} label="Weather alerts" sub={`${wNotifs.responded || 0} responded`} color="#3b82f6" last />
      </div>

      {/* ── Row: Severity + Types + Notifications ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16, marginBottom: 20 }} className="analytics-inner-grid">

        {/* Severity */}
        <div style={S.card}>
          <div style={S.lbl}>Severity breakdown</div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            <Ring sev={sev} total={totalSev} />
            {(['High','Medium','Low'] as const).map(k => {
              const v = sev[k] || 0;
              const p = Math.round((v / totalSev) * 100);
              return (
                <div key={k} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: SC[k] }} />
                      <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)' }}>{k}</span>
                    </span>
                    <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{v} ({p}%)</span>
                  </div>
                  <div style={{ height: 6, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                    <div style={{ width: `${p}%`, height: '100%', borderRadius: 3, background: SC[k], transition: 'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Report types */}
        <div style={S.card}>
          <div style={S.lbl}>Report types</div>
          {typeEntries.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--text-faint)' }}>No data</div>
          ) : (
            <div>
              {typeEntries.map(([type, count], i) => {
                const p = Math.round((count / total) * 100);
                return (
                  <div key={type} style={{ padding: '14px 0', borderBottom: i < typeEntries.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'capitalize' }}>{type}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{count}</span>
                    </div>
                    <div style={{ height: 6, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                      <div style={{ width: `${p}%`, height: '100%', borderRadius: 3, background: '#6366f1', opacity: 0.6, transition: 'width 0.5s' }} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>{p}% of all reports</div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Notification funnel */}
        <div style={S.card}>
          <div style={S.lbl}>Notification funnel</div>
          {(() => {
            const t = wNotifs.total || 0;
            const resp = wNotifs.responded || 0;
            const conf = wNotifs.confirmedRain || 0;
            const den = wNotifs.deniedRain || 0;
            const noResp = t - resp;
            const items = [
              { name: 'Sent', val: t, color: '#6366f1', w: 100 },
              { name: 'Responded', val: resp, color: '#22c55e', w: t ? (resp / t) * 100 : 0 },
              { name: 'Confirmed rain', val: conf, color: '#3b82f6', w: t ? (conf / t) * 100 : 0 },
              { name: 'Denied rain', val: den, color: '#f97316', w: t ? (den / t) * 100 : 0 },
              { name: 'No response', val: noResp, color: '#cbd5e1', w: t ? (noResp / t) * 100 : 0 },
            ];
            return (
              <div>
                {items.map((it, i) => (
                  <div key={it.name} style={{ padding: '12px 0', borderBottom: i < items.length - 1 ? '1px solid var(--border-secondary)' : 'none' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{it.name}</span>
                      <span style={{ fontSize: 14, fontWeight: 800, color: 'var(--text-primary)', fontVariantNumeric: 'tabular-nums' }}>{it.val}</span>
                    </div>
                    <div style={{ height: 5, borderRadius: 3, background: 'var(--border-primary)', overflow: 'hidden' }}>
                      <div style={{ width: `${Math.max(it.w, it.val > 0 ? 3 : 0)}%`, height: '100%', borderRadius: 3, background: it.color, transition: 'width 0.5s' }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop: 12, textAlign: 'center', padding: '10px 0', borderRadius: 10, background: 'rgba(99,102,241,0.05)' }}>
                  <span style={{ fontSize: 24, fontWeight: 800, color: '#6366f1', letterSpacing: -1 }}>{t > 0 ? Math.round((resp / t) * 100) : 0}%</span>
                  <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>response rate</div>
                </div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* ── Row: 7-day + Hourly heatmap ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }} className="analytics-inner-grid">

        {/* 7-day activity */}
        <div style={S.card}>
          <div style={S.lbl}>Last 7 days</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 130 }}>
            {weekly.length === 0 ? (
              <div style={{ flex: 1, textAlign: 'center', color: 'var(--text-faint)', paddingTop: 50 }}>No data</div>
            ) : weekly.map((d: any) => {
              const c = parseInt(d.count) || 0;
              const dt = new Date(d.date);
              const today = dt.toDateString() === new Date().toDateString();
              return (
                <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: today ? '#6366f1' : 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>{c || ''}</span>
                  <div style={{
                    width: '100%', maxWidth: 44, borderRadius: 6,
                    height: `${Math.max((c / maxW) * 90, c > 0 ? 8 : 3)}px`,
                    background: today ? '#6366f1' : c > 0 ? 'var(--text-faint)' : 'var(--border-primary)',
                    opacity: today ? 1 : c > 0 ? 0.3 : 0.12,
                    transition: 'height 0.4s',
                  }} />
                  <span style={{ fontSize: 10, color: today ? '#6366f1' : 'var(--text-faint)', fontWeight: today ? 700 : 400 }}>
                    {today ? 'Today' : dt.toLocaleDateString(undefined, { weekday: 'short' })}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Hourly distribution */}
        <div style={S.card}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
            <div style={S.lbl}>Reporting hours</div>
            <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>Based on {reports.length} reports</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 2, height: 100 }}>
            {hourMap.map((count, h) => {
              const peak = count === maxHour && count > 0;
              return (
                <div key={h} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }} title={`${h}:00 — ${count} reports`}>
                  <div style={{
                    width: '100%', borderRadius: '3px 3px 0 0',
                    height: `${Math.max((count / maxHour) * 80, count > 0 ? 4 : 2)}px`,
                    background: peak ? '#ef4444' : count > 0 ? '#6366f1' : 'var(--border-primary)',
                    opacity: count > 0 ? (peak ? 1 : 0.4 + (count / maxHour) * 0.5) : 0.12,
                    transition: 'height 0.3s',
                  }} />
                  {(h % 6 === 0) && <span style={{ fontSize: 8, color: 'var(--text-faint)' }}>{h}h</span>}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10, fontSize: 11, color: 'var(--text-faint)' }}>
            <span>Peak: {hourMap.indexOf(maxHour)}:00 ({maxHour} reports)</span>
            <span>Quietest: {hourMap.indexOf(Math.min(...hourMap))}:00</span>
          </div>
        </div>
      </div>

      {/* ── Row: Partner API Analytics ── */}
      <div style={S.card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
          <div style={S.lbl}>Partner API usage</div>
          <span style={{ fontSize: 11, color: 'var(--text-faint)' }}>{stats?.activeApiKeys ?? 0} active key(s)</span>
        </div>

        <div style={{ display: 'flex', gap: 0, marginBottom: 20, borderRadius: 12, overflow: 'hidden', border: '1px solid var(--border-primary)' }}>
          <div style={{ flex: 1, padding: '16px 20px', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{(stats?.apiStats?.totalRequests ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>Total API calls</div>
          </div>
          <div style={{ width: 1, background: 'var(--border-primary)' }} />
          <div style={{ flex: 1, padding: '16px 20px', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: '#8b5cf6', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{(stats?.apiStats?.last24h ?? 0).toLocaleString()}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>Last 24 hours</div>
          </div>
          <div style={{ width: 1, background: 'var(--border-primary)' }} />
          <div style={{ flex: 1, padding: '16px 20px', background: 'var(--bg-primary)' }}>
            <div style={{ fontSize: 28, fontWeight: 800, color: 'var(--text-primary)', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{stats?.activeApiKeys ?? 0}</div>
            <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 5 }}>Active keys</div>
          </div>
        </div>

        {(stats?.apiStats?.topPartners || []).length > 0 ? (
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>Top partners by request volume</div>
            {(stats?.apiStats?.topPartners || []).map((p: any, i: number) => {
              const maxReq = Math.max(...(stats?.apiStats?.topPartners || []).map((x: any) => parseInt(x.request_count) || 0), 1);
              const pct = Math.round(((parseInt(p.request_count) || 0) / maxReq) * 100);
              return (
                <div key={i} style={{ marginBottom: 14 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{p.partner_name}</span>
                    <span style={{ fontSize: 13, color: 'var(--text-faint)', fontVariantNumeric: 'tabular-nums' }}>
                      {(parseInt(p.request_count) || 0).toLocaleString()} calls
                      {p.last_used_at && <span style={{ marginLeft: 8, opacity: 0.6 }}>· last used {new Date(p.last_used_at).toLocaleDateString()}</span>}
                    </span>
                  </div>
                  <div style={{ height: 7, borderRadius: 4, background: 'var(--border-primary)', overflow: 'hidden' }}>
                    <div style={{ width: `${pct}%`, height: '100%', borderRadius: 4, background: 'linear-gradient(90deg, #8b5cf6, #6366f1)', opacity: 0.75, transition: 'width 0.5s ease' }} />
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 0', color: 'var(--text-faint)', fontSize: 13 }}>
            No partner API usage recorded yet. API analytics will appear here once partners start making requests.
          </div>
        )}
      </div>
    </div>
  );
};

/* ── Components ── */

const Metric: React.FC<{ value: string; label: string; sub: string; color?: string; last?: boolean }> = ({ value, label, sub, color, last }) => (
  <div style={{
    flex: 1, padding: '18px 20px', background: 'var(--bg-secondary)',
    borderRight: last ? 'none' : '1px solid var(--border-primary)',
  }}>
    <div style={{ fontSize: 26, fontWeight: 800, color: color || 'var(--text-primary)', letterSpacing: -1, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)', marginTop: 5 }}>{label}</div>
    <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 2 }}>{sub}</div>
  </div>
);

const Ring: React.FC<{ sev: { High: number; Medium: number; Low: number }; total: number }> = ({ sev, total }) => {
  const d = [
    { k: 'High', c: '#ef4444', p: (sev.High / total) * 100 },
    { k: 'Medium', c: '#f97316', p: (sev.Medium / total) * 100 },
    { k: 'Low', c: '#eab308', p: (sev.Low / total) * 100 },
  ];
  let o = 0;
  return (
    <div style={{ position: 'relative', width: 100, height: 100 }}>
      <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
        <circle cx="18" cy="18" r="14" fill="none" stroke="var(--border-primary)" strokeWidth="2.5" />
        {d.map(x => {
          const el = <circle key={x.k} cx="18" cy="18" r="14" fill="none" stroke={x.c} strokeWidth="3.5" strokeDasharray={`${x.p * 0.88} ${88 - x.p * 0.88}`} strokeDashoffset={-o * 0.88} strokeLinecap="round" />;
          o += x.p;
          return el;
        })}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ fontSize: 20, fontWeight: 800, color: 'var(--text-primary)', lineHeight: 1 }}>{total}</span>
        <span style={{ fontSize: 9, color: 'var(--text-faint)', marginTop: 2, textTransform: 'uppercase', letterSpacing: 0.5 }}>Total</span>
      </div>
    </div>
  );
};

const S = {
  card: { padding: '22px 24px', borderRadius: 14, border: '1px solid var(--border-primary)', background: 'var(--bg-secondary)' } as React.CSSProperties,
  lbl: { fontSize: 11, fontWeight: 700, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 14 } as React.CSSProperties,
};

export default AnalyticsPage;
