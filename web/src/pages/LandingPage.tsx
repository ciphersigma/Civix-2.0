import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import './LandingPage.css';

// Mapbox public access token
mapboxgl.accessToken = process.env.REACT_APP_MAPBOX_TOKEN || '';

const LandingPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    if (!mapContainer.current) return;
    if (map.current) return;

    try {
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: 'mapbox://styles/mapbox/dark-v11',
        center: [0, 0],
        zoom: 2,
        interactive: false
      });

      map.current.on('load', () => {
        // Get user's location
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              const { longitude, latitude } = position.coords;
              map.current?.flyTo({
                center: [longitude, latitude],
                zoom: 11,
                duration: 2000
              });
            },
            () => {
              // Default to a central location if geolocation fails
              map.current?.flyTo({
                center: [77.5946, 12.9716], // Bangalore
                zoom: 11,
                duration: 2000
              });
            }
          );
        }
      });
    } catch (error) {
      console.error('Map initialization error:', error);
    }

    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (map.current && map.current.isStyleLoaded()) {
      map.current.setStyle(isDark ? 'mapbox://styles/mapbox/dark-v11' : 'mapbox://styles/mapbox/light-v11');
    }
  }, [isDark]);

  return (
    <div className={`landing ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg"></div>
      
      <nav className="navbar">
        <div className="container">
          <div className="nav-content">
            <div className="logo">
              <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#10b981"/>
                <path d="M16 8L20 16L16 24L12 16L16 8Z" fill="white"/>
              </svg>
              <span>CIVIX</span>
            </div>
            <div className="nav-menu">
              <a href="#features">Features</a>
              <a href="#how">How it Works</a>
              <a href="#about">About</a>
              <button className="theme-toggle" onClick={() => setIsDark(!isDark)}>
                {isDark ? '☀️' : '🌙'}
              </button>
              <button className="btn-nav">Download App</button>
            </div>
          </div>
        </div>
      </nav>

      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div className="hero-content">
              <div className="badge">
                <span className="dot"></span>
                Real-time monitoring
              </div>
              <h1>The waterlogging alert system your city needs</h1>
              <p>Our crowdsourced platform provides real-time waterlogging alerts, helping you navigate safely during monsoon season with community-powered intelligence.</p>
              <div className="hero-actions">
                <button className="btn-primary">Get Started</button>
                <button className="btn-secondary">Learn More</button>
              </div>
            </div>
            <div className="hero-visual">
              <div className="map-container">
                <div className="map-overlay">
                  <div className="map-marker red" style={{top: '25%', left: '35%'}}>
                    <div className="marker-pulse"></div>
                    <div className="marker-icon">📍</div>
                  </div>
                  <div className="map-marker yellow" style={{top: '45%', left: '60%'}}>
                    <div className="marker-pulse"></div>
                    <div className="marker-icon">📍</div>
                  </div>
                  <div className="map-marker green" style={{top: '65%', left: '40%'}}>
                    <div className="marker-pulse"></div>
                    <div className="marker-icon">📍</div>
                  </div>
                  <div className="map-info">
                    <div className="info-badge">
                      <span className="info-dot"></span>
                      3 Active Alerts
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="features">
        <div className="container">
          <div className="section-head">
            <h2>Access to the future of urban safety</h2>
            <p>Experience AI-driven features, intelligent automation, seamless integrations, and real-time insights. Benefit from a user-friendly interface and top-notch security, boosting your community's safety.</p>
          </div>
          <div className="features-grid">
            <div className="feature-card large green">
              <div className="card-label">Scalability</div>
              <h3>Build scalable safety network with community power</h3>
              <p>Easily scale your resources up or down based on real-time needs without hardware limitations.</p>
            </div>
            <div className="feature-card large map-card">
              <div ref={mapContainer} className="mapbox-container" />
            </div>
            <div className="feature-card dark">
              <div className="success-badge">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="8" fill="#10b981"/>
                  <path d="M5 8L7 10L11 6" stroke="white" strokeWidth="2"/>
                </svg>
                <span>Alert Sent</span>
              </div>
              <h3>Cost-effectiveness</h3>
              <p>Reduce upfront costs with a subscription-based model and only pay for what you use.</p>
            </div>
            <div className="feature-card dark chart">
              <div className="chart-bars">
                {[40, 60, 45, 80, 55, 90, 65, 75, 50, 85, 70, 95].map((h, i) => (
                  <div key={i} className="bar" style={{height: `${h}%`}}></div>
                ))}
              </div>
              <h3>90%</h3>
              <p>Accuracy rate</p>
            </div>
            <div className="feature-card dark users">
              <div className="user-avatars">
                <div className="avatar">👤</div>
                <div className="avatar">👤</div>
                <div className="avatar">👤</div>
                <div className="avatar">+</div>
              </div>
              <p>Our users span across different communities worldwide</p>
            </div>
            <div className="feature-card green">
              <h3>Analytics and Insights</h3>
              <p>Gain valuable insights through built-in analytics tools, allowing for data-driven decision-making and optimization.</p>
            </div>
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-logo">
              <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                <rect width="32" height="32" rx="8" fill="#10b981"/>
                <path d="M16 8L20 16L16 24L12 16L16 8Z" fill="white"/>
              </svg>
              <span>CIVIX</span>
            </div>
            <p>Making communities safer during monsoon season.</p>
            <div className="footer-bottom">
              <p>© 2024 CIVIX. All rights reserved.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
