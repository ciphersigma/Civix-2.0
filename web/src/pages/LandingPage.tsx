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
        center: [72.5714, 23.0225],
        zoom: 11,
        interactive: false,
      });
      // Try to center on user's city
      navigator.geolocation?.getCurrentPosition(
        (pos) => {
          map.current?.flyTo({ center: [pos.coords.longitude, pos.coords.latitude], zoom: 11, duration: 1500 });
        },
        () => {}
      );
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
            <a href="/about" onClick={() => setMobileMenu(false)}>About</a>
            <a href="/contact" onClick={() => setMobileMenu(false)}>Contact</a>
            <a href="/live-map" onClick={() => setMobileMenu(false)}>Live Map</a>
            <a href="#download" className="btn-nav" onClick={() => setMobileMenu(false)}>Get the App</a>
            <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>{isDark ? '☀️' : '🌙'}</button>
          </div>
          <button className="hamburger" onClick={() => setMobileMenu(!mobileMenu)}>
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Hero — centered, full-width ── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="container">
          <div className="hero-center fade-up">
            <h1>
              Don't get caught in the<br />
              <span className="gradient-text">flood. Get ahead of it.</span>
            </h1>
            <p className="hero-sub">CIVIX is a crowdsourced platform that delivers real-time waterlogging alerts, helping citizens and city authorities navigate monsoon season safely.</p>
            <div className="hero-actions">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg"><span className="btn-icon">📱</span> Download for Android</a>
              <a href="#how" className="btn-secondary btn-lg">See How it Works →</a>
            </div>
          </div>

          {/* Inline stats strip */}
          <div className="hero-stats fade-up delay-1">
            <div className="hero-stat" ref={stat1.ref}>
              <span className="hero-stat-num">{stat1.count.toLocaleString()}+</span>
              <span className="hero-stat-label">Active Users</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat" ref={stat2.ref}>
              <span className="hero-stat-num">{stat2.count}%</span>
              <span className="hero-stat-label">Alert Accuracy</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat" ref={stat3.ref}>
              <span className="hero-stat-num">{stat3.count}+</span>
              <span className="hero-stat-label">Cities Covered</span>
            </div>
            <div className="hero-stat-divider" />
            <div className="hero-stat" ref={stat4.ref}>
              <span className="hero-stat-num">{stat4.count}/7</span>
              <span className="hero-stat-label">Always On</span>
            </div>
          </div>

          {/* Phone + Map side by side showcase */}
          <div className="hero-showcase fade-up delay-2">
            <div className="showcase-phone">
              <div className="phone-mockup">
                <div className="phone-notch" />
                <div className="phone-screen">
                  <div className="phone-header">
                    <span className="phone-title">🌊 CIVIX</span>
                    <span className="phone-status">Live</span>
                  </div>
                  <div className="phone-map-placeholder">
                    <div className="map-marker red" style={{top:'28%',left:'32%'}}><div className="marker-pulse"/><span>📍</span></div>
                    <div className="map-marker yellow" style={{top:'52%',left:'65%'}}><div className="marker-pulse"/><span>📍</span></div>
                    <div className="map-marker green" style={{top:'72%',left:'40%'}}><div className="marker-pulse"/><span>📍</span></div>
                  </div>
                  <div className="phone-alert">
                    <div className="alert-icon">⚠️</div>
                    <div><strong>High Alert</strong><br/><span>MG Road — Severe waterlogging</span></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="showcase-map">
              {MAPBOX_TOKEN ? (
                <div ref={mapContainer} className="mapbox-container" />
              ) : (
                <div className="map-fallback">
                  <span>🗺️</span>
                  <p>Live map preview — Mumbai</p>
                </div>
              )}
              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot red"/>High</div>
                <div className="legend-item"><span className="legend-dot yellow"/>Medium</div>
                <div className="legend-item"><span className="legend-dot green"/>Low</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Bento Features Grid ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">Features</div>
            <h2>Everything you need for<br /><span className="gradient-text">urban flood safety</span></h2>
          </div>
          <div className="bento-grid fade-up">
            {/* Large card */}
            <div className="bento-card bento-large">
              <div className="bento-icon" style={{background:'rgba(99,102,241,0.1)',color:'#818cf8'}}>📡</div>
              <h3>Real-time Alerts</h3>
              <p>Get instant push notifications the moment waterlogging is reported near your location. Know before you step out.</p>
              <div className="bento-visual">
                <div className="notif-stack">
                  <div className="notif-item notif-1">
                    <span className="notif-dot" style={{background:'#ef4444'}}/>
                    <div><strong>Severe Flooding</strong><span>MG Road, 5 min ago</span></div>
                  </div>
                  <div className="notif-item notif-2">
                    <span className="notif-dot" style={{background:'#f59e0b'}}/>
                    <div><strong>Moderate Alert</strong><span>Andheri West, 12 min ago</span></div>
                  </div>
                  <div className="notif-item notif-3">
                    <span className="notif-dot" style={{background:'#10b981'}}/>
                    <div><strong>Cleared</strong><span>Bandra Station, 30 min ago</span></div>
                  </div>
                </div>
              </div>
            </div>

            {/* Small cards */}
            <div className="bento-card bento-small">
              <div className="bento-icon" style={{background:'rgba(245,158,11,0.1)',color:'#f59e0b'}}>🗺️</div>
              <h3>Live Heatmap</h3>
              <p>Interactive map with severity zones. Plan your route around danger areas in real-time.</p>
            </div>
            <div className="bento-card bento-small">
              <div className="bento-icon" style={{background:'rgba(16,185,129,0.1)',color:'#10b981'}}>👥</div>
              <h3>Community Reports</h3>
              <p>Citizens report waterlogging with one tap. Crowdsourced data means faster, more accurate coverage.</p>
            </div>
            <div className="bento-card bento-small">
              <div className="bento-icon" style={{background:'rgba(236,72,153,0.1)',color:'#ec4899'}}>📊</div>
              <h3>Analytics Dashboard</h3>
              <p>City authorities get trends, hotspot analysis, and historical data to plan infrastructure better.</p>
            </div>
            <div className="bento-card bento-small">
              <div className="bento-icon" style={{background:'rgba(20,184,166,0.1)',color:'#14b8a6'}}>📱</div>
              <h3>Works Offline</h3>
              <p>Reports are stored locally and sync automatically when connectivity is restored.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── How it Works — horizontal timeline ── */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">How it Works</div>
            <h2>Three steps to <span className="gradient-text">safer commutes</span></h2>
          </div>
          <div className="timeline fade-up">
            <div className="timeline-line" />
            {[
              { num: '1', icon: '📲', title: 'Download & Sign Up', desc: 'Get the CIVIX app. Create your account with just your phone number — quick Firebase OTP gets you started in seconds.' },
              { num: '2', icon: '📍', title: 'Report Waterlogging', desc: 'See waterlogging? One tap to report it. Your GPS location and severity rating are shared with the community instantly.' },
              { num: '3', icon: '🛡️', title: 'Stay Safe & Informed', desc: 'Receive real-time notifications. View the live heatmap. Plan safe routes. Help your city respond faster.' },
            ].map((s, i) => (
              <div key={i} className="timeline-step" style={{ animationDelay: `${i * 0.2}s` }}>
                <div className="timeline-dot"><span>{s.num}</span></div>
                <div className="timeline-card">
                  <div className="timeline-icon">{s.icon}</div>
                  <h3>{s.title}</h3>
                  <p>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Before / After comparison ── */}
      <section className="compare-section" id="stats">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">Impact</div>
            <h2>Monsoon commute, <span className="gradient-text">reimagined</span></h2>
          </div>
          <div className="compare-grid fade-up">
            <div className="compare-card compare-before">
              <div className="compare-label">Without CIVIX</div>
              <ul>
                <li><span className="compare-x">✕</span> No warning before stepping out</li>
                <li><span className="compare-x">✕</span> Stuck in knee-deep water</li>
                <li><span className="compare-x">✕</span> No idea which roads are flooded</li>
                <li><span className="compare-x">✕</span> Authorities react after damage</li>
                <li><span className="compare-x">✕</span> Isolated, no community data</li>
              </ul>
            </div>
            <div className="compare-vs">VS</div>
            <div className="compare-card compare-after">
              <div className="compare-label">With CIVIX</div>
              <ul>
                <li><span className="compare-check">✓</span> Real-time alerts before you leave</li>
                <li><span className="compare-check">✓</span> Live heatmap to plan safe routes</li>
                <li><span className="compare-check">✓</span> Community-powered flood data</li>
                <li><span className="compare-check">✓</span> Authorities respond proactively</li>
                <li><span className="compare-check">✓</span> 1,200+ citizens contributing daily</li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="testimonials-section">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">What People Say</div>
            <h2>Loved by communities <span className="gradient-text">across India</span></h2>
          </div>
          <div className="testimonials-grid fade-up">
            {[
              { name: 'Rahul M.', role: 'Daily Commuter, Mumbai', text: 'CIVIX saved me from getting stuck in knee-deep water twice this monsoon. The alerts are incredibly timely and accurate.', avatar: '👨' },
              { name: 'Priya S.', role: 'City Planner, Bangalore', text: 'The admin dashboard gives us actionable data on waterlogging hotspots. It has transformed how we plan drainage infrastructure.', avatar: '👩' },
              { name: 'Amit K.', role: 'Delivery Driver, Delhi', text: 'I check the live map before every delivery run during rains. It helps me avoid flooded streets and stay on schedule.', avatar: '🧑' },
            ].map((t, i) => (
              <div key={i} className="testimonial-card" style={{ animationDelay: `${i * 0.1}s` }}>
                <div className="testimonial-quote">"</div>
                <p>{t.text}</p>
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

      {/* ── Tech Stack strip ── */}
      <section className="tech-section fade-up">
        <div className="container">
          <p className="tech-label">Built with</p>
          <div className="tech-strip">
            {['React Native', 'Node.js', 'PostgreSQL', 'PostGIS', 'Mapbox', 'Firebase', 'Vercel'].map((t, i) => (
              <span key={i} className="tech-tag">{t}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Download CTA ── */}
      <section className="cta-section" id="download">
        <div className="container">
          <div className="cta-card fade-up">
            <div className="cta-content">
              <h2>Ready to stay safe<br />this monsoon?</h2>
              <p>Download CIVIX and join thousands of citizens making their cities safer. Free, open-source, and available for Android.</p>
              <div className="cta-actions">
                <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg">
                  <span className="btn-icon">📱</span> Download for Android
                </a>
                <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer" className="btn-secondary btn-lg">
                  ⭐ Star on GitHub
                </a>
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
              <a href="/live-map">Live Map</a>
              <a href="/about">About Us</a>
              <a href="/contact">Contact Us</a>
            </div>
            <div className="footer-links">
              <h4>Connect</h4>
              <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer">GitHub</a>
              <a href="#download">Android App</a>
              <a href="mailto:prashantchettiyar@ieee.org">Email</a>
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
