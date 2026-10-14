// ============================================================
// Shared TypeScript types — aligned with real backend schema
// ============================================================

// ── Auth ─────────────────────────────────────────────────────
export interface User {
  user_id:   string;   // maps to users.id
  username:  string;
  full_name: string;
  role_name: string;
  permissions: string[];
}

export interface AuthState {
  user:            User | null;
  token:           string | null;
  isAuthenticated: boolean;
}

// ── Permission codes (real DB values from permissions.code) ──
export const PERM = {
  // User management
  USER_CREATE:             'USER_CREATE',
  USER_REMOVE:             'USER_REMOVE',
  USER_ASSIGN_DESIGNATION: 'USER_ASSIGN_DESIGNATION',
  // Survey
  SURVEY_CREATE:  'SURVEY_CREATE',
  SURVEY_SUBMIT:  'SURVEY_SUBMIT',
  SURVEY_CONFIRM: 'SURVEY_CONFIRM',   // supervisor approve/reject
  SURVEY_VIEW_ALL:'SURVEY_VIEW_ALL',
  SYNC_DATA:      'SYNC_DATA',
  // Admin
  ROLE_MANAGE:    'ROLE_MANAGE',
  REFERENCE_MANAGE:'REFERENCE_MANAGE',
  DASHBOARD_VIEW: 'DASHBOARD_VIEW',
  AUDIT_VIEW:     'AUDIT_VIEW',
} as const;

// ── Survey Form — matches GET /survey-forms/active response ──

/**
 * Option returned for SELECT / MULTI_CHOICE / MATRIX questions.
 * Backed by lookup_values table.
 */
export interface QuestionOption {
  id:            number;   // lookup_values.id
  code:          string;
  label:         string;
  requires_text: boolean;  // true = show free-text box when selected
  parent_id?:    number | null;
}

/**
 * answer_type values returned by the backend (survey_questions.answer_type).
 * TEXT / NUMBER / DATE  — plain input fields
 * CHOICE               — single-select (radio / dropdown)
 * MULTI_CHOICE         — multi-select (checkboxes)
 * SHARE_PERCENT        — percentage breakdown across a list of options
 * MATRIX               — grid of rows × columns (e.g. Yes / No / Planned)
 * GPS                  — GPS coordinate capture
 * PHOTO                — camera / file upload
 */
export type AnswerType =
  | 'TEXT'
  | 'NUMBER'
  | 'DATE'
  | 'CHOICE'
  | 'SINGLE_CHOICE'
  | 'YES_NO'
  | 'MULTI_CHOICE'
  | 'SHARE_PERCENT'
  | 'MATRIX'
  | 'REPEATING_GROUP'
  | 'GPS'
  | 'PHOTO';

export interface SurveyInputField {
  key:          string;
  label:        string;
  type:         'TEXT' | 'NUMBER' | 'YES_NO' | 'SINGLE_CHOICE' | 'MULTI_CHOICE' | 'SHARE_PERCENT' | 'GPS' | 'MONTHS';
  lookup_type?: string;
  reference?:   string;
  required?:    boolean;
  options:      QuestionOption[];
}

export interface SurveyMatrixItem {
  id:          number;
  code:        string;
  label:       string;
  group_label: string | null;
  answer_type: 'CHOICE' | 'RATING_1_5';
  allows_text: boolean;
  options:     QuestionOption[];
}

export interface SurveyQuestion {
  question_id:   number;   // survey_questions.id
  question_code: string;
  question_no:   string | null;
  question_text: string;
  answer_type:   AnswerType;
  is_required:   boolean;
  stored_in:     string | null;
  options:       QuestionOption[];
  fields?:       SurveyInputField[];
  repeatable?:   boolean;
  matrix_items?: SurveyMatrixItem[];
}

export interface SurveySection {
  section_id:   number;   // survey_sections.id
  section_code: string;   // 'A' | 'B' | … | 'K'
  title:        string;
  sort_order:   number;
  questions:    SurveyQuestion[];
}

export interface SurveyForm {
  form_id:  number;   // survey_forms.id
  code:     string;
  title:    string;
  version:  number;   // integer in real DB
  sections: SurveySection[];
  references?: Record<string, QuestionOption[]>;
}

// ── Offline storage ──────────────────────────────────────────

/**
 * A single question answer stored locally.
 * answer_value shape depends on answer_type:
 *   TEXT        → string
 *   NUMBER      → number
 *   DATE        → 'YYYY-MM-DD' string
 *   CHOICE      → option_id (number)
 *   MULTI_CHOICE→ option_id[] (number[])
 *   SHARE_PERCENT → { [option_id]: percent_value }
 *   MATRIX      → { [item_id]: option_id | rating }
 *   GPS         → { lat, lng, accuracy }
 *   PHOTO       → { file_name, preview, type }
 */
export interface AnswerValue {
  question_id:  number;
  answer_value: any;
}

/**
 * A complete survey response saved locally in IndexedDB.
 * Synced to POST /sync when online.
 */
export interface OfflineResponse {
  response_id:    string;   // client-generated UUID — IDB primary key
  form_id:        number;
  surveyor_id:    string;
  device_id:      string;
  gps_lat?:       number;
  gps_lng?:       number;
  gps_accuracy_m?:number;
  started_at:     string;   // ISO datetime
  submitted_at?:  string;
  answers:        AnswerValue[];
  sync_status:    'draft' | 'pending_sync' | 'synced' | 'failed';
  created_at:     string;
}

// ── Industrial Unit (matches industrial_units table) ─────────
export interface IndustrialUnit {
  id:              string;   // uuid PK
  unit_code:       string | null;
  name:            string;
  approval_status: 'PENDING' | 'CONFIRMED' | 'RETURNED' | 'REJECTED';
  gps_accuracy_m:  number | null;
  province_id:     number;
  district_id:     number;
  created_at:      string;
  updated_at:      string;
}

// ── Sync ─────────────────────────────────────────────────────
export interface SyncItemResult {
  response_id:  string;
  status:       'synced' | 'duplicate_flagged' | 'already_synced' | 'failed';
  is_duplicate: boolean;
  message:      string;
}

export interface SyncResponse {
  sync_id: number;
  status:  'success' | 'partial' | 'failed';
  results: SyncItemResult[];
}
