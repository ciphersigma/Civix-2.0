import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import './StaticPages.css';
import './PrivacyPage.css';

const PrivacyPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="priv-wrap">

          {/* Hero */}
          <section className="priv-hero">
            <span className="priv-eyebrow">Legal</span>
            <h1>Privacy <span className="sp-gradient-text">Policy</span></h1>
            <p className="priv-hero-lead">Last updated: March 2026</p>
          </section>

          {/* Overview */}
          <section className="priv-section">
            <h2>1. Overview</h2>
            <p>CIVIX ("we", "our", "us") is a community-driven waterlogging alert platform. We are committed to protecting your privacy and being transparent about the data we collect. This policy explains what information we gather, how we use it, and your rights regarding that data.</p>
          </section>

          {/* Information We Collect */}
          <section className="priv-section">
            <h2>2. Information We Collect</h2>

            <div className="priv-prose-blocks">
              <div className="priv-prose-block">
                <h3>Account Information</h3>
                <p>When you register, we collect your email address and optional full name. This is used solely for authentication (Email OTP) and identifying your account.</p>
              </div>
              <div className="priv-prose-block">
                <h3>Location Data</h3>
                <p>When you submit a waterlogging report, we collect your GPS coordinates and location accuracy. Location is only captured at the moment of reporting — we do not track your location in the background.</p>
              </div>
              <div className="priv-prose-block">
                <h3>Report Data</h3>
                <p>We store the severity level, report type (waterlogged/clear), and timestamp of each report you submit. Reports automatically expire after 4 hours.</p>
              </div>
              <div className="priv-prose-block">
                <h3>Device Information</h3>
                <p>We do not collect device identifiers, IP addresses, or any device-specific information beyond what is necessary for the API connection.</p>
              </div>
            </div>
          </section>

          {/* How We Use Your Data */}
          <section className="priv-section">
            <h2>3. How We Use Your Data</h2>
            <ul className="priv-list">
              <li>To authenticate your account via email OTP verification</li>
              <li>To display waterlogging reports on the public live map</li>
              <li>To provide aggregated analytics to city authorities for urban planning</li>
              <li>To send you relevant notifications about waterlogging near your area</li>
              <li>To enforce rate limits and prevent abuse</li>
            </ul>
          </section>

          {/* Data Sharing */}
          <section className="priv-section">
            <h2>4. Data Sharing</h2>
            <p>We do not sell, rent, or trade your personal information to any third parties. Report data (location and severity) is displayed publicly on the live map in anonymized form — your name and email are never shown publicly.</p>
            <p>Aggregated, non-identifiable data may be shared with municipal authorities to help improve urban flood response infrastructure.</p>
          </section>

          {/* Data Storage & Security */}
          <section className="priv-section">
            <h2>5. Data Storage & Security</h2>
            <p>Your data is stored on secure cloud infrastructure with SSL encryption. Session tokens expire after 7 days. OTP verification codes expire after 10 minutes and are deleted upon successful verification. Rate limiting prevents brute-force attacks on the verification system.</p>
          </section>

          {/* Data Retention */}
          <section className="priv-section">
            <h2>6. Data Retention</h2>
            <ul className="priv-list">
              <li>Waterlogging reports are automatically marked inactive after 4 hours</li>
              <li>Account data is retained as long as your account exists</li>
              <li>You can request deletion of your account and all associated data by contacting us</li>
            </ul>
          </section>

          {/* Your Rights */}
          <section className="priv-section">
            <h2>7. Your Rights</h2>
            <p>You have the right to:</p>
            <ul className="priv-list">
              <li>Access the personal data we hold about you</li>
              <li>Request correction of inaccurate data</li>
              <li>Request deletion of your account and data</li>
              <li>Withdraw consent for location access at any time via your device settings</li>
            </ul>
          </section>

          {/* Changes */}
          <section className="priv-section">
            <h2>8. Changes to This Policy</h2>
            <p>We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated "Last updated" date. Continued use of CIVIX after changes constitutes acceptance of the updated policy.</p>
          </section>

          {/* Contact */}
          <section className="priv-section">
            <h2>9. Contact</h2>
            <p>If you have questions about this privacy policy or want to exercise your data rights, reach out to us:</p>
            <p><a href="mailto:prashantchettiyar@ieee.org">prashantchettiyar@ieee.org</a> — Ahmedabad, Gujarat, India</p>
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default PrivacyPage;
