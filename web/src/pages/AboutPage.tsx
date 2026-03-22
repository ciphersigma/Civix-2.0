import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="about-wrap">

          {/* Hero — left aligned, editorial */}
          <section className="about-hero">
            <span className="about-eyebrow">About CIVIX</span>
            <h1>We got tired of drowning<br />in <span className="sp-gradient-text">preventable floods</span></h1>
            <p className="about-hero-lead">CIVIX started with a simple frustration: why does nobody know a road is flooded until they're standing in it? We built the tool we wished existed during every monsoon.</p>
          </section>

          {/* Two-column story */}
          <section className="about-story-section">
            <div className="about-col-left">
              <h2>The reality of Indian monsoons</h2>
              <p>Every year, the same cycle repeats. Heavy rain hits. Streets flood within minutes. Commuters wade through waist-deep water. Auto drivers refuse routes. Offices shut down. And the municipal corporation finds out from Twitter — hours later.</p>
              <p>The infrastructure gap is real, but the information gap is worse. There's no system that tells you "don't take MG Road right now, it's knee-deep." That's what we set out to fix.</p>
            </div>
            <div className="about-col-right">
              <div className="about-pull-quote">
                <span className="about-pq-mark">"</span>
                <p>The problem isn't just flooding — it's that nobody knows about it until they're already stuck.</p>
              </div>
            </div>
          </section>

          {/* What we built — flowing prose, not cards */}
          <section className="about-what">
            <h2>What we built</h2>
            <p>CIVIX is a crowdsourced flood intelligence platform. Citizens report waterlogging from their phones with GPS-verified location and severity. Those reports go live instantly on a public heatmap. Nearby users get push alerts. City authorities get a real-time dashboard with analytics and hotspot data.</p>
            <p>No expensive IoT sensors. No government contracts. Just a mobile app, a map, and people who walk those streets every day.</p>

            <div className="about-stats-inline">
              <div className="about-stat">
                <span className="about-stat-val">~30s</span>
                <span className="about-stat-desc">from report to alert</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">GPS</span>
                <span className="about-stat-desc">verified every report</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">4hr</span>
                <span className="about-stat-desc">auto-expiry keeps data fresh</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">24/7</span>
                <span className="about-stat-desc">always on, always free</span>
              </div>
            </div>
          </section>

          {/* Who it's for — simple text blocks, no cards */}
          <section className="about-who">
            <h2>Who it's for</h2>
            <div className="about-who-grid">
              <div className="about-who-item">
                <h3>Citizens</h3>
                <p>Download the app, verify with email OTP, and you're in. Report waterlogging in one tap. Get alerts when flooding is reported near you. Check the live map before heading out — especially during heavy rain.</p>
              </div>
              <div className="about-who-item">
                <h3>City authorities</h3>
                <p>The admin dashboard gives you real-time severity data, historical trends, and geographic hotspots. Use crowdsourced intelligence to prioritize drainage work and deploy emergency response where it matters most.</p>
              </div>
              <div className="about-who-item">
                <h3>Researchers</h3>
                <p>Aggregated, anonymized flood data across Indian cities. Study urban drainage patterns, identify infrastructure failures, and build better predictive models for monsoon preparedness.</p>
              </div>
            </div>
          </section>

          {/* Tech — horizontal list, not grid of cards */}
          <section className="about-tech">
            <h2>Under the hood</h2>
            <p>CIVIX runs on a modern, production-grade stack built for speed and reliability.</p>
            <div className="about-tech-list">
              {[
                'React Native',
                'Node.js + Express',
                'PostgreSQL + PostGIS',
                'Mapbox GL',
                'Email OTP Auth',
                'Vercel Edge',
              ].map((t, i) => (
                <span key={i} className="about-tech-tag">{t}</span>
              ))}
            </div>
          </section>

          {/* CTA — simple, no box */}
          <section className="about-bottom-cta">
            <h2>Monsoon season doesn't wait.<br /><span className="sp-gradient-text">Neither should you.</span></h2>
            <p>Download CIVIX and help build real-time flood intelligence for your city.</p>
            <div className="sp-btn-row" style={{ justifyContent: 'center' }}>
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="sp-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download for Android
              </a>
              <a href="/live-map" className="sp-btn sp-btn-outline">View Live Map</a>
            </div>
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default AboutPage;
