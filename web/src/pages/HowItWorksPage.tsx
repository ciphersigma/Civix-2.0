import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';
import './HowItWorksPage.css';

const HowItWorksPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="hiw-wrap">

          {/* Hero */}
          <section className="hiw-hero">
            <span className="hiw-eyebrow">How CIVIX Works</span>
            <h1>Real-time flood intelligence,<br /><span className="sp-gradient-text">powered by citizens</span></h1>
            <p className="hiw-hero-lead">CIVIX is a citizen-powered platform: a mobile app for reporting, a live public map for awareness, and smart alerts to keep you safe. Here's how it all fits together.</p>
            <div className="hiw-hero-scroll">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
              <span>Scroll to explore</span>
            </div>
          </section>

          {/* The platform */}
          <section className="hiw-section">
            <div className="hiw-section-label">01 — The Platform</div>
            <h2>Three parts, one network</h2>
            <p>CIVIX has three components that work together to create a real-time waterlogging intelligence network.</p>
            <div className="hiw-three-col">
              <div className="hiw-col-item">
                <div className="hiw-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
                </div>
                <h3>Mobile App</h3>
                <p>Citizens report waterlogging with GPS-verified location and severity level. Reports sync instantly — or queue offline and sync when back online.</p>
              </div>
              <div className="hiw-col-item">
                <div className="hiw-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/><line x1="8" y1="2" x2="8" y2="18"/><line x1="16" y1="6" x2="16" y2="22"/></svg>
                </div>
                <h3>Live Map</h3>
                <p>A public heatmap showing all active waterlogging reports. Color-coded by severity — red for high, orange for medium, green for low. No login required.</p>
              </div>
              <div className="hiw-col-item">
                <div className="hiw-col-icon">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
                </div>
                <h3>Push Alerts</h3>
                <p>When someone reports waterlogging near you, you get notified instantly. The system also detects rainfall and proactively asks nearby users to report conditions.</p>
              </div>
            </div>
          </section>

          {/* Reporting flow */}
          <section className="hiw-section">
            <div className="hiw-section-label">02 — Reporting Flow</div>
            <h2>From spotting to alerting in 30 seconds</h2>
            <p>The entire flow from seeing waterlogging to alerting nearby users is almost instant.</p>
            <div className="hiw-flow">
              <div className="hiw-flow-step">
                <div className="hiw-flow-num-wrap">
                  <span className="hiw-flow-num">1</span>
                  <div className="hiw-flow-line" />
                </div>
                <div>
                  <h3>Open the app</h3>
                  <p>Standing in a waterlogged area? Open CIVIX and tap "Report". The app captures your GPS coordinates automatically.</p>
                </div>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-num-wrap">
                  <span className="hiw-flow-num">2</span>
                  <div className="hiw-flow-line" />
                </div>
                <div>
                  <h3>Tag the severity</h3>
                  <p>Select Low, Medium, or High based on water depth. The report is tagged with your location, severity, and timestamp.</p>
                </div>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-num-wrap">
                  <span className="hiw-flow-num">3</span>
                  <div className="hiw-flow-line" />
                </div>
                <div>
                  <h3>Report goes live</h3>
                  <p>The report appears on the public heatmap instantly. A 500m radius zone is drawn around the location. Nearby users get push notifications.</p>
                </div>
              </div>
              <div className="hiw-flow-step">
                <div className="hiw-flow-num-wrap">
                  <span className="hiw-flow-num">4</span>
                </div>
                <div>
                  <h3>Auto-expiry keeps it fresh</h3>
                  <p>Reports expire after 4 hours. "Clear" reports cancel nearby waterlogged ones within 500m. The map always shows what's happening right now.</p>
                </div>
              </div>
            </div>
          </section>

          {/* Authentication */}
          <section className="hiw-section">
            <div className="hiw-section-label">03 — Getting Started</div>
            <h2>Simple, passwordless sign-up</h2>
            <p>No phone number, no social login, no passwords to remember.</p>
            <div className="hiw-auth-flow">
              <div className="hiw-auth-step">
                <span className="hiw-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
                </span>
                <span className="hiw-auth-label">Enter email</span>
              </div>
              <div className="hiw-auth-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
              <div className="hiw-auth-step">
                <span className="hiw-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                </span>
                <span className="hiw-auth-label">Verify OTP</span>
              </div>
              <div className="hiw-auth-arrow">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </div>
              <div className="hiw-auth-step">
                <span className="hiw-auth-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </span>
                <span className="hiw-auth-label">You're in</span>
              </div>
            </div>
            <div className="hiw-features-list" style={{ marginTop: '2rem' }}>
              <div className="hiw-feature-row">
                <h3>Privacy first</h3>
                <p>We only collect your email for authentication. No phone number, no social profiles, no tracking. Your reports appear anonymously on the map — your identity is never shown publicly.</p>
              </div>
            </div>
          </section>

          {/* Smart features */}
          <section className="hiw-section">
            <div className="hiw-section-label">04 — Smart Features</div>
            <h2>Intelligence built in</h2>
            <div className="hiw-smart-grid">
              <div className="hiw-smart-item">
                <div className="hiw-smart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M16.72 11.06A10.94 10.94 0 0119 12.55"/><path d="M5 12.55a10.94 10.94 0 015.17-2.39"/><path d="M10.71 5.05A16 16 0 0122.56 9"/><path d="M1.42 9a15.91 15.91 0 014.7-2.88"/><path d="M8.53 16.11a6 6 0 016.95 0"/><line x1="12" y1="20" x2="12.01" y2="20"/></svg>
                </div>
                <h3>Offline support</h3>
                <p>Reports are saved on your phone and automatically synced when connectivity returns.</p>
              </div>
              <div className="hiw-smart-item">
                <div className="hiw-smart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="10" r="3"/><path d="M12 21.7C17.3 17 20 13 20 10a8 8 0 10-16 0c0 3 2.7 7 8 11.7z"/></svg>
                </div>
                <h3>Location intelligence</h3>
                <p>Reports are geographically indexed using real Earth geometry. You see what's relevant to your area.</p>
              </div>
              <div className="hiw-smart-item">
                <div className="hiw-smart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 16.58A5 5 0 0018 7h-1.26A8 8 0 104 15.25"/><line x1="8" y1="15" x2="8" y2="21"/><line x1="12" y1="13" x2="12" y2="21"/><line x1="16" y1="17" x2="16" y2="21"/></svg>
                </div>
                <h3>Weather detection</h3>
                <p>CIVIX monitors real-time rainfall. When precipitation is detected, you get a notification to report conditions.</p>
              </div>
              <div className="hiw-smart-item">
                <div className="hiw-smart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                </div>
                <h3>Spam protection</h3>
                <p>Daily limits on reports prevent abuse while still letting active citizens contribute.</p>
              </div>
              <div className="hiw-smart-item">
                <div className="hiw-smart-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
                </div>
                <h3>Live aggregation</h3>
                <p>The map aggregates reports by area, showing severity levels and density. Always fresh, always fast.</p>
              </div>
            </div>
          </section>

          {/* CTA */}
          <section className="hiw-bottom-cta">
            <div className="hiw-cta-glow" />
            <h2>Ready to try it?</h2>
            <p>Download the app and start reporting. Or check the live map to see what's happening in your city right now.</p>
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

export default HowItWorksPage;
