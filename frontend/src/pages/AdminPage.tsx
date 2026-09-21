import { useState } from 'react';
import { api } from '../lib/api';
import { useSurvey } from '../context/SurveyContext';

interface RegisterForm {
  username: string;
  full_name: string;
  email: string;
  phone: string;
  password: string;
  role_id: number;
}

const ROLES = [
  { id: 1, name: 'Surveyor' },
  { id: 2, name: 'Supervisor' },
  { id: 3, name: 'DB Admin' },
];

export default function AdminPage() {
  const { isOnline } = useSurvey();
  const [form, setForm] = useState<RegisterForm>({
    username: '',
    full_name: '',
    email: '',
    phone: '',
    password: '',
    role_id: 1,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Partial<RegisterForm>>({});

  const validate = () => {
    const e: Partial<RegisterForm> = {};
    if (!form.username.trim())  e.username  = 'Username is required.';
    if (!form.full_name.trim()) e.full_name = 'Full name is required.';
    if (!form.password)         e.password  = 'Password is required.';
    if (form.password && form.password.length < 6) e.password = 'Min 6 characters.';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      await api.auth.register({
        username: form.username.trim(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || undefined,
        phone: form.phone.trim() || undefined,
        password_hash: form.password,
        role_id: form.role_id,
      });
      setSuccess(`✅ User "${form.username}" created successfully!`);
      setForm({ username: '', full_name: '', email: '', phone: '', password: '', role_id: 1 });
    } catch (err: any) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const field = (label: string, key: keyof RegisterForm, type = 'text', placeholder = '') => (
    <div className="form-group">
      <label className="form-label">{label}</label>
      <input
        className={`form-input ${errors[key] ? 'error' : ''}`}
        type={type}
        value={form[key] as string}
        placeholder={placeholder}
        onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
      />
      {errors[key] && <div className="form-error">{errors[key]}</div>}
    </div>
  );

  return (
    <div>
      <h1 style={{ marginBottom: 6 }}>⚙️ Admin Panel</h1>
      <p className="text-muted" style={{ marginBottom: 24 }}>Manage system users and access control.</p>

      {!isOnline && (
        <div className="alert alert-warning" style={{ marginBottom: 20 }}>
          ⚠️ You are offline. User registration requires an internet connection.
        </div>
      )}

      <div style={{ maxWidth: 520 }}>
        <div className="card">
          <div className="card-header"><h3>👤 Register New User</h3></div>

          {success && <div className="alert alert-success">{success}</div>}
          {error   && <div className="alert alert-error">{error}</div>}

          <form onSubmit={handleSubmit} autoComplete="off">
            {field('Username *', 'username', 'text', 'e.g. surveyor2')}
            {field('Full Name *', 'full_name', 'text', 'e.g. Muhammad Ali')}
            {field('Email', 'email', 'email', 'optional')}
            {field('Phone', 'phone', 'tel', 'e.g. 03001234567')}
            {field('Password *', 'password', 'password', 'minimum 6 characters')}

            <div className="form-group">
              <label className="form-label">Role *</label>
              <select
                className="form-select"
                value={form.role_id}
                onChange={(e) => setForm((prev) => ({ ...prev, role_id: parseInt(e.target.value) }))}
              >
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              className="btn btn-primary btn-block btn-lg"
              disabled={loading || !isOnline}
            >
              {loading ? <><span className="spinner spinner-sm" /> Creating…</> : '➕ Create User'}
            </button>
          </form>
        </div>

        {/* Info card */}
        <div className="card" style={{ marginTop: 16 }}>
          <h3 style={{ marginBottom: 12 }}>🔑 Permission Matrix</h3>
          <table style={{ width: '100%', fontSize: '0.85rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>Role</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>Submit</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>Approve</th>
                <th style={{ textAlign: 'center', padding: '8px 4px', borderBottom: '1px solid var(--border)' }}>Users</th>
              </tr>
            </thead>
            <tbody>
              {[
                { role: 'Surveyor', submit: '✅', approve: '—', users: '—' },
                { role: 'Supervisor', submit: '✅', approve: '✅', users: '—' },
                { role: 'DB Admin', submit: '✅', approve: '✅', users: '✅' },
              ].map((r) => (
                <tr key={r.role}>
                  <td style={{ padding: '8px 0' }}><strong>{r.role}</strong></td>
                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>{r.submit}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>{r.approve}</td>
                  <td style={{ textAlign: 'center', padding: '8px 4px' }}>{r.users}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
