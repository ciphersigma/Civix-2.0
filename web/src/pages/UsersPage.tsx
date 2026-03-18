import React, { useEffect, useState } from 'react';
import ApiService from '../services/api';
import { themed } from '../styles/theme';

interface EditUser {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  phone_verified: boolean;
  language: string;
}

const UsersPage: React.FC = () => {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [editUser, setEditUser] = useState<EditUser | null>(null);
  const [saving, setSaving] = useState(false);

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

  const handleEdit = (u: any) => {
    setEditUser({
      id: u.id,
      full_name: u.full_name || '',
      email: u.email || '',
      phone_number: u.phone_number || '',
      phone_verified: u.phone_verified || false,
      language: u.language || 'en',
    });
  };

  const handleSave = async () => {
    if (!editUser) return;
    setSaving(true);
    try {
      await ApiService.updateUser(editUser.id, {
        full_name: editUser.full_name,
        email: editUser.email,
        phone_number: editUser.phone_number,
        phone_verified: editUser.phone_verified,
        language: editUser.language,
      });
      setEditUser(null);
      fetchUsers();
    } catch (err) { console.error(err); alert('Failed to update user'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id: string, phone: string) => {
    if (!window.confirm(`Delete user ${phone}? This will also delete all their reports.`)) return;
    try {
      await ApiService.deleteUser(id);
      fetchUsers();
    } catch (err) { console.error(err); alert('Failed to delete user'); }
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
              {['User','Name','Email','Phone','Verified','Reports','Joined','Actions'].map(h => (<th key={h} style={themed.th}>{h}</th>))}
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
                  <td style={themed.td}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button onClick={() => handleEdit(u)} style={actionBtn}>Edit</button>
                      <button onClick={() => handleDelete(u.id, u.phone_number)} style={{ ...actionBtn, color: '#ef4444', borderColor: 'rgba(239,68,68,0.2)' }}>Delete</button>
                    </div>
                  </td>
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

      {/* Edit Modal */}
      {editUser && (
        <div style={overlay} onClick={() => setEditUser(null)}>
          <div style={modal} onClick={e => e.stopPropagation()}>
            <h3 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 700, color: 'var(--text-primary)' }}>Edit User</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <label style={labelStyle}>
                <span style={labelText}>Full Name</span>
                <input style={themed.input} value={editUser.full_name} onChange={e => setEditUser({ ...editUser, full_name: e.target.value })} />
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Email</span>
                <input style={themed.input} value={editUser.email} onChange={e => setEditUser({ ...editUser, email: e.target.value })} />
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Phone</span>
                <input style={themed.input} value={editUser.phone_number} onChange={e => setEditUser({ ...editUser, phone_number: e.target.value })} />
              </label>
              <label style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <input type="checkbox" checked={editUser.phone_verified} onChange={e => setEditUser({ ...editUser, phone_verified: e.target.checked })} />
                <span style={{ color: 'var(--text-secondary)', fontSize: 14 }}>Phone Verified</span>
              </label>
              <label style={labelStyle}>
                <span style={labelText}>Language</span>
                <select style={themed.select} value={editUser.language} onChange={e => setEditUser({ ...editUser, language: e.target.value })}>
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="gu">Gujarati</option>
                </select>
              </label>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 24 }}>
              <button onClick={() => setEditUser(null)} style={{ ...themed.paginationBtn, padding: '9px 20px' }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{ padding: '9px 20px', background: '#6366f1', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600, opacity: saving ? 0.6 : 1 }}>{saving ? 'Saving...' : 'Save'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const actionBtn: React.CSSProperties = { padding: '5px 12px', fontSize: 12, fontWeight: 500, border: '1px solid var(--border-input)', borderRadius: 6, background: 'transparent', color: 'var(--text-tertiary)', cursor: 'pointer', transition: 'all 0.15s' };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 };
const modal: React.CSSProperties = { background: 'var(--bg-secondary)', borderRadius: 16, padding: 28, width: 420, maxWidth: '90vw', border: '1px solid var(--border-primary)', boxShadow: 'var(--shadow-popup)' };
const labelStyle: React.CSSProperties = { display: 'flex', flexDirection: 'column', gap: 6 };
const labelText: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: 'var(--text-faint)', textTransform: 'uppercase', letterSpacing: '0.5px' };

export default UsersPage;