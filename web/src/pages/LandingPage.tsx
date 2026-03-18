import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LandingPage.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

const useCountUp = (end: number, duration = 2000) => {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      let start = 0;
      const step = end / (duration / 16);
      const timer = setInterval(() => {
        start += step;
        if (start >= end) { setCount(end); clearInterval(timer); }
        else setCount(Math.floor(start));
      }, 16);
      observer.disconnect();
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [end, duration]);
  return { count, ref };
};

const LandingPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDark, setIsDark] = useState(true);
  const [mobileMenu, setMobileMenu] = useState(false);

  const stat1 = useCountUp(1200);
  const stat2 = useCountUp(98);
  const stat3 = useCountUp(50);
  const stat4 = useCountUp(24);

  useEffect(() => {
    if (!mapContainer.current || !MAPBOX_TOKEN) return;
    mapboxgl.accessToken = MAPBOX_TOKEN;
    if (map.current) return;
    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11',
        center: [77.5946, 12.9716],
        zoom: 11,
        interactive: false,
      });
    } catch (e) { console.error(e); }
    return () => { map.current?.remove(); map.current = null; };
  }, []); // eslint-disable-line

  useEffect(() => {
    if (map.current?.isStyleLoaded()) {
      map.current.setStyle(isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
    }
  }, [isDark]);

  const Logo = () => (
    <img src="/logo.png" alt="CIVIX" style={{ width: 32, height: 32, borderRadius: 8 }} />
  );

  return (
    <div className={`landing ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="container nav-content">
          <div className="logo"><Logo /><span>CIVIX</span></div>
          <div className={`nav-menu ${mobileMenu ? 'open' : ''}`}>
            <a href="#features" onClick={() => setMobileMenu(false)}>Features</a>
            <a href="#how" onClick={() => setMobileMenu(false)}>How it Works</a>
            <a href="#stats" onClick={() => setMobileMenu(false)}>Impact</a>
            <a href="#download" onClick={() => setMobileMenu(false)}>Download</a>
            <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>{isDark ? '☀️' : '🌙'}</button>
          </div>
          <button className="hamburger" onClick={() => setMobileMenu(!mobileMenu)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content fade-up">
              <div className="badge"><span className="dot" />Real-time monitoring</div>
              <h1>Smart waterlogging alerts for safer cities</h1>
              <p>CIVIX is a crowdsourced platform that delivers real-time waterlogging alerts, helping citizens and authorities navigate monsoon season with community-powered intelligence and AI-driven insights.</p>
              <div className="hero-actions">
                <a href="#download" className="btn-primary">Download App</a>
                <a href="#how" className="btn-secondary">See How it Works</a>
              </div>
              <div className="hero-trust">
                <div className="trust-avatars">
                  {['🧑','👩','👨','👩‍💻','🧑‍🔬'].map((e,i) => <span key={i} className="trust-av" style={{animationDelay:`${i*0.1}s`}}>{e}</span>)}
                </div>
                <span className="trust-text">Trusted by <strong>1,200+</strong> users across India</span>
              </div>
            </div>
            <div className="hero-visual fade-up delay-1">
              <div className="phone-mockup">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div className="phone-header">
                    <span className="phone-title">🌊 CIVIX</span>
                    <span className="phone-status">● Live</span>
                  </div>
                  <div className="phone-map-placeholder">
                    <div className="map-marker red" style={{top:'30%',left:'35%'}}><div className="marker-pulse"/><span>📍</span></div>
                    <div className="map-marker yellow" style={{top:'50%',left:'62%'}}><div className="marker-pulse"/><span>📍</span></div>
                    <div className="map-marker green" style={{top:'70%',left:'42%'}}><div className="marker-pulse"/><span>📍</span></div>
                  </div>
                  <div className="phone-alert">
                    <div className="alert-icon">⚠️</div>
                    <div><strong>High Alert</strong><br/><span>MG Road — Severe waterlogging</span></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">Features</div>
            <h2>Everything you need for urban flood safety</h2>
            <p>From real-time alerts to predictive analytics, CIVIX equips communities and city authorities with the tools to stay ahead of waterlogging.</p>
          </div>
          <div className="features-grid">
            {[
              { icon: '📡', title: 'Real-time Alerts', desc: 'Get instant push notifications when waterlogging is reported near you. Stay informed before you step out.', color: '#ef4444' },
              { icon: '🗺️', title: 'Live Heatmap', desc: 'Interactive map showing active waterlogging zones with severity levels. Plan your route around danger areas.', color: '#f59e0b' },
              { icon: '👥', title: 'Community Reports', desc: 'Citizens report waterlogging with one tap. Crowdsourced data means faster, more accurate coverage.', color: '#10b981' },
              { icon: '📊', title: 'Analytics Dashboard', desc: 'City authorities get a powerful admin dashboard with trends, hotspot analysis, and historical data.', color: '#6366f1' },
              { icon: '🔔', title: 'Smart Notifications', desc: 'Location-based alerts that only notify you about waterlogging in areas that matter to you.', color: '#ec4899' },
              { icon: '📱', title: 'Works Offline', desc: 'Reports are stored locally and sync automatically when connectivity is restored. Never miss a report.', color: '#14b8a6' },
            ].map((f, i) => (
              <div key={i} className="feature-card fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="feature-icon" style={{ background: `${f.color}15`, color: f.color }}>{f.icon}</div>
                <h3>{f.title}</h3>
                <p>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works ── */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">How it Works</div>
            <h2>Three simple steps to safer commutes</h2>
            <p>CIVIX makes it effortless for anyone to contribute to and benefit from real-time waterlogging data.</p>
          </div>
          <div className="steps-grid">
            {[
              { num: '01', icon: '📲', title: 'Download & Sign Up', desc: 'Get the CIVIX app and create your account with just your phone number. Quick OTP verification gets you started in seconds.' },
              { num: '02', icon: '📍', title: 'Report Waterlogging', desc: 'See waterlogging? One tap to report it. Your GPS location and severity rating are shared with the community instantly.' },
              { num: '03', icon: '🔔', title: 'Get Alerts & Stay Safe', desc: 'Receive real-time notifications about waterlogging near you. View the live map to plan safe routes during monsoon.' },
            ].map((s, i) => (
              <div key={i} className="step-card fade-up" style={{ animationDelay: `${i * 0.15}s` }}>
                <div className="step-num">{s.num}</div>
                <div className="step-icon">{s.icon}</div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Live Map ── */}
      <section className="map-section">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">Live Map</div>
            <h2>See waterlogging reports in real-time</h2>
            <p>Our interactive map aggregates community reports to give you a live view of waterlogging across your city.</p>
          </div>
          <div className="map-wrapper fade-up">
            {MAPBOX_TOKEN ? (
              <div ref={mapContainer} className="mapbox-container" />
            ) : (
              <div className="map-fallback">
                <span>🗺️</span>
                <p>Live map preview</p>
              </div>
            )}
            <div className="map-legend">
              <div className="legend-item"><span className="legend-dot red"/>High Severity</div>
              <div className="legend-item"><span className="legend-dot yellow"/>Medium</div>
              <div className="legend-item"><span className="legend-dot green"/>Low / Cleared</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section className="stats-section" id="stats">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-card fade-up" ref={stat1.ref}>
              <div className="stat-number">{stat1.count.toLocaleString()}+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-card fade-up" ref={stat2.ref}>
              <div className="stat-number">{stat2.count}%</div>
              <div className="stat-label">Alert Accuracy</div>
            </div>
            <div className="stat-card fade-up" ref={stat3.ref}>
              <div className="stat-number">{stat3.count}+</div>
              <div className="stat-label">Cities Covered</div>
            </div>
            <div className="stat-card fade-up" ref={stat4.ref}>
              <div className="stat-number">{stat4.count}/7</div>
              <div className="stat-label">Always Monitoring</div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">What People Say</div>
            <h2>Loved by communities across India</h2>
          </div>
          <div className="testimonials-grid">
            {[
              { name: 'Rahul M.', role: 'Daily Commuter, Mumbai', text: 'CIVIX saved me from getting stuck in knee-deep water twice this monsoon. The alerts are incredibly timely.', avatar: '👨' },
              { name: 'Priya S.', role: 'City Planner, Bangalore', text: 'The admin dashboard gives us actionable data on waterlogging hotspots. It has transformed how we plan drainage work.', avatar: '👩' },
              { name: 'Amit K.', role: 'Delivery Driver, Delhi', text: 'I check the live map before every delivery run during rains. It helps me avoid flooded streets and stay on schedule.', avatar: '🧑' },
            ].map((t, i) => (
              <div key={i} className="testimonial-card fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="testimonial-stars">{'★★★★★'}</div>
                <p>"{t.text}"</p>
                <div className="testimonial-author">
                  <span className="testimonial-avatar">{t.avatar}</span>
                  <div>
                    <strong>{t.name}</strong>
                    <span>{t.role}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="cta-section" id="download">
        <div className="container">
          <div className="cta-card fade-up">
            <div className="cta-content">
              <h2>Ready to stay safe this monsoon?</h2>
              <p>Download CIVIX and join thousands of citizens making their cities safer. Available for Android now.</p>
              <div className="cta-actions">
                <button className="btn-primary btn-lg">
                  <span className="btn-icon">📱</span> Download for Android
                </button>
              </div>
            </div>
            <div className="cta-visual">
              <div className="cta-glow" />
              <span className="cta-emoji">🌊</span>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="container">
          <div className="footer-grid">
            <div className="footer-brand">
              <div className="footer-logo"><Logo /><span>CIVIX</span></div>
              <p>Making communities safer during monsoon season through crowdsourced intelligence and real-time alerts.</p>
            </div>
            <div className="footer-links">
              <h4>Product</h4>
              <a href="#features">Features</a>
              <a href="#how">How it Works</a>
              <a href="#download">Download</a>
              <a href="#stats">Impact</a>
            </div>
            <div className="footer-links">
              <h4>Platform</h4>
              <a href="#features">Analytics</a>
              <a href="#features">Live Map</a>
            </div>
            <div className="footer-links">
              <h4>Connect</h4>
              <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer">GitHub</a>
              <a href="#download">Android App</a>
              <a href="mailto:support@civix.app">Contact</a>
            </div>
          </div>
          <div className="footer-bottom">
            <p>© 2025 CIVIX. Built with ❤️ for safer cities.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
