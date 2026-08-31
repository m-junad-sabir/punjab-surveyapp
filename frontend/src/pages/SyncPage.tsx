import { useState, useEffect } from 'react';
import { getPendingResponses, getAllResponses, saveResponse, saveSyncLog, getSyncLogs } from '../lib/db';
import { api } from '../lib/api';
import { useSurvey } from '../context/SurveyContext';
import { getDeviceId } from '../lib/deviceId';
import type { OfflineResponse, SyncResult } from '../types';

export default function SyncPage() {
  const { isOnline, refreshResponses } = useSurvey();
  const [pending, setPending] = useState<OfflineResponse[]>([]);
  const [all, setAll] = useState<OfflineResponse[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [lastSyncStatus, setLastSyncStatus] = useState<string | null>(null);

  const load = async () => {
    setPending(await getPendingResponses());
    setAll(await getAllResponses());
    setLogs(await getSyncLogs());
  };

  useEffect(() => { load(); }, []);

  const handleSync = async () => {
    if (!isOnline) { alert('You are offline. Connect to internet to sync.'); return; }
    if (pending.length === 0) { alert('No pending responses to sync.'); return; }

    setSyncing(true);
    setResults([]);
    try {
      const payload = {
        device_id: getDeviceId(),
        responses: pending.map((r) => ({
          response_id: r.response_id,
          form_id: r.form_id,
          gps_lat: r.gps_lat,
          gps_lng: r.gps_lng,
          gps_accuracy_m: r.gps_accuracy_m,
          started_at: r.started_at,
          submitted_at: r.submitted_at || new Date().toISOString(),
          answers: r.answers,
        })),
      };

      const data = await api.sync.push(payload);
      setResults(data.results || []);
      setLastSyncStatus(data.status);

      // Update local statuses
      for (const result of data.results || []) {
        const localResponse = pending.find((r) => r.response_id === result.response_id);
        if (localResponse) {
          await saveResponse({
            ...localResponse,
            sync_status: result.status === 'synced' || result.status === 'duplicate_flagged' ? 'synced' : 'failed',
          });
        }
      }

      // Save sync log
      await saveSyncLog({
        at: new Date().toISOString(),
        sync_id: data.sync_id,
        status: data.status,
        results: data.results,
      });

      await refreshResponses();
      await load();
    } catch (err: any) {
      setLastSyncStatus('failed');
      alert('Sync failed: ' + (err.message || 'Unknown error'));
    } finally {
      setSyncing(false);
    }
  };

  const stats = {
    total: all.length,
    pending: pending.length,
    synced: all.filter((r) => r.sync_status === 'synced').length,
    draft:  all.filter((r) => r.sync_status === 'draft').length,
    failed: all.filter((r) => r.sync_status === 'failed').length,
  };

  return (
    <div>
      <h1 style={{ marginBottom: 20 }}>🔄 Sync Data</h1>

      {/* Status */}
      <div className={`alert ${isOnline ? 'alert-success' : 'alert-error'}`} style={{ marginBottom: 20 }}>
        <span className={`status-dot ${isOnline ? 'online' : 'offline'}`} />
        {isOnline
          ? `Connected to server — ${pending.length} response${pending.length !== 1 ? 's' : ''} ready to sync`
          : 'Offline — connect to internet to sync data'}
      </div>

      {/* KPIs */}
      <div className="grid grid-4" style={{ marginBottom: 24 }}>
        <div className="kpi-card">
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-label">Total Responses</div>
        </div>
        <div className="kpi-card" style={{ borderTopColor: 'var(--warning)' }}>
          <div className="kpi-value" style={{ color: 'var(--warning)' }}>{stats.pending}</div>
          <div className="kpi-label">Pending Sync</div>
        </div>
        <div className="kpi-card" style={{ borderTopColor: 'var(--secondary)' }}>
          <div className="kpi-value" style={{ color: 'var(--secondary)' }}>{stats.synced}</div>
          <div className="kpi-label">Synced</div>
        </div>
        <div className="kpi-card" style={{ borderTopColor: 'var(--danger)' }}>
          <div className="kpi-value" style={{ color: 'var(--danger)' }}>{stats.failed}</div>
          <div className="kpi-label">Failed</div>
        </div>
      </div>

      {/* Sync button */}
      <div className="card" style={{ marginBottom: 24, textAlign: 'center', padding: '32px' }}>
        {pending.length > 0 ? (
          <>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>📤</div>
            <h2 style={{ marginBottom: 8 }}>{pending.length} response{pending.length > 1 ? 's' : ''} ready to upload</h2>
            <p className="text-muted" style={{ marginBottom: 20 }}>
              These responses are saved locally and will be sent to the server.
            </p>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleSync}
              disabled={syncing || !isOnline}
            >
              {syncing ? (
                <><span className="spinner spinner-sm" /> Syncing…</>
              ) : (
                '🔄 Sync Now'
              )}
            </button>
          </>
        ) : (
          <div>
            <div style={{ fontSize: '3rem', marginBottom: 12 }}>✅</div>
            <h2>All caught up!</h2>
            <p className="text-muted">No pending responses to sync.</p>
          </div>
        )}
      </div>

      {/* Last sync results */}
      {results.length > 0 && (
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card-header">
            <h3>Last Sync Results</h3>
            <span className={`badge ${lastSyncStatus === 'success' ? 'badge-green' : lastSyncStatus === 'partial' ? 'badge-yellow' : 'badge-red'}`}>
              {lastSyncStatus}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {results.map((r) => (
              <div key={r.response_id} style={{
                padding: '10px 14px',
                border: '1px solid var(--border)',
                borderRadius: 'var(--radius-sm)',
                borderLeft: `4px solid ${r.status === 'synced' ? 'var(--secondary)' : r.status === 'duplicate_flagged' ? 'var(--warning)' : 'var(--danger)'}`,
              }}>
                <div className="flex items-center justify-between">
                  <span className="text-small" style={{ fontFamily: 'monospace' }}>{r.response_id.substring(0, 8)}…</span>
                  <span className={`badge ${r.status === 'synced' ? 'badge-green' : r.status === 'duplicate_flagged' ? 'badge-yellow' : 'badge-red'}`}>
                    {r.status.replace('_', ' ')}
                  </span>
                </div>
                {r.is_duplicate && (
                  <div className="text-small" style={{ marginTop: 4, color: 'var(--warning)' }}>⚠️ Duplicate flagged — supervisor review needed</div>
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
          <div className="card-header">
            <h3>Sync History</h3>
          </div>
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
                    <td>{log.results?.length || 0}</td>
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
