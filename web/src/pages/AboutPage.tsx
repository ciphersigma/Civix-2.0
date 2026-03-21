import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';

const AboutPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="sp-container">
          <div className="sp-hero-section">
            <div className="sp-badge-pill">About Us</div>
            <h1>About <span className="sp-gradient-text">CIVIX</span></h1>
            <p className="sp-hero-sub">A crowdsourced urban flood intelligence platform built to make Indian cities safer during monsoon season.</p>
          </div>

          <div className="sp-content-grid">
            <div className="sp-card sp-card-full sp-card-highlight">
              <h2>Our Mission</h2>
              <p>Every monsoon season, millions of Indians face waterlogged streets with zero warning. Commuters get stranded, vehicles get damaged, and city authorities only learn about flooding after the damage is done.</p>
              <p>CIVIX changes that. We put the power of real-time flood reporting in the hands of citizens. When someone spots waterlogging, they report it in one tap — and everyone nearby gets alerted instantly.</p>
            </div>

            <div className="sp-card">
              <h3>The Problem</h3>
              <p>Indian cities lack real-time waterlogging data. Municipal systems are reactive, not proactive. Citizens have no way to check road conditions before stepping out during heavy rains.</p>
            </div>

            <div className="sp-card">
              <h3>Our Solution</h3>
              <p>A mobile-first platform where citizens report waterlogging with GPS precision. Reports feed into a live heatmap that everyone can access. City authorities get dashboards with analytics and hotspot data.</p>
            </div>

            <div className="sp-card">
              <h3>For Citizens</h3>
              <p>Download the Android app, sign up with your email, and start reporting. Get notifications when waterlogging is reported near you. View the live map to plan safe routes.</p>
            </div>

            <div className="sp-card">
              <h3>For Authorities</h3>
              <p>Access the admin dashboard for real-time analytics, severity trends, and historical hotspot data. Use crowdsourced intelligence to prioritize drainage infrastructure and emergency response.</p>
            </div>
          </div>

          {/* Key highlights */}
          <div className="sp-numbers-section">
            <div className="sp-number-card">
              <span className="sp-number-value">GPS</span>
              <span className="sp-number-label">Verified Reports</span>
            </div>
            <div className="sp-number-card">
              <span className="sp-number-value">~30s</span>
              <span className="sp-number-label">Alert Speed</span>
            </div>
            <div className="sp-number-card">
              <span className="sp-number-value">4hr</span>
              <span className="sp-number-label">Auto-Expiry</span>
            </div>
            <div className="sp-number-card">
              <span className="sp-number-value">24/7</span>
              <span className="sp-number-label">Always On</span>
            </div>
          </div>

          <div className="sp-section">
            <h2>Tech Stack</h2>
            <p>CIVIX is built with modern, production-grade technologies designed for reliability and scale.</p>
            <div className="sp-tech-grid">
              {[
                { name: 'React Native', desc: 'Cross-platform mobile app' },
                { name: 'Node.js + Express', desc: 'Backend API server' },
                { name: 'PostgreSQL + PostGIS', desc: 'Spatial database for location queries' },
                { name: 'Email OTP', desc: 'Passwordless authentication' },
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
            <h2>Get Started</h2>
            <p>CIVIX is built for Indian cities. Download the app and start contributing to safer commutes during monsoon season.</p>
            <div className="sp-btn-row">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="sp-btn">Download APK</a>
            </div>
          </div>
        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default AboutPage;
