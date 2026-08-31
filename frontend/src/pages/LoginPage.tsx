import { useState, FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const ACCOUNTS = [
  { u: 'admin',      p: 'admin123',      r: 'DB Admin',   color: '#0D47A1' },
  { u: 'surveyor',   p: 'surveyor123',   r: 'Surveyor',   color: '#1B5E20' },
  { u: 'supervisor', p: 'supervisor123', r: 'Supervisor',  color: '#E65100' },
];

export default function LoginPage() {
  const { login, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showQuick, setShowQuick] = useState(false);

  if (isAuthenticated) { navigate('/dashboard', { replace: true }); return null; }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) { setError('Enter username and password.'); return; }
    setLoading(true); setError('');
    try {
      await login(username.trim(), password);
      navigate('/dashboard', { replace: true });
    } catch (err: any) {
      setError(err.message || 'Invalid credentials.');
    } finally { setLoading(false); }
  };

  const fill = (u: string, p: string) => {
    setUsername(u); setPassword(p); setShowQuick(false); setError('');
  };

  return (
    <div style={{
      height: '100%', display: 'flex', flexDirection: 'column',
      background: 'linear-gradient(175deg, #0D47A1 0%, #1565C0 45%, #F5F5F5 45%)',
      overflow: 'hidden',
    }}>
      {/* Header area */}
      <div style={{
        flex: '0 0 auto', padding: '32px 24px 28px',
        display: 'flex', flexDirection: 'column', alignItems: 'center',
      }}>
        <div style={{
          width: 64, height: 64, borderRadius: 16,
          background: 'rgba(255,255,255,0.2)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 32, marginBottom: 12,
          boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
        }}>🏭</div>
        <div style={{ fontSize: 18, fontWeight: 700, color: '#fff', letterSpacing: 0.3 }}>
          Punjab Industrial Survey
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 4 }}>
          Field Data Collection System
        </div>
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: '#F5F5F5',
        borderRadius: '20px 20px 0 0',
        padding: '24px 20px 16px',
        overflowY: 'auto',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)',
      }}>
        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>
            <span className="alert-icon">⚠</span> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} autoComplete="off">
          {/* Username */}
          <div className="form-field">
            <label className="form-label">Username</label>
            <input
              className="form-input"
              type="text"
              value={username}
              onChange={e => setUsername(e.target.value)}
              placeholder="Enter username"
              autoCapitalize="none"
              spellCheck={false}
            />
          </div>

          {/* Password */}
          <div className="form-field">
            <label className="form-label">Password</label>
            <input
              className="form-input"
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Enter password"
            />
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block btn-lg"
            disabled={loading}
            style={{ marginTop: 8, borderRadius: 8, height: 46 }}
          >
            {loading
              ? <><span className="spinner spinner-sm" style={{ borderTopColor:'#fff', borderColor:'rgba(255,255,255,0.3)' }} /> Signing in…</>
              : 'SIGN IN'
            }
          </button>
        </form>

        {/* Quick sign-in */}
        <div style={{ marginTop: 20 }}>
          <button
            style={{
              width: '100%', background: 'none', border: 'none',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 6, color: 'var(--primary)', fontSize: 12,
              fontWeight: 600, cursor: 'pointer', padding: '8px 0',
              letterSpacing: '0.05em', textTransform: 'uppercase',
            }}
            onClick={() => setShowQuick(v => !v)}
          >
            <span>{showQuick ? '▲' : '▼'}</span>
            Quick Sign-In (Dev)
          </button>

          {showQuick && (
            <div style={{
              background: '#fff', borderRadius: 8,
              overflow: 'hidden', boxShadow: 'var(--elev1)',
              marginTop: 4,
            }}>
              {ACCOUNTS.map((a, i) => (
                <button
                  key={a.u}
                  onClick={() => fill(a.u, a.p)}
                  style={{
                    width: '100%', background: 'none', border: 'none',
                    borderBottom: i < ACCOUNTS.length-1 ? '1px solid var(--divider)' : 'none',
                    padding: '12px 14px',
                    display: 'flex', alignItems: 'center', gap: 12,
                    cursor: 'pointer', textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: a.color,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', fontSize: 14, fontWeight: 700, flexShrink: 0,
                  }}>
                    {a.u.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{a.u}</div>
                    <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{a.r} · {a.p}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: 16 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)' }}>
            Punjab Industries Dept. © {new Date().getFullYear()}
          </span>
        </div>
      </div>
    </div>
  );
}
