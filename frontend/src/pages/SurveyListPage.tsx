import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { deleteSubmission, getAllSubmissions } from '../lib/db';
import { useSurvey } from '../context/SurveyContext';
import type { SurveySubmissionDraft } from '../types';
import { downloadSurveyPdf } from '../lib/surveyPdf';

export default function SurveyListPage() {
  const [submissions, setSubmissions] = useState<SurveySubmissionDraft[]>([]);
  const [filter, setFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const { refreshResponses } = useSurvey();
  const load = async () => setSubmissions((await getAllSubmissions()).sort((a, b) => b.created_at.localeCompare(a.created_at)));
  useEffect(() => { load(); }, []);
  const remove = async (id: string) => { await deleteSubmission(id); setConfirmDelete(null); await refreshResponses(); await load(); };
  const filtered = filter === 'all' ? submissions : submissions.filter((submission) => submission.sync_status === filter);
  const statusColor: Record<string, string> = { draft: 'badge-gray', pending_sync: 'badge-yellow', synced: 'badge-green', failed: 'badge-red' };

  return <div><div className="flex items-center justify-between mb-16" style={{ marginBottom: 20 }}><h1>My Surveys</h1><Link to="/surveys/new" className="btn btn-primary">New survey</Link></div>
    <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>{['all', 'draft', 'pending_sync', 'synced', 'failed'].map((status) => <button key={status} className={`btn btn-sm ${filter === status ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFilter(status)}>{status === 'all' ? 'All' : status.replace('_', ' ')} {status !== 'all' && `(${submissions.filter((item) => item.sync_status === status).length})`}</button>)}</div>
    {filtered.length === 0 ? <div className="empty-state"><div className="icon">📋</div><h3>No surveys yet</h3><p>Start a new survey to capture industrial unit data.</p><Link to="/surveys/new" className="btn btn-primary" style={{ marginTop: 16 }}>Start first survey</Link></div> : <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>{filtered.map((submission) => <div key={submission.survey_id} className="card" style={{ padding: '14px 18px' }}><div className="flex items-center justify-between"><div><div style={{ fontWeight: 600 }}>{submission.sections.A?.establishment_name || 'Unnamed unit'}</div><div className="text-small text-muted">{new Date(submission.created_at).toLocaleString()} · Section A-K typed submission</div></div><div className="flex items-center gap-8"><span className={`badge ${statusColor[submission.sync_status] || 'badge-gray'}`}>{submission.sync_status.replace('_', ' ')}</span><button className="btn btn-outline btn-sm" onClick={() => downloadSurveyPdf(submission)}>⇩ PDF</button>{submission.sync_status !== 'synced' && <><Link to={`/surveys/${submission.survey_id}`} className="btn btn-outline btn-sm">Edit</Link><button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(submission.survey_id)}>Delete</button></>}</div></div></div>)}</div>}
    {confirmDelete && <div className="modal-overlay"><div className="modal"><div className="modal-header"><h3>Delete survey?</h3></div><p>This will permanently delete this local draft.</p><div className="modal-actions"><button className="btn btn-ghost" onClick={() => setConfirmDelete(null)}>Cancel</button><button className="btn btn-danger" onClick={() => remove(confirmDelete)}>Delete</button></div></div></div>}
  </div>;
}
