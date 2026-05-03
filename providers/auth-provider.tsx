import { router } from 'expo-router';
import {
  ActivityIndicator,
  Animated,
  Easing,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type PropsWithChildren } from 'react';

import { palette, radius, spacing, typography } from '@/constants/app-theme';
import { setUnauthorizedListener } from '@/features/api/auth-session';
import {
  type AuthResult,
  type LoginResponse,
  loginWithBackend,
  registerWithBackend,
  resendOtp,
  setFirstPassword,
  signInWithGoogleWithBackend,
  verifyOtp,
} from '@/features/auth/auth-api';
import { useToast } from '@/providers/toast-provider';

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

type LogoutOptions = {
  animated?: boolean;
  reason?: string;
  redirectToLogin?: boolean;
};

type AuthContextValue = {
  login: (credentials: Credentials) => Promise<LoginResponse>;
  loginWithGoogle: () => Promise<void>;
  logout: (options?: LogoutOptions) => void;
  pendingChallenge: PendingChallenge | null;
  register: (details: Registration) => Promise<{ message: string }>;
  resendOtpChallenge: () => Promise<void>;
  session: Session | null;
  submitFirstPassword: (newPassword: string) => Promise<void>;
  submitOtp: (otp: string) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const { showToast } = useToast();
  const [session, setSession] = useState<Session | null>(null);
  const [pendingChallenge, setPendingChallenge] = useState<PendingChallenge | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState('Signing you out...');
  const signOutOpacity = useRef(new Animated.Value(0)).current;
  const signOutScale = useRef(new Animated.Value(0.94)).current;
  const signOutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  const resendOtpChallenge = useCallback(async () => {
    if (!pendingChallenge || pendingChallenge.type !== 'otp') {
      throw new Error('No OTP challenge is active.');
    }

    const result = await resendOtp(pendingChallenge.token);

    setPendingChallenge((current) =>
      current && current.type === 'otp'
        ? {
            ...current,
            token: result.token,
          }
        : current
    );
  }, [pendingChallenge]);

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

  const completeLogout = useCallback((redirectToLogin = false) => {
    if (signOutTimerRef.current) {
      clearTimeout(signOutTimerRef.current);
      signOutTimerRef.current = null;
    }

    setSession(null);
    setPendingChallenge(null);
    setSigningOut(false);
    signOutOpacity.setValue(0);
    signOutScale.setValue(0.94);

    if (redirectToLogin) {
      router.replace('/login');
    }
  }, [signOutOpacity, signOutScale]);

  const logout = useCallback(
    (options?: LogoutOptions) => {
      const animated = options?.animated ?? false;
      const reason = options?.reason;
      const redirectToLogin = options?.redirectToLogin ?? false;

      if (reason) {
        showToast(reason, 'error');
      }

      if (!animated) {
        completeLogout(redirectToLogin);
        return;
      }

      setSignOutMessage(reason ?? 'Signing you out...');
      setSigningOut(true);
      signOutOpacity.setValue(0);
      signOutScale.setValue(0.94);

      Animated.parallel([
        Animated.timing(signOutOpacity, {
          duration: 180,
          easing: Easing.out(Easing.ease),
          toValue: 1,
          useNativeDriver: true,
        }),
        Animated.spring(signOutScale, {
          damping: 18,
          mass: 0.9,
          stiffness: 220,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
      }

      signOutTimerRef.current = setTimeout(() => {
        completeLogout(redirectToLogin);
      }, 900);
    },
    [completeLogout, showToast, signOutOpacity, signOutScale]
  );

  useEffect(() => {
    setUnauthorizedListener((message) => {
      if (!session) {
        return;
      }

      logout({
        animated: true,
        reason: message ?? 'Your session has expired. Please sign in again.',
        redirectToLogin: true,
      });
    });

    return () => {
      setUnauthorizedListener(null);

      if (signOutTimerRef.current) {
        clearTimeout(signOutTimerRef.current);
      }
    };
  }, [logout, session]);

  const value = useMemo(
    () => ({
      login,
      loginWithGoogle,
      logout,
      pendingChallenge,
      register,
      resendOtpChallenge,
      session,
      submitFirstPassword,
      submitOtp,
    }),
    [
      login,
      loginWithGoogle,
      logout,
      pendingChallenge,
      register,
      resendOtpChallenge,
      session,
      submitFirstPassword,
      submitOtp,
    ]
  );

  return (
    <AuthContext.Provider value={value}>
      {children}
      {signingOut ? (
        <View pointerEvents="auto" style={styles.overlay}>
          <Animated.View
            style={[
              styles.card,
              {
                opacity: signOutOpacity,
                transform: [{ scale: signOutScale }],
              },
            ]}>
            <ActivityIndicator color={palette.primary} size="small" style={styles.spinner} />
            <Text style={styles.title}>Session Ended</Text>
            <Text style={styles.message}>{signOutMessage}</Text>
          </Animated.View>
        </View>
      ) : null}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used inside AuthProvider');
  }

  return context;
}

const styles = StyleSheet.create({
  card: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.98)',
    borderColor: 'rgba(255,255,255,0.45)',
    borderRadius: radius.lg,
    borderWidth: 1,
    gap: spacing.sm,
    maxWidth: 320,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    width: '82%',
  },
  message: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  overlay: {
    alignItems: 'center',
    backgroundColor: 'rgba(0, 24, 48, 0.3)',
    bottom: 0,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  spinner: {
    marginBottom: spacing.xs,
  },
  title: {
    color: palette.onSurface,
    fontSize: typography.title,
    fontWeight: '700',
  },
});
