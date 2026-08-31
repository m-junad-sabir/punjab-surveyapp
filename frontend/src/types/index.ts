// ============================================================
// Shared TypeScript types matching the backend data model
// ============================================================

export interface User {
  user_id: string;
  username: string;
  full_name: string;
  role_name: string;
  permissions: string[];
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
}

// Survey Form types
export interface SurveyQuestion {
  question_id: number;
  question_code: string;
  question_text: string;
  question_type: 'text' | 'number' | 'date' | 'select' | 'multiselect' | 'boolean' | 'gps' | 'photo';
  is_mandatory: boolean;
  validation_rule: Record<string, any> | null;
  options: string[] | null;
  sort_order: number;
}

export interface SurveySection {
  section_id: number;
  title: string;
  sort_order: number;
  questions: SurveyQuestion[];
}

export interface LogicRule {
  logic_id: number;
  question_id: number;
  condition_question_id: number;
  condition_operator: '=' | '!=' | '>' | '<' | '>=' | '<=' | 'in';
  condition_value: string;
  action: 'show' | 'hide' | 'skip_to';
}

export interface SurveyForm {
  form_id: number;
  title: string;
  version: string;
  description: string;
  sections: SurveySection[];
  logic: LogicRule[];
}

// Response types
export interface AnswerValue {
  question_id: number;
  answer_value: any;
}

export interface OfflineResponse {
  response_id: string;
  form_id: number;
  surveyor_id: string;
  device_id: string;
  gps_lat?: number;
  gps_lng?: number;
  gps_accuracy_m?: number;
  started_at: string;
  submitted_at?: string;
  answers: AnswerValue[];
  sync_status: 'draft' | 'pending_sync' | 'synced' | 'failed';
  created_at: string;
}

// Industrial Unit
export interface IndustrialUnit {
  unit_id: string;
  unit_code: string;
  unit_name: string;
  ownership_type: string;
  operational_status: string;
  is_verified: boolean;
  gps_accuracy_m: number;
  district_id?: number;
  province_id?: number;
  created_at: string;
  updated_at: string;
}

// Sync
export interface SyncResult {
  response_id: string;
  status: 'synced' | 'duplicate_flagged' | 'failed';
  is_duplicate: boolean;
  message: string;
}

export interface SyncResponse {
  sync_id: number;
  status: 'success' | 'partial' | 'failed';
  results: SyncResult[];
}
