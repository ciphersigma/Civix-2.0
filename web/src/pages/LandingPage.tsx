import React, { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLang } from '../contexts/LanguageContext';
import './LandingPage.css';

const MAPBOX_TOKEN = process.env.REACT_APP_MAPBOX_TOKEN || '';

const LandingPage: React.FC = () => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [isDark, setIsDark] = useState(false);
  const { t } = useLang();

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
              <span>{t('heroBadge')}</span>
            </div>
            <h1>
              {t('heroTitle1')}<br />
              <span className="gradient-text">{t('heroTitle2')}</span>
            </h1>
            <p className="hero-sub">{t('heroSub')}</p>
            <div className="hero-actions">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t('downloadAndroid')}
              </a>
              <a href="/how-it-works" className="btn-secondary btn-lg">{t('seeHow')}</a>
            </div>
          </div>

          {/* Hero visual — just the live map */}
          <div className="hero-map-wrap fade-up delay-2">
            <div className="hero-map-frame">
              {MAPBOX_TOKEN ? (
                <div ref={mapContainer} className="mapbox-container" />
              ) : (
                <div className="map-fallback">
                  <p>{t('mapLoading')}</p>
                </div>
              )}
              <div className="map-legend">
                <div className="legend-item"><span className="legend-dot red"/>{t('legendSevere')}</div>
                <div className="legend-item"><span className="legend-dot yellow"/>{t('legendModerate')}</div>
                <div className="legend-item"><span className="legend-dot green"/>{t('legendClear')}</div>
              </div>
              <div className="hero-map-tag">
                <span className="hero-map-live-dot" />
                {t('liveFromCity')}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features — editorial layout ── */}
      <section className="features" id="features">
        <div className="container">
          <div className="section-head fade-up">
            <div className="section-badge">{t('whatCivixDoes')}</div>
            <h2>{t('builtForChaos')}<br /><span className="gradient-text">{t('indianMonsoons')}</span></h2>
            <p className="section-sub">{t('featSectionSub')}</p>
          </div>

          {/* Feature rows — alternating text/visual */}
          <div className="feat-rows fade-up">
            <div className="feat-row">
              <div className="feat-text">
                <span className="feat-label">{t('alertsThatMatter')}</span>
                <h3>{t('knowBeforeStepOut')}</h3>
                <p>{t('knowBeforeDesc')}</p>
                <div className="feat-proof">
                  <span className="feat-proof-num">~30s</span>
                  <span className="feat-proof-desc">{t('avgReportToAlert')}</span>
                </div>
              </div>
              <div className="feat-visual feat-visual-alerts">
                <div className="feat-alert-feed">
                  <div className="feat-alert-item feat-alert-1">
                    <div className="feat-alert-severity severe" />
                    <div className="feat-alert-body">
                      <span className="feat-alert-location">MG Road, Ahmedabad</span>
                      <span className="feat-alert-time">{t('fbJustNow')}</span>
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
                <span className="feat-label">{t('liveHeatmap')}</span>
                <h3>{t('seeCityLikeLocals')}</h3>
                <p>{t('seeCityDesc')}</p>
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
                <span className="feat-label">{t('crowdsourced')}</span>
                <h3>{t('crowdsourcedOneTap')}</h3>
                <p>{t('crowdsourcedDesc')}</p>
                <div className="feat-proof">
                  <span className="feat-proof-num">4hr</span>
                  <span className="feat-proof-desc">{t('autoExpiryKeepsFresh')}</span>
                </div>
              </div>
              <div className="feat-visual feat-visual-crowd">
                <div className="feat-report-demo">
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg></span>
                    <div>
                      <span className="feat-report-action">{t('gpsLocationCaptured')}</span>
                      <span className="feat-report-detail">Lat 23.0225, Lng 72.5714</span>
                    </div>
                  </div>
                  <div className="feat-report-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </div>
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>
                    <div>
                      <span className="feat-report-action">{t('severityTagged')}</span>
                      <span className="feat-report-detail">{t('highKneeDeep')}</span>
                    </div>
                  </div>
                  <div className="feat-report-arrow">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19 12 12 19 5 12"/></svg>
                  </div>
                  <div className="feat-report-step">
                    <span className="feat-report-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg></span>
                    <div>
                      <span className="feat-report-action">{t('liveOnMap')}</span>
                      <span className="feat-report-detail">{t('nearbyUsersAlerted')}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom capabilities — inline with subtle icons */}
          <div className="feat-caps fade-up">
            {[
              { title: t('offlineMode'), desc: t('offlineModeDesc') },
              { title: t('gpsVerified'), desc: t('gpsVerifiedDesc') },
              { title: t('autoExpiry'), desc: t('autoExpiryDesc') },
              { title: t('worksAnywhere'), desc: t('worksAnywhereDesc') },
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
            <div className="section-badge">{t('howItWorksBadge')}</div>
            <h2>{t('threeStepsTo')} <span className="gradient-text">{t('saferCommutes')}</span></h2>
          </div>
          <div className="steps-stack fade-up">
            <div className="step-item">
              <div className="step-num">01</div>
              <div className="step-content">
                <h3>{t('step1Title')}</h3>
                <p>{t('step1Desc')}</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-item">
              <div className="step-num">02</div>
              <div className="step-content">
                <h3>{t('step2Title')}</h3>
                <p>{t('step2Desc')}</p>
              </div>
              <div className="step-connector" />
            </div>
            <div className="step-item">
              <div className="step-num">03</div>
              <div className="step-content">
                <h3>{t('step3Title')}</h3>
                <p>{t('step3Desc')}</p>
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
              <span className="contrast-tag">{t('withoutCivix')}</span>
              <p>{t('withoutCivixDesc')}</p>
            </div>
            <div className="contrast-divider" />
            <div className="contrast-col contrast-with">
              <span className="contrast-tag">{t('withCivix')}</span>
              <p>{t('withCivixDesc')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── Download CTA — clean ── */}
      <section className="cta-section" id="download">
        <div className="container">
          <div className="cta-clean fade-up">
            <h2>{t('ctaTitle')}<br /><span className="gradient-text">{t('ctaSub')}</span></h2>
            <p className="cta-sub">{t('downloadAndroid')}</p>
            <div className="cta-actions">
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="btn-primary btn-lg">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t('downloadAndroid')}
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
              <div className="section-badge">{t('faqBadge')}</div>
              <h2>{t('faqTitle')}<br /><span className="gradient-text">{t('faqTitleGradient')}</span></h2>
            </div>
            <div className="faq-list">
              {[
                { q: t('faq1q'), a: t('faq1a') },
                { q: t('faq2q'), a: t('faq2a') },
                { q: t('faq3q'), a: t('faq3a') },
                { q: t('faq4q'), a: t('faq4a') },
                { q: t('faq5q'), a: t('faq5a') },
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
