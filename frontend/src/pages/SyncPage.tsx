import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getResponsesForOwner, getPendingResponsesForOwner, saveResponse, saveSyncLog, getSyncLogs } from '../lib/db';
import { getDeviceId } from '../lib/deviceId';
import { useSurvey } from '../context/SurveyContext';
import { useAuth } from '../context/AuthContext';
import type { OfflineResponse, SyncItemResult } from '../types';

export default function SyncPage() {
  const { isOnline, refreshResponses } = useSurvey();
  const { user } = useAuth();
  const [all,     setAll]     = useState<OfflineResponse[]>([]);
  const [pending, setPending] = useState<OfflineResponse[]>([]);
  const [results, setResults] = useState<SyncItemResult[]>([]);
  const [logs,    setLogs]    = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [lastStatus, setLastStatus] = useState<string | null>(null);
  const [error,   setError]   = useState('');

  const load = async () => {
    if (!user?.user_id) {
      setAll([]);
      setPending([]);
      setLogs([]);
      return;
    }
    setAll(await getResponsesForOwner(user.user_id));
    setPending(await getPendingResponsesForOwner(user.user_id));
    setLogs(await getSyncLogs(user.user_id));
  };

  useEffect(() => { load(); }, [user?.user_id]);

  const handleSync = async () => {
    if (!isOnline)       { alert('You are offline. Connect to internet to sync.'); return; }
    if (!pending.length) { alert('No pending responses to sync.'); return; }

    setSyncing(true);
    setResults([]);
    setError('');

    try {
      const payload = {
        device_id: getDeviceId(),
        responses: pending.map((r) => ({
          response_id:    r.response_id,
          surveyor_id:    r.surveyor_id,
          form_id:        r.form_id,
          gps_lat:        r.gps_lat,
          gps_lng:        r.gps_lng,
          gps_accuracy_m: r.gps_accuracy_m,
          started_at:     r.started_at,
          submitted_at:   r.submitted_at ?? new Date().toISOString(),
          answers:        r.answers,
        })),
      };

      const data = await api.sync.push(payload);
      setResults(data.results ?? []);
      setLastStatus(data.status);

      // Update local statuses
      for (const result of data.results ?? []) {
        const local = pending.find((r) => r.response_id === result.response_id);
        if (local) {
          await saveResponse({
            ...local,
            sync_status: result.status === 'synced' ||
              result.status === 'duplicate_flagged' ||
              result.status === 'already_synced'
              ? 'synced'
              : 'failed',
          });
        }
      }

      await saveSyncLog({
        owner_id: user!.user_id,
        at:      new Date().toISOString(),
        sync_id: data.sync_id,
        status:  data.status,
        results: data.results ?? [],
      });

      await refreshResponses();
      await load();
    } catch (err: any) {
      setError(err?.message ?? 'Sync failed. Please try again.');
      setLastStatus('failed');
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    total:  all.length,
    pending: pending.length,
    synced: all.filter((r) => r.sync_status === 'synced').length,
    failed: all.filter((r) => r.sync_status === 'failed').length,
  };

  const statusBadge = (s: string) =>
    s === 'synced'            ? 'badge-green'
    : s === 'duplicate_flagged' ? 'badge-yellow'
    : s === 'already_synced'    ? 'badge-blue'
    : 'badge-red';

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>🔄 Sync Data</h1>

      {/* Connection status */}
      <div className={`alert ${isOnline ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>
        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        {isOnline
          ? `Connected — ${stats.pending} response${stats.pending !== 1 ? 's' : ''} ready to sync`
          : 'Offline — connect to internet to sync data'}
      </div>

      {error && <div className="alert alert-error" style={{ marginBottom: 20 }}>{error}</div>}

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        {[
          { v: stats.total,   l: 'Total',   c: undefined },
          { v: stats.pending, l: 'Pending', c: 'var(--warning)' },
          { v: stats.synced,  l: 'Synced',  c: 'var(--secondary)' },
          { v: stats.failed,  l: 'Failed',  c: 'var(--danger)' },
        ].map((s) => (
          <div key={s.l} className="kpi-card" style={s.c ? { borderTopColor: s.c } : {}}>
            <div className="kpi-value" style={s.c ? { color: s.c } : {}}>{s.v}</div>
            <div className="kpi-label">{s.l}</div>
          </div>
        ))}
      </div>

      {/* Sync button */}
      <div className="card" style={{ textAlign: 'center', padding: 32, marginBottom: 24 }}>
        {stats.pending > 0 ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📤</div>
            <h2 style={{ marginBottom: 8 }}>
              {stats.pending} response{stats.pending > 1 ? 's' : ''} ready to upload
            </h2>
            <p className="text-muted" style={{ marginBottom: 20 }}>
              Saved locally — will be sent to the server on sync.
            </p>
            <button className="btn btn-primary btn-lg" onClick={handleSync}
              disabled={syncing || !isOnline}>
              {syncing ? <><span className="spinner spinner-sm" /> Syncing…</> : '🔄 Sync Now'}
            </button>
          </>
        ) : (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2>All caught up!</h2>
            <p className="text-muted">No pending responses to sync.</p>
          </>
        )}
      </div>

      {/* Last sync results */}
      {results.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>Last Sync Results</h3>
            <span className={`badge ${lastStatus === 'success' ? 'badge-green' : lastStatus === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
              {lastStatus}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '0 14px 14px' }}>
            {results.map((r) => (
              <div key={r.response_id} style={{
                padding: '10px 14px', border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${r.status === 'synced' ? 'var(--secondary)' : r.status === 'duplicate_flagged' ? 'var(--warning)' : 'var(--danger)'}`,
              }}>
                <div className="flex items-center justify-between">
                  <span className="text-small" style={{ fontFamily: 'monospace' }}>
                    {r.response_id.slice(0, 8)}…
                  </span>
                  <span className={`badge ${statusBadge(r.status)}`}>
                    {r.status.replace(/_/g, ' ')}
                  </span>
                </div>
                {r.is_duplicate && (
                  <div className="text-small" style={{ color: 'var(--warning)', marginTop: 4 }}>
                    ⚠️ Duplicate flagged — supervisor review needed
                  </div>
                )}
                <div className="text-small text-muted" style={{ marginTop: 2 }}>{r.message}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sync history */}
      {logs.length > 0 && (
        <div className="card">
          <div className="card-header"><h3>Sync History</h3></div>
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Sync ID</th>
                  <th>Records</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map((log) => (
                  <tr key={log.id}>
                    <td className="text-small">{new Date(log.at).toLocaleString()}</td>
                    <td className="text-small" style={{ fontFamily: 'monospace' }}>{log.sync_id}</td>
                    <td>{log.results?.length ?? 0}</td>
                    <td>
                      <span className={`badge ${log.status === 'success' ? 'badge-green' : log.status === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
                        {log.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
