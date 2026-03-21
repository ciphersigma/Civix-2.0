import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import './Navbar.css';

interface NavbarProps {
  isDark: boolean;
  onToggleTheme: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ isDark, onToggleTheme }) => {
  const [mobileMenu, setMobileMenu] = useState(false);
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  return (
    <nav className={`site-navbar ${isDark ? 'dark' : 'light'}`}>
      <div className="site-nav-container">
        <Link to="/" className="site-nav-logo" onClick={() => setMobileMenu(false)}>
          <img src="/logo.png" alt="CIVIX" width={30} height={30} style={{ borderRadius: 8 }} />
          <span>CIVIX</span>
        </Link>

        <div className={`site-nav-menu ${mobileMenu ? 'open' : ''}`}>
          <Link to="/" className={isActive('/') ? 'active' : ''} onClick={() => setMobileMenu(false)}>Home</Link>
          <Link to="/live-map" className={isActive('/live-map') ? 'active' : ''} onClick={() => setMobileMenu(false)}>Live Map</Link>
          <Link to="/about" className={isActive('/about') ? 'active' : ''} onClick={() => setMobileMenu(false)}>About</Link>
          <Link to="/contact" className={isActive('/contact') ? 'active' : ''} onClick={() => setMobileMenu(false)}>Contact</Link>
          <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="site-nav-cta" onClick={() => setMobileMenu(false)}>Get the App</a>
          <button className="site-nav-theme" onClick={onToggleTheme} aria-label="Toggle theme">
            {isDark ? (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
            )}
          </button>
        </div>

        <button className={`site-nav-hamburger ${mobileMenu ? 'open' : ''}`} onClick={() => setMobileMenu(!mobileMenu)} aria-label="Toggle menu">
          <span /><span /><span />
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
