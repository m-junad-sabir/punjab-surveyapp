/**
 * IndexedDB wrapper using `idb` library
 * Stores: survey form, offline responses, sync log
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { SurveyForm, OfflineResponse } from '../types';

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
  sync_log: {
    key: number;
    value: { id?: number; at: string; sync_id: number; status: string; results: any[] };
  };
}

let db: IDBPDatabase<SurveyDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SurveyDB>> {
  if (db) return db;
  db = await openDB<SurveyDB>('survey-pwa', 2, {
    upgrade(database, oldVersion) {
      if (oldVersion < 1) {
        database.createObjectStore('survey_form', { keyPath: 'form_id' });

        const responseStore = database.createObjectStore('offline_responses', {
          keyPath: 'response_id',
        });
        responseStore.createIndex('by-status', 'sync_status');

        database.createObjectStore('sync_log', {
          keyPath: 'id',
          autoIncrement: true,
        });
      }
    },
  });
  return db;
}

// ── Form ────────────────────────────────────────────────────
export async function saveSurveyForm(form: SurveyForm): Promise<void> {
  const database = await getDB();
  await database.put('survey_form', form);
}

export async function getSurveyForm(): Promise<SurveyForm | undefined> {
  const database = await getDB();
  const all = await database.getAll('survey_form');
  return all.find((f) => f.form_id);
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
export async function saveSyncLog(entry: { at: string; sync_id: number; status: string; results: any[] }): Promise<void> {
  const database = await getDB();
  await database.add('sync_log', entry as any);
}

export async function getSyncLogs(): Promise<{ id?: number; at: string; sync_id: number; status: string; results: any[] }[]> {
  const database = await getDB();
  const all = await database.getAll('sync_log');
  return all.reverse(); // newest first
}
