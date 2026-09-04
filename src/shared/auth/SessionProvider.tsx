import type { Session } from '@supabase/supabase-js';
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import { supabase } from '../api/supabase';

type SessionContextValue = {
  session: Session | null;
  isLoading: boolean;
};

const SessionContext = createContext<SessionContextValue | undefined>(undefined);

export function SessionProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChange fires an INITIAL_SESSION event immediately on subscription with the
    // same data supabase.auth.getSession() would resolve to, so a separate getSession() call
    // is redundant and can race it (e.g. resolve after a SIGNED_OUT event and restore a stale
    // session).
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setIsLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const value = useMemo(() => ({ session, isLoading }), [session, isLoading]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionContextValue {
  const context = useContext(SessionContext);
  if (!context) {
    throw new Error('useSession must be used within a SessionProvider');
  }
  return context;
}
