import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../lib/api';
import { downloadSurveyPdf } from '../lib/surveyPdf';

export default function UnitDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [unit, setUnit] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actioning, setActioning] = useState(false);
  const [error, setError] = useState('');
  const [remarks, setRemarks] = useState('');
  const [showRemarks, setShowRemarks] = useState<'approve' | 'reject' | null>(null);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (!id) return;
    api.units.get(id)
      .then(setUnit)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  const doAction = async (action: 'approve' | 'reject') => {
    if (!id) return;
    setActioning(true);
    setError('');
    try {
      if (action === 'approve') {
        await api.units.approve(id, { remarks: remarks || undefined });
        setSuccessMsg('✅ Unit successfully approved and marked as Active.');
      } else {
        await api.units.reject(id, { remarks: remarks || undefined });
        setSuccessMsg('❌ Unit has been rejected.');
      }
      setShowRemarks(null);
      setRemarks('');
      // Reload unit
      const updated = await api.units.get(id);
      setUnit(updated);
    } catch (e: any) {
      setError(e.message || 'Action failed.');
    } finally {
      setActioning(false);
    }
  };

  if (loading) return <div className="loading-center"><div className="spinner" /></div>;
  if (error && !unit) return <div className="alert alert-error">{error}</div>;
  if (!unit) return null;

  const rows: [string, string][] = [
    ['Unit Code',      unit.unit_code],
    ['Ownership Type', unit.ownership_type || '—'],
    ['Operational Status', unit.operational_status],
    ['GPS Accuracy',   unit.gps_accuracy_m ? `±${unit.gps_accuracy_m}m` : '—'],
    ['Province',       unit.province_id ? `Province ${unit.province_id}` : '—'],
    ['District',       unit.district_id ? `District ${unit.district_id}` : '—'],
    ['Created At',     new Date(unit.created_at).toLocaleString()],
    ['Verified',       unit.is_verified ? 'Yes' : 'No'],
    ['Verified At',    unit.verified_at ? new Date(unit.verified_at).toLocaleString() : '—'],
  ];

  return (
    <div>
      <div className="flex items-center gap-12" style={{ marginBottom: 20 }}>
        <button className="btn btn-ghost" onClick={() => navigate('/supervisor')}>← Back</button>
        <h1 style={{ flex: 1 }}>{unit.unit_name}</h1>
        <button className="btn btn-outline btn-sm" onClick={() => downloadSurveyPdf(unit, unit.unit_code || id)}>
          ⇩ Download PDF
        </button>
        <span className={`badge ${unit.is_verified ? 'badge-green' : 'badge-yellow'}`} style={{ fontSize: '0.9rem', padding: '6px 14px' }}>
          {unit.is_verified ? 'Verified' : 'Unverified'}
        </span>
      </div>

      {successMsg && <div className="alert alert-success">{successMsg}</div>}
      {error && <div className="alert alert-error">{error}</div>}

      {/* Unit details */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header"><h3>Unit Details</h3></div>
        <table style={{ width: '100%' }}>
          <tbody>
            {rows.map(([label, value]) => (
              <tr key={label}>
                <td style={{ width: '40%', padding: '10px 0', fontWeight: 600, color: 'var(--text-muted)', fontSize: '0.875rem' }}>{label}</td>
                <td style={{ padding: '10px 0', fontSize: '0.875rem' }}>{value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Action buttons */}
      {!unit.is_verified && (
        <div className="card">
          <div className="card-header"><h3>Review Action</h3></div>
          <p className="text-muted" style={{ marginBottom: 16 }}>
            Review the unit details above and approve or reject this industrial unit record.
          </p>

          {!showRemarks ? (
            <div style={{ display: 'flex', gap: 12 }}>
              <button className="btn btn-success btn-lg" style={{ flex: 1 }} onClick={() => setShowRemarks('approve')}>
                ✅ Approve Unit
              </button>
              <button className="btn btn-danger btn-lg" style={{ flex: 1 }} onClick={() => setShowRemarks('reject')}>
                ❌ Reject Unit
              </button>
            </div>
          ) : (
            <div>
              <div className="form-group">
                <label className="form-label">
                  {showRemarks === 'approve' ? '✅ Approval Remarks' : '❌ Rejection Reason'} (optional)
                </label>
                <textarea
                  className="form-textarea"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={showRemarks === 'approve' ? 'Add approval notes…' : 'Reason for rejection…'}
                />
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button className="btn btn-ghost" onClick={() => { setShowRemarks(null); setRemarks(''); }}>Cancel</button>
                <button
                  className={`btn ${showRemarks === 'approve' ? 'btn-success' : 'btn-danger'} btn-lg`}
                  style={{ flex: 1 }}
                  onClick={() => doAction(showRemarks)}
                  disabled={actioning}
                >
                  {actioning ? <><span className="spinner spinner-sm" /> Processing…</> : (showRemarks === 'approve' ? 'Confirm Approve' : 'Confirm Reject')}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {unit.is_verified && (
        <div className="alert alert-success">
          ✅ This unit has already been verified and approved.
        </div>
      )}
    </div>
  );
}
