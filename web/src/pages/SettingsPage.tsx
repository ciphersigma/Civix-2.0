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
            <span style={iconBadge}>🎨</span>
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
              {isDark ? '☀️ Light' : '🌙 Dark'}
            </button>
          </div>
        </div>

        {/* System Configuration */}
        <div style={themed.card}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 24 }}>
            <span style={iconBadge}>⚙️</span>
            <div>
              <h3 style={sectionTitle}>System Configuration</h3>
              <p style={sectionSub}>Core platform settings and thresholds</p>
            </div>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
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
  width: 40, height: 40, borderRadius: 10,
  background: 'rgba(59,130,246,0.08)', display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 18, flexShrink: 0,
};
const sectionTitle: React.CSSProperties = { margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--text-secondary)' };
const sectionSub: React.CSSProperties = { margin: '2px 0 0', fontSize: 13, color: 'var(--text-faint)' };
const saveBtn: React.CSSProperties = {
  padding: '11px 28px', background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
  color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
  fontSize: 14, fontWeight: 600, transition: 'all 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
};
const themeBtn: React.CSSProperties = {
  padding: '8px 16px', background: 'var(--bg-hover)', border: '1px solid var(--border-input)',
  borderRadius: 8, cursor: 'pointer', fontSize: 13, fontWeight: 500,
  color: 'var(--text-secondary)', transition: 'all 0.15s',
};

export default SettingsPage;
