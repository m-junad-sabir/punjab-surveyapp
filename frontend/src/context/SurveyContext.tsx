import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { api } from '../lib/api';
import { getSurveyForm, saveSurveyForm, getAllResponses, getPendingResponses } from '../lib/db';
import type { SurveyForm, OfflineResponse } from '../types';

interface SurveyContextValue {
  form: SurveyForm | null;
  formLoading: boolean;
  fetchForm: () => Promise<void>;
  responses: OfflineResponse[];
  pendingCount: number;
  refreshResponses: () => Promise<void>;
  isOnline: boolean;
}

const SurveyContext = createContext<SurveyContextValue | null>(null);

export function SurveyProvider({ children }: { children: ReactNode }) {
  const [form, setForm] = useState<SurveyForm | null>(null);
  const [formLoading, setFormLoading] = useState(false);
  const [responses, setResponses] = useState<OfflineResponse[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online',  onOnline);
    window.addEventListener('offline', onOffline);
    return () => { window.removeEventListener('online', onOnline); window.removeEventListener('offline', onOffline); };
  }, []);

  // Load cached form on mount
  useEffect(() => {
    getSurveyForm().then((f) => { if (f) setForm(f); });
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

  const refreshResponses = useCallback(async () => {
    const all = await getAllResponses();
    const pending = await getPendingResponses();
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
