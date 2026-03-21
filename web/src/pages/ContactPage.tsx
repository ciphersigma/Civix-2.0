import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';

const ContactPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const mailto = `mailto:prashantchettiyar@ieee.org?subject=${encodeURIComponent(form.subject || 'CIVIX Contact')}&body=${encodeURIComponent(`From: ${form.name} (${form.email})\n\n${form.message}`)}`;
    window.open(mailto, '_blank');
    setSent(true);
    setTimeout(() => setSent(false), 4000);
  };

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="sp-container">
          <div className="sp-hero-section">
            <div className="sp-badge-pill">Contact</div>
            <h1>Get in <span className="sp-gradient-text">Touch</span></h1>
            <p className="sp-hero-sub">Have questions, feedback, or want to collaborate? We'd love to hear from you.</p>
          </div>

          <div className="sp-contact-layout">
            <div className="sp-contact-info">
              <div className="sp-contact-card sp-contact-card-featured">
                <h3>Email</h3>
                <a href="mailto:prashantchettiyar@ieee.org">prashantchettiyar@ieee.org</a>
                <p className="sp-contact-hint">We typically respond within 24 hours</p>
              </div>
              <div className="sp-contact-card">
                <h3>Social</h3>
                <a href="https://github.com/ciphersigma/Civix-2.0" target="_blank" rel="noreferrer">ciphersigma/Civix-2.0</a>
                <p className="sp-contact-hint">Follow our progress on GitHub</p>
              </div>
              <div className="sp-contact-card">
                <h3>Location</h3>
                <p>Ahmedabad, Gujarat, India</p>
              </div>
              <div className="sp-contact-card">
                <h3>Collaborate</h3>
                <p>Have ideas or want to partner? We're always open to working with civic-minded teams and organizations.</p>
              </div>
            </div>

            <form className="sp-form" onSubmit={handleSubmit}>
              <h2>Send a Message</h2>
              <p className="sp-form-desc">Fill out the form and we'll get back to you as soon as possible.</p>
              <div className="sp-form-row">
                <div className="sp-field">
                  <label htmlFor="contact-name">Name</label>
                  <input id="contact-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
                </div>
                <div className="sp-field">
                  <label htmlFor="contact-email">Email</label>
                  <input id="contact-email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
                </div>
              </div>
              <div className="sp-field">
                <label htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="What's this about?" />
              </div>
              <div className="sp-field">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us more..." />
              </div>
              <button type="submit" className="sp-submit-btn" disabled={sent}>
                {sent ? 'Sent — opening mail client...' : 'Send Message'}
              </button>
            </form>
          </div>
        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default ContactPage;
