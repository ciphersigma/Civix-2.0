import React, { useState } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { themed } from '../styles/theme';

const SettingsPage: React.FC = () => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [reportExpiry, setReportExpiry] = useState('4');
  const [notifRate, setNotifRate] = useState('2');
  const [dailyLimit, setDailyLimit] = useState('10');
  const [gpsAccuracy, setGpsAccuracy] = useState('200');
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2500); };

  return (
    <div>
      <h2 style={{ ...themed.title, marginBottom: 20 }}>Settings</h2>

      <div style={{ display: 'grid', gap: 16, maxWidth: 800 }}>
        {/* Appearance */}
        <div style={themed.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
            <span style={iconBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="13.5" cy="6.5" r="2.5"/><path d="M17.5 10.5c0 0-1-1.5-4-1.5s-4 1.5-4 1.5"/><circle cx="12" cy="12" r="10"/></svg>
            </span>
            <div>
              <h3 style={sectionTitle}>Appearance</h3>
              <p style={sectionSub}>Customize the dashboard look</p>
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: 12, border: '1px solid var(--border-secondary)' }}>
            <div>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>Theme</div>
              <div style={{ fontSize: 13, color: 'var(--text-faint)', marginTop: 2 }}>Currently using {theme} mode</div>
            </div>
            <button onClick={toggleTheme} style={themeBtn}>
              {isDark ? (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
                  Light
                </span>
              ) : (
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
                  Dark
                </span>
              )}
            </button>
          </div>
        </div>

        {/* System Configuration */}
        <div style={themed.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={iconBadge}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#6366f1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
            </span>
            <div>
              <h3 style={sectionTitle}>System Configuration</h3>
              <p style={sectionSub}>Core platform settings and thresholds</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }} className="settings-fields-grid">
            <Field label="Report Expiry Time" suffix="hours" value={reportExpiry} onChange={setReportExpiry} hint="Reports older than this are marked expired" />
            <Field label="Notification Rate Limit" suffix="hours" value={notifRate} onChange={setNotifRate} hint="Min interval between rain notifications" />
            <Field label="Daily Report Limit" suffix="per user" value={dailyLimit} onChange={setDailyLimit} hint="Max reports a user can submit per day" />
            <Field label="GPS Accuracy Threshold" suffix="meters" value={gpsAccuracy} onChange={setGpsAccuracy} hint="Max allowed GPS accuracy for submissions" />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSave} style={saveBtn}>Save Settings</button>
          {saved && (
            <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e', display: 'inline-block' }} />Settings saved
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{label: string; suffix: string; value: string; onChange: (v: string) => void; hint: string}> = ({label, suffix, value, onChange, hint}) => (
  <div>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: 'var(--text-tertiary)' }}>
      {label} <span style={{ color: 'var(--text-ghost)', fontWeight: 400 }}>({suffix})</span>
    </label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)} style={themed.input} />
    <p style={{ margin: '6px 0 0', fontSize: 12, color: 'var(--text-ghost)' }}>{hint}</p>
  </div>
);

const iconBadge: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 8,
  background: 'rgba(99,102,241,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  flexShrink: 0,
};
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' };
const sectionSub: React.CSSProperties = { margin: '2px 0 0', fontSize: 13, color: 'var(--text-faint)' };
const saveBtn: React.CSSProperties = {
  padding: '11px 28px', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
  color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
  fontSize: 14, fontWeight: 600, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};
const themeBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border-input)',
  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  color: 'var(--text-secondary)', transition: 'all 0.15s',
};

export default SettingsPage;
