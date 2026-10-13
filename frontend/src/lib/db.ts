/**
 * IndexedDB wrapper using `idb` library
 * Stores: survey form, offline responses, sync log
 *
 * v3 — wipes survey_form store to force re-download of updated questionnaire
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { SurveyForm, OfflineResponse, SurveySubmissionDraft } from '../types';

interface SurveyDB extends DBSchema {
  survey_form: {
    key: number;
    value: SurveyForm;
  };
  offline_responses: {
    key: string;
    value: OfflineResponse;
    indexes: { 'by-status': string };
  };
  offline_submissions: {
    key: string;
    value: SurveySubmissionDraft;
    indexes: { 'by-status': string };
  };
  sync_log: {
    key: number;
    value: { id?: number; at: string; sync_id: number; status: string; results: any[] };
  };
}

let db: IDBPDatabase<SurveyDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SurveyDB>> {
  if (db) return db;
  db = await openDB<SurveyDB>('survey-pwa', 4, {
    upgrade(database, oldVersion) {
      // v1 → create all stores fresh
      if (oldVersion < 1) {
        database.createObjectStore('survey_form', { keyPath: 'form_id' });
        const responseStore = database.createObjectStore('offline_responses', {
          keyPath: 'response_id',
        });
        responseStore.createIndex('by-status', 'sync_status');
        const submissionStore = database.createObjectStore('offline_submissions', { keyPath: 'survey_id' });
        submissionStore.createIndex('by-status', 'sync_status');
        database.createObjectStore('sync_log', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
      // v3 → clear the cached form so the new 296-question questionnaire is downloaded
      if (oldVersion < 3 && oldVersion >= 1) {
        // survey_form store already exists — just clear its contents
        // (we can't use async clear() here, so we delete and recreate)
        database.deleteObjectStore('survey_form');
        database.createObjectStore('survey_form', { keyPath: 'form_id' });
      }
      if (oldVersion < 4) {
        if (!database.objectStoreNames.contains('offline_submissions')) {
          const submissionStore = database.createObjectStore('offline_submissions', { keyPath: 'survey_id' });
          submissionStore.createIndex('by-status', 'sync_status');
        }
      }
    },
  });
  return db;
}

export async function saveSubmission(submission: SurveySubmissionDraft): Promise<void> {
  const database = await getDB();
  await database.put('offline_submissions', submission);
}

export async function getSubmission(id: string): Promise<SurveySubmissionDraft | undefined> {
  const database = await getDB();
  return database.get('offline_submissions', id);
}

export async function getAllSubmissions(): Promise<SurveySubmissionDraft[]> {
  const database = await getDB();
  return database.getAll('offline_submissions');
}

export async function getPendingSubmissions(): Promise<SurveySubmissionDraft[]> {
  const database = await getDB();
  const submissions = await database.getAll('offline_submissions');
  return submissions.filter((submission) => submission.sync_status === 'pending_sync' || submission.sync_status === 'failed');
}

export async function deleteSubmission(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('offline_submissions', id);
}

// ── Form ─────────────────────────────────────────────────────
export async function saveSurveyForm(form: SurveyForm): Promise<void> {
  const database = await getDB();
  await database.put('survey_form', form);
}

export async function getSurveyForm(): Promise<SurveyForm | undefined> {
  const database = await getDB();
  const all = await database.getAll('survey_form');
  return all.find((f) => f.form_id);
}

export async function clearSurveyForm(): Promise<void> {
  const database = await getDB();
  await database.clear('survey_form');
}

// ── Responses ────────────────────────────────────────────────
export async function saveResponse(response: OfflineResponse): Promise<void> {
  const database = await getDB();
  await database.put('offline_responses', response);
}

export async function getResponse(id: string): Promise<OfflineResponse | undefined> {
  const database = await getDB();
  return database.get('offline_responses', id);
}

export async function getAllResponses(): Promise<OfflineResponse[]> {
  const database = await getDB();
  return database.getAll('offline_responses');
}

export async function getPendingResponses(): Promise<OfflineResponse[]> {
  const database = await getDB();
  return database.getAllFromIndex('offline_responses', 'by-status', 'pending_sync');
}

export async function deleteResponse(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('offline_responses', id);
}

// ── Sync log ─────────────────────────────────────────────────
export async function saveSyncLog(entry: {
  at: string;
  sync_id: number;
  status: string;
  results: any[];
}): Promise<void> {
  const database = await getDB();
  await database.add('sync_log', entry as any);
}

export async function getSyncLogs(): Promise<
  { id?: number; at: string; sync_id: number; status: string; results: any[] }[]
> {
  const database = await getDB();
  const all = await database.getAll('sync_log');
  return all.reverse();
}
