import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLang } from '../contexts/LanguageContext';
import './StaticPages.css';
import './AboutPage.css';

const AboutPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const { t } = useLang();

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="about-wrap">

          {/* Hero — left aligned, editorial */}
          <section className="about-hero">
            <span className="about-eyebrow">{t('aboutEyebrow')}</span>
            <h1>{t('aboutHeroTitle1')}<br />{t('aboutHeroTitle2')} <span className="sp-gradient-text">{t('aboutHeroTitle3')}</span></h1>
            <p className="about-hero-lead">{t('aboutHeroLead')}</p>
          </section>

          {/* Two-column story */}
          <section className="about-story-section">
            <div className="about-col-left">
              <h2>{t('aboutStoryTitle')}</h2>
              <p>{t('aboutStoryP1')}</p>
              <p>{t('aboutStoryP2')}</p>
            </div>
            <div className="about-col-right">
              <div className="about-pull-quote">
                <span className="about-pq-mark">"</span>
                <p>{t('aboutPullQuote')}</p>
              </div>
            </div>
          </section>

          {/* What we built — flowing prose, not cards */}
          <section className="about-what">
            <h2>{t('aboutWhatTitle')}</h2>
            <p>{t('aboutWhatP1')}</p>
            <p>{t('aboutWhatP2')}</p>

            <div className="about-stats-inline">
              <div className="about-stat">
                <span className="about-stat-val">{t('aboutStat1Val')}</span>
                <span className="about-stat-desc">{t('aboutStat1Desc')}</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">{t('aboutStat2Val')}</span>
                <span className="about-stat-desc">{t('aboutStat2Desc')}</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">{t('aboutStat3Val')}</span>
                <span className="about-stat-desc">{t('aboutStat3Desc')}</span>
              </div>
              <span className="about-stat-sep" />
              <div className="about-stat">
                <span className="about-stat-val">{t('aboutStat4Val')}</span>
                <span className="about-stat-desc">{t('aboutStat4Desc')}</span>
              </div>
            </div>
          </section>

          {/* Who it's for — simple text blocks, no cards */}
          <section className="about-who">
            <h2>{t('aboutWhoTitle')}</h2>
            <div className="about-who-grid">
              <div className="about-who-item">
                <h3>{t('aboutWhoCitizens')}</h3>
                <p>{t('aboutWhoCitizensDesc')}</p>
              </div>
              <div className="about-who-item">
                <h3>{t('aboutWhoCityAuth')}</h3>
                <p>{t('aboutWhoCityAuthDesc')}</p>
              </div>
              <div className="about-who-item">
                <h3>{t('aboutWhoResearchers')}</h3>
                <p>{t('aboutWhoResearchersDesc')}</p>
              </div>
            </div>
          </section>

          {/* Tech — horizontal list, not grid of cards */}
          <section className="about-tech">
            <h2>{t('aboutTechTitle')}</h2>
            <p>{t('aboutTechDesc')}</p>
            <div className="about-tech-list">
              {[
                'React Native',
                'Node.js + Express',
                'PostgreSQL + PostGIS',
                'Mapbox GL',
                'Email OTP Auth',
                'Vercel Edge',
              ].map((tech, i) => (
                <span key={i} className="about-tech-tag">{tech}</span>
              ))}
            </div>
          </section>

          {/* CTA — simple, no box */}
          <section className="about-bottom-cta">
            <h2>{t('aboutCtaTitle1')}<br /><span className="sp-gradient-text">{t('aboutCtaTitle2')}</span></h2>
            <p>{t('aboutCtaDesc')}</p>
            <div className="sp-btn-row" style={{ justifyContent: 'center' }}>
              <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="sp-btn">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                {t('downloadAndroid')}
              </a>
              <a href="/live-map" className="sp-btn sp-btn-outline">{t('viewLiveMap')}</a>
            </div>
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default AboutPage;
