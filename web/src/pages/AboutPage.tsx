import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './StaticPages.css';

const AboutPage: React.FC = () => {
  const [isDark, setIsDark] = useState(true);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />

      <nav className="sp-navbar">
        <div className="sp-container sp-nav-content">
          <Link to="/" className="sp-logo">
            <img src="/logo.png" alt="CIVIX" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span>CIVIX</span>
          </Link>
          <div className="sp-nav-links">
            <Link to="/">Home</Link>
            <Link to="/about" className="sp-active">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/live-map">Live Map</Link>
            <button className="sp-theme-toggle" onClick={() => setIsDark(!isDark)}>{isDark ? '☀️' : '🌙'}</button>
          </div>
        </div>
      </nav>

      <main className="sp-main">
        <div className="sp-container">
          <div className="sp-hero-section">
            <h1>About <span className="sp-gradient-text">CIVIX</span></h1>
            <p className="sp-hero-sub">A crowdsourced urban flood intelligence platform built to make Indian cities safer during monsoon season.</p>
          </div>

          <div className="sp-content-grid">
            <div className="sp-card sp-card-full">
              <h2>Our Mission</h2>
              <p>Every monsoon season, millions of Indians face waterlogged streets with zero warning. Commuters get stranded, vehicles get damaged, and city authorities only learn about flooding after the damage is done.</p>
              <p>CIVIX changes that. We put the power of real-time flood reporting in the hands of citizens. When someone spots waterlogging, they report it in one tap — and everyone nearby gets alerted instantly.</p>
            </div>

            <div className="sp-card">
              <div className="sp-card-icon">🎯</div>
              <h3>The Problem</h3>
              <p>Indian cities lack real-time waterlogging data. Municipal systems are reactive, not proactive. Citizens have no way to check road conditions before stepping out during heavy rains.</p>
            </div>

            <div className="sp-card">
              <div className="sp-card-icon">💡</div>
              <h3>Our Solution</h3>
              <p>A mobile-first platform where citizens report waterlogging with GPS precision. Reports feed into a live heatmap that everyone can access. City authorities get dashboards with analytics and hotspot data.</p>
            </div>

            <div className="sp-card">
              <div className="sp-card-icon">📱</div>
              <h3>For Citizens</h3>
              <p>Download the Android app, sign up with your phone number, and start reporting. Get push notifications when waterlogging is reported near you. View the live map to plan safe routes.</p>
            </div>

            <div className="sp-card">
              <div className="sp-card-icon">🏛️</div>
              <h3>For Authorities</h3>
              <p>Access the admin dashboard for real-time analytics, severity trends, and historical hotspot data. Use crowdsourced intelligence to prioritize drainage infrastructure and emergency response.</p>
            </div>
          </div>

          <div className="sp-section">
            <h2>Tech Stack</h2>
            <div className="sp-tech-grid">
              {[
                { name: 'React Native', desc: 'Cross-platform mobile app' },
                { name: 'Node.js + Express', desc: 'Backend API server' },
                { name: 'PostgreSQL + PostGIS', desc: 'Spatial database for location queries' },
                { name: 'Firebase Auth', desc: 'Phone number authentication' },
                { name: 'Mapbox GL', desc: 'Interactive maps and heatmaps' },
                { name: 'Vercel', desc: 'Deployment and hosting' },
              ].map((t, i) => (
                <div key={i} className="sp-tech-item">
                  <strong>{t.name}</strong>
                  <span>{t.desc}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="sp-section">
            <h2>Open Source</h2>
            <p>CIVIX is fully open source. We believe civic tech should be transparent and community-driven.</p>
            <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer" className="sp-btn">⭐ View on GitHub</a>
          </div>
        </div>
      </main>

      <footer className="sp-footer">
        <div className="sp-container sp-footer-content">
          <p>© 2025 CIVIX. Built with ❤️ for safer cities.</p>
          <div className="sp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/live-map">Live Map</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default AboutPage;
