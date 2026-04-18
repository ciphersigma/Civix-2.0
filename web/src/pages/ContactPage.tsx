import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useLang } from '../contexts/LanguageContext';
import './StaticPages.css';
import './ContactPage.css';

const ContactPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', subject: '', message: '' });
  const [sent, setSent] = useState(false);
  const { t } = useLang();

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
            <span className="contact-eyebrow">{t('contactEyebrow')}</span>
            <h1>{t('contactHeroTitle1')} <span className="sp-gradient-text">{t('contactHeroTitle2')}</span></h1>
            <p className="contact-hero-lead">{t('contactHeroLead')}</p>
          </section>

          {/* Contact info — inline, not cards */}
          <section className="contact-info-section">
            <div className="contact-info-row">
              <div className="contact-info-item">
                <span className="contact-info-label">{t('contactEmailLabel')}</span>
                <a href="mailto:prashantchettiyar@ieee.org" className="contact-info-value">prashantchettiyar@ieee.org</a>
                <span className="contact-info-hint">{t('contactEmailHint')}</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">{t('contactLocationLabel')}</span>
                <span className="contact-info-value">{t('contactLocationValue')}</span>
              </div>
              <div className="contact-info-item">
                <span className="contact-info-label">{t('contactSocialLabel')}</span>
                <a href="https://www.instagram.com/craftedbyprashant" target="_blank" rel="noreferrer" className="contact-info-value">@craftedbyprashant</a>
                <span className="contact-info-hint">{t('contactSocialHint')}</span>
              </div>
            </div>
          </section>

          {/* Form — full width, clean */}
          <section className="contact-form-section">
            <h2>{t('contactFormTitle')}</h2>
            <p className="contact-form-desc">{t('contactFormDesc')}</p>

            <form className="contact-form" onSubmit={handleSubmit}>
              <div className="contact-form-row">
                <div className="contact-field">
                  <label htmlFor="contact-name">{t('contactNameLabel')}</label>
                  <input id="contact-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder={t('contactNamePlaceholder')} />
                </div>
                <div className="contact-field">
                  <label htmlFor="contact-email">{t('contactEmailFieldLabel')}</label>
                  <input id="contact-email" type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder={t('contactEmailPlaceholder')} />
                </div>
              </div>
              <div className="contact-field">
                <label htmlFor="contact-subject">{t('contactSubjectLabel')}</label>
                <input id="contact-subject" type="text" value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder={t('contactSubjectPlaceholder')} />
              </div>
              <div className="contact-field">
                <label htmlFor="contact-message">{t('contactMessageLabel')}</label>
                <textarea id="contact-message" required rows={6} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder={t('contactMessagePlaceholder')} />
              </div>
              <button type="submit" className="contact-submit" disabled={sent}>
                {sent ? t('contactSent') : t('contactSend')}
              </button>
            </form>
          </section>

          {/* Collaborate note */}
          <section className="contact-collab">
            <p>{t('contactCollabNote')}</p>
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default ContactPage;
