import React from 'react';
import { Link } from 'react-router-dom';
import './Footer.css';

interface FooterProps {
  isDark: boolean;
}

const Footer: React.FC<FooterProps> = ({ isDark }) => {
  return (
    <footer className={`site-footer ${isDark ? 'dark' : 'light'}`}>
      <div className="sf-container">
        <div className="sf-top">
          <div className="sf-brand">
            <Link to="/" className="sf-logo">
              <img src="/logo.png" alt="CIVIX" width={30} height={30} style={{ borderRadius: 8 }} />
              <span>CIVIX</span>
            </Link>
            <p className="sf-desc">Community-driven waterlogging alert platform making Indian cities safer during monsoon season.</p>
            <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer" className="sf-download">Download App</a>
          </div>
          <div className="sf-col">
            <h4>Platform</h4>
            <Link to="/live-map">Live Map</Link>
            <Link to="/about">About Us</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/feedback">Feedback</Link>
            <Link to="/privacy">Privacy Policy</Link>
          </div>
          <div className="sf-col">
            <h4>Resources</h4>
            <a href="/#features">Features</a>
            <a href="/#how">How it Works</a>
            <a href="/#faq">FAQ</a>
          </div>
          <div className="sf-col">
            <h4>Get in Touch</h4>
            <a href="mailto:prashantchettiyar@ieee.org">Email Us</a>
            <Link to="/contact">Send a Message</Link>
            <a href="https://drive.google.com/uc?export=download&id=1KrmduD1MqWU4ke1O0y7WCbBRufps0nVM" target="_blank" rel="noreferrer">Download App</a>
          </div>
        </div>
        <div className="sf-divider" />
        <div className="sf-bottom">
          <p>&copy; 2026 CIVIX — Built in Ahmedabad, India</p>
          <p className="sf-tagline">Crowdsourced flood intelligence for smarter cities</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
