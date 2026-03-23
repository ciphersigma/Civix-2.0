import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

const SeverityBadge: React.FC<{severity: string}> = ({severity}) => {
  const colors: Record<string,string> = { Low: '#eab308', Medium: '#f97316', High: '#ef4444' };
  const c = colors[severity] || 'var(--text-faint)';
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
      <div className="dash-page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={themed.title}>Reports</h2>
          <p style={themed.subtitle}>{total} total reports</p>
        </div>
        <div className="dash-page-header-actions" style={{ display: 'flex', gap: 8 }}>
          <select value={severity} onChange={e => { setSeverity(e.target.value); setPage(1); }} style={themed.select}>
            <option value="">All Severities</option>
            <option value="Low">Low</option>
            <option value="Medium">Medium</option>
            <option value="High">High</option>
          </select>
          <select value={status} onChange={e => { setStatus(e.target.value); setPage(1); }} style={themed.select}>
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="expired">Expired</option>
          </select>
        </div>
      </div>
      <div className="dash-table-card" style={themed.card}>
        {loading ? <div style={themed.empty}>Loading...</div> :
         reports.length === 0 ? <div style={themed.empty}>No reports found</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['Severity','Type','Status','Location','Created'].map(h => (
                <th key={h} style={themed.th}>{h}</th>
              ))}
            </tr></thead>
            <tbody>
              {reports.map((r: any) => (
                <tr key={r.id} style={{ transition: 'background 0.15s' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={themed.td}><SeverityBadge severity={r.severity} /></td>
                  <td style={themed.td}>{r.report_type}</td>
                  <td style={themed.td}>
                    {r.is_active ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Active</span> : <span style={{ color: 'var(--text-faint)' }}>Expired</span>}
                  </td>
                  <td style={{ ...themed.td, fontFamily: 'monospace', fontSize: 13, color: 'var(--text-muted)' }}>
                    {r.latitude ? `${Number(r.latitude).toFixed(4)}, ${Number(r.longitude).toFixed(4)}` : 'N/A'}
                  </td>
                  <td style={{ ...themed.td, color: 'var(--text-muted)' }}>{new Date(r.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        {totalPages > 1 && (
          <div style={themed.paginationRow}>
            <button onClick={() => setPage(p => Math.max(1, p-1))} disabled={page===1} style={themed.paginationBtn}>Prev</button>
            <span style={{ color: 'var(--text-muted)', fontSize: 14 }}>Page {page} of {totalPages}</span>
            <button onClick={() => setPage(p => Math.min(totalPages, p+1))} disabled={page===totalPages} style={themed.paginationBtn}>Next</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportsPage;
