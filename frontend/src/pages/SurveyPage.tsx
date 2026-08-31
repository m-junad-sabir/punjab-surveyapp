import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useSurvey } from '../context/SurveyContext';
import { useAuth } from '../context/AuthContext';
import { saveResponse, getResponse } from '../lib/db';
import { getDeviceId } from '../lib/deviceId';
import type { OfflineResponse, SurveySection, SurveyQuestion, LogicRule } from '../types';

// ─── Question visibility logic ────────────────────────────────────────────────
function isQuestionVisible(
  question: SurveyQuestion,
  answers: Record<number, any>,
  rules: LogicRule[],
): boolean {
  const questionRules = rules.filter((r) => r.question_id === question.question_id);
  if (questionRules.length === 0) return true; // no rules = always visible

  for (const rule of questionRules) {
    const condVal = String(answers[rule.condition_question_id] ?? '').toLowerCase();
    const ruleVal = rule.condition_value.toLowerCase();
    let condMet = false;
    switch (rule.condition_operator) {
      case '=':  condMet = condVal === ruleVal; break;
      case '!=': condMet = condVal !== ruleVal; break;
      case '>':  condMet = parseFloat(condVal) > parseFloat(ruleVal); break;
      case '<':  condMet = parseFloat(condVal) < parseFloat(ruleVal); break;
      case '>=': condMet = parseFloat(condVal) >= parseFloat(ruleVal); break;
      case '<=': condMet = parseFloat(condVal) <= parseFloat(ruleVal); break;
      case 'in': condMet = ruleVal.split(',').map((v) => v.trim()).includes(condVal); break;
    }
    if (rule.action === 'show' && condMet) return true;
    if (rule.action === 'hide' && condMet) return false;
  }
  // If only 'show' rules exist, default to hidden
  return !questionRules.some((r) => r.action === 'show');
}

// ─── Individual question renderer ─────────────────────────────────────────────
function QuestionField({
  q,
  value,
  onChange,
  error,
}: {
  q: SurveyQuestion;
  value: any;
  onChange: (v: any) => void;
  error?: string;
}) {
  const [gpsLoading, setGpsLoading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState<string | null>(value?.preview || null);

  const captureGps = () => {
    if (!navigator.geolocation) { alert('GPS not supported.'); return; }
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setGpsLoading(false);
      },
      (err) => { alert('GPS error: ' + err.message); setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPhotoPreview(dataUrl);
      onChange({ file_name: file.name, preview: dataUrl, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  switch (q.question_type) {
    case 'text':
      return (
        <input
          className={`form-input ${error ? 'error' : ''}`}
          type="text"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text..."
        />
      );
    case 'number':
      return (
        <input
          className={`form-input ${error ? 'error' : ''}`}
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
          min={q.validation_rule?.min}
          max={q.validation_rule?.max}
          placeholder={`Number${q.validation_rule?.min !== undefined ? ` (${q.validation_rule.min}–${q.validation_rule.max})` : ''}`}
        />
      );
    case 'date':
      return (
        <input
          className={`form-input ${error ? 'error' : ''}`}
          type="date"
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        />
      );
    case 'select':
      return (
        <select
          className={`form-select ${error ? 'error' : ''}`}
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">— Select an option —</option>
          {(q.options || []).map((opt) => (
            <option key={opt} value={opt}>{opt}</option>
          ))}
        </select>
      );
    case 'multiselect': {
      const selected: string[] = Array.isArray(value) ? value : [];
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(q.options || []).map((opt) => (
            <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={(e) => {
                  const next = e.target.checked
                    ? [...selected, opt]
                    : selected.filter((s) => s !== opt);
                  onChange(next);
                }}
              />
              {opt}
            </label>
          ))}
        </div>
      );
    }
    case 'boolean':
      return (
        <div className="toggle-wrapper">
          <label className="toggle">
            <input
              type="checkbox"
              checked={value === true || value === 'true'}
              onChange={(e) => onChange(e.target.checked)}
            />
            <span className="toggle-slider" />
          </label>
          <span>{value === true || value === 'true' ? 'Yes' : 'No'}</span>
        </div>
      );
    case 'gps':
      return (
        <div className={`gps-capture ${value?.lat ? 'captured' : ''}`}>
          {value?.lat ? (
            <>
              <div>📍 Location captured</div>
              <div className="gps-coords">
                {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
                {value.accuracy ? ` • ±${Math.round(value.accuracy)}m` : ''}
              </div>
              <button className="btn btn-outline btn-sm" style={{ marginTop: 10 }} onClick={captureGps}>
                🔄 Re-capture
              </button>
            </>
          ) : (
            <>
              <div className="text-muted" style={{ marginBottom: 12 }}>📍 GPS location not captured</div>
              <button
                className="btn btn-primary btn-sm"
                onClick={captureGps}
                disabled={gpsLoading}
              >
                {gpsLoading ? <><span className="spinner spinner-sm" /> Getting location…</> : '📍 Capture GPS'}
              </button>
            </>
          )}
        </div>
      );
    case 'photo':
      return (
        <div>
          <label className="photo-upload" htmlFor={`photo-${q.question_id}`}>
            {photoPreview ? (
              <img src={photoPreview} alt="preview" className="photo-preview" />
            ) : (
              <>
                <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                <div>Tap to capture or upload photo</div>
              </>
            )}
          </label>
          <input
            id={`photo-${q.question_id}`}
            type="file"
            accept="image/*"
            capture="environment"
            style={{ display: 'none' }}
            onChange={handlePhoto}
          />
          {photoPreview && (
            <button className="btn btn-ghost btn-sm" style={{ marginTop: 6 }} onClick={() => { setPhotoPreview(null); onChange(null); }}>
              ✕ Remove
            </button>
          )}
        </div>
      );
    default:
      return <input className="form-input" type="text" value={value || ''} onChange={(e) => onChange(e.target.value)} />;
  }
}

// ─── Main Survey Page ──────────────────────────────────────────────────────────
export default function SurveyPage() {
  const { id } = useParams<{ id: string }>();
  const { form } = useSurvey();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState(0);
  const [answers, setAnswers] = useState<Record<number, any>>({});
  const [errors, setErrors] = useState<Record<number, string>>({});
  const [saving, setSaving] = useState(false);
  const [responseId] = useState(id || uuidv4());
  const [startedAt] = useState(new Date().toISOString());
  const [existingStatus, setExistingStatus] = useState<string>('draft');
  const topRef = useRef<HTMLDivElement>(null);

  // Load existing draft if editing
  useEffect(() => {
    if (id) {
      getResponse(id).then((r) => {
        if (r) {
          const map: Record<number, any> = {};
          r.answers.forEach((a) => { map[a.question_id] = a.answer_value; });
          setAnswers(map);
          setExistingStatus(r.sync_status);
        }
      });
    }
  }, [id]);

  if (!form) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <h3>No form available</h3>
        <p>Please go to Dashboard and download the survey form first.</p>
      </div>
    );
  }

  const section: SurveySection = form.sections[currentSection];
  const visibleQuestions = section.questions.filter((q) =>
    isQuestionVisible(q, answers, form.logic),
  );

  const setAnswer = (questionId: number, value: any) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    if (errors[questionId]) {
      setErrors((prev) => { const e = { ...prev }; delete e[questionId]; return e; });
    }
  };

  const validateSection = (): boolean => {
    const newErrors: Record<number, string> = {};
    for (const q of visibleQuestions) {
      if (!q.is_mandatory) continue;
      const val = answers[q.question_id];
      const isEmpty =
        val === undefined || val === null || val === '' ||
        (Array.isArray(val) && val.length === 0);
      if (isEmpty) {
        newErrors[q.question_id] = 'This field is required.';
      }
      // Number range validation
      if (q.question_type === 'number' && val !== null && val !== undefined && q.validation_rule) {
        if (q.validation_rule.min !== undefined && val < q.validation_rule.min)
          newErrors[q.question_id] = `Minimum value is ${q.validation_rule.min}.`;
        if (q.validation_rule.max !== undefined && val > q.validation_rule.max)
          newErrors[q.question_id] = `Maximum value is ${q.validation_rule.max}.`;
      }
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const buildResponse = (status: 'draft' | 'pending_sync'): OfflineResponse => {
    const gpsQuestion = form.sections.flatMap((s) => s.questions).find((q) => q.question_type === 'gps');
    const gpsVal = gpsQuestion ? answers[gpsQuestion.question_id] : null;

    return {
      response_id: responseId,
      form_id: form.form_id,
      surveyor_id: user!.user_id,
      device_id: getDeviceId(),
      gps_lat: gpsVal?.lat,
      gps_lng: gpsVal?.lng,
      gps_accuracy_m: gpsVal?.accuracy,
      started_at: startedAt,
      submitted_at: status === 'pending_sync' ? new Date().toISOString() : undefined,
      answers: Object.entries(answers).map(([qid, val]) => ({
        question_id: parseInt(qid),
        answer_value: val,
      })),
      sync_status: status,
      created_at: new Date().toISOString(),
    };
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      await saveResponse(buildResponse('draft'));
      navigate('/surveys');
    } finally {
      setSaving(false);
    }
  };

  const goNext = async () => {
    if (!validateSection()) {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    if (currentSection < form.sections.length - 1) {
      setCurrentSection((s) => s + 1);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const goPrev = () => {
    setCurrentSection((s) => Math.max(0, s - 1));
    topRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const submitSurvey = async () => {
    if (!validateSection()) {
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setSaving(true);
    try {
      await saveResponse(buildResponse('pending_sync'));
      navigate('/surveys');
    } finally {
      setSaving(false);
    }
  };

  const isLastSection = currentSection === form.sections.length - 1;

  // Progress
  const totalMandatory = form.sections.flatMap((s) => s.questions).filter((q) => q.is_mandatory).length;
  const answeredMandatory = form.sections
    .flatMap((s) => s.questions)
    .filter((q) => q.is_mandatory && answers[q.question_id] !== undefined && answers[q.question_id] !== null && answers[q.question_id] !== '')
    .length;
  const progress = totalMandatory > 0 ? Math.round((answeredMandatory / totalMandatory) * 100) : 0;

  return (
    <div ref={topRef}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div className="flex items-center gap-12" style={{ marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/surveys')}>← Back</button>
          <h1 style={{ flex: 1 }}>{form.title}</h1>
          <button className="btn btn-ghost btn-sm" onClick={saveAsDraft} disabled={saving}>
            💾 Save Draft
          </button>
        </div>
        <div style={{ marginBottom: 8 }}>
          <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
            <span className="text-small text-muted">Completion: {progress}%</span>
            <span className="text-small text-muted">{answeredMandatory}/{totalMandatory} mandatory</span>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${progress < 40 ? 'danger' : progress < 80 ? 'warning' : ''}`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>

      {/* Section tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, overflowX: 'auto', paddingBottom: 4 }}>
        {form.sections.map((s, i) => (
          <button
            key={s.section_id}
            className={`btn btn-sm ${i === currentSection ? 'btn-primary' : 'btn-ghost'}`}
            style={{ whiteSpace: 'nowrap' }}
            onClick={() => setCurrentSection(i)}
          >
            {i + 1}. {s.title}
          </button>
        ))}
      </div>

      {/* Section card */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <h2>{section.title}</h2>
          <span className="text-small text-muted">Section {currentSection + 1} of {form.sections.length}</span>
        </div>

        {visibleQuestions.map((q) => (
          <div key={q.question_id} className={`question-card ${errors[q.question_id] ? 'error' : ''}`}>
            <div className="question-meta">
              <span className="question-code">{q.question_code}</span>
              {q.is_mandatory && <span className="question-mandatory">* Required</span>}
            </div>
            <label className="form-label" style={{ marginBottom: 10 }}>
              {q.question_text}
            </label>
            <QuestionField
              q={q}
              value={answers[q.question_id]}
              onChange={(v) => setAnswer(q.question_id, v)}
              error={errors[q.question_id]}
            />
            {errors[q.question_id] && (
              <div className="form-error">{errors[q.question_id]}</div>
            )}
          </div>
        ))}

        {visibleQuestions.length === 0 && (
          <div className="text-muted text-center" style={{ padding: '20px 0' }}>
            No visible questions in this section based on your answers.
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between items-center">
        <button className="btn btn-ghost" onClick={goPrev} disabled={currentSection === 0}>
          ← Previous
        </button>
        {isLastSection ? (
          <button className="btn btn-success btn-lg" onClick={submitSurvey} disabled={saving}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : '✅ Submit Survey'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={goNext}>
            Next Section →
          </button>
        )}
      </div>
    </div>
  );
}
