import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '../lib/api';
import { getSurveyForm, saveSurveyForm, getAllSubmissions, getPendingSubmissions } from '../lib/db';
import type { SurveyForm, SurveySubmissionDraft } from '../types';
import { useAuth } from './AuthContext';

// The version the backend is serving — bump this whenever seed.sql is re-run
// with a new form version so stale caches are detected immediately.
const CURRENT_FORM_VERSION = '2.0';

interface SurveyContextValue {
  form: SurveyForm | null;
  formLoading: boolean;
  fetchForm: () => Promise<void>;
  responses: SurveySubmissionDraft[];
  pendingCount: number;
  refreshResponses: () => Promise<void>;
  isOnline: boolean;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [responses, setResponses] = useState<SurveySubmissionDraft[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online',  onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  const fetchForm = useCallback(async () => {
    setFormLoading(true);
    try {
      const data = await api.form.getActive();
      await saveSurveyForm(data);
      setForm(data);
    } finally {
      setFormLoading(false);
    }
  }, []);

  // On mount: load cached form, then immediately re-fetch from server if
  // online so any questionnaire update is picked up without user action.
  useEffect(() => {
    getSurveyForm().then((cached) => {
      if (cached) setForm(cached);

      // Always re-fetch when online so stale caches are replaced silently.
      // If cached version doesn't match the expected version, force-fetch.
      const isStale = !cached || cached.version !== CURRENT_FORM_VERSION;
      if (isAuthenticated && (navigator.onLine || isStale)) {
        fetchForm().catch(() => {
          // Offline and no cache — form stays null, Dashboard shows warning.
        });
      }
    });
  }, [fetchForm, isAuthenticated]);

  const refreshResponses = useCallback(async () => {
    const all = await getAllSubmissions();
    const pending = await getPendingSubmissions();
    setResponses(all.sort((a, b) => (b.created_at > a.created_at ? 1 : -1)));
    setPendingCount(pending.length);
  }, []);

  useEffect(() => { refreshResponses(); }, [refreshResponses]);

  return (
    <SurveyContext.Provider
      value={{ form, formLoading, fetchForm, responses, pendingCount, refreshResponses, isOnline }}
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
