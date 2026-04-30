import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import { loginWithBackend } from '@/features/auth/auth-api';

type Session = {
  accessToken?: string;
  email: string;
  isFirstLogin?: boolean;
  mode: 'backend' | 'local';
  territory?: string;
};

type Credentials = {
  email: string;
  password: string;
};

type Registration = Credentials & {
  firstName: string;
  lastName: string;
  territory: string;
};

type AuthContextValue = {
  session: Session | null;
  login: (credentials: Credentials) => Promise<void>;
  register: (details: Registration) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);

  const login = useCallback(async ({ email, password }: Credentials) => {
    const result = await loginWithBackend(email, password);

    setSession({
      accessToken: result.access_token,
      email: email.trim().toLowerCase(),
      isFirstLogin: result.isFirstLogin,
      mode: 'backend',
    });
  }, []);

  const register = useCallback(async ({ email, firstName, territory }: Registration) => {
    await wait(450);
    setSession({
      email: email.trim().toLowerCase(),
      mode: 'local',
      territory: territory.trim(),
    });
  }, []);

  const logout = useCallback(() => {
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      session,
      login,
      register,
      logout,
    }),
    [login, logout, register, session]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}
