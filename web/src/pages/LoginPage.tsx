import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ApiService from '../services/api';
import './LoginPage.css';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      const response = await ApiService.adminLogin(email, password);
      if (response.data.token) {
        login(response.data.token);
        navigate('/dashboard');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid email or password');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={styles.page} className="login-page-split">
      {/* Left Panel */}
      <div style={styles.left} className="login-left-panel">
        <div className="login-left-grid" />
        <div className="login-left-orb login-left-orb-1" />
        <div className="login-left-orb login-left-orb-2" />
        <div className="login-left-orb login-left-orb-3" />
        <div className="login-left-orb login-left-orb-4" />
        <div className="login-left-ring login-left-ring-1" />
        <div className="login-left-ring login-left-ring-2" />
        <div style={styles.leftContent} className="login-left-content">
          <div style={styles.leftLogo}>
            <img src="/logo.png" alt="CIVIX" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'contain' }} />
            <span style={styles.leftBrand}>CIVIX</span>
          </div>
          <h2 style={styles.leftTitle}>Real-time Flood<br />Intelligence Platform</h2>
          <p style={styles.leftDesc}>Monitor waterlogging reports, manage users, and analyze severity data across Indian cities.</p>
          <div style={styles.features}>
            {[
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>, text: 'Real-time Analytics & Heatmaps' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s-8-4.5-8-11.8A8 8 0 0112 2a8 8 0 018 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/></svg>, text: 'GPS-verified Citizen Reports' },
              { icon: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>, text: 'User & Report Management' },
            ].map((f, i) => (
              <div key={i} style={styles.featureItem} className="login-feature-card">
                <div style={styles.featureIcon}>{f.icon}</div>
                <span style={styles.featureText}>{f.text}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right Panel */}
      <div style={styles.right} className="login-right-panel">
        <div style={styles.rightTop}>
          <Link to="/" style={styles.backLink}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/></svg>
            Back to Home
          </Link>
        </div>
        <div style={styles.formWrap}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
            <img src="/logo.png" alt="CIVIX" style={{ width: 60, height: 60, borderRadius: 14, objectFit: 'contain' }} />
          </div>
          <h1 style={styles.formTitle}>Welcome Back</h1>
          <p style={styles.formSub}>Sign in to your CIVIX admin account</p>
          {error && <div style={styles.error}>{error}</div>}
          <form onSubmit={handleLogin}>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                Email Address
              </label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="your@email.com" required autoComplete="email" style={styles.input} />
            </div>
            <div style={styles.fieldGroup}>
              <label style={styles.label}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                Password
              </label>
              <div style={styles.passWrap}>
                <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)} placeholder="Enter your password" required autoComplete="current-password" style={{ ...styles.input, paddingRight: 42 }} />
                <button type="button" onClick={() => setShowPass(!showPass)} style={styles.eyeBtn} aria-label={showPass ? 'Hide password' : 'Show password'}>
                  {showPass ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                  ) : (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
            <button type="submit" disabled={isLoading} style={styles.submitBtn}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              {isLoading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
        <p style={styles.copyright}>&copy; 2025 CIVIX. All rights reserved.</p>
      </div>
    </div>
  );
};

const styles: Record<string, React.CSSProperties> = {
  page: {
    display: 'flex',
    minHeight: '100vh',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    background: '#f5f3ff',
  },

  /* ── Left Panel — matches website indigo palette ── */
  left: {
    width: '45%',
    background: 'linear-gradient(160deg, #4338ca, #6366f1, #4338ca)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '3rem',
    position: 'relative',
    overflow: 'hidden',
  },
  leftContent: { position: 'relative', zIndex: 5, maxWidth: 400 },
  leftLogo: { display: 'flex', alignItems: 'center', gap: 10, marginBottom: 40 },
  leftBrand: { fontSize: 20, fontWeight: 800, color: '#fff', letterSpacing: '-0.02em' },
  leftTitle: { fontSize: 32, fontWeight: 700, color: '#fff', lineHeight: 1.2, letterSpacing: '-0.02em', margin: '0 0 14px' },
  leftDesc: { fontSize: 15, color: 'rgba(255,255,255,0.65)', lineHeight: 1.7, margin: '0 0 40px' },
  features: { display: 'flex', flexDirection: 'column' as const, gap: 0 },
  featureItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    padding: '14px 18px',
    background: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginBottom: 8,
    border: '1px solid rgba(255,255,255,0.08)',
  },
  featureIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    background: 'rgba(255,255,255,0.12)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'rgba(255,255,255,0.85)',
    flexShrink: 0,
  },
  featureText: { fontSize: 14, fontWeight: 500, color: 'rgba(255,255,255,0.9)' },

  /* ── Right Panel — light indigo tinted like website ── */
  right: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    background: '#f5f3ff',
    minHeight: '100vh',
  },
  rightTop: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '20px 32px',
  },
  backLink: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 500,
    color: '#6366f1',
    textDecoration: 'none',
  },
  formWrap: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column' as const,
    justifyContent: 'center',
    maxWidth: 420,
    width: '100%',
    margin: '0 auto',
    padding: '0 32px',
  },
  formTitle: {
    textAlign: 'center' as const,
    fontSize: 24,
    fontWeight: 700,
    color: '#0f172a',
    margin: '0 0 6px',
    letterSpacing: '-0.02em',
  },
  formSub: {
    textAlign: 'center' as const,
    fontSize: 14,
    color: 'rgba(15,23,42,0.45)',
    margin: '0 0 32px',
  },
  error: {
    padding: '10px 14px',
    background: 'rgba(239,68,68,0.06)',
    border: '1px solid rgba(239,68,68,0.15)',
    borderRadius: 10,
    color: '#dc2626',
    fontSize: 13,
    marginBottom: 20,
  },
  fieldGroup: { marginBottom: 20 },
  label: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    fontSize: 13,
    fontWeight: 600,
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    display: 'block',
    width: '100%',
    padding: '12px 14px',
    background: 'rgba(255,255,255,0.7)',
    border: '1.5px solid rgba(99,102,241,0.12)',
    borderRadius: 10,
    fontSize: 14,
    color: '#0f172a',
    outline: 'none',
    fontFamily: 'inherit',
    boxSizing: 'border-box' as const,
  },
  passWrap: { position: 'relative' as const },
  eyeBtn: {
    position: 'absolute' as const,
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    color: '#94a3b8',
    padding: 4,
    display: 'flex',
    alignItems: 'center',
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
    padding: 13,
    background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
    color: '#fff',
    border: 'none',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'inherit',
    marginTop: 8,
  },
  copyright: {
    textAlign: 'center' as const,
    padding: '20px 0',
    fontSize: 12,
    color: 'rgba(15,23,42,0.25)',
  },
};

export default LoginPage;