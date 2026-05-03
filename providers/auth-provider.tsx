import { createContext, useCallback, useContext, useMemo, useState, type PropsWithChildren } from 'react';

import {
  type AuthResult,
  type LoginResponse,
  loginWithBackend,
  registerWithBackend,
  setFirstPassword,
  signInWithGoogleWithBackend,
  verifyOtp,
} from '@/features/auth/auth-api';

type Session = {
  accessToken: string;
  refreshToken: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  name?: string;
  profileImageUrl?: string | null;
  referralCode?: string | null;
  roles?: string[];
  mode: 'backend';
};

type Credentials = {
  email: string;
  password: string;
};

type Registration = {
  firstName: string;
  lastName: string;
  email: string;
  phoneCountryCode: string;
  phoneNumber: string;
  countryOfResidence: string;
  referralCode?: string;
};

type PendingChallenge = {
  email: string;
  token: string;
  type: 'first_login' | 'otp';
};

type AuthContextValue = {
  login: (credentials: Credentials) => Promise<LoginResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: () => void;
  pendingChallenge: PendingChallenge | null;
  register: (details: Registration) => Promise<{ message: string }>;
  session: Session | null;
  submitFirstPassword: (newPassword: string) => Promise<void>;
  submitOtp: (otp: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);

  const applyAuthResult = useCallback((result: AuthResult) => {
    const displayName = [result.user.firstName, result.user.lastName].filter(Boolean).join(' ').trim();

    setSession({
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      email: result.user.email.trim().toLowerCase(),
      firstName: result.user.firstName ?? null,
      lastName: result.user.lastName ?? null,
      name: displayName || result.user.email.trim().toLowerCase(),
      profileImageUrl: result.user.profileImageUrl ?? null,
      referralCode: result.user.referralCode ?? null,
      roles: result.user.roles ?? [],
      mode: 'backend',
    });
    setPendingChallenge(null);
  }, []);

  const login = useCallback(async ({ email, password }: Credentials) => {
    const result = await loginWithBackend(email, password);

    if ('requiresPasswordChange' in result) {
      setPendingChallenge({
        email: email.trim().toLowerCase(),
        token: result.token,
        type: 'first_login',
      });
    } else {
      setPendingChallenge({
        email: email.trim().toLowerCase(),
        token: result.token,
        type: 'otp',
      });
    }

    return result;
  }, []);

  const register = useCallback(async (details: Registration) => {
    return registerWithBackend(details);
  }, []);

  const submitFirstPassword = useCallback(
    async (newPassword: string) => {
      if (!pendingChallenge || pendingChallenge.type !== 'first_login') {
        throw new Error('No first-login password challenge is active.');
      }

      const result = await setFirstPassword(pendingChallenge.token, newPassword);
      applyAuthResult(result);
    },
    [applyAuthResult, pendingChallenge]
  );

  const submitOtp = useCallback(
    async (otp: string) => {
      if (!pendingChallenge || pendingChallenge.type !== 'otp') {
        throw new Error('No OTP challenge is active.');
      }

      const result = await verifyOtp(pendingChallenge.token, otp);
      applyAuthResult(result);
    },
    [applyAuthResult, pendingChallenge]
  );

  const loginWithGoogle = useCallback(async () => {
    const result = await signInWithGoogleWithBackend();
    applyAuthResult(result);
  }, [applyAuthResult]);

  const logout = useCallback(() => {
    setSession(null);
    setPendingChallenge(null);
  }, []);

  const value = useMemo(
    () => ({
      login,
      loginWithGoogle,
      logout,
      pendingChallenge,
      register,
      session,
      submitFirstPassword,
      submitOtp,
    }),
    [login, loginWithGoogle, logout, pendingChallenge, register, session, submitFirstPassword, submitOtp]
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
