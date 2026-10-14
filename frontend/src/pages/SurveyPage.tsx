import { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useSurvey } from '../context/SurveyContext';
import { useAuth }   from '../context/AuthContext';
import { saveResponse, getResponse } from '../lib/db';
import { getDeviceId } from '../lib/deviceId';
import { downloadSurveyPdf } from '../lib/surveyPdf';
import type {
  OfflineResponse,
  SurveySection,
  SurveyQuestion,
  QuestionOption,
  AnswerType,
  SurveyInputField,
  SurveyMatrixItem,
} from '../types';

// ─── GPS capture ──────────────────────────────────────────────────────────────
function GpsField({ value, onChange }: { value: any; onChange: (v: any) => void }) {
  const [loading, setLoading] = useState(false);

  const capture = () => {
    if (!navigator.geolocation) { alert('GPS not supported on this device.'); return; }
    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        onChange({ lat: pos.coords.latitude, lng: pos.coords.longitude, accuracy: pos.coords.accuracy });
        setLoading(false);
      },
      (err) => { alert('GPS error: ' + err.message); setLoading(false); },
      { enableHighAccuracy: true, timeout: 20000 },
    );
  };

  return (
    <div style={{
      background: value?.lat ? 'var(--success-bg)' : 'var(--surface2)',
      border: `1.5px dashed ${value?.lat ? 'var(--secondary)' : 'var(--border)'}`,
      borderRadius: 'var(--radius)', padding: 14, textAlign: 'center',
    }}>
      {value?.lat ? (
        <>
          <div style={{ fontSize: 22, marginBottom: 4 }}>📍</div>
          <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--success)' }}>Location Captured</div>
          <div style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--primary)', marginTop: 4 }}>
            {value.lat.toFixed(6)}, {value.lng.toFixed(6)}
            {value.accuracy != null ? ` · ±${Math.round(value.accuracy)}m` : ''}
          </div>
          <button className="btn btn-ghost btn-sm" style={{ marginTop: 10 }} onClick={capture}>
            🔄 Re-capture
          </button>
        </>
      ) : (
        <>
          <div style={{ fontSize: 28, marginBottom: 8 }}>📍</div>
          <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
            GPS location not captured yet
          </div>
          <button className="btn btn-primary btn-sm" onClick={capture} disabled={loading}>
            {loading ? <><span className="spinner spinner-sm" /> Getting…</> : 'Capture GPS Location'}
          </button>
        </>
      )}
    </div>
  );
}

// ─── Photo capture ────────────────────────────────────────────────────────────
function PhotoField({ qid, value, onChange }: { qid: number; value: any; onChange: (v: any) => void }) {
  const [preview, setPreview] = useState<string | null>(value?.preview ?? null);

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      setPreview(dataUrl);
      onChange({ file_name: file.name, preview: dataUrl, type: file.type });
    };
    reader.readAsDataURL(file);
  };

  return (
    <div>
      <label htmlFor={`photo-${qid}`} style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', background: 'var(--surface2)',
        border: '1.5px dashed var(--border)', borderRadius: 'var(--radius)',
        padding: 16, cursor: 'pointer', minHeight: 100,
      }}>
        {preview
          ? <img src={preview} alt="preview" style={{ maxWidth: '100%', maxHeight: 140, borderRadius: 6, objectFit: 'cover' }} />
          : <><div style={{ fontSize: 28, marginBottom: 6 }}>📷</div>
              <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Tap to capture or upload</div></>
        }
      </label>
      <input id={`photo-${qid}`} type="file" accept="image/*" capture="environment"
        style={{ display: 'none' }} onChange={handleFile} />
      {preview && (
        <button className="btn btn-ghost btn-sm" style={{ marginTop: 6, color: 'var(--danger)' }}
          onClick={() => { setPreview(null); onChange(null); }}>
          ✕ Remove
        </button>
      )}
    </div>
  );
}

// ─── CHOICE (single select) ───────────────────────────────────────────────────
function selectedOptionId(value: any): number | null {
  const id = value && typeof value === 'object' ? value.option_id : value;
  return Number.isInteger(id) ? id : null;
}

function selectedOtherText(value: any): string {
  return value && typeof value === 'object' && typeof value.other_text === 'string'
    ? value.other_text
    : '';
}

function ChoiceField({ options, value, onChange, error }: {
  options: QuestionOption[]; value: any; onChange: (v: any) => void; error?: string;
}) {
  const selectedId = selectedOptionId(value);
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <>
      <select
        className={`form-select ${error ? 'error' : ''}`}
        value={selectedId ?? ''}
        onChange={(e) => {
          if (e.target.value === '') { onChange(null); return; }
          const id = parseInt(e.target.value, 10);
          const option = options.find((item) => item.id === id);
          onChange(option?.requires_text
            ? { option_id: id, other_text: selectedOtherText(value) }
            : id);
        }}
      >
        <option value="">— Select an option —</option>
        {options.map((opt) => (
          <option key={opt.id} value={opt.id}>{opt.label}</option>
        ))}
      </select>
      {selectedOption?.requires_text && (
        <input
          className="form-input"
          style={{ marginTop: 8 }}
          value={selectedOtherText(value)}
          onChange={(event) => onChange({
            option_id: selectedOption.id,
            other_text: event.target.value,
          })}
          placeholder="Please specify"
        />
      )}
    </>
  );
}

// ─── MULTI_CHOICE (checkboxes) ────────────────────────────────────────────────
function MultiChoiceField({ options, value, onChange }: {
  options: QuestionOption[]; value: any; onChange: (v: any) => void;
}) {
  const selected: number[] = Array.isArray(value) ? value : [];
  const selectedIds = Array.isArray(value) ? selected : value?.option_ids ?? [];
  const otherText: Record<number, string> =
    value && !Array.isArray(value) && typeof value === 'object' ? value.other_text ?? {} : {};

  const toggle = (id: number, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((s: number) => s !== id);
    const nextOtherText = { ...otherText };
    if (!checked) delete nextOtherText[id];
    onChange(Object.keys(nextOtherText).length ? { option_ids: next, other_text: nextOtherText } : next);
  };

  const chosen = (id: number) => Array.isArray(value)
    ? selected.includes(id)
    : (value?.option_ids ?? []).includes(id);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((opt) => {
        const isChecked = chosen(opt.id);
        return (
          <div key={opt.id}>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer',
              padding: '9px 12px',
              background: isChecked ? 'var(--primary-bg)' : 'var(--surface2)',
              border: `1.5px solid ${isChecked ? 'var(--primary)' : 'var(--border)'}`,
              borderRadius: 'var(--radius-sm)', fontSize: 13, transition: 'all 0.15s',
            }}>
              <input type="checkbox" checked={isChecked}
                onChange={(e) => toggle(opt.id, e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }} />
              <span>{opt.label}</span>
            </label>
            {isChecked && opt.requires_text && (
              <input className="form-input" style={{ marginTop: 6 }}
                value={otherText[opt.id] ?? ''}
                onChange={(event) => onChange({
                  option_ids: selectedIds,
                  other_text: { ...otherText, [opt.id]: event.target.value },
                })}
                placeholder="Please specify" />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── SHARE_PERCENT (percentage breakdown) ─────────────────────────────────────
function SharePercentField({ options, value, onChange }: {
  options: QuestionOption[]; value: any; onChange: (v: any) => void;
}) {
  const map: Record<number, any> = value && typeof value === 'object' ? value : {};

  const set = (id: number, raw: string) => {
    const num = raw === '' ? 0 : Math.min(100, Math.max(0, parseFloat(raw) || 0));
    const previous = map[id];
    onChange({
      ...map,
      [id]: options.find((option) => option.id === id)?.requires_text
        ? { percent: num, other_text: previous?.other_text ?? '' }
        : num,
    });
  };

  const total = Object.values(map).reduce((sum, entry) =>
    sum + (typeof entry === 'number' ? entry : Number(entry?.percent) || 0), 0);
  const overLimit = total > 100;

  return (
    <div>
      {options.map((opt) => (
        <div key={opt.id} style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: 1, fontSize: 13 }}>{opt.label}</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <input
                type="number" min={0} max={100} step={1}
                value={typeof map[opt.id] === 'number' ? map[opt.id] : map[opt.id]?.percent ?? ''}
                onChange={(e) => set(opt.id, e.target.value)}
                style={{
                  width: 72, textAlign: 'right',
                  padding: '6px 8px',
                  border: `1.5px solid ${overLimit ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', fontSize: 13,
                  background: 'var(--surface2)',
                }}
              />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
            </div>
          </div>
          {opt.requires_text && (
            <input className="form-input" style={{ marginTop: 6 }}
              value={map[opt.id]?.other_text ?? ''}
              onChange={(event) => onChange({
                ...map,
                [opt.id]: {
                  percent: typeof map[opt.id] === 'number' ? map[opt.id] : map[opt.id]?.percent ?? 0,
                  other_text: event.target.value,
                },
              })}
              placeholder="Please specify" />
          )}
        </div>
      ))}
      <div style={{
        fontSize: 11, fontWeight: 700, textAlign: 'right', marginTop: 4,
        color: overLimit ? 'var(--danger)' : total === 100 ? 'var(--success)' : 'var(--text-muted)',
      }}>
        Total: {total.toFixed(0)}% {overLimit ? '⚠ exceeds 100%' : total === 100 ? '✓' : ''}
      </div>
    </div>
  );
}

// ─── MATRIX ───────────────────────────────────────────────────────────────────
function MatrixField({ question, value, onChange }: {
  question: SurveyQuestion; value: any; onChange: (v: any) => void;
}) {
  const items = question.matrix_items ?? [];

  if (!items.length) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
        No matrix rows are configured for this question.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {items.map((item) => {
        const entry = value?.[item.id] ?? value?.[item.code] ?? {};
        return (
          <div key={item.id} style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
            {item.group_label && (
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                {item.group_label}
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 7 }}>{item.label}</div>
            {item.answer_type === 'RATING_1_5' ? (
              <select className="form-select" value={entry.rating ?? ''}
                onChange={(event) => onChange({
                  ...value,
                  [item.id]: { ...entry, rating: event.target.value ? Number(event.target.value) : null },
                })}>
                <option value="">— Select rating —</option>
                {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            ) : (
              <ChoiceField
                options={item.options}
                value={entry.choice_value_id == null ? null : {
                  option_id: entry.choice_value_id,
                  other_text: entry.other_text ?? '',
                }}
                onChange={(selection) => onChange({
                  ...value,
                  [item.id]: selection == null
                    ? {}
                    : typeof selection === 'object'
                      ? { choice_value_id: selection.option_id, other_text: selection.other_text }
                      : { choice_value_id: selection, other_text: '' },
                })}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function InputFieldControl({ field, value, onChange }: {
  field: SurveyInputField;
  value: any;
  onChange: (value: any) => void;
}) {
  switch (field.type) {
    case 'TEXT':
      return <input className="form-input" value={value ?? ''}
        onChange={(event) => onChange(event.target.value)} placeholder="Enter text…" />;
    case 'NUMBER':
      return <input className="form-input" type="number" value={value ?? ''}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        placeholder="Enter number" />;
    case 'YES_NO':
      return (
        <select className="form-select" value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value === 'true')}>
          <option value="">— Select —</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );
    case 'SINGLE_CHOICE':
      return <ChoiceField options={field.options} value={value} onChange={onChange} />;
    case 'MULTI_CHOICE':
    case 'MONTHS':
      return <MultiChoiceField options={field.options} value={value} onChange={onChange} />;
    case 'SHARE_PERCENT':
      return <SharePercentField options={field.options} value={value} onChange={onChange} />;
    case 'GPS':
      return <GpsField value={value} onChange={onChange} />;
    default:
      return null;
  }
}

function FieldGroup({ fields, value, onChange }: {
  fields: SurveyInputField[];
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
}) {
  const map = value && typeof value === 'object' ? value : {};

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {fields.map((field) => {
        let options = field.options;
        const parentKey: Record<string, string> = {
          division_id: 'province_id',
          district_id: 'division_id',
          tehsil_id: 'district_id',
          psic_group_id: 'psic_division_id',
          psic_class_id: 'psic_group_id',
          disposal_method_ids: 'waste_type_id',
          purpose_ids: 'collaborator_type_id',
        };
        const parentValue = parentKey[field.key]
          ? selectedOptionId(map[parentKey[field.key]]) ?? map[parentKey[field.key]]
          : undefined;
        const hasParentLinks = options.some(
          (option) => option.parent_id !== undefined && option.parent_id !== null,
        );
        if (parentValue != null && hasParentLinks) {
          options = options.filter((option) => option.parent_id === parentValue);
        } else if (parentKey[field.key] && parentValue == null && hasParentLinks) {
          options = [];
        }

        const visibleField = { ...field, options };
        if (field.key === 'transformation_stage_ids' && map.product_kind === 2) return null;
        if (['revenue_share_pct', 'hs_code_id'].includes(field.key) && map.product_kind === 2) return null;
        if (field.key === 'company_name' && map.has_parent_company === false) return null;
        if (field.key === 'reinvestment_area_other' && !map.reinvestment_area_id) return null;

        const controlValue = map[field.key];
        const isMonths = field.type === 'MONTHS';

        return (
          <div key={field.key} style={{ gridColumn: isMonths ? '1 / -1' : undefined }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <InputFieldControl
              field={visibleField}
              value={controlValue}
              onChange={(next) => onChange({ ...map, [field.key]: next })}
            />
          </div>
        );
      })}
    </div>
  );
}

function StructuredQuestionField({ question, value, onChange }: {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
}) {
  const fields = question.fields ?? [];
  if (!question.repeatable) {
    return <FieldGroup fields={fields} value={value ?? {}} onChange={onChange} />;
  }

  const rows: Array<Record<string, any>> = Array.isArray(value) ? value : [];
  const updateRow = (index: number, row: Record<string, any>) =>
    onChange(rows.map((item, i) => i === index ? row : item));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {rows.map((row, index) => (
        <div key={index} className="card" style={{ padding: 12, background: 'var(--surface2)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <strong style={{ fontSize: 12 }}>Entry {index + 1}</strong>
            <button type="button" className="btn btn-ghost btn-sm"
              style={{ color: 'var(--danger)' }}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}>
              Remove
            </button>
          </div>
          <FieldGroup fields={fields} value={row} onChange={(updated) => updateRow(index, updated)} />
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm"
        onClick={() => onChange([...rows, {}])}>
        + Add entry
      </button>
    </div>
  );
}

// ─── Universal question renderer ──────────────────────────────────────────────
function QuestionField({ q, value, onChange, error }: {
  q: SurveyQuestion; value: any; onChange: (v: any) => void; error?: string;
}) {
  const errCls = error ? 'error' : '';

  if (q.fields?.length) {
    return <StructuredQuestionField question={q} value={value} onChange={onChange} />;
  }

  switch (q.answer_type as AnswerType) {
    case 'TEXT':
      return (
        <input className={`form-input ${errCls}`} type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter text…" />
      );

    case 'NUMBER':
      return (
        <input className={`form-input ${errCls}`} type="number"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value === '' ? null : parseFloat(e.target.value))}
          placeholder="Enter number" />
      );

    case 'DATE':
      return (
        <input className={`form-input ${errCls}`} type="date"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)} />
      );

    case 'CHOICE':
    case 'SINGLE_CHOICE':
      return <ChoiceField options={q.options} value={value} onChange={onChange} error={error} />;

    case 'YES_NO':
      return (
        <select className={`form-select ${errCls}`} value={value === true ? 'true' : value === false ? 'false' : ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value === 'true')}>
          <option value="">— Select —</option>
          <option value="true">Yes</option>
          <option value="false">No</option>
        </select>
      );

    case 'MULTI_CHOICE':
      return <MultiChoiceField options={q.options} value={value} onChange={onChange} />;

    case 'SHARE_PERCENT':
      return <SharePercentField options={q.options} value={value} onChange={onChange} />;

    case 'MATRIX':
      return <MatrixField question={q} value={value} onChange={onChange} />;

    case 'REPEATING_GROUP':
      return <StructuredQuestionField question={q} value={value} onChange={onChange} />;

    case 'GPS':
      return <GpsField value={value} onChange={onChange} />;

    case 'PHOTO':
      return <PhotoField qid={q.question_id} value={value} onChange={onChange} />;

    default:
      return (
        <input className={`form-input ${errCls}`} type="text"
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Enter value…" />
      );
  }
}

// ─── Section scroll strip ─────────────────────────────────────────────────────
function SectionStrip({
  sections, current, answers, onClick,
}: {
  sections:  SurveySection[];
  current:   number;
  answers:   Record<number, any>;
  onClick:   (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = scrollRef.current?.children[current] as HTMLElement | undefined;
    el?.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
  }, [current]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18,
        background: 'linear-gradient(to right, var(--surface), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 18,
        background: 'linear-gradient(to left, var(--surface), transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <div ref={scrollRef} style={{
        display: 'flex', gap: 6,
        overflowX: 'auto', padding: '4px 20px 10px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
      } as React.CSSProperties}>
        {sections.map((sec, i) => {
          const mandatory = sec.questions.filter((q) => q.is_required);
          const answered  = mandatory.filter((q) => {
            const v = answers[q.question_id];
            return v !== undefined && v !== null && v !== '' && !(Array.isArray(v) && !v.length);
          });
          const complete  = mandatory.length === 0 || answered.length === mandatory.length;
          const partial   = answered.length > 0 && !complete;
          const isActive  = i === current;

          let bg     = 'var(--surface)';
          let border = 'var(--border)';
          let color  = 'var(--text-muted)';
          if (isActive)      { bg = 'var(--primary)'; border = 'var(--primary)'; color = '#fff'; }
          else if (complete) { bg = 'var(--success-bg)'; border = 'var(--secondary)'; color = 'var(--success)'; }
          else if (partial)  { bg = 'var(--warning-bg)'; border = 'var(--warning)'; color = 'var(--warning)'; }

          return (
            <button key={sec.section_id} onClick={() => onClick(i)} title={sec.title}
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                width: 56, height: 52, borderRadius: 10,
                border: `2px solid ${border}`, background: bg, color,
                cursor: 'pointer', padding: 0, transition: 'all 0.15s' }}>
              <span style={{ fontSize: 18, fontWeight: 800, lineHeight: 1 }}>
                {sec.section_code}
              </span>
              <span style={{ fontSize: 9, marginTop: 3, fontWeight: 700, opacity: 0.85 }}>
                {isActive ? 'current' : complete ? '✓ done' : partial ? '…' : 'pending'}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function isEmptyAnswer(value: any): boolean {
  return value === undefined || value === null || value === '' ||
    (Array.isArray(value) && value.length === 0) ||
    (typeof value === 'object' && !Array.isArray(value) && Object.keys(value).length === 0);
}

// ─── Main SurveyPage ──────────────────────────────────────────────────────────
export default function SurveyPage() {
  const { id }   = useParams<{ id: string }>();
  const { form } = useSurvey();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState(0);
  const [answers,  setAnswers]  = useState<Record<number, any>>({});
  const [errors,   setErrors]   = useState<Record<number, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [responseId] = useState(() => id || uuidv4());
  const [startedAt]  = useState(() => new Date().toISOString());
  const topRef = useRef<HTMLDivElement>(null);

  // Load draft if editing
  useEffect(() => {
    if (!id) return;
    getResponse(id).then((r) => {
      if (!r) return;
      const map: Record<number, any> = {};
      r.answers.forEach((a) => { map[a.question_id] = a.answer_value; });
      setAnswers(map);
    });
  }, [id]);

  const setAnswer = useCallback((qid: number, val: any) => {
    setAnswers((prev) => ({ ...prev, [qid]: val }));
    setErrors((prev) => { const e = { ...prev }; delete e[qid]; return e; });
  }, []);

  if (!form) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <h3>No form available</h3>
        <p>Go to Dashboard and download the survey form first.</p>
        <button className="btn btn-primary" style={{ marginTop: 16 }}
          onClick={() => navigate('/dashboard')}>
          Go to Dashboard
        </button>
      </div>
    );
  }

  const section       = form.sections[currentSection];
  const isLastSection = currentSection === form.sections.length - 1;

  // Progress
  const allQs          = form.sections.flatMap((s) => s.questions);
  const questionByCode = new Map(allQs.map((q) => [q.question_code, q]));
  const answerForCode = (code: string) => {
    const question = questionByCode.get(code);
    return question ? answers[question.question_id] : undefined;
  };
  const showQuestion = (q: SurveyQuestion): boolean => {
    if (q.question_code === 'A_PARENT_COMPANY_DETAILS') {
      return answerForCode('A_PARENT_COMPANY')?.has_parent_company === true;
    }
    if (q.question_code === 'B_CLOSURE_REASON') {
      const statusQuestion = questionByCode.get('B_OPERATION_STATUS');
      const statusId = statusQuestion
        ? selectedOptionId(answers[statusQuestion.question_id])
        : null;
      return statusQuestion?.options.find((option) => option.id === statusId)?.code === 'PERM_CLOSED';
    }
    if (q.question_code === 'E_SUPPLY_DISRUPTION_REASON') {
      return answerForCode('E_SUPPLY_DISRUPTION')?.had_supply_disruption === true;
    }
    if (q.question_code === 'F_DEMAND_GAP_REASON') {
      return answerForCode('F_DEMAND_GAP')?.had_demand_gap === true;
    }
    if (q.question_code.startsWith('K_') && q.question_code !== 'K_FUTURE_PLAN') {
      return answerForCode('K_FUTURE_PLAN')?.has_future_plan !== false;
    }
    return true;
  };

  const questionIsIncomplete = (q: SurveyQuestion): boolean => {
    const value = answers[q.question_id];
    if (q.is_required && isEmptyAnswer(value)) return true;
    const fields = q.fields ?? [];
    if (!fields.length) return false;
    if (q.repeatable) {
      return (Array.isArray(value) ? value : []).some((row) =>
        fields.some((field) => field.required && isEmptyAnswer(row[field.key])),
      );
    }
    return fields.some((field) => field.required && isEmptyAnswer(value?.[field.key]));
  };

  const requiredQuestionCount = (q: SurveyQuestion) => {
    const requiredFields = (q.fields ?? []).filter((field) => field.required).length;
    if (q.repeatable) {
      return (Array.isArray(answers[q.question_id]) ? answers[q.question_id].length : 0) * requiredFields;
    }
    return requiredFields || (q.is_required ? 1 : 0);
  };
  const answeredQuestionCount = (q: SurveyQuestion) => {
    const value = answers[q.question_id];
    const requiredFields = (q.fields ?? []).filter((field) => field.required);
    if (q.repeatable) {
      return (Array.isArray(value) ? value : []).reduce((count, row) =>
        count + requiredFields.filter((field) => !isEmptyAnswer(row[field.key])).length, 0);
    }
    if (requiredFields.length) {
      return requiredFields.filter((field) => !isEmptyAnswer(value?.[field.key])).length;
    }
    return q.is_required && !isEmptyAnswer(value) ? 1 : 0;
  };
  const visibleQuestions = allQs.filter(showQuestion);
  const totalMandatory = visibleQuestions.reduce((total, q) => total + requiredQuestionCount(q), 0);
  const answeredMandatory = visibleQuestions.reduce((total, q) => total + answeredQuestionCount(q), 0);
  const progress = totalMandatory > 0 ? Math.round((answeredMandatory / totalMandatory) * 100) : 0;

  // Validate current section before advancing
  const validateSection = (): boolean => {
    const errs: Record<number, string> = {};
    for (const q of section.questions) {
      if (!showQuestion(q)) continue;
      if (questionIsIncomplete(q)) errs[q.question_id] = 'Complete the required fields.';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Resolve GPS answer for the response header
  const buildResponse = (status: 'draft' | 'pending_sync'): OfflineResponse => {
    const gpsQ   = allQs.find((q) => q.answer_type === 'GPS' || q.question_code === 'A_LOCATION_GPS');
    const gpsVal = gpsQ ? answers[gpsQ.question_id] : null;

    return {
      response_id:    responseId,
      form_id:        form.form_id,
      surveyor_id:    user!.user_id,
      device_id:      getDeviceId(),
      gps_lat:        gpsVal?.lat,
      gps_lng:        gpsVal?.lng,
      gps_accuracy_m: gpsVal?.accuracy,
      started_at:     startedAt,
      submitted_at:   status === 'pending_sync' ? new Date().toISOString() : undefined,
      answers: Object.entries(answers).map(([qid, val]) => ({
        question_id:  parseInt(qid),
        answer_value: val,
      })),
      sync_status: status,
      created_at:  new Date().toISOString(),
    };
  };

  const saveAsDraft = async () => {
    setSaving(true);
    try {
      await saveResponse(buildResponse('draft'));
      setSavedMsg(true);
      setTimeout(() => setSavedMsg(false), 2000);
    } finally {
      setSaving(false);
    }
  };

  const scrollTop = () => topRef.current?.scrollIntoView({ behavior: 'smooth' });

  const goNext = () => {
    if (!validateSection()) { scrollTop(); return; }
    setCurrentSection((s) => s + 1);
    setErrors({});
    scrollTop();
  };

  const goPrev = () => {
    setCurrentSection((s) => Math.max(0, s - 1));
    setErrors({});
    scrollTop();
  };

  const jumpTo = (i: number) => {
    setCurrentSection(i);
    setErrors({});
    scrollTop();
  };

  const submitSurvey = async () => {
    if (!validateSection()) { scrollTop(); return; }
    const incompleteSection = form.sections.findIndex((candidate) =>
      candidate.questions.some((q) => showQuestion(q) && questionIsIncomplete(q)),
    );
    if (incompleteSection >= 0) {
      const candidate = form.sections[incompleteSection];
      setCurrentSection(incompleteSection);
      setErrors(Object.fromEntries(
        candidate.questions
          .filter((q) => showQuestion(q) && questionIsIncomplete(q))
          .map((q) => [q.question_id, 'Complete the required fields.']),
      ));
      scrollTop();
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

  // Incomplete required fields in OTHER sections (warning before final submit)
  const otherSectionErrors = isLastSection
    ? form.sections.reduce((acc, sec, i) => {
        if (i === currentSection) return acc;
        return acc + sec.questions
          .filter(showQuestion)
          .filter(questionIsIncomplete)
          .length;
      }, 0)
    : 0;

  return (
    <div ref={topRef} style={{ paddingBottom: 24 }}>

      {/* ── Sticky top bar ── */}
      <div style={{
        background: 'var(--surface)', borderBottom: '1px solid var(--border)',
        padding: '10px 14px 0', marginBottom: 0,
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Title row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => navigate('/surveys')}>← Back</button>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {form.title}
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={saveAsDraft} disabled={saving}
            style={{ color: savedMsg ? 'var(--success)' : undefined, flexShrink: 0 }}>
            {savedMsg ? '✓ Saved' : saving ? '…' : '💾 Draft'}
          </button>
        </div>

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Overall completion
            </span>
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--text-muted)' }}>
              {answeredMandatory}/{totalMandatory} required · {progress}%
            </span>
          </div>
          <div className="progress-bar">
            <div className={`progress-fill${progress < 40 ? ' danger' : progress < 80 ? ' warning' : ''}`}
              style={{ width: `${progress}%` }} />
          </div>
        </div>

        {/* Section strip */}
        <SectionStrip sections={form.sections} current={currentSection} answers={answers} onClick={jumpTo} />

        {/* Active section label */}
        <div style={{ padding: '0 4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{
            background: 'var(--primary)', color: '#fff',
            borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
          }}>
            {currentSection + 1}/{form.sections.length}
          </span>
          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)' }}>
            {section.title}
          </span>
        </div>
      </div>

      {/* ── Questions ── */}
      <div style={{ padding: '10px 14px' }}>

        {/* Section validation banner */}
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            ⚠ {Object.keys(errors).length} required field{Object.keys(errors).length > 1 ? 's' : ''} missing.
          </div>
        )}

        {/* Question count */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          {section.questions.filter(showQuestion).length} question{section.questions.filter(showQuestion).length !== 1 ? 's' : ''} in this section
        </div>

        {section.questions.filter(showQuestion).length === 0 ? (
          <div className="empty-state">
            <div className="icon">✓</div>
            <h3>No questions here</h3>
            <p>This section has no questions in the current form version.</p>
          </div>
        ) : (
          section.questions.filter(showQuestion).map((q) => (
            <div key={q.question_id} className={`question-card${errors[q.question_id] ? ' error' : ''}`}>
              {/* Meta row */}
              <div className="question-meta">
                <span className="question-code">{q.question_code}</span>
                {q.is_required && <span className="question-mandatory">★ Required</span>}
                <span style={{
                  marginLeft: 'auto', fontSize: 9, fontWeight: 700, textTransform: 'uppercase',
                  letterSpacing: '0.06em', color: 'var(--text-muted)',
                }}>{q.answer_type}</span>
              </div>

              {/* Question text */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10, lineHeight: 1.5 }}>
                {q.question_text}
              </div>

              {/* Input */}
              <QuestionField
                q={q}
                value={answers[q.question_id]}
                onChange={(v) => setAnswer(q.question_id, v)}
                error={errors[q.question_id]}
              />

              {errors[q.question_id] && (
                <div className="form-error" style={{ marginTop: 6 }}>
                  {errors[q.question_id]}
                </div>
              )}

              {/* Error message */}
              {errors[q.question_id] && (
                <div className="form-error" style={{ marginTop: 6 }}>
                  ⚠ {errors[q.question_id]}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Incomplete warning on last section */}
      {isLastSection && otherSectionErrors > 0 && (
        <div className="alert alert-warning" style={{ margin: '0 14px 12px' }}>
          ⚠ {otherSectionErrors} required field{otherSectionErrors > 1 ? 's' : ''} in earlier sections still need answers.
          You can submit now but the completeness score will be lower.
        </div>
      )}

      {isLastSection && (
        <div style={{ padding: '0 14px 12px' }}>
          <button
            className="btn btn-outline"
            onClick={() => downloadSurveyPdf(buildResponse('draft'))}
            style={{ width: '100%' }}
          >
            ⬇ Download Survey PDF
          </button>
        </div>
      )}

      {/* ── Sticky bottom navigation ── */}
      <div style={{
        position: 'sticky', bottom: 0, background: 'var(--surface)',
        borderTop: '1px solid var(--border)', padding: '10px 14px',
        display: 'flex', gap: 10, alignItems: 'center',
      }}>
        <button className="btn btn-ghost" onClick={goPrev} disabled={currentSection === 0} style={{ minWidth: 80 }}>
          ← Prev
        </button>
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: 'var(--text-muted)', fontWeight: 600 }}>
          {currentSection + 1} / {form.sections.length}
        </div>
        {isLastSection ? (
          <button className="btn btn-success" onClick={submitSurvey} disabled={saving} style={{ minWidth: 130 }}>
            {saving ? <><span className="spinner spinner-sm" /> Saving…</> : '✅ Submit Survey'}
          </button>
        ) : (
          <button className="btn btn-primary" onClick={goNext} style={{ minWidth: 80 }}>
            Next →
          </button>
        )}
      </div>
    </div>
  );
}
