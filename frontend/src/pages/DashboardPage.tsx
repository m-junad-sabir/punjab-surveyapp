import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth }   from '../context/AuthContext';
import { useSurvey } from '../context/SurveyContext';
import { getAllResponses } from '../lib/db';
import { api } from '../lib/api';
import { downloadSurveyPdf } from '../lib/surveyPdf';
import { getSurveyUnitName } from '../lib/surveyResponse';
import type { OfflineResponse } from '../types';

export default function DashboardPage() {
  const { user, hasPermission } = useAuth();
  const { form, fetchForm, formLoading, formError, isOnline, pendingCount } = useSurvey();
  const [responses,    setResponses]    = useState<OfflineResponse[]>([]);
  const [pendingUnits, setPendingUnits] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    getAllResponses().then(setResponses);
  }, []);

  useEffect(() => {
    if (hasPermission('SURVEY_CONFIRM') && isOnline) {
      api.units.list()
        .then((us) => setPendingUnits(us.filter((u: any) => u.approval_status === 'PENDING').length))
        .catch(() => {});
    }
  }, [hasPermission, isOnline]);

  const stats = {
    total:   responses.length,
    synced:  responses.filter((r) => r.sync_status === 'synced').length,
    pending: responses.filter((r) => r.sync_status === 'pending_sync').length,
    draft:   responses.filter((r) => r.sync_status === 'draft').length,
  };

  const recentResponses = responses.slice(0, 3);

  const statusChip: Record<string, string> = {
    draft:        'chip-neutral',
    pending_sync: 'chip-warning',
    synced:       'chip-success',
    failed:       'chip-danger',
  };

  return (
    <div style={{ paddingBottom: 8 }}>

      {/* ── Greeting banner ── */}
      <div style={{
        background: 'linear-gradient(135deg, var(--primary-dark), var(--primary))',
        padding: '16px 14px 20px', marginBottom: 0,
      }}>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.7)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
          {user?.role_name}
        </div>
        <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', marginTop: 2 }}>
          Hello, {user?.full_name?.split(' ')[0]} 👋
        </div>

        {/* Form status chip */}
        <div style={{ marginTop: 10 }}>
          <div style={{
            background: 'rgba(255,255,255,0.15)', borderRadius: 8,
            padding: '8px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            {form ? (
              <span style={{ fontSize: 12, color: '#fff' }}>
                ✅ Form v{form.version} ready · {form.sections.length} sections
              </span>
            ) : (
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.75)' }}>
                ⚠️ {formError ?? 'No form downloaded yet'}
              </span>
            )}
            {(!form || formLoading) && (
              <button
                style={{
                  background: '#fff', color: 'var(--primary)',
                  border: 'none', borderRadius: 4, padding: '4px 10px',
                  fontSize: 11, fontWeight: 700, cursor: 'pointer',
                }}
                onClick={fetchForm}
                disabled={!isOnline || formLoading}
              >
                {formLoading ? '…' : 'Download'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
        gap: 1, background: 'var(--border)', marginBottom: 8,
      }}>
        {[
          { v: stats.total,   l: 'Total',   c: 'var(--primary)' },
          { v: stats.synced,  l: 'Synced',  c: 'var(--secondary)' },
          { v: stats.pending, l: 'Pending', c: 'var(--warning)' },
          { v: stats.draft,   l: 'Draft',   c: 'var(--text-muted)' },
        ].map((s) => (
          <div key={s.l} style={{ background: '#fff', padding: '12px 6px', textAlign: 'center' }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: s.c, lineHeight: 1 }}>{s.v}</div>
            <div style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
              letterSpacing: '0.08em', color: 'var(--text-muted)', marginTop: 3,
            }}>{s.l}</div>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div style={{ background: '#fff', marginBottom: 8 }}>
        <div className="section-header">Quick Actions</div>

        <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/surveys/new')}>
          <div className="list-item-icon" style={{ background: 'var(--primary-bg)' }}>➕</div>
          <div className="list-item-body">
            <div className="list-item-title">Start New Survey</div>
            <div className="list-item-sub">Capture a new industrial establishment</div>
          </div>
          <span style={{ color: 'var(--text-muted)', fontSize: 18 }}>›</span>
        </div>

        {pendingCount > 0 && (
          <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/sync')}>
            <div className="list-item-icon" style={{ background: 'var(--warning-bg)', color: 'var(--warning)' }}>↻</div>
            <div className="list-item-body">
              <div className="list-item-title">Sync Pending Responses</div>
              <div className="list-item-sub">
                {pendingCount} response{pendingCount > 1 ? 's' : ''} waiting to upload
              </div>
            </div>
            <span className="chip chip-warning">{pendingCount}</span>
          </div>
        )}

        {hasPermission('SURVEY_CONFIRM') && pendingUnits > 0 && (
          <div className="list-item" style={{ cursor: 'pointer' }} onClick={() => navigate('/supervisor')}>
            <div className="list-item-icon" style={{ background: 'var(--success-bg)', color: 'var(--secondary)' }}>✓</div>
            <div className="list-item-body">
              <div className="list-item-title">Review Units</div>
              <div className="list-item-sub">
                {pendingUnits} unit{pendingUnits > 1 ? 's' : ''} awaiting confirmation
              </div>
            </div>
            <span className="chip chip-warning">{pendingUnits}</span>
          </div>
        )}

        <div className="list-item" style={{ cursor: 'pointer' }} onClick={fetchForm}>
          <div className="list-item-icon" style={{ background: 'var(--primary-bg)' }}>⬇</div>
          <div className="list-item-body">
            <div className="list-item-title">Refresh Survey Form</div>
            <div className="list-item-sub">
              {isOnline ? 'Download latest version from server' : 'Offline — connect to refresh'}
            </div>
          </div>
          {formLoading && <span className="spinner spinner-sm" />}
        </div>
      </div>

      {/* ── Recent surveys ── */}
      {recentResponses.length > 0 && (
        <div style={{ background: '#fff', marginBottom: 8 }}>
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '14px 14px 6px',
          }}>
            <span className="section-header" style={{ padding: 0 }}>Recent Surveys</span>
            <Link to="/surveys" style={{ fontSize: 12, color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
              See All
            </Link>
          </div>

          {recentResponses.map((r) => (
            <div key={r.response_id} className="list-item">
              <div className="list-item-icon" style={{ fontSize: 18 }}>🏭</div>
              <div className="list-item-body">
                <div className="list-item-title truncate">{getSurveyUnitName(r)}</div>
                <div className="list-item-sub">
                  {new Date(r.created_at).toLocaleDateString()} · {r.answers.length} answers
                </div>
              </div>
              <span className={`chip ${statusChip[r.sync_status] ?? 'chip-neutral'}`}>
                {r.sync_status.replace('_', ' ')}
              </span>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => downloadSurveyPdf(r)}
                aria-label={`Download PDF for ${getSurveyUnitName(r)}`}
              >
                ⬇ PDF
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
