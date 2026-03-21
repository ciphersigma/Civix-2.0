import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './LandingPage.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

const LandingPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDark, setIsDark] = useState(false);

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

  return (
    <div className={`landing ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />

      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-glow hero-glow-1" />
        <div className="hero-glow hero-glow-2" />
        <div className="hero-glow hero-glow-3" />
        <div className="hero-mesh" />
        <div className="container">
          <div className="hero-center fade-up">
            <div className="hero-badge">
              <span className="hero-badge-dot" />
              <span>Real-time flood intelligence for Indian cities</span>
            </div>
            <h1>
              Don't get caught in the<br />
              <span className="gradient-text">flood. Get ahead of it.</span>
            </h1>
            <p className="hero-sub">CIVIX is a crowdsourced platform that delivers real-time waterlogging alerts, helping citizens and city authorities navigate monsoon season safely.</p>
            <div className="hero-actions">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download for Android
              </a>
              <a href="#how" className="btn-secondary btn-lg">See How it Works →</a>
            </div>
          </div>

          {/* Hero visual — just the live map */}
          <div className="hero-map-wrap fade-up delay-2">
            <div className="hero-map-frame">
              {MAPBOX_TOKEN ? (
                <div ref={mapContainer} className="mapbox-container" />
              ) : (
                <div className="map-fallback">
                  <p>Live map — loading</p>
                </div>
              )}
              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot red"/>Severe</div>
                <div className="legend-item"><span className="legend-dot yellow"/>Moderate</div>
                <div className="legend-item"><span className="legend-dot green"/>Clear</div>
              </div>
              <div className="hero-map-tag">
                <span className="hero-map-live-dot" />
                Live from your city
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features — editorial layout ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">What CIVIX does</div>
            <h2>Built for the chaos of<br /><span className="gradient-text">Indian monsoons</span></h2>
            <p className="section-sub">Not another weather app. CIVIX is a ground-level intelligence network powered by the people who actually walk those streets.</p>
          </div>

          {/* Feature rows — alternating text/visual */}
          <div className="feat-rows fade-up">
            <div className="feat-row">
              <div className="feat-text">
                <span className="feat-label">Alerts that matter</span>
                <h3>Know before you step out</h3>
                <p>When someone reports waterlogging near you, you get a push notification within seconds. Not a forecast — an actual report from someone standing in the water right now.</p>
                <div className="feat-proof">
                  <span className="feat-proof-num">~30s</span>
                  <span className="feat-proof-desc">average time from report to alert</span>
                </div>
              </div>
              <div className="feat-visual feat-visual-alerts">
                <div className="feat-alert-feed">
                  <div className="feat-alert-item feat-alert-1">
                    <div className="feat-alert-severity severe" />
                    <div className="feat-alert-body">
                      <span className="feat-alert-location">MG Road, Ahmedabad</span>
                      <span className="feat-alert-time">just now</span>
                    </div>
                  </div>
                  <div className="feat-alert-item feat-alert-2">
                    <div className="feat-alert-severity moderate" />
                    <div className="feat-alert-body">
                      <span className="feat-alert-location">Andheri West, Mumbai</span>
                      <span className="feat-alert-time">4 min ago</span>
                    </div>
                  </div>
                  <div className="feat-alert-item feat-alert-3">
                    <div className="feat-alert-severity low" />
                    <div className="feat-alert-body">
                      <span className="feat-alert-location">Bandra Station</span>
                      <span className="feat-alert-time">12 min ago</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="feat-row feat-row-reverse">
              <div className="feat-text">
                <span className="feat-label">Live heatmap</span>
                <h3>See the city like locals see it</h3>
                <p>Color-coded severity zones updated in real-time. Red means avoid, yellow means caution, green means clear. Plan your route before the auto driver refuses to go.</p>
              </div>
              <div className="feat-visual feat-visual-map">
                <div className="feat-map-mock">
                  <div className="feat-map-zone feat-zone-red" />
                  <div className="feat-map-zone feat-zone-yellow" />
                  <div className="feat-map-zone feat-zone-green" />
                  <div className="feat-map-grid" />
                  <div className="feat-map-pin pin-1"><span /></div>
                  <div className="feat-map-pin pin-2"><span /></div>
                  <div className="feat-map-pin pin-3"><span /></div>
                </div>
              </div>
            </div>

            <div className="feat-row">
              <div className="feat-text">
                <span className="feat-label">Crowdsourced</span>
                <h3>Crowdsourced. One tap to report.</h3>
                <p>No government sensor needed. Citizens report waterlogging with GPS-verified location and severity. The more people report, the smarter the system gets.</p>
                <div className="feat-proof">
                  <span className="feat-proof-num">4hr</span>
                  <span className="feat-proof-desc">auto-expiry keeps data fresh</span>
                </div>
              </div>
              <div className="feat-visual feat-visual-crowd">
                <div className="feat-report-demo">
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                    <div>
                      <span className="feat-report-action">GPS location captured</span>
                      <span className="feat-report-detail">Lat 23.0225, Lng 72.5714</span>
                    </div>
                  </div>
                  <div className="feat-report-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </div>
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                    <div>
                      <span className="feat-report-action">Severity tagged</span>
                      <span className="feat-report-detail">High — knee-deep water</span>
                    </div>
                  </div>
                  <div className="feat-report-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </div>
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    <div>
                      <span className="feat-report-action">Live on the map</span>
                      <span className="feat-report-detail">Nearby users alerted instantly</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom capabilities — inline with subtle icons */}
          <div className="feat-caps fade-up">
            {[
              { title: 'Offline mode', desc: 'Reports sync when you\'re back online' },
              { title: 'GPS verified', desc: 'Location-accurate, tamper-proof reports' },
              { title: 'Auto-expiry', desc: 'Stale reports clear after 4 hours' },
              { title: 'Works anywhere', desc: 'GPS-based — no city restrictions' },
            ].map((cap, i) => (
              <div key={i} className="feat-cap">
                <h4>{cap.title}</h4>
                <p>{cap.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it Works — stacked steps ── */}
      <section className="how-section" id="how">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">How it Works</div>
            <h2>Three steps to <span className="gradient-text">safer commutes</span></h2>
          </div>
          <div className="steps-stack fade-up">
            <div className="step-item">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>Download & sign up</h3>
                <p>Get the CIVIX app. Verify with your email OTP — takes about 30 seconds. No phone number, no social login, no nonsense.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-item">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>Report what you see</h3>
                <p>Standing in water? One tap. Your GPS location and severity rating go live instantly. The community sees it in real-time.</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-item">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>Stay ahead of the flood</h3>
                <p>Get alerts before you leave home. Check the live heatmap. Pick a dry route. Help your city respond faster.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Before / After — simple text contrast ── */}
      <section className="contrast-section" id="stats">
        <div className="container">
          <div className="contrast-layout fade-up">
            <div className="contrast-col contrast-without">
              <span className="contrast-tag">Without CIVIX</span>
              <p>You step out, it's flooded. No one warned you. You're stuck. The municipal corporation finds out three days later from a newspaper photo.</p>
            </div>
            <div className="contrast-divider" />
            <div className="contrast-col contrast-with">
              <span className="contrast-tag">With CIVIX</span>
              <p>Someone two streets away reports waterlogging. You get an alert before you leave. You check the heatmap, take a different route, and reach on time. The city sees the data in real-time.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Download CTA — clean ── */}
      <section className="cta-section" id="download">
        <div className="container">
          <div className="cta-clean fade-up">
            <h2>Monsoon season doesn't wait.<br /><span className="gradient-text">Neither should you.</span></h2>
            <p className="cta-sub">Download CIVIX and join the citizens making their cities safer. Free. No ads. Available for Android.</p>
            <div className="cta-actions">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                Download for Android
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ — accordion style ── */}
      <section className="faq-section" id="faq">
        <div className="container">
          <div className="faq-layout fade-up">
            <div className="faq-left">
              <div className="section-badge">FAQ</div>
              <h2>Common<br /><span className="gradient-text">questions</span></h2>
            </div>
            <div className="faq-list">
              {[
                { q: 'Is CIVIX free?', a: 'Yes. No ads, no premium tiers, no catch. It\'s a civic tech project built to help people.' },
                { q: 'How accurate are the reports?', a: 'Every report is GPS-verified. Stale data auto-expires after 4 hours so you only see what\'s happening right now.' },
                { q: 'Does it work offline?', a: 'Yes. Reports save locally and sync automatically when you\'re back online.' },
                { q: 'Which cities does it cover?', a: 'Anywhere with GPS. We started in Ahmedabad and have active users in 50+ Indian cities.' },
                { q: 'Is my data private?', a: 'We only collect location when you submit a report. No tracking, no data selling. Email is used only for login.' },
              ].map((faq, i) => (
                <details key={i} className="faq-item">
                  <summary>{faq.q}</summary>
                  <p>{faq.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      <Footer isDark={isDark} />
    </div>
  );
};

export default LandingPage;
