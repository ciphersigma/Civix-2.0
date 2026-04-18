import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLang, LANG_LABELS, Lang } from '../contexts/LanguageContext';
import './Navbar.css';

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isDark, onToggleTheme }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();
  const { lang, setLang, t } = useLang();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`site-navbar ${isDark ? 'dark' : 'light'}`}>
      <div className="site-nav-container">
        <Link to="/" className="site-nav-logo" onClick={() => setMobileMenu(false)}>
          <img src="/logo.png" alt="CIVIX" width={30} height={30} style={{ borderRadius: 8 }} />
          <span>CIVIX</span>
        </Link>

        <div className={`site-nav-menu ${mobileMenu ? 'open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileMenu(false)}>{t('home')}</Link>
          <Link to="/live-map" className={isActive('/live-map') ? 'active' : ''} onClick={() => setMobileMenu(false)}>{t('liveMap')}</Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''} onClick={() => setMobileMenu(false)}>{t('about')}</Link>
          <Link to="/how-it-works" className={isActive('/how-it-works') ? 'active' : ''} onClick={() => setMobileMenu(false)}>{t('howItWorks')}</Link>
          <Link to="/contact" className={isActive('/contact') ? 'active' : ''} onClick={() => setMobileMenu(false)}>{t('contact')}</Link>
          <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="site-nav-cta" onClick={() => setMobileMenu(false)}>{t('getApp')}</a>
          {/* Language switcher */}
          <div style={{ display: 'flex', gap: 2, marginLeft: 4 }}>
            {(['en', 'hi', 'gu'] as Lang[]).map(l => (
              <button key={l} onClick={() => setLang(l)}
                style={{ padding: '4px 8px', borderRadius: 6, border: 'none', fontSize: 12, fontWeight: lang === l ? 700 : 400, background: lang === l ? 'rgba(99,102,241,0.15)' : 'transparent', color: lang === l ? '#6366f1' : 'inherit', cursor: 'pointer' }}>
                {LANG_LABELS[l]}
              </button>
            ))}
          </div>
          <button className="site-nav-theme site-nav-theme-desktop" onClick={onToggleTheme} aria-label="Toggle theme">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
        </div>

        <div className="site-nav-right-mobile">
          <button className="site-nav-theme site-nav-theme-mobile" onClick={onToggleTheme} aria-label="Toggle theme">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
          <button className={`site-nav-hamburger ${mobileMenu ? 'open' : ''}`} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">
            <span /><span /><span />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
