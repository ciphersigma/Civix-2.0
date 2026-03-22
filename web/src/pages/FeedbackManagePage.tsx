import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

interface FeedbackItem {
  id: number;
  name: string;
  email?: string;
  type: string;
  message: string;
  created_at: string;
}

const FeedbackManagePage: React.FC = () => {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getFeedback();
      setFeedback(res.data.feedback || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchFeedback(); }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Delete this feedback?')) return;
    try {
      await ApiService.deleteFeedback(id);
      fetchFeedback();
    } catch (err) { console.error(err); alert('Failed to delete'); }
  };

  const filtered = filter === 'all' ? feedback : feedback.filter(f => f.type === filter);

  const typeColor: Record<string, string> = {
    suggestion: '#6366f1',
    bug: '#ef4444',
    feature: '#10b981',
    other: 'var(--text-faint)',
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={themed.title}>Feedback</h2>
          <p style={themed.subtitle}>{feedback.length} total submissions</p>
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          {['all', 'suggestion', 'bug', 'feature', 'other'].map(t => (
            <button key={t} onClick={() => setFilter(t)} style={{
              ...filterBtn,
              ...(filter === t ? { background: 'rgba(99,102,241,0.1)', borderColor: 'rgba(99,102,241,0.25)', color: '#6366f1' } : {}),
            }}>
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div style={themed.card}>
        {loading ? (
          <div style={themed.empty}>Loading...</div>
        ) : filtered.length === 0 ? (
          <div style={themed.empty}>No feedback found</div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                {['Name', 'Email', 'Type', 'Message', 'Date', 'Actions'].map(h => (
                  <th key={h} style={themed.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(item => (
                <tr key={item.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={{ ...themed.td, fontWeight: 600 }}>{item.name}</td>
                  <td style={{ ...themed.td, fontSize: 12, color: 'var(--text-faint)' }}>{item.email || '-'}</td>
                  <td style={themed.td}>
                    <span style={{
                      fontSize: 11,
                      fontWeight: 700,
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px',
                      padding: '3px 8px',
                      borderRadius: 100,
                      color: typeColor[item.type] || 'var(--text-faint)',
                      background: `${typeColor[item.type] || 'var(--text-faint)'}15`,
                    }}>
                      {item.type}
                    </span>
                  </td>
                  <td style={{ ...themed.td, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' as const }}>{item.message}</td>
                  <td style={{ ...themed.td, color: 'var(--text-muted)', fontSize: 12 }}>{new Date(item.created_at).toLocaleDateString()}</td>
                  <td style={themed.td}>
                    <button onClick={() => handleDelete(item.id)} style={deleteBtn}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

const filterBtn: React.CSSProperties = {
  padding: '5px 14px',
  fontSize: 12,
  fontWeight: 600,
  border: '1px solid var(--border-input)',
  borderRadius: 100,
  background: 'transparent',
  color: 'var(--text-tertiary)',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

const deleteBtn: React.CSSProperties = {
  padding: '5px 12px',
  fontSize: 12,
  fontWeight: 500,
  border: '1px solid rgba(239,68,68,0.2)',
  borderRadius: 6,
  background: 'transparent',
  color: '#ef4444',
  cursor: 'pointer',
  transition: 'all 0.15s',
};

export default FeedbackManagePage;
