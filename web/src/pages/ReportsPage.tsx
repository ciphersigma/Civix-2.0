import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';

const SeverityBadge: React.FC<{severity: string}> = ({severity}) => {
  const colors: Record<string,string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
  const c = colors[severity] || '#52525b';
  return <span style={{ background: `${c}22`, color: c, padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, border: `1px solid ${c}33` }}>{severity}</span>;
};

const ReportsPage: React.FC = () => {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');

  const fetchReports = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getReports({ page, limit: 15, severity: severity || undefined, status: status || undefined });
      setReports(res.data.reports || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchReports(); }, [page, severity, status]); // eslint-disable-line

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, color: '#f4f4f5' }}>Reports</h2>
          <p style={{ margin: '4px 0 0', color: '#71717a', fontSize: 14 }}>{total} total reports</p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={selectStyle}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <div style={cardStyle}>
        {loading ? <p style={{ textAlign: 'center', color: '#71717a', padding: 40 }}>Loading...</p> :
         reports.length === 0 ? <p style={{ textAlign: 'center', color: '#71717a', padding: 40 }}>No reports found</p> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Severity','Type','Status','Location','Created'].map(h => (
                <th key={h} style={thStyle}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={tdStyle}><SeverityBadge severity={r.severity} /></td>
                  <td style={tdStyle}>{r.report_type}</td>
                  <td style={tdStyle}>
                    {r.is_active ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Active</span> : <span style={{ color: '#52525b' }}>Expired</span>}
                  </td>
                  <td style={{ ...tdStyle, fontFamily: 'monospace', fontSize: 13, color: '#a1a1aa' }}>
                    {r.latitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : 'N/A'}
                  </td>
                  <td style={{ ...tdStyle, color: '#71717a' }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 16, marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.06)' }}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={paginationBtn}>← Prev</button>
            <span style={{ color: '#71717a', fontSize: 14 }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={paginationBtn}>Next →</button>
          </div>
        )}
      </div>
    </div>
  );
};

const cardStyle: React.CSSProperties = { background: 'rgba(24,24,32,0.8)', borderRadius: 14, padding: 24, border: '1px solid rgba(255,255,255,0.06)' };
const selectStyle: React.CSSProperties = { padding: '8px 14px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 14, background: 'rgba(255,255,255,0.04)', color: '#d4d4d8', outline: 'none', cursor: 'pointer' };
const thStyle: React.CSSProperties = { textAlign: 'left', padding: '10px 14px', borderBottom: '1px solid rgba(255,255,255,0.06)', fontSize: 12, color: '#71717a', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' };
const tdStyle: React.CSSProperties = { padding: '12px 14px', borderBottom: '1px solid rgba(255,255,255,0.04)', fontSize: 14, color: '#d4d4d8' };
const paginationBtn: React.CSSProperties = { padding: '6px 16px', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, cursor: 'pointer', color: '#a1a1aa', fontSize: 13, fontWeight: 500 };

export default ReportsPage;
