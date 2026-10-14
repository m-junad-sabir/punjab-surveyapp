import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteResponse, getAllResponses } from '../lib/db';
import { useSurvey } from '../context/SurveyContext';
import { getSurveyUnitName } from '../lib/surveyResponse';
import type { OfflineResponse } from '../types';

export default function SurveyListPage() {
  const [responses,     setResponses]     = useState<OfflineResponse[]>([]);
  const [filter,        setFilter]        = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { refreshResponses } = useSurvey();

  const load = async () => {
    const all = await getAllResponses();
    setResponses(all.sort((a, b) => b.created_at.localeCompare(a.created_at)));
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    await deleteResponse(id);
    setConfirmDelete(null);
    await refreshResponses();
    await load();
  };

  const filtered = filter === 'all'
    ? responses
    : responses.filter((r) => r.sync_status === filter);

  const statusColor: Record<string, string> = {
    draft:        'badge-gray',
    pending_sync: 'badge-yellow',
    synced:       'badge-green',
    failed:       'badge-red',
  };

  const countFor = (s: string) => responses.filter((r) => r.sync_status === s).length;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between" style={{ marginBottom: 20 }}>
        <h1>My Surveys</h1>
        <Link to="/surveys/new" className="btn btn-primary">➕ New Survey</Link>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        {(['all', 'draft', 'pending_sync', 'synced', 'failed'] as const).map((s) => (
          <button key={s}
            className={`btn btn-sm ${filter === s ? 'btn-primary' : 'btn-ghost'}`}
            onClick={() => setFilter(s)}>
            {s === 'all' ? 'All' : s.replace('_', ' ')}
            {s !== 'all' && <span style={{ marginLeft: 4, opacity: 0.7 }}>({countFor(s)})</span>}
          </button>
        ))}
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="empty-state">
          <div className="icon">📋</div>
          <h3>No surveys yet</h3>
          <p>Start a new survey to capture industrial unit data.</p>
          <Link to="/surveys/new" className="btn btn-primary" style={{ marginTop: 16 }}>
            Start First Survey
          </Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {filtered.map((r) => {
            const canEdit = r.sync_status === 'draft' || r.sync_status === 'failed';
            return (
              <div key={r.response_id} className="card" style={{ padding: '14px 18px' }}>
                <div className="flex items-center justify-between">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }} className="truncate">
                      {getSurveyUnitName(r)}
                    </div>
                    <div className="text-small text-muted" style={{ marginTop: 3 }}>
                      {new Date(r.created_at).toLocaleString()} · {r.answers.length} answers
                      {r.gps_lat && r.gps_lng ? ' · 📍 GPS' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-8" style={{ marginLeft: 12 }}>
                    <span className={`badge ${statusColor[r.sync_status] ?? 'badge-gray'}`}>
                      {r.sync_status.replace('_', ' ')}
                    </span>
                    {canEdit && (
                      <Link to={`/surveys/${r.response_id}`} className="btn btn-outline btn-sm">
                        Edit
                      </Link>
                    )}
                    {r.sync_status !== 'synced' && (
                      <button className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--danger)' }}
                        onClick={() => setConfirmDelete(r.response_id)}>
                        🗑️
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Delete confirm modal */}
      {confirmDelete && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header"><h3>Delete Survey?</h3></div>
            <div className="modal-body">
              <p>This will permanently delete this local draft. This cannot be undone.</p>
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => remove(confirmDelete)}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
