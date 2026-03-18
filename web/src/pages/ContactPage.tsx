import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import './StaticPages.css';

const ContactPage: React.FC = () => {
  const [isDark, setIsDark] = useState(true);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // For now, open mailto — can be replaced with a backend endpoint later
    const mailto = `mailto:prashantchettiyar@ieee.org?subject=${encodeURIComponent(form.subject || 'CIVIX Contact')}&body=${encodeURIComponent(`From: ${form.name} (${form.email})\n\n${form.message}`)}`;
    window.open(mailto, '_blank');
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />

      <nav className="sp-navbar">
        <div className="sp-container sp-nav-content">
          <Link to="/" className="sp-logo">
            <img src="/logo.png" alt="CIVIX" style={{ width: 28, height: 28, borderRadius: 6 }} />
            <span>CIVIX</span>
          </Link>
          <div className="sp-nav-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact" className="sp-active">Contact</Link>
            <Link to="/live-map">Live Map</Link>
            <button className="sp-theme-toggle" onClick={() => setIsDark(!isDark)}>{isDark ? '☀️' : '🌙'}</button>
          </div>
        </div>
      </nav>

      <main className="sp-main">
        <div className="sp-container">
          <div className="sp-hero-section">
            <h1>Get in <span className="sp-gradient-text">Touch</span></h1>
            <p className="sp-hero-sub">Have questions, feedback, or want to collaborate? We'd love to hear from you.</p>
          </div>

          <div className="sp-contact-layout">
            <div className="sp-contact-info">
              <div className="sp-contact-card">
                <div className="sp-card-icon">📧</div>
                <h3>Email</h3>
                <a href="mailto:prashantchettiyar@ieee.org">prashantchettiyar@ieee.org</a>
              </div>
              <div className="sp-contact-card">
                <div className="sp-card-icon">💻</div>
                <h3>GitHub</h3>
                <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer">ciphersigma/Civix-2.0</a>
              </div>
              <div className="sp-contact-card">
                <div className="sp-card-icon">📍</div>
                <h3>Location</h3>
                <p>Ahmedabad, Gujarat, India</p>
              </div>
              <div className="sp-contact-card">
                <div className="sp-card-icon">🤝</div>
                <h3>Collaborate</h3>
                <p>CIVIX is open source. PRs, issues, and ideas are always welcome.</p>
              </div>
            </div>

            <form className="sp-form" onSubmit={handleSubmit}>
              <h2>Send a Message</h2>
              <div className="sp-form-row">
                <div className="sp-field">
                  <label>Name</label>
                  <input type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
                </div>
                <div className="sp-field">
                  <label>Email</label>
                  <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
                </div>
              </div>
              <div className="sp-field">
                <label>Subject</label>
                <input type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="What's this about?" />
              </div>
              <div className="sp-field">
                <label>Message</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us more..." />
              </div>
              <button type="submit" className="sp-submit-btn">
                {sent ? '✓ Opening mail client...' : 'Send Message →'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <footer className="sp-footer">
        <div className="sp-container sp-footer-content">
          <p>© 2025 CIVIX. Built with ❤️ for safer cities.</p>
          <div className="sp-footer-links">
            <Link to="/">Home</Link>
            <Link to="/about">About</Link>
            <Link to="/contact">Contact</Link>
            <Link to="/live-map">Live Map</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default ContactPage;
