import { MaterialIcons } from '@expo/vector-icons';
import { Link, router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';

import { AuthBackground, AuthButton, AuthCard, AuthTextField } from '@/components/auth/auth-primitives';
import { palette, spacing, typography } from '@/constants/app-theme';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';
import { useToast } from '@/providers/toast-provider';

export default function LoginScreen() {
  const { login, loginWithGoogle } = useAuth();
  const { showToast } = useToast();
  const { registered } = useLocalSearchParams<{ registered?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [googleSubmitting, setGoogleSubmitting] = useState(false);
  const hasHandledRegistrationToast = useRef(false);

  const errors = useMemo(
    () => ({
      email: validateEmail(email),
      password: validatePassword(password),
    }),
    [email, password]
  );

  const canSubmit = !errors.email && !errors.password;

  useEffect(() => {
    if (registered === '1' && !hasHandledRegistrationToast.current) {
      hasHandledRegistrationToast.current = true;
      showToast('Account created. Check your email for your temporary password.');
      router.setParams({ registered: undefined });
    }
  }, [registered, showToast]);

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await login({ email, password });

      if ('requiresPasswordChange' in response) {
        showToast('Temporary password accepted. Set your new password.');
        router.replace('/set-password');
      } else {
        showToast('OTP sent to your email.');
        router.replace('/verify');
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please check the backend connection and try again.';
      showToast(message, 'error');
      Alert.alert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleLogin() {
    if (googleSubmitting || submitting) {
      return;
    }

    try {
      setGoogleSubmitting(true);
      await loginWithGoogle();
      showToast('Signed in with Google.');
      router.replace('/dashboard');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to start Google sign-in.';
      showToast(message, 'error');
      Alert.alert('Google sign-in failed', message);
    } finally {
      setGoogleSubmitting(false);
    }
  }

  return (
    <>
      <StatusBar style="light" />
      <AuthBackground scroll={false}>
        <AuthCard scrollable styleVariant="compact">
          <View style={styles.brandWrap}>
            <View style={styles.brandIcon}>
              <MaterialIcons color={palette.onPrimary} name="rocket-launch" size={28} />
            </View>
            <Text style={styles.brandName}>ManagePro</Text>
            <Text style={styles.brandCaption}>Sign in to manage your pipeline.</Text>
          </View>

          <AuthTextField
            autoCapitalize="none"
            error={email ? errors.email : ''}
            icon="mail"
            keyboardType="email-address"
            label="Email Address"
            placeholder="agent@example.com"
            value={email}
            onChangeText={setEmail}
          />
          <AuthTextField
            actionLabel="Forgot Password?"
            error={password ? errors.password : ''}
            icon="lock"
            label="Password"
            placeholder="........"
            secureTextEntry
            secureToggle
            value={password}
            onActionPress={() => Alert.alert('Coming soon', 'Password recovery is not wired yet.')}
            onChangeText={setPassword}
          />

          <View style={styles.actions}>
            <AuthButton
              disabled={!canSubmit || submitting}
              loading={submitting}
              title={submitting ? 'Checking account...' : 'Login'}
              onPress={handleSubmit}
            />
            <AuthButton
              disabled={googleSubmitting || submitting}
              loading={googleSubmitting}
              title={googleSubmitting ? 'Opening Google...' : 'Continue with Google'}
              variant="secondary"
              onPress={handleGoogleLogin}
            />
          </View>

          <View style={styles.footer}>
            <Text style={styles.footerText}>
              Don&apos;t have an account?{' '}
              <Link href="/register" style={styles.footerLink}>
                Sign Up
              </Link>
            </Text>
          </View>
        </AuthCard>
      </AuthBackground>
    </>
  );
}

const styles = StyleSheet.create({
  actions: {
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  brandCaption: {
    color: palette.onSurfaceVariant,
    fontSize: typography.body,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  brandIcon: {
    alignItems: 'center',
    backgroundColor: palette.primary,
    borderRadius: 8,
    height: 48,
    justifyContent: 'center',
    marginBottom: spacing.md,
    width: 48,
  },
  brandName: {
    color: palette.primary,
    fontSize: typography.display,
    fontWeight: '700',
  },
  brandWrap: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  footer: {
    borderTopColor: palette.surfaceContainerHighest,
    borderTopWidth: 1,
    marginTop: spacing.xl,
    paddingTop: spacing.lg,
  },
  footerLink: {
    color: palette.primary,
    fontSize: typography.label,
    fontWeight: '700',
  },
  footerText: {
    color: palette.onSurfaceVariant,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
});
