import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';
import './ContactPage.css';

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
        <div className="contact-wrap">

          {/* Hero */}
          <section className="contact-hero">
            <span className="contact-eyebrow">Contact</span>
            <h1>Let's <span className="sp-gradient-text">talk</span></h1>
            <p className="contact-hero-lead">Have a question, feedback, or want to collaborate on making cities flood-smart? We're all ears.</p>
          </section>

          {/* Contact info — inline, not cards */}
          <section className="contact-info-section">
            <div className="contact-info-row">
              <div className="contact-info-item">
                <span className="contact-info-label">Email</span>
                <a href="mailto:prashantchettiyar@ieee.org" className="contact-info-value">prashantchettiyar@ieee.org</a>
                <span className="contact-info-hint">We typically respond within 24 hours</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">Location</span>
                <span className="contact-info-value">Ahmedabad, Gujarat, India</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">Social</span>
                <a href="https://www.instagram.com/craftedbyprashant" target="_blank" rel="noreferrer" className="contact-info-value">@craftedbyprashant</a>
                <span className="contact-info-hint">Follow us for updates</span>
              </div>
            </div>
          </section>

          {/* Form — full width, clean */}
          <section className="contact-form-section">
            <h2>Send us a message</h2>
            <p className="contact-form-desc">Fill this out and we'll get back to you. Or just email us directly — whatever works.</p>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="contact-name">Name</label>
                  <input id="contact-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-email">Email</label>
                  <input id="contact-email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
                </div>
              </div>
              <div className="contact-field">
                <label htmlFor="contact-subject">Subject</label>
                <input id="contact-subject" type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="What's this about?" />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-message">Message</label>
                <textarea id="contact-message" required rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us what's on your mind..." />
              </div>
              <button type="submit" className="contact-submit" disabled={sent}>
                {sent ? 'Sent — opening mail client...' : 'Send Message'}
              </button>
            </form>
          </section>

          {/* Collaborate note */}
          <section className="contact-collab">
            <p>Want to partner with us? We're always open to working with civic-minded teams, municipal bodies, and organizations building for urban resilience. Just drop us a line.</p>
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default ContactPage;
