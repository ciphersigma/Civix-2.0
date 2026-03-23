import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

interface ApiKey {
  id: string;
  partner_name: string;
  api_key: string;
  permissions: string[];
  rate_limit: number;
  is_active: boolean;
  last_used_at: string | null;
  request_count: number;
  webhook_url: string | null;
  created_at: string;
  expires_at: string | null;
}

interface Usage {
  totalRequests: number;
  hourlyUsage: { hour: string; count: string }[];
  topEndpoints: { endpoint: string; method: string; count: string; avg_time: number }[];
}

const PERMS = ['read:reports', 'read:status', 'read:routes'];

const ApiKeysPage: React.FC = () => {
  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [showSecret, setShowSecret] = useState<{ key: string; secret: string } | null>(null);
  const [usageModal, setUsageModal] = useState<{ key: ApiKey; usage: Usage } | null>(null);
  const [form, setForm] = useState({ partnerName: '', rateLimit: 1000, webhookUrl: '', permissions: ['read:reports'] as string[] });
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState('');

  const load = async () => {
    try {
      const res = await ApiService.getApiKeys();
      setKeys(res.data.keys || []);
    } catch (e) { console.error('Failed to load API keys:', e); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    if (!form.partnerName.trim()) return;
    setSaving(true);
    try {
      const res = await ApiService.createApiKey({
        partnerName: form.partnerName,
        rateLimit: form.rateLimit,
        webhookUrl: form.webhookUrl || undefined,
        permissions: form.permissions,
      });
      setShowSecret({ key: res.data.key.api_key, secret: res.data.secret });
      setShowCreate(false);
      setForm({ partnerName: '', rateLimit: 1000, webhookUrl: '', permissions: ['read:reports'] });
      load();
    } catch (e: any) {
      alert(e?.response?.data?.message || 'Failed to create key');
    } finally { setSaving(false); }
  };

  const toggleActive = async (k: ApiKey) => {
    try {
      await ApiService.updateApiKey(k.id, { isActive: !k.is_active });
      load();
    } catch { alert('Failed to update'); }
  };

  const handleDelete = async (k: ApiKey) => {
    if (!window.confirm(`Delete API key for "${k.partner_name}"? This cannot be undone.`)) return;
    try { await ApiService.deleteApiKey(k.id); load(); }
    catch { alert('Failed to delete'); }
  };

  const handleRegenerate = async (k: ApiKey) => {
    if (!window.confirm(`Regenerate secret for "${k.partner_name}"? The old secret will stop working immediately.`)) return;
    try {
      const res = await ApiService.regenerateApiSecret(k.id);
      setShowSecret({ key: k.api_key, secret: res.data.secret });
    } catch { alert('Failed to regenerate'); }
  };

  const viewUsage = async (k: ApiKey) => {
    try {
      const res = await ApiService.getApiKeyUsage(k.id);
      setUsageModal({ key: k, usage: res.data });
    } catch { alert('Failed to load usage'); }
  };

  const copyText = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(''), 2000);
  };

  const togglePerm = (p: string) => {
    setForm(f => ({
      ...f,
      permissions: f.permissions.includes(p) ? f.permissions.filter(x => x !== p) : [...f.permissions, p],
    }));
  };

  const timeAgo = (d: string | null) => {
    if (!d) return 'Never';
    const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  if (loading) return (
    <div>
      <div className="skeleton" style={{ height: 48, borderRadius: 12, marginBottom: 16 }} />
      {[0,1,2].map(i => <div key={i} className="skeleton" style={{ height: 80, borderRadius: 12, marginBottom: 10 }} />)}
    </div>
  );

  return (
    <div>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }} className="dash-page-header">
        <div>
          <h2 style={themed.title}>API Keys</h2>
          <p style={themed.subtitle}>Manage partner API access for delivery integrations</p>
        </div>
        <button onClick={() => setShowCreate(true)} style={btnPrimary}>+ New API Key</button>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 20 }} className="overview-metrics-row">
        <div style={metricTile}>
          <div style={metricVal}>{keys.length}</div>
          <div style={metricLabel}>Total Keys</div>
        </div>
        <div style={metricTile}>
          <div style={{ ...metricVal, color: '#22c55e' }}>{keys.filter(k => k.is_active).length}</div>
          <div style={metricLabel}>Active</div>
        </div>
        <div style={metricTile}>
          <div style={{ ...metricVal, color: '#8b5cf6' }}>{keys.reduce((s, k) => s + (k.request_count || 0), 0).toLocaleString()}</div>
          <div style={metricLabel}>Total Requests</div>
        </div>
      </div>

      {/* Keys list */}
      {keys.length === 0 ? (
        <div style={{ ...themed.card, textAlign: 'center', padding: 48 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🔑</div>
          <p style={{ color: 'var(--text-secondary)', fontSize: 15, fontWeight: 600, margin: '0 0 6px' }}>No API keys yet</p>
          <p style={{ color: 'var(--text-faint)', fontSize: 13, margin: '0 0 16px' }}>Create your first key to start selling waterlogging data to delivery partners</p>
          <button onClick={() => setShowCreate(true)} style={btnPrimary}>Create API Key</button>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {keys.map(k => (
            <div key={k.id} style={{ ...themed.card, padding: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
                    <span style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>{k.partner_name}</span>
                    <span style={{
                      fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 10,
                      background: k.is_active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                      color: k.is_active ? '#22c55e' : '#ef4444',
                    }}>{k.is_active ? 'Active' : 'Disabled'}</span>
                  </div>
                  <div style={{ fontFamily: 'monospace', fontSize: 12, color: 'var(--text-muted)', background: 'var(--bg-hover)', padding: '4px 8px', borderRadius: 6, display: 'inline-block', marginBottom: 8 }}>
                    {k.api_key.slice(0, 20)}...
                    <button onClick={() => copyText(k.api_key, k.id)} style={copyBtn}>
                      {copied === k.id ? '✓' : '📋'}
                    </button>
                  </div>
                  <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: 12, color: 'var(--text-faint)' }}>
                    <span>Rate: {k.rate_limit}/hr</span>
                    <span>Requests: {(k.request_count || 0).toLocaleString()}</span>
                    <span>Last used: {timeAgo(k.last_used_at)}</span>
                    <span>Created: {new Date(k.created_at).toLocaleDateString()}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 4, marginTop: 6 }}>
                    {k.permissions.map(p => (
                      <span key={p} style={permBadge}>{p}</span>
                    ))}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => viewUsage(k)} style={btnSmall} title="View usage">📊</button>
                  <button onClick={() => toggleActive(k)} style={btnSmall} title={k.is_active ? 'Disable' : 'Enable'}>
                    {k.is_active ? '⏸' : '▶'}
                  </button>
                  <button onClick={() => handleRegenerate(k)} style={btnSmall} title="Regenerate secret">🔄</button>
                  <button onClick={() => handleDelete(k)} style={{ ...btnSmall, borderColor: 'rgba(239,68,68,0.2)' }} title="Delete">🗑</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div style={overlay} onClick={() => setShowCreate(false)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 18px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Create API Key</h3>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Partner Name</label>
              <input style={themed.input} placeholder="e.g. Swiggy, Zomato, Dunzo" value={form.partnerName}
                onChange={e => setForm(f => ({ ...f, partnerName: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Rate Limit (requests/hour)</label>
              <input style={themed.input} type="number" value={form.rateLimit}
                onChange={e => setForm(f => ({ ...f, rateLimit: parseInt(e.target.value) || 1000 }))} />
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>Webhook URL (optional)</label>
              <input style={themed.input} placeholder="https://partner.com/webhook" value={form.webhookUrl}
                onChange={e => setForm(f => ({ ...f, webhookUrl: e.target.value }))} />
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>Permissions</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {PERMS.map(p => (
                  <button key={p} onClick={() => togglePerm(p)}
                    style={{
                      ...permBadge,
                      cursor: 'pointer',
                      background: form.permissions.includes(p) ? 'rgba(99,102,241,0.15)' : 'var(--bg-hover)',
                      color: form.permissions.includes(p) ? '#6366f1' : 'var(--text-faint)',
                      borderColor: form.permissions.includes(p) ? 'rgba(99,102,241,0.3)' : 'var(--border-secondary)',
                    }}>{p}</button>
                ))}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <button onClick={() => setShowCreate(false)} style={btnSecondary}>Cancel</button>
              <button onClick={handleCreate} disabled={saving || !form.partnerName.trim()} style={{ ...btnPrimary, opacity: saving ? 0.6 : 1 }}>
                {saving ? 'Creating...' : 'Create Key'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Secret reveal modal */}
      {showSecret && (
        <div style={overlay} onClick={() => setShowSecret(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <div style={{ textAlign: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>🔐</div>
              <h3 style={{ margin: '0 0 6px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>Save Your API Secret</h3>
              <p style={{ margin: 0, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>This secret will not be shown again</p>
            </div>
            <div style={{ marginBottom: 12 }}>
              <label style={labelStyle}>API Key</label>
              <div style={secretBox}>
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{showSecret.key}</code>
                <button onClick={() => copyText(showSecret.key, 'apikey')} style={copyBtn}>{copied === 'apikey' ? '✓ Copied' : '📋 Copy'}</button>
              </div>
            </div>
            <div style={{ marginBottom: 18 }}>
              <label style={labelStyle}>API Secret</label>
              <div style={secretBox}>
                <code style={{ fontSize: 12, wordBreak: 'break-all' }}>{showSecret.secret}</code>
                <button onClick={() => copyText(showSecret.secret, 'secret')} style={copyBtn}>{copied === 'secret' ? '✓ Copied' : '📋 Copy'}</button>
              </div>
            </div>
            <button onClick={() => setShowSecret(null)} style={{ ...btnPrimary, width: '100%' }}>I've saved the secret</button>
          </div>
        </div>
      )}

      {/* Usage modal */}
      {usageModal && (
        <div style={overlay} onClick={() => setUsageModal(null)}>
          <div style={{ ...modal, maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 4px', fontSize: 16, fontWeight: 700, color: 'var(--text-primary)' }}>
              Usage — {usageModal.key.partner_name}
            </h3>
            <p style={{ margin: '0 0 18px', fontSize: 12, color: 'var(--text-faint)' }}>Last 24 hours & 7-day endpoint breakdown</p>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
              <div style={themed.metricCard}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#6366f1' }}>{usageModal.usage.totalRequests.toLocaleString()}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Total Requests</div>
              </div>
              <div style={themed.metricCard}>
                <div style={{ fontSize: 24, fontWeight: 700, color: '#22c55e' }}>{usageModal.usage.topEndpoints.length}</div>
                <div style={{ fontSize: 11, color: 'var(--text-faint)', marginTop: 4 }}>Endpoints Used</div>
              </div>
            </div>
            {usageModal.usage.topEndpoints.length > 0 && (
              <div>
                <p style={themed.cardTitle}>Top Endpoints (7d)</p>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      {['Endpoint', 'Method', 'Calls', 'Avg ms'].map(h => <th key={h} style={themed.th}>{h}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {usageModal.usage.topEndpoints.map((ep, i) => (
                      <tr key={i}>
                        <td style={{ ...themed.td, fontFamily: 'monospace', fontSize: 12 }}>{ep.endpoint}</td>
                        <td style={themed.td}>{ep.method}</td>
                        <td style={themed.td}>{ep.count}</td>
                        <td style={themed.td}>{ep.avg_time}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button onClick={() => setUsageModal(null)} style={{ ...btnSecondary, width: '100%', marginTop: 16 }}>Close</button>
          </div>
        </div>
      )}
    </div>
  );
};

/* ── Styles ── */
const btnPrimary: React.CSSProperties = {
  padding: '9px 18px', background: '#6366f1', color: '#fff', border: 'none',
  borderRadius: 8, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all 0.15s',
};
const btnSecondary: React.CSSProperties = {
  padding: '9px 18px', background: 'var(--bg-input)', color: 'var(--text-secondary)',
  border: '1px solid var(--border-input)', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer',
};
const btnSmall: React.CSSProperties = {
  padding: '6px 10px', background: 'var(--bg-input)', border: '1px solid var(--border-secondary)',
  borderRadius: 8, cursor: 'pointer', fontSize: 14, transition: 'all 0.15s',
};
const copyBtn: React.CSSProperties = {
  background: 'none', border: 'none', cursor: 'pointer', fontSize: 12, padding: '2px 6px',
  color: 'var(--text-faint)', marginLeft: 6,
};
const permBadge: React.CSSProperties = {
  fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 10,
  background: 'rgba(99,102,241,0.08)', color: '#6366f1', border: '1px solid rgba(99,102,241,0.15)',
};
const overlay: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex',
  alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: 20,
};
const modal: React.CSSProperties = {
  background: 'var(--bg-secondary)', borderRadius: 16, padding: 28, maxWidth: 440,
  width: '100%', border: '1px solid var(--border-primary)', maxHeight: '90vh', overflowY: 'auto',
};
const labelStyle: React.CSSProperties = {
  display: 'block', fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 6,
};
const secretBox: React.CSSProperties = {
  background: 'var(--bg-hover)', padding: '10px 12px', borderRadius: 8,
  border: '1px solid var(--border-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
};
const metricTile: React.CSSProperties = {
  padding: '18px 20px', borderRadius: 12, border: '1px solid var(--border-primary)',
  background: 'var(--bg-secondary)', textAlign: 'center',
};
const metricVal: React.CSSProperties = {
  fontSize: 28, fontWeight: 700, color: '#6366f1', letterSpacing: '-1px', lineHeight: 1, marginBottom: 6,
};
const metricLabel: React.CSSProperties = {
  fontSize: 12, color: 'var(--text-muted)', fontWeight: 500,
};

export default ApiKeysPage;
