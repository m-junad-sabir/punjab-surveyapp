import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { getAllSubmissions, getPendingSubmissions, saveSubmission, saveSyncLog } from '../lib/db';
import { getDeviceId } from '../lib/deviceId';
import { useSurvey } from '../context/SurveyContext';
import type { SurveySubmissionDraft, SyncResult } from '../types';

export default function SyncPage() {
  const { isOnline, refreshResponses } = useSurvey();
  const [all, setAll] = useState<SurveySubmissionDraft[]>([]);
  const [pending, setPending] = useState<SurveySubmissionDraft[]>([]);
  const [results, setResults] = useState<SyncResult[]>([]);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const load = async () => { setAll(await getAllSubmissions()); setPending(await getPendingSubmissions()); };
  useEffect(() => { load(); }, []);
  const sync = async () => {
    if (!isOnline || !pending.length) return;
    setSyncing(true); setResults([]); setError('');
    try {
      const response = await api.sync.push({ device_id: getDeviceId(), responses: pending.map((submission) => ({ survey_id: submission.survey_id, device_id: submission.device_id, enumerator_name: submission.enumerator_name, interview_date: submission.interview_date, coordinates_lat: submission.coordinates_lat, coordinates_lng: submission.coordinates_lng, gps_accuracy_m: submission.gps_accuracy_m, sections: submission.sections })) });
      setResults(response.results || []);
      const failedMessages = (response.results || [])
        .filter((result: SyncResult) => result.status === 'failed')
        .map((result: SyncResult) => result.message)
        .filter(Boolean);
      if (failedMessages.length) setError(`Sync failed: ${failedMessages.join(' | ')}`);
      for (const result of response.results || []) { const submission = pending.find((item) => item.survey_id === (result.survey_id || result.response_id)); if (submission) await saveSubmission({ ...submission, sync_status: result.status === 'synced' ? 'synced' : 'failed' }); }
      await saveSyncLog({ at: new Date().toISOString(), sync_id: response.sync_id, status: response.status, results: response.results || [] });
      await refreshResponses(); await load();
    } catch (syncError) {
      setError(syncError instanceof Error ? syncError.message : 'Sync request failed.');
    } finally { setSyncing(false); }
  };
  return <div><h1 style={{ marginBottom: 20 }}>Sync Data</h1><div className={`alert ${isOnline ? 'alert-success' : 'alert-error'}`}>{isOnline ? `${pending.length} typed submission${pending.length === 1 ? '' : 's'} ready to sync` : 'Offline - connect to internet to sync data'}</div>{error && <div className="alert alert-error">{error}</div>}<div className="grid grid-4" style={{ margin: '20px 0' }}><div className="kpi-card"><div className="kpi-value">{all.length}</div><div className="kpi-label">Total submissions</div></div><div className="kpi-card"><div className="kpi-value">{pending.length}</div><div className="kpi-label">Pending sync</div></div><div className="kpi-card"><div className="kpi-value">{all.filter((item) => item.sync_status === 'synced').length}</div><div className="kpi-label">Synced</div></div><div className="kpi-card"><div className="kpi-value">{all.filter((item) => item.sync_status === 'failed').length}</div><div className="kpi-label">Failed</div></div></div><div className="card" style={{ textAlign: 'center', padding: 32 }}><h2>{pending.length ? `${pending.length} submission${pending.length === 1 ? '' : 's'} ready to upload` : 'All caught up'}</h2><button className="btn btn-primary" style={{ marginTop: 16 }} onClick={sync} disabled={syncing || !isOnline || !pending.length}>{syncing ? 'Syncing...' : 'Sync now'}</button></div>{results.length > 0 && <div className="card" style={{ marginTop: 20 }}><h3>Last sync results</h3>{results.map((result, index) => <div key={`${result.survey_id || result.response_id}-${index}`} className="list-item"><div><div>{(result.survey_id || result.response_id || '').slice(0, 8)}...</div><div className="text-small text-muted" style={{ marginTop: 3 }}>{result.message}</div></div><span className={`badge ${result.status === 'synced' ? 'badge-green' : 'badge-red'}`}>{result.status}</span></div>)}</div>}</div>;
}
