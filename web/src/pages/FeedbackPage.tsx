import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import api from '../services/api';
import './StaticPages.css';
import './FeedbackPage.css';

interface FeedbackItem {
  id: number;
  name: string;
  type: string;
  message: string;
  created_at: string;
}

const FeedbackPage: React.FC = () => {
  const [isDark, setIsDark] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', type: 'suggestion', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [filter, setFilter] = useState('all');

  const loadFeedback = async () => {
    try {
      const res = await api.getFeedback();
      setFeedbackList(res.data.feedback || []);
    } catch {
      // silent fail
    }
  };

  useEffect(() => { loadFeedback(); }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.submitFeedback({
        name: form.name,
        email: form.email || undefined,
        type: form.type,
        message: form.message,
      });
      setSubmitted(true);
      setForm({ name: '', email: '', type: 'suggestion', message: '' });
      loadFeedback();
      setTimeout(() => setSubmitted(false), 4000);
    } catch {
      setError('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const timeAgo = (date: string) => {
    const diff = Date.now() - new Date(date).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(date).toLocaleDateString();
  };

  const typeLabel = (t: string) => {
    const map: Record<string, string> = { suggestion: 'Suggestion', bug: 'Bug', feature: 'Feature', other: 'Other' };
    return map[t] || t;
  };

  const filtered = filter === 'all' ? feedbackList : feedbackList.filter(f => f.type === filter);

  return (
    <div className={`static-page ${isDark ? 'dark' : 'light'}`}>
      <div className="grid-bg" />
      <Navbar isDark={isDark} onToggleTheme={() => setIsDark(!isDark)} />

      <main className="sp-main">
        <div className="fb-wrap">

          <section className="fb-hero">
            <span className="fb-eyebrow">Feedback</span>
            <h1>Help us make CIVIX <span className="sp-gradient-text">better</span></h1>
            <p className="fb-hero-lead">We're building this for you. Tell us what's working, what's broken, or what you wish existed. Every suggestion is public — transparency builds trust.</p>
          </section>

          {/* Submit form */}
          <section className="fb-form-section">
            <h2>Share your thoughts</h2>

            {submitted && <p className="fb-success">Thanks for your feedback — it's now visible below.</p>}
            {error && <p className="fb-error">{error}</p>}

            <form className="fb-form" onSubmit={handleSubmit}>
              <div className="fb-form-row">
                <div className="fb-field">
                  <label htmlFor="fb-name">Name</label>
                  <input id="fb-name" type="text" required value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Your name" />
                </div>
                <div className="fb-field">
                  <label htmlFor="fb-email">Email (optional)</label>
                  <input id="fb-email" type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@example.com" />
                </div>
              </div>

              <div className="fb-field">
                <label>What kind of feedback?</label>
                <div className="fb-type-row">
                  {(['suggestion', 'bug', 'feature', 'other'] as const).map(t => (
                    <button key={t} type="button" className={`fb-type-btn ${form.type === t ? 'active' : ''}`} onClick={() => setForm({...form, type: t})}>
                      {t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="fb-field">
                <label htmlFor="fb-message">Your feedback</label>
                <textarea id="fb-message" required rows={5} value={form.message} onChange={e => setForm({...form, message: e.target.value})} placeholder="Tell us what's on your mind..." />
              </div>

              <button type="submit" className="fb-submit" disabled={submitting}>
                {submitting ? 'Submitting...' : 'Post Feedback'}
              </button>
            </form>
          </section>

          {/* Public feedback wall */}
          <section className="fb-wall-section">
            <div className="fb-wall-header">
              <h2>Community feedback</h2>
              <span className="fb-wall-count">{feedbackList.length} {feedbackList.length === 1 ? 'post' : 'posts'}</span>
            </div>

            <div className="fb-filter-row">
              {['all', 'suggestion', 'bug', 'feature', 'other'].map(t => (
                <button key={t} className={`fb-filter-btn ${filter === t ? 'active' : ''}`} onClick={() => setFilter(t)}>
                  {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <p className="fb-empty">No feedback yet. Be the first to share your thoughts.</p>
            ) : (
              <div className="fb-wall">
                {filtered.map(item => (
                  <div key={item.id} className="fb-wall-item">
                    <div className="fb-wall-meta">
                      <span className="fb-wall-name">{item.name}</span>
                      <span className={`fb-wall-type fb-wall-type-${item.type}`}>{typeLabel(item.type)}</span>
                      <span className="fb-wall-time">{timeAgo(item.created_at)}</span>
                    </div>
                    <p className="fb-wall-message">{item.message}</p>
                  </div>
                ))}
              </div>
            )}
          </section>

        </div>
      </main>

      <Footer isDark={isDark} />
    </div>
  );
};

export default FeedbackPage;
