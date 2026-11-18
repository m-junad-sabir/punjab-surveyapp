import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import { useBlocker, useLocation, useNavigate, useNavigationType, useParams, useSearchParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { v4 as uuidv4 } from 'uuid';
import { useSurvey } from '../context/SurveyContext';
import { useAuth }   from '../context/AuthContext';
import { deletePhoto, getPhoto, savePhoto, saveResponse, getResponse } from '../lib/db';
import { getDeviceId } from '../lib/deviceId';
import { AUTOSAVE_INTERVAL_MS, DraftSaver } from '../lib/draftSaver';
import { downloadSurveyPdf } from '../lib/surveyPdf';
import { areAllOptionsSelected, toggleAllOptions } from '../lib/optionSelection';
import { fieldFormatError, questionFormatError } from '../lib/surveyValidation';
import { photoMetadataError, PHOTO_ACCURACY_WARNING_M } from '../lib/photoCapture';
import { scrollSurveyToTop, surveySectionIndex, surveySectionStatus } from '../lib/surveyNavigation';
import type { SectionStatus } from '../lib/surveyNavigation';
import { clearHiddenAnswers, isQuestionVisible, utilizationBandCode } from '../lib/surveyVisibility';
import {
  changeSectionHField,
  isSectionHFieldVisible,
  materializeSectionHAnswers,
  sectionHSelectionId,
  sectionHQuestionError,
  totalGenerationCapacity,
} from '../lib/sectionH';
import {
  changeReinvestmentArea,
  isReinvestmentOtherVisible,
  isSectionIOtherTextVisible,
  reinvestmentAreaError,
} from '../lib/sectionIJ';
import { isSectionKFieldVisible } from '../lib/sectionK';
import {
  EMPLOYMENT_CATEGORIES,
  MAX_WORKFORCE_COUNT,
  WORKFORCE_GENDERS,
  isWorkforceRow,
  materializeWorkforceAnswers,
  normalizeWorkforceAnswer,
  totalWorkforceCounts,
  workforceCellValue,
  workforceCount,
  workforceGender,
  workforceSelectionId,
  workforceSkillOptions,
} from '../lib/sectionDWorkforce';
import type { WorkforceGender, WorkforceSkillOption } from '../lib/sectionDWorkforce';
import {
  SECTION_EF_MATRIX_DEFAULTS,
  formatPercentage,
  invalidMatrixKeys,
  invalidShareKeys,
  isDefaultedShare,
  isRecord as isSectionEfRecord,
  isSectionEfReason,
  materializeSectionEFAnswers,
  matrixEntryForDisplay,
  matrixOptions,
  matrixRawEntry,
  normalizeMatrix,
  normalizeShares,
  positiveId,
  reasonError,
  reasonOptions,
  reasonSelection,
  shareOptions,
  shareTotal,
} from '../lib/sectionEF';
import {
  changeProductKind,
  clearProductNames,
  isProductFieldVisible,
  isProductNameComplete,
  majorInputUnitsError,
  productKind,
  productOptionsForRow,
  productRowsError,
  productUnitsForDisplay,
  productUnitValueForDisplay,
  productValueForDisplay,
} from '../lib/sectionCProducts';
import {
  changeSectionGField,
  equipmentUnitOptions,
  isSectionGFieldVisible,
  isSectionGRawDecimalField,
  isLegacyMachineryAgeWrapper,
  legacyMachineryAgeRows,
  legacySectionGFields,
  machineOptions,
  machineValueForDisplay,
  sectionGRowsError,
  sectionGSelectionId,
  specificationOptions,
  vesselKind,
} from '../lib/sectionG';
import type {
  OfflineResponse,
  SurveySection,
  SurveyQuestion,
  QuestionOption,
  AnswerType,
  SurveyInputField,
  SurveyMatrixItem,
} from '../types';

// GPS widget: captures coordinates and displays the saved location/accuracy.
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

// Photo widget: opens the device camera, captures GPS-tagged evidence, and shows its preview.
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
      const capturedAt = new Date(position.timestamp).toISOString();
      const metadataError = photoMetadataError({ latitude, longitude, accuracy_m: accuracy, captured_at: capturedAt });
      if (metadataError) throw new Error(metadataError);
      if (accuracy > PHOTO_ACCURACY_WARNING_M &&
          !window.confirm(`GPS accuracy is ±${Math.round(accuracy)} m. Capture this photo anyway?`)) return;

      const video = videoRef.current;
      if (!video?.videoWidth || !video.videoHeight) throw new Error('Camera is not ready yet.');
      const scale = Math.min(1, 1600 / Math.max(video.videoWidth, video.videoHeight));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(video.videoWidth * scale);
      canvas.height = Math.round(video.videoHeight * scale);
      const context = canvas.getContext('2d');
      if (!context) throw new Error('Unable to process the camera image.');
      context.drawImage(video, 0, 0, canvas.width, canvas.height);

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
// Normalize both legacy scalar answers and newer { option_id, ... } answers.
function selectedOptionId(value: any): number | null {
  const id = value && typeof value === 'object' ? value.option_id : value;
  return Number.isInteger(id) ? id : null;
}

function selectedOtherText(value: any): string {
  return value && typeof value === 'object' && typeof value.other_text === 'string'
    ? value.other_text
    : '';
}

// Shared single-choice control; an "Other" option adds a text input below the select.
function ChoiceField({ options, value, onChange, error, disabled }: {
  options: QuestionOption[]; value: any; onChange: (v: any) => void; error?: string; disabled?: boolean;
}) {
  const selectedId = selectedOptionId(value);
  const selectedOption = options.find((option) => option.id === selectedId);

  return (
    <>
      <select
        className={`form-select ${error ? 'error' : ''}`}
        value={selectedId ?? ''}
        disabled={disabled}
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
          <option key={opt.id} value={opt.id} disabled={opt.is_selectable === false}>{opt.label}</option>
        ))}
      </select>
      {selectedOption?.requires_text && (
        <input
          className="form-input"
          style={{ marginTop: 8 }}
          value={selectedOtherText(value)}
          disabled={disabled}
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

// Searchable reference picker for long classification lists; its dropdown is portaled to the document body.
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

// Checkbox list for multi-select answers, including optional "select all" and per-option details.
function MultiChoiceField({ options, value, onChange, showMonthToggle = false, reasonQuestion, references = {} }: {
  options: QuestionOption[]; value: any; onChange: (v: any) => void;
  showMonthToggle?: boolean;
  reasonQuestion?: SurveyQuestion;
  references?: Record<string, QuestionOption[]>;
}) {
  const reasonValues = reasonQuestion ? reasonSelection(value) : null;
  const selected: number[] = Array.isArray(value) ? value : [];
  const selectedIds: number[] = reasonQuestion
    ? [...new Set((reasonValues ?? []).map(positiveId).filter((id): id is number => id !== null))]
    : Array.isArray(value) ? selected : value?.option_ids ?? [];
  const otherText: Record<number, string> =
    reasonQuestion
      ? isSectionEfRecord(value) && isSectionEfRecord(value.other_text)
        ? value.other_text as Record<number, string> : {}
      : value && !Array.isArray(value) && typeof value === 'object' ? value.other_text ?? {} : {};
  const displayedOptions = reasonQuestion ? reasonOptions(reasonQuestion, value, references) : options;
  const reasonText = isSectionEfRecord(value) ? value.other_text : undefined;
  const invalidReasonText = isSectionEfRecord(reasonText) && Object.entries(reasonText).some(([key, text]) => {
    const id = positiveId(key);
    const blank = text == null || (typeof text === 'string' && !text.trim());
    return !blank && (typeof text !== 'string' || id === null || !selectedIds.includes(id));
  });
  const invalidReasonData = reasonQuestion && (
    reasonValues === null ||
    reasonValues.some((item) => positiveId(item) === null) ||
    reasonValues.length !== selectedIds.length ||
    (reasonText != null && !isSectionEfRecord(reasonText)) || invalidReasonText
  );
  const clearInvalidReasonData = () => {
    const retainedText = Object.fromEntries(Object.entries(otherText).filter(([key, text]) => {
      const id = positiveId(key);
      return id !== null && selectedIds.includes(id) && typeof text === 'string' && text.trim();
    }));
    onChange(Object.keys(retainedText).length ? { option_ids: selectedIds, other_text: retainedText } : selectedIds);
  };

  const toggle = (id: number, checked: boolean) => {
    const next = checked ? [...selectedIds, id] : selectedIds.filter((s: number) => s !== id);
    const nextOtherText = { ...otherText };
    if (!checked) delete nextOtherText[id];
    onChange(Object.keys(nextOtherText).length ? { option_ids: next, other_text: nextOtherText } : next);
  };

  const chosen = (id: number) => reasonQuestion ? selectedIds.includes(id) : Array.isArray(value)
    ? selected.includes(id) : (value?.option_ids ?? []).includes(id);
  const allSelected = areAllOptionsSelected(options, selectedIds);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {invalidReasonData && (
        <div className="alert alert-error">
          This saved answer contains invalid reason data.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={clearInvalidReasonData}>
            Clear invalid data
          </button>
        </div>
      )}
      {showMonthToggle && (
        <button type="button" className="btn btn-outline btn-sm"
          aria-pressed={allSelected}
          onClick={() => onChange(toggleAllOptions(options, selectedIds))}>
          {allSelected ? 'Deselect all months' : 'Select all months'}
        </button>
      )}
      {displayedOptions.map((opt) => {
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
                disabled={Boolean(reasonQuestion && opt.is_selectable === false && !isChecked)}
                onChange={(e) => toggle(opt.id, e.target.checked)}
                style={{ marginTop: 2, accentColor: 'var(--primary)', flexShrink: 0 }} />
              <span>{opt.label}</span>
            </label>
            {isChecked && (opt.requires_text || (reasonQuestion && opt.code === 'OTHER')) && (
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

// Percentage breakdown used by sections E/F; shows invalid categories and a running 100% total.
function SectionEFShareField({ question, value, onChange, references }: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  references: Record<string, QuestionOption[]>;
}) {
  const map = isSectionEfRecord(value) ? value : {};
  const options = shareOptions(question, value, references);
  const invalidKeys = invalidShareKeys(question, value, references);
  const total = shareTotal(value);
  const overLimit = total !== null && total > 100;
  const remove = (key: string) => {
    const next = { ...map };
    delete next[key];
    onChange(next);
  };
  const updatePercent = (id: number, raw: string) => {
    const previous = map[String(id)];
    const amount = raw === '' ? 0 : raw;
    onChange({
      ...map,
      [id]: isSectionEfRecord(previous) ? { ...previous, percent: amount } : amount,
    });
  };

  return (
    <div>
      {value != null && !isSectionEfRecord(value) && (
        <div className="alert alert-error">
          This saved share answer has an invalid format.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({})}>
            Clear invalid data
          </button>
        </div>
      )}
      {invalidKeys.map((key) => (
        <div key={key} className="alert alert-error">
          Unknown saved share category: {key}.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(key)}>Remove</button>
        </div>
      ))}
      {options.map((option) => {
        const key = String(option.id);
        const entry = map[key];
        const raw = isSectionEfRecord(entry) ? entry.percent : entry;
        const amount = typeof raw === 'number' || typeof raw === 'string' ? raw : raw == null ? 0 : '';
        const text = isSectionEfRecord(entry) && typeof entry.other_text === 'string' ? entry.other_text : '';
        const invalidData = (isSectionEfRecord(entry) && (
          Object.keys(entry).some((field) => field !== 'percent' && field !== 'other_text') ||
          (entry.other_text != null && typeof entry.other_text !== 'string')
        )) || (raw != null && typeof raw !== 'number' && typeof raw !== 'string');
        return (
          <div key={option.id} style={{ marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ flex: 1, fontSize: 13 }}>{option.label}</span>
              <input type="text" inputMode="decimal"
                aria-label={`${option.label} percentage`}
                value={amount}
                onFocus={(event) => event.currentTarget.select()}
                onChange={(event) => updatePercent(option.id, event.target.value)}
                style={{
                  width: 82, textAlign: 'right', padding: '6px 8px',
                  border: `1.5px solid ${overLimit ? 'var(--danger)' : 'var(--border)'}`,
                  borderRadius: 'var(--radius-sm)', fontSize: 13, background: 'var(--surface2)',
                }} />
              <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>%</span>
            </div>
            {(option.requires_text || option.code === 'OTHER' || text) && (
              <>
                <input className="form-input" style={{ marginTop: 6 }} value={text}
                  aria-label={`${option.label} description`}
                  onChange={(event) => onChange({
                    ...map,
                    [option.id]: {
                      ...(isSectionEfRecord(entry) ? entry : {}),
                      percent: raw ?? 0,
                      other_text: event.target.value,
                    },
                  })}
                  placeholder="Please specify (optional)" />
                {option.code === 'OTHER' && ['E_SOURCING_TYPE', 'F_BUYER_TYPE'].includes(question.question_code) && (
                  <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>
                    Optionally describe the other {question.question_code === 'E_SOURCING_TYPE' ? 'source' : 'buyer type'}.
                  </div>
                )}
              </>
            )}
            {(invalidData || option.is_selectable === false) && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => remove(key)}>
                {option.is_selectable === false ? 'Remove previously recorded category' : 'Clear invalid saved category'}
              </button>
            )}
          </div>
        );
      })}
      <div style={{
        fontSize: 11, fontWeight: 700, textAlign: 'right', marginTop: 4,
        color: overLimit || total === null ? 'var(--danger)' : total === 100 ? 'var(--success)' : 'var(--text-muted)',
      }}>
        Total: {total === null ? 'Invalid' : `${formatPercentage(total)}% / 100%`}
        {overLimit ? ' - exceeds 100%' : ''}
      </div>
    </div>
  );
}

// Adapts the machinery-age answer to percentage shares and flags older count-based drafts.
function MachineryAgeField({ question, value, onChange, references }: {
  question: SurveyQuestion;
  value: unknown;
  onChange: (value: unknown) => void;
  references: Record<string, QuestionOption[]>;
}) {
  const legacyRows = legacyMachineryAgeRows(value);
  if (legacyRows) {
    return (
      <div className="alert alert-warning">
        <div>This draft contains machine counts, not percentages. Review them and re-enter the shares below.</div>
        {legacyRows.map((row, index) => {
          const label = question.options.find((option) => option.id === sectionGSelectionId(row.age_bracket_id))?.label ??
            `Saved age bracket ${String(row.age_bracket_id ?? index + 1)}`;
          return <div key={index}>{label}: {String(row.machine_count ?? 'Not provided')} machines</div>;
        })}
        <button type="button" className="btn btn-outline btn-sm" style={{ marginTop: 8 }}
          onClick={() => onChange({ shares: {}, legacy_counts: value })}>
          Re-enter percentage shares
        </button>
      </div>
    );
  }
  const wrapped = isLegacyMachineryAgeWrapper(value);
  const shares = wrapped ? value.shares : Array.isArray(value) && value.length === 0 ? {} : value;
  return (
    <div>
      {wrapped && (
        <div className="alert alert-warning">
          Previous machine counts are retained with this response; they are not treated as percentages.
        </div>
      )}
      <SectionEFShareField question={question} value={shares} references={references}
        onChange={(next) => onChange(wrapped ? { ...value, shares: next } : next)} />
    </div>
  );
}

// Generic percentage breakdown control used by SHARE_PERCENT questions.
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

// Matrix question UI: renders one response card for each configured matrix row.
function MatrixField({ question, value, onChange, references }: {
  question: SurveyQuestion; value: unknown; onChange: (v: unknown) => void;
  references: Record<string, QuestionOption[]>;
}) {
  const items = question.matrix_items ?? [];
  const invalidKeys = invalidMatrixKeys(question, value);
  const validation = normalizeMatrix(question, value, references);
  const update = (item: SurveyMatrixItem, entry: Record<string, unknown> | null) => {
    const next = isSectionEfRecord(value) ? { ...value } : {};
    delete next[item.code];
    delete next[String(item.id)];
    if (entry && ['I_COMPLIANCE_PERMITS', 'I_CERTIFICATIONS'].includes(question.question_code) &&
        item.code === 'OTHER') {
      const selectedId = positiveId(entry.choice_value_id ?? entry.option_id);
      const optionCode = item.options.find((option) => option.id === selectedId)?.code;
      if (optionCode === 'NA' || !optionCode) delete entry.other_text;
    }
    if (entry && Object.values(entry).some((part) => part !== null && part !== undefined && part !== '')) {
      next[String(item.id)] = entry;
    }
    onChange(next);
  };
  const removeKey = (key: string) => {
    const next = isSectionEfRecord(value) ? { ...value } : {};
    delete next[key];
    onChange(next);
  };

  if (!items.length && !invalidKeys.length && (value == null || isSectionEfRecord(value))) {
    return (
      <div style={{ fontSize: 12, color: 'var(--text-muted)', fontStyle: 'italic', padding: 8 }}>
        No matrix rows are configured for this question.
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      {value != null && !isSectionEfRecord(value) && (
        <div className="alert alert-error">
          This saved matrix has an invalid format.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange({})}>Clear invalid data</button>
        </div>
      )}
      {invalidKeys.map((key) => (
        <div key={key} className="alert alert-error">
          Unknown or duplicate saved matrix row: {key}.{' '}
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => removeKey(key)}>Remove</button>
        </div>
      ))}
      {items.map((item) => {
        const entry = matrixEntryForDisplay(question, item, value);
        const options = matrixOptions(item, entry, references);
        const selectedId = positiveId(entry.choice_value_id ?? entry.option_id);
        const selectedOption = options.find((option) => option.id === selectedId);
        const otherText = typeof entry.other_text === 'string' ? entry.other_text : '';
        const rawEntry = matrixRawEntry(item, value);
        const rowHasError = !validation.ok && validation.error.includes(item.label);
        return (
          <div key={item.id} style={{ padding: '10px 12px', background: 'var(--surface2)', borderRadius: 'var(--radius-sm)' }}>
            {item.group_label && (
              <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)', marginBottom: 4 }}>
                {item.group_label}
              </div>
            )}
            <div style={{ fontSize: 12, fontWeight: 600, marginBottom: 7 }}>{item.label}</div>
            {item.answer_type === 'RATING_1_5' ? (
              <select className="form-select" value={typeof entry.rating === 'number' || typeof entry.rating === 'string' ? entry.rating : ''}
                onChange={(event) => update(item, {
                  ...entry, rating: event.target.value ? Number(event.target.value) : null,
                })}>
                <option value="">— Select rating —</option>
                {[1, 2, 3, 4, 5].map((rating) => <option key={rating} value={rating}>{rating}</option>)}
              </select>
            ) : (
              <ChoiceField
                options={options}
                value={selectedId === null ? null : { option_id: selectedId, other_text: otherText }}
                onChange={(selection) => update(item, selection == null
                  ? item.allows_text && otherText ? { other_text: otherText } : null
                  : typeof selection === 'object'
                    ? { choice_value_id: selection.option_id, other_text: selection.other_text }
                    : { choice_value_id: selection, other_text: item.allows_text ? otherText : '' })}
              />
            )}
            {!selectedOption?.requires_text && (item.allows_text || otherText) &&
                isSectionIOtherTextVisible(question.question_code, item.code, selectedOption?.code) && (
              <input className="form-input" style={{ marginTop: 8 }} value={otherText}
                aria-label={`${item.label} description`} placeholder="Please specify"
                onChange={(event) => update(item, { ...entry, other_text: event.target.value })} />
            )}
            {rowHasError && rawEntry !== undefined && (
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => update(item, null)}>
                Clear invalid saved row
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Scroll snapping keeps the centered drum row aligned with the selected year.
function YearField({ value, min, max, disabled, onChange }: {
  value: unknown;
  min?: number;
  max?: number;
  disabled?: boolean;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const activeIndexRef = useRef(0);
  const lastPulseRef = useRef(0);
  const rowHeight = 44;

  const currentYear = new Date().getFullYear();
  const upper = Math.max(max ?? currentYear, currentYear);
  const lower = Math.min(min ?? 1800, upper);
  const selected = typeof value === 'number' && Number.isInteger(value)
    ? value
    : typeof value === 'string' && value.trim() && Number.isInteger(Number(value))
      ? Number(value)
      : null;
  const inRange = selected !== null && selected >= lower && selected <= upper;
  const years = Array.from({ length: upper - lower + 1 }, (_, i) => upper - i);
  const activeIndex = Math.max(0, Math.min(years.length - 1, Math.round(position)));

  const close = () => {
    setOpen(false);
    triggerRef.current?.focus({ preventScroll: true });
  };
  const scrollToIndex = (index: number) => {
    listRef.current?.scrollTo({
      top: Math.max(0, Math.min(years.length - 1, index)) * rowHeight,
      behavior: 'auto',
    });
  };

  useLayoutEffect(() => {
    if (!open) return;
    const index = inRange ? upper - selected : 0;
    activeIndexRef.current = index;
    setPosition(index);
    if (listRef.current) {
      listRef.current.scrollTop = index * rowHeight;
      listRef.current.focus({ preventScroll: true });
    }
  }, [open]);

  return (
    <div>
      <button ref={triggerRef} type="button" className="form-input" disabled={disabled}
        aria-haspopup="dialog" aria-expanded={open}
        style={{ textAlign: 'left', cursor: disabled ? 'not-allowed' : 'pointer', color: selected === null ? 'var(--text-muted)' : undefined }}
        onClick={() => setOpen(true)}>
        {selected === null ? 'Select year' : selected}
      </button>
      {selected !== null && !disabled && (
        <button type="button" className="btn btn-ghost btn-sm" style={{ marginTop: 4, color: 'var(--danger)' }}
          onClick={() => onChange(null)}>
          Clear
        </button>
      )}

      {open && (
        <div className="modal-overlay" style={{ position: 'fixed' }} onClick={close}>
          <div className="modal year-picker-modal" role="dialog" aria-modal="true" aria-label="Select year"
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => {
              if (event.key === 'Escape') { event.preventDefault(); close(); }
              if (event.key === 'Tab') {
                const controls = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not([tabindex="-1"]), [tabindex="0"]'));
                const first = controls[0];
                const last = controls[controls.length - 1];
                if (event.shiftKey && document.activeElement === first) {
                  event.preventDefault(); last?.focus();
                } else if (!event.shiftKey && document.activeElement === last) {
                  event.preventDefault(); first?.focus();
                }
              }
            }}>
            <div className="modal-handle" />
            <div className="modal-header">
              <h3>Select year</h3>
              <button type="button" className="btn btn-ghost btn-sm" onClick={close}>Cancel</button>
            </div>
            <div className="year-drum">
              <div className="year-drum-selection" aria-hidden="true" />
              <div ref={listRef} className="year-drum-scroll" role="listbox" aria-label="Year of establishment"
                tabIndex={0} aria-activedescendant={`establishment-year-${years[activeIndex]}`}
                onScroll={(event) => {
                  const next = Math.max(0, Math.min(years.length - 1, event.currentTarget.scrollTop / rowHeight));
                  setPosition(next);
                  const index = Math.round(next);
                  if (index !== activeIndexRef.current) {
                    activeIndexRef.current = index;
                    const now = performance.now();
                    if (now - lastPulseRef.current >= 35 && typeof navigator.vibrate === 'function') {
                      navigator.vibrate(5);
                      lastPulseRef.current = now;
                    }
                  }
                }}
                onKeyDown={(event) => {
                  const steps: Record<string, number> = { ArrowDown: 1, ArrowUp: -1, PageDown: 10, PageUp: -10 };
                  if (event.key in steps || event.key === 'Home' || event.key === 'End') {
                    event.preventDefault();
                    scrollToIndex(event.key === 'Home' ? 0 : event.key === 'End' ? years.length - 1
                      : activeIndexRef.current + steps[event.key]);
                  }
                }}>
                {years.map((year, index) => {
                  const distance = Math.max(-3, Math.min(3, index - position));
                  return (
                    <div key={year} className="year-drum-row" role="option"
                      id={`establishment-year-${year}`} aria-selected={index === activeIndex}
                      onClick={() => scrollToIndex(index)}>
                      <span style={{
                        transform: `perspective(240px) rotateX(${-distance * 24}deg) scale(${1 - Math.abs(distance) * 0.1})`,
                        opacity: Math.max(0, 1 - Math.abs(distance) * 0.32),
                      }}>{year}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div className="modal-actions">
              <button type="button" className="btn btn-primary" onClick={() => {
                const index = Math.max(0, Math.min(years.length - 1,
                  Math.round((listRef.current?.scrollTop ?? 0) / rowHeight)));
                onChange(years[index]);
                close();
              }}>Done</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Maps a structured field's data type to its concrete HTML input/control.
function InputFieldControl({ field, value, onChange, disabled, manualValue, onManualChange, preserveNumericText }: {
  field: SurveyInputField;
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
  manualValue?: string;
  onManualChange?: (value: string) => void;
  preserveNumericText?: boolean;
}) {
  switch (field.type) {
    case 'TEXT':
      return <input className="form-input" value={value ?? ''}
        onChange={(event) => onChange(event.target.value)} placeholder="Enter text…" />;
    case 'PHONE':
      return <input className="form-input" type="tel" inputMode="numeric" maxLength={11}
        pattern="[0-9]{11}" value={value ?? ''}
        onChange={(event) => onChange(event.target.value)} placeholder="11-digit mobile number" />;
    case 'EMAIL':
      return <input className="form-input" type="email" autoComplete="email" value={value ?? ''}
        onChange={(event) => onChange(event.target.value)} placeholder="name@example.com" />;
    case 'NUMBER':
      if (preserveNumericText) {
        return <input className="form-input" type="text" inputMode="decimal" value={value ?? ''}
          onChange={(event) => onChange(event.target.value === '' ? null : event.target.value)}
          placeholder="Enter number" />;
      }
      return <input className="form-input" type="number" value={value ?? ''}
        min={field.min} max={field.max} step={field.step}
        onChange={(event) => onChange(event.target.value === '' ? null : Number(event.target.value))}
        placeholder="Enter number" />;
    case 'YEAR':
      return <YearField value={value} min={field.min} max={field.max} disabled={disabled} onChange={onChange} />;
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
      if (['psic_divisions', 'psic_groups', 'psic_classes', 'associated_psic_classes', 'hs_codes'].includes(field.reference ?? '')) {
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
      return <ChoiceField options={field.options} value={value} onChange={onChange} disabled={disabled} />;
    case 'MULTI_CHOICE':
      return <MultiChoiceField options={field.options} value={value} onChange={onChange} />;
    case 'MONTHS':
      return <MultiChoiceField options={field.options} value={value} onChange={onChange} showMonthToggle />;
    case 'SHARE_PERCENT':
      return <SharePercentField options={field.options} value={value} onChange={onChange} />;
    case 'GPS':
      return <GpsField value={value} onChange={onChange} />;
    default:
      return null;
  }
}

// Responsive grid of fields for one structured answer (or one repeatable row).
function FieldGroup({ fields, value, onChange, references, questionCode, industryTypeId }: {
  fields: SurveyInputField[];
  value: Record<string, any>;
  onChange: (value: Record<string, any>) => void;
  references: Record<string, QuestionOption[]>;
  questionCode: string;
  industryTypeId: number | null;
}) {
  const map = value && typeof value === 'object' ? value : {};
  const psicTextKeys: Record<string, string> = {
    psic_division_id: 'psic_division_text',
    psic_group_id: 'psic_group_text',
    psic_class_id: 'psic_class_text',
  };

  // Each grid cell contains a label, input control, and any context/validation hint.
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
      {fields.map((field) => {
        let options = field.reference ? (references[field.reference] ?? field.options) : field.options;
        const parentKey: Record<string, string> = {
          division_id: 'province_id',
          district_id: 'division_id',
          tehsil_id: 'district_id',
          unit_id: 'energy_source_id',
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
        if (field.reference === 'industry_products') {
          options = productOptionsForRow(options, industryTypeId, map.product_kind, map[field.key]);
        } else if (field.reference === 'product_units') {
          options = productUnitsForDisplay(options, map[field.key]);
        } else if (field.reference === 'industry_machines') {
          options = machineOptions(options, industryTypeId, map[field.key]);
        } else if (field.reference === 'machine_specifications') {
          const machines = references.industry_machines ??
            fields.find((candidate) => candidate.reference === 'industry_machines')?.options ?? [];
          options = specificationOptions(options, machines, industryTypeId, map.machine_name, map[field.key]);
        } else if (questionCode === 'G_WEIGHTS_MEASURES' && field.key === 'equipment_unit_id') {
          options = equipmentUnitOptions(options, map.equipment_type_id, map[field.key]);
        }
        if (questionCode === 'J_REINVESTMENT_AREA' && field.key === 'reinvestment_area_id') {
          options = options.map((option) => ({ ...option, requires_text: false }));
        }

        const visibleField = { ...field, options };
        const manualKey = psicTextKeys[field.key];
        const dependentFields: Record<string, string[]> = {
          psic_division_id: ['psic_group_id', 'psic_class_id', 'psic_group_text', 'psic_class_text'],
          psic_group_id: ['psic_class_id', 'psic_class_text'],
        };
        if (!isProductFieldVisible(questionCode, map, field.key)) return null;
        if (!isSectionGFieldVisible(questionCode, map, field.key)) return null;
        if (!isSectionHFieldVisible(questionCode, map, field.key, fields)) return null;
        if (!isSectionKFieldVisible(questionCode, map, field.key, fields)) return null;
        if (field.key === 'company_name' && map.has_parent_company === false) return null;
        if (questionCode === 'J_REINVESTMENT_AREA' &&
            field.key === 'reinvestment_area_other' &&
            !isReinvestmentOtherVisible(map.reinvestment_area_id, fields.find(
              (candidate) => candidate.key === 'reinvestment_area_id',
            )?.options ?? [])) return null;

        const selectedKind = productKind(map.product_kind);
        let controlValue = map[field.key];
        if (questionCode === 'H_SOLID_WASTE' && field.key === 'disposal_method_ids' &&
            typeof map.other_text === 'string' && map.other_text.trim()) {
          const optionIds = Array.isArray(controlValue)
            ? controlValue
            : isSectionEfRecord(controlValue) && Array.isArray(controlValue.option_ids)
              ? controlValue.option_ids
              : [];
          const otherOption = field.options.find((option) => option.code === 'OTHER');
          if (otherOption && optionIds.some((id) => Number(id) === otherOption.id)) {
            const existing = isSectionEfRecord(controlValue) ? controlValue : {};
            const otherTextMap = isSectionEfRecord(existing.other_text) ? existing.other_text : {};
            controlValue = {
              option_ids: optionIds,
              other_text: {
                ...otherTextMap,
                [otherOption.id]: otherTextMap[String(otherOption.id)] ?? map.other_text,
              },
            };
          }
        }
        if (field.reference === 'industry_products') {
          controlValue = productValueForDisplay(controlValue, options);
        } else if (field.reference === 'product_units') {
          controlValue = productUnitValueForDisplay(controlValue);
        } else if (field.reference === 'industry_machines' || field.reference === 'machine_specifications') {
          controlValue = machineValueForDisplay(controlValue, options);
        } else if (questionCode === 'G_BOILERS' && field.key === 'record_kind') {
          const kind = vesselKind(controlValue);
          controlValue = kind === 'BOILER' ? 1 : kind === 'VESSEL' ? 2 : null;
        } else if (questionCode === 'C_PRODUCTS' && field.key === 'product_kind') {
          controlValue = selectedKind === 'MAIN' ? 1 : selectedKind === 'SECONDARY' ? 2 : null;
        }
        if (questionCode === 'J_REINVESTMENT_AREA' &&
            field.key === 'reinvestment_area_other' &&
            !map.reinvestment_area_other &&
            isSectionEfRecord(map.reinvestment_area_id)) {
          controlValue = map.reinvestment_area_id.other_text ?? '';
        }
        const isMonths = field.type === 'MONTHS';
        const fieldError = fieldFormatError(field, map[field.key]);
        const needsProductContext = field.reference === 'industry_products' &&
          (industryTypeId === null || selectedKind === null);
        const needsMachineContext = field.reference === 'industry_machines' && industryTypeId === null;
        const needsSpecificationContext = field.reference === 'machine_specifications' &&
          (industryTypeId === null || map.machine_name == null || map.machine_name === '');
        const needsEquipmentContext = questionCode === 'G_WEIGHTS_MEASURES' &&
          field.key === 'equipment_unit_id' && sectionGSelectionId(map.equipment_type_id) === null;
        const needsEnergyUnitContext = questionCode === 'H_ENERGY_CONSUMPTION' &&
          field.key === 'unit_id' && sectionHSelectionId(map.energy_source_id) === null;

        return (
          <div key={field.key} style={{ gridColumn: isMonths ? '1 / -1' : undefined }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, marginBottom: 5 }}>
              {field.label}{field.required ? ' *' : ''}
            </label>
            <InputFieldControl
              field={visibleField}
              value={controlValue}
              preserveNumericText={isSectionGRawDecimalField(questionCode, field.key)}
              disabled={
                needsProductContext || needsMachineContext || needsSpecificationContext ||
                needsEquipmentContext || needsEnergyUnitContext || (
                  ['psic_groups', 'psic_classes'].includes(field.reference ?? '') &&
                  Boolean(parentKey[field.key]) &&
                  parentValue == null &&
                  !map[parentTextKey ?? '']
                )
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
                if (questionCode === 'C_PRODUCTS' && field.key === 'product_kind') {
                  onChange(changeProductKind(map, next));
                  return;
                }
                if (questionCode === 'G_CRITICAL_MACHINES' || questionCode === 'G_BOILERS' ||
                    questionCode === 'G_WEIGHTS_MEASURES') {
                  onChange(changeSectionGField(questionCode, map, field.key, next));
                  return;
                }
                if (['H_ENERGY_CONSUMPTION', 'H_ENERGY_GENERATION'].includes(questionCode)) {
                  onChange(changeSectionHField(questionCode, map, field.key, next));
                  return;
                }
                if (questionCode === 'H_SOLID_WASTE' && field.key === 'disposal_method_ids') {
                  const updated: Record<string, unknown> = { ...map, [field.key]: next };
                  delete updated.other_text;
                  onChange(updated);
                  return;
                }
                if (questionCode === 'J_REINVESTMENT_AREA' && field.key === 'reinvestment_area_id') {
                  onChange(changeReinvestmentArea(map, field.key, next, field.options ?? []));
                  return;
                }
                const dependentSelectionFields: Record<string, string[]> = {
                  district_id: ['tehsil_id'],
                  psic_division_id: dependentFields.psic_division_id,
                  psic_group_id: dependentFields.psic_group_id,
                  energy_source_id: ['unit_id', 'other_text'],
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
            {fieldError && (
              <div className="alert alert-error" role="alert" style={{ marginTop: 6, padding: '7px 9px' }}>
                {fieldError}
              </div>
            )}
            {needsProductContext && (
              <small style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                Select Type of Unit and product kind first.
              </small>
            )}
            {(needsMachineContext || needsSpecificationContext || needsEquipmentContext) && (
              <small style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                {needsEquipmentContext ? 'Select an equipment type first.'
                  : needsMachineContext ? 'Select Type of Unit first.'
                    : 'Select Type of Unit and machine name first.'}
              </small>
            )}
            {field.default_value !== undefined && (
              <small style={{ display: 'block', marginTop: 4, color: 'var(--text-muted)' }}>
                If left blank, {field.default_value} will be recorded on sync.
              </small>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Small display helpers shared by the employment and skills tables below.
function WorkforceTotal({ values }: { values: unknown[] }) {
  const total = totalWorkforceCounts(values);
  return <strong>{total === null ? '—' : total}</strong>;
}

function WorkforceCountInput({ label, value, onChange }: {
  label: string;
  value: number | string;
  onChange: (value: string) => void;
}) {
  return (
    <label style={{ minWidth: 0, display: 'block', fontSize: 11, color: 'var(--text-muted)' }}>
      {label}
      <input
        className="form-input"
        type="number"
        min={0}
        max={MAX_WORKFORCE_COUNT}
        step={1}
        inputMode="numeric"
        aria-label={label}
        value={value}
        onFocus={(event) => event.currentTarget.select()}
        onChange={(event) => onChange(event.target.value)}
        style={{ marginTop: 4, padding: '9px 10px', fontSize: 16 }}
      />
      {workforceCount(value) === null && (
        <small style={{ display: 'block', marginTop: 4, color: 'var(--danger)' }}>
          Enter a whole number from 0 to {MAX_WORKFORCE_COUNT}.
        </small>
      )}
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

function UnrecognizedWorkforceRows({ value, skills, onChange }: {
  value: unknown;
  skills: boolean;
  onChange: (value: unknown) => void;
}) {
  if (value === undefined || value === null || value === '') return null;
  if (!Array.isArray(value)) {
    return (
      <div className="alert alert-error">
        The saved workforce entries have an invalid format.
        <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange([])}>
          Remove invalid entries
        </button>
      </div>
    );
  }
  const invalid = value.flatMap((row: unknown, index: number) => {
    if (!isWorkforceRow(row)) return [index];
    const hasData = Object.values(row).some((item) =>
      item !== null && item !== undefined && item !== '' && (!Array.isArray(item) || item.length > 0),
    );
    if (!hasData) return [];
    const skillId = workforceSelectionId(row.skill_level_id);
    return !workforceGender(row.gender) || (skills && (skillId === null || skillId < 1)) ? [index] : [];
  });
  if (!invalid.length) return null;
  return (
    <div className="alert alert-error">
      {invalid.map((index) => (
        <div key={index}>
          Saved workforce entry {index + 1} has an unrecognized gender or skill level and is excluded from displayed totals.
          <button type="button" className="btn btn-ghost btn-sm"
            onClick={() => onChange(value.filter((_, rowIndex) => rowIndex !== index))}>
            Remove entry
          </button>
        </div>
      ))}
    </div>
  );
}

// Section D employment layout: category cards, gender counts, and calculated subtotals.
function EmploymentDetailsTable({ value, onChange }: {
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = Array.isArray(value) ? value.filter(isWorkforceRow) : [];
  const categories = EMPLOYMENT_CATEGORIES;
  const genders = WORKFORCE_GENDERS;
  const countFor = (gender: WorkforceGender, key: string) =>
    workforceCellValue(
      rows.filter((row) => workforceGender(row.gender) === gender).map((row) => row[key]),
    );

  const updateCount = (gender: WorkforceGender, key: string, raw: string) => {
    let updated = false;
    const nextRows: unknown[] = (Array.isArray(value) ? value : []).map((row: unknown) => {
      if (!isWorkforceRow(row) || workforceGender(row.gender) !== gender) return row;
      const count = updated ? 0 : raw === '' ? 0 : raw;
      updated = true;
      return { ...row, [key]: count };
    });
    if (!updated) nextRows.push({
      gender: genders.find((option) => option.code === gender)?.id,
      [key]: raw === '' ? 0 : raw,
    });
    onChange(nextRows);
  };

  if (value !== undefined && value !== null && value !== '' && !Array.isArray(value)) {
    return <UnrecognizedWorkforceRows value={value} skills={false} onChange={onChange} />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <UnrecognizedWorkforceRows value={value} skills={false} onChange={onChange} />
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

// Section D skills layout: one card per skill level with gender counts and totals.
function EmploymentSkillsTable({ options, value, onChange }: {
  options: WorkforceSkillOption[];
  value: unknown;
  onChange: (value: unknown) => void;
}) {
  const rows = Array.isArray(value) ? value.filter(isWorkforceRow) : [];
  const genders = WORKFORCE_GENDERS;
  const countFor = (gender: WorkforceGender, skillId: number) =>
    workforceCellValue(rows.filter((row) =>
      workforceGender(row.gender) === gender && workforceSelectionId(row.skill_level_id) === skillId,
    ).map((row) => row.headcount));

  const updateCount = (gender: WorkforceGender, skillId: number, raw: string) => {
    let updated = false;
    const nextRows: unknown[] = (Array.isArray(value) ? value : []).map((row: unknown) => {
      if (!isWorkforceRow(row) || workforceGender(row.gender) !== gender ||
          workforceSelectionId(row.skill_level_id) !== skillId) return row;
      const headcount = updated ? 0 : raw === '' ? 0 : raw;
      updated = true;
      return { ...row, headcount };
    });
    if (!updated) nextRows.push({
      gender: genders.find((option) => option.code === gender)?.id,
      skill_level_id: skillId,
      headcount: raw === '' ? 0 : raw,
    });
    onChange(nextRows);
  };

  if (value !== undefined && value !== null && value !== '' && !Array.isArray(value)) {
    return <UnrecognizedWorkforceRows value={value} skills onChange={onChange} />;
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
      <UnrecognizedWorkforceRows value={value} skills onChange={onChange} />
      {!options.some((option) => option.is_selectable !== false) && (
        <div className="alert alert-error">Workforce skill levels are unavailable. Refresh the survey form.</div>
      )}
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
          {option.unknown && (
            <div className="alert alert-error">
              Refresh the form to restore this skill level, or remove the unknown saved level.
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange(
                (Array.isArray(value) ? value : []).filter((row: unknown) =>
                  !isWorkforceRow(row) || workforceSelectionId(row.skill_level_id) !== option.id),
              )}>Remove unknown level</button>
            </div>
          )}
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

// Chooses the specialized Section D tables, a single field grid, or repeatable entry cards.
function StructuredQuestionField({ question, value, onChange, references, industryTypeId }: {
  question: SurveyQuestion;
  value: any;
  onChange: (value: any) => void;
  references: Record<string, QuestionOption[]>;
  industryTypeId: number | null;
}) {
  const fields = question.fields ?? [];
  if (question.question_code === 'D_EMPLOYMENT') {
    return <EmploymentDetailsTable value={value} onChange={onChange} />;
  }
  if (question.question_code === 'D_SKILLS') {
    return <EmploymentSkillsTable options={workforceSkillOptions(question, value, references)}
      value={value} onChange={onChange} />;
  }
  if (!question.repeatable) {
    return <FieldGroup fields={fields} value={value ?? {}} onChange={onChange} references={references}
      questionCode={question.question_code} industryTypeId={industryTypeId} />;
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
          {legacySectionGFields(question.question_code, row).length > 0 && (
            <div className="alert alert-warning">
              <div>Previous entry values are retained. Complete the new fields to submit this row.</div>
              {legacySectionGFields(question.question_code, row).map((field) => (
                <div key={field.label}>{field.label}: {field.value}</div>
              ))}
            </div>
          )}
          <FieldGroup fields={fields} value={row} onChange={(updated) => updateRow(index, updated)} references={references}
            questionCode={question.question_code} industryTypeId={industryTypeId} />
        </div>
      ))}
      <button type="button" className="btn btn-outline btn-sm"
        onClick={() => onChange([...rows, {}])}>
        + Add entry
      </button>
    </div>
  );
}

// Universal question renderer: dispatches each question to its specialized or answer-type control.
function QuestionField({
  q, value, onChange, error, references, responseId, ownerId, unitName, industryTypeId,
  energyGenerationRows,
}: {
  q: SurveyQuestion; value: any; onChange: (v: any) => void; error?: string;
  references: Record<string, QuestionOption[]>;
  responseId: string; ownerId: string; unitName: string;
  industryTypeId: number | null;
  energyGenerationRows: unknown[];
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

  if (q.question_code === 'H_CAPTIVE_EXPORT_CAPACITY') {
    const total = totalGenerationCapacity(energyGenerationRows);
    const exportValue = value && typeof value === 'object' ? value.export_capacity_kw ?? '' : '';
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 12 }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700 }}>
          Total captive capacity (kW)
          <input className="form-input" type="number" value={total} readOnly aria-readonly="true" />
        </label>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700 }}>
          Export capacity (kW)
          <input className={`form-input ${errCls}`} type="number" min={0} step="0.01"
            value={exportValue}
            onChange={(event) => onChange({
              ...(value && typeof value === 'object' ? value : {}),
              captive_capacity_kw: total,
              export_capacity_kw: event.target.value === '' ? null : Number(event.target.value),
            })}
            placeholder="Enter number" />
        </label>
      </div>
    );
  }

  if (q.fields?.length) {
    return <StructuredQuestionField question={q} value={value} onChange={onChange}
      references={references} industryTypeId={industryTypeId} />;
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
      return <MultiChoiceField options={q.options} value={value} onChange={onChange}
        reasonQuestion={isSectionEfReason(q) ? q : undefined} references={references} />;

    case 'SHARE_PERCENT':
      return q.question_code === 'G_MACHINERY_AGE'
        ? <MachineryAgeField question={q} value={value} onChange={onChange} references={references} />
        : isDefaultedShare(q)
        ? <SectionEFShareField question={q} value={value} onChange={onChange} references={references} />
        : <SharePercentField options={q.options} value={value} onChange={onChange} />;

    case 'MATRIX':
      return <MatrixField question={q} value={value} onChange={onChange} references={references} />;

    case 'REPEATING_GROUP':
      return <StructuredQuestionField question={q} value={value} onChange={onChange}
        references={references} industryTypeId={industryTypeId} />;

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

// Horizontal section navigator: each button shows the section code and completion state.
function SectionStrip({
  sections, current, statusForSection, onClick,
}: {
  sections:  SurveySection[];
  current:   number;
  statusForSection: (section: SurveySection) => SectionStatus;
  onClick:   (i: number) => void;
}) {
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = scrollRef.current;
    const el = container?.children[current] as HTMLElement | undefined;
    if (container && el) {
      container.scrollTo({
        left: el.offsetLeft - (container.clientWidth - el.offsetWidth) / 2,
        behavior: 'smooth',
      });
    }
  }, [current]);

  return (
    <div style={{ position: 'relative' }}>
      {/* Fade edges */}
      <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: 18,
        background: 'linear-gradient(to right, var(--surface), transparent)', zIndex: 2, pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', right: 0, top: 0, bottom: 0, width: 18,
        background: 'linear-gradient(to left, var(--surface), transparent)', zIndex: 2, pointerEvents: 'none' }} />

      <div ref={scrollRef} style={{
        display: 'flex', gap: 7,
        overflowX: 'auto', padding: '3px 16px 5px',
        scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent',
      } as React.CSSProperties}>
        {sections.map((sec, i) => {
          const status = statusForSection(sec);
          const complete = status === 'done';
          const partial = status === 'partial';
          const isActive  = i === current;

          let bg     = 'var(--surface)';
          let border = 'var(--border)';
          let color  = 'var(--text-muted)';
          if (isActive)      { bg = 'var(--primary)'; border = 'var(--primary)'; color = '#fff'; }
          else if (complete) { bg = 'var(--success-bg)'; border = 'var(--secondary)'; color = 'var(--success)'; }
          else if (partial)  { bg = 'var(--warning-bg)'; border = 'var(--warning)'; color = 'var(--warning)'; }

          return (

            <button key={sec.section_id} onClick={() => onClick(i)} title={sec.title}
              aria-current={isActive ? 'step' : undefined}
              aria-label={`Section ${sec.section_code}: ${isActive ? 'current' : status}`}
              
              style={{ flexShrink: 0, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                width: 52, height: 46, borderRadius: 10,
                border: `2px solid ${border}`, background: bg, color,
                cursor: 'pointer', padding: 0, transition: 'all 0.15s' }}>

              <span style={{ fontSize: 14, fontWeight: 800, lineHeight: 1 }}>
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

// Page controller: loads/saves answers, validates sections, calculates progress, and renders the survey UI.
export default function SurveyPage() {
  const { id }   = useParams<{ id: string }>();
  const { form, fetchForm, formLoading, formError, isOnline } = useSurvey();
  const { user, registerSessionEndSave } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const navigationType = useNavigationType();
  const [searchParams, setSearchParams] = useSearchParams();

  const currentSection = surveySectionIndex(form?.sections ?? [], searchParams.get('section'));
  const [answers,  setAnswers]  = useState<Record<number, any>>({});
  const [errors,   setErrors]   = useState<Record<number, string>>({});
  const [saving,   setSaving]   = useState(false);
  const [existingResponseLoaded, setExistingResponseLoaded] = useState(!id);
  const [ownerMismatch, setOwnerMismatch] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState('');
  const [responseId] = useState(() => id || uuidv4());
  const [startedAt]  = useState(() => new Date().toISOString());
  const metadataRef = useRef({ startedAt, createdAt: startedAt });
  const answersRef = useRef(answers);
  const saverRef = useRef(new DraftSaver<OfflineResponse>(saveResponse));
  const savingRef = useRef(false);
  const exclusiveSaveRef = useRef(false);
  const topRef = useRef<HTMLDivElement>(null);

  const buildResponse = useCallback((status: 'draft' | 'pending_sync'): OfflineResponse => {
    if (!form || !user?.user_id) throw new Error('The survey form or account is unavailable.');
    const currentAnswers = answersRef.current;
    const questions = form.sections.flatMap((section) => section.questions);
    const gpsQ = questions.find((q) => q.answer_type === 'GPS' || q.question_code === 'A_LOCATION_GPS');
    const gpsVal = gpsQ ? currentAnswers[gpsQ.question_id] : null;
    const workforceAnswers = materializeWorkforceAnswers(questions, currentAnswers, form.references ?? {});
    const responseAnswers = materializeSectionEFAnswers(questions, workforceAnswers, form.references ?? {});
    const sectionHAnswers = materializeSectionHAnswers(questions, responseAnswers);

    return {
      response_id: responseId,
      form_id: form.form_id,
      surveyor_id: user.user_id,
      device_id: getDeviceId(),
      gps_lat: gpsVal?.lat,
      gps_lng: gpsVal?.lng,
      gps_accuracy_m: gpsVal?.accuracy,
      started_at: metadataRef.current.startedAt,
      submitted_at: status === 'pending_sync' ? new Date().toISOString() : undefined,
      answers: Object.entries(sectionHAnswers)
        .filter(([qid]) => {
          const question = questions.find((candidate) => candidate.question_id === Number(qid));
          return !question || isQuestionVisible(question, questions, currentAnswers) ||
            (question.question_code === 'G_UNDERUTILIZATION_REASON' &&
             utilizationBandCode(questions, currentAnswers) === null);
        })
        .map(([qid, val]) => ({ question_id: parseInt(qid), answer_value: val })),
      sync_status: status,
      created_at: metadataRef.current.createdAt,
    };
  }, [form, responseId, user?.user_id]);

  const save = useCallback(async (status: 'draft' | 'pending_sync', force = false) => {
    try {
      const written = await saverRef.current.save(() => buildResponse(status), force);
      setDirty(saverRef.current.dirty);
      if (written) {
        setSavedAt(new Date());
        setSaveError('');
      }
    } catch (error) {
      setSaveError(`Unable to save the survey on this device: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
    }
  }, [buildResponse]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) =>
    saverRef.current.dirty && currentLocation.pathname !== nextLocation.pathname,
  );

  useEffect(() => {
    if (!form || !existingResponseLoaded || ownerMismatch) return;
    const autosave = () => {
      if (!exclusiveSaveRef.current && saverRef.current.dirty) void save('draft').catch(() => {});
    };
    const timer = window.setInterval(autosave, AUTOSAVE_INTERVAL_MS);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') autosave();
    };
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [form, existingResponseLoaded, ownerMismatch, save]);

  useEffect(() => {
    if (!dirty && !saving) return;
    const onBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!saverRef.current.dirty && !savingRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [dirty, saving]);

  useEffect(() => registerSessionEndSave(async () => {
    try {
      while (saverRef.current.dirty) await save('draft');
    } catch (error) {
      setSaveError(`Your session expired and the draft could not be saved: ${error instanceof Error ? error.message : 'Unknown error'}. Retry saving before signing out.`);
      throw error;
    }
  }), [registerSessionEndSave, save]);

  useLayoutEffect(() => {
    scrollSurveyToTop(topRef.current);
  }, [currentSection, form, existingResponseLoaded, location.key]);

  useEffect(() => {
    if (navigationType === 'POP') setErrors({});
  }, [location.key, navigationType]);

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
      metadataRef.current = { startedAt: r.started_at, createdAt: r.created_at };
      answersRef.current = map;
      setAnswers(map);
    }).catch(() => setOwnerMismatch(true)).finally(() => setExistingResponseLoaded(true));
  }, [id, user?.user_id]);

  useEffect(() => {
    if (!form || !existingResponseLoaded) return;
    const questions = form.sections.flatMap((section) => section.questions);
    setAnswers((previous) => {
      const cleaned = clearHiddenAnswers(questions, previous);
      answersRef.current = cleaned;
      return cleaned;
    });
  }, [form, existingResponseLoaded]);

  const setAnswer = useCallback((qid: number, val: any) => {
    const questions = form?.sections.flatMap((section) => section.questions) ?? [];
    const previousAnswers = answersRef.current;
    const next = { ...previousAnswers, [qid]: val };
    if (questions.find((question) => question.question_id === qid)?.question_code === 'A_UNIT_TYPE' &&
        selectedOptionId(previousAnswers[qid]) !== selectedOptionId(val)) {
      const psicQuestion = questions.find((question) => question.question_code === 'A_PSIC');
      if (psicQuestion) delete next[psicQuestion.question_id];
      if (selectedOptionId(previousAnswers[qid]) !== null) {
        const productQuestion = questions.find((question) => question.question_code === 'C_PRODUCTS');
        if (productQuestion && Object.prototype.hasOwnProperty.call(next, productQuestion.question_id)) {
          next[productQuestion.question_id] = clearProductNames(next[productQuestion.question_id]);
        }
      }
    }
    const cleanedAnswers = clearHiddenAnswers(questions, next);
    answersRef.current = cleanedAnswers;
    saverRef.current.changed();
    setDirty(true);
    setAnswers(cleanedAnswers);
    setErrors((previous) => {
      const remaining = { ...previous };
      delete remaining[qid];
      for (const question of questions) {
        if (!isQuestionVisible(question, questions, cleanedAnswers)) {
          delete remaining[question.question_id];
        }
      }
      return remaining;
    });
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
  const showQuestion = (q: SurveyQuestion): boolean => isQuestionVisible(q, allQs, answers);
  const validationError = (q: SurveyQuestion): string | null => {
    const value = answers[q.question_id];
    const workforce = normalizeWorkforceAnswer(q, value, form.references ?? {});
    if (workforce) return workforce.ok ? null : workforce.error;
    if (q.question_code === 'G_MACHINERY_AGE' && legacyMachineryAgeRows(value)) {
      return 'Review the previous machine counts and re-enter percentage shares.';
    }
    if (q.question_code === 'J_REINVESTMENT_AREA') {
      const error = reinvestmentAreaError(q, value);
      if (error) return error;
    }
    if (isDefaultedShare(q)) {
      const share = normalizeShares(q, value, form.references ?? {});
      return share.ok ? null : share.error;
    }
    if (q.question_code === 'G_UTILIZATION_RATE') {
      const rate = value && typeof value === 'object' ? value.utilization_rate_id : value;
      const reason = answerForCode('G_UNDERUTILIZATION_REASON');
      const hasReason = Array.isArray(reason) ? reason.length > 0
        : isSectionEfRecord(reason) && Array.isArray(reason.option_ids) ? reason.option_ids.length > 0
          : isSectionEfRecord(reason) ? Object.keys(reason).length > 0
            : reason !== undefined && reason !== null && reason !== '';
      const code = utilizationBandCode(allQs, answers);
      if ((rate !== undefined && rate !== null && rate !== '') || hasReason) {
        if (!code || !['U40_59', 'U60_74', 'U75_84', 'U85_95', 'ABOVE_95'].includes(code)) {
          return 'Select a valid capacity utilization rate before saving its reason.';
        }
      }
    }
    if (SECTION_EF_MATRIX_DEFAULTS[q.question_code] && q.answer_type !== 'MATRIX') {
      return 'This question is not configured as a matrix.';
    }
    if (q.answer_type === 'MATRIX') {
      const matrix = normalizeMatrix(q, value, form.references ?? {});
      return matrix.ok ? null : matrix.error;
    }
    if (isSectionEfReason(q)) return reasonError(q, value, form.references ?? {});
    const sectionGError = sectionGRowsError(
      q, value, selectedOptionId(answerForCode('A_UNIT_TYPE')), form.references ?? {},
    );
    if (sectionGError) return sectionGError;
    const sectionHError = sectionHQuestionError(q, value, form.references ?? {});
    if (sectionHError) return sectionHError;
    if (q.question_code === 'E_MAJOR_INPUTS') {
      return majorInputUnitsError(
        value,
        form.references?.product_units ?? q.fields?.find((field) => field.reference === 'product_units')?.options ?? [],
      ) ?? questionFormatError(q, value);
    }
    return questionFormatError(q, value) ?? (q.question_code === 'C_PRODUCTS'
      ? productRowsError(
          value,
          selectedOptionId(answerForCode('A_UNIT_TYPE')),
          form.references?.industry_products ?? q.fields?.find((field) => field.reference === 'industry_products')?.options ?? [],
          form.references?.product_units ?? q.fields?.find((field) => field.reference === 'product_units')?.options ?? [],
        )
      : null);
  };

  const questionIsIncomplete = (q: SurveyQuestion): boolean => {
    const value = answers[q.question_id];
    const fields = q.fields ?? [];
    if (validationError(q)) return true;
    if (q.question_code === 'D_EMPLOYMENT' || q.question_code === 'D_SKILLS') return false;
    if (isDefaultedShare(q) || SECTION_EF_MATRIX_DEFAULTS[q.question_code]) return false;
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
    if (!fields.length) return false;
    if (q.repeatable) {
      return (Array.isArray(value) ? value : []).some((row) =>
        fields.some((field) => field.required &&
          isSectionGFieldVisible(q.question_code, row, field.key) && isEmptyAnswer(row[field.key])),
      );
    }
    return fields.some((field) => field.required && isEmptyAnswer(value?.[field.key]));
  };

  const requiredQuestionCount = (q: SurveyQuestion) => {
    const requiredFields = (q.fields ?? []).filter((field) => field.required);
    if (q.repeatable) {
      return (Array.isArray(answers[q.question_id]) ? answers[q.question_id] : [])
        .reduce((count: number, row: unknown) => count + requiredFields.filter((field) =>
          isSectionGFieldVisible(q.question_code, row, field.key)).length, 0);
    }
    return requiredFields.length || (q.is_required ? 1 : 0);
  };
  const answeredQuestionCount = (q: SurveyQuestion) => {
    const value = answers[q.question_id];
    const requiredFields = (q.fields ?? []).filter((field) => field.required);
    if (q.repeatable) {
      return (Array.isArray(value) ? value : []).reduce((count, row) => {
        const values = row && typeof row === 'object' && !Array.isArray(row) ? row : {};
        return count + requiredFields.filter((field) =>
          isSectionGFieldVisible(q.question_code, values, field.key) &&
          (q.question_code === 'C_PRODUCTS' && field.key === 'product_name'
            ? isProductNameComplete(values[field.key])
            : !isEmptyAnswer(values[field.key]))).length;
      }, 0);
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
      const formatError = validationError(q);
      if (formatError) {
        errs[q.question_id] = formatError;
      } else if (questionIsIncomplete(q)) {
        errs[q.question_id] = 'Complete the required fields.';
      }
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const saveAsDraft = async () => {
    if (savingRef.current) return;
    savingRef.current = true;
    setSaving(true);
    try {
      await save('draft', true);
    } catch {
      // The save error is shown on the survey page.
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const saveAndLeave = async () => {
    if (savingRef.current || blocker.state !== 'blocked') return;
    savingRef.current = true;
    exclusiveSaveRef.current = true;
    setSaving(true);
    try {
      do {
        await save('draft');
      } while (saverRef.current.dirty);
      blocker.proceed();
    } catch {
      // Keep the dialog open so the user can retry or stay.
    } finally {
      savingRef.current = false;
      exclusiveSaveRef.current = false;
      setSaving(false);
    }
  };

  const scrollTop = () => scrollSurveyToTop(topRef.current);
  const setCurrentSection = (index: number) => {
    const nextParams = new URLSearchParams(searchParams);
    nextParams.set('section', form.sections[index].section_code);
    setSearchParams(nextParams);
  };

  const goNext = () => {
    if (!validateSection()) { scrollTop(); return; }
    setCurrentSection(Math.min(currentSection + 1, form.sections.length - 1));
    setErrors({});
  };

  const goPrev = () => {
    setCurrentSection(Math.max(0, currentSection - 1));
    setErrors({});
  };

  const jumpTo = (i: number) => {
    setCurrentSection(i);
    setErrors({});
  };

  const submitSurvey = async () => {
    if (savingRef.current) return;
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
          .map((q) => [
            q.question_id,
            validationError(q) ?? 'Complete the required fields.',
          ]),
      ));
      return;
    }
    savingRef.current = true;
    exclusiveSaveRef.current = true;
    setSaving(true);
    try {
      await save('pending_sync', true);
      if (saverRef.current.dirty) {
        await save('draft');
        setSaveError('The survey changed while submitting. Review the latest answers and submit again.');
        return;
      }
      navigate('/surveys');
    } catch {
      // The save error is shown on the survey page.
    } finally {
      savingRef.current = false;
      exclusiveSaveRef.current = false;
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
              Survey Questionnaire
            </div>
          </div>

          <button className="btn btn-ghost btn-sm" onClick={saveAsDraft} disabled={saving}
            style={{ color: savedAt && !dirty ? 'var(--success)' : undefined, flexShrink: 0 }}>
            {saving ? '…' : '💾 Save'}
          </button>

        </div>

        <div role="status" aria-live="polite" style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 8 }}>
          {savedAt
            ? `Saved ${savedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false })}${dirty ? ' · Unsaved changes' : ''}`
            : dirty ? 'Unsaved changes' : 'No changes to save'}
        </div>
        {saveError && <div className="alert alert-error" role="alert" style={{ marginBottom: 8 }}>{saveError}</div>}

        {/* Partner branding row: government and NESPAK logos centered beneath the title. */}
        {/* <div aria-label="Punjab Industries and NESPAK" style={{
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
        </div> */}

        {/* Progress bar */}
        <div style={{ marginBottom: 8 }}>

          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            
            <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--secondary)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Required field completion
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
        <SectionStrip sections={form.sections} current={currentSection}
          statusForSection={(candidate) => surveySectionStatus(candidate, allQs, answers, questionIsIncomplete)}
          onClick={jumpTo} />

        {/* Active section label */}
        <div style={{ padding: '0 4px 10px', display: 'flex', alignItems: 'center', gap: 8 }}>

          <span style={{
            background: 'var(--primary)', color: '#fff', marginTop: 4,
            borderRadius: 6, padding: '2px 8px', fontSize: 10, fontWeight: 800, letterSpacing: '0.06em',
          }}>
            {currentSection + 1}/{form.sections.length}
          </span>

          <span style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', marginTop: 4 }}>
            {section.title} Section
          </span>
          
        </div>

        {/* <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 800 }}>
          {section.title}
        </div> */}
      </div>

      {/* Question list container: validation summary, visible-question count, empty state, and question cards. */}
      <div style={{ padding: '10px 14px' }}>

        {/* Section validation banner */}
        {Object.keys(errors).length > 0 && (
          <div className="alert alert-error" style={{ marginBottom: 12 }}>
            ⚠ {Object.keys(errors).length} field{Object.keys(errors).length > 1 ? 's need' : ' needs'} attention.
          </div>
        )}
        
        {/* Question count */}
        <div style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 10, fontWeight: 600 }}>
          Total {section.questions.filter(showQuestion).length} question{section.questions.filter(showQuestion).length !== 1 ? 's' : ''} in this section
        </div>

        {section.questions.filter(showQuestion).length === 0 ? (
          <div className="empty-state">
            <div className="icon">✓</div>
            <h3>No questions here</h3>
            <p>This section has no questions in the current form version.</p>
          </div>
        ) : (
          section.questions.filter(showQuestion).map((q) => {
            const liveValidationError = validationError(q);
            const showLiveError = !q.fields?.length ||
              q.question_code === 'D_EMPLOYMENT' || q.question_code === 'D_SKILLS';
            const questionError = errors[q.question_id] ??
              (showLiveError ? liveValidationError : null);
            return (
            <div key={q.question_id} className={`question-card${questionError ? ' error' : ''}`}>
              
              
              {/* One card per visible question; the error class highlights failed validation. */}
              {/* Only required questions need a badge above the prompt. */}
              {q.is_required && (
                <div className="question-meta">
                  <span className="question-mandatory">★ Required</span>
                </div>
              )}

              {/* Prompt shown above the answer control. */}
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10, lineHeight: 1.5 }}>
                {q.question_text}
              </div>

              {/* Answer control selected by QuestionField for this question's type and special rules. */}
              <QuestionField
                q={q}
                value={answers[q.question_id]}
                onChange={(v) => setAnswer(q.question_id, v)}
                error={questionError ?? undefined}
                references={form?.references ?? {}}
                energyGenerationRows={(() => {
                  const generationQuestion = allQs.find((candidate) =>
                    candidate.question_code === 'H_ENERGY_GENERATION',
                  );
                  const rows = generationQuestion ? answers[generationQuestion.question_id] : [];
                  return Array.isArray(rows) ? rows : [];
                })()}
                responseId={responseId}
                industryTypeId={selectedOptionId(answerForCode('A_UNIT_TYPE'))}
                ownerId={user!.user_id}
                unitName={String(answerForCode('A_ESTABLISHMENT_NAME')?.name ?? answerForCode('A_ESTABLISHMENT_NAME') ?? 'Industrial unit')}
              />

              {questionError && (
                <div className="form-error" style={{ marginTop: 6 }}>
                  ⚠ {questionError}
                </div>
              )}
            </div>
            );
          })
        )}
      </div>

      {/* Incomplete warning on last section */}
      {isLastSection && otherSectionErrors > 0 && (
        <div className="alert alert-warning" style={{ margin: '0 14px 12px' }}>
          ⚠ {otherSectionErrors} field{otherSectionErrors > 1 ? 's' : ''} in earlier sections {otherSectionErrors > 1 ? 'need' : 'needs'} attention before submitting.
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

      {/* Sticky footer: previous/next section controls or final submit action. */}
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
      {blocker.state === 'blocked' && (
        <div className="modal-overlay">
          <div className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-survey-title">
            <div className="modal-header"><h3 id="leave-survey-title">Leave survey?</h3></div>
            <div className="modal-body">
              <p>Save your changes as a draft before leaving.</p>
              {saveError && <div className="alert alert-error" role="alert">{saveError}</div>}
            </div>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => blocker.reset()} disabled={saving} autoFocus>Stay</button>
              <button className="btn btn-primary" onClick={saveAndLeave} disabled={saving}>
                {saving ? 'Saving…' : 'Save draft & leave'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
