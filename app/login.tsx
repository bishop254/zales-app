import { Link, router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenContainer } from '@/components/app/screen-container';
import { AuthShell } from '@/components/auth/auth-shell';
import { FormField } from '@/components/auth/form-field';
import { palette, radius, typography } from '@/constants/app-theme';
import { validateEmail, validatePassword } from '@/features/auth/validation';
import { useAuth } from '@/providers/auth-provider';

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const errors = useMemo(
    () => ({
      email: validateEmail(email),
      password: validatePassword(password),
    }),
    [email, password]
  );

  const canSubmit = !errors.email && !errors.password;

  async function handleSubmit() {
    if (!canSubmit || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      await login({ email, password });
      router.replace('/dashboard');
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Please check the backend connection and try again.';
      Alert.alert('Login failed', message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScreenContainer>
      <AuthShell
        footer={
          <Text style={styles.footerText}>
            Don&apos;t have an account?{' '}
            <Link href="/register" style={styles.footerLink}>
              Sign up
            </Link>
          </Text>
        }
        subtitle="Log in to manage your pipeline, track opportunities, and keep the day moving."
        title="Welcome back">
        <FormField
          error={email ? errors.email : ''}
          icon="mail"
          keyboardType="email-address"
          label="Email address"
          placeholder="agent@salespro.com"
          value={email}
          onChangeText={setEmail}
        />
        <FormField
          actionLabel="Forgot password?"
          error={password ? errors.password : ''}
          icon="lock"
          label="Password"
          placeholder="Enter your password"
          secureTextEntry
          value={password}
          onActionPress={() => Alert.alert('Coming soon', 'Password recovery can be added next.')}
          onChangeText={setPassword}
        />

        <Pressable
          disabled={!canSubmit || submitting}
          style={[styles.submitButton, !canSubmit || submitting ? styles.submitButtonDisabled : null]}
          onPress={handleSubmit}>
          <Text style={styles.submitButtonText}>{submitting ? 'Signing in...' : 'Login'}</Text>
        </Pressable>

        <View style={styles.trustRow}>
          <Text style={styles.trustText}>Connected to the Nest auth backend with in-memory session handling</Text>
        </View>
      </AuthShell>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  submitButton: {
    alignItems: 'center',
    backgroundColor: palette.accent,
    borderRadius: radius.md,
    justifyContent: 'center',
    minHeight: 54,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    color: palette.white,
    fontSize: typography.title,
    fontWeight: '700',
  },
  trustRow: {
    alignItems: 'center',
  },
  trustText: {
    color: palette.borderStrong,
    fontSize: typography.bodySmall,
    textAlign: 'center',
  },
  footerText: {
    color: palette.textMuted,
    fontSize: typography.bodySmall,
  },
  footerLink: {
    color: palette.primary,
    fontWeight: '700',
  },
});
