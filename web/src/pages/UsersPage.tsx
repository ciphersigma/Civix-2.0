import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await ApiService.getUsers({ page, limit: 15, search: search || undefined });
      setUsers(res.data.users || []);
      setTotalPages(res.data.totalPages || 1);
      setTotal(res.data.total || 0);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [page, search]); // eslint-disable-line

  const handleSearch = (e: React.FormEvent) => { e.preventDefault(); setSearch(searchInput); setPage(1); };
  const getInitials = (name: string, phone: string) => {
    if (name) return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
    return phone ? phone.slice(-2) : '??';
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
        <div>
          <h2 style={themed.title}>Users</h2>
          <p style={themed.subtitle}>{total} registered users</p>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: 8 }}>
          <input type="text" placeholder="Search name, email, phone..." value={searchInput} onChange={e => setSearchInput(e.target.value)} style={{ ...themed.input, width: 260 }} />
        </form>
      </div>
      <div style={themed.card}>
        {loading ? (<div style={themed.empty}>Loading...</div>) : users.length === 0 ? (<div style={themed.empty}>No users found</div>) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>
              {['User','Name','Email','Phone','Verified','Reports','Joined'].map(h => (<th key={h} style={themed.th}>{h}</th>))}
            </tr></thead>
            <tbody>
              {users.map((u: any) => (
                <tr key={u.id} style={{ transition: 'background 0.15s' }} onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-hover)')} onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <td style={themed.td}><div style={{ width: 34, height: 34, borderRadius: '50%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 12, fontWeight: 700 }}>{getInitials(u.full_name, u.phone_number)}</div></td>
                  <td style={themed.td}>{u.full_name || <span style={{ color: 'var(--text-faint)', fontStyle: 'italic' }}>-</span>}</td>
                  <td style={{ ...themed.td, fontSize: 13 }}>{u.email || <span style={{ color: 'var(--text-faint)' }}>-</span>}</td>
                  <td style={{ ...themed.td, fontFamily: 'monospace', fontSize: 13 }}>{u.phone_number}</td>
                  <td style={themed.td}>{u.phone_verified ? <span style={{ color: '#22c55e', fontWeight: 600 }}>Verified</span> : <span style={{ color: 'var(--text-faint)' }}>Pending</span>}</td>
                  <td style={themed.td}>{u.daily_report_count || 0}</td>
                  <td style={{ ...themed.td, color: 'var(--text-muted)' }}>{new Date(u.created_at).toLocaleDateString()}</td>
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

export default UsersPage;
