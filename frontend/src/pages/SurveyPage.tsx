import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { useSurvey } from '../context/SurveyContext';
import { useAuth }   from '../context/AuthContext';
import { deletePhoto, getPhoto, savePhoto, saveResponse, getResponse } from '../lib/db';
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
function PhotoField({ photoType, responseId, ownerId, unitName, value, onChange }: {
  photoType: string;
  responseId: string;
  ownerId: string;
  unitName: string;
  value: any;
  onChange: (v: any) => void;
}) {
  const [preview, setPreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [capturing, setCapturing] = useState(false);
  const [cameraError, setCameraError] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;
    if (!value?.photo_id) {
      setPreview(null);
      return;
    }
    getPhoto(value.photo_id).then((photo) => {
      if (!active || !photo) return;
      objectUrl = URL.createObjectURL(photo.blob);
      setPreview(objectUrl);
    });
    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [value?.photo_id]);

  useEffect(() => {
    if (!cameraActive) return;
    let disposed = false;
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError('Camera capture requires a supported browser on HTTPS or localhost.');
      setCameraActive(false);
      return;
    }
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: { facingMode: { exact: 'environment' }, width: { ideal: 1600 } },
    }).then((stream) => {
      if (disposed) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
    }).catch((error: unknown) => {
      setCameraError(error instanceof Error ? error.message : 'Unable to open the camera.');
      setCameraActive(false);
    });
    return () => {
      disposed = true;
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    };
  }, [cameraActive]);

  const capture = async () => {
    setCapturing(true);
    setCameraError('');
    try {
      if (!navigator.geolocation) throw new Error('Location access is required to capture this photo.');
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 20000,
          maximumAge: 0,
        });
      });
      const { latitude, longitude, accuracy } = position.coords;
      if (accuracy > 100) throw new Error(`GPS accuracy is ±${Math.round(accuracy)} m; improve the location fix to 100 m or better.`);
      if (accuracy > 50 && !window.confirm(`GPS accuracy is ±${Math.round(accuracy)} m. Capture this photo anyway?`)) return;

      const video = videoRef.current;
      if (!video?.videoWidth || !video.videoHeight) throw new Error('Camera is not ready yet.');
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to process the camera image.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

      const capturedAt = new Date(position.timestamp).toISOString();
      const watermarkHeight = Math.max(54, Math.round(canvas.height * 0.12));
      context.fillStyle = 'rgba(0, 0, 0, 0.68)';
      context.fillRect(0, canvas.height - watermarkHeight, canvas.width, watermarkHeight);
      context.fillStyle = '#fff';
      context.font = `600 ${Math.max(12, Math.round(canvas.width / 40))}px sans-serif`;
      context.textBaseline = 'middle';
      context.fillText(unitName.slice(0, 64), 12, canvas.height - watermarkHeight / 2 - 10, canvas.width - 24);
      context.fillText(
        `${new Date(capturedAt).toLocaleString()} | ${latitude.toFixed(6)}, ${longitude.toFixed(6)} | ±${Math.round(accuracy)}m`,
        12,
        canvas.height - watermarkHeight / 2 + 12,
        canvas.width - 24,
      );

      const encodeJpeg = (quality: number) => new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error('Could not encode the captured photo.')), 'image/jpeg', quality);
      });
      let blob = await encodeJpeg(0.75);
      if (blob.size > 3 * 1024 * 1024) blob = await encodeJpeg(0.55);
      if (blob.size > 3 * 1024 * 1024) throw new Error('Captured image is over 3 MB. Retake it in better lighting.');
      const photoId = uuidv4();
      await savePhoto({
        photo_id: photoId,
        response_id: responseId,
        owner_id: ownerId,
        photo_type: photoType,
        blob,
        mime_type: 'image/jpeg',
        size_bytes: blob.size,
        latitude,
        longitude,
        accuracy_m: accuracy,
        captured_at: capturedAt,
      });
      onChange({
        photo_id: photoId,
        photo_type: photoType,
        latitude,
        longitude,
        accuracy_m: accuracy,
        captured_at: capturedAt,
      });
      setCameraActive(false);
    } catch (error) {
      setCameraError(error instanceof Error ? error.message : 'Unable to capture this photo.');
    } finally {
      setCapturing(false);
    }
  };

  const remove = async () => {
    if (value?.photo_id) await deletePhoto(value.photo_id);
    setPreview(null);
    onChange(null);
  };

  return (
    <div>
      {cameraActive ? (
        <div>
          <video ref={videoRef} autoPlay playsInline muted style={{ width: '100%', maxHeight: 320, background: '#111', objectFit: 'cover' }} />
          <button type="button" className="btn btn-primary btn-block" onClick={capture} disabled={capturing} style={{ marginTop: 8 }}>
            {capturing ? 'Capturing…' : 'Capture photo'}
          </button>
          <button type="button" className="btn btn-ghost btn-block" onClick={() => setCameraActive(false)}>Cancel camera</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: 8 }}>
          {preview && <img src={preview} alt="Captured photo evidence" style={{ width: '100%', maxHeight: 260, objectFit: 'contain' }} />}
          <button type="button" className="btn btn-primary" onClick={() => { setCameraError(''); setCameraActive(true); }}>
            {preview ? 'Retake with camera' : 'Open main camera'}
          </button>
          {preview && <div className="text-small text-muted">GPS ±{Math.round(value.accuracy_m)} m · Captured {new Date(value.captured_at).toLocaleString()}</div>}
          {preview && <button type="button" className="btn btn-ghost" onClick={remove}>Remove photo</button>}
        </div>
      )}
      {cameraError && <div className="form-error" role="alert" style={{ marginTop: 8 }}>{cameraError}</div>}
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

function SearchableReferenceField({ options, value, onChange, disabled, manualValue, onManualChange }: {
  options: QuestionOption[];
  value: any;
  onChange: (value: number | null) => void;
  disabled?: boolean;
  manualValue?: string;
  onManualChange?: (value: string) => void;
}) {
  const [query, setQuery] = useState('');
  const [editing, setEditing] = useState(false);
  const [open, setOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState<{
    top: number;
    left: number;
    width: number;
    maxHeight: number;
  } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  useLayoutEffect(() => {
    if (!open) return;

    const updatePosition = () => {
      const rect = inputRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 8;
      const spaceAbove = rect.top - 8;
      const openAbove = spaceBelow < 240 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(0, Math.min(240, openAbove ? spaceAbove : spaceBelow));
      setDropdownPosition({
        top: openAbove ? rect.top - maxHeight : rect.bottom,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    window.visualViewport?.addEventListener('resize', updatePosition);
    window.visualViewport?.addEventListener('scroll', updatePosition);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
      window.visualViewport?.removeEventListener('resize', updatePosition);
      window.visualViewport?.removeEventListener('scroll', updatePosition);
    };
  }, [open]);
  if (options.length === 0 && onManualChange) {
    return (
      <div>
        <input
          className="form-input"
          value={manualValue ?? ''}
          placeholder={disabled ? 'Select the previous level first' : 'Enter code or name'}
          disabled={disabled}
          onChange={(event) => onManualChange(event.target.value)}
        />
        <div style={{ marginTop: 4, color: 'var(--text-muted)', fontSize: 11 }}>
          No official choices are available for this level. Enter the code or name manually, or ask your administrator to load the PSIC/HS reference data.
        </div>
      </div>
    );
  }
  const selected = options.find((option) => option.id === selectedOptionId(value));
  const selectedLabel = selected ? `${selected.code} - ${selected.label}` : '';
  const compactLabel = (label: string) => label.length > 180 ? `${label.slice(0, 177).trimEnd()}...` : label;
  const search = (editing ? query : open ? '' : selected ? `${selected.code} - ${selected.label}` : '')
    .trim()
    .toLowerCase();
  const matches = options.filter((option) =>
    !search || option.code.toLowerCase().includes(search) || option.label.toLowerCase().includes(search),
  );
  const visibleOptions = matches.slice(0, 80);

  return (
    <div>
      <input
        ref={inputRef}
        className="form-input"
        value={editing ? query : compactLabel(selectedLabel)}
        title={editing ? undefined : selectedLabel || undefined}
        placeholder={disabled ? 'Select the previous level first' : 'Search by code or description…'}
        disabled={disabled}
        autoComplete="off"
        aria-expanded={open}
        onFocus={(event) => {
          event.currentTarget.select();
          setQuery('');
          setEditing(false);
          setOpen(true);
        }}
        onChange={(event) => {
          setQuery(event.target.value);
          setEditing(true);
          setOpen(true);
          if (selected) onChange(null);
        }}
        onBlur={() => {
          setOpen(false);
          if (editing && !selected) {
            setEditing(false);
            setQuery('');
          }
        }}
      />
      {open && !disabled && dropdownPosition && createPortal(
        <div
          role="listbox"
          style={{
            position: 'fixed',
            zIndex: 10000,
            top: dropdownPosition.top,
            left: dropdownPosition.left,
            width: dropdownPosition.width,
            maxHeight: dropdownPosition.maxHeight,
            overflowY: 'auto',
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 'var(--radius-sm)',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {visibleOptions.length ? visibleOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="option"
              aria-selected={option.id === selected?.id}
              title={`${option.code} - ${option.label}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                onChange(option.id);
                setEditing(false);
                setQuery('');
                setOpen(false);
              }}
              style={{
                display: 'block',
                width: '100%',
                padding: '9px 10px',
                border: 0,
                borderBottom: '1px solid var(--border)',
                background: option.id === selected?.id ? 'var(--surface2)' : 'var(--surface)',
                color: 'var(--text)',
                textAlign: 'left',
                cursor: 'pointer',
                fontSize: 12,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              <strong>{option.code}</strong> — {compactLabel(option.label)}
            </button>
          )) : (
            <div style={{ padding: 10, color: 'var(--text-muted)', fontSize: 12 }}>No matching codes.</div>
          )}
          {matches.length > visibleOptions.length && (
            <div style={{ padding: '7px 10px', color: 'var(--text-muted)', fontSize: 11 }}>
              Showing 80 matches. Type more to narrow the list.
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
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

function InputFieldControl({ field, value, onChange, disabled, manualValue, onManualChange }: {
  field: SurveyInputField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  manualValue?: string;
  onManualChange?: (value: string) => void;
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
      if (['psic_divisions', 'psic_groups', 'psic_classes', 'hs_codes'].includes(field.reference ?? '')) {
        return (
          <SearchableReferenceField
            options={field.options}
            value={value}
            onChange={onChange}
            disabled={disabled}
            manualValue={manualValue}
            onManualChange={onManualChange}
          />
        );
      }
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

function FieldGroup({ fields, value, onChange, references }: {
  fields: SurveyInputField[];
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  references: Record<string, QuestionOption[]>;
}) {
  const map = value && typeof value === 'object' ? value : {};
  const psicTextKeys: Record<string, string> = {
    psic_division_id: 'psic_division_text',
    psic_group_id: 'psic_group_text',
    psic_class_id: 'psic_class_text',
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {fields.map((field) => {
        let options = field.reference ? (references[field.reference] ?? field.options) : field.options;
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
        const parentTextKey = parentKey[field.key]?.replace(/_id$/, '_text');
        const hasParentLinks = options.some(
          (option) => option.parent_id !== undefined && option.parent_id !== null,
        );
        if (parentValue != null && hasParentLinks) {
          options = options.filter((option) => option.parent_id === parentValue);
        } else if (parentKey[field.key] && parentValue == null && hasParentLinks) {
          options = [];
        }

        const visibleField = { ...field, options };
        const manualKey = psicTextKeys[field.key];
        const dependentFields: Record<string, string[]> = {
          psic_division_id: ['psic_group_id', 'psic_class_id', 'psic_group_text', 'psic_class_text'],
          psic_group_id: ['psic_class_id', 'psic_class_text'],
        };
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
              disabled={
                ['psic_groups', 'psic_classes'].includes(field.reference ?? '') &&
                parentValue == null &&
                !map[parentTextKey ?? '']
              }
              manualValue={manualKey ? map[manualKey] : field.key === 'hs_code_id' ? map[field.key] : undefined}
              onManualChange={manualKey
                ? (text) => onChange({
                    ...map,
                    [field.key]: null,
                    [manualKey]: text,
                    ...Object.fromEntries((dependentFields[field.key] ?? []).map((key) => [key, null])),
                  })
                : field.key === 'hs_code_id'
                  ? (text) => onChange({ ...map, [field.key]: text })
                  : undefined}
              onChange={(next) => {
                const dependentSelectionFields: Record<string, string[]> = {
                  district_id: ['tehsil_id'],
                  psic_division_id: dependentFields.psic_division_id,
                  psic_group_id: dependentFields.psic_group_id,
                };
                onChange({
                  ...map,
                  [field.key]: next,
                  ...(manualKey ? { [manualKey]: null } : {}),
                  ...(next !== controlValue
                    ? Object.fromEntries((dependentSelectionFields[field.key] ?? []).map((key) => [key, null]))
                    : {}),
                });
              }}
            />
          </div>
        );
      })}
    </div>
  );
}

function workforceGender(value: any): 'MALE' | 'FEMALE' | 'Other' | null {
  const id = selectedOptionId(value);
  if (id === 1 || value === 'MALE') return 'MALE';
  if (id === 2 || value === 'FEMALE') return 'FEMALE';
  if (id === 3 || value === 'Other') return 'Other';
  return null;
}

function workforceCount(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null;
  const count = Number(value);
  return Number.isInteger(count) && count >= 0 ? count : null;
}

function totalWorkforceCounts(values: unknown[]): number | null {
  const counts = values.map(workforceCount).filter((count): count is number => count !== null);
  return counts.length ? counts.reduce((total, count) => total + count, 0) : null;
}

function WorkforceTotal({ values }: { values: unknown[] }) {
  const total = totalWorkforceCounts(values);
  return <strong>{total === null ? '—' : total}</strong>;
}

function WorkforceCountInput({ label, value, onChange }: {
  label: string;
  value: number | null;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ minWidth: 0, display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>
      {label}
      <input
        className="form-input"
        type="number"
        min={0}
        step={1}
        inputMode="numeric"
        aria-label={label}
        value={value ?? ''}
        onChange={(event) => onChange(event.target.value)}
        style={{ marginTop: 4, padding: '9px 10px', fontSize: 16 }}
      />
    </label>
  );
}

function WorkforceCountSummary({ label, values }: { label: string; values: unknown[] }) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 8,
      minWidth: 0,
      padding: '9px 11px',
      borderRadius: 8,
      background: 'var(--primary-bg)',
      fontSize: 12,
    }}>
      <span style={{ color: 'var(--text-muted)' }}>{label}</span>
      <strong style={{ color: 'var(--primary)', fontSize: 15 }}>
        <WorkforceTotal values={values} />
      </strong>
    </div>
  );
}

function EmploymentDetailsTable({ value, onChange }: {
  value: any;
  onChange: (value: any) => void;
}) {
  const rows: Array<Record<string, any>> = Array.isArray(value) ? value : [];
  const categories = [
    { key: 'regular_count', label: 'Regular employees' },
    { key: 'contract_count', label: 'Contract employees' },
    { key: 'daily_wage_count', label: 'Daily wages' },
  ];
  const genders = [
    { code: 'MALE' as const, label: 'Male' },
    { code: 'FEMALE' as const, label: 'Female' },
    { code: 'Other' as const, label: 'Other' },
  ];
  const countFor = (gender: 'MALE' | 'FEMALE' | 'Other', key: string) =>
    totalWorkforceCounts(
      rows.filter((row) => workforceGender(row.gender) === gender).map((row) => row[key]),
    );

  const updateCount = (gender: 'MALE' | 'FEMALE' | 'Other', key: string, raw: string) => {
    const nextCount = workforceCount(raw);
    const genderRows = rows.filter((row) => workforceGender(row.gender) === gender);
    const updatedRow: Record<string, any> = {
      gender: genderRows[0]?.gender ?? (gender === 'MALE' ? 1 : gender === 'FEMALE' ? 2 : 3),
    };
    for (const category of categories) {
      const existingCount = totalWorkforceCounts(genderRows.map((row) => row[category.key]));
      if (existingCount !== null) updatedRow[category.key] = existingCount;
    }
    if (nextCount === null) delete updatedRow[key];
    else updatedRow[key] = nextCount;

    const otherCounts = categories
      .filter((category) => category.key !== key)
      .map((category) => updatedRow[category.key]);
    const nextRows = rows.filter((row) => workforceGender(row.gender) !== gender);
    if (nextCount !== null || otherCounts.some((count) => workforceCount(count) !== null)) {
      nextRows.push(updatedRow);
    }
    onChange(nextRows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {categories.map((category) => (
        <div key={category.key} style={{
          padding: 11,
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 13, fontWeight: 700, marginBottom: 9 }}>{category.label}</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {genders.map((gender) => (
              <WorkforceCountInput
                key={gender.code}
                label={gender.label}
                value={countFor(gender.code, category.key)}
                onChange={(raw) => updateCount(gender.code, category.key, raw)}
              />
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <WorkforceCountSummary
              label={`${category.label} total`}
              values={genders.map((gender) => countFor(gender.code, category.key))}
            />
          </div>
        </div>
      ))}
      <div style={{
        padding: 11,
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface2)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Employee subtotals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {genders.map((gender) => (
            <WorkforceCountSummary
              key={gender.code}
              label={gender.label}
              values={categories.map((category) => countFor(gender.code, category.key))}
            />
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <WorkforceCountSummary
            label="All employees"
            values={categories.flatMap((category) =>
              genders.map((gender) => countFor(gender.code, category.key)),
            )}
          />
        </div>
      </div>
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        For seasonal employment, enter the average number of employees during the reporting or financial period.
      </div>
    </div>
  );
}

function EmploymentSkillsTable({ options, value, onChange }: {
  options: QuestionOption[];
  value: any;
  onChange: (value: any) => void;
}) {
  const rows: Array<Record<string, any>> = Array.isArray(value) ? value : [];
  const genders = [
    { code: 'MALE' as const, label: 'Male' },
    { code: 'FEMALE' as const, label: 'Female' },
    { code: 'Other' as const, label: 'Other' },
  ];
  const countFor = (gender: 'MALE' | 'FEMALE' | 'Other', skillId: number) =>
    totalWorkforceCounts(rows.filter((row) =>
      workforceGender(row.gender) === gender && selectedOptionId(row.skill_level_id) === skillId,
    ).map((row) => row.headcount));

  const updateCount = (gender: 'MALE' | 'FEMALE' | 'Other' , skillId: number, raw: string) => {
    const nextCount = workforceCount(raw);
    const existingRows = rows.filter((row) =>
      workforceGender(row.gender) === gender && selectedOptionId(row.skill_level_id) === skillId,
    );
    const existing = existingRows[0];
    const nextRows = rows.filter((row) =>
      !(workforceGender(row.gender) === gender && selectedOptionId(row.skill_level_id) === skillId),
    );
    if (nextCount !== null) {
      nextRows.push({
        ...(existing ?? {}),
        gender: existing?.gender ?? (gender === 'MALE' ? 1 : gender === 'FEMALE' ? 2 : 3),
        skill_level_id: existing?.skill_level_id ?? skillId,
        headcount: nextCount,
      });
    }
    onChange(nextRows);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      {options.map((option) => (
        <div key={option.id} style={{
          padding: 11,
          border: '1px solid var(--border)',
          borderRadius: 10,
          background: 'var(--surface)',
        }}>
          <div style={{ fontSize: 12, lineHeight: 1.4, fontWeight: 700, marginBottom: 9 }}>
            {option.label}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
            {genders.map((gender) => (
              <WorkforceCountInput
                key={gender.code}
                label={gender.label}
                value={countFor(gender.code, option.id)}
                onChange={(raw) => updateCount(gender.code, option.id, raw)}
              />
            ))}
          </div>
          <div style={{ marginTop: 8 }}>
            <WorkforceCountSummary
              label="Skill level total"
              values={genders.map((gender) => countFor(gender.code, option.id))}
            />
          </div>
        </div>
      ))}
      <div style={{
        padding: 11,
        border: '1px solid var(--border)',
        borderRadius: 10,
        background: 'var(--surface2)',
      }}>
        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 8 }}>Employee subtotals</div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 8 }}>
          {genders.map((gender) => (
            <WorkforceCountSummary
              key={gender.code}
              label={gender.label}
              values={options.map((option) => countFor(gender.code, option.id))}
            />
          ))}
        </div>
        <div style={{ marginTop: 8 }}>
          <WorkforceCountSummary
            label="All employees"
            values={options.flatMap((option) =>
              genders.map((gender) => countFor(gender.code, option.id)),
            )}
          />
        </div>
      </div>
    </div>
  );
}

function StructuredQuestionField({ question, value, onChange, references }: {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  references: Record<string, QuestionOption[]>;
}) {
  const fields = question.fields ?? [];
  if (question.question_code === 'D_EMPLOYMENT') {
    return <EmploymentDetailsTable value={value} onChange={onChange} />;
  }
  if (question.question_code === 'D_SKILLS') {
    const skillField = fields.find((field) => field.key === 'skill_level_id');
    return <EmploymentSkillsTable options={skillField?.options ?? []} value={value} onChange={onChange} />;
  }
  if (!question.repeatable) {
    return <FieldGroup fields={fields} value={value ?? {}} onChange={onChange} references={references} />;
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
          <FieldGroup fields={fields} value={row} onChange={(updated) => updateRow(index, updated)} references={references} />
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
function QuestionField({ q, value, onChange, error, references, responseId, ownerId, unitName, industryTypeId }: {
  q: SurveyQuestion; value: any; onChange: (v: any) => void; error?: string;
  references: Record<string, QuestionOption[]>;
  responseId: string; ownerId: string; unitName: string;
  industryTypeId: number | null;
}) {
  const errCls = error ? 'error' : '';

  if (q.question_code === 'A_PSIC') {
    const options = (references.unit_type_psic_classes ?? []).filter((option) => option.parent_id === industryTypeId);
    return (
      <select className={`form-select ${errCls}`} value={selectedOptionId(value?.psic_class_id) ?? ''}
        disabled={!industryTypeId} onChange={(event) => onChange({ psic_class_id: event.target.value ? Number(event.target.value) : null })}>
        <option value="">{industryTypeId ? 'Select PSIC class' : 'Select Type of Unit first'}</option>
        {options.map((option) => <option key={option.id} value={option.id}>{option.code === '9609' ? `Other (${option.code})` : option.label}</option>)}
      </select>
    );
  }

  if (q.fields?.length) {
    return <StructuredQuestionField question={q} value={value} onChange={onChange} references={references} />;
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
      return <StructuredQuestionField question={q} value={value} onChange={onChange} references={references} />;

    case 'GPS':
      return <GpsField value={value} onChange={onChange} />;

    case 'PHOTO':
      return <PhotoField photoType={q.question_code} responseId={responseId} ownerId={ownerId} unitName={unitName} value={value} onChange={onChange} />;

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
  const { form, fetchForm, formLoading, formError, isOnline } = useSurvey();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [currentSection, setCurrentSection] = useState(0);
  const [answers,  setAnswers]  = useState<Record<number, any>>({});
  const [errors,   setErrors]   = useState<Record<number, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [existingResponseLoaded, setExistingResponseLoaded] = useState(!id);
  const [ownerMismatch, setOwnerMismatch] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [responseId] = useState(() => id || uuidv4());
  const [startedAt]  = useState(() => new Date().toISOString());
  const topRef = useRef<HTMLDivElement>(null);

  // Load draft if editing
  useEffect(() => {
    if (!id) return;
    getResponse(id).then((r) => {
      if (!r) {
        setOwnerMismatch(true);
        return;
      }
      if (!user?.user_id || r.surveyor_id !== user.user_id) {
        setOwnerMismatch(true);
        return;
      }
      const map: Record<number, any> = {};
      r.answers.forEach((a) => { map[a.question_id] = a.answer_value; });
      setAnswers(map);
    }).catch(() => setOwnerMismatch(true)).finally(() => setExistingResponseLoaded(true));
  }, [id, user?.user_id]);

  const setAnswer = useCallback((qid: number, val: any) => {
    setAnswers((prev) => {
      const next = { ...prev, [qid]: val };
      const questions = form?.sections.flatMap((section) => section.questions) ?? [];
      if (questions.find((question) => question.question_id === qid)?.question_code === 'A_UNIT_TYPE') {
        const psicQuestion = questions.find((question) => question.question_code === 'A_PSIC');
        if (psicQuestion) delete next[psicQuestion.question_id];
      }
      return next;
    });
    setErrors((prev) => { const e = { ...prev }; delete e[qid]; return e; });
  }, [form]);

  if (ownerMismatch) {
    return (
      <div className="empty-state">
        <h3>Survey belongs to another account</h3>
        <p>Sign in with its owner, or ask an admin to claim this unassigned legacy survey.</p>
        <button className="btn btn-outline" onClick={() => navigate('/surveys')}>Back to surveys</button>
      </div>
    );
  }

  if (!existingResponseLoaded) {
    return <div className="empty-state"><p>Loading saved survey…</p></div>;
  }

  if (!form) {
    return (
      <div className="empty-state">
        <div className="icon">📋</div>
        <h3>{formError ? 'Unable to load survey form' : 'No form available'}</h3>
        <p>{formError ?? 'Download the survey form before starting a survey.'}</p>
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 16 }}>
          <button
            className="btn btn-primary"
            onClick={() => fetchForm()}
            disabled={!isOnline || formLoading}
          >
            {formLoading ? 'Loading…' : 'Retry download'}
          </button>
          <button className="btn btn-outline" onClick={() => navigate('/dashboard')}>
            Go to Dashboard
          </button>
        </div>
        {!isOnline && <p style={{ marginTop: 10 }}>Connect to the internet to download the survey form.</p>}
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
    if (q.question_code === 'A_UNIT_TYPE') {
      const option = q.options.find((candidate) => candidate.id === selectedOptionId(value));
      return !option || (option.requires_text && !selectedOtherText(value).trim());
    }
    if (q.question_code === 'A_PSIC') {
      const industryId = selectedOptionId(answerForCode('A_UNIT_TYPE'));
      return !(form.references?.unit_type_psic_classes ?? []).some((option) =>
        option.parent_id === industryId && option.id === selectedOptionId(value?.psic_class_id),
      );
    }
    if (q.answer_type === 'PHOTO') return q.is_required && !value?.photo_id;
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
    if (q.is_required && q.answer_type === 'PHOTO') return value?.photo_id ? 1 : 0;
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
          <div style={{ flex: 1, minWidth: 0, textAlign: 'center' }}>
            <div style={{ fontWeight: 700, fontSize: 13, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              Survey Form
            </div>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={saveAsDraft} disabled={saving}
            style={{ color: savedMsg ? 'var(--success)' : undefined, flexShrink: 0 }}>
            {savedMsg ? '✓ Saved' : saving ? '…' : '💾 Save'}
          </button>
        </div>

        <div aria-label="Punjab Industries and NESPAK" style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          padding: '0 0 8px',
        }}>
          <img
            src="/logos/punjab-industries.png"
            alt="Government of Punjab Industries"
            style={{ width: 28, height: 28, objectFit: 'contain' }}
          />
          <span aria-hidden="true" style={{ width: 1, height: 22, background: 'var(--border)' }} />
          <img
            src="/logos/nespak.jpeg"
            alt="NESPAK"
            style={{ width: 40, height: 28, objectFit: 'contain' }}
          />
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
                references={form?.references ?? {}}
                responseId={responseId}
                industryTypeId={selectedOptionId(answerForCode('A_UNIT_TYPE'))}
                ownerId={user!.user_id}
                unitName={String(answerForCode('A_ESTABLISHMENT_NAME')?.name ?? answerForCode('A_ESTABLISHMENT_NAME') ?? 'Industrial unit')}
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
            onClick={() => {
              void downloadSurveyPdf(buildResponse('draft'), form).catch((error: unknown) => {
                window.alert(error instanceof Error ? error.message : 'Unable to generate the survey PDF.');
              });
            }}
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
