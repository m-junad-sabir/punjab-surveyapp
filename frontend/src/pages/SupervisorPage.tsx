import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useSurvey } from '../context/SurveyContext';
import type { IndustrialUnit } from '../types';

export default function SupervisorPage() {
  const { isOnline } = useSurvey();
  const [units, setUnits] = useState<IndustrialUnit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<'all' | 'pending' | 'verified'>('pending');

  const load = () => {
    if (!isOnline) { setLoading(false); return; }
    setLoading(true);
    api.units.list()
      .then(setUnits)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [isOnline]);

  const filtered = units.filter((u) => {
    if (filter === 'pending')  return u.approval_status === 'PENDING';
    if (filter === 'verified') return u.approval_status === 'CONFIRMED';
    return true;
  });

  const pendingCount = units.filter((u) => u.approval_status === 'PENDING').length;

  return (
    <div>
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <div>
          <h1>Approval Queue</h1>
          <p className="text-muted" style={{ marginTop: 4 }}>{pendingCount} unit{pendingCount !== 1 ? 's' : ''} pending review</p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>🔄 Refresh</button>
      </div>

      {!isOnline && (
        <div className="alert alert-warning">
          ⚠️ You are offline. Connect to internet to view and action units.
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        {(['all', 'pending', 'verified'] as const).map((f) => (
          <button
            key={f}
            className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(f)}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
            {f === 'pending' && pendingCount > 0 && (
              <span style={{ marginLeft: 4, background: 'var(--danger)', color: '#fff', borderRadius: 999, padding: '1px 7px', fontSize: '0.7rem' }}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="loading-center"><div className="spinner" /><span>Loading units…</span></div>
      ) : filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">{filter === 'pending' ? '✅' : '🏭'}</div>
          <h3>{filter === 'pending' ? 'All units approved!' : 'No units found'}</h3>
          <p>{filter === 'pending' ? 'There are no units waiting for approval.' : 'No industrial units match this filter.'}</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((unit) => (
            <div key={unit.id} className="card" style={{ padding: '14px 18px' }}>
              <div className="flex items-center justify-between">
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="flex items-center gap-8">
                    <span style={{ fontWeight: 600 }} className="truncate">{unit.name}</span>
                    <span className={`badge ${
                      unit.approval_status === 'CONFIRMED'
                        ? 'badge-green'
                        : unit.approval_status === 'REJECTED'
                          ? 'badge-red'
                          : 'badge-yellow'
                    }`}>
                      {unit.approval_status}
                    </span>
                  </div>
                  <div className="text-small text-muted" style={{ marginTop: 4 }}>
                    <span>{unit.unit_code ?? '—'}</span>
                    <span> • {new Date(unit.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
                <Link to={`/supervisor/units/${unit.id}`} className="btn btn-outline btn-sm" style={{ marginLeft: 12 }}>
                  Review →
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
