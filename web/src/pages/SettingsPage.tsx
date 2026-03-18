import React, { useState } from 'react';

const SettingsPage: React.FC = () => {
  const [reportExpiry, setReportExpiry] = useState('4');
  const [notifRate, setNotifRate] = useState('2');
  const [dailyLimit, setDailyLimit] = useState('10');
  const [gpsAccuracy, setGpsAccuracy] = useState('200');
  const [saved, setSaved] = useState(false);

  const handleSave = () => { setSaved(true); setTimeout(() => setSaved(false), 2000); };

  return (
    <div>
      <h2 style={{ margin: '0 0 20px', fontSize: 22, fontWeight: 700, color: '#f4f4f5' }}>Settings</h2>
      <div style={{ background: 'rgba(24,24,32,0.8)', borderRadius: 14, padding: 32, border: '1px solid rgba(255,255,255,0.06)', maxWidth: 600 }}>
        <h3 style={{ margin: '0 0 24px', fontSize: 15, fontWeight: 600, color: '#a1a1aa', letterSpacing: '0.3px' }}>System Configuration</h3>
        <Field label="Report Expiry Time (hours)" value={reportExpiry} onChange={setReportExpiry} hint="Reports older than this will be marked as expired" />
        <Field label="Notification Rate Limit (hours)" value={notifRate} onChange={setNotifRate} hint="Minimum interval between rain notifications per user" />
        <Field label="Daily Report Limit per User" value={dailyLimit} onChange={setDailyLimit} hint="Maximum reports a user can submit per day" />
        <Field label="GPS Accuracy Threshold (meters)" value={gpsAccuracy} onChange={setGpsAccuracy} hint="Maximum allowed GPS accuracy for report submission" />
        <div style={{ marginTop: 24, display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={handleSave} style={{
            padding: '10px 24px',
            background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
            color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
            fontSize: 14, fontWeight: 600, transition: 'all 0.2s',
          }}>
            Save Settings
          </button>
          {saved && <span style={{ color: '#22c55e', fontWeight: 600, fontSize: 14 }}>✓ Settings saved</span>}
        </div>
      </div>
    </div>
  );
};

const Field: React.FC<{label: string; value: string; onChange: (v: string) => void; hint: string}> = ({label, value, onChange, hint}) => (
  <div style={{ marginBottom: 20 }}>
    <label style={{ display: 'block', fontSize: 13, fontWeight: 500, marginBottom: 8, color: '#a1a1aa', letterSpacing: '0.3px' }}>{label}</label>
    <input type="number" value={value} onChange={e => onChange(e.target.value)}
      style={{
        padding: '10px 14px',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 10, fontSize: 14, width: '100%', boxSizing: 'border-box',
        background: 'rgba(255,255,255,0.04)', color: '#f4f4f5', outline: 'none',
      }} />
    <p style={{ margin: '6px 0 0', fontSize: 12, color: '#52525b' }}>{hint}</p>
  </div>
);

export default SettingsPage;
