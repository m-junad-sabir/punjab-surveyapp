import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '../lib/api';
import { getSurveyForm, saveSurveyForm, getResponsesForOwner, getPendingResponsesForOwner } from '../lib/db';
import type { SurveyForm, OfflineResponse } from '../types';
import { useAuth } from './AuthContext';

/**
 * Expected form version from the backend.
 * The API returns version as an integer (survey_forms.version).
 * Bump this constant whenever questionnaire or reference data changes so
 * browsers discard stale cached forms and re-fetch.
 */
const MINIMUM_FORM_VERSION = 2;
const CURRENT_FORM_CACHE_REVISION = 9;

interface SurveyContextValue {
  form:             SurveyForm | null;
  formLoading:      boolean;
  formError:        string | null;
  fetchForm:        () => Promise<void>;
  responses:        OfflineResponse[];
  pendingCount:     number;
  refreshResponses: () => Promise<void>;
  isOnline:         boolean;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const [form,         setForm]         = useState<SurveyForm | null>(null);
  const [formLoading,  setFormLoading]  = useState(false);
  const [formError,    setFormError]    = useState<string | null>(null);
  const [responses,    setResponses]    = useState<OfflineResponse[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline,     setIsOnline]     = useState(navigator.onLine);

  // ── Online/offline tracking ──────────────────────────────────────────────
  useEffect(() => {
    const up   = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener('online',  up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online',  up);
      window.removeEventListener('offline', down);
    };
  }, []);

  // ── Fetch form from server ───────────────────────────────────────────────
  const fetchForm = useCallback(async () => {
    setFormLoading(true);
    setFormError(null);
    try {
      const data = await api.form.getActive();
      if (data.version < MINIMUM_FORM_VERSION) {
        throw new Error(
          `The server survey form is version ${data.version}; run database/migrate_full_questionnaire.sql to load the complete questionnaire.`,
        );
      }
      const currentForm = {
        ...data,
        client_cache_revision: CURRENT_FORM_CACHE_REVISION,
      };
      await saveSurveyForm(currentForm);
      setForm(currentForm);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to download the survey form.';
      setFormError(message);
    } finally {
      setFormLoading(false);
    }
  }, []);

  // ── On mount: load cache, then silently refresh if online or stale ───────
  useEffect(() => {
    getSurveyForm().then((cached) => {
      if (
        cached &&
        cached.version >= MINIMUM_FORM_VERSION &&
        cached.client_cache_revision === CURRENT_FORM_CACHE_REVISION
      ) {
        setForm(cached);
      } else if (cached) {
        setForm(null);
      }

      const isStale = !cached ||
        cached.version < MINIMUM_FORM_VERSION ||
        cached.client_cache_revision !== CURRENT_FORM_CACHE_REVISION;

      if (isAuthenticated && (navigator.onLine || isStale)) {
        fetchForm().catch(() => {
          // Offline and no/stale cache — form stays null; Dashboard shows warning
        });
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // ── Response list ────────────────────────────────────────────────────────
  const refreshResponses = useCallback(async () => {
    if (!user?.user_id) {
      setResponses([]);
      setPendingCount(0);
      return;
    }
    const all     = await getResponsesForOwner(user.user_id);
    const pending = await getPendingResponsesForOwner(user.user_id);
    setResponses(all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)));
    setPendingCount(pending.length);
  }, [user?.user_id]);

  useEffect(() => { refreshResponses(); }, [refreshResponses]);

  return (
    <SurveyContext.Provider
      value={{ form, formLoading, formError, fetchForm, responses, pendingCount, refreshResponses, isOnline }}
    >
      {children}
    </SurveyContext.Provider>
  );
}

export function useSurvey() {
  const ctx = useContext(SurveyContext);
  if (!ctx) throw new Error('useSurvey must be inside SurveyProvider');
  return ctx;
}
