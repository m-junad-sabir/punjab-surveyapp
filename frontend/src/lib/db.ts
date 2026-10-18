/**
 * IndexedDB wrapper — idb library
 *
 * v6 — adds owner indexes without deleting offline responses.
 * v5 — aligns keyPaths with real API response shapes:
 *   survey_form      → keyPath: 'form_id'  (survey_forms.id aliased as form_id in API)
 *   offline_responses→ keyPath: 'response_id'
 *   sync_log         → autoIncrement
 *
 * Bump DB version any time a store schema changes.
 */
import { openDB, DBSchema, IDBPDatabase } from 'idb';
import type { SurveyForm, OfflineResponse } from '../types';

interface SurveyDB extends DBSchema {
  survey_form: {
    key: number;
    value: SurveyForm;        // keyed by SurveyForm.form_id
  };
  offline_responses: {
    key: string;
    value: OfflineResponse;   // keyed by OfflineResponse.response_id
    indexes: {
      'by-status': string;
      'by-owner': string;
      'by-owner-status': [string, string];
    };
  };
  sync_log: {
    key: number;
    value: {
      owner_id?: string;
      id?:     number;
      at:      string;
      sync_id: number;
      status:  string;
      results: any[];
    };
    indexes: { 'by-owner': string };
  };
  photos: {
    key: string;
    value: StoredPhoto;
    indexes: {
      'by-response': string;
      'by-owner': string;
    };
  };
}

export interface StoredPhoto {
  photo_id: string;
  response_id: string;
  owner_id: string;
  photo_type: string;
  blob: Blob;
  mime_type: 'image/jpeg';
  size_bytes: number;
  latitude: number;
  longitude: number;
  accuracy_m: number;
  captured_at: string;
  uploaded?: boolean;
}

let db: IDBPDatabase<SurveyDB> | null = null;

export async function getDB(): Promise<IDBPDatabase<SurveyDB>> {
  if (db) return db;

  db = await openDB<SurveyDB>('survey-pwa', 7, {
    upgrade(database, oldVersion, _newVersion, transaction) {
      // ── Fresh install ──────────────────────────────────────────────────────
      if (oldVersion < 1) {
        // survey_form keyed by form_id (number, matches API response)
        database.createObjectStore('survey_form', { keyPath: 'form_id' });

        const responseStore = database.createObjectStore('offline_responses', {
          keyPath: 'response_id',
        });
        responseStore.createIndex('by-status', 'sync_status');
        responseStore.createIndex('by-owner', 'surveyor_id');
        responseStore.createIndex('by-owner-status', ['surveyor_id', 'sync_status']);

        const syncLogStore = database.createObjectStore('sync_log', {
          keyPath:       'id',
          autoIncrement: true,
        });
        syncLogStore.createIndex('by-owner', 'owner_id');

        const photoStore = database.createObjectStore('photos', { keyPath: 'photo_id' });
        photoStore.createIndex('by-response', 'response_id');
        photoStore.createIndex('by-owner', 'owner_id');
      }

      // ── v2/v3/v4 legacy: wipe stale form cache ────────────────────────────
      if (oldVersion >= 1 && oldVersion < 5) {
        if (database.objectStoreNames.contains('survey_form')) {
          database.deleteObjectStore('survey_form');
        }
        // Re-create with correct keyPath (form_id)
        database.createObjectStore('survey_form', { keyPath: 'form_id' });
      }

      if (oldVersion >= 1 && oldVersion < 6) {
        const responseStore = transaction.objectStore('offline_responses');
        if (!responseStore.indexNames.contains('by-owner')) {
          responseStore.createIndex('by-owner', 'surveyor_id');
        }
        if (!responseStore.indexNames.contains('by-owner-status')) {
          responseStore.createIndex('by-owner-status', ['surveyor_id', 'sync_status']);
        }
        const syncLogStore = transaction.objectStore('sync_log');
        if (!syncLogStore.indexNames.contains('by-owner')) {
          syncLogStore.createIndex('by-owner', 'owner_id');
        }
      }

      if (oldVersion >= 1 && oldVersion < 7 && !database.objectStoreNames.contains('photos')) {
        const photoStore = database.createObjectStore('photos', { keyPath: 'photo_id' });
        photoStore.createIndex('by-response', 'response_id');
        photoStore.createIndex('by-owner', 'owner_id');
      }
    },
  });

  return db;
}

// ── Survey Form ───────────────────────────────────────────────
export async function saveSurveyForm(form: SurveyForm): Promise<void> {
  const database = await getDB();
  await database.put('survey_form', form);
}

export async function getSurveyForm(): Promise<SurveyForm | undefined> {
  const database = await getDB();
  const all = await database.getAll('survey_form');
  return all[0];
}

export async function clearSurveyForm(): Promise<void> {
  const database = await getDB();
  await database.clear('survey_form');
}

// ── Offline Responses ─────────────────────────────────────────
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

export async function getResponsesForOwner(ownerId: string): Promise<OfflineResponse[]> {
  const database = await getDB();
  return database.getAllFromIndex('offline_responses', 'by-owner', ownerId);
}

export async function getPendingResponsesForOwner(ownerId: string): Promise<OfflineResponse[]> {
  const database = await getDB();
  return database.getAllFromIndex('offline_responses', 'by-owner-status', [ownerId, 'pending_sync']);
}

export async function getUnassignedResponses(): Promise<OfflineResponse[]> {
  const all = await getAllResponses();
  return all.filter((response) => !response.surveyor_id);
}

export async function deleteResponse(id: string): Promise<void> {
  const database = await getDB();
  await database.delete('offline_responses', id);
}

export async function savePhoto(photo: StoredPhoto): Promise<void> {
  const database = await getDB();
  await database.put('photos', photo);
}

export async function getPhoto(photoId: string): Promise<StoredPhoto | undefined> {
  const database = await getDB();
  return database.get('photos', photoId);
}

export async function getPhotosForResponse(responseId: string): Promise<StoredPhoto[]> {
  const database = await getDB();
  return database.getAllFromIndex('photos', 'by-response', responseId);
}

export async function deletePhoto(photoId: string): Promise<void> {
  const database = await getDB();
  await database.delete('photos', photoId);
}

// ── Sync Log ──────────────────────────────────────────────────
export async function saveSyncLog(entry: {
  owner_id: string;
  at:      string;
  sync_id: number;
  status:  string;
  results: any[];
}): Promise<void> {
  const database = await getDB();
  await database.add('sync_log', entry as any);
}

export async function getSyncLogs(ownerId: string): Promise<
  { owner_id?: string; id?: number; at: string; sync_id: number; status: string; results: any[] }[]
> {
  const database = await getDB();
  const all = await database.getAllFromIndex('sync_log', 'by-owner', ownerId);
  return all.reverse(); // newest first
}
