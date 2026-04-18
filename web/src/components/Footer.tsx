import React from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../contexts/LanguageContext';
import './Footer.css';

interface FooterProps {
  isDark: boolean;
}

const Footer: React.FC<FooterProps> = ({ isDark }) => {
  const { t } = useLang();

  return (
    <footer className={`site-footer ${isDark ? 'dark' : 'light'}`}>
      <div className="sf-container">
        <div className="sf-top">
          <div className="sf-brand">
            <Link to="/" className="sf-logo">
              <img src="/logo.png" alt="CIVIX" width={30} height={30} style={{ borderRadius: 8 }} />
              <span>CIVIX</span>
            </Link>
            <p className="sf-desc">{t('footerDesc')}</p>
            <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="sf-download">{t('footerDownloadApp')}</a>
          </div>
          <div className="sf-col">
            <h4>{t('footerPlatform')}</h4>
            <Link to="/live-map">{t('footerLiveMap')}</Link>
            <Link to="/about">{t('footerAboutUs')}</Link>
            <Link to="/contact">{t('footerContact')}</Link>
            <Link to="/feedback">{t('footerFeedback')}</Link>
            <Link to="/privacy">{t('footerPrivacy')}</Link>
          </div>
          <div className="sf-col">
            <h4>{t('footerResources')}</h4>
            <a href="/#features">{t('footerFeatures')}</a>
            <Link to="/how-it-works">{t('footerHowItWorks')}</Link>
            <a href="/#faq">{t('footerFAQ')}</a>
          </div>
          <div className="sf-col">
            <h4>{t('footerGetInTouch')}</h4>
            <a href="mailto:prashantchettiyar@ieee.org">{t('footerEmailUs')}</a>
            <Link to="/contact">{t('footerSendMessage')}</Link>
            <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer">{t('footerDownloadApp')}</a>
          </div>
        </div>
        <div className="sf-divider" />
        <div className="sf-bottom">
          <p>{t('footerBuiltIn')}</p>
          <p className="sf-tagline">{t('footerTagline')}</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
